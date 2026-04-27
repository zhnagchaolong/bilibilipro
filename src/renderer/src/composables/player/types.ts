export interface BiliWebviewElement extends HTMLElement {
  loadURL: (url: string) => Promise<void>
  goBack: () => void
  goForward: () => void
  reload: () => void
  getURL: () => string
  canGoBack: () => boolean
  canGoForward: () => boolean
  insertCSS: (css: string) => Promise<string>
  executeJavaScript: (code: string) => Promise<unknown>
  isLoading: () => boolean
}

export interface Clip {
  id: string
  time: number
  title?: string
  description?: string
  screenshot?: string | null | undefined
  danmakuSnapshots?: { time: number; text: string }[]
  subtitleSnapshots?: { time: number; text: string }[]
  isAuto?: boolean
}

export interface SliceTaskPayload {
  start: number
  end: number
  title: string
}

export interface SearchSuggestItem {
  value: string
  name: string
}

export interface ConsoleMessageEvent {
  message: string
}
