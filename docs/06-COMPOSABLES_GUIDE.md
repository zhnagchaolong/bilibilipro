# Composables 设计规范与文档

---

## 1. 设计原则

### 1.1 为什么使用 Composables

- **单一职责**：每个 View 的业务逻辑封装在一个 Composable 中
- **可测试性**：逻辑与 UI 分离，便于单元测试
- **可复用性**：通用逻辑（Toast、Dropdown、拖拽）提取为共享 Composables
- **类型安全**：TypeScript 接口集中管理，减少 `.vue` 文件中的类型噪音

### 1.2 目录约定

```
src/renderer/src/composables/
├── {feature}/              # 页面级 Composable（按功能分组）
│   ├── useXxxView.ts       # 主逻辑文件
│   └── types.ts            # (可选) 该功能专用类型
├── useToast.ts             # 通用 Composable（直接放根目录）
├── useDropdown.ts
└── useConfirm.ts
```

### 1.3 命名规范

| 类型 | 命名 | 示例 |
|------|------|------|
| 页面级 Composable | `use{ViewName}View.ts` | `usePlayerView.ts` |
| 通用 Composable | `use{Feature}.ts` | `useToast.ts` |
| 类型文件 | `types.ts` | `player/types.ts` |

---

## 2. 通用 Composables 详解

### 2.1 useToast.ts

```typescript
export function useToast() {
  const message = ref('')
  const visible = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  const show = (msg: string, duration = 3000): void => {
    message.value = msg
    visible.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { visible.value = false }, duration)
  }

  return { message, visible, show }
}
```

**使用方**：AccountsView、TasksView、DownloaderView 等

### 2.2 useDropdown.ts

```typescript
export function useDropdown() {
  const activeId = ref<string | null>(null)

  const open = (id: string): void => { activeId.value = id }
  const close = (): void => { activeId.value = null }
  const toggle = (id: string): void => {
    activeId.value = activeId.value === id ? null : id
  }

  return { activeId, open, close, toggle }
}
```

**使用方**：DownloaderView（批量操作下拉菜单）、SettingsView

### 2.3 useConfirm.ts

```typescript
export function useConfirm() {
  const visible = ref(false)
  const title = ref('确认操作')
  const content = ref('')
  let resolveFn: ((value: boolean) => void) | null = null

  const confirm = (t: string, c: string): Promise<boolean> => {
    title.value = t
    content.value = c
    visible.value = true
    return new Promise((resolve) => { resolveFn = resolve })
  }

  const onOk = (): void => { visible.value = false; resolveFn?.(true) }
  const onCancel = (): void => { visible.value = false; resolveFn?.(false) }

  return { visible, title, content, confirm, onOk, onCancel }
}
```

**使用方**：DownloaderView（删除确认）

### 2.4 useDraggablePanel.ts

物理拖拽引擎，支持边界碰撞检测：

```typescript
export function useDraggablePanel(elRef: Ref<HTMLElement | null>) {
  const startDrag = (e: MouseEvent): void => {
    const el = elRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const shiftX = e.clientX - rect.left
    const shiftY = e.clientY - rect.top

    const onMove = (moveEvent: MouseEvent): void => {
      let newX = moveEvent.clientX - shiftX
      let newY = moveEvent.clientY - shiftY
      // 边界约束
      newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width))
      newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height))
      el.style.left = `${newX}px`
      el.style.top = `${newY}px`
    }

    const onUp = (): void => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return { startDrag }
}
```

**使用方**：PlayerView（时间轴面板、灵动岛）

---

## 3. 页面级 Composables 详解

### 3.1 useAccountsView.ts

| 导出项 | 类型 | 说明 |
|--------|------|------|
| `accounts` | `Ref<BiliAccount[]>` | 账号列表 |
| `isAdding` | `Ref<boolean>` | 添加中状态 |
| `isRefreshing` | `Ref<boolean>` | 刷新中状态 |
| `loadAccounts()` | `async` | 从主进程获取账号列表 |
| `handleAddAccount()` | `async` | 触发登录流程 |
| `formatDays(n)` | `string` | 格式化剩余天数 |
| `getDaysColor(n)` | `string` | 根据天数返回颜色 |

### 3.2 useTasksView.ts

| 导出项 | 类型 | 说明 |
|--------|------|------|
| `cronTime` | `Ref<string>` | CRON 表达式 |
| `isCronEnabled` | `Ref<boolean>` | 定时开关 |
| `taskConfig` | `Ref<object>` | 任务配置（签到/观看/分享/投币） |
| `isRunning` | `Ref<boolean>` | 执行中状态 |
| `logs` | `Ref<string[]>` | 日志终端 |
| `applyCron()` | `async` | 应用定时设置 |
| `handleStartTasks()` | `async` | 立即执行任务 |
| `sanitizeNumberInput()` | `string` | 数字输入净化 |

