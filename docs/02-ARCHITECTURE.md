# 系统架构与数据流

---

## 1. 三层架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                         渲染进程 (Renderer)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │  Vue 3 App  │  │  Composables│  │   ECharts   │  │  Live2D    │  │
│  │  (Views)    │  │  (State)    │  │  (Charts)   │  │  (PixiJS)  │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘  └────────────┘  │
│         │                │                                          │
│  ┌──────▼────────────────▼──────┐                                   │
│  │      Preload Script          │  ← contextBridge.exposeInMainWorld │
│  │  (window.api.* 安全封装)      │                                   │
│  └──────────────┬───────────────┘                                   │
└─────────────────┼───────────────────────────────────────────────────┘
                  │ IPC (invoke / send / on)
┌─────────────────▼───────────────────────────────────────────────────┐
│                         主进程 (Main)                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │  IPC Handlers│  │  FFmpeg     │  │  node-cron  │  │  electron  │  │
│  │  (ipcMain)  │  │  (fluent)   │  │  (Tasks)    │  │  -store    │  │
│  └──────┬──────┘  └─────────────┘  └─────────────┘  └────────────┘  │
│         │                                                            │
│  ┌──────▼──────────────────────────────────────────────────────┐     │
│  │                    BrowserWindow / Tray                     │     │
│  │  主窗口 + 看板娘窗口 + 悬浮播放器窗口 + 登录窗口              │     │
│  └─────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 渲染进程内部结构

```
App.vue (主布局)
    ├── 侧边栏导航 (menuItems[])
    ├── 主题管理器 (data-theme)
    └── 内容区 (v-show 切换)
            ├── AccountsView.vue  →  useAccountsView.ts
            ├── DashboardView.vue →  useDashboardView.ts
            ├── PlayerView.vue    →  usePlayerView.ts
            ├── DownloaderView.vue→  useDownloaderView.ts
            ├── TasksView.vue     →  useTasksView.ts
            ├── SettingsView.vue  →  useSettingsView.ts
            └── AboutView.vue
```

### 2.1 View → Composable 映射规则

每个 `View` 严格对应一个 `useXxxView.ts` composable：

```typescript
// View 中只保留模板和样式，逻辑完全委托给 Composable
// PlayerView.vue 示例
<script setup lang="ts">
import { usePlayerView } from '../composables/player/usePlayerView'
const { accounts, currentUrl, webviewGoBack, /* ... */ } = usePlayerView()
</script>
```

### 2.2 通用 Composables

| Composable | 职责 | 使用方 |
|-----------|------|--------|
| `useToast.ts` | 全局 Toast 通知（show/hide/定时器） | 多个 View |
| `useDropdown.ts` | 全局下拉菜单 activeId 管理 | 多个 View |
| `useConfirm.ts` | 通用确认弹窗 | Downloader |
| `useDraggablePanel.ts` | 面板拖拽物理引擎 | Player |
| `useStorage.ts` | localStorage JSON 读写封装 | 多个 View |

---

## 3. IPC 通信模型

### 3.1 通信模式

```
渲染进程                              主进程
──────────                            ──────
window.api.getAccounts()    ──invoke──>  ipcMain.handle('get-accounts')
window.api.onTaskLog(cb)    ──on──────>  ipcMain.on('task-log')
window.api.hideApp()        ──send───>  ipcMain.on('app-hide')
```

### 3.2 通道分类

| 类别 | 前缀/示例 | 模式 |
|------|----------|------|
| App 生命周期 | `app-hide`, `app-quit`, `show-close-prompt` | send / on |
| 账号管理 | `get-accounts`, `add-account`, `bili-login` | invoke |
| 视频下载 | `parse-video`, `download-video`, `download-progress` | invoke + on |
| 自动化任务 | `run-tasks`, `setup-cron`, `task-log` | invoke + on |
| 数据看板 | `get-dashboard-data` | invoke |
| AI 看板娘 | `assistant:ask`, `vibe-check`, `global-mouse-tracking` | invoke + send |
| 播放器 | `open-player` | invoke |

---

## 4. 数据流：视频下载完整链路

