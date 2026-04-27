<!-- From: C:\Users\Z\Desktop\bilibiliASSiant\my-bili-assistant\AGENTS.md -->
# AGENTS.md - Bilibili PRO Assistant

> 本文件包含 AI 编码助手处理本项目时必须了解的关键信息。
> 最后更新：2026-04-26（基于实际代码结构重建）

## 项目概述

**Bilibili PRO Assistant**（包名 `my-bili-assistant`，版本 `1.2.0`）是一款基于 Electron + Vue 3 的桌面客户端，用于增强 Bilibili 使用体验。

- **显示名称**：Bilibili PRO V1.2
- **作者标识**：@GDUT_ZCL
- **应用 ID**：`com.zcl.biliassistant.pro`
- **主入口**：`./out/main/index.js`

核心功能包括：

- 多账号隔离管理（独立 Session + Cookie 持久化）
- 视频解析与下载（DASH 流、AVC/HEVC/AV1 画质选择、FFmpeg 无损合并 / 切片 / 批量拼接）
- 自动化日常任务（直播签到、漫读签到、模拟观看、分享、投币、银瓜子换硬币）
- AI 驱动的 Live2D 桌面看板娘（伴看吐槽、闲置闲聊、手动聊天）
- 悬浮极简播放器（无边框置顶、CSS 注入精简页面、伴看弹幕嗅探）
- 数据看板（个人总览、UP 主深度分析、视频分析、趋势发现、年度历史报告）
- 番剧区域解锁（Roaming，仅拦截 `api.bilibili.com/pgc/...` 并通过代理转发）

## 技术栈

| 层级       | 技术                                                                 |
| ---------- | -------------------------------------------------------------------- |
| 桌面框架   | Electron `^39.2.6`                                                   |
| 前端框架   | Vue `^3.5.25` + TypeScript `^5.9.3`                                  |
| 构建工具   | electron-vite `^5.0.0` + Vite `^7.2.6`                               |
| UI 组件    | Element Plus Icons (`@element-plus/icons-vue`)                       |
| 状态与配置 | `localStorage`（前端轻量状态）+ `electron-store`（结构化配置持久化） |
| 视频处理   | `fluent-ffmpeg` + `ffmpeg-static`                                    |
| 定时任务   | `node-cron`                                                          |
| AI / LLM   | `openai` SDK（兼容 DeepSeek / OpenAI / Qwen / Custom）               |
| 图形渲染   | PixiJS `7.2.4` + `pixi-live2d-display`（Cubism 3）                   |
| 图表       | `echarts` `^6.0.0`                                                   |
| HTTP 请求  | `axios` `^1.15.0`                                                    |
| 其他       | `qrcode`、`vuedraggable`                                             |

## 项目结构

