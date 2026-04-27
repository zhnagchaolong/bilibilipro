import { ipcMain, BrowserWindow, session, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { BILI_HEADERS } from '../config/constants'
import { BiliAccount, AddAccountResult, BaseResponse } from '../../shared/api.types'
// 🌟 引入刚封好的动态拦截模块
import { setupSmartRoutingForAllAccounts, setupSmartRoutingForPartition } from './roamingIpc'

const dbPath = path.join(app.getPath('userData'), 'bili-accounts.json')

function readAccounts(): BiliAccount[] {
  try {
    if (!fs.existsSync(dbPath)) return []
    const data = fs.readFileSync(dbPath, 'utf8')
    return JSON.parse(data) as BiliAccount[]
  } catch {
    return []
  }
}

function saveAccounts(accounts: BiliAccount[]): void {
  fs.writeFileSync(dbPath, JSON.stringify(accounts, null, 2), 'utf8')
}

interface NavResponse {
  code: number
  data?: {
    isLogin: boolean
    mid?: number
    uid?: number
    uname: string
    face: string
    money?: number
    vipStatus?: number
    level_info?: { current_level: number }
  }
}

export function setupAuthIpc(): void {
  // =========================================================================
  // 💥 破局核心：在应用启动的瞬间，直接宣判所有已存在的分区全部挂上雷达！
  // 这样当 Webview 随后被创建时，拦截网早就已经张开等待它了！
  // =========================================================================
  const initialAccounts = readAccounts()
  if (initialAccounts.length > 0) {
    console.log(
      `[AUTH] ⚡ 启动预加载：正在为本地存活的 ${initialAccounts.length} 个账号预注册网络拦截...`
    )
    setupSmartRoutingForAllAccounts(initialAccounts)
  }

  // 获取账号列表，并实时刷新所有账号的状态数据
  ipcMain.handle('get-accounts', async (): Promise<BiliAccount[]> => {
    const localAccounts = readAccounts()
    const liveAccounts = await Promise.all(
      localAccounts.map(async (acc) => {
        try {
          const currentSession = session.fromPartition(acc.partition)
          const cookies = await currentSession.cookies.get({ domain: '.bilibili.com' })

          const sessDataCookie = cookies.find((c) => c.name === 'SESSDATA')
          let daysLeft = 0
          if (sessDataCookie && sessDataCookie.expirationDate) {
            const now = Math.floor(Date.now() / 1000)
            const diffSeconds = sessDataCookie.expirationDate - now
            if (diffSeconds > 0) {
              daysLeft = Math.floor(diffSeconds / (60 * 60 * 24))
            }
          }
          acc.daysRemaining = daysLeft

          const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
          const res = await fetch('https://api.bilibili.com/x/web-interface/nav', {
            headers: { ...BILI_HEADERS, Cookie: cookieString }
          })
          const navData = (await res.json()) as NavResponse

          if (navData.code === 0 && navData.data?.isLogin) {
            acc.name = navData.data.uname
            acc.face = navData.data.face
            acc.coins = navData.data.money || 0
            acc.level = navData.data.level_info?.current_level || 0
            acc.isVip = navData.data.vipStatus === 1
          } else {
            acc.daysRemaining = 0
          }
        } catch (error) {
          console.error(`获取账号 ${acc.uid} 实时数据失败:`, error)
        }
        return acc
      })
    )

    saveAccounts(liveAccounts)
    return liveAccounts
  })

  // 移除账号
  ipcMain.handle('delete-account', async (_event, uid: string): Promise<BaseResponse> => {
    let accounts = readAccounts()
    const target = accounts.find((a) => a.uid === String(uid))
    if (target) {
      await session.fromPartition(target.partition).clearStorageData()
    }
    accounts = accounts.filter((a) => a.uid !== String(uid))
    saveAccounts(accounts)
    return { success: true, message: '账号已移除，沙盒已清理' }
  })

  // 添加账号
  ipcMain.handle('add-account', async (): Promise<AddAccountResult> => {
    return new Promise((resolve) => {
      const newPartition = `persist:bili-acc-${Date.now()}`

      const loginWin = new BrowserWindow({
        width: 800,
        height: 600,
        title: 'Bilibili 账号登录 (安全隔离环境)',
        autoHideMenuBar: true,
        webPreferences: {
          partition: newPartition,
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      loginWin.loadURL('https://passport.bilibili.com/login')

      loginWin.webContents.on('did-navigate', async (_e, url) => {
        if (
          url === 'https://www.bilibili.com/' ||
          url.includes('account.bilibili.com') ||
          url.includes('bilibili.com/account')
        ) {
          try {
            const currentSession = session.fromPartition(newPartition)
            const cookies = await currentSession.cookies.get({ domain: '.bilibili.com' })
            const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

            const res = await fetch('https://api.bilibili.com/x/web-interface/nav', {
              headers: { ...BILI_HEADERS, Cookie: cookieString }
            })
            const navData = (await res.json()) as NavResponse

            if (navData.code === 0 && navData.data?.isLogin) {
              const uMid = navData.data.mid ?? navData.data.uid ?? -1
              const sessDataCookie = cookies.find((c) => c.name === 'SESSDATA')
              let daysRemaining = 0
              if (sessDataCookie && sessDataCookie.expirationDate) {
                const now = Math.floor(Date.now() / 1000)
                const diffSeconds = sessDataCookie.expirationDate - now
                if (diffSeconds > 0) daysRemaining = Math.floor(diffSeconds / (60 * 60 * 24))
              }

              const newAcc: BiliAccount = {
                uid: String(uMid),
                name: navData.data.uname || '未知昵称',
                face: navData.data.face || '',
                partition: newPartition,
                daysRemaining,
                coins: navData.data.money || 0,
                level: navData.data.level_info?.current_level || 0,
                isVip: navData.data.vipStatus === 1
              }

              const accounts = readAccounts()
              const filtered = accounts.filter((a) => a.uid !== newAcc.uid)
              filtered.push(newAcc)
              saveAccounts(filtered)

              // =========================================================================
              // 💥 安全保障：如果是用户刚登录添加的新账号，立即补发越墙证书！
              // =========================================================================
              console.log(`[AUTH] ⚡ 新账号登录成功，注册网络拦截: ${newPartition}`)
              setupSmartRoutingForPartition(newPartition)

              loginWin.close()
              resolve({ success: true, message: '登录成功', account: newAcc })
            }
          } catch (err) {
            console.error('[Add Account Error]', err)
          }
        }
      })

      loginWin.on('closed', () => resolve({ success: false, message: '操作已取消或窗口关闭' }))
    })
  })
}
