import { ipcMain, session, app } from 'electron'
import { generateAIResponse } from './assistant'
import axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import { BiliAccount } from '../../shared/api.types'

/**
 * 安全解析视频时长字符串，兼容多种格式
 * 支持: hh:mm:ss, mm:ss, ss, 以及带中文单位的格式
 */
function parseDurationStr(durationStr: string | undefined): number {
  if (!durationStr) return 0
  // 去除空格和中文单位，保留数字和冒号
  const clean = durationStr.replace(/[\s\u4e00-\u9fa5]/g, '').trim()
  // 匹配 hh:mm:ss 或 mm:ss 或纯秒数
  const match = clean.match(/^(?:(\d+):(\d+):(\d+))|(?:(\d+):(\d+))|(\d+)$/)
  if (!match) return 0

  if (match[1]) {
    // hh:mm:ss
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
  } else if (match[4]) {
    // mm:ss
    return Number(match[4]) * 60 + Number(match[5])
  } else if (match[6]) {
    // ss
    return Number(match[6])
  }
  return 0
}

interface HistoryEntry {
  duration?: number
  progress?: number
  view_at?: number
  author_name?: string
  history?: { tname?: string; part?: string }
}

interface VideoItem {
  bvid: string
  title: string
  pic: string
  duration: number
  pubdate: number
  owner?: {
    name: string
    fans?: number
    face?: string
  }
  stat: {
    view: number
    danmaku: number
    reply: number
    favorite: number
    coin: number
    share: number
    like: number
  }
  tname?: string
}

// ==========================
// 简易缓存与工具函数
// ==========================

const upVideoCache = new Map<
  string,
  {
    expireAt: number
    data: VideoItem[]
  }
>()

let trendsCache: {
  expireAt: number
  data: Record<string, unknown>
} | null = null

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getRandomDelay(min = 800, max = 1600): number {
  return Math.floor(min + Math.random() * (max - min))
}

function buildBiliHeaders(
  cookie: string,
  referer = 'https://www.bilibili.com/'
): Record<string, string> {
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    Referer: referer,
    Origin: 'https://www.bilibili.com',
    Cookie: cookie,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'X-Requested-With': 'XMLHttpRequest'
  }
}

async function biliGetJson<T = unknown>(
  url: string,
  cookie: string,
  referer = 'https://www.bilibili.com/'
): Promise<T> {
  const res = await axios.get(url, {
    headers: buildBiliHeaders(cookie, referer),
    timeout: 15000,
    validateStatus: () => true
  })
  return res.data as T
}

// 💥 批量获取视频统计数据（点赞、投币、收藏等）
// 使用 /x/web-interface/view 逐个获取 stat，并发 5 个、批次间 200ms、最多 30 个防风控
async function fetchVideoStatsBatch(
  bvids: string[],
  cookie: string
): Promise<
  Record<
    string,
    {
      view?: number
      like?: number
      coin?: number
      favorite?: number
      share?: number
      danmaku?: number
      reply?: number
    }
  >
> {
  const result: Record<string, { view?: number; like?: number; coin?: number; favorite?: number; share?: number; danmaku?: number; reply?: number }> = {}
  if (bvids.length === 0) return result

  const targetBvids = bvids.slice(0, 30)
  const batchSize = 5
  for (let i = 0; i < targetBvids.length; i += batchSize) {
    const batch = targetBvids.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (bvid) => {
        try {
          const res = await biliGetJson<{
            code: number
            message?: string
            data?: { stat?: { view?: number; like?: number; coin?: number; favorite?: number; share?: number; danmaku?: number; reply?: number } }
          }>(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, cookie)
          if (res.code === 0 && res.data?.stat) {
            result[bvid] = res.data.stat
          }
        } catch (e) {
          // 忽略单个视频失败
        }
      })
    )
    if (i + batchSize < targetBvids.length) {
      await new Promise((r) => setTimeout(r, 200))
    }
  }
  console.log(`[Dashboard] 成功获取 ${Object.keys(result).length}/${bvids.length} 个视频的详细统计`)
  return result
}