```
my-bili-assistant/
├── build/                          # 构建资源（图标、plist）
│   ├── logo.ico                    # Windows 程序 / 安装包 / 卸载程序图标
│   ├── icon.icns                   # macOS 图标
│   └── favicon.ico, icon.png ...   # 其他平台图标
├── out/                            # 开发编译输出（electron-vite 生成，勿提交）
│   ├── main/
│   ├── preload/
│   └── renderer/
├── dist/                           # 生产构建输出（electron-builder 生成，勿提交）
├── docs/                           # 详细功能文档（01-PROJECT_OVERVIEW.md ~ 11-ROAMING.md）
├── src/
│   ├── main/                       # Electron 主进程
│   │   ├── index.ts                # 主入口：窗口创建、GPU 优化、托盘、生命周期、全局 IPC
│   │   ├── config/
│   │   │   └── constants.ts        # BILI_HEADERS、API_URLS 统一常量
│   │   └── ipc/                    # IPC 处理器（按功能拆分）
│   │       ├── authIpc.ts          # 账号管理、登录、隔离 session 预加载
│   │       ├── videoIpc.ts         # 视频解析、并发下载、FFmpeg 合并/切片/拼接
│   │       ├── taskIpc.ts          # 自动化任务引擎与 cron 定时
│   │       ├── playerIpc.ts        # 悬浮播放器（伴看 AI、弹幕嗅探、CSS 注入）
│   │       ├── dashboardIpc.ts     # 数据看板（个人 / UP / 视频 / 趋势 / 年度历史）
│   │       ├── roamingIpc.ts       # 番剧区域解锁（PGC 智能路由）
│   │       ├── assistant.ts        # Live2D 看板娘窗口、LLM 调用、闲聊计时器
│   │       └── server.js           # Express 本地代理服务（可选，用于独立代理转发调试）
│   ├── preload/                    # 预加载脚本
│   │   ├── index.ts                # contextBridge 暴露 api 与 electronAPI
│   │   └── index.d.ts              # 全局 Window 类型声明
│   ├── renderer/                   # 前端 Vue 应用
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.ts             # Vue 应用入口（极简 createApp）
│   │       ├── App.vue             # 主布局：侧边栏导航、主题切换、关闭弹窗、页面路由
│   │       ├── env.d.ts            # Vite 客户端类型引用
│   │       ├── assets/             # CSS、SVG 等静态资源
│   │       ├── components/         # 通用组件
│   │       │   ├── AudioAlchemist.vue
│   │       │   ├── ClipManager.vue
│   │       │   ├── TimeJumper.vue
│   │       │   └── Versions.vue
│   │       ├── composables/        # 组合式逻辑（按功能分子目录）
│   │       │   ├── accounts/useAccountsView.ts
│   │       │   ├── dashboard/useDashboardView.ts
│   │       │   ├── downloader/useDownloaderView.ts
│   │       │   ├── player/usePlayerView.ts
│   │       │   ├── settings/useSettingsView.ts
│   │       │   ├── tasks/useTasksView.ts
│   │       │   ├── useConfirm.ts
│   │       │   ├── useDraggablePanel.ts
│   │       │   ├── useDropdown.ts
│   │       │   └── useToast.ts
│   │       ├── views/              # 主要功能页面
│   │       │   ├── AccountsView.vue
│   │       │   ├── DashboardView.vue
│   │       │   ├── DownloaderView.vue
│   │       │   ├── PlayerView.vue
│   │       │   ├── TasksView.vue
│   │       │   ├── SettingsView.vue
│   │       │   └── AboutView.vue
│   │       ├── live2d/
│   │       │   └── assistant.vue   # 看板娘在主页内的嵌入组件（iframe 模式）
│   │       └── public/             # 静态资源（复制到构建产物）
│   │           ├── live2d-display.html
│   │           ├── live2d/         # Live2D 运行时库（jQuery、Pixi、Cubism）
│   │           └── model/          # Live2D 模型（Azue Lane 角色，Cubism 3 格式）
│   └── shared/                     # 共享类型定义
│       └── api.types.ts            # TypeScript 接口（Account、LlmSettings、DashboardData 等）
├── electron.vite.config.ts         # electron-vite 配置（main/preload/renderer 三端构建）
├── electron-builder.yml            # 打包配置（NSIS、图标、asarUnpack ffmpeg-static）
├── dev-app-update.yml              # 自动更新配置占位（当前未接入真实更新服务器）
├── tsconfig.json                   # 根配置（project references）
├── tsconfig.node.json              # 主进程 / Node 端 TS 配置
├── tsconfig.web.json               # 渲染进程 TS 配置
├── eslint.config.mjs               # ESLint flat config
└── .prettierrc.yaml                # Prettier 代码风格配置
```

## 关键配置文件说明

### package.json

- `main`: `./out/main/index.js`（开发/生产编译后的主进程入口）
- `scripts` 定义了完整的开发、类型检查、构建和打包命令（见下方「构建与运行命令」）
- `postinstall` 钩子会自动执行 `electron-builder install-app-deps`
- 生产依赖包含 `electron-updater`，但 `dev-app-update.yml` 目前仅作占位

### electron-builder.yml

