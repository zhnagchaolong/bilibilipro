// src/main/index.ts

import {
  app,
  shell,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  session,
  screen
} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../build/logo.ico?asset'

// 导入 IPC 通信模块
import { setupAuthIpc } from './ipc/authIpc'
import { setupVideoIpc } from './ipc/videoIpc'
import { setupTaskIpc } from './ipc/taskIpc'
import { setupPlayerIpc } from './ipc/playerIpc'
import { setupDashboardIpc } from './ipc/dashboardIpc'
// 🌟 引入刚封好的助理管控模块
import { setupAssistant, showAssistant, hideAssistant } from './ipc/assistant'
import { setupSmartRoutingForPartition } from './ipc/roamingIpc'
import type { LlmSettings } from '../shared/api.types'
import Store from 'electron-store'

// ==========================================================
// 💥 核弹级 GPU 优化：彻底解决透明 WebGL 与 B站视频解码的显卡死锁
// ==========================================================
// 1. 💥 关键优化：合并所有禁用特性到一个配置中（避免重复设置）
app.commandLine.appendSwitch(
  'disable-features',
  'CalculateNativeWinOcclusion,' + // 禁用窗口遮挡计算
    'HardwareMediaKeyHandling,' + // 禁用媒体键冲突
    'InterestFeedContentSuggestions,' + // 禁用内容推荐
    'MediaRouter,' + // 禁用媒体路由
    'OptimizationHints,' + // 禁用优化提示
    'OptimizationTargetPrediction,' + // 禁用目标预测
    'NetworkPrediction,' + // 禁用网络预测
    'TranslateUI,' + // 禁用翻译UI
    'BackForwardCache,' + // 禁用BF缓存以减少内存
    'HighDPICanvas,' + // 禁用高DPI Canvas以减少GPU负担
    'CanvasOopRasterization' // 💥 禁用Canvas离屏光栅化，避免与视频解码争抢GPU进程
)

// 2. 关闭严格的站点隔离，极大解放 <webview> 标签（B站播放器）的跨进程渲染性能
app.commandLine.appendSwitch('disable-site-isolation-trials')

// 3. 强制切换底层 3D 渲染引擎为 D3D11（Windows平台上表现最硬朗，专治透明窗口掉帧）
app.commandLine.appendSwitch('use-angle', 'd3d11')

// 4. 防止 GPU 因为偶尔的卡顿被强行降级回 CPU 渲染
app.commandLine.appendSwitch('ignore-gpu-blocklist')

// 5. 增强透明窗口的视觉混合
app.commandLine.appendSwitch('enable-transparent-visuals')

// 6. 💥 关键优化：禁用后台定时器节流（确保看板娘动画流畅）
app.commandLine.appendSwitch('disable-background-timer-throttling')

// 7. 💥 关键优化：禁用GPU垂直同步，减少多窗口GPU资源争抢时的帧丢弃
app.commandLine.appendSwitch('disable-gpu-vsync')

// 8. 💥 关键优化：WebView 与 GPU 进程优化
app.commandLine.appendSwitch('disable-renderer-backgrounding') // 防止渲染进程被后台挂起
app.commandLine.appendSwitch('force-color-profile', 'srgb') // 强制标准色域减少GPU转换
app.commandLine.appendSwitch('disable-gpu-sandbox') // 禁用GPU沙盒提升性能
app.commandLine.appendSwitch('disable-software-rasterizer') // 强制GPU渲染，禁用软件回退

// 10. 💥 关键优化：渲染进程数量与媒体播放器
app.commandLine.appendSwitch('renderer-process-limit', '5') // 增加到5个，避免多窗口争抢
app.commandLine.appendSwitch('max-web-media-player-count', '4') // 增加到4个，避免播放器被限制

// 11. 🌟 允许视频自动播放，无需用户手势
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// 接口和 Store 的定义维持原样不要动...
interface StoreSchema {
  llmSettings: LlmSettings
  'bili-close-action': string
}

const store = new Store<StoreSchema>({
  name: 'user-settings',
  defaults: {
    // 强制断言类型，彻底解决 baseUrl / modelName 结构不匹配的红线报错
    llmSettings: {
      enabled: false,
      provider: 'DeepSeek',
      apiKey: '',
      temperature: 0.7,
      providerConfigs: {
        DeepSeek: { baseUrl: 'https://api.deepseek.com/v1', modelName: 'deepseek-chat' },
        OpenAI: { baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-3.5-turbo' },
        Qwen: {
          baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          modelName: 'qwen-turbo'
        },
        Custom: { baseUrl: '', modelName: '' }
      }
    } as unknown as LlmSettings,
    'bili-close-action': 'ask'
  }
})

// ================= 全局变量声明 =================
let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let isQuitting = false
let mouseTrackerId: NodeJS.Timeout | null = null

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  console.log('检测到已运行的实例，阻止多开，退出当前新进程...')
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show()
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      showAssistant() // 🌟 多开唤醒时同步唤醒桌宠
    }
  })
}

