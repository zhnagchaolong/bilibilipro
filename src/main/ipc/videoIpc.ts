// src/main/ipc/videoIpc.ts
import { ipcMain, app, shell, dialog, session } from 'electron'
import * as fs from 'fs'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'

if (ffmpegStatic) {
  // 💥 打包后 ffmpeg-static 位于 app.asar.unpacked 中才能被 spawn 执行
  const fixedPath = ffmpegStatic.replace('app.asar', 'app.asar.unpacked')
  ffmpeg.setFfmpegPath(fixedPath)
}

const API_URLS = {
  VIEW: 'https://api.bilibili.com/x/web-interface/view',
  PLAY_URL: 'https://api.bilibili.com/x/player/playurl'
}

const BILI_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  Referer: 'https://www.bilibili.com'
}

let lastParsedBvid = ''

interface BiliPage {
  cid: number
  page: number
  part: string
}

// 🌟 黑科技突破：全域 Cookie 智能嗅探系统
async function getBestBiliCookie(partitionKey?: string): Promise<string> {
  const sessionsToCheck = partitionKey
    ? [partitionKey, '', 'persist:bili-session']
    : ['', 'persist:bili-session']

  let fallbackCookies = ''

  for (const part of sessionsToCheck) {
    const targetSession = part ? session.fromPartition(part) : session.defaultSession
    const cookies = await targetSession.cookies.get({ domain: '.bilibili.com' })

    if (cookies && cookies.length > 0) {
      const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
      if (!fallbackCookies) fallbackCookies = cookieStr

      const hasSessData = cookies.some((c) => c.name === 'SESSDATA')
      if (hasSessData) {
        return cookieStr
      }
    }
  }

  console.warn('[核心层] ⚠️ 搜遍全网未发现登录票据，将以游客身份解析 (最大画质可能受限)。')
  return fallbackCookies
}

