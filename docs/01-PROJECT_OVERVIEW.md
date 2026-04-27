# Bilibili PRO Assistant — 项目总览

> 版本：1.2.0 | 作者：@GDUT_ZCL | 最后更新：2026-04-26

---

## 1. 项目定位

**Bilibili PRO Assistant** 是一款基于 Electron + Vue 3 + TypeScript 的桌面客户端，专为增强 Bilibili 使用体验而设计。它不是 Bilibili 官方客户端，而是一个集成了多账号管理、视频下载、数据看板、AI 看板娘、自动化任务等功能的第三方增强工具。

---

## 2. 技术栈全景

| 层级 | 技术选型 | 版本 | 说明 |
|------|---------|------|------|
| 桌面框架 | Electron | ^39.2.6 | 跨平台桌面应用 |
| 前端框架 | Vue 3 | ^3.5.25 | Composition API + `<script setup>` |
| 语言 | TypeScript | ^5.9.3 | 全项目 strict 模式 |
| 构建工具 | electron-vite | ^5.0.0 | 主进程 + 渲染进程双构建 |
| 打包工具 | electron-builder | — | NSIS / DMG / AppImage |
| UI 组件 | Element Plus Icons | — | 图标库 |
| 图表 | ECharts | ^6.0.0 | 数据看板可视化 |
| 视频处理 | fluent-ffmpeg + ffmpeg-static | — | 音视频合并/切片 |
| AI / LLM | openai SDK | — | 兼容 DeepSeek / OpenAI / Qwen |
| 图形渲染 | PixiJS 7.2.4 + pixi-live2d-display | — | Live2D 看板娘 |
| 定时任务 | node-cron | — | 自动化任务调度 |
| 持久化 | electron-store + localStorage | — | 结构化 + 简单数据 |

---

## 3. 目录结构

```
my-bili-assistant/
├── build/                          # 构建资源（图标、plist）
│   ├── logo.ico                    # Windows 程序图标
│   └── icon.icns                   # macOS 图标
├── out/                            # 开发编译输出（electron-vite）
│   ├── main/
│   ├── preload/
│   └── renderer/
├── dist/                           # 生产构建输出（electron-builder）
├── src/
│   ├── main/                       # Electron 主进程（Node.js 环境）
│   │   ├── index.ts                # 主入口：窗口、GPU、托盘、生命周期
│   │   ├── config/
│   │   │   └── constants.ts        # BILI_HEADERS、API_URLS
│   │   └── ipc/                    # IPC 处理器（按功能拆分）
│   │       ├── authIpc.ts          # 账号管理、登录、Session 隔离
│   │       ├── videoIpc.ts         # 视频解析、并发下载、FFmpeg 合并
│   │       ├── taskIpc.ts          # 自动化任务引擎与 cron 定时
│   │       ├── playerIpc.ts        # 悬浮播放器（伴看 AI、弹幕嗅探）
│   │       ├── dashboardIpc.ts     # 数据看板（个人/UP/视频/趋势）
│   │       ├── roamingIpc.ts       # 番剧区域解锁（PGC 智能路由）
│   │       └── assistant.ts        # Live2D 看板娘窗口、LLM 调用
│   ├── preload/                    # 预加载脚本（渲染进程与主进程桥梁）
│   │   ├── index.ts                # contextBridge 暴露 api 对象
│   │   └── index.d.ts              # Window 全局类型声明
│   ├── renderer/                   # 前端 Vue 应用
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.ts             # Vue 应用入口
│   │       ├── App.vue             # 主布局：侧边栏导航、主题、关闭弹窗
│   │       ├── assets/             # CSS、SVG
│   │       ├── components/         # 通用组件
│   │       │   ├── AudioAlchemist.vue   # 音频处理面板
│   │       │   ├── ClipManager.vue      # 切片管理器
│   │       │   ├── TimeJumper.vue       # 时光刺客（时间点跳转）
│   │       │   └── Versions.vue         # 版本信息
│   │       ├── composables/        # 可复用逻辑（Vue 3 Composables）
│   │       │   ├── accounts/
│   │       │   ├── dashboard/
│   │       │   ├── downloader/
│   │       │   ├── player/
│   │       │   ├── settings/
│   │       │   ├── tasks/
│   │       │   ├── useConfirm.ts
│   │       │   ├── useDraggablePanel.ts
│   │       │   ├── useDropdown.ts
│   │       │   └── useToast.ts
│   │       ├── views/              # 主要功能页面（View 层）
│   │       │   ├── AccountsView.vue
│   │       │   ├── DashboardView.vue
│   │       │   ├── DownloaderView.vue
│   │       │   ├── PlayerView.vue
│   │       │   ├── TasksView.vue
│   │       │   ├── SettingsView.vue
│   │       │   └── AboutView.vue
│   │       ├── live2d/             # AI 看板娘
│   │       │   └── assistant.vue
│   │       └── public/             # 静态资源
│   │           ├── live2d-display.html
│   │           ├── live2d/         # Live2D 运行时库
│   │           └── model/          # Live2D 模型（Azue Lane 角色）
│   └── shared/                     # 共享类型定义
│       └── api.types.ts            # Account、LlmSettings 等接口
├── docs/                           # 技术文档（本目录）
├── electron.vite.config.ts         # electron-vite 配置
├── electron-builder.yml            # 打包配置
└── tsconfig.json / tsconfig.node.json / tsconfig.web.json
```