- `appId`: `com.zcl.biliassistant.pro`
- `productName`: `Bilibili PRO`（控制安装包和快捷方式名称）
- `asarUnpack`: 必须解包 `ffmpeg-static`，否则生产环境无法 spawn FFmpeg 二进制
- `nsis`: 传统安装器配置，禁用一键安装、允许自定义路径、默认安装到 `C:\Program Files\`
- Windows 图标强制指向 `build/logo.ico`

### electron.vite.config.ts

- 使用 `electron-vite` 的 `defineConfig`，同时构建 `main`、`preload`、`renderer` 三端
- `renderer` 端配置了 `@renderer` 指向 `src/renderer/src` 的 alias
- Vue 插件配置了 `isCustomElement: (tag) => tag === 'webview'`，避免 `<webview>` 被 Vue 编译器报错
- `publicDir` 指向 `src/renderer/src/public`

### tsconfig 体系

- `tsconfig.json`: 根文件，使用 project references，仅包含 `strict: true` 等基础选项
- `tsconfig.node.json`: 覆盖 `src/main/**/*`、`src/preload/**/*`、`src/shared/**/*`、`electron.vite.config.*`
- `tsconfig.web.json`: 覆盖 `src/renderer/src/**/*`、`src/shared/**/*`、`src/preload/*.d.ts`
- **两个子配置都必须显式包含 `src/shared/**/*`**，否则共享类型会在对应端编译时丢失

## 构建与运行命令

```bash
# 开发（热重载）
npm run dev

# 类型检查
npm run typecheck       # 先 node 后 web（vue-tsc）
npm run typecheck:node  # 仅主进程（tsc --noEmit）
npm run typecheck:web   # 仅渲染进程（vue-tsc --noEmit）

# 代码质量
npm run lint            # ESLint（带缓存）
npm run format          # Prettier 格式化

# 生产构建（先 typecheck，再 electron-vite build）
npm run build

# 平台打包
npm run build:win       # Windows NSIS 安装包
npm run build:mac       # macOS DMG
npm run build:linux     # Linux AppImage / 其他
npm run build:unpack    # 仅生成未打包目录
```

> **注意**：`postinstall` 钩子会自动执行 `electron-builder install-app-deps`，确保原生依赖正确编译。

## 代码风格规范

### TypeScript / JavaScript

- **严格模式**：所有 `tsconfig` 均开启 `"strict": true`
- **分号**：禁用（`semi: false`）
- **引号**：单引号（`singleQuote: true`）
- **行宽**：100 字符（`printWidth: 100`）
- **尾随逗号**：禁用（`trailingComma: none`）

### Vue

- 必须始终使用 `<script setup lang="ts">`
- ESLint 规则 `vue/block-lang` 强制脚本使用 TypeScript
- 禁用的规则：`vue/require-default-prop`、`vue/multi-word-component-names`
- composables 中的 TS 函数允许不显式声明返回类型（`@typescript-eslint/explicit-function-return-type: off`）

### 命名约定

- IPC 通道名：kebab-case（如 `get-accounts`、`download-video`、`assistant:ask`）
- IPC 处理函数 / 前端 API：camelCase（如 `toggleAssistant`、`parseVideo`）
- TypeScript 接口：PascalCase（如 `BiliAccount`、`LlmSettings`）
- Vue 组件：PascalCase（如 `DashboardView.vue`）
- 常量：SCREAMING_SNAKE_CASE

### 注释风格

代码中使用大量中文注释，并配合表情符号进行区块标记：

- `// 🌟` —— 重要功能或修复
- `// 💥` —— 关键优化
- `// 👇` —— 代码区块指引
- `// ==================================` —— 区块分隔线

## 架构详解

### IPC 通信模式

所有 IPC 集中管理，采用三层模式：