export function setupDashboardIpc(): void {
  ipcMain.handle(
    'get-dashboard-data',
    async (_event, type: string, keyword?: string, partition?: string) => {
      try {
        let targetSession = partition ? session.fromPartition(partition) : session.defaultSession

        // 💥 尝试从默认 session 获取 cookies，如果没有则尝试 persist 分区
        let cookies = await targetSession.cookies.get({ domain: '.bilibili.com' })

        // 如果没有有效的反爬/登录 cookie，尝试从 bili-accounts.json 动态查找已登录账号的分区
        const hasEssentialCookie = cookies.some(
          (c) => c.name === 'SESSDATA' || c.name === 'buvid3' || c.name === 'b_nut'
        )

        if (!hasEssentialCookie) {
          try {
            const dbPath = path.join(app.getPath('userData'), 'bili-accounts.json')
            if (fs.existsSync(dbPath)) {
              const raw = fs.readFileSync(dbPath, 'utf8')
              const accounts = JSON.parse(raw) as BiliAccount[]
              for (const acc of accounts) {
                if (!acc.partition) continue
                try {
                  const testSession = session.fromPartition(acc.partition)
                  const testCookies = await testSession.cookies.get({ domain: '.bilibili.com' })
                  if (
                    testCookies.some(
                      (c) => c.name === 'SESSDATA' || c.name === 'buvid3' || c.name === 'b_nut'
                    )
                  ) {
                    console.log(`[Dashboard] 找到可用 session: ${acc.partition} (${acc.name})`)
                    targetSession = testSession
                    cookies = testCookies
                    break
                  }
                } catch {
                  // 忽略错误，继续尝试下一个账号
                }
              }
            }
          } catch (err) {
            console.warn('[Dashboard] 读取账号列表失败:', err)
          }
        }

        const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
        console.log(
          `[Dashboard] 获取到 ${cookies.length} 个 cookies:`,
          cookies.map((c) => c.name).join(', ')
        )

        const headers: Record<string, string> = {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://www.bilibili.com',
          Cookie: cookieString
        }

        // ==========================
        // 📌 个人总览数据处理
        // ==========================
        if (type === 'personal') {
          // 使用纯域名 Referer 避免 Chromium 拦截
          const safeHeaders = {
            ...headers,
            Referer: 'https://www.bilibili.com/'
          }
          const navRes = await (
            await targetSession.fetch('https://api.bilibili.com/x/web-interface/nav', {
              headers: safeHeaders
            })
          ).json()

          if (navRes.code !== 0 || !navRes.data?.isLogin) {
            return { success: false, error: '未登录或登录态已失效' }
          }

          const mid = navRes.data.mid
          const statRes = await (
            await targetSession.fetch('https://api.bilibili.com/x/web-interface/nav/stat', {
              headers: safeHeaders
            })
          ).json()

          const cardRes = await (
            await targetSession.fetch(`https://api.bilibili.com/x/web-interface/card?mid=${mid}`, {
              headers: safeHeaders
            })
          ).json()

          const levelInfo = navRes.data.level_info || {
            current_level: 0,
            current_exp: 0,
            next_exp: 1
          }
          const statData = statRes.data || { follower: 0, following: 0, dynamic_count: 0 }
          const cardData = cardRes.data || { like_num: 0 }

          let archiveViews = 0
          let articleViews = 0

          try {
            const upstatRes = await (
              await targetSession.fetch(`https://api.bilibili.com/x/space/upstat?mid=${mid}`, {
                headers: safeHeaders
              })
            ).json()
            if (upstatRes.code === 0 && upstatRes.data) {
              archiveViews = upstatRes.data.archive?.view || 0
              articleViews = upstatRes.data.article?.view || 0
            }
          } catch {
            console.warn('[Dashboard] upstat 请求受阻，按 0 播放量处理')
          }

          return {
            success: true,
            data: {
              coins: navRes.data.money || 0,
              bcoins: navRes.data.wallet?.bcoin_balance || 0,
              isVip: navRes.data.vipStatus === 1,
              level: levelInfo.current_level || 0,
              expPercent: Math.max(
                0,
                Math.min(
                  100,
                  Math.round(((levelInfo.current_exp || 0) / (levelInfo.next_exp || 1)) * 100)
                )
              ),
              fans: statData.follower || 0,
              following: statData.following || 0,
              dynamic: statData.dynamic_count || 0,
              likes: cardData.like_num || 0,
              archiveViews,
              articleViews
            }
          }
        }

        // ==========================
        // 📌 UP主完整分析 (整合基础和深度分析)
        // ==========================
        if (type === 'up' && keyword) {
          console.log('[Dashboard] UP主分析请求开始')
          try {
            const uidMatch =
              keyword.match(/(?:space\.bilibili\.com\/|mid=|uid=)(\d+)/i) || keyword.match(/\d+/)
            if (!uidMatch) {
              return { success: false, error: '请输入纯数字 UID（如：12345678）或完整主页链接' }
            }
            const uid = uidMatch[1] || uidMatch[0]

            console.log(`[Dashboard] 开始获取UP主 ${uid} 的数据`)

            type CardRes = {
              code?: number
              message?: string
              msg?: string
              data?: {
                card?: {
                  mid?: string
                  name?: string
                  face?: string
                  sign?: string
                  fans?: number
                  archive_count?: number
                  official_verify?: {
                    type?: number
                    desc?: string
                  }
                  vip?: {
                    vipStatus?: number
                  }
                }
                follower?: number
                like_num?: number
                archive_count?: number
              }
            }

            type RelationRes = {
              code?: number
              message?: string
              data?: {
                follower?: number
                following?: number
              }
            }

            type UpstatRes = {
              code?: number
              message?: string
              data?: {
                archive?: { view?: number }
                article?: { view?: number }
              }
            }

            type SpaceArcRes = {
              code?: number
              message?: string
              msg?: string
              data?: {
                list?: {
                  vlist?: Array<{
                    bvid?: string
                    title?: string
                    pic?: string
                    length?: string
                    created?: number
                    typeid_name?: string
                    play?: number
                    video_review?: number
                    comment?: number
                  }>
                }
                page?: {
                  count?: number
                }
              }
            }

            // 1. 基础信息：统一用 axios，避免 session.fetch 的 invalid referrer 问题
            let cardRes: CardRes = {}
            let relationRes: RelationRes = {}
            let upstatRes: UpstatRes = {}

            try {
              cardRes = await biliGetJson<CardRes>(
                `https://api.bilibili.com/x/web-interface/card?mid=${uid}&photo=true`,
                cookieString,
                'https://www.bilibili.com/'
              )
              console.log(`[Dashboard] card 返回:`, cardRes.code, cardRes.message || cardRes.msg)
            } catch (e) {
              console.error('[Dashboard] card 接口请求失败', e)
              return { success: false, error: '获取UP主基础信息失败，请检查网络或UID是否正确' }
            }

            if (cardRes.code !== 0) {
              return {
                success: false,
                error: `UP主信息获取失败：${cardRes.message || cardRes.msg || '返回码非0'}`
              }
            }

            // 2. 补充粉丝/关注数据
            try {
              relationRes = await biliGetJson<RelationRes>(
                `https://api.bilibili.com/x/relation/stat?vmid=${uid}`,
                cookieString,
                'https://space.bilibili.com/'
              )
              console.log('[Dashboard] relation 返回:', relationRes.code)
            } catch (e) {
              console.warn('[Dashboard] relation 接口失败:', e)
            }

            // 3. 补充稿件播放数据
            try {
              upstatRes = await biliGetJson<UpstatRes>(
                `https://api.bilibili.com/x/space/upstat?mid=${uid}`,
                cookieString,
                'https://space.bilibili.com/'
              )
              console.log('[Dashboard] upstat 返回:', upstatRes.code)
            } catch (e) {
              console.warn('[Dashboard] upstat 接口失败:', e)
            }

            // 4. 获取最新 50 条视频（分两页，每页 25，降低风控）
            let videos: VideoItem[] = []
            const cacheKey = `up-videos:${uid}`
            const cached = upVideoCache.get(cacheKey)

            if (cached && cached.expireAt > Date.now()) {
              console.log(`[Dashboard] 命中UP视频缓存: ${uid}, ${cached.data.length}条`)
              videos = [...cached.data]
            } else {
              const allVlist: Array<{
                bvid?: string
                title?: string
                pic?: string
                length?: string
                created?: number
                typeid_name?: string
                play?: number
                video_review?: number
                comment?: number
              }> = []

              const pages = [1, 2] // 2页 * 25 = 最多50条

              for (const pn of pages) {
                try {
                  if (pn > 1) {
                    await sleep(getRandomDelay(1200, 2200))
                  }

                  const spaceRes = await biliGetJson<SpaceArcRes>(
                    `https://api.bilibili.com/x/space/arc/search?mid=${uid}&ps=25&tid=0&pn=${pn}&order=pubdate`,
                    cookieString,
                    'https://space.bilibili.com/'
                  )

                  console.log(
                    `[Dashboard] space arc pn=${pn} 返回:`,
                    spaceRes.code,
                    spaceRes.message || spaceRes.msg
                  )

                  if (spaceRes.code === 0 && spaceRes.data?.list?.vlist?.length) {
                    allVlist.push(...spaceRes.data.list.vlist)
                  } else {
                    // 被风控 / 无更多数据时直接停
                    break
                  }
                } catch (e) {
                  console.warn(`[Dashboard] 获取第 ${pn} 页视频列表失败:`, e)
                  break
                }
              }

              videos = allVlist
                .slice(0, 50)
                .map((item) => ({
                  bvid: item.bvid || '',
                  title: item.title || '',
                  pic: item.pic || '',
                  duration: parseDurationStr(item.length),
                  pubdate: item.created || 0,
                  tname: item.typeid_name || '未知',
                  stat: {
                    view: item.play || 0,
                    like: 0,
                    coin: 0,
                    favorite: 0,
                    danmaku: item.video_review || 0,
                    reply: item.comment || 0,
                    share: 0
                  }
                }))
                .filter((v) => !!v.bvid)

              if (videos.length > 0) {
                // 💥 批量获取视频统计数据（点赞、投币、收藏等）
                const bvids = videos.map((v) => v.bvid)
                const statsMap = await fetchVideoStatsBatch(bvids, cookieString)
                for (const v of videos) {
                  const s = statsMap[v.bvid]
                  if (s) {
                    v.stat.like = s.like ?? v.stat.like
                    v.stat.coin = s.coin ?? v.stat.coin
                    v.stat.favorite = s.favorite ?? v.stat.favorite
                    v.stat.share = s.share ?? v.stat.share
                    v.stat.danmaku = s.danmaku ?? v.stat.danmaku
                    v.stat.reply = s.reply ?? v.stat.reply
                    v.stat.view = s.view ?? v.stat.view
                  }
                }
                upVideoCache.set(cacheKey, {
                  expireAt: Date.now() + 5 * 60 * 1000,
                  data: [...videos]
                })
              }
            }

            console.log(`[Dashboard] 最终获取到 ${videos.length} 个视频`)

            const card = cardRes.data?.card || {}
            const follower = relationRes.data?.follower ?? cardRes.data?.follower ?? card.fans ?? 0
            const following = relationRes.data?.following ?? 0
            const archiveViews = upstatRes.data?.archive?.view ?? 0
            const articleViews = upstatRes.data?.article?.view ?? 0
            const archiveCountFromCard =
              cardRes.data?.card?.archive_count || cardRes.data?.archive_count || 0

            // 5. 视频列表为空时，返回基础信息 + 补充字段，不整体失败
            if (videos.length === 0) {
              const fallback = buildFallbackUpAnalysis(cardRes.data, uid)
              return {
                success: true,
                data: {
                  ...fallback,
                  fans: follower,
                  following,
                  likes: cardRes.data?.like_num || 0,
                  archiveViews,
                  articleViews,
                  archiveCount: archiveCountFromCard,
                  videoCount: archiveCountFromCard,
                  fetchPartial: true,
                  fetchWarning: '基础信息已获取，但最新视频列表暂未获取成功'
                }
              }
            }

            // 6. 深度分析
            const analysis = analyzeUpData(videos, {
              ...cardRes.data,
              card: {
                ...card,
                fans: follower
              },
              like_num: cardRes.data?.like_num || 0
            })

            if ('error' in analysis) {
              const fallback = buildFallbackUpAnalysis(cardRes.data, uid)
              return {
                success: true,
                data: {
                  ...fallback,
                  fans: follower,
                  following,
                  likes: cardRes.data?.like_num || 0,
                  archiveViews,
                  articleViews,
                  archiveCount: archiveCountFromCard || videos.length,
                  videoCount: archiveCountFromCard || videos.length,
                  fetchPartial: true,
                  fetchWarning: `深度分析失败：${analysis.error}`
                }
              }
            }

            const mergedAnalysis = {
              ...analysis,
              fans: follower,
              following,
              likes: (analysis.totalLikes as number) || cardRes.data?.like_num || 0,
              archiveCount: analysis.videoCount || videos.length,
              archiveViews,
              articleViews,
              isVip: card.vip?.vipStatus === 1,
              verifyDesc: card.official_verify?.desc || '',
              verifyType:
                typeof card.official_verify?.type === 'number' ? card.official_verify.type : -1,
              liveStatus: false,
              latestVideoCount: videos.length
            }

            console.log('[Dashboard] mergedAnalysis keys:', Object.keys(mergedAnalysis))

            try {
              const aiAnalysis = await generateUpAIAnalysis(
                mergedAnalysis as ReturnType<typeof analyzeUpData>
              )
              return { success: true, data: { ...mergedAnalysis, aiAnalysis } }
            } catch (e) {
              console.error('[Dashboard] AI分析环节失败:', e)
              return { success: true, data: mergedAnalysis }
            }
          } catch (e) {
            console.error('[Dashboard] UP主分析异常:', e)
            return {
              success: false,
              error: `UP主数据获取失败：${e instanceof Error ? e.message : '未知错误'}`
            }
          }
        }

        // ==========================
        // 📌 视频深度分析 (唯一版本)
        // ==========================
        if (type === 'video' && keyword) {
          const bvMatch = keyword.match(/(BV\w{10})/i)
          if (!bvMatch) throw new Error('请输入包含 BV 号的链接或关键字')
          const bvid = bvMatch[0]

          // 获取视频详情
          const viewRes = await (
            await targetSession.fetch(
              `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`,
              {
                headers: {
                  ...headers,
                  Referer: 'https://www.bilibili.com/'
                }
              }
            )
          ).json()
          if (viewRes.code !== 0) throw new Error(viewRes.message)

          // 获取该UP主其他视频用于对比 (使用 axios)
          const mid = viewRes.data.owner.mid
          const upVideos: VideoItem[] = []

          try {
            let pageCount = 1
            const maxPages = 1 // 💥 只取1页，避免风控

            // 💥 使用 axios 获取UP主其他视频
            while (pageCount <= maxPages) {
              // 添加随机延迟 (1-2秒)
              if (pageCount > 1) {
                const delay = 1000 + Math.floor(Math.random() * 1000)
                await new Promise((resolve) => setTimeout(resolve, delay))
              }

              const spaceUrl = `https://api.bilibili.com/x/space/arc/search?mid=${mid}&ps=30&tid=0&pn=${pageCount}&order=pubdate`

              const spaceRes = await axios.get(spaceUrl, {
                headers: {
                  'User-Agent': headers['User-Agent'],
                  Referer: `https://space.bilibili.com/${mid}/video`,
                  Origin: 'https://space.bilibili.com',
                  Cookie: headers['Cookie'],
                  'X-Requested-With': 'XMLHttpRequest'
                },
                timeout: 15000
              })

              if (spaceRes.data?.code === 0 && spaceRes.data?.data?.list?.vlist?.length > 0) {
                for (const item of spaceRes.data.data.list.vlist) {
                  upVideos.push({
                    bvid: item.bvid,
                    title: item.title,
                    pic: item.pic,
                    duration: parseDurationStr(item.length),
                    pubdate: item.created,
                    tname: item.typeid_name || '未知',
                    stat: {
                      view: item.play || 0,
                      like: 0,
                      coin: 0,
                      favorite: 0,
                      danmaku: item.video_review || 0,
                      reply: item.comment || 0,
                      share: 0
                    }
                  })
                }
                pageCount++
              } else {
                break
              }
            }

            // 💥 批量获取视频统计数据（点赞、投币、收藏等）
            if (upVideos.length > 0) {
              const bvids = upVideos.map((v) => v.bvid)
              const statsMap = await fetchVideoStatsBatch(bvids, headers['Cookie'] || '')
              for (const v of upVideos) {
                const s = statsMap[v.bvid]
                if (s) {
                  v.stat.like = s.like ?? v.stat.like
                  v.stat.coin = s.coin ?? v.stat.coin
                  v.stat.favorite = s.favorite ?? v.stat.favorite
                  v.stat.share = s.share ?? v.stat.share
                  v.stat.danmaku = s.danmaku ?? v.stat.danmaku
                  v.stat.reply = s.reply ?? v.stat.reply
                  v.stat.view = s.view ?? v.stat.view
                }
              }
            }

            console.log(`[Dashboard] 视频分析-获取到 ${upVideos.length} 个UP主其他视频`)
          } catch (e) {
            console.warn('[Dashboard] 获取UP主其他视频失败:', e)
          }

          // 获取热门视频用于对比
          let hotRes: { data?: { list?: VideoItem[] } } = { data: { list: [] } }
          try {
            hotRes = await (
              await targetSession.fetch('https://api.bilibili.com/x/web-interface/popular?ps=50', {
                headers: {
                  ...headers,
                  Referer: 'https://www.bilibili.com/'
                }
              })
            ).json()
          } catch (e) {
            console.warn('[Dashboard] 获取热门视频失败:', e)
          }

          const analysis = analyzeVideoData(viewRes.data, upVideos, hotRes.data?.list || [])

          // 🌟 AI智能分析
          try {
            const aiAnalysis = await generateVideoAIAnalysis(analysis)
            return { success: true, data: { ...analysis, aiAnalysis } }
          } catch (e) {
            console.warn('[Dashboard] AI分析失败:', e)
          }

          return { success: true, data: analysis }
        }

        // ==========================
        // 📌 多视频对比分析
        // ==========================
        if (type === 'video-compare' && keyword) {
          const bvids = keyword
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
          if (bvids.length < 2) throw new Error('请至少输入2个BV号，用逗号分隔')

          const videos: VideoItem[] = []
          for (const bvid of bvids.slice(0, 5)) {
            const match = bvid.match(/(BV\w{10})/i)
            if (!match) continue
            const viewRes = await (
              await targetSession.fetch(
                `https://api.bilibili.com/x/web-interface/view?bvid=${match[1]}`,
                {
                  headers: {
                    ...headers,
                    Referer: 'https://www.bilibili.com/'
                  }
                }
              )
            ).json()
            if (viewRes.code === 0) {
              videos.push(viewRes.data)
            }
          }

          const comparison = compareVideos(videos)
          return { success: true, data: comparison }
        }

        // ==========================
        // 📌 趋势发现
        // ==========================
        if (type === 'trends') {
          console.log('[Dashboard] trends 请求开始')
          try {
            if (trendsCache && trendsCache.expireAt > Date.now()) {
              console.log('[Dashboard] 命中趋势缓存')
              return { success: true, data: trendsCache.data }
            }

            let popularList: unknown[] = []
            let weeklyList: unknown[] = []

            const safeHeaders = {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
              Referer: 'https://www.bilibili.com/',
              Origin: 'https://www.bilibili.com',
              Cookie: cookieString,
              Accept: 'application/json, text/plain, */*',
              'Accept-Language': 'zh-CN,zh;q=0.9',
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
              'X-Requested-With': 'XMLHttpRequest'
            }

            try {
              await sleep(getRandomDelay(600, 1200))
              const popularRes = (await (
                await targetSession.fetch(
                  'https://api.bilibili.com/x/web-interface/popular?ps=50',
                  { headers: safeHeaders }
                )
              ).json()) as { code?: number; message?: string; data?: { list?: unknown[] } }

              console.log('[Dashboard][Trends] popular code:', popularRes.code)
              if (popularRes.code === 0) {
                popularList = popularRes.data?.list || []
              } else {
                console.warn(
                  '[Dashboard][Trends] popular 返回非0:',
                  popularRes.code,
                  popularRes.message
                )
              }
            } catch (e) {
              console.warn('[Dashboard][Trends] popular 请求异常:', e)
            }

            try {
              await sleep(getRandomDelay(1000, 1800))
              const weeklyRes = (await (
                await targetSession.fetch(
                  'https://api.bilibili.com/x/web-interface/popular/series/list',
                  { headers: safeHeaders }
                )
              ).json()) as {
                code?: number
                message?: string
                data?: { list?: Array<{ number?: number }> }
              }

              console.log('[Dashboard][Trends] weekly list code:', weeklyRes.code)

              const latestNumber = weeklyRes.data?.list?.[0]?.number
              if (weeklyRes.code === 0 && latestNumber) {
                await sleep(getRandomDelay(1000, 1800))

                const weeklyDetailRes = (await (
                  await targetSession.fetch(
                    `https://api.bilibili.com/x/web-interface/popular/series/one?number=${latestNumber}`,
                    { headers: safeHeaders }
                  )
                ).json()) as { code?: number; message?: string; data?: { list?: unknown[] } }

                console.log('[Dashboard][Trends] weekly detail code:', weeklyDetailRes.code)
                if (weeklyDetailRes.code === 0) {
                  weeklyList = weeklyDetailRes.data?.list || []
                } else {
                  console.warn(
                    '[Dashboard][Trends] weekly detail 返回非0:',
                    weeklyDetailRes.code,
                    weeklyDetailRes.message
                  )
                }
              }
            } catch (e) {
              console.warn('[Dashboard][Trends] weekly 请求异常:', e)
            }

            console.log(
              `[Dashboard] 获取到 ${popularList.length} 个热门视频, ${weeklyList.length} 个每周必看视频`
            )

            if (popularList.length === 0 && weeklyList.length === 0) {
              if (trendsCache) {
                return {
                  success: true,
                  data: {
                    ...trendsCache.data,
                    fetchPartial: true,
                    fetchWarning: '趋势接口暂时不可用，已展示缓存数据'
                  }
                }
              }
              return { success: false, error: '趋势数据暂时获取失败，请稍后重试' }
            }

            const trends = analyzeTrends(popularList, weeklyList)

            const finalTrends = {
              ...trends,
              fetchPartial: popularList.length === 0 || weeklyList.length === 0,
              fetchWarning:
                popularList.length === 0
                  ? '热门视频接口暂不可用，当前结果主要基于每周必看'
                  : weeklyList.length === 0
                    ? '每周必看接口暂不可用，当前结果主要基于热门视频'
                    : ''
            }

            trendsCache = {
              expireAt: Date.now() + 10 * 60 * 1000,
              data: finalTrends
            }

            console.log('[Dashboard] trends 请求完成')
            return { success: true, data: finalTrends }
          } catch (err) {
            console.error('[Dashboard] 趋势发现API错误:', err)

            if (trendsCache) {
              return {
                success: true,
                data: {
                  ...trendsCache.data,
                  fetchPartial: true,
                  fetchWarning: '趋势实时接口失败，已展示缓存数据'
                }
              }
            }

            return { success: false, error: '获取趋势数据失败，请稍后重试' }
          }
        }

        // ==========================
        // 📌 年度历史报告数据推演
        // ==========================
        if (type === 'activity') {
          const historyRes = await (
            await targetSession.fetch(
              'https://api.bilibili.com/x/web-interface/history/cursor?ps=150',
              {
                headers: {
                  ...headers,
                  Referer: 'https://www.bilibili.com/'
                }
              }
            )
          ).json()
          if (historyRes.code !== 0) throw new Error('无法获取近期活动记录，请确认隐私设置未关闭')

          const list = historyRes.data.list || []
          if (!list.length) throw new Error('近期播放历史为空，暂无推演数据')

          let totalSecondsConsumed = 0
          const partitionMap: Record<string, number> = {}
          const upMap: Record<string, number> = {}
          let shortFocusCount = 0
          let longFocusCount = 0
          const hourSlots = { night: 0, morning: 0, noon: 0, evening: 0 }

          list.forEach((entry: HistoryEntry) => {
            const duration = entry.duration || 0
            const progress =
              entry.progress && entry.progress > 0
                ? entry.progress
                : entry.progress === -1
                  ? duration
                  : 0
            totalSecondsConsumed += progress

            if (duration > 0 && duration < 240) shortFocusCount++
            else if (duration > 900) longFocusCount++

            const tname = entry.history?.tname || entry.history?.part || '未知分区'
            partitionMap[tname] = (partitionMap[tname] || 0) + 1

            const upName = entry.author_name || '无法识别'
            upMap[upName] = (upMap[upName] || 0) + 1

            const timestamp = entry.view_at || 0
            if (timestamp) {
              const hour = new Date(timestamp * 1000).getHours()
              if (hour < 6) hourSlots.night++
              else if (hour < 12) hourSlots.morning++
              else if (hour < 18) hourSlots.noon++
              else hourSlots.evening++
            }
          })

          const tagSys: string[] = []
          const maxHourSlot = Object.keys(hourSlots).reduce((a, b) =>
            hourSlots[a as keyof typeof hourSlots] > hourSlots[b as keyof typeof hourSlots] ? a : b
          )
          if (maxHourSlot === 'night') tagSys.push('修仙猫头鹰 🦇')
          else if (maxHourSlot === 'morning') tagSys.push('早晨发电机 ☀️')
          else if (maxHourSlot === 'evening') tagSys.push('深夜食堂控 🌃')
          else tagSys.push('白昼冲浪者 🏄')

          if (shortFocusCount > longFocusCount * 1.5) tagSys.push('碎片化吃瓜 ⚡')
          else if (longFocusCount > shortFocusCount) tagSys.push('深度学习者 🧠')
          else tagSys.push('随缘刷屏党 ⚖️')

          const favObjToArray = (obj: Record<string, number>): { name: string; value: number }[] =>
            Object.entries(obj)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)

          return {
            success: true,
            data: {
              activeHistoryCount: list.length,
              timeConsumedSec: totalSecondsConsumed,
              userTags: tagSys,
              pieDataRaw: JSON.stringify(favObjToArray(partitionMap).slice(0, 8)),
              favoriteUpsRaw: JSON.stringify(
                favObjToArray(upMap)
                  .filter((u) => u.name !== '无法识别' && u.name !== '')
                  .slice(0, 3)
              )
            }
          }
        }

        return { success: false, error: '非法的请求类型' }
      } catch (error: unknown) {
        if (error instanceof Error) return { success: false, error: error.message }
        return { success: false, error: '接口通讯遭遇网络阻断' }
      }
    }
  )
}

