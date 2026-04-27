import { ref, onMounted } from 'vue'
import type { BiliAccount } from '../../../../shared/api.types'
import { useToast } from '../../composables/useToast'

export function useAccountsView() {
  const { toast, showToast } = useToast()

  // 基础状态
  const accounts = ref<BiliAccount[]>([])
  const isAdding = ref(false)
  const isRefreshing = ref(false)
  const isDeleting = ref(false)

  // 自定义模态框 Modal 逻辑
  const deleteModal = ref({ show: false, targetUid: '', accName: '' })

  const promptDeleteAccount = (acc: BiliAccount): void => {
    deleteModal.value = { show: true, targetUid: acc.uid, accName: acc.name }
  }

  const cancelDelete = (): void => {
    if (isDeleting.value) return
    deleteModal.value.show = false
  }

  const executeDelete = async (): Promise<void> => {
    isDeleting.value = true
    try {
      const res = await window.api.deleteAccount(deleteModal.value.targetUid)
      if (res.success) {
        deleteModal.value.show = false
        showToast(`已成功移除账户: ${deleteModal.value.accName}`, 'success')

        await loadAccounts(false)

        if (accounts.value.length === 0) {
          localStorage.removeItem('bili-user-info')
          localStorage.removeItem('active_uid')

          if (window.api && window.api.clearAllCookies) {
            await window.api.clearAllCookies()
          }

          setTimeout(() => {
            window.location.reload()
          }, 300)
        }
      }
    } catch (error) {
      showToast('移除账号失败，请重试', 'error')
      console.error('移除失败:', error)
    } finally {
      isDeleting.value = false
    }
  }

  // 翻译天数与颜色渲染
  const formatDays = (days?: number): string => {
    if (days === undefined || days === null) return '有效 (未知)'
    if (days <= 0) return '已失效 ⚠️'
    return `剩 ${days} 天`
  }

  const getDaysColor = (days?: number): string => {
    if (days === undefined || days === null) return 'status-safe'
    if (days > 30) return 'status-safe'
    if (days > 7) return 'status-warn'
    return 'status-danger'
  }

  // 获取/刷新账户列表 (支持手动触发时显示 Toast)
  const loadAccounts = async (isManualAction = false): Promise<void> => {
    if (isRefreshing.value) return
    isRefreshing.value = true
    try {
      accounts.value = await window.api.getAccounts()
      const isLogined = accounts.value.length > 0
      localStorage.setItem('bili-is-logged-in', String(isLogined))
      window.dispatchEvent(new CustomEvent('bili-auth-change', { detail: { isLogined } }))

      if (isManualAction) {
        showToast('账号状态已更新', 'success')
      }
    } catch (error) {
      if (isManualAction) showToast('刷新状态失败', 'error')
      console.error('获取账号列表失败:', error)
    } finally {
      isRefreshing.value = false
    }
  }

  // 处理添加账号
  const handleAddAccount = async (): Promise<void> => {
    if (isAdding.value) return
    isAdding.value = true
    showToast('请在弹出的独立窗口完成扫码', 'success')
    try {
      const res = await window.api.addAccount()
      if (res.success) {
        showToast('登录成功，正在初始化工作台...', 'success')
        await loadAccounts(false)
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        showToast('登录被取消或未成功', 'warn')
      }
    } catch (error) {
      console.error('添加账号异常:', error)
      showToast('发生未知错误', 'error')
    } finally {
      isAdding.value = false
    }
  }

  onMounted((): void => {
    loadAccounts(false)
  })

  return {
    accounts,
    isAdding,
    isRefreshing,
    isDeleting,
    toast,
    deleteModal,
    showToast,
    promptDeleteAccount,
    cancelDelete,
    executeDelete,
    formatDays,
    getDaysColor,
    loadAccounts,
    handleAddAccount
  }
}
