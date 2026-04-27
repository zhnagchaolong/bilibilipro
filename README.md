# Bilibili PRO Assistant

> 基于 Electron + Vue 3 + TypeScript 的 Bilibili 桌面增强客户端
> 
> 版本：V1.2.0 | 作者：@GDUT_ZCL

[![Electron](https://img.shields.io/badge/Electron-39.2.6-47848F?logo=electron)](https://www.electronjs.org/)
[![Vue](https://img.shields.io/badge/Vue-3.5.25-4FC08D?logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)

---

## ✨ 核心功能

### 📺 视频解析与下载
- DASH 流视频解析，支持 AVC / HEVC / AV1 画质选择
- 并发下载视频流与音频流，实时进度推送
- FFmpeg 无损合并（`copy` 编解码器，不重新编码）
- 支持片段截取、批量拼接（Fast Concat）

### 👤 多账号隔离管理
- 独立 Session + Cookie 持久化，账号间完全隔离
- 登录窗口使用对应 partition，自动保存 Cookie
- 删除账号时自动清理沙盒数据

### 🤖 AI 驱动的 Live2D 桌面看板娘
- 透明无边框置顶窗口，PixiJS + Cubism 3 渲染
- 鼠标追踪自动转头（150ms 全局坐标追踪）
- 闲置闲聊、弹幕吐槽、手动聊天、伴看模式
- 支持 DeepSeek / OpenAI / Qwen / Custom 接口

### 🎬 悬浮极简播放器
- 无边框置顶窗口，CSS 注入精简 B站页面
- 仅保留播放器，隐藏页头/侧边栏/推荐/评论
- 伴看弹幕嗅探，每 30 秒抓取推送看板娘

### 📊 数据看板
- **个人资产总览**：硬币、B币、等级、经验、粉丝、关注
- **UP 主深度洞察**：投稿全景统计、视频/专栏/音频/相簿、充电公示、趋势图表、爆款视频、分区分布、AI 智能分析
- **视频数据透视**：互动数据、转化率、健康度评分、UP 主对比分析
- **视频对比**：多 BV 号并排对比播放量/点赞/投币/收藏
- **趋势发现**：B站热门分区统计

### ⚡ 自动化日常任务
- 直播签到、漫读签到、模拟观看、分享、投币、银瓜子换硬币
- `node-cron` 定时任务引擎，支持 cron 表达式和 `HH:MM` 格式

### 🌏 番剧区域解锁（Roaming）
- 智能拦截 `api.bilibili.com/pgc/...` 接口
- 通过 `kghost.info` 代理转发，动态注入 Cookie/Referer

---

## 🏗️ 项目结构

```
my-bili-assistant/
├── build/                          # 构建资源（图标、plist）
├── out/                            # 开发编译输出（electron-vite）
├── dist/                           # 生产构建输出（electron-builder）
├── src/
│   ├── main/                       # Electron 主进程
│   │   ├── index.ts                # 主入口：窗口、GPU 优化、托盘、生命周期
│   │   ├── config/
│   │   │   └── constants.ts        # BILI_HEADERS、API_URLS 统一常量
│   │   └── ipc/                    # IPC 处理器（按功能拆分）
│   │       ├── authIpc.ts          # 账号管理、登录、Session 隔离
│   │       ├── videoIpc.ts         # 视频解析、并发下载、FFmpeg 处理
│   │       ├── taskIpc.ts          # 自动化任务引擎与 cron 定时
│   │       ├── playerIpc.ts        # 悬浮播放器、伴看 AI、弹幕嗅探
│   │       ├── dashboardIpc.ts     # 数据看板（UP主/视频/趋势）
│   │       ├── roamingIpc.ts       # 番剧区域解锁（PGC 智能路由）
│   │       └── assistant.ts        # Live2D 看板娘窗口、LLM 调用
│   ├── preload/                    # 预加载脚本
│   │   ├── index.ts                # contextBridge 暴露 api
│   │   └── index.d.ts              # 全局 Window 类型声明
│   ├── renderer/                   # 前端 Vue 应用
│   │   └── src/
│   │       ├── main.ts             # Vue 应用入口
│   │       ├── App.vue             # 主布局：侧边栏导航、主题切换
│   │       ├── views/              # 主要功能页面
│   │       ├── components/         # 通用组件
│   │       ├── composables/        # 组合式逻辑
│   │       └── public/             # 静态资源（Live2D 运行时、模型）
│   └── shared/                     # 共享类型定义
│       └── api.types.ts            # TypeScript 接口
├── docs/                           # 项目文档（架构、IPC 协议、各模块详解）
├── electron.vite.config.ts         # electron-vite 三端构建配置
├── electron-builder.yml            # 打包配置（NSIS、图标、asarUnpack）
└── package.json
```

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron `^39.2.6` |
| 前端框架 | Vue `^3.5.25` + TypeScript `^5.9.3` |
| 构建工具 | electron-vite `^5.0.0` + Vite `^7.2.6` |
| UI 组件 | Element Plus Icons |
| 状态与配置 | `localStorage` + `electron-store` |
| 视频处理 | `fluent-ffmpeg` + `ffmpeg-static` |
| 定时任务 | `node-cron` |
| AI / LLM | `openai` SDK（兼容多提供商） |
| 图形渲染 | PixiJS `7.2.4` + `pixi-live2d-display`（Cubism 3） |
| 图表 | `echarts` `^6.0.0` |
| HTTP 请求 | `axios` `^1.15.0` |

---

## 📦 安装与运行

### 环境要求

- Node.js >= 18.x
- npm >= 9.x

### 安装依赖

```bash
npm install
```

> `postinstall` 钩子会自动执行 `electron-builder install-app-deps`，确保原生依赖正确编译。

### 开发模式（热重载）

```bash
npm run dev
```

### 类型检查

```bash
npm run typecheck       # 全部（先 node 后 web）
npm run typecheck:node  # 仅主进程
npm run typecheck:web   # 仅渲染进程
```

### 代码质量

```bash
npm run lint      # ESLint（带缓存）
npm run format    # Prettier 格式化
```

---

## 🚀 构建与打包

### 生产构建

```bash
npm run build
```

### 平台打包

```bash
# Windows NSIS 安装包
npm run build:win

# macOS DMG
npm run build:mac

# Linux AppImage
npm run build:linux

# 仅生成未打包目录（用于调试）
npm run build:unpack
```

> **打包注意**：`electron-builder.yml` 中必须配置 `asarUnpack: '**/node_modules/ffmpeg-static/**/*'`，否则生产环境无法 spawn FFmpeg。

---

## 🎨 代码风格

- **严格模式**：所有 `tsconfig` 均开启 `"strict": true`
- **分号**：禁用（`semi: false`）
- **引号**：单引号（`singleQuote: true`）
- **行宽**：100 字符（`printWidth: 100`）
- **尾随逗号**：禁用（`trailingComma: none`）
- **Vue**：必须始终使用 `<script setup lang="ts">`

---

## ⚠️ 安全与隐私

- **Context Isolation**：主窗口预加载脚本开启 `contextIsolation: true`
- **Cookie 处理**：敏感凭证（`SESSDATA`、`bili_jct`）仅用于 API 请求，不会明文外泄
- **LLM API Key**：通过 `electron-store` 加密存储在本地，不会硬编码在源码中
- **单实例锁**：`app.requestSingleInstanceLock()` 阻止多开

---

## 📝 相关文档

项目根目录 `docs/` 文件夹下包含详细技术文档：

| 文档 | 内容 |
|------|------|
| `01-PROJECT_OVERVIEW.md` | 项目概述 |
| `02-ARCHITECTURE.md` | 系统架构 |
| `03-IPC_PROTOCOL.md` | IPC 通信协议 |
| `04-MAIN_PROCESS.md` | 主进程详解 |
| `05-RENDERER_PROCESS.md` | 渲染进程详解 |
| `06-COMPOSABLES_GUIDE.md` | Composables 指南 |
| `07-VIDEO_DOWNLOAD.md` | 视频下载模块 |
| `08-DASHBOARD.md` | 数据看板模块 |
| `09-PLAYER.md` | 悬浮播放器模块 |
| `10-ASSISTANT.md` | AI 看板娘模块 |

---

## 📄 开源协议

本项目仅供学习和技术研究参考。使用 B站 API 请遵守相关法律法规及 B站用户协议。

---

> Made with ❤️ by @GDUT_ZCL
