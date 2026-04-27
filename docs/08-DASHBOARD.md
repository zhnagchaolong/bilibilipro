# 数据看板 (Dashboard) 技术文档

---

## 1. 功能概述

Dashboard 模块提供 8 种数据看板视图，覆盖个人、UP 主、视频、趋势等多维度分析：

| Tab | type 值 | 数据源 | 可视化 |
|-----|---------|--------|--------|
| 个人中心 | `personal` | Bilibili API 个人数据 | 趋势折线图 |
| UP 主分析 | `up` | 空间 API | 趋势折线图 |
| 视频分析 | `video` | 视频详情 API | 趋势折线图 |
| 观看历史 | `activity` | 历史记录 API | 饼图（分区占比） |
| UP 深度分析 | `up-deep-analysis` | 空间 API + 视频列表 | 深度数据面板 |
| 视频深度分析 | `video-deep-analysis` | 视频详情 + 评论 | 深度数据面板 |
| 视频对比 | `video-compare` | 多个视频 API | 柱状图对比 |
| 趋势发现 | `trends` | 搜索/热门 API | 横向柱状图 |

---

## 2. 图表系统

### 2.1 ECharts 初始化与销毁

```typescript
const mainChartRef = ref<HTMLElement | null>(null)
let mainChart: echarts.ECharts | null = null

const initChart = (): void => {
  if (!mainChartRef.value) return
  if (mainChart) mainChart.dispose()        // 先销毁旧实例
  mainChart = echarts.init(mainChartRef.value)

  const mainCol = getComputedStyle(document.documentElement)
    .getPropertyValue('--primary-color').trim() || '#00aeec'

  // 根据 activeTab 设置不同的图表配置
  if (activeTab.value === 'activity') {
    mainChart.setOption({
      series: [{ type: 'pie', data: stats.value.activity.pieData }]
    })
  } else if (activeTab.value === 'video-compare') {
    mainChart.setOption({
      series: [
        { type: 'bar', data: videos.map(v => v.views) },
        { type: 'bar', data: videos.map(v => v.likes) }
      ]
    })
  }
  // ...
}
```

### 2.2 ResizeObserver 自动重绘

```typescript
let chartResizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (mainChartRef.value) {
    chartResizeObserver = new ResizeObserver(() => {
      if (mainChartRef.value?.clientWidth > 0) {
        mainChart?.resize()
      }
    })
    chartResizeObserver.observe(mainChartRef.value)
  }
})

onBeforeUnmount(() => {
  chartResizeObserver?.disconnect()
  mainChart?.dispose()
})
```

---

## 3. 深度分析数据结构

### 3.1 UP 主深度分析 (UpDeepAnalysis)

```typescript
interface UpDeepAnalysis {
  name: string
  face?: string
  sign?: string
  fans: number
  totalLikes: number
  videoCount: number
  averages: {
    views: number
    likes: number
    coins: number
    favorites: number
    engagementRate: string
  }
  updatePattern: {
    avgInterval: string
    daysSinceLastUpdate: number
    isRegular: string
    status: string
  }
  partitions: Array<{ name: string; count: number; percent: string }>
  durationDistribution: { short: number; medium: number; long: number; extraLong: number }
  hotVideos: Array<{ bvid: string; title: string; view: number; pic: string }>
  publishPreference: {
    peakHour: number
    peakHourFormatted: string
    hourDistribution: number[]
  }
  topEngagement: Array<{
    bvid: string; title: string
    likeRate: number; coinRate: number; favRate: number; danmakuRate: number
  }>
  titlePatterns: {
    withEmoji: number; withNumber: number; withBracket: number
    percent: { emoji: string; number: string; bracket: string }
    lengthDistribution: { veryShort: string; short: string; medium: string; long: string }
  }
  series: Array<{ name: string; count: number; videos: string[] }>
  trendCurve: number[]
  aiAnalysis?: {
    summary: string
    strengths: string[]
    suggestions: string[]
    contentStrategy: string
  }
}
```

### 3.2 视频深度分析 (VideoDeepAnalysis)

```typescript
interface VideoDeepAnalysis {
  bvid: string
  title: string
  cover: string
  duration: number
  pubdate: number
  views: number
  stats: { like: number; coin: number; favorite: number; danmaku: number; reply: number; share: number }
  owner: { name: string; mid?: number; face?: string; fans?: number }
  ratios: { likeRate: string; coinRate: string; favRate: string; shareRate: string; danmakuRate: string; replyRate: string }
  engagementRate: string
  scores: {
    heat: number; heatLevel: string
    completion: number; completionPotential: string
    title: number; titleFactors: string[]
  }
  comparison: { vsUpAverage: string; vsHotAverage: string; upVideoCount: number }
  commentActivity: { replyPer1000: string; danmakuPer1000: string; level: string }
  overallRating: string
  aiAnalysis?: {
    summary: string
    highlights: string[]
    optimization: string[]
    potential: string
  }
}
```

---

## 4. 数据加载流程

```typescript
const loadRealData = async (
  type: 'personal' | 'up' | 'video' | ...,
  keyword?: string
): Promise<void> => {
  isSearching.value = true

  // 1. 确定使用哪个账号的 partition
  const tPartition = (type === 'personal' || type === 'activity') && selectedAccount.value
    ? selectedAccount.value
    : undefined

  // 2. 调用主进程 IPC
  const r = await window.api.getDashboardData(type, keyword, tPartition)
  isSearching.value = false

  if (!r.success) {
    triggerToast(r.error || '未获取到数据')
    return
  }

  // 3. 根据 type 分发数据到对应 state
  const d = r.data
  switch (type) {
    case 'personal': stats.value.personal = { ... }; break
    case 'up':       stats.value.up = { ... }; break
    case 'video':    stats.value.video = { ... }; break
    case 'activity': stats.value.activity = { ... }; break
    case 'up-deep-analysis':      upDeepStats.value = d as UpDeepAnalysis; break
    case 'video-deep-analysis':   videoDeepStats.value = d as VideoDeepAnalysis; break
    case 'video-compare':         videoCompareStats.value = d as VideoComparison; break
    case 'trends':                trendsStats.value = d as TrendsData; break
  }

  // 4. 触发图表重绘
  nextTick(() => initChart())
}
```

---

## 5. 账号切换与数据隔离

Dashboard 模块支持选择不同账号获取数据：

```vue
<select v-model="selectedAccount" @change="loadRealData(activeTab)">
  <option v-for="acc in accountsList" :value="acc.partition">
    {{ acc.name }}
  </option>
</select>
```

- `personal` 和 `activity` 类型会使用 `selectedAccount` 对应的 partition
- 其他类型（如 `up`、`video`）不使用 partition，直接调用公开 API
