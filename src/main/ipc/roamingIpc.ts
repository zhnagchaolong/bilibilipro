// src/main/ipc/roamingIpc.ts
import { session } from 'electron'

// 社区公认最稳的节点
const ROAMING_SERVER = 'https://api.kghost.info'

const processedSessions = new WeakSet()

export function setupSmartRoutingForPartition(partition: string = ''): void {
  const ses = session.fromPartition(partition)
  if (processedSessions.has(ses)) return
  processedSessions.add(ses)

  console.log(`[ROAMING] 🚀 漫游核心已挂载 (Session: ${partition || 'default'})`)

  // 1. ================== 精准靶向：只拦截 PGC(番剧) ==================
  const pgcFilter = {
    urls: [
      // 🚨 绝对核心：去掉了所有 /x/ 相关的普通接口，只留 /pgc/ 系列！
      '*://api.bilibili.com/pgc/player/web/playurl*',
      '*://api.bilibili.com/pgc/player/api/playurl*',
      '*://api.bilibili.com/pgc/view/web/season*'
    ]
  }

  ses.webRequest.onBeforeRequest(pgcFilter, (details, callback) => {
    try {
      const url = new URL(details.url)
      const redirectUrl = `${ROAMING_SERVER}${url.pathname}${url.search}`

      console.log(`[ROAMING] ✈️ 番剧锁区劫持: ${url.pathname}`)
      return callback({ cancel: false, redirectURL: redirectUrl })
    } catch {
      return callback({ cancel: false })
    }
  })

  // 2. ================== 响应头手术 ==================
  const globalFilter = {
    urls: [
      `${ROAMING_SERVER}/*`,
      '*://*.bilivideo.com/*',
      '*://*.bilivideo.cn/*',
      '*://*.akamaized.net/*'
    ]
  }

  ses.webRequest.onBeforeSendHeaders(globalFilter, async (details, callback) => {
    // 抹除现代浏览器的跨域追踪头
    delete details.requestHeaders['sec-fetch-dest']
    delete details.requestHeaders['sec-fetch-mode']
    delete details.requestHeaders['sec-fetch-site']

    // 伪装 origin
    details.requestHeaders['Referer'] = 'https://www.bilibili.com'
    details.requestHeaders['Origin'] = 'https://www.bilibili.com'

    // 给漫游服务器发送 B 站 Cookie（解锁 1080P/大会员画质使用）
    if (details.url.startsWith(ROAMING_SERVER)) {
      const cookies = await ses.cookies.get({ domain: '.bilibili.com' })
      if (cookies.length > 0) {
        details.requestHeaders['Cookie'] = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
      }
    }

    callback({ cancel: false, requestHeaders: details.requestHeaders })
  })

  // 3. ================== 破除 CORS 和 CSP 限制 ==================
  ses.webRequest.onHeadersReceived(globalFilter, (details, callback) => {
    const headers = details.responseHeaders || {}

    // 强制赋予跨域权限
    headers['Access-Control-Allow-Origin'] = ['https://www.bilibili.com']
    headers['Access-Control-Allow-Credentials'] = ['true']

    // 删除妨碍视频加载的安全策略
    delete headers['content-security-policy']
    delete headers['content-security-policy-report-only']

    callback({ cancel: false, responseHeaders: headers })
  })
}

export function setupSmartRoutingForAllAccounts(accounts: { partition: string }[]): void {
  accounts.forEach((acc) => setupSmartRoutingForPartition(acc.partition))
}