---

## 4. 核心理念

### 4.1 多账号 Session 隔离
- 每个账号分配独立 `partition: persist:bili-acc-{timestamp}`
- 登录窗口使用对应 partition，成功后保存 Cookie
- 主进程启动时预加载所有账号的 roaming 路由

### 4.2 双 Webview 架构（Player 模块）
- `browserWebview`：浏览 Bilibili 网站（首页、搜索、动态等）
- `videoWebview`：专门加载视频页面，实现纯净播放体验
- 通过 URL 类型自动切换显示哪个 webview

### 4.3 前端状态管理策略
- **简单状态**：`localStorage` / `sessionStorage`（主题、搜索历史、切片数据）
- **复杂结构化状态**：`electron-store`（LLM 配置、看板娘 AI 配置）
- **页面级状态**：Vue Composables（每个 View 对应一个 `useXxxView.ts`）
- **全局共享状态**：通用 Composables（`useToast.ts`、`useDropdown.ts` 等）

### 4.4 代码风格
- **严格模式**：所有 tsconfig 开启 `"strict": true`
- **无分号**、**单引号**、行宽 100、无尾随逗号
- Vue 组件必须 `<script setup lang="ts">`
- IPC 通道名 kebab-case，处理函数 camelCase

---

## 5. 快速导航

| 文档 | 内容 |
|------|------|
| [02-ARCHITECTURE.md](02-ARCHITECTURE.md) | 系统架构图、数据流、模块依赖 |
| [03-IPC_PROTOCOL.md](03-IPC_PROTOCOL.md) | 完整的 IPC 通道列表与类型 |
| [04-MAIN_PROCESS.md](04-MAIN_PROCESS.md) | 主进程入口、GPU 优化、窗口管理 |
| [05-RENDERER_PROCESS.md](05-RENDERER_PROCESS.md) | Vue 应用结构、路由、主题系统 |
| [06-COMPOSABLES_GUIDE.md](06-COMPOSABLES_GUIDE.md) | Composables 设计规范与目录约定 |
| [07-VIDEO_DOWNLOAD.md](07-VIDEO_DOWNLOAD.md) | 视频解析、下载队列、FFmpeg 处理 |
| [08-DASHBOARD.md](08-DASHBOARD.md) | 数据看板、ECharts 图表、深度分析 |
| [09-PLAYER.md](09-PLAYER.md) | 双 Webview、切片系统、实验室 |
| [10-ASSISTANT.md](10-ASSISTANT.md) | Live2D 看板娘、LLM 集成、鼠标追踪 |
| [11-ROAMING.md](11-ROAMING.md) | 番剧区域解锁、PGC 智能路由 |