### 3.3 useSettingsView.ts

| 导出项 | 类型 | 说明 |
|--------|------|------|
| `llmSettings` | `Ref<LlmSettings>` | LLM 全局配置 |
| `assistantAISettings` | `Ref<object>` | 看板娘独立 AI 配置 |
| `customTheme` | `Ref<object>` | 主题色 |
| `currentProviderConfig` | `Computed` | 当前提供商配置读写 |
| `saveBasicSettings()` | `void` | 保存基础设置 |
| `applyThemeMode()` | `void` | 应用主题模式 |
| `clearCache()` | `async` | 清除缓存 |

### 3.4 useDownloaderView.ts

这是最复杂的 Composable 之一，核心设计：

```typescript
export function useDownloaderView() {
  // 输入与解析
  const inputUrl = ref('')
  const parsedList = ref<ParsedResult[]>([])
  const isParsing = ref(false)

  // 下载任务队列
  const taskList = ref<TaskRecord[]>([])

  // 历史记录分组
  const customFolders = ref<CustomFolder[]>([])
  const groupedCompletedRecords = computed(() => { ... })

  // 核心方法
  const handleParse = async (): Promise<void> => { ... }
  const startDownloadTask = async (...): Promise<void> => { ... }
  const persistTasksEngine = debounce(() => { ... }, 500)

  return { inputUrl, parsedList, taskList, customFolders, ... }
}
```

**关键设计模式：**
- **防抖持久化**：`persistTasksEngine()` 使用防抖将任务状态保存到 localStorage
- **联合类型切片**：`clipPayload` 支持两种切片模式（单片段 / 多片段合并）

### 3.5 usePlayerView.ts

核心设计围绕 **双 Webview 导航引擎**：

```typescript
export function usePlayerView() {
  // 双 webview ref
  const browserWebview = ref<BiliWebviewElement | null>(null)
  const videoWebview = ref<BiliWebviewElement | null>(null)

  // 导航状态
  const currentUrl = ref('https://www.bilibili.com')
  const currentTab = ref('recommend')
  const isBiliVideo = computed(() => isVideoUrl(currentUrl.value))

  // 切片系统
  const allClipsMap = ref<Record<string, Clip[]>>({})
  const currentVideoClips = computed(() => ...)

  // 导航方法
  const navTo = (tab, url): void => { ... }
  const onDidNavigate = (e, source): void => { ... }
  const onStopLoading = (source): void => { ... }

  // 注入系统
  const forceUIInject = (): void => { ... }
  const injectBlackMagic = (): void => { ... }

  return { browserWebview, videoWebview, currentUrl, ... }
}
```

**关键设计模式：**
- **URL 类型守卫**：`isVideoUrl(url)` 判断是否是视频/番剧页面
- **虚拟前进栈**：`poppedVideoUrls` 处理跨 webview 的浏览历史
- **控制台消息协议**：通过 `__BILI_NAV__`、`__BILI_TITLE__` 等前缀与 webview 通信

### 3.6 useDashboardView.ts

核心设计围绕 **ECharts 图表生命周期**：

```typescript
export function useDashboardView() {
  const activeTab = ref('personal')
  const mainChartRef = ref<HTMLElement | null>(null)
  let mainChart: echarts.ECharts | null = null

  // 数据状态
  const stats = ref({ personal: {...}, up: {...}, video: {...}, activity: {...} })
  const upDeepStats = ref<UpDeepAnalysis | null>(null)

  // 图表初始化
  const initChart = (): void => {
    if (!mainChartRef.value) return
    mainChart = echarts.init(mainChartRef.value)
    // 根据 activeTab 设置不同的图表配置
  }

  // 数据加载
  const loadRealData = async (type, keyword?): Promise<void> => { ... }

  // ResizeObserver 自动重绘
  onMounted(() => {
    chartResizeObserver = new ResizeObserver(() => mainChart?.resize())
    chartResizeObserver.observe(mainChartRef.value)
  })

  return { activeTab, mainChartRef, stats, initChart, ... }
}
```

---

## 4. Composable 开发 checklist

- [ ] 文件命名符合 `use{PascalCase}.ts`
- [ ] 只导入模板中实际使用的 Vue API（避免 `no-unused-vars`）
- [ ] 接口定义在模块顶层并 `export`
- [ ] 生命周期钩子使用 `onMounted` / `onBeforeUnmount` / `onUnmounted`
- [ ] 事件监听器在 `onBeforeUnmount` 中清理
- [ ] `window.api.*` 调用处添加 `try/catch`
- [ ] 复杂对象使用 `computed` 而非在模板中内联计算
- [ ] 防抖/节流函数使用 `ReturnType<typeof setTimeout>` 类型
