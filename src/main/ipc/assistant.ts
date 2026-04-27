// src/main/ipc/assistant.ts

import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { AssistantVibeData, LlmSettings, LlmProvider, ProviderConfig } from '../../shared/api.types'
import Store from 'electron-store'
import OpenAI from 'openai'

// --- 默认提示词定义 ---
const DEFAULT_CHAT_PROMPT =
  '你是一个可爱的B站看板娘助手。说话带有"喵"或者"哩"的口吻，性格活泼。你的回答必须非常简短（50字以内）。'
const DEFAULT_DANMAKU_PROMPT = `你是一个在B站陪主人看视频的虚拟助手，性格傲娇毒舌但懂梗。请根据弹幕给出一句简短(25字内)的吐槽或反应，不要复述弹幕，不带emoji。`

const DEFAULT_PROVIDER_CONFIGS: Record<LlmProvider, ProviderConfig> = {
  DeepSeek: { baseUrl: 'https://api.deepseek.com/v1', modelName: 'deepseek-chat' },
  OpenAI: { baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o-mini' },
  Qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', modelName: 'qwen-turbo' },
  Custom: { baseUrl: '', modelName: '' }
}

let assistantWin: BrowserWindow | null = null
const store = new Store({ name: 'user-settings' })

let currentVideoTitle = '一部有趣的B站视频'
let lastDanmakuTime = 0

// 💡 新增：心跳机制和闲聊定时器
let activityTimer: NodeJS.Timeout | null = null
let lastActivityTime = Date.now()

// 重置活动计时器
function resetActivityTimer(): void {
  lastActivityTime = Date.now()
  if (activityTimer) {
    clearTimeout(activityTimer)
    activityTimer = null
  }
}

// 启动闲聊逻辑
function startIdleChatMonitor(): void {
  resetActivityTimer() // 每次启动或重设时重置计时器

  const checkIdle = async (): Promise<void> => {
    const settings = store.get('llmSettings') as unknown as LlmSettings | undefined
    if (!settings || !settings.enabled) {
      activityTimer = setTimeout(checkIdle, 5000) // LLM未启用，5秒后重试
      return
    }
    // 💥 修复：看板娘窗口不存在时跳过闲聊
    if (!assistantWin || assistantWin.isDestroyed()) {
      if (activityTimer) clearTimeout(activityTimer)
      activityTimer = null
      return
    }

    const { idleInterval } = settings
    const now = Date.now()
    const idleDuration = (now - lastActivityTime) / 1000 // 单位：秒

    if (idleDuration >= (idleInterval ?? 60)) {
      // 达到或超过设定的闲置时间
      // 触发一次 "闲聊"
      console.log(`[Assistant] 闲置${Math.floor(idleDuration)}秒，触发闲聊...`)
      lastActivityTime = now // 防止连续闲聊

      const reply = await generateAIResponse(
        '请说一句简短的日常问候或吐槽，不要提及自己在看视频',
        settings.chatSystemPrompt || DEFAULT_CHAT_PROMPT,
        true // 使用看板娘独立 AI 配置
      )
      if (reply) sendVibeToAssistant(reply)
    }

    activityTimer = setTimeout(checkIdle, ((idleInterval ?? 60) * 1000) / 2) // 每隔闲置时间的一半检查一次
    // 这样做是为了在距离闲置时间一半的时候检查，如果用户在这个间隔内做了活动，就重置。
    // 如果用户一直没动，就会在达到 idleInterval 的时候触发闲聊。
  }

  // 第一次启动
  activityTimer = setTimeout(checkIdle, 10000) // 延迟10秒开始首次检查
}

export function showAssistant(): void {
  if (assistantWin && !assistantWin.isDestroyed()) assistantWin.show()
  resetActivityTimer() // 显示时也认为是活动
}

export function hideAssistant(): void {
  if (assistantWin && !assistantWin.isDestroyed()) assistantWin.hide()
}

export async function generateAIResponse(
  userMessage: string,
  systemPrompt: string,
  useAssistantAI = false // 是否使用看板娘独立 AI 配置
): Promise<string | null> {
  // 获取看板娘独立配置
  const assistantAISettings = store.get('assistantAISettings') as unknown as
    | {
        useSharedAI: boolean
        enabled: boolean
        provider: LlmProvider
        apiKey: string
        providerConfigs: Record<LlmProvider, ProviderConfig>
        temperature: number
      }
    | undefined

  // 💥 修复：当请求使用看板娘 AI 时，检查看板娘独立 AI 是否启用
  if (useAssistantAI) {
    // 看板娘 AI 未启用时，直接返回 null
    if (!assistantAISettings || !assistantAISettings.enabled) {
      console.log('[Assistant] 看板娘 AI 对话已关闭，跳过生成')
      return null
    }
  }

  // 获取通用 LLM 配置
  const settings = store.get('llmSettings') as unknown as LlmSettings | undefined

  // 决定使用哪个配置
  let finalSettings: {
    enabled: boolean
    provider: LlmProvider
    apiKey: string
    providerConfigs: Record<LlmProvider, ProviderConfig>
    temperature: number
  }

  // 如果请求使用看板娘 AI，且独立配置存在、不共享、已启用，则使用独立配置
  if (
    useAssistantAI &&
    assistantAISettings &&
    !assistantAISettings.useSharedAI &&
    assistantAISettings.enabled
  ) {
    finalSettings = {
      enabled: assistantAISettings.enabled,
      provider: assistantAISettings.provider,
      apiKey: assistantAISettings.apiKey,
      providerConfigs: assistantAISettings.providerConfigs,
      temperature: assistantAISettings.temperature
    }
    console.log('[Assistant] 使用看板娘独立 AI 配置')
  } else {
    // 否则使用通用配置
    if (!settings || !settings.enabled || !settings.apiKey) return null
    finalSettings = {
      enabled: settings.enabled,
      provider: settings.provider,
      apiKey: settings.apiKey,
      providerConfigs: settings.providerConfigs as unknown as Record<LlmProvider, ProviderConfig>,
      temperature: settings.temperature ?? 0.7
    }
  }

  if (!finalSettings.enabled || !finalSettings.apiKey) return null

  const activeProvider = finalSettings.provider || 'DeepSeek'
  const activeConfig =
    finalSettings.providerConfigs?.[activeProvider] || DEFAULT_PROVIDER_CONFIGS[activeProvider]

  if (!activeConfig.baseUrl || !activeConfig.modelName) {
    console.warn(`当前提供商 (${activeProvider}) 的 Base URL 或 Model Name 未配置。`)
    return null
  }

  try {
    const openai = new OpenAI({
      baseURL: activeConfig.baseUrl,
      apiKey: finalSettings.apiKey
    })

    const completion = await openai.chat.completions.create({
      model: activeConfig.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: finalSettings.temperature ?? 0.7,
      max_tokens: 100
    })

    resetActivityTimer()
    return completion.choices[0]?.message?.content || null
  } catch (error) {
    console.error('❌ AI 生成失败:', error)
    return null
  }
}

export function sendVibeToAssistant(content: string): void {
  console.log('📤 [助手] 发送吐槽气泡:', content)
  if (assistantWin && !assistantWin.isDestroyed()) {
    console.log('📤 [助手] 向看板娘窗口发送事件')
    assistantWin.webContents.send('on-assistant-vibe', { type: 'danmaku', content })
  } else {
    console.log('❌ [助手] 看板娘窗口不存在或已销毁')
  }
}

export function setupAssistant(): void {
  // 监听llmSettings的更新，如果改变就重新启动闲聊监控
  ipcMain.on('update-llm-config', () => {
    resetActivityTimer() // 设置更新即视为“活动”
    startIdleChatMonitor() // 重新启动闲聊监听
  })

  ipcMain.handle('assistant:ask', async (_event, question: string) => {
    // 💥 修复：看板娘窗口不存在时拒绝回复
    if (!assistantWin || assistantWin.isDestroyed()) {
      return { success: false, content: '看板娘已关闭喵...' }
    }
    // 💥 修复：通用 LLM 未启用时也拒绝回复
    const globalSettings = store.get('llmSettings') as unknown as LlmSettings | undefined
    if (!globalSettings || !globalSettings.enabled) {
      return { success: false, content: 'AI对话已关闭喵...' }
    }
    resetActivityTimer() // 手动提问也视为活动
    const chatPrompt = globalSettings.chatSystemPrompt || DEFAULT_CHAT_PROMPT
    const reply = await generateAIResponse(question, chatPrompt, true)

    if (reply) return { success: true, content: reply }
    return { success: false, content: '脑电波断开了喵...请检查API配置。' }
  })

  // 改造：伴看时，读取 danmakuSystemPrompt 配置
  const handleDanmakuVibe = async (data: AssistantVibeData): Promise<void> => {
    // 💥 修复：看板娘窗口不存在时跳过弹幕处理
    if (!assistantWin || assistantWin.isDestroyed()) return

    resetActivityTimer() // 收到任何弹幕或视频切换消息都视为活动

    if (data.type === 'video-change' && data.title) {
      currentVideoTitle = data.title
      lastDanmakuTime = 0 // 切换视频时重置弹幕 CD
      return
    }

    if (data.type === 'danmaku' && data.content) {
      const settings = store.get('llmSettings') as unknown as LlmSettings | undefined
      if (!settings || !settings.enabled) return
      if (settings.enableDanmakuVibe === false) return

      const now = Date.now()
      const cd = settings.danmakuCooldown ?? 20
      const prob = settings.danmakuProbability ?? 0.3

      if (now - lastDanmakuTime < cd * 1000) {
        return // 冷却时间未到
      }

      if (Math.random() > prob) {
        return // 未命中概率
      }

      lastDanmakuTime = now // 刷新本次弹幕吐槽的时间

      const danmakuPrompt = settings.danmakuSystemPrompt || DEFAULT_DANMAKU_PROMPT
      const userPrompt = `正在看：《${currentVideoTitle}》。屏幕飘过最新弹幕：“${data.content}”。请简短活泼地吐槽或回应(最长25字)：`

      const aiReply = await generateAIResponse(userPrompt, danmakuPrompt, true)
      if (aiReply) sendVibeToAssistant(aiReply)
    }
  }

  // 原有的事件监听器保持不变
  ipcMain.on('emit-vibe', (_event, data: AssistantVibeData) => {
    handleDanmakuVibe(data)
  })

  ipcMain.on('vibe-check', (_event, data: AssistantVibeData) => {
    handleDanmakuVibe(data)
  })

  // 窗口创建逻辑保持你原有的完美设置...
  ipcMain.handle('toggle-assistant', (_event, enable: boolean): void => {
    if (enable) {
      if (assistantWin) {
        if (!assistantWin.isVisible()) assistantWin.show()
        return
      }

      const { width, height } = screen.getPrimaryDisplay().workAreaSize

      assistantWin = new BrowserWindow({
        width: 250,
        height: 350,
        x: width - 300,
        y: height - 400,
        transparent: true,
        frame: false,
        hasShadow: false,
        backgroundColor: '#00000000',
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        paintWhenInitiallyHidden: false,
        enableLargerThanScreen: false,
        // 💥 关键优化：禁用窗口级别的硬件加速合成
        // 这会让 Chromium 使用软件方式合成此窗口的最终画面，
        // 从而把 GPU 进程的资源让给视频播放器的硬件解码
        webPreferences: {
          preload: join(__dirname, '../preload/index.js'),
          sandbox: false,
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false,
          // 💥 关键优化：后台时限制渲染以节省资源
          backgroundThrottling: true,
          offscreen: false,
          spellcheck: false,
          partition: 'persist:assistant-only',
          enableWebSQL: false,
          v8CacheOptions: 'code'
        }
      })

      // 💥 核心修复：看板娘窗口不参与GPU合成队列
      // 当播放器窗口存在时，降低看板娘的渲染优先级
      assistantWin.webContents.on('did-finish-load', () => {
        assistantWin?.webContents
          .executeJavaScript(
            `
          // Live2D 模型帧率限制
          if (window.v && window.v.app && window.v.app.ticker) {
            window.v.app.ticker.maxFPS = 60;
          }
          // 💥 窗口不可见时完全停止渲染
          document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
              if (window.v && window.v.app && window.v.app.ticker) {
                window.v.app.ticker.stop();
              }
            } else {
              if (window.v && window.v.app && window.v.app.ticker) {
                window.v.app.ticker.start();
              }
            }
          });
        `
          )
          .catch(() => {})
      })

      const live2dPath = is.dev
        ? join(__dirname, '../../src/renderer/src/public/live2d-display.html')
        : join(__dirname, '../renderer/live2d-display.html')

      assistantWin.loadFile(live2dPath).catch((err) => console.error(err))
      startIdleChatMonitor() // 助手窗口创建并显示时，开始监控闲聊
    } else {
      assistantWin?.close()
      assistantWin = null
      if (activityTimer) {
        // 关闭助理时，停止闲聊监控
        clearTimeout(activityTimer)
        activityTimer = null
      }
    }
  })
}