export function setupVideoIpc(): void {
  // ============================================
  // 1. 解析视频并返回所有信息
  // ============================================
  ipcMain.handle('parse-video', async (_event, bvid: string, partitionKey?: string) => {
    try {
      const cookieString = await getBestBiliCookie(partitionKey)

      const headers = {
        ...BILI_HEADERS,
        Cookie: cookieString
      }

      const viewRes = await fetch(`${API_URLS.VIEW}?bvid=${bvid}`, { headers })
      const viewData = await viewRes.json()
      if (viewData.code !== 0) throw new Error(viewData.message || '获取视频基础信息失败')

      const title = viewData.data.title
      const pic = viewData.data.pic
      const pages = viewData.data.pages as BiliPage[]
      const firstCid = pages[0].cid

      lastParsedBvid = bvid

      const playUrlApi = `${API_URLS.PLAY_URL}?bvid=${bvid}&cid=${firstCid}&qn=120&fourk=1&fnval=4048`
      const playRes = await fetch(playUrlApi, { headers })
      const playData = await playRes.json()

      if (playData.code !== 0) throw new Error(playData.message || '获取视频流源失败')

      const qualities: { id: number; label: string; url: string; bandwidth?: number }[] = []
      let audioUrl = ''
      let audioBandwidth = 0

      if (playData.data.dash) {
        const acceptDescription = playData.data.accept_description || []
        const acceptQuality = playData.data.accept_quality || []

        playData.data.dash.video.forEach(
          (v: { id: number; codecs: string; baseUrl: string; bandwidth: number }) => {
            let codecName = 'AVC'
            if (v.codecs.startsWith('hev') || v.codecs.startsWith('hvc')) codecName = 'HEVC'
            else if (v.codecs.startsWith('av01')) codecName = 'AV1'

            const isExist = qualities.find((q) => q.id === v.id && q.label.includes(codecName))
            if (!isExist) {
              const idx = acceptQuality.indexOf(v.id)
              const baseLabel = idx !== -1 ? acceptDescription[idx] : `画质 ${v.id}`
              qualities.push({
                id: v.id,
                label: `${baseLabel} (${codecName})`,
                url: v.baseUrl,
                bandwidth: v.bandwidth
              })
            }
          }
        )

        qualities.sort((a, b) => {
          if (b.id !== a.id) return b.id - a.id
          if (a.label.includes('HEVC')) return -1
          return 1
        })

        if (playData.data.dash.audio && playData.data.dash.audio.length > 0) {
          audioUrl = playData.data.dash.audio[0].baseUrl
          audioBandwidth = playData.data.dash.audio[0].bandwidth || 0
        }
      } else if (playData.data.durl) {
        qualities.push({
          id: playData.data.quality,
          label: '普通兼容源',
          url: playData.data.durl[0].url,
          bandwidth: 0
        })
      }

      return {
        success: true,
        data: {
          title,
          pic,
          audioUrl,
          audioBandwidth,
          qualities,
          pages
        }
      }
    } catch (error) {
      console.error('[解析系统异常]：', error)
      return { success: false, message: String(error) }
    }
  })

  // ============================================
  // 2. 打开文件夹
  // ============================================
  ipcMain.handle('open-folder', async (_event, filePath?: string) => {
    if (filePath && fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath)
    } else {
      const downloadDir = join(app.getPath('downloads'), 'Bilibili下载')
      if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true })
      shell.openPath(downloadDir)
    }
  })

  // ============================================
  // 3. 多任务并发下载 + FFmpeg 无损极速合并引擎 🌟
  // ============================================
  ipcMain.handle(
    'download-video',
    async (
      _event,
      taskId: string,
      videoUrl: string,
      audioUrl: string,
      title: string,
      savePath?: string,
      _page?: number,
      cid?: number,
      clipPayload?: {
        start?: number
        end?: number
        isMerge?: boolean
        targets?: { start: number; end: number; titleExt?: string }[]
      }
    ) => {
      try {
        let finalVideoUrl = videoUrl
        let finalAudioUrl = audioUrl
        let targetQn = 116
        let targetCodec = ''

        if (finalVideoUrl.includes('|||')) {
          const parts = finalVideoUrl.split('|||')
          finalVideoUrl = parts[0]

          const curQn = parts.find((p) => p.startsWith('qn='))
          if (curQn) targetQn = parseInt(curQn.replace('qn=', ''), 10)

          const curCodec = parts.find((p) => p.startsWith('codecs='))
          if (curCodec) targetCodec = curCodec.replace('codecs=', '')
        }

        if (cid && lastParsedBvid) {
          const cookieString = await getBestBiliCookie()
          const headers = { Cookie: cookieString, ...BILI_HEADERS }

          const playRes = await fetch(
            `${API_URLS.PLAY_URL}?bvid=${lastParsedBvid}&cid=${cid}&qn=${targetQn}&fnval=4048`,
            { headers }
          )
          const playData = await playRes.json()

          if (playData.code === 0 && playData.data?.dash) {
            const vList: { id: number; codecs: string; baseUrl: string }[] =
              playData.data.dash.video || []

            let matchVideo = vList.find(
              (v) => v.id === targetQn && (!targetCodec || v.codecs.includes(targetCodec))
            )
            if (!matchVideo) matchVideo = vList.find((v) => v.id === targetQn)
            if (!matchVideo) matchVideo = vList[0]

            if (matchVideo) finalVideoUrl = matchVideo.baseUrl
            if (playData.data.dash.audio && playData.data.dash.audio.length > 0) {
              finalAudioUrl = playData.data.dash.audio[0].baseUrl
            }
          }
        }

        const downloadDir = savePath || join(app.getPath('downloads'), 'Bilibili下载')
        if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true })

        const safeTitle = (title || `BilibiliVideo_${taskId}`).replace(/[/\\?%*:|"<>]/g, '-')
        const uniqueId = Math.random().toString(36).substring(2, 6)
        const filePath = join(downloadDir, `${safeTitle}_${uniqueId}.mp4`)

        const tempVideoPath = join(app.getPath('temp'), `v_${taskId}.m4s`)
        const tempAudioPath = join(app.getPath('temp'), `a_${taskId}.m4s`)

        const downloadStream = async (
          url: string,
          destPath: string,
          type: string
        ): Promise<void> => {
          _event.sender.send('download-progress', { taskId, type, progress: 0, speed: '连接中...' })

          const response = await fetch(url, {
            headers: { ...BILI_HEADERS, 'Accept-Encoding': 'identity' }
          })
          if (!response.ok) throw new Error(`${type} 请求失败`)

          const totalBytes = parseInt(response.headers.get('content-length') || '0', 10)
          let downloadedBytes = 0
          let lastBytes = 0
          let lastSentTime = Date.now()
          const fileStream = fs.createWriteStream(destPath)

          // @ts-ignore  //sfsd
          const nodeStream = Readable.fromWeb(response.body)

          nodeStream.on('data', (chunk) => {
            downloadedBytes += chunk.length
            const now = Date.now()
            const diffTime = now - lastSentTime

            if (diffTime >= 500 || downloadedBytes === totalBytes) {
              const progress =
                totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 99
              const safeDiff = Math.max(diffTime, 1)
              const speedBps = (downloadedBytes - lastBytes) / (safeDiff / 1000)
              const speedStr =
                speedBps > 1024 * 1024
                  ? (speedBps / (1024 * 1024)).toFixed(1) + ' MB/s'
                  : (speedBps / 1024).toFixed(1) + ' KB/s'

              _event.sender.send('download-progress', { taskId, type, progress, speed: speedStr })
              lastSentTime = now
              lastBytes = downloadedBytes
            }
          })

          await pipeline(nodeStream, fileStream)
          _event.sender.send('download-progress', { taskId, type, progress: 100, speed: '完毕' })
        }

        // --- 开始下载基础流 ---
        await downloadStream(finalVideoUrl, tempVideoPath, 'video')
        if (finalAudioUrl) await downloadStream(finalAudioUrl, tempAudioPath, 'audio')

        _event.sender.send('download-progress', { taskId, type: 'merge', progress: 100 })

        // ============================================
        // 🌟 核心：FFmpeg 极速处理管线分支
        // ============================================
        if (
          clipPayload &&
          clipPayload.isMerge &&
          clipPayload.targets &&
          clipPayload.targets.length > 0
        ) {
          // ----------------------------------------
          // 🧊 模式 A：Fast Concat 合集全自动拼接
          // ----------------------------------------
          const partFiles: string[] = []
          const tempDir = app.getPath('temp')

          // 子步骤 1: 循环切离所有独立子片段 (全直通不编码，秒杀级)
          for (let i = 0; i < clipPayload.targets.length; i++) {
            const target = clipPayload.targets[i]
            const partFile = join(tempDir, `part_${taskId}_${i}.mp4`)

            await new Promise<void>((resolve, reject) => {
              const cmd = ffmpeg()
              cmd
                .input(tempVideoPath)
                .inputOptions(['-ss', String(target.start), '-to', String(target.end)])

              if (finalAudioUrl) {
                cmd
                  .input(tempAudioPath)
                  .inputOptions(['-ss', String(target.start), '-to', String(target.end)])
              }

              cmd
                .videoCodec('copy')
                .audioCodec('copy')
                .outputOptions(['-avoid_negative_ts', 'make_zero'])
                .save(partFile)
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
            })
            partFiles.push(partFile)
          }

          // 子步骤 2: 编写基于顺序的 FFmpeg 表单
          const concatListPath = join(tempDir, `concat_${taskId}.txt`)
          // ⚠️ 非常重要：FFmpeg 里的 file 语法对 Windows 路径转义非常严格，需转换为斜杠
          const concatContent = partFiles.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n')
          fs.writeFileSync(concatListPath, concatContent, 'utf-8')

          // 子步骤 3: 瞬时流体拼接
          await new Promise<void>((resolve, reject) => {
            ffmpeg()
              .input(concatListPath)
              .inputOptions(['-f', 'concat', '-safe', '0'])
              .videoCodec('copy')
              .audioCodec('copy')
              .save(filePath)
              .on('end', () => resolve())
              .on('error', (err) => reject(err))
          })

          // 子步骤 4: 毁灭证据 (删掉碎块清单)
          for (const f of partFiles) {
            if (fs.existsSync(f)) fs.unlinkSync(f)
          }
          if (fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath)
        } else {
          // ----------------------------------------
          // 🧊 模式 B：普通直通整合 或 截取单个片段
          // ----------------------------------------
          await new Promise<void>((resolve, reject) => {
            const command = ffmpeg()

            command.input(tempVideoPath)
            if (clipPayload && clipPayload.start !== undefined && clipPayload.end !== undefined) {
              command.inputOptions([
                '-ss',
                String(clipPayload.start),
                '-to',
                String(clipPayload.end)
              ])
            }

            if (finalAudioUrl) {
              command.input(tempAudioPath)
              if (clipPayload && clipPayload.start !== undefined && clipPayload.end !== undefined) {
                command.inputOptions([
                  '-ss',
                  String(clipPayload.start),
                  '-to',
                  String(clipPayload.end)
                ])
              }
            }

            command
              .videoCodec('copy')
              .audioCodec('copy')
              .outputOptions(['-avoid_negative_ts', 'make_zero'])
              .on('end', () => resolve())
              .on('error', (err) => reject(err))
              .save(filePath)
          })
        }

        // --- 整体打扫 ---
        if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath)
        if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath)

        return { success: true, filePath }
      } catch (error) {
        return { success: false, message: String(error) }
      }
    }
  )

  // ============================================
  // 4. 选择文件夹
  // ============================================
  ipcMain.handle('select-folder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: '选择下载保存路径',
      properties: ['openDirectory', 'createDirectory']
    })
    return canceled ? null : filePaths[0]
  })
}