1. **主进程** 在 `src/main/ipc/*.ts` 中通过 `ipcMain.handle` / `ipcMain.on` 注册处理器。
2. **预加载脚本** `src/preload/index.ts` 通过 `contextBridge.exposeInMainWorld('api', api)` 暴露给渲染进程。
3. **渲染进程** 通过 `window.api.xxx(args)` 调用。
4. **类型声明** 同步维护在 `src/preload/index.d.ts` 与 `src/shared/api.types.ts`。

预加载脚本同时暴露了 `window.electron`（来自 `@electron-toolkit/preload` 的标准 Electron API）。

### 多账号 Session 隔离

- 账号数据持久化在 `userData/bili-accounts.json`。
- 每个账号分配独立 partition：`persist:bili-acc-{timestamp}`。
- 登录窗口使用对应 partition，登录成功后保存 Cookie 并注册 roaming 拦截。
- 主进程启动时会预加载所有已有账号的 roaming 路由（`setupSmartRoutingForAllAccounts`）。
- 删除账号时会调用 `session.fromPartition(target.partition).clearStorageData()` 清理沙盒。

### GPU 与性能优化（主进程）

`src/main/index.ts` 中设置了大量命令行开关，用于解决透明 WebGL、B站视频解码、Live2D 掉帧等问题：

- 禁用窗口遮挡计算、媒体键、BF 缓存、高 DPI Canvas 等特性（`disable-features` 聚合列表）。
- `disable-site-isolation-trials`：释放 `<webview>` 跨进程渲染性能。
- `use-angle=d3d11`：Windows 强制 D3D11 渲染。
- `ignore-gpu-blocklist`、`enable-gpu-sandbox`、`enable-software-rasterizer`：防止 GPU 降级并允许软件回退。
- `disable-background-timer-throttling`、`disable-renderer-backgrounding`：保证后台动画/任务流畅。
- `renderer-process-limit=3`、`max-web-media-player-count=2`：限制渲染进程与媒体播放器数量。
- `autoplay-policy=no-user-gesture-required`：允许视频自动播放。

### 视频下载架构

1. 通过 Bilibili API（`/x/web-interface/view`、`/x/player/playurl`）解析元数据与 DASH 流地址。
2. 支持 AVC / HEVC / AV1 画质选择，按清晰度和编码排序。
3. 使用 `fetch` + Node Stream 并发下载视频流与音频流，每 500ms 推送一次进度到前端（`download-progress` 事件）。
4. FFmpeg 采用 `copy` 编解码器进行极速合并，不重新编码。
5. 支持两种后期处理模式：
   - **模式 A（Fast Concat）**：按时间片段批量截取后通过 `concat demuxer` 自动拼接。需要生成临时的 `concat_{taskId}.txt` 列表文件，并严格处理 Windows 路径转义（替换反斜杠为斜杠）。
   - **模式 B（普通整合/单片段截取）**：普通整段合并，或按 `start`/`end` 截取单一片段。
6. `ffmpeg-static` 在生产环境路径需替换 `app.asar` 为 `app.asar.unpacked` 才能被 spawn 执行。

### AI 看板娘（Assistant）

- **窗口**：透明、无边框、置顶、`250×350px`，独立 partition `persist:assistant-only`。
- **渲染**：`live2d-display.html` 加载 PixiJS + Cubism 3 运行时，模型位于 `public/model/`（Azue Lane 角色）。
- **鼠标追踪**：主进程以动态间隔（默认 500ms，静止 3 秒后降至 2000ms）追踪全局鼠标坐标，计算相对偏移后注入 Live2D 内部 `pointerX/Y`，实现无需拖拽的自动转头。窗口最小化/隐藏时自动暂停追踪以降低 CPU/GPU 负载。
- **LLM**：支持通用配置与看板娘独立 AI 配置；通过 `openai` SDK 调用兼容接口。
- **互动机制**：
  - 闲置闲聊（`idleInterval` 秒无活动后触发）。
  - 弹幕吐槽（监听播放器弹幕，按概率 `danmakuProbability` 和冷却 `danmakuCooldown` 触发）。
  - 手动聊天（输入框回车发送，气泡展示）。
  - 伴看模式（悬浮播放器每 30 秒抓取页面弹幕/标题，生成吐槽推送至看板娘）。

