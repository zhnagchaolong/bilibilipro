// src/main/ipc/taskIpc.ts
import { ipcMain, session, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as cron from 'node-cron'

// ==========================================
// 1. 严格的类型定义 (完美对齐 TasksView.vue)
// ==========================================
export interface BiliAccount {
  uid: string
  name: string
  face: string
  partition: string
}

interface TaskConfig {
  dailySign?: boolean
  mangaSign?: boolean
  watchVideo?: boolean
  shareVideo?: boolean
  autoCoin?: boolean
  silverToCoin?: boolean

  // 🌟 修复1：完全对齐前端传过来的关键控制字段
  videoStrategy?: 'rank' | 'partition' | 'keyword' | 'custom'
  videoTargetValue?: string | number // 囊括了分区ID、关键词、指定BV号
  watchVideoCount?: number | string // 观看次数

  // 🌟 修复2：完全对齐前端的时间推演策略字段
  watchTimeStrategy?: 'random' | 'percentage' | 'fixed'
  watchTimeRandomValue?: string
  watchTimePercentage?: number | string
  watchTimeFixed?: number | string

  coinTarget?: number | string
  targetAccounts?: string[]
  [key: string]: unknown
}

interface BiliApiResponse {
  code?: number
  message?: string
  msg?: string
  data?: unknown
}

interface VideoListItem {
  bvid?: string
  title?: string
  duration?: number | string
}

let currentCronJob: cron.ScheduledTask | null = null

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// 防崩请求器
async function safeFetchJson(url: string, options: RequestInit): Promise<BiliApiResponse> {
  try {
    const res = await fetch(url, options)
    const text = await res.text()
    try {
      return JSON.parse(text) as BiliApiResponse
    } catch {
      return { code: -999, message: `B站返回非预期数据: ${text.substring(0, 20)}...` }
    }
  } catch (err) {
    return { code: -999, message: `网络阻断: ${String(err)}` }
  }
}

function getActiveAccounts(): BiliAccount[] {
  try {
    const dbPath = path.join(app.getPath('userData'), 'bili-accounts.json')
    if (!fs.existsSync(dbPath)) return []
    return JSON.parse(fs.readFileSync(dbPath, 'utf8')) as BiliAccount[]
  } catch {
    return []
  }
}

async function getBiliJct(partition: string): Promise<string> {
  const currentSession = session.fromPartition(partition)
  const cookies = await currentSession.cookies.get({ domain: '.bilibili.com' })
  const jctCookie = cookies.find((c) => c.name === 'bili_jct')
  return jctCookie ? jctCookie.value : ''
}

async function getCookieString(partition: string): Promise<string> {
  const currentSession = session.fromPartition(partition)
  const cookies = await currentSession.cookies.get({ domain: '.bilibili.com' })
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

// 🌟 解析各种奇葩的 B 站视频时长格式
function parseVideoDuration(val: unknown): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    if (val.includes(':')) {
      const parts = val.split(':').map(Number)
      if (parts.length === 2) return parts[0] * 60 + parts[1]
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    }
    return parseInt(val) || 0
  }
  return 0
}

