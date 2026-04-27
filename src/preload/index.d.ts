// src/preload/index.d.ts
import { ElectronAPI } from '@electron-toolkit/preload'
import {
  BaseResponse,
  LlmSettings,
  AssistantVibeData,
  BiliAccount,
  AddAccountResult
} from '../shared/api.types'

interface Api {
  // Main/Window Management
  hideApp: () => void
  quitApp: () => void
  onShowClosePrompt: (callback: () => void) => () => void
  toggleAlwaysOnTop: (enable: boolean) => void
  toggleAutoStart: (enable: boolean) => void
  toggleNetworkBlocker: (enable: boolean) => void
  clearAllCookies: () => Promise<boolean>

  // Auth
  getAccounts: () => Promise<BiliAccount[]>
  addAccount: () => Promise<AddAccountResult>
  deleteAccount: (uid: string) => Promise<BaseResponse>
  biliLogin: () => Promise<unknown>
  biliLogout: () => Promise<BaseResponse>

  // Dashboard
  getDashboardData: (
    type: string,
    keyword?: string,
    partition?: string
  ) => Promise<{ success: boolean; data?: unknown; error?: string }>

  // Assistant & LLM
  toggleAssistant: (enable: boolean, modelPath?: string) => Promise<void>
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => Promise<void>
  emitVibe: (data: AssistantVibeData) => void
  onVibe: (callback: (data: AssistantVibeData) => void) => () => void
  getLLMSettings: () => Promise<LlmSettings | null>
  saveLLMSettings: (settings: LlmSettings) => Promise<void>
  updateLlmConfig: (settings: LlmSettings) => void
  saveAssistantAISettings: (settings: unknown) => Promise<void>
  getAssistantAISettings: () => Promise<unknown | null>

  // 🌟🌟🌟 核心修复：在这里暴露对大模型的请求接口！
  assistantAsk: (question: string) => Promise<{ success: boolean; content: string }>

  // Player
  openPlayer: (bvid: string, partition: string) => Promise<void>

  // Task
  runTasks: (config: Record<string, unknown>) => Promise<{ success: boolean; message?: string }>
  setupCron: (
    timeStr: string,
    config: Record<string, unknown>
  ) => Promise<{ success: boolean; message: string }>
  stopTask: () => Promise<void>
  onTaskLog: (callback: (msg: string) => void) => () => void

  // Video
  parseVideo: (
    bvid: string,
    partitionKey?: string
  ) => Promise<{ success: boolean; data?: unknown; message?: string }>
  downloadVideo: (
    taskId: string,
    videoUrl: string,
    audioUrl: string,
    title: string,
    savePath?: string,
    page?: number,
    cid?: number
  ) => Promise<{ success: boolean; filePath?: string; message?: string }>
  openFolder: (filePath?: string) => Promise<void>
  selectFolder: () => Promise<string | null>
  onDownloadProgress: (
    callback: (data: { taskId: string; type: string; progress: number; speed?: string }) => void
  ) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