### 番剧区域解锁（Roaming）

- 仅拦截 `api.bilibili.com/pgc/...` 相关接口，普通 `/x/` 接口不受影响。
- 通过 `https://api.kghost.info` 代理转发请求与响应。
- 动态注入 Referer / Origin / Cookie，并移除 CSP / CORS 限制头。
- 使用 `WeakSet` 对已处理 session 去重，避免重复挂载拦截器。
- 新增账号登录后会自动调用 `setupSmartRoutingForPartition(partition)` 挂载拦截。

### 悬浮极简播放器

- 使用独立 `BrowserWindow`（`640×360`，无边框、置顶），加载账号对应 partition，打开 `https://www.bilibili.com/video/{bvid}`。
- 通过 `executeJavaScript` 注入 CSS + DOM 脚本，隐藏 B站页头、侧边栏、推荐列表、评论区等，仅保留播放器全屏填充。
- 支持自定义拖拽栏与关闭按钮，关闭时自动唤回主窗口。
- 伴看嗅探器每 30 秒抓取弹幕和标题，通过 LLM 生成吐槽并推送给看板娘。

## 测试策略

- **当前没有配置自动化测试套件**（无 Jest / Vitest / Playwright 等）。
- 测试依赖手动验证流程：
  1. 账号登录 / 登出 / 删除周期。
  2. 多账号列表刷新与 Cookie 有效期计算。
  3. 视频解析（不同 BV 号、多 P、DASH / durl）。
  4. 下载完整链路（进度条、FFmpeg 合并、切片拼接）。
  5. 自动化任务执行（签到、观看、分享、投币）。
  6. 多窗口协同（主窗口 + 看板娘 + 悬浮播放器）。
  7. 数据看板各类型请求（个人、UP 主、视频、趋势、年度历史）。

## 安全与隐私考量

1. **Context Isolation**：主窗口预加载脚本开启 `contextIsolation: true`。
2. **Sandbox**：主窗口显式禁用 `sandbox: false`（因 `<webview>` 标签需要 Node 集成环境）。悬浮播放器同样禁用 sandbox 以支持 B站 MSE / WASM 解码器初始化。
3. **Web Security**：针对特定功能（视频下载、roaming、播放器、看板娘）在必要窗口中禁用 `webSecurity`。
4. **Cookie 处理**：敏感凭证（`SESSDATA`、`bili_jct`）小心提取并用于 API 请求，不会明文外泄。
5. **Referer 注入**：默认 session 的 `onBeforeSendHeaders` 对 `api.bilibili.com` 强制注入合法 Referer，避免 Chromium 拦截。播放器窗口单独维护一套注入逻辑。
6. **网络拦截器**：支持一键启用/禁用 B站广告/统计请求拦截（`BLOCK_URLS` 常量列表）。
7. **单实例锁**：`app.requestSingleInstanceLock()` 阻止多开；重复启动时唤醒已有主窗口和看板娘。
8. **LLM API Key**：通过 `electron-store` 加密存储在本地 `user-settings.json` 中，不会硬编码在源码里。

## 关键依赖说明

### FFmpeg

- 使用 `ffmpeg-static` 提供二进制，`ffmpeg.setFfmpegPath(ffmpegStatic)` 自动配置路径。
- 用途：音视频 copy 合并、片段截取、concat 批量拼接。
- **打包注意**：`electron-builder.yml` 中必须配置 `asarUnpack: '**/node_modules/ffmpeg-static/**/*'`，否则生产环境找不到可执行文件。

### electron-store

- 配置文件位置：`userData/user-settings.json`。
- 存储内容：LLM 配置、看板娘独立 AI 配置、关闭行为偏好（`bili-close-action`）等。
- 主进程多处通过 `new Store({ name: 'user-settings' })` 直接读写。

### node-cron