// 🌟 修复3：读取真正的 videoTargetValue，并抓取时长 (duration)
async function getVideoPool(
  config: TaskConfig,
  headers: Record<string, string>,
  log: (msg: string) => void
): Promise<{ bvid: string; title: string; duration: number }[]> {
  const strategy = config.videoStrategy || 'rank'
  const targetVal = config.videoTargetValue || '' // 提取前端输入框的值
  let pool: { bvid: string; title: string; duration: number }[] = []

  if (strategy === 'rank') {
    log('📡 [策略: 排行榜] 抓取样本中...')
    const data = await safeFetchJson(
      'https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all',
      { headers }
    )
    if (data.code === 0 && Array.isArray((data.data as { list?: unknown[] })?.list)) {
      pool = ((data.data as { list?: VideoListItem[] }).list || []).slice(0, 100).map((v) => ({
        bvid: v.bvid || '',
        title: v.title || '',
        duration: parseVideoDuration(v.duration)
      }))
    }
  } else if (strategy === 'partition') {
    const rid = targetVal || 1
    log(`📡 [策略: 分区 ID ${rid}] 抓取样本中...`)
    const data = await safeFetchJson(
      `https://api.bilibili.com/x/web-interface/dynamic/region?ps=50&rid=${rid}`,
      { headers }
    )
    if (data.code === 0 && Array.isArray((data.data as { archives?: unknown[] })?.archives)) {
      pool = ((data.data as { archives?: VideoListItem[] }).archives || []).map((v) => ({
        bvid: v.bvid || '',
        title: v.title || '',
        duration: parseVideoDuration(v.duration)
      }))
    }
  } else if (strategy === 'keyword') {
    const kw = targetVal || 'Bilibili'
    log(`📡 [策略: 关键词 "${kw}"] 尝试抓取...`)
    const data = await safeFetchJson(
      `https://api.bilibili.com/x/web-interface/tag/top?tname=${encodeURIComponent(kw.toString())}`,
      { headers }
    )

    if (data.code === 0 && Array.isArray((data.data as { archive?: unknown[] })?.archive)) {
      pool = ((data.data as { archive?: VideoListItem[] }).archive || []).map((v) => ({
        bvid: v.bvid || '',
        title: v.title || '',
        duration: parseVideoDuration(v.duration)
      }))
    } else {
      log(`⚠️ 关键词检索遭风控拦截 (${data.message})。正在启动 [分区兜底方案]...`)
      const fallback = await safeFetchJson(
        `https://api.bilibili.com/x/web-interface/dynamic/region?ps=50&rid=1`,
        { headers }
      )
      if (
        fallback.code === 0 &&
        Array.isArray((fallback.data as { archives?: unknown[] })?.archives)
      ) {
        pool = ((fallback.data as { archives?: VideoListItem[] }).archives || []).map((v) => ({
          bvid: v.bvid || '',
          title: v.title || '',
          duration: parseVideoDuration(v.duration)
        }))
      }
    }
  } else if (strategy === 'custom') {
    const bvid = targetVal ? String(targetVal).trim() : ''
    if (bvid) {
      // 对指定BV号额外请求一次详细信息，拿到时长
      const data = await safeFetchJson(
        `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`,
        { headers }
      )
      const duration =
        data.code === 0 && data.data ? (data.data as { duration?: number }).duration || 0 : 0
      pool = [{ bvid, title: '用户自定义视频', duration }]
    } else {
      log('⚠️ 自定义视频策略下未输入BVID！')
    }
  }

  if (pool.length > 0) log(`✅ 成功建立视频样本池，容量: ${pool.length} 个。`)
  else log(`❌ 抓取彻底失败！已阻止后续观看/投币任务。`)

  return pool
}

// 辅助解析输入次数
function parseTargetCount(val: unknown, defaultVal: number): number {
  if (val === undefined || val === null || val === '') return defaultVal
  const num = Number(val)
  return !isNaN(num) && num > 0 ? num : defaultVal
}

