// src/preload/index.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { AssistantVibeData, LlmSettings } from '../shared/api.types'

const api = {
  // Main
  hideApp: (): void => ipcRenderer.send('app-hide'),
  quitApp: (): void => ipcRenderer.send('app-quit'),
  onShowClosePrompt: (callback: () => void): (() => void) => {
    ipcRenderer.on('show-close-prompt', callback)
    return () => ipcRenderer.off('show-close-prompt', callback)
  },
  toggleAlwaysOnTop: (enable: boolean): void => ipcRenderer.send('toggle-always-on-top', enable),
  toggleAutoStart: (enable: boolean): void => ipcRenderer.send('toggle-auto-start', enable),
  toggleNetworkBlocker: (enable: boolean): void =>
    ipcRenderer.send('toggle-network-blocker', enable),
  clearAllCookies: (): Promise<boolean> => ipcRenderer.invoke('clear-all-cookies'),

  // Auth
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  addAccount: () => ipcRenderer.invoke('add-account'),
  deleteAccount: (uid: string) => ipcRenderer.invoke('delete-account', uid),
  biliLogin: () => ipcRenderer.invoke('bili-login'),
  biliLogout: () => ipcRenderer.invoke('bili-logout'),

  // Dashboard
  getDashboardData: (type: string, keyword?: string, partition?: string) =>
    ipcRenderer.invoke('get-dashboard-data', type, keyword, partition),

  // Assistant & LLM
  toggleAssistant: (enable: boolean, modelPath?: string) =>
    ipcRenderer.invoke('toggle-assistant', enable, modelPath),
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) =>
    ipcRenderer.invoke('assistant:set-ignore-mouse-events', ignore, options),
  emitVibe: (data: AssistantVibeData): void => ipcRenderer.send('vibe-check', data),
  onVibe: (callback: (data: AssistantVibeData) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, data: AssistantVibeData): void => callback(data)
    ipcRenderer.on('on-assistant-vibe', listener)
    return () => ipcRenderer.off('on-assistant-vibe', listener)
  },
  getLLMSettings: (): Promise<LlmSettings | null> => ipcRenderer.invoke('get-llm-settings'),
  saveLLMSettings: (settings: LlmSettings): Promise<void> =>
    ipcRenderer.invoke('save-llm-settings', settings),
  updateLlmConfig: (settings: LlmSettings): void => ipcRenderer.send('update-llm-config', settings),

  // 看板娘独立 AI 配置
  saveAssistantAISettings: (settings: unknown): Promise<void> =>
    ipcRenderer.invoke('save-assistant-ai-settings', settings),
  getAssistantAISettings: (): Promise<unknown | null> =>
    ipcRenderer.invoke('get-assistant-ai-settings'),

  // 🌟🌟🌟 核心修复：在这里建立真正的 IPC 通道映射！
  assistantAsk: (question: string) => ipcRenderer.invoke('assistant:ask', question),
  onGlobalCursor: (callback) =>
    ipcRenderer.on('global-mouse-tracking', (_, data) => callback(data)),
  // Player
  openPlayer: (bvid: string, partition: string) =>
    ipcRenderer.invoke('open-player', bvid, partition),
  updateCloseAction: (action: string) => ipcRenderer.send('update-close-action', action),
  // Task
  runTasks: (config: Record<string, unknown>) => ipcRenderer.invoke('run-tasks', config),
  setupCron: (timeStr: string, config: Record<string, unknown>) =>
    ipcRenderer.invoke('setup-cron', timeStr, config),
  stopTask: () => ipcRenderer.invoke('stop-task'),
  onTaskLog: (callback: (msg: string) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, msg: string): void => callback(msg)
    ipcRenderer.on('task-log', listener)
    return () => ipcRenderer.off('task-log', listener)
  },

  // Video
  parseVideo: (bvid: string, partitionKey?: string) =>
    ipcRenderer.invoke('parse-video', bvid, partitionKey),
  downloadVideo: (
    taskId: string,
    videoUrl: string,
    audioUrl: string,
    title: string,
    savePath: string,
    page: number,
    cid: number,
    // 🌟 将原本的 clipRange 改为支持两种模式的联合类型
    clipPayload?:
      | { start: number; end: number }
      | { isMerge: boolean; targets: { start: number; end: number; titleExt?: string }[] }
  ) =>
    ipcRenderer.invoke(
      'download-video',
      taskId,
      videoUrl,
      audioUrl,
      title,
      savePath,
      page,
      cid,
      clipPayload
    ),
  openFolder: (filePath?: string) => ipcRenderer.invoke('open-folder', filePath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  onDownloadProgress: (
    callback: (data: { taskId: string; type: string; progress: number; speed?: string }) => void
  ): (() => void) => {
    const listener = (_event: IpcRendererEvent, data: unknown): void =>
      callback(data as { taskId: string; type: string; progress: number; speed?: string })
    ipcRenderer.on('download-progress', listener)
    return () => ipcRenderer.off('download-progress', listener)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (Fallback for non-context-isolated environments)
  window.electron = electronAPI
  // @ts-ignore (Fallback for non-context-isolated environments)
  window.api = api
}