- 支持标准 cron 表达式，也兼容前端传入的 `HH:MM` 格式（自动转换为 `mm hh * * *`）。
- 当前仅维护一个全局 `currentCronJob` 实例，新设置会覆盖旧任务。

### Live2D 模型

- 模型路径：`src/renderer/src/public/model/Azue Lane(JP)/`
- 格式：Cubism 3（`.model3.json`、`.moc3`、`.physics3.json`）
- 角色包括：拉菲、绫波、标枪、Z23、贝尔法斯特、独角兽、天狼星等数十个。
- 运行时库位于 `public/live2d/`（jQuery、Pixi 7.x、Cubism Core/Framework/Pixi 插件）。

## 常见开发模式

### 添加新的 IPC 通道

1. 在 `src/main/ipc/{feature}Ipc.ts` 中编写 `ipcMain.handle('channel-name', ...)`。
2. 在 `src/main/index.ts` 的 `app.whenReady()` 中调用对应的 `setupXxxIpc()`。
3. 在 `src/preload/index.ts` 的 `api` 对象中添加映射。
4. 在 `src/preload/index.d.ts` 中补充类型声明。
5. 如需共享类型，在 `src/shared/api.types.ts` 中定义接口。

### 添加新的页面视图

1. 在 `src/renderer/src/views/` 中创建 `XxxView.vue`。
2. 在 `src/renderer/src/App.vue` 的 `menuItems` 数组中注册菜单项。
3. 在 `App.vue` 模板中添加对应的 `v-show="activeMenu === 'xxx'"` 区块。

### 读写用户偏好设置

```typescript
// 简单键值对（前端）
localStorage.setItem('bili-{feature}-{setting}', value)
const value = localStorage.getItem('bili-{feature}-{setting}') ?? defaultValue

// 结构化配置（主进程，通过 electron-store）
store.set('llmSettings', settings)
store.get('bili-close-action')
```

## 故障排查

### 构建问题

- 若打包时缺少图标，确认 `build/logo.ico`、`build/icon.icns` 存在且 `electron-builder.yml` 路径正确。
- Windows NSIS 安装包名称与快捷方式由 `electron-builder.yml` 中 `productName` 和 `nsis.shortcutName` 控制。
- 如果生产环境报 FFmpeg 找不到，检查 `asarUnpack` 是否包含 `ffmpeg-static`，并确认路径替换逻辑 `ffmpegStatic.replace('app.asar', 'app.asar.unpacked')` 生效。

### 运行时问题

- **GPU 异常**：根据系统显卡型号，可能需要调整 `src/main/index.ts` 中的 command line switches。
- **FFmpeg 报错**：检查 `ffmpeg-static` 是否正确下载到 `node_modules`；生产环境需确认 `app.asar.unpacked` 包含资源。
- **Live2D 不显示**：确保模型文件使用 Cubism 3 格式；开发环境加载路径为 `src/renderer/src/public/live2d-display.html`，生产环境路径由 `process.resourcesPath` 拼接。
- **B站 API 被拦截**：检查默认 session 的 `onBeforeSendHeaders` 是否正确注入了 `Referer` 和 `User-Agent`。
- **账号 Cookie 获取失败**：查看对应 partition 的 Cookie 域名是否为 `.bilibili.com`，以及 `SESSDATA` 是否过期。
- **番剧区域限制**：代理服务器不可用，检查 `kghost.info` 连通性；Cookie 过期，重新登录账号。
- **视频无法播放**：Cookie 过期，重新登录账号；代理服务器延迟高，切换网络环境。
- **页面加载缓慢**：代理服务器延迟高，切换网络环境。
- **其他功能异常**：拦截器过度拦截，检查 `urls` 过滤规则是否准确。
- **看板娘卡顿**：可能是GPU资源竞争，调整主进程的GPU优化设置；鼠标追踪频率过高，调整追踪间隔和阈值。

### 开发环境问题