// ==========================================
// 3. 核心调度引擎
// ==========================================
export async function executeTasksCore(
  config: TaskConfig,
  log: (msg: string) => void,
  partition: string,
  accountName: string
): Promise<void> {
  log(`[初始化] 账号 [${accountName}] 正在挂载引擎...`)

  const biliJct = await getBiliJct(partition)
  const cookieStr = await getCookieString(partition)

  if (!biliJct || !cookieStr) {
    log(`❌ [致命错误] 凭证碎片缺失，请重新登录账号！`)
    return
  }

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    Cookie: cookieStr,
    Referer: 'https://www.bilibili.com/',
    Origin: 'https://www.bilibili.com',
    'Content-Type': 'application/x-www-form-urlencoded'
  }

  // 1. 直播签到
  if (config.dailySign) {
    const data = await safeFetchJson(
      'https://api.live.bilibili.com/xlive/web-ucenter/v1/sign/DoSign',
      { method: 'GET', headers }
    )
    if (data.code === 0) log(`🎉 直播签到成功！`)
    else log(`⚠️ 直播签到跳过: ${data.message}`)
    await sleep(1000)
  }

  // 2. 漫读签到
  if (config.mangaSign) {
    const body = new URLSearchParams({ platform: 'android' })
    const data = await safeFetchJson(
      'https://manga.bilibili.com/twirp/activity.v1.Activity/ClockIn',
      { method: 'POST', headers, body: body.toString() }
    )
    if (data.code === 0) log(`🎉 漫读签到成功！`)
    else log(`⚠️ 漫读签到跳过: ${data.msg || data.message}`)
    await sleep(1000)
  }

  // 3. 银瓜子换硬币
  if (config.silverToCoin) {
    const body = new URLSearchParams({ csrf: biliJct, csrf_token: biliJct })
    const data = await safeFetchJson(
      'https://api.live.bilibili.com/xlive/revenue/v1/wallet/silver2coin',
      { method: 'POST', headers, body: body.toString() }
    )
    if (data.code === 0) log(`🎉 银瓜子兑换成功！硬币 +1`)
    else log(`⚠️ 兑换跳过: ${data.message}`)
    await sleep(1000)
  }

  if (!config.watchVideo && !config.shareVideo && !config.autoCoin) {
    log(`[结束] 当前未配置视频相关任务，收车。`)
    return
  }

  const videoPool = await getVideoPool(config, headers, log)
  if (videoPool.length === 0) return

  // ==========================================
  // 4. 暴力模拟观看 (彻底激活时间引擎与次数)
  // ==========================================
  if (config.watchVideo) {
    // 🌟 读取正确的次数字段
    const watchCount = parseTargetCount(config.watchVideoCount, 1)
    log(`⏳ 执行: 开始模拟观看，设定上限 [${watchCount}] 次...`)

    for (let i = 0; i < watchCount; i++) {
      const targetVideo = videoPool[i % videoPool.length]

      // 🌟 时间推演引擎核心逻辑
      const videoDuration = targetVideo.duration || 0
      let playedTime = 15 // 兜底 15 秒

      if (config.watchTimeStrategy === 'fixed') {
        playedTime = parseTargetCount(config.watchTimeFixed, 15)
      } else if (config.watchTimeStrategy === 'percentage') {
        const pct = parseTargetCount(config.watchTimePercentage, 40)
        playedTime = videoDuration > 0 ? Math.floor(videoDuration * (pct / 100)) : 15
        if (playedTime < 15) playedTime = 15 // B站低于15秒不算完成观看
      } else {
        // random 策略: "15,45"
        const bounds = String(config.watchTimeRandomValue || '15,45')
          .split(',')
          .map(Number)
        const min = bounds[0] || 15
        const max = bounds.length > 1 ? bounds[1] : 45
        playedTime = Math.floor(Math.random() * (Math.max(max, min) - min + 1)) + min
      }

      log(
        `[推演] 视频 ${targetVideo.bvid} 总长 ${videoDuration}s，计算得出驻留时间: ${playedTime}s`
      )

      const body = new URLSearchParams({
        bvid: targetVideo.bvid,
        played_time: String(playedTime),
        csrf: biliJct
      })
      const data = await safeFetchJson('https://api.bilibili.com/x/click-interface/web/heartbeat', {
        method: 'POST',
        headers,
        body: body.toString()
      })

      if (data.code === 0) log(`✅ 观看 [${i + 1}/${watchCount}]: ${targetVideo.bvid} 成功。`)
      else log(`⚠️ 观看 [${i + 1}/${watchCount}] 被拒: ${data.message}`)

      await sleep(1500)
    }
  }

  // ==========================================
  // 5. 暴力视频分享
  // ==========================================
  if (config.shareVideo) {
    // 前端没有分享次数配置，这里根据观看次数顺带执行分享，默认最多分享2次拿满经验
    const shareCount = Math.min(2, parseTargetCount(config.watchVideoCount, 1))
    log(`⏳ 执行: 开始分享操作，尝试 [${shareCount}] 次...`)

    for (let i = 0; i < shareCount; i++) {
      const targetVideo = videoPool[i % videoPool.length]
      const body = new URLSearchParams({ bvid: targetVideo.bvid, csrf: biliJct })

      const data = await safeFetchJson('https://api.bilibili.com/x/web-interface/share/add', {
        method: 'POST',
        headers,
        body: body.toString()
      })
      if (data.code === 0) log(`✅ 分享 [${i + 1}/${shareCount}]: ${targetVideo.bvid} 成功。`)
      else log(`⚠️ 分享 [${i + 1}/${shareCount}] 失败: ${data.message}`)
      await sleep(2000)
    }
  }

  // ==========================================
  // 6. 智能投币引擎
  // ==========================================
  if (config.autoCoin) {
    const coinTarget = parseTargetCount(config.coinTarget, 0)
    if (coinTarget > 0) {
      log(`⏳ 执行: 投币引擎启动，目标额度 [${coinTarget}] 枚...`)
      let successCoin = 0
      const coinPool = [...videoPool].reverse()

      for (const vid of coinPool) {
        if (successCoin >= coinTarget) break

        const body = new URLSearchParams({
          bvid: vid.bvid,
          multiply: '1',
          select_like: '1',
          csrf: biliJct
        })
        const data = await safeFetchJson('https://api.bilibili.com/x/web-interface/coin/add', {
          method: 'POST',
          headers,
          body: body.toString()
        })

        if (data.code === 0) {
          successCoin++
          log(`🪙 成功为 ${vid.bvid} 投币！(当前进度 ${successCoin}/${coinTarget})`)
        } else if (data.message?.includes('不足')) {
          log(`⚠️ 钱包硬币不足，提前刹车。`)
          break
        } else if (data.message?.includes('已经投过')) {
          // 静默跳过
        } else {
          log(`⚠️ 投币遭拒: ${data.message || ''}`)
        }
        await sleep(2500)
      }
    }
  }

  log(`[任务结束] 账号 [${accountName}] 指令序列全数完结。===================`)
}

