// shared/api.types.ts

export interface BaseResponse {
  success: boolean
  message?: string
}

export interface BiliAccount {
  uid: string
  name: string
  face: string
  partition: string
  daysRemaining?: number
  level?: number
  coins?: number
  isVip?: boolean
}

export interface AddAccountResult extends BaseResponse {
  account?: BiliAccount
}

export type LlmProvider = 'DeepSeek' | 'OpenAI' | 'Qwen' | 'Custom' // 确保类型准确

// 定义每个提供商的独立配置
export interface ProviderConfig {
  baseUrl: string
  modelName: string
}

export interface LlmSettings {
  enabled: boolean
  provider: LlmProvider // 当前活动提供商
  apiKey: string
  // 👇 新增：存储每个提供商的独立配置
  providerConfigs: {
    DeepSeek: { baseUrl: 'https://api.deepseek.com/'; modelName: 'deepseek-chat' }
    OpenAI: { baseUrl: 'https://api.openai.com/'; modelName: 'gpt-3.5-turbo' }
    Qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/'; modelName: 'qwen-turbo' }
    Custom: { baseUrl: ''; modelName: '' }
  }
  temperature: number
  chatSystemPrompt?: string
  danmakuSystemPrompt?: string
  idleInterval: number // 闲聊间隔
  enableDanmakuVibe?: boolean // 是否开启弹幕吐槽
  danmakuProbability: number // 吐槽概率
  danmakuCooldown: number // 吐槽冷却
}

export type AssistantVibeType = 'danmaku' | 'video-change' | 'subtitle'

export interface AssistantVibeData {
  type: AssistantVibeType
  title?: string
  content?: string
}

// 🌟 为 Dashboard 的复杂数据建立标准类型
export interface DashboardData {
  coins?: number
  bcoins?: number
  isVip?: boolean
  level?: number
  expPercent?: number
  fans?: number
  following?: number
  dynamic?: number
  likes?: number
  archiveViews?: number
  articleViews?: number
  name?: string
  face?: string
  sign?: string
  archiveCount?: number
  verifyType?: number
  verifyDesc?: string
  liveStatus?: boolean
  title?: string
  cover?: string
  ownerName?: string
  pubdate?: number
  views?: number
  danmaku?: number
  share?: number
  coinMax?: number
  favorite?: number
  replyCount?: number
  durationSec?: number
  highestRank?: number
  activeHistoryCount?: number
  timeConsumedSec?: number
  userTags?: string[]
  pieDataRaw?: string
  favoriteUpsRaw?: string
}

// 🌟 为解析视频建立标准类型
export interface ParseVideoData {
  title: string
  pic: string
  audioUrl: string
  audioBandwidth: number
  qualities: { id: number; label: string; url: string; bandwidth?: number }[]
  pages: { cid: number; page: number; part: string }[]
}