- Type 报错：确认 `tsconfig.web.json` / `tsconfig.node.json` 引用了 `src/shared` 目录。
- IPC 类型红线：检查 `preload/index.d.ts` 是否与 `preload/index.ts` 暴露的 API 保持同步。
- ESLint 报错 `event` 未使用：主进程回调中可用下划线 `_event` 或 `_` 占位。
- Vue 模板中的 `webview` 标签红线：已在 `electron.vite.config.ts` 中配置 `isCustomElement`。

## 问题与诊断 (#problems_and_diagnostics)

### 常见问题诊断流程

1. **启动失败**
   - 检查 Node.js 版本是否兼容
   - 确认依赖安装完整：`npm install`
   - 检查端口是否被占用
   - 查看终端错误信息

2. **账号登录问题**
   - 检查网络连接
   - 确认 Cookie 权限设置
   - 验证 partition 是否正确创建
   - 检查 `SESSDATA` 是否有效

3. **视频下载失败**
   - 检查 BV 号是否正确
   - 确认网络连接稳定
   - 验证 FFmpeg 是否正确安装
   - 检查保存路径权限
   - 查看下载日志获取具体错误信息

4. **看板娘相关问题**
   - **卡顿问题**：
     - 检查 GPU 资源使用情况
     - 调整鼠标追踪频率和阈值
     - 优化 Live2D 渲染设置
     - 检查 LLM API 调用频率
   - **不显示问题**：
     - 确认模型文件路径正确
     - 检查 Live2D 运行时库是否加载
     - 验证 Canvas 权限

5. **番剧解锁问题**
   - 检查 `kghost.info` 代理服务器状态
   - 确认账号 Cookie 有效
   - 检查网络环境是否支持代理
   - 验证拦截规则是否正确

6. **播放器问题**
   - 检查 WebView 权限设置
   - 确认账号 partition 正确
   - 检查 CSS/JS 注入是否成功
   - 验证 B站 播放器初始化

### 性能优化建议

1. **GPU 优化**
   - 调整主进程的 command line switches
   - 启用 GPU 沙盒
   - 允许软件回退
   - 限制渲染进程数量

2. **内存优化**
   - 限制 WebView 数量
   - 优化 Live2D 渲染
   - 清理闲置定时器
   - 合理使用 localStorage

3. **网络优化**
   - 启用广告/统计请求拦截
   - 优化 API 请求频率
   - 合理设置缓存策略
   - 检查网络代理设置

4. **CPU 优化**
   - 降低鼠标追踪频率
   - 优化 Live2D 动画帧率
   - 减少 IPC 通信频率
   - 合理设置定时器间隔

### 日志与调试

- 主进程日志：查看终端输出
- 渲染进程日志：使用 Chrome DevTools
- 下载日志：位于 `userData/logs/` 目录
- 网络请求：使用 DevTools Network 面板
- IPC 通信：在主进程和渲染进程中添加日志

### 环境检查清单

- [ ] Node.js 版本 >= 18.x
- [ ] npm 版本 >= 9.x
- [ ] Electron 版本与依赖兼容
- [ ] FFmpeg 静态文件存在
- [ ] Live2D 模型文件完整
- [ ] 网络连接正常
- [ ] 端口未被占用
- [ ] 权限设置正确

### 常见错误代码与解决方案

| 错误代码 | 可能原因 | 解决方案 |
|----------|---------|----------|
| `FFmpeg not found` | FFmpeg 路径错误 | 检查 asarUnpack 配置 |
| `Cookie expired` | SESSDATA 过期 | 重新登录账号 |
| `Network error` | 网络连接问题 | 检查网络设置 |
| `Live2D init failed` | 模型文件错误 | 检查模型路径和格式 |
| `API blocked` | Referer 未注入 | 检查 onBeforeSendHeaders 配置 |
| `Partition not found` | 账号 partition 错误 | 重新添加账号 |
| `Video decode error` | 解码器问题 | 检查 WebView 沙盒设置 |
| `LLM API error` | API Key 错误或网络问题 | 检查 API 配置和网络连接 |
