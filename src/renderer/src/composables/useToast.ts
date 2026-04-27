import { ref } from 'vue'

export interface ToastState {
  show: boolean
  message: string
  type: 'success' | 'warn' | 'error'
}

/**
 * 全局 Toast 提示逻辑
 * 提取自 AccountsView / DownloaderView 等重复实现
 */
export function useToast(duration = 2500) {
  const toast = ref<ToastState>({ show: false, message: '', type: 'success' })
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  const showToast = (message: string, type: ToastState['type'] = 'success'): void => {
    toast.value = { show: true, message, type }
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toast.value.show = false
    }, duration)
  }

  return { toast, showToast }
}
