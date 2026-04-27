# 渲染进程 (Renderer Process) 技术文档

---

## 1. Vue 应用入口

### 1.1 文件：src/renderer/src/main.ts

```typescript
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

无全局插件、无路由库（采用 v-show 切换）、无 Pinia/Vuex（状态由 Composables 管理）。

---

## 2. 主布局：App.vue

### 2.1 结构

```
App.vue
├── 顶部标题栏（macOS 风格交通灯）
├── 左侧导航栏（menuItems[] 循环渲染）
│   └── 拖拽调整宽度（localStorage 持久化）
├── 内容区（v-show 多页切换）
│   ├── AccountsView.vue
│   ├── DashboardView.vue
│   ├── PlayerView.vue
│   ├── DownloaderView.vue
│   ├── TasksView.vue
│   ├── SettingsView.vue
│   └── AboutView.vue
├── 关闭确认弹窗
└── 主题管理器（data-theme="dark|light"）
```

### 2.2 导航切换机制

不使用 Vue Router，而是简单的 `activeMenu` ref + `v-show`：

```typescript
const menuItems = [
  { id: 'accounts',  icon: '👥', label: '账号管理',   component: AccountsView },
  { id: 'dashboard', icon: '📈', label: '数据看板',   component: DashboardView },
  { id: 'player',    icon: '🎬', label: '夯哔哩哔哩', component: PlayerView },
  { id: 'downloader',icon: '🎥', label: '视频下载器', component: DownloaderView },
  { id: 'tasks',     icon: '🤖', label: '自动化任务', component: TasksView },
  { id: 'settings',  icon: '⚙️', label: '全局AI设置', component: SettingsView },
  { id: 'about',     icon: 'ℹ️', label: '关于项目',   component: AboutView }
]

const activeMenu = ref(menuItems[0].id)

// 模板中
<component :is="menuItems.find(m => m.id === activeMenu)?.component" />
```

### 2.3 主题系统

```typescript
// 支持三种模式：system / light / dark
const savedTheme = localStorage.getItem('bili-theme-mode')
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const isDarkMode = ref(savedTheme ? savedTheme === 'dark' : systemPrefersDark)

// 切换时设置 data-theme，CSS 变量自动响应
watch(isDarkMode, (v) => {
  document.documentElement.setAttribute('data-theme', v ? 'dark' : 'light')
})
```

CSS 变量定义（`src/renderer/src/assets/`）：

```css
:root {
  --primary-color: #00aeec;
  --bg-color: #f5f6f7;
  --card-bg: #ffffff;
  --text-main: #18191c;
  --text-sub: #61666d;
  --border-color: #e3e5e7;
}

[data-theme='dark'] {
  --bg-color: #18191c;
  --card-bg: #222325;
  --text-main: #e3e5e7;
  --text-sub: #9499a0;
  --border-color: #363738;
}
```

---

## 3. View 层设计规范

### 3.1 职责分离原则

| 层级 | 职责 | 示例文件 |
|------|------|---------|
| `.vue` View | HTML 模板 + CSS 样式 + Composable 解构 | `PlayerView.vue` |
| `.ts` Composable | 状态、计算属性、方法、生命周期 | `usePlayerView.ts` |
| `.vue` Component | 可复用 UI 组件 | `ClipManager.vue` |

### 3.2 View 文件模板

```vue
<script setup lang="ts">
import { useXxxView } from '../composables/xxx/useXxxView'
import SomeComponent from '../components/SomeComponent.vue'

const {
  // 只解构模板中实际使用的变量和方法
  stateVar,
  computedVar,
  handleAction
} = useXxxView()
</script>

<template>
  <div class="page-container">
    <!-- 页面结构 -->
  </div>
</template>

<style scoped>
/* 页面专属样式 */
</style>
```

### 3.3 已重构的 View 列表

| View | Composable | 原行数 | 现行数 |
|------|-----------|--------|--------|
| AccountsView.vue | `useAccountsView.ts` | ~800 | 516 |
| DashboardView.vue | `useDashboardView.ts` | 4132 | 3256 |
| DownloaderView.vue | `useDownloaderView.ts` | ~2000 | 1663 |
| PlayerView.vue | `usePlayerView.ts` | 3440 | 2146 |
| SettingsView.vue | `useSettingsView.ts` | ~1200 | 1124 |
| TasksView.vue | `useTasksView.ts` | ~1100 | 993 |

---

## 4. 组件层

### 4.1 通用组件

| 组件 | 文件 | 职责 |
|------|------|------|
| AudioAlchemist.vue | `components/AudioAlchemist.vue` | 音频 EQ 调节（Bass Boost / Vocal Enhance / Night Mode） |
| ClipManager.vue | `components/ClipManager.vue` | 切片时间轴管理、批量导出到下载器 |
| TimeJumper.vue | `components/TimeJumper.vue` | 时间点精确跳转 |
| Versions.vue | `components/Versions.vue` | 版本信息显示 |

### 4.2 组件与 View 的通信

```vue
<!-- PlayerView.vue -->
<ClipManager
  v-model="showClipManager"
  :clips="currentVideoClips"
  :all-clips="allClipsMap"
  :video-duration="videoDuration"
  @update:clips="currentVideoClips = $event"
  @jump-to="handleJumpToTime"
  @navigate-to="handleNavigateToVideo"
  @set-active-clip="setActiveTimelineMarker"
  @push-slice-tasks="(tasks, isMerged) => handleSliceTasks(tasks, isMerged)"
/>
```

---

## 5. Webview 标签使用

### 5.1 PlayerView 双 Webview 架构

```vue
<webview
  ref="browserWebview"
  :partition="selectedPartition"
  src="https://www.bilibili.com"
  @did-navigate="onDidNavigate($event, 'browser')"
  @did-stop-loading="onStopLoading('browser')"
  @console-message="handleConsoleMessage"
/>

<webview
  ref="videoWebview"
  :partition="selectedPartition"
  src="about:blank"
  @did-navigate="onDidNavigate($event, 'video')"
  @did-stop-loading="onStopLoading('video')"
  @console-message="handleConsoleMessage"
/>
```

### 5.2 Webview 事件处理

| 事件 | 用途 |
|------|------|
| `did-navigate` / `did-navigate-in-page` | URL 变化检测，自动切换 browser/video 视图 |
| `did-stop-loading` | 页面加载完成，注入 CSS/JS |
| `console-message` | 捕获 `__BILI_NAV__`、`__BILI_TITLE__` 等内部协议消息 |
| `dom-ready` | 注入黑魔法脚本（自动全屏、最高画质、关键词过滤） |
| `new-window` | 阻止弹窗，强制在当前页打开 |

---

## 6. 静态资源

### 6.1 Live2D 运行时

```
src/renderer/src/public/
├── live2d-display.html       # 看板娘独立页面入口
├── live2d/                   # PixiJS + Cubism 运行时库
│   ├── jquery.min.js
│   ├── pixi.min.js
│   └── cubism/               # Cubism 3 Core
└── model/                    # Live2D 模型资源
    └── Azue Lane(JP)/        # 拉菲、绫波、标枪、Z23 等角色
```

### 6.2 构建后路径

开发环境：`src/renderer/src/public/`
生产环境：`process.resourcesPath + '/live2d-display.html'`
