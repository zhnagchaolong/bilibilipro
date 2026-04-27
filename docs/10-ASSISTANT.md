# AI 看板娘 (Assistant) 模块技术文档

---

## 1. 架构概览

```
主渲染进程 (主窗口)                    主进程 (Main)                    看板娘窗口 (Assistant)
     │                                      │                                  │
     │  window.api.emitVibe(data)           │                                  │
     │ ──────────────send─────────────────> │                                  │
     │                                      │  ipcMain.on('vibe-check')        │
     │                                      │  ────────> assistantWindow       │
     │                                      │     .webContents.send()          │
     │                                      │     ('on-assistant-vibe', data)  │
     │                                      │                                  │
     │                                      │ <──────── 鼠标坐标 (150ms)        │
     │                                      │  webContents.sendInputEvent()    │
     │                                      │                                  │
     │  window.api.assistantAsk(q)          │                                  │
     │ ───────────invoke──────────────────> │                                  │
     │                                      │  openai SDK 调用                 │
     │ <────────── 返回回答 ─────────────── │                                  │
```

---

## 2. 看板娘窗口配置

```typescript
// src/main/ipc/assistant.ts
const assistantWindow = new BrowserWindow({
  width: 250,
  height: 350,
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: false,
  hasShadow: false,
  roundedCorners: false,
  webPreferences: {
    partition: 'persist:assistant-only',  // 完全独立的 Session
    preload: join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    backgroundThrottling: false
  }
})
```

---

## 3. 鼠标追踪与转头

主进程以 **150ms** 间隔获取全局鼠标坐标，计算相对看板娘窗口中心的偏移量，注入到 Live2D 内部：

```typescript
// src/main/ipc/assistant.ts
setInterval(() => {
  const mousePos = screen.getCursorScreenPoint()
  const winBounds = assistantWindow.getBounds()

  // 计算鼠标相对于窗口中心的偏移
  const relX = mousePos.x - (winBounds.x + winBounds.width / 2)
  const relY = mousePos.y - (winBounds.y + winBounds.height / 2)

  // 归一化到 [-1, 1]
  const normX = Math.max(-1, Math.min(1, relX / 300))
  const normY = Math.max(-1, Math.min(1, relY / 300))

  // 注入到 Live2D
  assistantWindow.webContents.executeJavaScript(`
    if (window.Live2DFramework) {
      window.Live2DFramework.pointerX = ${normX};
      window.Live2DFramework.pointerY = ${normY};
    }
  `)
}, 150)
```

---

## 4. 情感数据 (Vibe) 系统

### 4.1 Vibe 类型

```typescript
type AssistantVibeType = 'danmaku' | 'video-change' | 'subtitle'

interface AssistantVibeData {
  type: AssistantVibeType
  title?: string      // video-change 时传递
  content?: string    // danmaku / subtitle 时传递
}
```

### 4.2 数据来源

| 来源 | 触发条件 | 频率 |
|------|---------|------|
| 视频切换 | `__BILI_TITLE__` 消息 | 每次切换 |
| 弹幕吐槽 | `__BILI_DANMAKU__` 消息 | 按概率 + 冷却 |
| 字幕变化 | `__BILI_SUBTITLE__` 消息 | 每 3 秒最多一次 |
| 伴看模式 | 悬浮播放器每 30s 抓取 | 30 秒间隔 |

### 4.3 弹幕吐槽概率控制

```typescript
// 配置项（Settings 中可调）
const danmakuProbability = ref(0.3)   // 30% 概率触发
const danmakuCooldown = ref(10)       // 10 秒冷却

// 实际逻辑
let lastDanmakuTime = 0
if (Date.now() - lastDanmakuTime > danmakuCooldown * 1000) {
  if (Math.random() < danmakuProbability) {
    window.api.emitVibe({ type: 'danmaku', content: text })
    lastDanmakuTime = Date.now()
  }
}
```

---

## 5. LLM 集成

### 5.1 配置结构

