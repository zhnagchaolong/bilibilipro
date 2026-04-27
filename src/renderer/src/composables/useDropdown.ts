import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 自定义下拉菜单全局状态管理
 * 提取自 TasksView / DownloaderView / SettingsView 中重复的下拉菜单逻辑
 */
export function useDropdown() {
  const activeSelectId = ref<string | null>(null)

  const toggleSelect = (id: string): void => {
    activeSelectId.value = activeSelectId.value === id ? null : id
  }

  const closeDropdown = (): void => {
    activeSelectId.value = null
  }

  const handleGlobalClick = (): void => {
    closeDropdown()
  }

  onMounted(() => {
    document.addEventListener('click', handleGlobalClick)
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleGlobalClick)
  })

  return { activeSelectId, toggleSelect, closeDropdown }
}
