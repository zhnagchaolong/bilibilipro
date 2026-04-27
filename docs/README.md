# Bilibili PRO Assistant — 技术文档

本文档集面向开发者，帮助理解项目架构、模块设计和关键实现细节。

---

## 文档导航

### 架构篇

| 文档 | 内容 |
|------|------|
| [01-PROJECT_OVERVIEW.md](01-PROJECT_OVERVIEW.md) | 项目总览、技术栈、目录结构、核心理念 |
| [02-ARCHITECTURE.md](02-ARCHITECTURE.md) | 三层架构图、数据流、模块依赖、Session 隔离模型 |

### 协议篇

| 文档 | 内容 |
|------|------|
| [03-IPC_PROTOCOL.md](03-IPC_PROTOCOL.md) | 完整的 IPC 通道列表、参数、返回值、错误处理约定 |

### 模块篇

| 文档 | 内容 |
|------|------|
| [04-MAIN_PROCESS.md](04-MAIN_PROCESS.md) | 主进程入口、GPU 优化、窗口管理、Session/Cookie |
| [05-RENDERER_PROCESS.md](05-RENDERER_PROCESS.md) | Vue 应用结构、主题系统、View/Composable 分离、webview 使用 |
| [06-COMPOSABLES_GUIDE.md](06-COMPOSABLES_GUIDE.md) | Composables 设计规范、通用/页面级 Composables 详解 |
| [07-VIDEO_DOWNLOAD.md](07-VIDEO_DOWNLOAD.md) | 视频解析、并发下载、FFmpeg 合并、切片系统 |
| [08-DASHBOARD.md](08-DASHBOARD.md) | ECharts 图表、8 种看板视图、深度分析数据结构 |
| [09-PLAYER.md](09-PLAYER.md) | 双 Webview 架构、CSS/JS 注入、切片系统、极客实验室 |
| [10-ASSISTANT.md](10-ASSISTANT.md) | Live2D 看板娘、LLM 集成、鼠标追踪、情感数据系统 |
| [11-ROAMING.md](11-ROAMING.md) | 番剧区域解锁、PGC 接口拦截、智能路由 |

---

## 快速启动

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 类型检查
npm run typecheck

# ESLint 检查
npm run lint

# 代码格式化
npm run format

# 生产构建
npm run build

# Windows 打包
npm run build:win
```

---

## 关键设计决策

1. **不用 Vue Router**：采用 `v-show` + `activeMenu` 切换，减少依赖，适合桌面应用的单窗口场景
2. **不用 Pinia/Vuex**：页面级状态由 Composables 管理，全局状态由 `localStorage` + `electron-store` 承担
3. **Composables 而非 Options API**：所有逻辑提取到 `.ts` 文件，`.vue` 文件只保留模板和样式
4. **双 Webview 架构**：浏览和视频分离，实现纯净的播放体验
5. **Session 隔离**：每个账号独立 partition，Cookie 和 roaming 路由互不干扰