```typescript
interface LlmSettings {
  enabled: boolean
  provider: 'DeepSeek' | 'OpenAI' | 'Qwen' | 'Custom'
  apiKey: string
  providerConfigs: {
    DeepSeek: { baseUrl: 'https://api.deepseek.com/'; modelName: 'deepseek-chat' }
    OpenAI:   { baseUrl: 'https://api.openai.com/'; modelName: 'gpt-3.5-turbo' }
    Qwen:     { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/'; modelName: 'qwen-turbo' }
    Custom:   { baseUrl: ''; modelName: '' }
  }
  temperature: number
  chatSystemPrompt?: string
  danmakuSystemPrompt?: string
  idleInterval: number       // 闲聊间隔（秒）
  danmakuProbability: number // 吐槽概率（0-1）
  danmakuCooldown: number    // 吐槽冷却（秒）
}
```

### 5.2 LLM 调用实现

```typescript
// src/main/ipc/assistant.ts
import OpenAI from 'openai'

async function chatWithLLM(question: string, settings: LlmSettings): Promise<string> {
  const config = settings.providerConfigs[settings.provider]

  const client = new OpenAI({
    apiKey: settings.apiKey,
    baseURL: config.baseUrl,
    dangerouslyAllowBrowser: true
  })

  const response = await client.chat.completions.create({
    model: config.modelName,
    messages: [
      { role: 'system', content: settings.chatSystemPrompt || '你是一个可爱的看板娘...' },
      { role: 'user', content: question }
    ],
    temperature: settings.temperature
  })

  return response.choices[0].message.content || ''
}
```

### 5.3 双 AI 配置

- **全局 LLM 配置**：用于通用对话、看板娘闲聊
- **看板娘独立 AI 配置**：可单独设置提供商、API Key、系统提示词

---

## 6. 闲置闲聊引擎

```typescript
let idleTimer: ReturnType<typeof setTimeout> | null = null

const startIdleChat = (): void => {
  const interval = (assistantAISettings.value?.idleInterval || 60) * 1000

  idleTimer = setTimeout(async () => {
    const prompts = [
      '主人在干什么呢？',
      '好无聊呀，陪我聊聊天吧~',
      '今天想看什么视频呢？',
      // ...
    ]
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)]

    const reply = await chatWithLLM(randomPrompt, settings)
    showBubble(reply)

    startIdleChat()  // 递归触发下一次
  }, interval)
}
```

---

## 7. Live2D 渲染

### 7.1 技术栈

- **PixiJS 7.2.4**：2D 渲染引擎
- **pixi-live2d-display**：Live2D Cubism 3 渲染适配器
- **Cubism 3 Core**：Live2D 官方运行时

### 7.2 模型资源

```
src/renderer/src/public/model/
└── Azue Lane(JP)/           # 碧蓝航线角色模型
    ├── lafei/               # 拉菲
    ├── lingbo/              # 绫波
    ├── biaoqiang/           # 标枪
    ├── z23/
    ├── beierfasite/         # 贝尔法斯特
    ├── dujiaoshou/          # 独角兽
    ├── tianlangxing/        # 天狼星
    └── ... (数十个角色)
```

### 7.3 模型格式

Cubism 3 标准格式：
- `.model3.json`：模型描述文件
- `.moc3`：二进制模型数据
- `.physics3.json`：物理模拟配置
- `.motion3.json`：动作数据
- `.png`：纹理贴图

---

## 8. 气泡消息系统

```typescript
// 显示聊天气泡
function showBubble(text: string): void {
  const bubble = document.createElement('div')
  bubble.className = 'assistant-bubble'
  bubble.innerText = text
  document.body.appendChild(bubble)

  setTimeout(() => {
    bubble.classList.add('fade-out')
    setTimeout(() => bubble.remove(), 500)
  }, 5000)
}
```

---

## 9. 窗口控制 API

| 功能 | 通道 | 说明 |
|------|------|------|
| 显示/隐藏 | `toggle-assistant` | 控制窗口可见性 |
| 鼠标穿透 | `assistant:set-ignore-mouse-events` | 点击穿透到下层窗口 |
| 切换模型 | `assistant:set-model` | 更换 Live2D 角色 |
| 播放动作 | `assistant:set-motion` | 播放指定动作文件 |
| 切换表情 | `assistant:set-expression` | 切换表情参数 |