```
用户粘贴 BV 号
    │
    ▼
DownloaderView.vue ──parseVideo()──> Preload ──invoke──> videoIpc.ts
    │                                                          │
    │                                                          ▼
    │                                              1. 调用 Bilibili API
    │                                                 /x/web-interface/view
    │                                                 /x/player/playurl
    │                                              2. 解析 DASH 流地址
    │                                              3. 返回元数据 + 画质列表
    │                                                          │
    │◄──────────────────── 返回 ParseVideoData ◄───────────────┘
    │
    ▼
用户选择画质 + 分 P ──downloadVideo()──> Preload ──invoke──> videoIpc.ts
    │                                                          │
    │                                                          ▼
    │                                              1. fetch 并发下载视频流 + 音频流
    │                                              2. 每 500ms 推送进度
    │                                              3. FFmpeg copy 合并（不重新编码）
    │                                              4. 支持切片：单片段截取 / 多片段合并
    │                                                          │
    │◄────────────── onDownloadProgress 事件 ◄─────────────────┘
```

---

## 5. 数据流：Player 双 Webview 导航

```
browserWebview (浏览模式)          videoWebview (视频模式)
        │                                    │
   用户点击视频链接                          │
        │                                    │
        ▼                                    │
   @did-navigate 触发                      │
   isVideoUrl(url) === true                │
        │                                    │
        ▼                                    ▼
   browserWebview.goBack()          videoWebview.loadURL(url)
   currentUrl = url                 isBiliVideo = true
   显示 videoWebview                 注入 CSS + JS
        │                            隐藏 B站原生 UI
        │                            绑定弹幕/字幕嗅探
        ▼                                    │
   用户点击后退                           │
        │                                    │
        ▼                                    ▼
   poppedVideoUrls.push(url)       videoWebview.loadURL('about:blank')
   videoWebview 隐藏                 browserWebview 恢复
```

---

## 6. 数据流：AI 看板娘交互

```
主进程 (assistant.ts)
    │
    ├── 创建透明无边框窗口 (250×350, persist:assistant-only)
    │   加载 live2d-display.html
    │
    ├── 150ms 间隔追踪全局鼠标坐标
    │   计算相对偏移 → 注入 pointerX/Y 到 Live2D
    │
    └── LLM 调用 (openai SDK)
        支持 DeepSeek / OpenAI / Qwen / Custom

渲染进程 (assistant.vue + live2d-display.html)
    │
    ├── 闲置闲聊计时器 (idleInterval)
    ├── 弹幕吐槽 (danmakuProbability + danmakuCooldown)
    ├── 手动聊天输入框
    └── 伴看模式：悬浮播放器每 30s 抓取弹幕/标题
```

---

## 7. 多账号 Session 隔离模型

```
┌────────────────────────────────────────────────────────────┐
│                     主进程 Session 空间                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ persist:bili-acc-1 │  │ persist:bili-acc-2 │  │ default    │ │
│  │ (账号 A: VIP)    │  │ (账号 B: 普通)    │  │ (游客)     │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │                    │                   │        │
│           ▼                    ▼                   ▼        │
│      roaming 拦截           roaming 拦截        基础路由   │
│      (api.bilibili.com)     (api.bilibili.com)  (无拦截)   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          账号数据持久化：userData/bili-accounts.json      │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

## 8. 关键文件依赖图

```
src/main/index.ts
    ├── setupAuthIpc()      → authIpc.ts      → roamingIpc.ts
    ├── setupVideoIpc()     → videoIpc.ts     → fluent-ffmpeg
    ├── setupTaskIpc()      → taskIpc.ts      → node-cron
    ├── setupPlayerIpc()    → playerIpc.ts
    ├── setupDashboardIpc() → dashboardIpc.ts
    ├── setupAssistant()    → assistant.ts    → openai
    └── setupSmartRoutingForPartition() → roamingIpc.ts

src/preload/index.ts
    └── contextBridge.exposeInMainWorld('api', { ... })
        ├── window.api.* (所有 IPC 通道封装)
        └── window.electron (electron-toolkit API)

src/renderer/src/App.vue
    ├── 路由切换: activeMenu → v-show="activeMenu === 'xxx'"
    ├── 主题: data-theme="dark|light"
    └── 关闭行为: updateCloseAction → IPC → electron-store
```