// ==========================
// 📊 数据分析函数
// ==========================

function buildFallbackUpAnalysis(cardData: unknown, uid?: string): Record<string, unknown> {
  const cardWrap = cardData as {
    card?: {
      name?: string
      face?: string
      sign?: string
      fans?: number
      archive_count?: number
      official_verify?: {
        type?: number
        desc?: string
      }
      vip?: {
        vipStatus?: number
      }
    }
    follower?: number
    like_num?: number
    archive_count?: number
  }

  const card = cardWrap?.card || {}
  const archiveCount = cardWrap?.archive_count || card.archive_count || 0

  return {
    name: card.name || `UP主 ${uid || ''}`,
    face: card.face || '',
    sign: card.sign || '',
    fans: cardWrap?.follower || card.fans || 0,
    totalLikes: cardWrap?.like_num || 0,
    videoCount: archiveCount,
    archiveCount,

    averages: {
      views: 0,
      likes: 0,
      coins: 0,
      favorites: 0,
      engagementRate: '0.00'
    },

    updatePattern: {
      avgInterval: '0.0',
      daysSinceLastUpdate: 0,
      isRegular: '暂无数据',
      status: '视频列表获取失败'
    },

    partitions: [],
    durationDistribution: {
      short: 0,
      medium: 0,
      long: 0,
      extraLong: 0
    },

    hotVideos: [],
    hotVideoCount: 0,

    publishPreference: {
      peakHour: 0,
      peakHourFormatted: '暂无数据',
      hourDistribution: new Array(24).fill(0)
    },

    topEngagement: [],

    titlePatterns: {
      withEmoji: 0,
      withNumber: 0,
      withBracket: 0,
      percent: {
        emoji: '0.0',
        number: '0.0',
        bracket: '0.0'
      },
      lengthDistribution: {
        veryShort: '0.0',
        short: '0.0',
        medium: '0.0',
        long: '0.0'
      }
    },

    series: [],
    trendCurve: [],

    // 兼容前端基础卡片
    likes: cardWrap?.like_num || 0,
    following: 0,
    isVip: card.vip?.vipStatus === 1,
    verifyDesc: card.official_verify?.desc || '',
    verifyType: typeof card.official_verify?.type === 'number' ? card.official_verify.type : -1,
    liveStatus: false,

    aiAnalysis: {
      summary: '已成功获取UP主基础信息，但视频列表接口当前被限流，无法完成完整深度分析。',
      strengths: ['基础资料完整', '账号身份可识别', '可展示基础画像'],
      suggestions: ['稍后重试', '减少连续查询', '启用本地缓存'],
      contentStrategy: '当前先展示基础洞察，等待视频接口恢复后再补充深度分析'
    }
  }
}

