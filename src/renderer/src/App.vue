<!-- eslint-disable prettier/prettier -->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import DownloaderView from './views/DownloaderView.vue'
import SettingsView from './views/SettingsView.vue'
import TasksView from './views/TasksView.vue'
import AccountsView from './views/AccountsView.vue'
import PlayerView from './views/PlayerView.vue'
import DashboardView from './views/DashboardView.vue'
import AboutView from './views/AboutView.vue'
import AssistantView from '../src/live2d/assistant.vue'

const isAssistantMode =
  window.location.hash === '#assistant' || window.location.hash === '#/assistant'
const savedTheme = localStorage.getItem('bili-theme-mode')
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

const menuItems = [
  { id: 'accounts', icon: '👥', label: '账号管理', component: AccountsView },
  { id: 'dashboard', icon: '📈', label: '数据看板', component: DashboardView },
  { id: 'player', icon: '🎬', label: '夯哔哩哔哩', component: PlayerView },
  { id: 'downloader', icon: '🎥', label: '视频下载器', component: DownloaderView },
  { id: 'tasks', icon: '🤖', label: '自动化任务', component: TasksView },
  { id: 'settings', icon: '⚙️', label: '全局AI设置', component: SettingsView },
  { id: 'about', icon: 'ℹ️', label: '关于项目', component: AboutView }
]

const activeMenu = ref(menuItems[0].id)
const showCloseDialog = ref(false)

const switchMenu = (item: (typeof menuItems)[0]): void => {
  if (!item.component) {
    alert('该功能正在火热开发中，敬请期待！')
    return
  }
  activeMenu.value = item.id
}

const handleHideApp = (): void => {
  showCloseDialog.value = false
  window.api.hideApp()
}

const handleQuitApp = (): void => {
  window.api.quitApp()
}

const isDarkMode = ref(savedTheme ? savedTheme === 'dark' : systemPrefersDark)

const toggleTheme = (): void => {
  isDarkMode.value = !isDarkMode.value
  const theme = isDarkMode.value ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('bili-theme-mode', theme)
}

const savedWidth = localStorage.getItem('bili-sidebar-width')
const sidebarWidth = ref(savedWidth ? parseInt(savedWidth) : 260)
const isCollapsed = ref(localStorage.getItem('bili-sidebar-collapsed') === 'true')
const isResizing = ref(false)

const actualSidebarWidth = computed(() => {
  return isCollapsed.value ? 80 : sidebarWidth.value
})

const toggleCollapse = (): void => {
  isCollapsed.value = !isCollapsed.value
  localStorage.setItem('bili-sidebar-collapsed', isCollapsed.value.toString())
}

const startResize = (): void => {
  if (isCollapsed.value) return
  isResizing.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', doResize)
  document.addEventListener('mouseup', stopResize)
}

const doResize = (e: MouseEvent): void => {
  if (!isResizing.value) return
  let newWidth = e.clientX
  if (newWidth < 200) newWidth = 200
  if (newWidth > 450) newWidth = 450
  sidebarWidth.value = newWidth
}

const stopResize = (): void => {
  isResizing.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', doResize)
  document.removeEventListener('mouseup', stopResize)
  localStorage.setItem('bili-sidebar-width', sidebarWidth.value.toString())
}

