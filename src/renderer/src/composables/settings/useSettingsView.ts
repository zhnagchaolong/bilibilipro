import { ref, onMounted, computed, watch } from 'vue'
import type { LlmSettings, LlmProvider, ProviderConfig } from '../../../../shared/api.types'
import { useDropdown } from '../../composables/useDropdown'

export function useSettingsView() {
  const { activeSelectId, toggleSelect } = useDropdown()

  // ================= 系统基础配置 =================
  const customTheme = ref({ primaryColor: localStorage.getItem('bili-primary-color') || '#00aeec' })
  const themeMode = ref(localStorage.getItem('bili-theme-mode') || 'auto')
  const netBlocker = ref(localStorage.getItem('bili-net-blocker') === 'true')
  const alwaysOnTop = ref(localStorage.getItem('bili-always-on-top') === 'true')
  const closeAction = ref(localStorage.getItem('bili-close-action') || 'ask')
  const openAtLogin = ref(localStorage.getItem('bili-open-at-login') === 'true')
  const hwAcceleration = ref(localStorage.getItem('bili-hw-accel') !== 'false')

  const isAssistantVisible = ref(localStorage.getItem('bili-assistant-visible') === 'true')

  const showResetModal = ref(false)
  const toastMsg = ref('')
  const showToast = ref(false)
  let toastTimer: ReturnType<typeof setTimeout>

  const getThemeLabel = (val: string): string =>
    ({ auto: '跟随系统', light: '极光白', dark: '暗夜黑' })[val] || '跟随系统'
  const getActionLabel = (val: string): string =>
    ({ ask: '每次询问', minimize: '缩进系统托盘', quit: '彻底退出程序' })[val] || '每次询问'

  // ================= AI 配置 =================
  const getDefaultProviderConfigs = (): LlmSettings['providerConfigs'] => {
    return {
      DeepSeek: { baseUrl: 'https://api.deepseek.com/v1', modelName: 'deepseek-chat' },
      OpenAI: { baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o-mini' },
      Qwen: {
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        modelName: 'qwen-turbo'
      },
      Custom: { baseUrl: '', modelName: '' }
    } as unknown as LlmSettings['providerConfigs']
  }

  const llmSettings = ref<LlmSettings>({
    enabled: localStorage.getItem('bili-llm-enabled') === 'true',
    provider: (localStorage.getItem('bili-llm-provider') as LlmProvider) || 'DeepSeek',
    apiKey: localStorage.getItem('bili-llm-apikey') || '',
    providerConfigs: getDefaultProviderConfigs(),
    temperature: Number(localStorage.getItem('bili-llm-temp')) || 0.7,
    chatSystemPrompt: localStorage.getItem('bili-llm-chat-prompt') || '',
    danmakuSystemPrompt: localStorage.getItem('bili-llm-danmaku-prompt') || '',
    idleInterval: Number(localStorage.getItem('bili-ai-idle-interval')) || 60,
    enableDanmakuVibe: localStorage.getItem('bili-ai-danmaku-vibe') !== 'false',
    danmakuProbability: Number(localStorage.getItem('bili-ai-danmaku-prob')) || 0.3,
    danmakuCooldown: Number(localStorage.getItem('bili-ai-danmaku-cool')) || 20
  })

  const assistantAISettings = ref({
    useSharedAI: localStorage.getItem('bili-assistant-use-shared') !== 'false',
    enabled: localStorage.getItem('bili-assistant-enabled') === 'true',
    provider: (localStorage.getItem('bili-assistant-provider') as LlmProvider) || 'DeepSeek',
    apiKey: localStorage.getItem('bili-assistant-apikey') || '',
    providerConfigs: getDefaultProviderConfigs(),
    temperature: Number(localStorage.getItem('bili-assistant-temp')) || 0.9
  })

  const copyAIToAssistant = (): void => {
    assistantAISettings.value.provider = llmSettings.value.provider
    assistantAISettings.value.apiKey = llmSettings.value.apiKey
    assistantAISettings.value.providerConfigs = JSON.parse(
      JSON.stringify(llmSettings.value.providerConfigs)
    )
    assistantAISettings.value.temperature = llmSettings.value.temperature
    triggerToast('✅ 已复制 AI 设置到看板娘')
  }

  const currentProviderConfig = computed({
    get: () =>
      (llmSettings.value.providerConfigs as unknown as Record<string, ProviderConfig>)[
        llmSettings.value.provider
      ],
    set: (val: ProviderConfig) => {
      ;(llmSettings.value.providerConfigs as unknown as Record<string, ProviderConfig>)[
        llmSettings.value.provider
      ] = val
    }
  })

  const setLlmProvider = (provider: LlmProvider): void => {
    llmSettings.value.provider = provider
    triggerToast(`已切换至 ${provider} 预设模板`)
  }

  const triggerToast = (msg: string): void => {
    toastMsg.value = msg
    showToast.value = true
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      showToast.value = false
    }, 3000)
  }

  const handleToggleAssistant = async (): Promise<void> => {
    localStorage.setItem('bili-assistant-visible', String(isAssistantVisible.value))
    localStorage.setItem(
      'bili-assistant-ai-enabled',
      String(isAssistantVisible.value && llmSettings.value.enabled)
    )
    if (window.api && window.api.toggleAssistant) {
      await window.api.toggleAssistant(isAssistantVisible.value)
      triggerToast(isAssistantVisible.value ? '✨ 看板娘已传送到桌面！' : '💤 看板娘已返回休息舱')
    }
  }

  const applyThemeColor = (): void => {
    const color = customTheme.value.primaryColor
    document.documentElement.style.setProperty('--primary-color', color)
    localStorage.setItem('bili-primary-color', color)
    triggerToast('主色调已更新')
  }

  const applyThemeMode = (): void => {
    let mode = themeMode.value
    if (mode === 'auto') {
      mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    document.documentElement.setAttribute('data-theme', mode)
  }

  const saveBasicSettings = (): void => {
    localStorage.setItem('bili-theme-mode', themeMode.value)
    localStorage.setItem('bili-net-blocker', String(netBlocker.value))
    localStorage.setItem('bili-always-on-top', String(alwaysOnTop.value))
    localStorage.setItem('bili-close-action', closeAction.value)
    localStorage.setItem('bili-open-at-login', String(openAtLogin.value))
    localStorage.setItem('bili-hw-accel', String(hwAcceleration.value))

    applyThemeMode()

    if (window.api) {
      window.api.toggleAlwaysOnTop(alwaysOnTop.value)
      window.api.toggleAutoStart(openAtLogin.value)
      window.api.toggleNetworkBlocker(netBlocker.value)
    }
    triggerToast('基础设置已保存并生效')
  }

  const selectThemeMode = (mode: string): void => {
    themeMode.value = mode
    saveBasicSettings()
    activeSelectId.value = null
  }

  const selectCloseAction = (action: string): void => {
    closeAction.value = action
    saveBasicSettings()
    activeSelectId.value = null

    const backendAction = action === 'minimize' ? 'tray' : action
    const strictApi = window.api as unknown as { updateCloseAction?: (action: string) => void }
    if (strictApi && typeof strictApi.updateCloseAction === 'function') {
      strictApi.updateCloseAction(backendAction)
    }
  }

  watch(
    llmSettings,
    async (newVal) => {
      localStorage.setItem('bili-llm-enabled', String(newVal.enabled))
      localStorage.setItem('bili-llm-provider', newVal.provider)
      localStorage.setItem('bili-llm-apikey', newVal.apiKey)
      localStorage.setItem('bili-llm-temp', String(newVal.temperature))
      localStorage.setItem('bili-llm-chat-prompt', newVal.chatSystemPrompt || '')
      localStorage.setItem('bili-llm-danmaku-prompt', newVal.danmakuSystemPrompt || '')
      localStorage.setItem('bili-ai-idle-interval', String(newVal.idleInterval))
      localStorage.setItem('bili-ai-danmaku-vibe', String(newVal.enableDanmakuVibe))
      localStorage.setItem('bili-ai-danmaku-prob', String(newVal.danmakuProbability))
      localStorage.setItem('bili-ai-danmaku-cool', String(newVal.danmakuCooldown))

      if (window.api && window.api.saveLLMSettings) {
        await window.api.saveLLMSettings(JSON.parse(JSON.stringify(newVal)))
        if (window.api.updateLlmConfig) {
          window.api.updateLlmConfig(JSON.parse(JSON.stringify(newVal)))
        }
      }
    },
    { deep: true }
  )

  watch(
    assistantAISettings,
    async (newVal) => {
      localStorage.setItem('bili-assistant-use-shared', String(newVal.useSharedAI))
      localStorage.setItem('bili-assistant-enabled', String(newVal.enabled))
      localStorage.setItem('bili-assistant-provider', newVal.provider)
      localStorage.setItem('bili-assistant-apikey', newVal.apiKey)
      localStorage.setItem('bili-assistant-temp', String(newVal.temperature))

      if (window.api && window.api.saveAssistantAISettings) {
        await window.api.saveAssistantAISettings(JSON.parse(JSON.stringify(newVal)))
      }
    },
    { deep: true }
  )

  const clearCache = async (): Promise<void> => {
    if (window.api && window.api.clearAllCookies) {
      const success = await window.api.clearAllCookies()
      if (success) {
        showResetModal.value = false
        triggerToast('内核缓存与凭证已彻底清除')
        setTimeout(() => window.location.reload(), 1500)
      } else {
        triggerToast('清理失败，请检查文件权限')
      }
    }
  }

  onMounted(async () => {
    const localEnabled = localStorage.getItem('bili-llm-enabled') === 'true'
    const localProvider = localStorage.getItem('bili-llm-provider') as LlmProvider
    const localApiKey = localStorage.getItem('bili-llm-apikey') || ''
    const localTemp = Number(localStorage.getItem('bili-llm-temp'))
    const localChatPrompt = localStorage.getItem('bili-llm-chat-prompt') || ''
    const localDanmakuPrompt = localStorage.getItem('bili-llm-danmaku-prompt') || ''

    if (localEnabled !== null) llmSettings.value.enabled = localEnabled
    if (localProvider) llmSettings.value.provider = localProvider
    if (localApiKey) llmSettings.value.apiKey = localApiKey
    if (localTemp) llmSettings.value.temperature = localTemp
    if (localChatPrompt) llmSettings.value.chatSystemPrompt = localChatPrompt
    if (localDanmakuPrompt) llmSettings.value.danmakuSystemPrompt = localDanmakuPrompt
    const localDanmakuVibe = localStorage.getItem('bili-ai-danmaku-vibe')
    if (localDanmakuVibe !== null) llmSettings.value.enableDanmakuVibe = localDanmakuVibe === 'true'

    const localUseShared = localStorage.getItem('bili-assistant-use-shared')
    const localAssistantEnabled = localStorage.getItem('bili-assistant-enabled') === 'true'
    const localAssistantProvider = localStorage.getItem('bili-assistant-provider') as LlmProvider
    const localAssistantApiKey = localStorage.getItem('bili-assistant-apikey') || ''
    const localAssistantTemp = Number(localStorage.getItem('bili-assistant-temp'))

    if (localUseShared !== null) assistantAISettings.value.useSharedAI = localUseShared !== 'false'
    if (localAssistantEnabled !== null) assistantAISettings.value.enabled = localAssistantEnabled
    if (localAssistantProvider) assistantAISettings.value.provider = localAssistantProvider
    if (localAssistantApiKey) assistantAISettings.value.apiKey = localAssistantApiKey
    if (localAssistantTemp) assistantAISettings.value.temperature = localAssistantTemp

    if (window.api && window.api.getLLMSettings) {
      try {
        const savedLlm = await window.api.getLLMSettings()
        if (savedLlm) {
          llmSettings.value = {
            ...llmSettings.value,
            ...savedLlm,
            providerConfigs: {
              ...getDefaultProviderConfigs(),
              ...(savedLlm.providerConfigs || {})
            },
            idleInterval: savedLlm.idleInterval ?? llmSettings.value.idleInterval,
            enableDanmakuVibe: savedLlm.enableDanmakuVibe ?? llmSettings.value.enableDanmakuVibe,
            danmakuProbability: savedLlm.danmakuProbability ?? llmSettings.value.danmakuProbability,
            danmakuCooldown: savedLlm.danmakuCooldown ?? llmSettings.value.danmakuCooldown
          }
        }
      } catch (e) {
        console.warn('从主进程加载 LLM 设置失败，使用 localStorage', e)
      }
    }

    if (window.api && window.api.getAssistantAISettings) {
      try {
        const savedAssistantAI = await window.api.getAssistantAISettings()
        if (savedAssistantAI) {
          assistantAISettings.value = {
            ...assistantAISettings.value,
            ...savedAssistantAI,
            providerConfigs: {
              ...getDefaultProviderConfigs(),
              ...((savedAssistantAI as { providerConfigs?: Record<string, unknown> })
                .providerConfigs || {})
            }
          }
        }
      } catch (e) {
        console.warn('从主进程加载看板娘 AI 设置失败，使用 localStorage', e)
      }
    }

    applyThemeMode()
    applyThemeColor()
  })

  return {
    customTheme,
    themeMode,
    netBlocker,
    alwaysOnTop,
    closeAction,
    openAtLogin,
    hwAcceleration,
    isAssistantVisible,
    showResetModal,
    toastMsg,
    showToast,
    activeSelectId,
    toggleSelect,
    getThemeLabel,
    getActionLabel,
    llmSettings,
    assistantAISettings,
    copyAIToAssistant,
    currentProviderConfig,
    setLlmProvider,
    triggerToast,
    handleToggleAssistant,
    applyThemeColor,
    applyThemeMode,
    saveBasicSettings,
    selectThemeMode,
    selectCloseAction,
    clearCache
  }
}
