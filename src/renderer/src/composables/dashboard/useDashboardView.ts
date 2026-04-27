import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
export interface AccountNode {
  mid: string
  name: string
  face: string
  partition: string
}

export interface UpDeepAnalysis {
  name: string
  face?: string // 头像
  sign?: string // 签名
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
  hotVideoCount: number
  publishPreference: {
    peakHour: number
    peakHourFormatted: string
    hourDistribution: number[]
  }
  topEngagement: Array<{
    bvid: string
    title: string
    likeRate: number
    coinRate: number
    favRate: number
    danmakuRate: number
  }>
  titlePatterns: {
    withEmoji: number
    withNumber: number
    withBracket: number
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

export interface VideoDeepAnalysis {
  bvid: string
  title: string
  cover: string
  duration: number
  pubdate: number
  views: number
  // 💥 原始统计数据
  stats: {
    like: number
    coin: number
    favorite: number
    danmaku: number
    reply: number
    share: number
  }
  // 创作者信息
  owner: {
    name: string
    mid?: number
    face?: string
    fans?: number
  }
  ratios: {
    likeRate: string
    coinRate: string
    favRate: string
    shareRate: string
    danmakuRate: string
    replyRate: string
  }
  engagementRate: string
  scores: {
    heat: number
    heatLevel: string
    completion: number
    completionPotential: string
    title: number
    titleFactors: string[]
  }
  comparison: {
    vsUpAverage: string
    vsHotAverage: string
    upVideoCount: number
  }
  commentActivity: {
    replyPer1000: string
    danmakuPer1000: string
    level: string
  }
  overallRating: string
  aiAnalysis?: {
    summary: string
    highlights: string[]
    optimization: string[]
    potential: string
  }
}

export interface VideoComparison {
  videos: Array<{
    bvid: string
    title: string
    pic: string
    duration: number
    pubdate: number
    owner: string
    views: number
    likes: number
    coins: number
    favorites: number
    danmaku: number
    likeRate: string
    coinRate: string
    engagementScore: number
  }>
  count: number
  winners: {
    mostViewed: { title: string; views: number; bvid: string }
    bestEngagement: { title: string; likeRate: string; bvid: string }
    mostCoins: { title: string; coins: number; bvid: string }
  }
  averages: {
    views: number
    likes: number
    engagementRate: string
  }
}

export interface TrendsData {
  hotKeywords: Array<{
    word: string
    count: number
    rank: number
    level: 'hot' | 'warm' | 'normal'
  }>
  hotPartitions: Array<{
    name: string
    count: number
    percent: string
  }>
  risingUps: Array<{
    name: string
    videoCount: number
    rank: number
  }>
  hiddenGems: Array<{
    bvid: string
    title: string
    pic: string
    views: number
    likeRate: string
  }>
  durationRanges: {
    veryShort: { label: string; count: number; color: string }
    short: { label: string; count: number; color: string }
    medium: { label: string; count: number; color: string }
    long: { label: string; count: number; color: string }
    veryLong: { label: string; count: number; color: string }
  }
  hourlyDistribution: number[]
  peakHour: number
  engagementStats: {
    avgViews: number
    avgLikes: number
    avgCoins: number
    avgLikeRate: string
  }
  hotVideosPreview: Array<{
    bvid: string
    title: string
    pic: string
    views: number
    likes: number
    owner: string
  }>
  totalAnalyzed: number
  updateTime: string
}

export interface DashboardApi {
  getDashboardData: (
    t:
      | 'personal'
      | 'up'
      | 'video'
      | 'activity'
      | 'up-deep-analysis'
      | 'video-deep-analysis'
      | 'video-compare'
      | 'trends',
    k?: string,
    p?: string
  ) => Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }>
  getAccounts: () => Promise<AccountNode[]>
}

import * as echarts from 'echarts'

export function useDashboardView() {
  const activeTab = ref('personal')
  const searchKeyword = ref('')
  const isSearching = ref(false)
  const toastMsg = ref('')
  // const analysisMode = ref<'basic' | 'deep'>('basic') // 已弃用：现在默认都是完整分析

  const accountsList = ref<AccountNode[]>([])
  const selectedAccount = ref<string>('')

  const mainChartRef = ref<HTMLElement | null>(null)
  let mainChart: echarts.ECharts | null = null

  // ==========================
  // 📊 新增：深度分析数据结构
  // ==========================

  const upDeepStats = ref<UpDeepAnalysis | null>(null)
  const videoDeepStats = ref<VideoDeepAnalysis | null>(null)
  const videoCompareStats = ref<VideoComparison | null>(null)
  const trendsStats = ref<TrendsData | null>(null)

  const stats = ref({
    personal: {
      coins: 0,
      bcoins: 0,
      level: 0,
      expPercent: 0,
      fans: 0,
      following: 0,
      dynamic: 0,
      likes: 0,
      archiveViews: 0,
      articleViews: 0,
      isVip: false,
      curve: [0]
    },
    up: {
      name: '暂无数据',
      face: '',
      sign: '',
      fans: 0,
      likes: 0,
      following: 0,
      archiveCount: 0,
      latestVideoCount: 0,
      isVip: false,
      verifyDesc: '',
      verifyType: -1,
      isLive: false,
      curve: [0]
    },
    video: {
      title: '暂无数据',
      cover: '',
      ownerName: '',
      pubdate: '',
      views: 0,
      danmaku: 0,
      share: 0,
      likes: 0,
      coinMax: 0,
      favorite: 0,
      replyCount: 0,
      duration: 0,
      highestRank: 0,
      curve: [0]
    },
    activity: {
      historyCount: 0,
      timeConsumedSec: 0,
      tags: [] as string[],
      topUps: [] as { name: string; value: number }[],
      pieData: [] as { name: string; value: number }[]
    }
  })

  // ✅ 新增：清除当前分析逻辑
  const clearCurrentAnalysis = (): void => {
    if (activeTab.value === 'up') {
      stats.value.up = {
        name: '暂无数据',
        face: '',
        sign: '',
        fans: 0,
        likes: 0,
        following: 0,
        archiveCount: 0,
        latestVideoCount: 0,
        isVip: false,
        verifyDesc: '',
        verifyType: -1,
        isLive: false,
        curve: [0]
      }
    } else if (activeTab.value === 'video') {
      stats.value.video = {
        title: '暂无数据',
        cover: '',
        ownerName: '',
        pubdate: '',
        views: 0,
        danmaku: 0,
        share: 0,
        likes: 0,
        coinMax: 0,
        favorite: 0,
        replyCount: 0,
        duration: 0,
        highestRank: 0,
        curve: [0]
      }
    }
    searchKeyword.value = ''
    nextTick(() => initChart())
    triggerToast('🗑️ 已清除当前分析结果')
  }

  const formatNum = (num: number): string =>
    num >= 10000 ? (num / 10000).toFixed(2) + '万' : num.toString()

  const formatMsTime = (sec: number): string => {
    if (!sec) return '00:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const formatHours = (sec: number): string => (sec / 3600).toFixed(1)

  const formatDate = (ts: number): string => {
    if (!ts) return ''
    const d = new Date(ts * 1000)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const calcHealthRatio = (
    fans: number,
    likes: number,
    views: number,
    level: number = 0
  ): number => {
    if (views === 0) {
      const viewerScore = level * 12.5 + Math.min(25, fans * 2)
      return Math.max(1, Math.min(99.8, parseFloat(viewerScore.toFixed(1))))
    }
    const r = (likes / views) * 100 + (views / ((fans || 1) * 10)) * 100
    return Math.min(100, Math.max(1, parseFloat(Math.min(r, 99.8).toFixed(1))))
  }

  const calcTripleGrade = (
    l: number,
    c: number,
    f: number,
    v: number
  ): { percent: string; grade: string; color: string } => {
    if (v === 0) return { percent: '0.00', grade: '-', color: 'var(--text-sub)' }
    const r = ((l + c * 10 + f * 3) / v) * 100
    if (r > 30) return { percent: r.toFixed(1), grade: 'SSS极佳', color: '#ff4d4f' }
    if (r > 15) return { percent: r.toFixed(1), grade: 'S优良', color: '#f3a034' }
    if (r > 8) return { percent: r.toFixed(1), grade: 'A良好', color: 'var(--primary-color)' }
    return { percent: r.toFixed(1), grade: 'B普通', color: '#52c41a' }
  }

  const generateTrendLine = (fVal: number): number[] => {
    if (fVal <= 0) return [0, 0, 0, 0, 0, 0, 0]
    const l: number[] = []
    for (let i = 6; i >= 1; i--) {
      l.push(Math.round(fVal * (1 - i * 0.05 + Math.random() * 0.02)))
    }
    l.push(fVal)
    return l
  }

  const triggerToast = (msg: string): void => {
    toastMsg.value = msg
    setTimeout((): void => {
      toastMsg.value = ''
    }, 3000)
  }

  const syncLocalAccounts = async (): Promise<void> => {
    try {
      const api = (window as unknown as { api: DashboardApi }).api
      if (api?.getAccounts) {
        const a = await api.getAccounts()
        if (a?.length > 0) {
          accountsList.value = a.map((o) => ({
            mid: o.mid,
            name: o.name,
            face: o.face,
            partition: o.partition
          }))
          selectedAccount.value = accountsList.value[0].partition
          return
        }
      }
      accountsList.value = []
      selectedAccount.value = ''
    } catch (err) {
      console.error('账号数据读取出错', err)
      accountsList.value = []
    }
  }

  const loadRealData = async (
    type:
      | 'personal'
      | 'up'
      | 'video'
      | 'activity'
      | 'up-deep-analysis'
      | 'video-deep-analysis'
      | 'video-compare'
      | 'trends',
    keyword?: string
  ): Promise<void> => {
    isSearching.value = true
    const api = (window as unknown as { api: DashboardApi }).api
    if (!api || !api.getDashboardData) {
      triggerToast('⚠️ 数据接口获取失败')
      isSearching.value = false
      return
    }
    const tPartition =
      (type === 'personal' || type === 'activity') && selectedAccount.value
        ? selectedAccount.value
        : undefined
    const r = await api.getDashboardData(type, keyword, tPartition)
    isSearching.value = false

    if (!r.success || !r.data || 'error' in r.data) {
      triggerToast(
        `${r.error || (r.data?.error as string) || '未获取到数据，请检查网络或隐私设置'}`
      )
      // 🌟 修复：清除加载状态，避免卡住
      upDeepStats.value = null
      videoDeepStats.value = null
      videoCompareStats.value = null
      trendsStats.value = null
      nextTick((): void => initChart())
      return
    }
    const d = r.data

    if (type === 'personal') {
      stats.value.personal = {
        coins: (d.coins as number) ?? 0,
        bcoins: (d.bcoins as number) ?? 0,
        isVip: !!d.isVip,
        level: (d.level as number) ?? 0,
        expPercent: Math.max(0, Math.min(100, (d.expPercent as number) ?? 0)),
        fans: (d.fans as number) ?? 0,
        following: (d.following as number) ?? 0,
        dynamic: (d.dynamic as number) ?? 0,
        likes: (d.likes as number) ?? 0,
        archiveViews: (d.archiveViews as number) ?? 0,
        articleViews: (d.articleViews as number) ?? 0,
        curve: generateTrendLine((d.likes as number) ?? 0)
      }
    } else if (type === 'up') {
      stats.value.up = {
        name: (d.name as string) || '',
        face: (d.face as string) || '',
        sign: (d.sign as string) || '',
        fans: (d.fans as number) ?? 0,
        likes: (d.likes as number) ?? 0,
        following: (d.following as number) ?? 0,
        archiveCount: (d.archiveCount as number) ?? 0,
        latestVideoCount: (d.latestVideoCount as number) ?? 0,
        isVip: !!d.isVip,
        verifyDesc: (d.verifyDesc as string) || '',
        verifyType: (d.verifyType as number) ?? -1,
        isLive: !!d.liveStatus,
        curve: generateTrendLine((d.fans as number) ?? 0)
      }
    } else if (type === 'video') {
      // 💡 先提取深层级的数据，防止 undefined 报错
      const videoStats = (d.stats as Record<string, number>) || {}
      const ownerInfo = (d.owner as { name?: string }) || {}

      stats.value.video = {
        title: (d.title as string) || '',
        cover: (d.cover as string) || '',
        ownerName: ownerInfo.name || '', // ✅ 修正：从 owner 里取 name
        pubdate: formatDate((d.pubdate as number) ?? 0),
        views: (d.views as number) ?? 0,

        // ✅ 修正：全部从 videoStats (即 d.stats) 层级向下取，并修正键名对齐后端
        danmaku: videoStats.danmaku ?? 0,
        share: videoStats.share ?? 0,
        likes: videoStats.like ?? 0, // d.stats.like
        coinMax: videoStats.coin ?? 0, // d.stats.coin
        favorite: videoStats.favorite ?? 0, // d.stats.favorite
        replyCount: videoStats.reply ?? 0, // d.stats.reply

        duration: (d.duration as number) ?? 0, // ✅ 修正：后端叫 duration，没有 Sec
        highestRank: (d.highestRank as number) ?? 0,
        curve: generateTrendLine((d.views as number) ?? 0)
      }
    } else if (type === 'activity') {
      stats.value.activity = {
        historyCount: (d.activeHistoryCount as number) ?? 0,
        timeConsumedSec: (d.timeConsumedSec as number) ?? 0,
        tags: (d.userTags as string[]) || [],
        pieData: JSON.parse((d.pieDataRaw as string) || '[]'),
        topUps: JSON.parse((d.favoriteUpsRaw as string) || '[]')
      }
    }

    // 处理UP主和视频分析（使用类型断言避免类型错误）
    const t = type as string
    if (t === 'up' || t === 'up-deep-analysis') {
      // UP主分析现在直接返回完整数据（包含AI分析）
      upDeepStats.value = d as unknown as UpDeepAnalysis
    } else if (t === 'video' || t === 'video-deep-analysis') {
      // 视频分析现在直接返回深度分析数据（包含AI分析）
      videoDeepStats.value = d as unknown as VideoDeepAnalysis
    } else if (t === 'video-compare') {
      videoCompareStats.value = d as unknown as VideoComparison
    } else if (t === 'trends') {
      console.log('[Dashboard] 趋势发现数据:', d)
      trendsStats.value = d as unknown as TrendsData
    }

    nextTick((): void => initChart())
  }

  const initChart = (): void => {
    if (!mainChartRef.value) return
    if (mainChartRef.value.clientWidth === 0 || mainChartRef.value.clientHeight === 0) return
    if (mainChart) mainChart.dispose()
    mainChart = echarts.init(mainChartRef.value)
    const mainCol =
      getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() ||
      '#00aeec'

    if (activeTab.value === 'activity') {
      mainChart.setOption({
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(255,255,255,0.95)',
          textStyle: { color: '#000' }
        },
        legend: { top: '5%', left: 'center', formatter: '{name}', textStyle: { color: 'auto' } },
        series: [
          {
            name: '视频分区比例占比',
            type: 'pie',
            radius: ['45%', '75%'],
            center: ['50%', '60%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
            label: { show: false, position: 'center' },
            emphasis: { label: { show: true, fontSize: '16', fontWeight: 'bold' } },
            labelLine: { show: false },
            color: [mainCol, '#fb7299', '#f3a034', '#52c41a', '#8A2BE2', '#FE82A5', '#13c2c2'],
            data: stats.value.activity.pieData
          }
        ]
      })
      return
    }

    // 🌟 修复：视频对比标签页显示对比柱状图
    if (activeTab.value === 'video-compare') {
      if (videoCompareStats.value && videoCompareStats.value.videos.length > 0) {
        const videos = videoCompareStats.value.videos
        const shortTitles = videos.map((v) =>
          v.title.length > 10 ? v.title.slice(0, 10) + '...' : v.title
        )

        mainChart.setOption(
          {
            title: { show: false },
            tooltip: {
              trigger: 'axis',
              axisPointer: { type: 'shadow' }
            },
            legend: { data: ['播放量', '点赞数', '投币数'], top: 10 },
            grid: { left: '3%', right: '4%', bottom: '15%', top: '20%', containLabel: true },
            xAxis: {
              type: 'category',
              data: shortTitles,
              axisLabel: { rotate: 30, fontSize: 10 }
            },
            yAxis: { type: 'value' },
            series: [
              {
                name: '播放量',
                type: 'bar',
                data: videos.map((v) => v.views),
                itemStyle: { color: mainCol }
              },
              {
                name: '点赞数',
                type: 'bar',
                data: videos.map((v) => v.likes),
                itemStyle: { color: '#fb7299' }
              },
              {
                name: '投币数',
                type: 'bar',
                data: videos.map((v) => v.coins),
                itemStyle: { color: '#f3a034' }
              }
            ]
          },
          true
        )
      } else {
        mainChart.setOption(
          {
            title: {
              text: '👆 输入多个BV号进行视频对比分析',
              left: 'center',
              top: 'middle',
              textStyle: { color: 'var(--text-sub)', fontSize: 16 }
            },
            xAxis: { show: false },
            yAxis: { show: false },
            series: []
          },
          true
        )
      }
      return
    }

    // 🌟 修复：趋势发现标签页显示热门分区柱状图
    if (activeTab.value === 'trends') {
      if (trendsStats.value && trendsStats.value.hotPartitions.length > 0) {
        const partitions = trendsStats.value.hotPartitions.slice(0, 10)

        mainChart.setOption(
          {
            title: { show: false },
            tooltip: { trigger: 'axis' },
            grid: { left: '3%', right: '4%', bottom: '5%', top: '10%', containLabel: true },
            xAxis: {
              type: 'value'
            },
            yAxis: {
              type: 'category',
              data: partitions.map((p) => p.name).reverse(),
              axisLabel: { fontSize: 11 }
            },
            series: [
              {
                name: '视频数量',
                type: 'bar',
                data: partitions.map((p) => p.count).reverse(),
                itemStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: mainCol },
                    { offset: 1, color: '#fb7299' }
                  ]),
                  borderRadius: [0, 4, 4, 0]
                },
                label: {
                  show: true,
                  position: 'right',
                  formatter: '{c}'
                }
              }
            ]
          },
          true
        )
      } else {
        mainChart.setOption(
          {
            title: {
              text: '👆 点击执行查询获取最新B站热门趋势',
              left: 'center',
              top: 'middle',
              textStyle: { color: 'var(--text-sub)', fontSize: 16 }
            },
            xAxis: { show: false },
            yAxis: { show: false },
            series: []
          },
          true
        )
      }
      return
    }

