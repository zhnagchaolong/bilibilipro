# IPC 通信协议文档

> 本文档列出所有渲染进程与主进程之间的 IPC 通道，包括通道名、参数、返回值和使用场景。

---

## 1. 约定

| 项目 | 约定 |
|------|------|
| 通道命名 | kebab-case，如 `get-accounts`、`download-video` |
| 调用方式 | `invoke`（请求-响应）或 `send`/`on`（事件） |
| 类型安全 | `src/preload/index.d.ts` 与 `src/shared/api.types.ts` 同步维护 |

---

## 2. App 生命周期

| 通道 | 方向 | 模式 | 参数 | 返回值 | 说明 |
|------|------|------|------|--------|------|
| `app-hide` | R→M | `send` | — | — | 隐藏应用到托盘 |
| `app-quit` | R→M | `send` | — | — | 完全退出应用 |
| `show-close-prompt` | M→R | `on` | — | — | 主进程通知渲染进程显示关闭弹窗 |
| `toggle-always-on-top` | R→M | `send` | `enable: boolean` | — | 窗口置顶切换 |
| `toggle-auto-start` | R→M | `send` | `enable: boolean` | — | 开机自启动切换 |
| `toggle-network-blocker` | R→M | `send` | `enable: boolean` | — | 广告/统计拦截器开关 |
| `clear-all-cookies` | R→M | `invoke` | — | `Promise<boolean>` | 清除所有账号 Cookie |
| `update-close-action` | R→M | `send` | `action: string` | — | 更新关闭按钮行为（退出/最小化） |

---

## 3. 账号管理 (Auth)

| 通道 | 方向 | 模式 | 参数 | 返回值 | 说明 |
|------|------|------|------|--------|------|
| `get-accounts` | R→M | `invoke` | — | `Promise<BiliAccount[]>` | 获取所有已保存账号 |
| `add-account` | R→M | `invoke` | — | `Promise<AddAccountResult>` | 添加新账号（打开登录窗口） |
| `delete-account` | R→M | `invoke` | `uid: string` | `Promise<BaseResponse>` | 删除指定账号 |
| `bili-login` | R→M | `invoke` | — | `Promise<unknown>` | Bilibili 登录流程 |
| `bili-logout` | R→M | `invoke` | — | `Promise<unknown>` | Bilibili 登出流程 |

**账号数据结构：**

```typescript
interface BiliAccount {
  uid: string
  name: string
  face: string
  partition: string        // 独立 Session 标识
  daysRemaining?: number
  level?: number
  coins?: number
  isVip?: boolean
}
```

---

## 4. 数据看板 (Dashboard)

| 通道 | 方向 | 模式 | 参数 | 返回值 | 说明 |
|------|------|------|------|--------|------|
| `get-dashboard-data` | R→M | `invoke` | `type, keyword?, partition?` | `Promise<{ success, data?, error? }>` | 获取各类分析数据 |

**支持的数据类型 (`type`)：**

| type 值 | 说明 | keyword 用途 |
|---------|------|-------------|
| `personal` | 个人数据统计 | — |
| `up` | UP 主基础信息 | UP 主 UID/空间链接 |
| `video` | 视频基础统计 | BV 号 |
| `activity` | 观看历史分析 | — |
| `up-deep-analysis` | UP 主深度分析 | UP 主 UID |
| `video-deep-analysis` | 视频深度分析 | BV 号 |
| `video-compare` | 多视频对比 | 多个 BV 号（逗号分隔） |
| `trends` | 全站趋势发现 | — |

**分区参数 (`partition`)：**
- 用于 `personal` 和 `activity` 类型，指定使用哪个账号的数据
- 不指定时使用默认 session

---

## 5. 视频下载 (Video)

| 通道 | 方向 | 模式 | 参数 | 返回值 | 说明 |
|------|------|------|------|--------|------|
| `parse-video` | R→M | `invoke` | `bvid, partitionKey?` | `Promise<ParseVideoData>` | 解析视频元数据和流地址 |
| `download-video` | R→M | `invoke` | `taskId, videoUrl, audioUrl, title, savePath, page, cid, clipPayload?` | `Promise<{ success, filePath?\|message? }>` | 启动下载任务 |
| `download-progress` | M→R | `on` | — | `{ taskId, type, progress, speed? }` | 下载进度推送（每 500ms） |
| `open-folder` | R→M | `invoke` | `filePath?` | `Promise<void>` | 打开文件所在文件夹 |
| `select-folder` | R→M | `invoke` | — | `Promise<string>` | 弹出文件夹选择对话框 |

**`clipPayload` 联合类型：**

```typescript
// 模式 A：单片段截取
{ start: number; end: number }

// 模式 B：多片段合并
{ isMerge: boolean; targets: { start: number; end: number; titleExt?: string }[] }
```

---

## 6. 自动化任务 (Task)

