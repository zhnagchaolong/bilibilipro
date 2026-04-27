# 主进程 (Main Process) 技术文档

---

## 1. 入口文件：src/main/index.ts

### 1.1 职责

- 应用生命周期管理 (`app.whenReady()`, `app.on('window-all-closed')`)
- GPU 与性能优化命令行开关配置
- 主窗口创建与配置
- 系统托盘 (Tray) 与右键菜单
- IPC 处理器注册
- 多实例锁 (`app.requestSingleInstanceLock()`)

### 1.2 GPU 优化开关详解

| 开关 | 作用 |
|------|------|
| `disable-features=CalculateNativeWinOcclusion` | 禁用窗口遮挡计算，减少 GPU 负担 |
| `disable-site-isolation-trials` | 释放 `<webview>` 跨进程渲染性能 |
| `use-angle=d3d11` | Windows 强制 D3D11 渲染 |
| `ignore-gpu-blocklist` | 防止 GPU 因卡顿被降级到 CPU 渲染 |
| `enable-transparent-visuals` | 增强透明窗口视觉混合 |
| `disable-background-timer-throttling` | 确保后台动画/任务流畅 |
| `disable-renderer-backgrounding` | 防止渲染进程被后台挂起 |
| `disable-gpu-sandbox` | 禁用 GPU 沙盒提升性能 |
| `disable-software-rasterizer` | 强制 GPU 渲染，禁用软件回退 |
| `renderer-process-limit=3` | 最多 3 个渲染进程 |
| `max-web-media-player-count=2` | 最多 2 个媒体播放器 |
| `autoplay-policy=no-user-gesture-required` | 允许视频自动播放 |

---

## 2. 窗口管理

### 2.1 主窗口

```typescript
// 核心配置
new BrowserWindow({
  width: 1280,
  height: 800,
  show: false,                    // 先隐藏，ready-to-show 时显示
  frame: false,                   // 无边框（自定义标题栏）
  titleBarStyle: 'hidden',
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    sandbox: false,               // <webview> 需要 Node 环境
    webSecurity: false,           // 视频下载功能需要
    backgroundThrottling: false
  }
})
```

### 2.2 看板娘窗口

```typescript
// 透明、无边框、置顶、鼠标穿透
new BrowserWindow({
  width: 250,
  height: 350,
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: false,
  webPreferences: {
    partition: 'persist:assistant-only'  // 独立 Session
  }
})
```

### 2.3 悬浮播放器窗口

```typescript
// 独立窗口，加载视频页面
new BrowserWindow({
  width: 900,
  height: 600,
  alwaysOnTop: true,
  webPreferences: {
    partition: accountPartition,  // 使用对应账号的 Session
    webSecurity: false
  }
})
```

---

## 3. IPC 处理器模块

### 3.1 模块清单

| 模块 | 文件 | 行数 | 职责 |
|------|------|------|------|
| 账号管理 | `authIpc.ts` | 189 | 登录/登出/增删账号、Cookie 管理、roaming 挂载 |
| 视频下载 | `videoIpc.ts` | 422 | 视频解析、并发下载、FFmpeg 合并、切片处理 |
| 自动化任务 | `taskIpc.ts` | 447 | 签到/观看/分享/投币、CRON 定时调度 |
| 数据看板 | `dashboardIpc.ts` | 2088 | Bilibili API 数据抓取、统计分析、AI 深度分析 |
| 播放器 | `playerIpc.ts` | 309 | 悬浮播放器窗口创建、弹幕嗅探 |
| 区域解锁 | `roamingIpc.ts` | 84 | PGC 接口拦截、kghost.info 代理转发 |
| AI 看板娘 | `assistant.ts` | 289 | Live2D 窗口、LLM 调用、鼠标追踪、闲聊引擎 |

### 3.2 注册方式

```typescript
// src/main/index.ts
app.whenReady().then(() => {
  setupAuthIpc()
  setupVideoIpc()
  setupTaskIpc()
  setupPlayerIpc()
  setupDashboardIpc()
  setupAssistant()
})
```

---

## 4. 持久化存储

### 4.1 electron-store

存储位置：`userData/user-settings.json`

| 键 | 类型 | 说明 |
|---|------|------|
| `llm-settings` | `LlmSettings` | LLM 全局配置 |
| `assistant-ai-settings` | `unknown` | 看板娘独立 AI 配置 |
| `close-action` | `string` | 关闭按钮行为 |

### 4.2 文件系统存储

| 文件路径 | 说明 |
|---------|------|
| `userData/bili-accounts.json` | 账号列表（含 partition、face、uid） |
| `userData/logs/` | 下载日志 |

---

## 5. Session 与 Cookie 管理

### 5.1 默认 Session 拦截

```typescript
// 为 api.bilibili.com 强制注入合法 Referer
session.defaultSession.webRequest.onBeforeSendHeaders(
  { urls: ['https://api.bilibili.com/*'] },
  (details, callback) => {
    details.requestHeaders['Referer'] = 'https://www.bilibili.com'
    details.requestHeaders['User-Agent'] = BILI_HEADERS['User-Agent']
    callback({ requestHeaders: details.requestHeaders })
  }
)
```

### 5.2 网络拦截器

```typescript
// BLOCK_URLS: 广告/统计请求列表
session.defaultSession.webRequest.onBeforeRequest(
  { urls: BLOCK_URLS },
  (details, callback) => {
    if (networkBlockerEnabled) {
      callback({ cancel: true })
    } else {
      callback({})
    }
  }
)
```

---

## 6. 看板娘子进程通信

看板娘窗口与主渲染进程分离，主进程作为中继：

```
主渲染进程 ──IPC──> 主进程 ──直接消息──> 看板娘窗口
     ▲                                          │
     └────────── vibe-check ────────────────────┘
```

主进程以 150ms 间隔获取全局鼠标坐标，通过 `webContents.sendInputEvent` 注入到看板娘窗口，实现无需拖拽的自动转头效果。