    let dat = stats.value.personal.curve
    let nS = '个人整体估算热度值'

    // 🌟 修复：UP主深度分析使用真实趋势数据
    if (activeTab.value === 'up' && upDeepStats.value) {
      dat =
        upDeepStats.value.trendCurve.length > 1
          ? upDeepStats.value.trendCurve
          : stats.value.up.curve
      nS = 'UP主近期播放量趋势'
    } else if (activeTab.value === 'up') {
      dat = stats.value.up.curve
      nS = 'UP主近期粉丝趋势'
    } else if (activeTab.value === 'video' && videoDeepStats.value) {
      // 视频深度分析显示评分雷达图数据
      nS = '视频数据趋势'
    } else if (activeTab.value === 'video') {
      dat = stats.value.video.curve
      nS = '推荐量波动区间'
    }

    mainChart.setOption({
      title: { show: false },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e3e5e7',
        textStyle: { color: '#18191c' }
      },
      grid: { left: '3%', right: '4%', bottom: '5%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: ['数日前', '较早点', '节点一', '三天前', '近两日', '现阶段'],
        axisLine: { lineStyle: { color: '#e3e5e7' } }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#e3e5e7', type: 'dashed' } }
      },
      series: [
        {
          name: nS,
          type: 'line',
          smooth: 0.4,
          symbolSize: 6,
          itemStyle: { color: mainCol },
          lineStyle: {
            width: 3,
            shadowColor: 'rgba(0,174,236,0.2)',
            shadowBlur: 10,
            shadowOffsetY: 4
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${mainCol}44` },
              { offset: 1, color: `${mainCol}00` }
            ])
          },
          data: dat
        }
      ]
    })
  }

  const switchTab = (tab: string, forceRef = false): void => {
    if (activeTab.value === tab && !forceRef) return
    activeTab.value = tab

    // 💥 只有在执行查询(forceRef为true)时，才清理旧的分析结果
    if (forceRef) {
      if (!searchKeyword.value) return // 防止空搜索也清理
      upDeepStats.value = null
      videoDeepStats.value = null
      videoCompareStats.value = null
      trendsStats.value = null
    } else {
      // 💥 只是普通切换 Tab，不清空数据！清理输入框方便下次输入
      searchKeyword.value = ''
      // 🌟 趋势发现没有搜索按钮，普通切换时若未加载则自动请求
      if (tab === 'trends' && !trendsStats.value) {
        loadRealData('trends')
      }
      nextTick(() => initChart())
      return
    }

    // 下面是原有的 loadRealData 逻辑
    if (tab === 'personal' || tab === 'activity') {
      loadRealData(tab as 'personal' | 'activity')
    } else if (tab === 'trends') {
      // 趋势发现直接加载数据
      loadRealData('trends')
    } else if (forceRef && searchKeyword.value.trim() !== '') {
      // UP主和视频分析直接调用（现在都是完整分析）
      loadRealData(tab as 'up' | 'video' | 'video-compare', searchKeyword.value)
    }
  }

  // 切换分析模式 - 已弃用，现在UP主和视频分析默认都是完整分析
  // const switchAnalysisMode = (mode: 'basic' | 'deep'): void => {
  //   analysisMode.value = mode
  //   if (searchKeyword.value.trim()) {
  //     switchTab(activeTab.value, true)
  //   }
  // }

  const switchAccount = (partition: string): void => {
    selectedAccount.value = partition
    triggerToast('♻️ 正在读取选中账号数据...')
    loadRealData(activeTab.value as 'personal' | 'activity')
  }

  const handleSearch = (): void => {
    if (!searchKeyword.value) {
      const hints: Record<string, string> = {
        up: '请输入 UID',
        video: '请输入 BV号',
        'video-compare': '请输入多个BV号，用逗号分隔',
        trends: '无需输入，直接查看趋势'
      }
      return triggerToast(`⚠️ ${hints[activeTab.value] || '请输入搜索内容'} 后再执行查询！`)
    }
    switchTab(activeTab.value, true)
  }

  // switchAccount 和 handleSearch 已通过 return 暴露

  // ==========================================
  // 🚀 图表自动自适应与重绘引擎核心区域
  // ==========================================
  let chartResizeObserver: ResizeObserver | null = null

  const handleResize = (): void => {
    if (mainChart) mainChart.resize()
  }

  const observer = new MutationObserver((): void => initChart())

  // 🌟 新增全局导航监听器：专门对付侧边栏切换造成的渲染停滞
  const handleNavShow = (e: Event): void => {
    const customEvent = e as CustomEvent
    if (customEvent.detail === 'dashboard' || customEvent.detail === 'Dashboard') {
      setTimeout(() => {
        if (mainChart) mainChart.resize()
        else initChart()
      }, 150)
    }
  }

  onMounted(async (): Promise<void> => {
    await syncLocalAccounts()
    if (accountsList.value.length > 0) loadRealData('personal')
    else nextTick((): void => initChart())

    // 原有监听器
    window.addEventListener('resize', handleResize)
    window.addEventListener('app-command-nav', handleNavShow) // 注入导航菜单监听

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'data-theme']
    })

    // 🌟 物理尺寸雷达：一旦容器的真实物理宽度发生变化，立即拉起图表重绘
    if (mainChartRef.value) {
      chartResizeObserver = new ResizeObserver(() => {
        if (mainChartRef.value && mainChartRef.value.clientWidth > 0) {
          if (mainChart) {
            mainChart.resize()
          } else {
            initChart()
          }
        }
      })
      chartResizeObserver.observe(mainChartRef.value)
    }
  })

  onBeforeUnmount((): void => {
    window.removeEventListener('resize', handleResize)
    // 清理导航栏切换舰艇
    window.removeEventListener('app-command-nav', handleNavShow)
    observer.disconnect()

    // 安全卸载 ResizeObserver
    if (chartResizeObserver) {
      chartResizeObserver.disconnect()
    }

    if (mainChart) mainChart.dispose()
  })

  return {
    activeTab,
    searchKeyword,
    isSearching,
    toastMsg,
    accountsList,
    selectedAccount,
    mainChartRef,
    mainChart,
    upDeepStats,
    videoDeepStats,
    videoCompareStats,
    trendsStats,
    stats,
    clearCurrentAnalysis,
    formatNum,
    formatMsTime,
    formatHours,
    formatDate,
    calcHealthRatio,
    calcTripleGrade,
    generateTrendLine,
    triggerToast,
    syncLocalAccounts,
    loadRealData,
    initChart,
    switchTab,
    switchAccount,
    handleSearch,
    chartResizeObserver,
    handleResize,
    observer,
    handleNavShow
  }
}
