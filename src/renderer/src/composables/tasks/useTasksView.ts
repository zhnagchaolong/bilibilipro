import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { BiliAccount } from '../../../../shared/api.types'
import { useDropdown } from '../../composables/useDropdown'

export interface TaskConfig {
  dailySign: boolean
  watchVideo: boolean
  shareVideo: boolean
  silverToCoin: boolean
  autoCoin: boolean
  mangaSign: boolean
  targetAccounts: string[]
  videoStrategy: 'rank' | 'partition' | 'keyword' | 'custom'
  videoTargetValue: string
  watchVideoCount: number
  watchTimeStrategy: 'random' | 'percentage' | 'fixed'
  watchTimeRandomValue: string
  watchTimePercentage: number
  watchTimeFixed: number
  coinTarget: number
  autoLottery: boolean
  lotteryWord: string
  lotteryMaxCount: number
}

export function useTasksView() {
  const { activeSelectId, toggleSelect } = useDropdown()

  const cronTime = ref(localStorage.getItem('bili-cron-time') || '')
  const isCronEnabled = ref(localStorage.getItem('bili-cron-enabled') === 'true')
  const isLoggedIn = ref(localStorage.getItem('bili-is-logged-in') === 'true')
  const accounts = ref<BiliAccount[]>([])

  const getStrategyLabel = (value: string): string => {
    const options: Record<string, string> = {
      rank: '默认排行榜公海 (有效率高)',
      partition: '使用指定分区ID作为样本点',
      keyword: '以指定的内容关键词检索抓取',
      custom: '针对固定的视频BVID一直刷'
    }
    return options[value] || ''
  }

  const getWatchTimeLabel = (value: string): string => {
    const options: Record<string, string> = {
      random: '随机秒区间防风控机制',
      percentage: '基于原片比例推演时长',
      fixed: '生硬但起步轻的固定数值'
    }
    return options[value] || ''
  }

  const defaultTaskConfig: TaskConfig = {
    dailySign: true,
    watchVideo: true,
    shareVideo: true,
    silverToCoin: false,
    autoCoin: true,
    mangaSign: true,
    targetAccounts: [],
    videoStrategy: 'rank',
    videoTargetValue: '',
    watchVideoCount: 1,
    watchTimeStrategy: 'random',
    watchTimeRandomValue: '15,45',
    watchTimePercentage: 40,
    watchTimeFixed: 15,
    coinTarget: 5,
    autoLottery: false,
    lotteryWord: '互动抽奖',
    lotteryMaxCount: 2
  }

  const savedConfig = localStorage.getItem('bili-task-config')
  const taskConfig = ref<TaskConfig>({
    ...defaultTaskConfig,
    ...(savedConfig ? JSON.parse(savedConfig) : {})
  })
  if (!taskConfig.value.targetAccounts) taskConfig.value.targetAccounts = []

  const isRunning = ref(false)
  const logs = ref<string[]>([])
  const terminalRef = ref<HTMLElement | null>(null)

  const sanitizeNumberInput = (
    event: Event,
    min: number,
    max: number,
    updateFn: (val: number) => void
  ): void => {
    const input = event.target as HTMLInputElement
    if (input.value === '') {
      return
    }
    let value = parseInt(input.value, 10)
    if (isNaN(value)) {
      value = min
    }
    if (value < min) value = min
    if (value > max) value = max
    if (value !== parseFloat(input.value)) {
      input.value = String(value)
    }
    updateFn(value)
  }

  const appendLog = (msg: string): void => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    logs.value.push(`[${time}] ${msg}`)
    nextTick(() => {
      if (terminalRef.value) {
        terminalRef.value.scrollTop = terminalRef.value.scrollHeight
      }
    })
  }

  const clearLogs = (): void => {
    logs.value = []
  }

  const notifyChange = (param: string): void => {
    appendLog(`✅ [配置] 参数 "${param}" 已更新。`)
  }

  const applyCron = async (isSilent: boolean = false): Promise<void> => {
    if (!isLoggedIn.value) return
    if (isCronEnabled.value && !cronTime.value) {
      if (!isSilent) appendLog(`❌ [定时任务] 开启失败，请先设定执行时间。`)
      isCronEnabled.value = false
      return
    }
    localStorage.setItem('bili-cron-time', cronTime.value)
    localStorage.setItem('bili-cron-enabled', String(isCronEnabled.value))
    localStorage.setItem('bili-task-config', JSON.stringify(taskConfig.value))
    const rawConfig = JSON.parse(JSON.stringify(taskConfig.value))
    const effectiveTime = isCronEnabled.value ? cronTime.value : ''
    await window.api.setupCron(effectiveTime, rawConfig)
    if (!isSilent) {
      if (isCronEnabled.value) appendLog(`⏰ [定时任务] 已启用，每日 ${effectiveTime} 将自动执行。`)
      else appendLog(`🛑 [定时任务] 已停用。`)
    }
  }

  const handleTimeChange = (): void => {
    if (isCronEnabled.value) applyCron(false)
    else localStorage.setItem('bili-cron-time', cronTime.value)
  }

  watch(
    taskConfig,
    () => {
      if (!isLoggedIn.value) return
      localStorage.setItem('bili-task-config', JSON.stringify(taskConfig.value))
      if (isCronEnabled.value && cronTime.value) applyCron(true)
    },
    { deep: true }
  )

  const handleStartTasks = async (): Promise<void> => {
    if (!isLoggedIn.value) return
    if (isRunning.value) return
    clearLogs()
    isRunning.value = true
    appendLog('🚀 [任务执行] 开始调度和执行自动化模块...')
    if (taskConfig.value.targetAccounts.length === 0) {
      appendLog('⚠️ [任务执行] 警告：没有选中执行对象，任务终止。')
      isRunning.value = false
      return
    }
    try {
      const rawConfig = JSON.parse(JSON.stringify(taskConfig.value))
      await window.api.runTasks(rawConfig)
    } catch (error) {
      appendLog(`❌ [通信错误] 主控进程失联: ${String(error)}`)
    } finally {
      isRunning.value = false
    }
  }

  const fetchAccountsData = async (): Promise<void> => {
    try {
      accounts.value = await window.api.getAccounts()
      if (accounts.value.length > 0 && taskConfig.value.targetAccounts.length === 0) {
        taskConfig.value.targetAccounts = accounts.value.map((a) => a.partition)
      } else {
        taskConfig.value.targetAccounts = taskConfig.value.targetAccounts.filter((p) =>
          accounts.value.some((a) => a.partition === p)
        )
      }
    } catch (error) {
      appendLog(`⚠️ [数据加载] 获取账号列表失败: ${String(error)}`)
    }
  }

  const handleAuthChange = (e: Event): void => {
    const detail = (e as CustomEvent).detail
    isLoggedIn.value = detail.isLogined
    if (isLoggedIn.value) {
      appendLog('🔓 [系统] 权限通过，已解锁。')
      fetchAccountsData()
    } else {
      isRunning.value = false
      isCronEnabled.value = false
      applyCron(true)
      appendLog('🔒 [系统] 未检测到登录状态，面板已重新上锁。')
    }
  }

  onMounted(() => {
    if (window.api?.onTaskLog) window.api.onTaskLog((msg: string) => appendLog(msg))
    window.addEventListener('bili-auth-change', handleAuthChange)
    if (isLoggedIn.value) {
      fetchAccountsData().then(() => applyCron(true))
    }
  })

  onUnmounted(() => {
    window.removeEventListener('bili-auth-change', handleAuthChange)
  })

  return {
    cronTime,
    isCronEnabled,
    isLoggedIn,
    accounts,
    activeSelectId,
    toggleSelect,
    getStrategyLabel,
    getWatchTimeLabel,
    taskConfig,
    isRunning,
    logs,
    terminalRef,
    sanitizeNumberInput,
    appendLog,
    clearLogs,
    notifyChange,
    applyCron,
    handleTimeChange,
    handleStartTasks,
    fetchAccountsData
  }
}