function analyzeUpData(
  videos: VideoItem[],
  cardData: unknown
): Record<string, unknown> | { error: string } {
  console.log(`[Dashboard] analyzeUpData 接收到 ${videos.length} 个视频`)

  if (!videos.length) {
    return { error: '该UP主暂无视频数据（可能是接口限制或UP主没有投稿）' }
  }

  const card = cardData as {
    card?: {
      name?: string
      face?: string // 头像
      sign?: string // 签名
      fans?: number
    }
    like_num?: number // 获赞数
  }

  // 1. 基础统计
  const totalViews = videos.reduce((sum, v) => sum + (v.stat?.view || 0), 0)
  const totalLikes = videos.reduce((sum, v) => sum + (v.stat?.like || 0), 0)
  const totalCoins = videos.reduce((sum, v) => sum + (v.stat?.coin || 0), 0)
  const totalFavorites = videos.reduce((sum, v) => sum + (v.stat?.favorite || 0), 0)

  // 2. 投稿频率分析
  const pubDates = videos.map((v) => v.pubdate * 1000).sort((a, b) => b - a)
  const intervals: number[] = []
  for (let i = 0; i < pubDates.length - 1; i++) {
    intervals.push((pubDates[i] - pubDates[i + 1]) / (1000 * 60 * 60 * 24))
  }
  const avgInterval = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0
  const lastUpdate = pubDates[0]
  const daysSinceLastUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60 * 24)

  // 3. 分区统计
  const partitionCount: Record<string, number> = {}
  videos.forEach((v) => {
    const tname = v.tname || '未知'
    partitionCount[tname] = (partitionCount[tname] || 0) + 1
  })

  // 4. 视频时长分布
  const durationRanges = {
    short: 0, // < 5分钟
    medium: 0, // 5-20分钟
    long: 0, // 20-60分钟
    extraLong: 0 // > 60分钟
  }
  videos.forEach((v) => {
    const minutes = v.duration / 60
    if (minutes < 5) durationRanges.short++
    else if (minutes < 20) durationRanges.medium++
    else if (minutes < 60) durationRanges.long++
    else durationRanges.extraLong++
  })

  // 5. 爆款识别 (播放量 > 平均播放量2倍 或 > 10万)
  const avgViews = totalViews / videos.length
  const hotThreshold = Math.max(avgViews * 2, 100000)
  const hotVideos = videos
    .filter((v) => v.stat?.view >= hotThreshold)
    .sort((a, b) => (b.stat?.view || 0) - (a.stat?.view || 0))
    .slice(0, 5)
    .map((v) => ({
      bvid: v.bvid,
      title: v.title,
      view: v.stat?.view || 0,
      pic: v.pic
    }))

  // 6. 发布时间偏好分析
  const hourDistribution = new Array(24).fill(0)
  videos.forEach((v) => {
    const hour = new Date(v.pubdate * 1000).getHours()
    hourDistribution[hour]++
  })
  const peakHour = hourDistribution.indexOf(Math.max(...hourDistribution))

  // 7. 互动率分析
  const engagementRates = videos
    .map((v) => {
      const view = v.stat?.view || 1
      return {
        bvid: v.bvid,
        title: v.title,
        likeRate: ((v.stat?.like || 0) / view) * 100,
        coinRate: ((v.stat?.coin || 0) / view) * 100,
        favRate: ((v.stat?.favorite || 0) / view) * 100,
        danmakuRate: ((v.stat?.danmaku || 0) / view) * 100
      }
    })
    .sort((a, b) => b.likeRate - a.likeRate)

  // 8. 标题分析
  const titlePatterns = analyzeTitles(videos.map((v) => v.title))

  // 9. 系列视频识别 (相似标题)
  const series = identifySeries(videos)

  // 平均数据辅助数组（互动数据只统计有实际值的避免被 0 拉低）
  const likesArr = videos.map((v) => v.stat?.like || 0).filter((v) => v > 0)
  const coinsArr = videos.map((v) => v.stat?.coin || 0).filter((v) => v > 0)
  const favoritesArr = videos.map((v) => v.stat?.favorite || 0).filter((v) => v > 0)

  return {
    // 基础数据
    name: card?.card?.name || '',
    face: card?.card?.face || '', // 头像
    sign: card?.card?.sign || '', // 签名
    fans: card?.card?.fans || 0,
    totalLikes: card?.like_num || 0,
    videoCount: videos.length,

    averages: {
      views: Math.round(totalViews / videos.length),
      likes: likesArr.length ? Math.round(likesArr.reduce((a, b) => a + b, 0) / likesArr.length) : 0,
      coins: coinsArr.length ? Math.round(coinsArr.reduce((a, b) => a + b, 0) / coinsArr.length) : 0,
      favorites: favoritesArr.length ? Math.round(favoritesArr.reduce((a, b) => a + b, 0) / favoritesArr.length) : 0,
      engagementRate: (((totalLikes + totalCoins * 2 + totalFavorites) / totalViews) * 100).toFixed(
        2
      )
    },

    // 更新规律
    updatePattern: {
      avgInterval: avgInterval.toFixed(1),
      daysSinceLastUpdate: Math.round(daysSinceLastUpdate),
      isRegular:
        avgInterval < 7
          ? '高频更新'
          : avgInterval < 14
            ? '规律更新'
            : avgInterval < 30
              ? '偶尔更新'
              : '随缘更新',
      status:
        daysSinceLastUpdate > avgInterval * 1.5
          ? '可能停更'
          : daysSinceLastUpdate > 30
            ? '长期未更新'
            : '正常更新'
    },

    // 分区分布
    partitions: Object.entries(partitionCount)
      .map(([name, count]) => ({
        name,
        count,
        percent: ((count / videos.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count),

    // 时长分布
    durationDistribution: durationRanges,

    // 爆款视频
    hotVideos,
    hotVideoCount: hotVideos.length,

    // 发布时间偏好
    publishPreference: {
      peakHour,
      peakHourFormatted: `${peakHour}:00`,
      hourDistribution
    },

    // 互动率排名
    topEngagement: engagementRates.slice(0, 5),

    // 标题风格
    titlePatterns,

    // 系列视频
    series,

    // 数据曲线 (用于图表)
    trendCurve: videos
      .slice(0, 20)
      .map((v) => v.stat?.view || 0)
      .reverse()
  }
}

function analyzeVideoData(
  video: unknown,
  upVideos: VideoItem[],
  hotVideos: unknown[]
): Record<string, unknown> {
  const v = video as VideoItem
  const stats = (v.stat || {}) as {
    view?: number
    like?: number
    coin?: number
    favorite?: number
    share?: number
    danmaku?: number
    reply?: number
  }
  const views = stats.view || 1

  // 1. 基础比率分析
  const ratios = {
    likeRate: (((stats.like || 0) / views) * 100).toFixed(2),
    coinRate: (((stats.coin || 0) / views) * 100).toFixed(2),
    favRate: (((stats.favorite || 0) / views) * 100).toFixed(2),
    shareRate: (((stats.share || 0) / views) * 100).toFixed(2),
    danmakuRate: (((stats.danmaku || 0) / views) * 100).toFixed(2),
    replyRate: (((stats.reply || 0) / views) * 100).toFixed(2)
  }

  // 2. 互动率 (三连相关)
  const tripleWeight = (stats.like || 0) + (stats.coin || 0) * 2 + (stats.favorite || 0) * 1.5
  const engagementRate = ((tripleWeight / views) * 100).toFixed(2)

  // 3. 与UP主其他视频对比
  const upAvgViews =
    upVideos.length > 0
      ? upVideos.reduce((sum, vid) => sum + (vid.stat?.view || 0), 0) / upVideos.length
      : null
  const vsUpAverage =
    upAvgViews !== null
      ? views >= upAvgViews
        ? `高于平均值 ${((views / upAvgViews - 1) * 100).toFixed(0)}%`
        : `低于平均值 ${((1 - views / upAvgViews) * 100).toFixed(0)}%`
      : '暂无对比数据（未获取到该UP主其他稿件）'

  // 4. 与热门视频对比
  const hotList = hotVideos as VideoItem[]
  const hotAvgViews = hotList.length
    ? hotList.reduce((sum, vid) => sum + (vid.stat?.view || 0), 0) / hotList.length
    : views
  const vsHotAverage =
    views >= hotAvgViews
      ? `高于热门均值 ${((views / hotAvgViews - 1) * 100).toFixed(0)}%`
      : `低于热门均值 ${((1 - views / hotAvgViews) * 100).toFixed(0)}%`

  // 5. 热度评分 (综合算法)
  const engagementScore = Math.min(100, (tripleWeight / views) * 200)
  const viewScore = Math.min(100, Math.log10(views) * 10)
  const heatScore = Math.round(engagementScore * 0.6 + viewScore * 0.4)

  // 6. 完播潜力评估
  const duration = v.duration || 0
  const durationMinutes = duration / 60
  let completionPotential: string
  let completionScore: number
  if (durationMinutes < 3) {
    completionPotential = '极高 (短视频易完播)'
    completionScore = 95
  } else if (durationMinutes < 10) {
    completionPotential = '高 (中等时长适中)'
    completionScore = 80
  } else if (durationMinutes < 20) {
    completionPotential = '中等 (需要内容吸引力)'
    completionScore = 65
  } else if (durationMinutes < 40) {
    completionPotential = '较低 (长视频挑战大)'
    completionScore = 50
  } else {
    completionPotential = '低 (超长视频)'
    completionScore = 35
  }

  // 7. 标题吸引力评分
  const title = v.title || ''
  let titleScore = 60
  const titleFactors: string[] = []
  if (title.length >= 15 && title.length <= 30) {
    titleScore += 15
    titleFactors.push('长度适中')
  } else if (title.length > 30) {
    titleScore += 5
    titleFactors.push('略长但信息丰富')
  } else {
    titleFactors.push('偏短，信息量不足')
  }
  if (/[[【「『]/.test(title)) {
    titleScore += 10
    titleFactors.push('有标签/分类标识')
  }
  if (/[！!？?]|\d+/.test(title)) {
    titleScore += 10
    titleFactors.push('有数字或感叹元素')
  }
  if (title.includes('|') || title.includes('/')) {
    titleScore += 5
    titleFactors.push('有分隔符增加层次')
  }

  // 8. 评论活跃度
  const reply = stats.reply || 0
  const danmaku = stats.danmaku || 0
  const commentActivity = {
    replyPer1000: ((reply / views) * 1000).toFixed(1),
    danmakuPer1000: ((danmaku / views) * 1000).toFixed(1),
    level:
      reply + danmaku > views * 0.1
        ? '极高'
        : reply + danmaku > views * 0.05
          ? '高'
          : reply + danmaku > views * 0.02
            ? '中等'
            : '较低'
  }

  return {
    // 基础信息
    bvid: v.bvid,
    title: v.title,
    cover: v.pic,
    duration: v.duration,
    pubdate: v.pubdate,
    views: stats.view || 0,

    // 💥 原始统计数据（用于显示绝对数值）
    stats: {
      like: stats.like || 0,
      coin: stats.coin || 0,
      favorite: stats.favorite || 0,
      danmaku: stats.danmaku || 0,
      reply: stats.reply || 0,
      share: stats.share || 0
    },

    // 创作者信息
    owner: v.owner || { name: '' },

    // 数据比率
    ratios,
    engagementRate,

    // 评分
    scores: {
      heat: heatScore,
      heatLevel:
        heatScore >= 80
          ? '🔥 爆款'
          : heatScore >= 60
            ? '✨ 热门'
            : heatScore >= 40
              ? '📈 良好'
              : '📝 普通',
      completion: completionScore,
      completionPotential,
      title: Math.min(100, titleScore),
      titleFactors
    },

    // 对比分析
    comparison: {
      vsUpAverage,
      vsHotAverage,
      upVideoCount: upVideos.length
    },

    // 评论活跃度
    commentActivity,

    // 综合评级
    overallRating:
      heatScore >= 80
        ? 'S'
        : heatScore >= 65
          ? 'A'
          : heatScore >= 50
            ? 'B'
            : heatScore >= 35
              ? 'C'
              : 'D'
  }
}

function compareVideos(videos: unknown[]):
  | { error: string }
  | {
      videos: Array<{
        bvid: string
        title: string
        pic: string
        duration: number
        pubdate: number
        owner: string
        views: number
        likes: number
        coins: number
        favorites: number
        danmaku: number
        likeRate: string
        coinRate: string
        engagementScore: number
      }>
      count: number
      winners: {
        mostViewed: unknown
        bestEngagement: unknown
        mostCoins: unknown
      }
      averages: {
        views: number
        likes: number
        engagementRate: string
      }
    } {
  const vids = videos as VideoItem[]
  if (vids.length < 2) return { error: '需要至少2个视频进行对比' }

  const comparison = vids.map((v) => {
    const stats = (v.stat || {}) as {
      view?: number
      like?: number
      coin?: number
      favorite?: number
      danmaku?: number
    }
    const views = stats.view || 1
    return {
      bvid: v.bvid,
      title: v.title,
      pic: v.pic,
      duration: v.duration,
      pubdate: v.pubdate,
      owner: v.owner?.name || '',
      views: stats.view || 0,
      likes: stats.like || 0,
      coins: stats.coin || 0,
      favorites: stats.favorite || 0,
      danmaku: stats.danmaku || 0,
      likeRate: (((stats.like || 0) / views) * 100).toFixed(2),
      coinRate: (((stats.coin || 0) / views) * 100).toFixed(2),
      engagementScore: Math.round(
        (((stats.like || 0) + (stats.coin || 0) * 2 + (stats.favorite || 0)) / views) * 100
      )
    }
  })

  // 找出各项冠军
  const maxViews = comparison.reduce((max, v) => (v.views > max.views ? v : max))
  const maxEngagement = comparison.reduce((max, v) =>
    parseFloat(v.likeRate) > parseFloat(max.likeRate) ? v : max
  )
  const maxCoins = comparison.reduce((max, v) => (v.coins > max.coins ? v : max))

  return {
    videos: comparison,
    count: comparison.length,
    winners: {
      mostViewed: maxViews,
      bestEngagement: maxEngagement,
      mostCoins: maxCoins
    },
    averages: {
      views: Math.round(comparison.reduce((sum, v) => sum + v.views, 0) / comparison.length),
      likes: Math.round(comparison.reduce((sum, v) => sum + v.likes, 0) / comparison.length),
      engagementRate: (
        comparison.reduce((sum, v) => sum + parseFloat(v.likeRate), 0) / comparison.length
      ).toFixed(2)
    }
  }
}

// 标准化视频数据（B站不同接口返回的字段不一致，需要统一转换）
function normalizeVideoItem(raw: {
  bvid?: string
  title?: string
  pic?: string
  duration?: string | number
  pubdate?: number
  owner?: { name?: string; fans?: number; face?: string }
  stat?: {
    view?: number
    danmaku?: number
    reply?: number
    favorite?: number
    coin?: number
    share?: number
    like?: number
  }
  // popular 接口的字段名不同
  play?: number
  video_review?: number
  comment?: number
  favorite?: number
  coin?: number
  share?: number
  like?: number
  views?: number
  tname?: string
}): VideoItem {
  return {
    bvid: raw.bvid || 'unknown',
    title: raw.title || '',
    pic: raw.pic || '',
    duration: parseDurationStr(String(raw.duration)) || 0,
    pubdate: raw.pubdate || 0,
    owner: {
      name: raw.owner?.name || '未知UP主',
      fans: raw.owner?.fans || 0,
      face: raw.owner?.face || ''
    },
    stat: {
      view: raw.stat?.view ?? raw.play ?? raw.views ?? 0,
      danmaku: raw.stat?.danmaku ?? raw.video_review ?? 0,
      reply: raw.stat?.reply ?? raw.comment ?? 0,
      favorite: raw.stat?.favorite ?? raw.favorite ?? 0,
      coin: raw.stat?.coin ?? raw.coin ?? 0,
      share: raw.stat?.share ?? raw.share ?? 0,
      like: raw.stat?.like ?? raw.like ?? 0
    },
    tname: raw.tname || '未知'
  }
}

function analyzeTrends(popularVideos: unknown[], weeklyVideos: unknown[]): Record<string, unknown> {
  // 标准化数据（处理不同接口字段不一致的问题）
  const pop = (popularVideos as Array<Parameters<typeof normalizeVideoItem>[0]>).map(
    normalizeVideoItem
  )
  const week = (weeklyVideos as Array<Parameters<typeof normalizeVideoItem>[0]>).map(
    normalizeVideoItem
  )
  const allVideos = [...pop, ...week]

  // 如果没有数据，返回空结构而不是错误对象（避免前端误判）
  if (allVideos.length === 0) {
    return {
      hotKeywords: [],
      hotPartitions: [],
      risingUps: [],
      hiddenGems: [],
      durationRanges: {
        veryShort: { label: '短视频(<3分)', count: 0, color: '#52c41a' },
        short: { label: '中等(3-10分)', count: 0, color: '#00aeec' },
        medium: { label: '长视频(10-30分)', count: 0, color: '#f3a034' },
        long: { label: '超长(30-60分)', count: 0, color: '#fb7299' },
        veryLong: { label: '巨长(>60分)', count: 0, color: '#8A2BE2' }
      },
      hourlyDistribution: new Array(24).fill(0),
      peakHour: 0,
      engagementStats: { avgViews: 0, avgLikes: 0, avgCoins: 0, avgLikeRate: '0.00' },
      hotVideosPreview: [],
      totalAnalyzed: 0,
      updateTime: new Date().toLocaleString()
    }
  }

  // 1. 热门关键词提取 - 改进算法，提取更有意义的词
  const keywordCount: Record<string, number> = {}
  const stopWords = [
    '的',
    '了',
    '是',
    '在',
    '我',
    '有',
    '和',
    '就',
    '不',
    '人',
    '都',
    '一',
    '一个',
    '上',
    '也',
    '很',
    '到',
    '说',
    '要',
    '去',
    '你',
    '会',
    '着',
    '没有',
    '看',
    '好',
    '自己',
    '这',
    '吗',
    '吧',
    '呢',
    '啊',
    '哦',
    '嗯',
    '那个',
    '这个',
    '什么',
    '怎么',
    '为什么',
    '如何',
    '吗',
    '么',
    '了',
    '过'
  ]

  allVideos.forEach((v) => {
    const title = v.title || ''
    // 清理标题：移除符号，保留中文、英文、数字
    const cleanTitle = title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ').trim()

    // 提取2-5个字的词组
    for (let i = 0; i < cleanTitle.length - 1; i++) {
      for (let len = 2; len <= 5 && i + len <= cleanTitle.length; len++) {
        const word = cleanTitle.slice(i, i + len).trim()
        // 过滤条件：长度合适、不是纯数字、不是停用词、至少包含一个汉字
        if (
          word.length >= 2 &&
          word.length <= 5 &&
          !/^\d+$/.test(word) &&
          !stopWords.includes(word) &&
          /[\u4e00-\u9fa5]/.test(word)
        ) {
          keywordCount[word] = (keywordCount[word] || 0) + 1
        }
      }
    }
  })

  const hotKeywords = Object.entries(keywordCount)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count], index) => ({
      word,
      count,
      rank: index + 1,
      level: index < 3 ? 'hot' : index < 8 ? 'warm' : 'normal'
    }))

  // 2. 分区热度
  const partitionCount: Record<string, number> = {}
  allVideos.forEach((v) => {
    const tname = v.tname || '未知'
    partitionCount[tname] = (partitionCount[tname] || 0) + 1
  })

  const hotPartitions = Object.entries(partitionCount)
    .map(([name, count]) => ({
      name,
      count,
      percent: ((count / allVideos.length) * 100).toFixed(1)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 3. 视频时长分布趋势
  const durationRanges = {
    veryShort: { label: '短视频(<3分)', count: 0, color: '#52c41a' },
    short: { label: '中等(3-10分)', count: 0, color: '#00aeec' },
    medium: { label: '长视频(10-30分)', count: 0, color: '#f3a034' },
    long: { label: '超长(30-60分)', count: 0, color: '#fb7299' },
    veryLong: { label: '巨长(>60分)', count: 0, color: '#8A2BE2' }
  }

  allVideos.forEach((v) => {
    const minutes = (v.duration || 0) / 60
    if (minutes < 3) durationRanges.veryShort.count++
    else if (minutes < 10) durationRanges.short.count++
    else if (minutes < 30) durationRanges.medium.count++
    else if (minutes < 60) durationRanges.long.count++
    else durationRanges.veryLong.count++
  })

  // 4. 发布时间分布（小时）
  const hourlyDistribution = new Array(24).fill(0)
  allVideos.forEach((v) => {
    const hour = new Date((v.pubdate || 0) * 1000).getHours()
    hourlyDistribution[hour]++
  })
  const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution))

  // 5. 互动数据分布
  const engagementStats = {
    avgViews: Math.round(
      allVideos.reduce((sum, v) => sum + (v.stat?.view || 0), 0) / allVideos.length
    ),
    avgLikes: Math.round(
      allVideos.reduce((sum, v) => sum + (v.stat?.like || 0), 0) / allVideos.length
    ),
    avgCoins: Math.round(
      allVideos.reduce((sum, v) => sum + (v.stat?.coin || 0), 0) / allVideos.length
    ),
    avgLikeRate: (
      (allVideos.reduce((sum, v) => sum + (v.stat?.like || 0) / (v.stat?.view || 1), 0) /
        allVideos.length) *
      100
    ).toFixed(2)
  }

  // 6. 上升UP主 (出现次数多的)
  const upCount: Record<string, { count: number; fans?: number; face?: string }> = {}
  allVideos.forEach((v) => {
    const name = v.owner?.name
    if (name) {
      if (!upCount[name]) {
        upCount[name] = { count: 0, fans: v.owner?.fans, face: v.owner?.face }
      }
      upCount[name].count++
    }
  })

  const risingUps = Object.entries(upCount)
    .filter(([, data]) => data.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([name, data], index) => ({
      name,
      videoCount: data.count,
      rank: index + 1
    }))

  // 7. 高质量冷门视频发现
  const hiddenGems = pop
    .filter((v) => v.stat?.view < 50000 && v.stat?.view > 5000)
    .filter((v) => {
      const likeRate = (v.stat?.like || 0) / (v.stat?.view || 1)
      return likeRate > 0.05
    })
    .sort(
      (a, b) =>
        (b.stat?.like || 0) / (b.stat?.view || 1) - (a.stat?.like || 0) / (a.stat?.view || 1)
    )
    .slice(0, 6)
    .map((v) => ({
      bvid: v.bvid,
      title: v.title,
      pic: v.pic,
      views: v.stat?.view || 0,
      likeRate: (((v.stat?.like || 0) / (v.stat?.view || 1)) * 100).toFixed(2)
    }))

  // 8. 热门视频预览（播放最高的几个）
  const hotVideosPreview = pop
    .sort((a, b) => (b.stat?.view || 0) - (a.stat?.view || 0))
    .slice(0, 4)
    .map((v) => ({
      bvid: v.bvid,
      title: v.title,
      pic: v.pic,
      views: v.stat?.view || 0,
      likes: v.stat?.like || 0,
      owner: v.owner?.name || ''
    }))

  return {
    hotKeywords,
    hotPartitions,
    risingUps,
    hiddenGems,
    durationRanges,
    hourlyDistribution,
    peakHour,
    engagementStats,
    hotVideosPreview,
    totalAnalyzed: allVideos.length,
    updateTime: new Date().toLocaleString()
  }
}

// 辅助函数：分析标题风格
function analyzeTitles(titles: string[]): Record<string, unknown> {
  const patterns = {
    withEmoji: 0,
    withNumber: 0,
    withBracket: 0,
    withQuestion: 0,
    withExclamation: 0,
    withSeparator: 0,
    veryShort: 0, // < 10字
    short: 0, // 10-20字
    medium: 0, // 20-30字
    long: 0 // > 30字
  }

  titles.forEach((title) => {
    // 检测 emoji（使用字符类简化检测）
    // 注意：完整 emoji 检测需要更复杂的正则，这里简化处理
    if (/[\uD83C\uD83D\uD83E\u2600-\u26FF\u2700-\u27BF]/.test(title)) patterns.withEmoji++
    if (/\d/.test(title)) patterns.withNumber++
    if (/[[【「『（]/.test(title)) patterns.withBracket++
    if (/[？?]/.test(title)) patterns.withQuestion++
    if (/[！!]/.test(title)) patterns.withExclamation++
    if (/[|/\\]/.test(title)) patterns.withSeparator++

    const len = title.length
    if (len < 10) patterns.veryShort++
    else if (len < 20) patterns.short++
    else if (len < 30) patterns.medium++
    else patterns.long++
  })

  const total = titles.length || 1
  return {
    ...patterns,
    percent: {
      emoji: ((patterns.withEmoji / total) * 100).toFixed(1),
      number: ((patterns.withNumber / total) * 100).toFixed(1),
      bracket: ((patterns.withBracket / total) * 100).toFixed(1)
    },
    lengthDistribution: {
      veryShort: ((patterns.veryShort / total) * 100).toFixed(1),
      short: ((patterns.short / total) * 100).toFixed(1),
      medium: ((patterns.medium / total) * 100).toFixed(1),
      long: ((patterns.long / total) * 100).toFixed(1)
    }
  }
}

// 辅助函数：识别系列视频
function identifySeries(
  videos: VideoItem[]
): Array<{ name: string; count: number; videos: string[] }> {
  const series: Array<{ name: string; count: number; videos: string[] }> = []
  const processed = new Set<string>()

  // 常见的系列标识
  const seriesPatterns = [
    /^(.*?)[第\s]*(\d+)[集期话章]/,
    /^(.*?)\s*EP?\s*(\d+)/i,
    /^(.*?)[\s]*Part\s*(\d+)/i,
    /^(.*?)[：:：]\s*(.+)/,
    /^(.*?)(\d+)\s*[-~～]\s*\d+/
  ]

  videos.forEach((v) => {
    if (processed.has(v.bvid)) return

    for (const pattern of seriesPatterns) {
      const match = v.title.match(pattern)
      if (match) {
        const seriesName = match[1].trim()
        if (seriesName.length >= 2 && seriesName.length <= 15) {
          // 找到同系列的其他视频
          const related = videos.filter((v2) => {
            if (v2.bvid === v.bvid) return false
            const v2Match = v2.title.match(pattern)
            return v2Match && v2Match[1].trim() === seriesName
          })

          if (related.length >= 2) {
            series.push({
              name: seriesName,
              count: related.length + 1,
              videos: [v.title, ...related.map((r) => r.title)].slice(0, 3)
            })
            processed.add(v.bvid)
            related.forEach((r) => processed.add(r.bvid))
            break
          }
        }
      }
    }
  })

  return series.slice(0, 5)
}

// ==========================
// 🤖 AI智能分析函数
// ==========================

async function generateUpAIAnalysis(data: Record<string, unknown>): Promise<{
  summary: string
  strengths: string[]
  suggestions: string[]
  contentStrategy: string
}> {
  if ('error' in data) {
    throw new Error('无法分析：没有数据')
  }

  // 使用类型断言访问嵌套属性
  const d = data as {
    name?: string
    fans?: number
    videoCount?: number
    averages?: { views?: number; likes?: number; engagementRate?: string }
    updatePattern?: { isRegular?: string; avgInterval?: string; status?: string }
    partitions?: Array<{ name?: string }>
    hotVideoCount?: number
  }

  const prompt = `请分析以下B站UP主数据，给出专业、简洁的见解：

UP主：${d.name || '未知'}
粉丝数：${d.fans || 0}
视频数：${d.videoCount || 0}
平均播放量：${d.averages?.views || 0}
平均点赞：${d.averages?.likes || 0}
平均互动率：${d.averages?.engagementRate || '0'}%
更新频率：${d.updatePattern?.isRegular || '未知'}（平均${d.updatePattern?.avgInterval || '0'}天更新一次）
更新状态：${d.updatePattern?.status || '未知'}
主要分区：${(d.partitions || [])
    .slice(0, 3)
    .map((p) => p.name || '未知')
    .join('、')}
爆款视频数：${d.hotVideoCount || 0}

请提供：
1. 一句话总结该UP主特点
2. 3个核心优势（每点15字以内）
3. 3条改进建议（每点15字以内）
4. 内容策略建议（30字以内）

回复格式：
总结：...
优势：1. ... 2. ... 3. ...
建议：1. ... 2. ... 3. ...
策略：...`

  const systemPrompt = '你是B站数据分析专家，擅长从数据中发现内容创作者的特点和机会。'

  try {
    const response = await generateAIResponse(prompt, systemPrompt)
    if (!response) throw new Error('AI返回空')

    // 解析AI回复
    const lines = response.split('\n').filter((l) => l.trim())
    let summary = ''
    const strengths: string[] = []
    const suggestions: string[] = []
    let contentStrategy = ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('总结：')) {
        summary = trimmed.replace('总结：', '').trim()
      } else if (trimmed.startsWith('优势：')) {
        const content = trimmed.replace('优势：', '').trim()
        const items = content.match(/\d+\.\s*([^\d]+?)(?=\d+\.|$)/g) || []
        items.forEach((item) => {
          const clean = item.replace(/^\d+\.\s*/, '').trim()
          if (clean) strengths.push(clean)
        })
      } else if (trimmed.startsWith('建议：')) {
        const content = trimmed.replace('建议：', '').trim()
        const items = content.match(/\d+\.\s*([^\d]+?)(?=\d+\.|$)/g) || []
        items.forEach((item) => {
          const clean = item.replace(/^\d+\.\s*/, '').trim()
          if (clean) suggestions.push(clean)
        })
      } else if (trimmed.startsWith('策略：')) {
        contentStrategy = trimmed.replace('策略：', '').trim()
      }
    }

    // 使用类型断言访问属性
    const dd = data as {
      name?: string
      updatePattern?: { isRegular?: string }
      partitions?: Array<{ name?: string }>
    }

    return {
      summary:
        summary ||
        `${dd.name}是一位${dd.updatePattern?.isRegular}的UP主，内容以${dd.partitions?.[0]?.name || '综合'}为主`,
      strengths: strengths.length ? strengths.slice(0, 3) : ['内容稳定', '粉丝忠诚', '更新规律'],
      suggestions: suggestions.length
        ? suggestions.slice(0, 3)
        : ['尝试新题材', '优化标题', '增加互动'],
      contentStrategy:
        contentStrategy ||
        `保持${dd.updatePattern?.isRegular}的更新频率，深耕${dd.partitions?.[0]?.name || '现有分区'}`
    }
  } catch (e) {
    console.error('[Dashboard] AI分析生成失败:', e)
    // 使用类型断言访问属性
    const dd = data as {
      name?: string
      updatePattern?: { isRegular?: string }
    }
    return {
      summary: `${dd.name}是一位${dd.updatePattern?.isRegular}的UP主`,
      strengths: ['内容产出稳定', '粉丝互动良好', '创作方向明确'],
      suggestions: ['尝试跨分区内容', '优化封面设计', '增加系列内容'],
      contentStrategy: `保持${dd.updatePattern?.isRegular}的更新频率`
    }
  }
}

async function generateVideoAIAnalysis(data: Record<string, unknown>): Promise<{
  summary: string
  highlights: string[]
  optimization: string[]
  potential: string
}> {
  // 使用类型断言访问属性
  const d = data as {
    title?: string
    views?: number
    ratios?: { likeRate?: string; coinRate?: string; favRate?: string }
    scores?: { heat?: number; completionPotential?: string; title?: number }
    comparison?: { vsUpAverage?: string }
    overallRating?: string
  }

  const prompt = `请分析以下B站视频数据，给出专业见解：

视频：${d.title}
播放量：${d.views}
点赞率：${d.ratios?.likeRate}%
投币率：${d.ratios?.coinRate}%
收藏率：${d.ratios?.favRate}%
热度评分：${d.scores?.heat}/100
完播潜力：${d.scores?.completionPotential}
标题评分：${d.scores?.title}/100
对比UP主平均：${d.comparison?.vsUpAverage}
综合评级：${d.overallRating}

请提供：
1. 一句话总结视频表现
2. 3个亮点（每点15字以内）
3. 3条优化建议（每点15字以内）
4. 潜力评估（20字以内）

回复格式：
总结：...
亮点：1. ... 2. ... 3. ...
优化：1. ... 2. ... 3. ...
潜力：...`

  const systemPrompt = '你是B站内容分析专家，擅长视频数据分析和优化建议。'

  try {
    const response = await generateAIResponse(prompt, systemPrompt)
    if (!response) throw new Error('AI返回空')

    const lines = response.split('\n').filter((l) => l.trim())
    let summary = ''
    const highlights: string[] = []
    const optimization: string[] = []
    let potential = ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('总结：')) {
        summary = trimmed.replace('总结：', '').trim()
      } else if (trimmed.startsWith('亮点：')) {
        const content = trimmed.replace('亮点：', '').trim()
        const items = content.match(/\d+\.\s*([^\d]+?)(?=\d+\.|$)/g) || []
        items.forEach((item) => {
          const clean = item.replace(/^\d+\.\s*/, '').trim()
          if (clean) highlights.push(clean)
        })
      } else if (trimmed.startsWith('优化：')) {
        const content = trimmed.replace('优化：', '').trim()
        const items = content.match(/\d+\.\s*([^\d]+?)(?=\d+\.|$)/g) || []
        items.forEach((item) => {
          const clean = item.replace(/^\d+\.\s*/, '').trim()
          if (clean) optimization.push(clean)
        })
      } else if (trimmed.startsWith('潜力：')) {
        potential = trimmed.replace('潜力：', '').trim()
      }
    }

    return {
      summary:
        summary ||
        `该视频获得${d.overallRating}评级，整体表现${(d.scores?.heat || 0) >= 60 ? '良好' : '一般'}`,
      highlights: highlights.length
        ? highlights.slice(0, 3)
        : ['内容质量高', '互动率良好', '完播潜力大'],
      optimization: optimization.length
        ? optimization.slice(0, 3)
        : ['优化标题', '改进封面', '增加互动引导'],
      potential: potential || `${(d.scores?.heat || 0) >= 60 ? '有' : '有一定'}潜力成为爆款视频`
    }
  } catch (e) {
    console.error('[Dashboard] AI分析生成失败:', e)
    return {
      summary: `该视频获得${d.overallRating}评级`,
      highlights: ['内容质量达标', '互动数据正常', '完播潜力可挖掘'],
      optimization: ['标题可更吸睛', '封面需优化', '开头要抓人'],
      potential: `${(d.scores?.heat || 0) >= 60 ? '有' : '有一定'}成为爆款的潜力`
    }
  }
}