// ==========================================
// 4. IPC 桥接挂载层
// ==========================================
export function setupTaskIpc(): void {
  ipcMain.handle('run-tasks', async (event, config: TaskConfig) => {
    const accounts = getActiveAccounts()
    if (accounts.length === 0) return { success: false, message: '未找到可用的账号' }

    const targetPartitions = config.targetAccounts || []

    for (const acc of accounts) {
      if (targetPartitions.length > 0 && !targetPartitions.includes(acc.partition)) continue
      await executeTasksCore(
        config,
        (msg) => event.sender.send('task-log', msg),
        acc.partition,
        acc.name
      )
    }
    return { success: true }
  })

  ipcMain.handle('setup-cron', async (event, timeStr: string, config: TaskConfig) => {
    if (currentCronJob) currentCronJob.stop()
    if (!timeStr) return { success: true, message: '定时任务已取消' }

    let cronExpression = timeStr
    if (timeStr.includes(':')) {
      const [hour, minute] = timeStr.split(':')
      cronExpression = `${parseInt(minute, 10)} ${parseInt(hour, 10)} * * *`
    }

    const targetPartitions = config.targetAccounts || []

    try {
      currentCronJob = cron.schedule(cronExpression, async () => {
        const accounts = getActiveAccounts()
        for (const acc of accounts) {
          if (targetPartitions.length > 0 && !targetPartitions.includes(acc.partition)) continue
          await executeTasksCore(
            config,
            (msg) => event.sender.send('task-log', `[定时触发] ${msg}`),
            acc.partition,
            acc.name
          )
        }
      })
      return { success: true, message: `已设置定时任务` }
    } catch (err) {
      return { success: false, message: `语法错误: ${String(err)}` }
    }
  })

  ipcMain.handle('stop-task', async () => {
    if (currentCronJob) {
      currentCronJob.stop()
      currentCronJob = null
    }
  })
}