onMounted((): void => {
  document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light')
  const savedCustom = localStorage.getItem('bili-custom-theme')
  if (savedCustom) {
    const customTheme = JSON.parse(savedCustom)
    document.documentElement.style.setProperty('--primary-color', customTheme.primaryColor)
    document.documentElement.style.setProperty('--primary-hover', customTheme.primaryColor + 'CC')
  }

  const isBlockerEnabled = localStorage.getItem('bili-net-blocker') === 'true'
  if (window.api && window.api.toggleNetworkBlocker) {
    window.api.toggleNetworkBlocker(isBlockerEnabled)
  }

  // ==== ✅ 修复后的 AI 助手自启动与模型记忆逻辑 ====
  const isAssistantEnabled = localStorage.getItem('bili-assistant-enabled') === 'true'
  const savedAssistantModelPath = localStorage.getItem('bili-assistant-model') || ''

  // ⚡️ 核心修复：无论状态是 true 还是 false，都强制同步给主进程
  if (window.api && typeof window.api.toggleAssistant === 'function') {
    window.api.toggleAssistant(isAssistantEnabled, savedAssistantModelPath)
    console.log(
      `✅ AI 陪看助手状态已同步：${isAssistantEnabled ? '显示' : '隐藏'}，模型：${savedAssistantModelPath || '默认模型'}`
    )
  }

  // 👇 ======== 往下紧接着补充这段“记忆恢复”代码 ======== 👇
  if (window.api && window.api.getLLMSettings && window.api.updateLlmConfig) {
    window.api.getLLMSettings().then((savedLlm) => {
      if (savedLlm && savedLlm.enabled) {
        window.api.updateLlmConfig(JSON.parse(JSON.stringify(savedLlm)))
        console.log(`✅ AI 神经网络记忆已恢复连接: ${savedLlm.provider}`)
      }
    })
  }

  if (window.api && typeof window.api.onShowClosePrompt === 'function') {
    window.api.onShowClosePrompt(() => {
      const action = localStorage.getItem('bili-close-action') || 'ask'
      if (action === 'tray') {
        handleHideApp()
      } else if (action === 'quit') {
        handleQuitApp()
      } else {
        showCloseDialog.value = true
      }
    })
  }

  window.addEventListener('app-command-nav', (e: Event) => {
    const customEvent = e as CustomEvent
    const targetItem = menuItems.find((i) => i.id === customEvent.detail)
    if (targetItem) switchMenu(targetItem)
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', doResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<template>
  <!-- 看板娘独立模式 -->
  <div v-if="isAssistantMode" class="assistant-standalone">
    <AssistantView />
  </div>

  <!-- 正常主界面 -->
  <template v-else>
    <div class="app-layout">
      <aside
        class="sidebar"
        :class="{ 'is-collapsed': isCollapsed, 'is-resizing': isResizing }"
        :style="{ width: actualSidebarWidth + 'px' }"
      >
        <div class="brand">
          <div class="brand-logo">B</div>
          <div v-show="!isCollapsed" class="brand-text">
            <h1>Bilibili PRO V1.2</h1>
            <p>@GDUT_ZCL</p>
          </div>
        </div>
        <div class="collapse-toggle" title="展收侧边栏" @click="toggleCollapse">
          <svg v-if="!isCollapsed" viewBox="0 0 24 24" class="toggle-icon">
            <path
              fill="currentColor"
              d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6l6 6l1.41-1.41z"
            />
          </svg>
          <svg v-else viewBox="0 0 24 24" class="toggle-icon">
            <path
              fill="currentColor"
              d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6l-1.41-1.41z"
            />
          </svg>
        </div>

        <nav class="menu">
          <div
            v-for="item in menuItems"
            :key="item.id"
            class="menu-item"
            :class="{ active: activeMenu === item.id }"
            :title="isCollapsed ? item.label : ''"
            @click="switchMenu(item)"
          >
            <span class="m-icon">{{ item.icon }}</span>
            <span v-show="!isCollapsed" class="m-label">{{ item.label }}</span>
          </div>
        </nav>

        <div class="spacer"></div>

        <button
          class="theme-switch"
          :title="isDarkMode ? '切换至明亮模式' : '切换至暗黑模式'"
          @click="toggleTheme"
        >
          <span class="icon">{{ isDarkMode ? '🌙' : '☀️' }}</span>
          <span v-show="!isCollapsed">{{ isDarkMode ? '暗黑模式' : '明亮模式' }}</span>
        </button>

        <div v-show="!isCollapsed" class="resizer-handle" @mousedown="startResize"></div>
      </aside>

      <div class="main-content">
        <header class="top-bar">
          <div class="drag-region spacer"></div>
        </header>

        <main class="page-container relative-boards">
          <div
            v-show="activeMenu === 'accounts'"
            :class="['page-board', { active: activeMenu === 'accounts' }]"
          >
            <AccountsView />
          </div>
          <div
            v-show="activeMenu === 'player'"
            :class="['page-board', 'player-zero-padding', { active: activeMenu === 'player' }]"
          >
            <PlayerView :is-active="activeMenu === 'player'" />
          </div>
          <div
            v-show="activeMenu === 'dashboard'"
            :class="['page-board', { active: activeMenu === 'dashboard' }]"
          >
            <DashboardView />
          </div>
          <div
            v-show="activeMenu === 'downloader'"
            :class="['page-board', { active: activeMenu === 'downloader' }]"
          >
            <DownloaderView />
          </div>
          <div
            v-show="activeMenu === 'tasks'"
            :class="['page-board', { active: activeMenu === 'tasks' }]"
          >
            <TasksView />
          </div>
          <div
            v-show="activeMenu === 'settings'"
            :class="['page-board', { active: activeMenu === 'settings' }]"
          >
            <SettingsView />
          </div>
          <div
            v-show="activeMenu === 'about'"
            :class="['page-board', { active: activeMenu === 'about' }]"
          >
            <AboutView />
          </div>
        </main>
      </div>
    </div>

    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showCloseDialog" class="custom-modal-overlay">
          <div class="custom-modal">
            <div class="modal-content-wrap">
              <div class="icon-wrap">
                <svg viewBox="0 0 1024 1024" width="30" height="30">
                  <path
                    d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896zm0 192a58.432 58.432 0 0 0-58.24 63.744l23.36 256.384a35.072 35.072 0 0 0 69.76 0l23.296-256.384A58.432 58.432 0 0 0 512 256zm0 512a51.2 51.2 0 1 0 0-102.4 51.2 51.2 0 0 0 0 102.4z"
                    fill="#E6A23C"
                  />
                </svg>
              </div>
              <div class="text-content">
                <h3>确认关闭窗口吗？</h3>
                <p>您的后台挂机和下载任务正在运行，<br />建议选择【后台挂机】保持运行状态。</p>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-cancel" @click="showCloseDialog = false">取 消</button>
              <button class="btn btn-danger" @click="handleQuitApp">完全退出</button>
              <button class="btn btn-primary" @click="handleHideApp">后台挂机 (推荐)</button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </template>
</template>

<style>
:root {
  --bg-color: #f4f5f7;
  --sidebar-bg: #ffffff;
  --card-bg: #ffffff;
  --text-main: #18191c;
  --text-sub: #61666d;
  --border-color: #e3e5e7;
  --sidebar-border: #e3e5e7;
  --primary-color: #00aeec;
  --primary-hover: #0093c9;
  --menu-hover: rgba(0, 0, 0, 0.04);
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

[data-theme='dark'] {
  --bg-color: #18191c;
  --sidebar-bg: #18191c;
  --card-bg: #222325;
  --text-main: #e3e5e7;
  --text-sub: #9499a0;
  --sidebar-border: #222325;
  --border-color: #2b2c2f;
  --primary-color: #fb7299;
  --primary-hover: #e0658a;
  --menu-hover: rgba(255, 255, 255, 0.06);
  --shadow-sm: none;
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
}
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  background-color: var(--bg-color);
  color: var(--text-main);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  user-select: none;
}
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--text-sub);
}
</style>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.sidebar {
  position: relative;
  background-color: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  z-index: 10;
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.02);
}
.sidebar.is-resizing {
  transition: none !important;
}

.resizer-handle {
  position: absolute;
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 20;
  transition: background-color 0.2s;
}
.resizer-handle:hover,
.sidebar.is-resizing .resizer-handle {
  background-color: var(--primary-color);
  opacity: 0.5;
}

.brand {
  position: relative;
  padding: 25px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 90px;
  box-sizing: border-box;
  overflow: hidden;
  white-space: nowrap;
}
.brand-logo {
  width: 40px;
  height: 40px;
  background: var(--primary-color);
  color: white;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 900;
  font-style: italic;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}
.brand-text h1 {
  margin: 0;
  font-size: 17px;
  font-weight: bold;
  color: var(--text-main);
  letter-spacing: -0.5px;
}
.brand-text p {
  margin: 2px 0 0 0;
  font-size: 11px;
  color: var(--text-sub);
}

.collapse-toggle {
  position: absolute;
  right: 16px;
  top: 45px;
  transform: translateY(-50%);
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-sub);
  transition: all 0.2s;
  opacity: 0;
  z-index: 50;
}
.sidebar:hover .collapse-toggle,
.is-collapsed .collapse-toggle {
  opacity: 1;
}
.collapse-toggle:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  transform: translateY(-50%) scale(1.1);
}
.toggle-icon {
  width: 16px;
  height: 16px;
}

