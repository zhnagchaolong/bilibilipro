import { ref } from 'vue'

export interface ConfirmState {
  show: boolean
  title: string
  message: string
  action: () => void
}

/**
 * 通用确认模态框逻辑
 * 提取自 DownloaderView / AccountsView 等重复实现
 */
export function useConfirm() {
  const confirmModal = ref<ConfirmState>({ show: false, title: '', message: '', action: () => {} })

  const showConfirm = (title: string, message: string, action: () => void): void => {
    confirmModal.value = { show: true, title, message, action }
  }

  const executeConfirm = (): void => {
    confirmModal.value.action()
    confirmModal.value.show = false
  }

  const cancelConfirm = (): void => {
    confirmModal.value.show = false
  }

  return { confirmModal, showConfirm, executeConfirm, cancelConfirm }
}