const BLOCK_URLS = [
  '*://*.bilibili.com/cm/api/*',
  '*://cm.bilibili.com/*',
  '*://data.bilibili.com/*',
  '*://data.bilivideo.com/*',
  '*://s1.hdslb.com/bfs/seed/log/*',
  '*://*.bilibili.com/x/web-interface/click/web/h5*'
]

let isNetworkBlockerEnabled = false

// 安全使用单下划线 _ 代替 event，防止 ESLint 报错
ipcMain.on('toggle-always-on-top', (_, enable: boolean) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(enable)
  }
})
ipcMain.on('update-close-action', (_, action: string) => {
  // 把设置写到底层 store 里，这样点 ❌ 的时候，主进程就能正确拦截并缩到托盘了！
  store.set('bili-close-action', action)
})

ipcMain.on('toggle-auto-start', (_, enable: boolean) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: app.getPath('exe')
  })
})

ipcMain.on('toggle-network-blocker', (_, enable: boolean) => {
  isNetworkBlockerEnabled = enable
})

ipcMain.handle('clear-all-cookies', async () => {
  try {
    await session.defaultSession.clearStorageData({
      storages: ['cookies', 'localstorage']
    })
    return true
  } catch {
    return false
  }
})

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1700,
    height: 970,
    show: false,
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true,
      // 💥 关键优化：启用后台节流，让Electron自动管理非活动标签的资源
      backgroundThrottling: true,
      webSecurity: false,
      // 💥 新增：限制渲染进程的资源占用
      allowRunningInsecureContent: true,
      spellcheck: false,
      v8CacheOptions: 'code'
    }
  })

  // 🌟 高性能鼠标追踪：高频率 + 智能节流
  let lastMouseX = -1
  let lastMouseY = -1
  let cachedBounds: Electron.Rectangle | null = null
  let lastBoundsUpdate = 0
  let isTrackingEnabled = false
  let cachedPetWin: BrowserWindow | null = null
  let lastMouseMoveTime = 0
  let lastIpcSendTime = 0
  const TRACKING_INTERVAL = 60 // 💥 60ms 高频追踪 (~16fps)
  const IPC_COOLDOWN = 16 // 💥 16ms IPC冷却，最高60fps
  const IDLE_THRESHOLD = 2000 // 2秒无移动视为静止

  function getPetWin(): BrowserWindow | null {
    if (cachedPetWin && !cachedPetWin.isDestroyed() && cachedPetWin.isVisible()) {
      return cachedPetWin
    }
    const wins = BrowserWindow.getAllWindows()
    const pet = wins.find((w) => w !== mainWindow && !w.isDestroyed() && w.isVisible()) || null
    cachedPetWin = pet
    return pet
  }

  function safePetWin(): BrowserWindow | null {
    const win = getPetWin()
    if (win && win.isDestroyed()) {
      cachedPetWin = null
      return null
    }
    return win
  }

  function doMouseTrackTick(): void {
    if (
      !isTrackingEnabled ||
      !mainWindow ||
      mainWindow.isDestroyed() ||
      mainWindow.isMinimized() ||
      !mainWindow.isVisible()
    ) {
      return
    }

    const point = screen.getCursorScreenPoint()
    const dx = point.x - lastMouseX
    const dy = point.y - lastMouseY

    // 鼠标移动距离小于 2px 时跳过，减少微抖动
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
      const idleTime = Date.now() - lastMouseMoveTime
      if (idleTime > IDLE_THRESHOLD) {
        // 静止超过 2 秒，降低追踪频率
        return
      }
    } else {
      lastMouseMoveTime = Date.now()
      lastMouseX = point.x
      lastMouseY = point.y
    }

    const petWin = safePetWin()
    if (!petWin) return

    // 限制 getBounds() 的系统级调用，每 5 秒最多同步一次
    const now = Date.now()
    if (!cachedBounds || now - lastBoundsUpdate > 5000) {
      if (petWin.isDestroyed()) return
      cachedBounds = petWin.getBounds()
      lastBoundsUpdate = now
    }

    // IPC 冷却检查 - 16ms 允许最高60fps
    if (now - lastIpcSendTime > IPC_COOLDOWN) {
      if (petWin.isDestroyed()) return
      petWin.webContents.send('global-mouse-tracking', {
        mouseX: point.x,
        mouseY: point.y,
        winX: cachedBounds?.x ?? 0,
        winY: cachedBounds?.y ?? 0,
        winWidth: cachedBounds?.width ?? 0,
        winHeight: cachedBounds?.height ?? 0
      })
      lastIpcSendTime = now
    }
  }

  function startMouseTracking(): void {
    if (mouseTrackerId) clearInterval(mouseTrackerId)
    isTrackingEnabled = true
    lastMouseMoveTime = Date.now()
    mouseTrackerId = setInterval(doMouseTrackTick, TRACKING_INTERVAL)
  }

  // 👇直接调用，不带参数，不报错！
  startMouseTracking()

  // 💥 关键优化：当窗口最小化或隐藏时暂停追踪
  mainWindow.on('minimize', () => {
    isTrackingEnabled = false
  })
  mainWindow.on('restore', () => {
    isTrackingEnabled = true
  })
  mainWindow.on('hide', () => {
    isTrackingEnabled = false
  })
  mainWindow.on('show', () => {
    isTrackingEnabled = true
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    // 强制读取配置，修正幽灵启动 Bug
    const llmConfig = store.get('llmSettings') as LlmSettings
    if (!llmConfig || !llmConfig.enabled) {
      hideAssistant()
    }
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      const closeAction = store.get('bili-close-action', 'ask') as string

      switch (closeAction) {
        case 'tray':
          mainWindow?.hide()
          hideAssistant() // 🌟 隐藏主窗时同步隐藏挂在 IPC 上的桌宠
          break
        case 'quit':
          isQuitting = true
          app.quit()
          break
        case 'ask':
        default:
          mainWindow?.webContents.send('show-close-prompt')
          break
      }
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    if (mouseTrackerId) {
      clearInterval(mouseTrackerId)
      mouseTrackerId = null
    }
  })

  ipcMain.on('app-hide', () => {
    mainWindow?.hide()
    hideAssistant() // 🌟 接收前端隐藏指令时同步隐藏
  })

  ipcMain.on('app-quit', () => {
    isQuitting = true
    app.quit()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 💡 装载新版的助理 IPC 核心
  setupAssistant()
}

app.on('before-quit', () => {
  isQuitting = true
  if (mouseTrackerId) {
    clearInterval(mouseTrackerId)
    mouseTrackerId = null
  }
})

app.whenReady().then(() => {
  setupSmartRoutingForPartition()

  // 💥 关键修复：绕过 Chromium 对 B站 Referer 的校验，强制注入合法 Referer
  // 解决 net::ERR_BLOCKED_BY_CLIENT 错误
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (details.url.includes('api.bilibili.com')) {
      // 强制使用合法的空间 Referer，避免被 Chromium 拦截
      details.requestHeaders['Referer'] = 'https://space.bilibili.com/'
      details.requestHeaders['Origin'] = 'https://space.bilibili.com'
      // 确保 User-Agent 是浏览器型
      details.requestHeaders['User-Agent'] =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    callback({ requestHeaders: details.requestHeaders })
  })

  // 💥 关键优化：配置默认session的webRequest拦截
  session.defaultSession.webRequest.onBeforeRequest({ urls: BLOCK_URLS }, (_details, callback) => {
    if (isNetworkBlockerEnabled) {
      callback({ cancel: true })
    } else {
      callback({ cancel: false })
    }
  })

  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  // ================= 创建系统托盘 =================
  const trayIcon = nativeImage.createFromPath(icon)
  tray = new Tray(trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示 BiliAssistant',
      click: () => {
        mainWindow?.show()
        showAssistant() // 🌟 通过托盘唤出主界面的同时唤出桌宠
        if (mainWindow?.isMinimized()) mainWindow?.restore()
        mainWindow?.focus()
      }
    },
    { type: 'separator' },
    {
      label: '完全退出',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('BiliAssistant 自动化挂机中')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    mainWindow?.show()
    showAssistant() // 🌟 也可以双击图标唤出
    if (mainWindow?.isMinimized()) mainWindow?.restore()
    mainWindow?.focus()
  })

  // ================= 注册 IPC 后端引擎 =================
  setupAuthIpc()
  setupVideoIpc()
  setupTaskIpc()
  setupPlayerIpc()
  setupDashboardIpc()

  ipcMain.handle('get-llm-settings', (): LlmSettings => {
    return store.get('llmSettings') as LlmSettings
  })

  ipcMain.handle('save-llm-settings', (_, settings: LlmSettings): void => {
    store.set('llmSettings', settings)
  })

  // 看板娘独立 AI 配置
  ipcMain.handle('get-assistant-ai-settings', () => {
    return store.get('assistantAISettings')
  })

  ipcMain.handle('save-assistant-ai-settings', (_, settings: unknown): void => {
    store.set('assistantAISettings', settings)
  })

  // 💥 修复：保存前端传来的 llmSettings 到 electron-store
  ipcMain.on('update-llm-config', (_, settings: unknown): void => {
    store.set('llmSettings', settings)
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