.sidebar.is-collapsed .collapse-toggle {
  right: auto;
  left: 50%;
  top: 86px;
  transform: translate(-50%, -50%);
  background: var(--card-bg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.sidebar.is-collapsed .collapse-toggle:hover {
  transform: translate(-50%, -50%) scale(1.15);
  background: var(--primary-color);
}

.menu {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 5px;
  overflow-y: auto;
  overflow-x: hidden;
}
.menu::-webkit-scrollbar {
  display: none;
}
.menu-item {
  padding: 12px 14px;
  border-radius: 12px;
  color: var(--text-sub);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14.5px;
  font-weight: 600;
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  white-space: nowrap;
  border: 1px solid transparent;
}
.m-icon {
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.m-label {
  flex: 1;
}

.menu-item:hover:not(.active) {
  background-color: var(--menu-hover);
  color: var(--text-main);
  transform: translateY(-1px);
}
.menu-item.active {
  background-color: var(--primary-color);
  color: #fff;
  box-shadow: 0 6px 14px rgba(var(--primary-color), 0.25);
  transform: translateX(4px) scale(1.02);
}
[data-theme='dark'] .menu-item.active {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
}

.spacer {
  flex: 1;
  min-height: 20px;
}

.theme-switch {
  margin: auto 16px 24px 16px;
  padding: 12px;
  border-radius: 12px;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13.5px;
  font-weight: bold;
  color: var(--text-sub);
  outline: none;
  transition: var(--transition);
  white-space: nowrap;
  overflow: hidden;
}
.theme-switch:hover {
  color: var(--primary-color);
  border-color: var(--primary-color);
  background-color: transparent;
}

.sidebar.is-collapsed .brand {
  padding: 25px 0;
  justify-content: center;
}
.sidebar.is-collapsed .menu {
  padding: 0 12px;
}
.sidebar.is-collapsed .menu-item {
  padding: 12px;
  justify-content: center;
}
.sidebar.is-collapsed .menu-item.active {
  transform: scale(1.05);
}
.sidebar.is-collapsed .theme-switch {
  padding: 12px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  position: relative;
  min-width: 0;
}
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  z-index: 5;
}
.drag-region {
  flex: 1;
  height: 100%;
  -webkit-app-region: drag;
}

.relative-boards {
  flex: 1;
  position: relative;
  overflow: hidden;
}
.page-board {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 32px 32px 32px;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  user-select: text;
  will-change: transform, opacity;
  backface-visibility: hidden;
  content-visibility: auto;
}
.page-board.active {
  content-visibility: visible;
}
.page-board.player-zero-padding {
  padding: 0;
  overflow: hidden;
}

.custom-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}
.custom-modal {
  background-color: var(--card-bg);
  width: 420px;
  border-radius: var(--radius-lg);
  padding: 24px 28px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
}
.modal-content-wrap {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}
.text-content h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: bold;
  color: var(--text-main);
}
.text-content p {
  margin: 0;
  font-size: 14px;
  color: var(--text-sub);
  line-height: 1.6;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.btn {
  padding: 8px 18px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: var(--transition);
  font-weight: 500;
  outline: none;
}
.btn-cancel {
  border-color: var(--border-color);
  color: var(--text-main);
  background: transparent;
}
.btn-cancel:hover {
  color: var(--primary-color);
  border-color: var(--primary-color);
}
.btn-danger {
  border-color: #fbc4c4;
  color: #f56c6c;
  background: transparent;
}
.btn-danger:hover {
  background-color: #fef0f0;
  border-color: #f56c6c;
}
.btn-primary {
  background-color: var(--primary-color);
  color: #fff;
}
.btn-primary:hover {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
}
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(-10px);
}
.assistant-standalone {
  width: 100vw;
  height: 100vh;
  background: transparent;
  overflow: hidden;
}
</style>