| 通道 | 方向 | 模式 | 参数 | 返回值 | 说明 |
|------|------|------|------|--------|------|
| `run-tasks` | R→M | `invoke` | `config: Record<string, unknown>` | `Promise<unknown>` | 立即执行任务 |
| `setup-cron` | R→M | `invoke` | `timeStr, config` | `Promise<unknown>` | 设置定时任务 |
| `stop-task` | R→M | `invoke` | — | `Promise<unknown>` | 停止当前任务 |
| `task-log` | M→R | `on` | — | `msg: string` | 任务日志实时推送 |

**任务配置 (`config`)：**

```typescript
{
  checkIn: boolean      // 每日签到
  watch: boolean        // 观看视频
  share: boolean        // 分享视频
  coin: number          // 投币数量
  like: boolean         // 点赞视频
  partition: string     // 执行账号分区
}
```

---

## 7. AI 看板娘 (Assistant)

| 通道 | 方向 | 模式 | 参数 | 返回值 | 说明 |
|------|------|------|------|--------|------|
| `toggle-assistant` | R→M | `invoke` | `enable, modelPath?` | `Promise<unknown>` | 显示/隐藏看板娘窗口 |
| `assistant:set-ignore-mouse-events` | R→M | `invoke` | `ignore, options?` | `Promise<unknown>` | 设置鼠标穿透 |
| `vibe-check` | R→M | `send` | `data: AssistantVibeData` | — | 发送情感数据（弹幕/标题/字幕） |
| `on-assistant-vibe` | M→R | `on` | — | `data: AssistantVibeData` | 看板娘窗口接收情感数据 |
| `assistant:ask` | R→M | `invoke` | `question: string` | `Promise<string>` | 向 LLM 提问 |
| `global-mouse-tracking` | M→R | `on` | — | `{ x, y }` | 全局鼠标坐标追踪 |

**情感数据类型：**

```typescript
type AssistantVibeType = 'danmaku' | 'video-change' | 'subtitle'

interface AssistantVibeData {
  type: AssistantVibeType
  title?: string
  content?: string
}
```

---

## 8. LLM 配置

| 通道 | 方向 | 模式 | 参数 | 返回值 | 说明 |
|------|------|------|------|--------|------|
| `get-llm-settings` | R→M | `invoke` | — | `Promise<LlmSettings \| null>` | 读取 LLM 配置 |
| `save-llm-settings` | R→M | `invoke` | `settings: LlmSettings` | `Promise<void>` | 保存 LLM 配置 |
| `update-llm-config` | R→M | `send` | `settings: LlmSettings` | — | 热更新 LLM 配置 |
| `save-assistant-ai-settings` | R→M | `invoke` | `settings` | `Promise<void>` | 保存看板娘独立 AI 配置 |
| `get-assistant-ai-settings` | R→M | `invoke` | — | `Promise<unknown>` | 读取看板娘独立 AI 配置 |

**LLM 配置结构：**

```typescript
type LlmProvider = 'DeepSeek' | 'OpenAI' | 'Qwen' | 'Custom'

interface LlmSettings {
  enabled: boolean
  provider: LlmProvider
  apiKey: string
  providerConfigs: {
    DeepSeek: { baseUrl: string; modelName: string }
    OpenAI:   { baseUrl: string; modelName: string }
    Qwen:     { baseUrl: string; modelName: string }
    Custom:   { baseUrl: string; modelName: string }
  }
  temperature: number
  chatSystemPrompt?: string
  danmakuSystemPrompt?: string
  idleInterval: number
  danmakuProbability: number
  danmakuCooldown: number
}
```

---

## 9. 播放器

| 通道 | 方向 | 模式 | 参数 | 返回值 | 说明 |
|------|------|------|------|--------|------|
| `open-player` | R→M | `invoke` | `bvid, partition` | `Promise<unknown>` | 弹出悬浮播放器窗口 |

---

## 10. 内部通信（主进程 ↔ 看板娘窗口）

这些通道不通过 `window.api` 暴露给主渲染进程，而是主进程与看板娘子窗口之间的直接通信：

| 通道 | 方向 | 说明 |
|------|------|------|
| `assistant:init-complete` | 看板娘→主进程 | 看板娘窗口加载完成 |
| `assistant:chat` | 双向 | 聊天消息传递 |
| `assistant:set-model` | 主进程→看板娘 | 切换 Live2D 模型 |
| `assistant:set-motion` | 主进程→看板娘 | 播放指定动作 |
| `assistant:set-expression` | 主进程→看板娘 | 切换表情 |

---

## 11. 错误处理约定

**Invoke 模式：**
```typescript
// 成功
{ success: true, data: { ... } }

// 失败
{ success: false, error: '错误描述信息' }
```

**On 模式：**
- 事件监听器返回取消订阅函数
- 组件卸载时务必调用取消订阅，防止内存泄漏

```typescript
const unsub = window.api.onTaskLog((msg) => {
  logs.value.push(msg)
})

onBeforeUnmount(() => {
  unsub()
})
```
