import { ref, computed, reactive, watch, onMounted, onUnmounted, onBeforeUnmount } from 'vue'
import type { BiliAccount } from '../../../../shared/api.types'
import type {
  BiliWebviewElement,
  Clip,
  SliceTaskPayload,
  SearchSuggestItem,
  ConsoleMessageEvent
} from './types'

const TAB_CONFIG = [
  { id: 'live', url: 'https://live.bilibili.com' },
  { id: 'recommend', url: 'https://www.bilibili.com' },
  { id: 'popular', url: 'https://www.bilibili.com/v/popular/weekly' },
  { id: 'hot', url: 'https://www.bilibili.com/v/popular/all' },
  { id: 'dynamic', url: 'https://t.bilibili.com' },
  { id: 'anime', url: 'https://www.bilibili.com/anime' },
  { id: 'history', url: 'https://www.bilibili.com/account/history' },
  { id: 'cinema', url: 'https://www.bilibili.com/cinema' },
  { id: 'space', url: 'https://space.bilibili.com' },
] as const

type TabId = (typeof TAB_CONFIG)[number]['id']

export function usePlayerView() {
  const isTimelineExpanded = ref(true)
  const currentSpeed = ref(1)

  const showClipManager = ref(false)

  const handleSliceTasks = (targets: SliceTaskPayload[], isMerged: boolean): void => {
    if (!targets || targets.length === 0) return
    const bvid = currentBvid.value
    const dropData = targets.map((seg) => ({
      start: seg.start,
      end: seg.end,
      titleExt: seg.title
    }))
    sessionStorage.setItem('bilibili-handoff-slices', JSON.stringify(dropData))
    sessionStorage.setItem('bilibili-handoff-merged', String(isMerged))
    localStorage.setItem('bilibili-handoff-url', `https://www.bilibili.com/video/${bvid}`)
    localStorage.setItem('bilibili-handoff-partition', selectedPartition.value)
    showClipManager.value = false
    window.dispatchEvent(new CustomEvent('app-command-nav', { detail: 'downloader' }))
  }

  const handleGlobalKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement
    if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return
    if (e.altKey && e.key.toLowerCase() === 'c') {
      e.preventDefault()
      if (isBiliVideo.value) {
        createClipFromCurrent()
        if (!isTimelineExpanded.value) {
          isTimelineExpanded.value = true
        }
      }
    }
  }

  const handleNavigateToVideo = (bvid: string, time: number): void => {
    const newUrl = `https://www.bilibili.com/video/${bvid}`
    currentUrl.value = newUrl
    isHardLoading.value = true
    isZenMode.value = false
    if (videoWebview.value) {
      videoWebview.value.loadURL(newUrl)
    }
    setTimeout(() => {
      handleJumpToTime(time)
    }, 3000)
  }

  const getBvidFromUrl = (url: string): string => {
    const match = url.match(/(BV[1-9A-HJ-NP-Za-km-z]+)/i)
    return match ? match[1] : 'unknown'
  }

  const currentBvid = computed(() => getBvidFromUrl(currentUrl.value))

  const allClipsMap = ref<Record<string, Clip[]>>(
    JSON.parse(localStorage.getItem('bili-clips-map') || '{}')
  )

  const currentVideoClips = computed({
    get: () => (currentBvid.value !== 'unknown' ? allClipsMap.value[currentBvid.value] || [] : []),
    set: (val) => {
      if (currentBvid.value !== 'unknown') {
        allClipsMap.value[currentBvid.value] = val
        saveAllClips()
      }
    }
  })

  // 💥 防抖：避免 load-commit 多次触发导致 executeJavaScript 在页面加载时失败
  let forceUIInjectTimer: ReturnType<typeof setTimeout> | null = null

  const timelinePanelRef = ref<HTMLElement | null>(null)

  const startDragTimeline = (e: MouseEvent): void => {
    const target = e.target as HTMLElement
    if (target.closest('.timeline-marker') || target.tagName === 'BUTTON') return
    const el = timelinePanelRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const shiftX = e.clientX - rect.left
    const shiftY = e.clientY - rect.top
    el.style.transition = 'none'
    el.style.position = 'fixed'
    el.style.bottom = 'auto'
    el.style.right = 'auto'
    el.style.margin = '0'
    el.style.transform = 'none'
    el.style.left = `${rect.left}px`
    el.style.top = `${rect.top}px`
    el.style.cursor = 'grabbing'

    const onMouseMove = (moveEvent: MouseEvent): void => {
      let newX = moveEvent.clientX - shiftX
      let newY = moveEvent.clientY - shiftY
      const maxX = window.innerWidth - rect.width
      const maxY = window.innerHeight - rect.height
      if (newX < 0) newX = 0
      if (newX > maxX) newX = maxX
      if (newY < 0) newY = 0
      if (newY > maxY) newY = maxY
      el.style.left = `${newX}px`
      el.style.top = `${newY}px`
    }
    const onMouseUp = (): void => {
      el.style.cursor = 'grab'
      el.style.transition = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const saveAllClips = (): void => {
    localStorage.setItem('bili-clips-map', JSON.stringify(allClipsMap.value))
  }

  const handleJumpToTime = (time: number): void => {
    if (!videoWebview.value) return
    safeExecuteJS(
      videoWebview.value,
      `
      (function(){
        let v = document.querySelector('video');
        if(v) { 
          v.currentTime = ${time}; 
          if(v.paused) v.play(); 
        }
      })();
    `
    ).catch(() => {})
  }

  const activeTimelineMarkerId = ref<string | null>(null)

  const setActiveTimelineMarker = (clipId: string | null): void => {
    activeTimelineMarkerId.value = clipId
  }

  const accounts = ref<BiliAccount[]>([])
  const selectedPartition = ref('default')
  const currentUrl = ref('https://www.bilibili.com')

  const showAccountDropdown = ref(false)
  const showDownloadModal = ref(false)
  const isDarkMode = ref(false)
  const isZenMode = ref(false)

  const browserWebview = ref<BiliWebviewElement | null>(null)
  const videoWebview = ref<BiliWebviewElement | null>(null)

  const tabWebviews = reactive<Record<string, BiliWebviewElement | null>>({})

  function setTabWebview(tabId: string, el: unknown): void {
    tabWebviews[tabId] = (el as BiliWebviewElement) ?? null
    if (currentTab.value === tabId && !isBiliVideo.value) {
      browserWebview.value = tabWebviews[tabId]
    }
  }

  const safeExecuteJS = (
    webview: BiliWebviewElement | null,
    code: string,
    retries = 3
  ): Promise<unknown> => {
    if (!webview) return Promise.reject(new Error('webview is null'))
    if (webview.isLoading && webview.isLoading()) {
      if (retries > 0) {
        return new Promise((resolve) => setTimeout(resolve, 500)).then(() =>
          safeExecuteJS(webview, code, retries - 1)
        )
      }
      return Promise.reject(new Error('webview is still loading'))
    }
    return webview.executeJavaScript(code).catch((err: Error) => {
      if (
        retries > 0 &&
        err &&
        err.message &&
        (err.message.includes('GUEST_VIEW_MANAGER_CALL') ||
          err.message.includes('must be attached to the DOM') ||
          err.message.includes('dom-ready'))
      ) {
        return new Promise((resolve) => setTimeout(resolve, 500)).then(() =>
          safeExecuteJS(webview, code, retries - 1)
        )
      }
      return Promise.reject(err)
    })
  }

  const isFirstLoad = ref(true)
  const isHardLoading = ref(false)
  let themeObserver: MutationObserver | null = null
  let renderWaitTimeout: ReturnType<typeof setTimeout> | null = null
  const injectedFlags = reactive<Record<string, boolean>>({})

  const currentTab = ref('recommend')
  const homeSubTabs = ['live', 'recommend', 'hot', 'anime', 'cinema', 'home', 'history']
  const isHomeActive = computed(
    () => homeSubTabs.includes(currentTab.value) && currentTab.value !== 'history'
  )

  const searchText = ref('')
  const suggests = ref<SearchSuggestItem[]>([])
  const showSearchSuggest = ref(false)
  let searchTimer: ReturnType<typeof setTimeout> | null = null

  const allDanmakuSnapshots = ref<{ time: number; text: string }[]>([])
  const allSubtitleSnapshots = ref<{ time: number; text: string }[]>([])
  const searchHistory = ref<string[]>(
    JSON.parse(localStorage.getItem('bili-search-history') || '[]')
  )
  const poppedVideoUrls = ref<string[]>([])

  const islandRef = ref<HTMLElement | null>(null)
  const startDragIsland = (e: MouseEvent): void => {
    const el = islandRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const shiftX = e.clientX - rect.left
    const shiftY = e.clientY - rect.top
    el.style.position = 'fixed'
    el.style.bottom = 'auto'
    el.style.right = 'auto'
    el.style.margin = '0'
    el.style.transform = 'none'
    el.style.left = `${rect.left}px`
    el.style.top = `${rect.top}px`
    const onMouseMove = (moveEvent: MouseEvent): void => {
      let newX = moveEvent.clientX - shiftX
      let newY = moveEvent.clientY - shiftY
      const maxX = window.innerWidth - rect.width
      const maxY = window.innerHeight - rect.height
      if (newX < 0) newX = 0
      if (newX > maxX) newX = maxX
      if (newY < 0) newY = 0
      if (newY > maxY) newY = maxY
      el.style.left = `${newX}px`
      el.style.top = `${newY}px`
    }
    const onMouseUp = (): void => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const currentAccount = computed(() =>
    accounts.value.find((a) => a.partition === selectedPartition.value)
  )
  const isVideoUrl = (url: string): boolean => {
    if (!url) return false
    return url.includes('/video/') || url.includes('/bangumi/play/')
  }
  const isBiliVideo = computed(() => isVideoUrl(currentUrl.value))
  const activeWebview = computed(() =>
    isBiliVideo.value ? videoWebview.value : browserWebview.value
  )

  let prevActiveTab = currentTab.value
  watch(
    () => [currentTab.value, isBiliVideo.value],
    () => {
      const newTab = currentTab.value
      const newIsVideo = isBiliVideo.value

      // 💥 暂停上一个 Tab 的媒体，避免背景 webview 继续播放声音
      if (prevActiveTab && prevActiveTab !== newTab && tabWebviews[prevActiveTab]) {
        safeExecuteJS(
          tabWebviews[prevActiveTab]!,
          `(function(){document.querySelectorAll('video,audio').forEach(m=>{m.pause();m.muted=true;});})();`
        ).catch(() => {})
      }

      // 💥 触发新 Tab 的懒加载重新计算（display:none 后 IntersectionObserver 可能失效）
      if (newTab !== prevActiveTab && tabWebviews[newTab]) {
        safeExecuteJS(
          tabWebviews[newTab]!,
          `(function(){
            const y = window.scrollY;
            window.scrollTo(0, y + 1);
            requestAnimationFrame(function(){
              window.scrollTo(0, y);
              window.dispatchEvent(new Event('resize'));
              window.dispatchEvent(new Event('scroll'));
            });
          })();`
        ).catch(() => {})
      }
      prevActiveTab = newTab

      if (newIsVideo) {
        browserWebview.value = null
      } else {
        browserWebview.value = tabWebviews[newTab] ?? null
      }
    },
    { immediate: true }
  )

  const showLabsModal = ref(false)
  const blockKeywords = ref<string[]>(
    JSON.parse(localStorage.getItem('bili-block-keywords') || '[]')
  )
  const newKeyword = ref('')
  const videoDuration = ref(0)

  const trackRef = ref<HTMLElement | null>(null)

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const quickDeleteClip = (id: string): void => {
    const idx = currentVideoClips.value.findIndex((c) => c.id === id)
    if (idx > -1) {
      currentVideoClips.value.splice(idx, 1)
      saveAllClips()
    }
  }

  const startDragMarker = (e: MouseEvent, clip: Clip): void => {
    e.preventDefault()
    if (!trackRef.value) return
    const trackRect = trackRef.value.getBoundingClientRect()
    const startX = e.clientX
    const startTime = clip.time
    const onMouseMove = (moveEv: MouseEvent): void => {
      const deltaX = moveEv.clientX - startX
      const fraction = deltaX / trackRect.width
      let newTime = startTime + fraction * videoDuration.value
      if (newTime < 0) newTime = 0
      if (newTime > videoDuration.value) newTime = videoDuration.value
      clip.time = newTime
    }
    const onMouseUp = (): void => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      saveAllClips()
      handleJumpToTime(clip.time)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const openLabs = (): void => {
    showLabsModal.value = true
  }

  const addKeyword = (): void => {
    const kw = newKeyword.value.trim()
    if (kw && !blockKeywords.value.includes(kw)) {
      blockKeywords.value.push(kw)
      localStorage.setItem('bili-block-keywords', JSON.stringify(blockKeywords.value))
      newKeyword.value = ''
      forceRefreshFilter()
    }
  }

  const removeKeyword = (idx: number): void => {
    blockKeywords.value.splice(idx, 1)
    localStorage.setItem('bili-block-keywords', JSON.stringify(blockKeywords.value))
  }

  const forceRefreshFilter = (): void => {
    activeWebview.value?.reload()
  }

  const forceSpeed = (rate: number): void => {
    if (!videoWebview.value) return
    currentSpeed.value = rate
    const msg = rate === 1 ? '✅ 已恢复 1.0x 正常倍速' : `🔥 已强制超频至 ${rate}x`
    let bgColor = '#8a58d6'
    if (rate === 1) bgColor = '#1dc4ba'
    else if (rate >= 4) bgColor = '#f04c49'

    safeExecuteJS(
      videoWebview.value,
      `
      (function(){
        let video = document.querySelector('video');
        if (video) {
          video.playbackRate = ${rate};
          let t = document.createElement('div');
          t.innerText = '${msg}';
          t.style = 'position:absolute; top:20px; left:20px; background:${bgColor}; color:#fff; padding:10px 20px; border-radius:8px; z-index:999999; font-weight:bold; font-size:18px; animation: fadeout 3s forwards; pointer-events: none;';
          document.body.appendChild(t);
          setTimeout(function(){ if(t) t.remove(); }, 3000);
          let s = document.createElement('style');
          s.id = 'titanium-speed-toast-style';
          if (!document.getElementById(s.id)) {
            s.innerText = '@keyframes fadeout { 0%{opacity:1;} 80%{opacity:1;} 100%{opacity:0;} }';
            document.head.appendChild(s);
          }
        }
      })();
    `
    ).catch((err) => {
      console.debug('执行倍速JS失败', err)
    })
  }

  const captureVideoFrame = async (): Promise<void> => {
    if (!videoWebview.value) return
    try {
      const dataURL = (await safeExecuteJS(
        videoWebview.value,
        `
        (function(){
          let video = document.querySelector('video');
          if (!video) return null;
          let canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          let ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/png', 1.0);
        })();
      `
      )) as string | null

      if (dataURL) {
        const link = document.createElement('a')
        link.href = dataURL
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        link.download = `Bili_Frame_${timestamp}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (e) {
      console.debug('截帧失败', e)
    }
  }

  const handleAudioMode = (mode: 'normal' | 'vocal' | 'night'): void => {
    if (!videoWebview.value) return
    const injectJS = `
      (function(targetMode) {
        try {
          let video = document.querySelector('video');
          if (!video) return 'No video found';
          if (!video.__titaniumAudioSystem) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            const source = ctx.createMediaElementSource(video);
            const vocalBoost = ctx.createBiquadFilter();
            vocalBoost.type = 'peaking'; vocalBoost.frequency.value = 2500; vocalBoost.Q.value = 1.0; vocalBoost.gain.value = 14;
            const compressor = ctx.createDynamicsCompressor();
            compressor.threshold.value = -45; compressor.knee.value = 30; compressor.ratio.value = 15; compressor.attack.value = 0.003; compressor.release.value = 0.25;
            video.__titaniumAudioSystem = { ctx, source, vocalBoost, compressor, currentNode: null };
          }
          let sys = video.__titaniumAudioSystem;
          if (sys.ctx.state === 'suspended') sys.ctx.resume();
          sys.source.disconnect();
          if (sys.currentNode) sys.currentNode.disconnect();
          if (targetMode === 'vocal') { sys.source.connect(sys.vocalBoost); sys.vocalBoost.connect(sys.ctx.destination); sys.currentNode = sys.vocalBoost; } 
          else if (targetMode === 'night') { sys.source.connect(sys.compressor); sys.compressor.connect(sys.ctx.destination); sys.currentNode = sys.compressor; } 
          else { sys.source.connect(sys.ctx.destination); sys.currentNode = null; }
          let msg = targetMode === 'vocal' ? '🎙️ 人声频段已物理增强' : (targetMode === 'night' ? '🌙 夜魔模式：动态压缩已激活' : '🎧 频段已恢复直通原声');
          let color = targetMode === 'vocal' ? '#f3a034' : (targetMode === 'night' ? '#8a58d6' : '#61666d');
          let t = document.createElement('div'); t.innerText = msg;
          t.style = \`position:absolute; top:70px; left:20px; background:\${color}; color:#fff; padding:10px 20px; border-radius:8px; z-index:999999; font-weight:bold; font-size:16px; animation: fadeout 3s forwards; pointer-events: none;\`;
          document.body.appendChild(t);
          setTimeout(function(){ if(t) t.remove(); }, 2500);
          return 'Audio setup success';
        } catch(e) { return e.toString(); }
      })('${mode}');
    `
    safeExecuteJS(videoWebview.value, injectJS).catch((e) => console.error('音频劫持执行失败', e))
  }

  const handleTimeJumper = (config: { radar: boolean; intro: number; outro: number }): void => {
    if (!videoWebview.value) return
    const injectJS = `
      (function(cfg) {
        let video = document.querySelector('video');
        if (!video) return;
        if (window.__titaniumTJ_interval) clearInterval(window.__titaniumTJ_interval);
        if (window.__titaniumTJ_update) video.removeEventListener('timeupdate', window.__titaniumTJ_update);
        const showToast = (msg, color='#f04c49') => {
          let t = document.createElement('div');
          t.innerText = msg;
          t.style = \`position:absolute; top:120px; left:20px; background:\${color}; color:#fff; padding:10px 20px; border-radius:8px; z-index:999999; font-weight:bold; font-size:16px; transition: opacity 0.5s; opacity: 1; pointer-events: none; box-shadow: 0 4px 12px rgba(0,0,0,0.15);\`;
          document.body.appendChild(t);
          setTimeout(() => { if(t && t.style) t.style.opacity = '0'; }, 3000);
          setTimeout(() => { if(t && t.parentElement) t.parentElement.removeChild(t); }, 3500);
        };
        let wasRadarOn = window.__titanium_radar_state || false;
        if (cfg.radar && !wasRadarOn) {
          showToast('🕵️ 恰饭雷达已上线，正在实时监测弹幕...', '#1dc4ba');
        } else if (!cfg.radar && wasRadarOn) {
          showToast('📡 恰饭雷达已休眠，停止弹幕监测', '#61666d');
        }
        window.__titanium_radar_state = cfg.radar;
        if (cfg.intro > 0 || cfg.outro > 0) {
          window.__titaniumTJ_update = () => {
            if (cfg.intro > 0 && video.currentTime < cfg.intro && video.currentTime > 1) { video.currentTime = cfg.intro; showToast('⏳ 跳过 ' + cfg.intro + ' 秒片头', '#00aeec'); }
            if (cfg.outro > 0 && video.duration > 0 && (video.duration - video.currentTime) < cfg.outro && (video.duration - video.currentTime) > 1) { video.currentTime = video.duration - 0.5; showToast('⏳ 斩断片尾，跳转下一个...', '#00aeec'); }
          };
          video.addEventListener('timeupdate', window.__titaniumTJ_update);
        }
        if (cfg.radar) {
          let cooldown = 0;
          window.__titaniumTJ_interval = setInterval(() => {
            if (cooldown > 0) cooldown--;
            if (cooldown > 0 || !video || video.paused) return;
            let dmWrap = document.querySelector('.bpx-player-row-dm-wrap') || document.querySelector('.bili-danmaku-x');
            if (!dmWrap) return;
            let screenText = dmWrap.innerText || '';
            const targetKws = ['恰饭', '防不胜防', '跳过', '卖课', '猝不及防', '广告', '非战斗人员'];
            let hitCount = 0; 
            targetKws.forEach(kw => { hitCount += (screenText.match(new RegExp(kw, 'g')) || []).length; });
            if (hitCount >= 3) { 
              video.currentTime += 15; 
              cooldown = 15;
              showToast('🛡️ 雷达预警！前方弹幕涉嫌广告高能，规避 15 秒！'); 
            }
          }, 1000); 
        }
      })(${JSON.stringify(config)});
    `
    safeExecuteJS(videoWebview.value, injectJS).catch((e) => console.error('TimeJumper执行失败', e))
  }

  const NATIVE_UI_CSS = `
    .bili-header, #biliMainHeader, #bili-header-container, .international-header,
    .bili-mini-header, .header-channel, .header-channel-fixed, div[class*="bili-header"],
    .search-input-container, .search-sticky-header, .fixed-header, .bili-header__bar,
    .palette-button-wrap, .elevator, .bpx-player-ctrl-top {
      display: none !important; opacity: 0 !important; visibility: hidden !important; 
      width: 0 !important; height: 0 !important; border: none !important; margin: 0 !important;
      position: absolute !important; top: -9999px !important; pointer-events: none !important;
    }
    :root, body, html { --bili-header-height: 0px !important; --bili-mini-header-height: 0px !important; }
    .bili-layout { padding: 10px 40px 20px !important; width: 100% !important; max-width: none !important; box-sizing: border-box !important; }
    main[class*="bili-feed"], .bili-feed4-layout, .bilibili-layout { margin-left: auto !important; margin-right: auto !important; padding-left: 0 !important; width: 100% !important; max-width: none !important; }
    html.titanium-zen-mode body { overflow: hidden !important; background: #000 !important; }
    html.titanium-zen-mode .bpx-player-container, html.titanium-zen-mode #bilibili-player, html.titanium-zen-mode .bpx-player-primary-area {
      position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important;
      max-width: none !important; max-height: none !important; z-index: 9999999 !important; border-radius: 0 !important;
      box-shadow: none !important; background: #000 !important;
    }
    html.titanium-zen-mode .bpx-player-ctrl-web { display: none !important; }
  `

  const updateThemeJS = (): void => {
    const code = `
      (function(){
        try {
          document.documentElement.setAttribute('data-theme', '${isDarkMode.value ? 'dark' : 'light'}');
          document.body.setAttribute('data-color-mode', '${isDarkMode.value ? 'dark' : 'light'}');
          localStorage.setItem('theme_style', '${isDarkMode.value ? 'dark' : 'light'}');
        } catch(e) { }
        let styleTag = document.getElementById('titanium-theme-manager');
        if (!styleTag) { styleTag = document.createElement('style'); styleTag.id = 'titanium-theme-manager'; document.head.appendChild(styleTag); }
        if (${isDarkMode.value}) {
          styleTag.textContent = \`
            :root, html, body {
              --bg1: #18191c !important; --bg1_float: #18191c !important;
              --bg2: #222325 !important; --bg2_float: #222325 !important;
              --bg3: #2b2c2f !important; --bg3_float: #2b2c2f !important;
              --bg_white: #18191c !important;
              --text1: #e3e5e7 !important; --text2: #9499a0 !important; --text3: #797f87 !important; --text4: #61666d !important;
              --line_regular: #363738 !important; --line_light: #2b2c2f !important;
              background-color: var(--bg1) !important; color: var(--text1) !important;
            }
            body .bpx-player-sending-area, body #bilibili-player .bpx-player-sending-area, body .bpx-player-video-info { background-color: var(--bg1) !important; background: var(--bg1) !important; border-top: 1px solid var(--line_regular) !important; }
            body .bpx-player-dm-input, body .bui-input { background-color: var(--bg2) !important; border: 1px solid var(--line_light) !important; color: var(--text1) !important; }
            body .bpx-player-dm-btn-send { background-color: rgba(0, 174, 236, 0.15) !important; color: #00aeec !important; border: none !important; }
            body .tag-link, body .v-tag, body .tag-item, body .channel-link, body .tag-val { background-color: var(--bg2) !important; background: var(--bg2) !important; color: var(--text2) !important; border: 1px solid var(--line_light) !important; }
            body .bili-video-card__info, body .bili-live-card__info { background-color: var(--bg1) !important; background: var(--bg1) !important; }
            body .bili-video-card__wrap::before, body .bili-video-card__wrap::after, body .card-layer, body [class*="bangumi"]::before, body [class*="bangumi"]::after { display: none !important; background: transparent !important; }
            body .video-pod, body .video-pod__header, body .video-pod__body, body .bui-collapse-wrap, body .bui-collapse-header, body .bui-collapse-body { background-color: var(--bg1) !important; background: var(--bg1) !important; border-color: var(--line_light) !important; box-shadow: none !important; }
            body .pod-item:hover, body .bui-collapse-item:hover { background-color: var(--bg2) !important; }
            body input[placeholder*="搜索历史记录"],
            body input[placeholder*="历史"],
            body .b-page .header input,
            body .history-wrap input[type="text"] {
              background-color: transparent !important;
              background: transparent !important;
              color: var(--text1) !important;
              box-shadow: none !important;
              border: none !important;
              outline: none !important;
            }
            body input[placeholder*="搜索历史记录"]::placeholder {
              color: var(--text3) !important;
            }
            body .b-page .header [class*="search"], 
            body .history-wrap [class*="search"],
            body .b-page .search-box, 
            body .b-page .search-input {
              background-color: transparent !important;
              background: transparent !important;
            }
            body #l-con, body #r-con, body #b-wrap, body #b-main, body #b-page-body, body .b-page, body .history-wrap, body .account-history-wrap, body .s-space, body .layout-page, body .main-container {
              background: transparent !important; background-color: transparent !important; box-shadow: none !important; border: none !important;
            }
            body .history-list, body .history-content, body .history-panel, body .history-record, body .history-item, body .b-row, body .r-info, body .r-txt, body .w-info, body .b-space-card {
              background: transparent !important; background-color: transparent !important; transition: background-color 0.2s !important;
            }
            body .history-record > div, body .history-record > div > div, body .history-item > div, body .history-item > div > div { background-color: transparent !important; }
            body #b-row, body .history-record, body .history-item, body .b-row { border-bottom: 2px solid var(--line_regular) !important; }
            body .history-record:hover, body .history-item:hover, body .b-row:hover { background-color: var(--bg2) !important; border-radius: 6px !important; }
            body .history-record .title, body .history-item .title, body .b-row .title, body #b-row .title { color: var(--text1) !important; }
            body .history-record .desc, body .history-record .name, body .history-record .time, body .history-record .info, body .history-item .desc, body .history-item .name, body .history-item .time, body .history-item .info, body .b-row .name, body .b-row .time, body .b-row .info, body #b-row .name, body #b-row .time, body #b-row .info { color: var(--text3) !important; }
            body .history-wrap .title, body .header-history .title, body [class*="history-"][class*="title"] { color: var(--text2) !important; }
            body .b-page-body, body .b-page { background: transparent !important; }
          \`;
        } else { styleTag.textContent = ''; }
        document.documentElement.classList.toggle('titanium-zen-mode', ${isZenMode.value});
      })();
    `
    try {
      if (browserWebview.value) {
        safeExecuteJS(browserWebview.value, code).catch(() => {})
      }
    } catch {
      // silent fail
    }
    try {
      if (videoWebview.value) {
        safeExecuteJS(videoWebview.value, code).catch(() => {})
      }
    } catch {
      // silent fail
    }
  }

  const forceUIInject = (): void => {
    if (forceUIInjectTimer) clearTimeout(forceUIInjectTimer)
    forceUIInjectTimer = setTimeout(() => {
      try {
        if (browserWebview.value) {
          browserWebview.value.insertCSS(NATIVE_UI_CSS).catch(() => {})
        }
      } catch {
        // silent fail
      }
      try {
        if (videoWebview.value) {
          videoWebview.value.insertCSS(NATIVE_UI_CSS).catch(() => {})
        }
      } catch {
        // silent fail
      }
      updateThemeJS()
    }, 300)
  }

  const INJECT_SCRIPT = `
    (function() {
      const isTarget = function(href) { if (!href) return false; return href.includes('/video/') || href.includes('/bangumi/play/'); };
      const oriWindowOpen = window.open;
      window.open = function(url, name, features) {
        if (url) { 
          if (url.includes('bilibili.com/video/') && document.querySelector('.bpx-player-container')) {
             let video = document.querySelector('video');
             if (video && video.paused) video.play(); 
             return null;
          }
          const aUrl = document.createElement('a'); aUrl.href = url; 
          if (isTarget(aUrl.href)) { console.log('__BILI_NAV__:' + aUrl.href); return null; } 
          window.location.href = aUrl.href; 
        }
        return null;
      };
      document.addEventListener('click', function(e) {
        let n = e.target;
        let playerArea = document.querySelector('.bpx-player-container, .bilibili-player-video-wrap');
        while(n && n !== document.body) {
          if (n.tagName === 'A') {
            if (playerArea && playerArea.contains(e.target)) {
               e.preventDefault();
               e.stopImmediatePropagation();
               let controlBar = document.querySelector('.bpx-player-control-wrap');
               if (controlBar && controlBar.contains(e.target)) {
                 return;
               }
               let video = document.querySelector('video');
               if (video) {
                 video.paused ? video.play() : video.pause();
               }
               return;
            }
            const aTag = document.createElement('a'); aTag.href = n.href;
            if (isTarget(aTag.href)) { 
               e.preventDefault(); 
               e.stopImmediatePropagation(); 
               console.log('__BILI_NAV__:' + aTag.href); 
               return; 
            }
            if (n.target === '_blank') n.target = '_self'; 
          } 
          n = n.parentNode;
        }
      }, true);
    })();
  `

  const handleVideoChange = (videoTitle: string): void => {
    if (window.api && window.api.emitVibe) {
      window.api.emitVibe({ type: 'video-change', title: videoTitle })
    }
  }

  const handleDanmaku = (text: string): void => {
    if (window.api && window.api.emitVibe && text.length > 2) {
      window.api.emitVibe({ type: 'danmaku', content: text })
    }
  }

  const handleSubtitleChange = (subtitleText: string): void => {
    if (window.api && window.api.emitVibe) {
      window.api.emitVibe({ type: 'subtitle', content: subtitleText })
    }
  }

  const linkSnapshotsToClip = (clip: Clip): void => {
    const nearbyDanmaku = allDanmakuSnapshots.value.filter((d) => Math.abs(d.time - clip.time) <= 2)
    const nearbySubtitle = allSubtitleSnapshots.value.filter(
      (s) => Math.abs(s.time - clip.time) <= 2
    )
    clip.danmakuSnapshots = nearbyDanmaku
    clip.subtitleSnapshots = nearbySubtitle
    const isHighEnergy =
      nearbyDanmaku.length >= 3 ||
      (nearbySubtitle.length > 0 && /关键|爆|神|绝|卧槽|牛/.test(nearbySubtitle[0].text))
    if (isHighEnergy && !clip.isAuto) {
      clip.title = `[🔥高能] ${clip.title}`
    }
  }

  const createClipFromCurrent = async (): Promise<void> => {
    if (!videoWebview.value || currentBvid.value === 'unknown') return
    try {
      const currentTime = (await safeExecuteJS(
        videoWebview.value,
        `document.querySelector('video')?.currentTime || 0`
      )) as number
      const isTooClose = currentVideoClips.value.some((c) => Math.abs(c.time - currentTime) < 1.5)
      if (isTooClose) {
        console.warn('防重复触发：距离上一个切片距离太近')
        safeExecuteJS(videoWebview.value,
          `(function(){
              let t = document.createElement('div');
              t.id = 'titanium-clip-warn';
              let old = document.getElementById(t.id);
              if (old) old.remove();
              t.innerText = '⚠️ 刀法太快啦！此处附近已经切过一刀了';
              t.style = 'position:absolute; top:80px; left:20px; background:#f04c49; color:#fff; padding:10px 20px; border-radius:8px; z-index:999999; font-weight:bold; box-shadow: 0 4px 12px rgba(240,76,73,0.3); animation: fadeout 3s forwards; pointer-events: none;';
              document.body.appendChild(t);
              setTimeout(() => { if(t) t.remove() }, 3000);
            })();`
        ).catch(() => {})
        return
      }
      const videoTitle = (await safeExecuteJS(videoWebview.value, `document.title`)) as string
      const screenshot = (await safeExecuteJS(videoWebview.value,
        `(function(){
           let v = document.querySelector('video');
           if (!v) return null;
           let c = document.createElement('canvas');
           c.width = v.videoWidth;
           c.height = v.videoHeight;
           let ctx = c.getContext('2d');
           ctx.drawImage(v, 0, 0, c.width, c.height);
           return c.toDataURL('image/jpeg', 0.6);
        })()`
      )) as string | null
      const newClip: Clip = {
        id: `clip-${Date.now()}`,
        time: currentTime,
        screenshot,
        title: `${videoTitle.substring(0, 10)}... - 标记 ${currentVideoClips.value.length + 1}`,
        isAuto: false
      }
      linkSnapshotsToClip(newClip)
      if (!allClipsMap.value[currentBvid.value]) {
        allClipsMap.value[currentBvid.value] = []
      }
      allClipsMap.value[currentBvid.value].push(newClip)
      localStorage.setItem('bili-clips-map', JSON.stringify(allClipsMap.value))
      safeExecuteJS(videoWebview.value,
        `(function(){
            let t = document.createElement('div');
            t.innerText = '🎯 已存入 ${currentBvid.value} 切片集';
            t.style = 'position:absolute; top:80px; left:20px; background:#fb7299; color:#fff; padding:10px 20px; border-radius:8px; z-index:999999; font-weight:bold; animation: fadeout 3s forwards; pointer-events: none;';
            document.body.appendChild(t);
          setTimeout(() => t.remove(), 3000);
        })();`
      ).catch(() => {})
    } catch (err) {
      console.error('新建切片失败:', err)
    }
  }

  const onDidNavigate = (e: { url: string }, source: 'browser' | 'video'): void => {
    const url = e.url
    if (source === 'browser') {
      if (isVideoUrl(url)) {
        poppedVideoUrls.value = []
        browserWebview.value?.goBack()
        currentUrl.value = url
        isHardLoading.value = true
        isZenMode.value = false
        videoWebview.value?.loadURL(url)
      } else {
        if (!isBiliVideo.value) {
          currentUrl.value = url
          forceUIInject()
        }
      }
    } else if (source === 'video') {
      if (!isVideoUrl(url) && !url.includes('about:blank')) {
        videoWebview.value?.loadURL('about:blank')
        currentUrl.value = url
        isHardLoading.value = true
        browserWebview.value?.loadURL(url)
      } else if (isBiliVideo.value) {
        currentUrl.value = url
        isZenMode.value = false
        forceUIInject()
      }
    }
  }

  const onTabDidNavigate = (e: { url: string }, tabId: string): void => {
    injectedFlags[tabId] = false
    if (currentTab.value !== tabId) return
    const url = e.url
    if (isVideoUrl(url)) {
      poppedVideoUrls.value = []
      tabWebviews[tabId]?.goBack()
      currentUrl.value = url
      isHardLoading.value = true
      isZenMode.value = false
      videoWebview.value?.loadURL(url)
    } else {
      if (!isBiliVideo.value) {
        currentUrl.value = url
        forceUIInject()
      }
    }
  }

  const AI_VIBE_SCRIPT = `(function(){try{if(window.__titaniumVibeInjected)return;window.__titaniumVibeInjected=true;setTimeout(()=>{let t=document.title||document.querySelector("h1.video-title")?.innerText||"";if(t)console.log("__BILI_TITLE__:"+t)},2e3);let l=0;const d=new MutationObserver(m=>{let n=Date.now();if(n-l<1e4)return;for(let x of m)if(x.addedNodes.length>0){let o=x.addedNodes[0],t=o.innerText||o.textContent;if(t&&t.length>3){console.log("__BILI_DANMAKU_SNAPSHOT__:"+JSON.stringify({time:n,text:t}));console.log("__BILI_DANMAKU__:"+t);l=n;break}}});let i=setInterval(()=>{let w=document.querySelector(".bpx-player-row-dm-wrap")||document.querySelector(".bili-danmaku-x");if(w){d.observe(w,{childList:true,subtree:true});clearInterval(i)}},1500);setInterval(()=>{let v=document.querySelector("video");if(v&&v.duration)console.log("__BILI_DURATION__:"+v.duration)},1e3);let s=0,c="";const u=new MutationObserver(()=>{let w=document.querySelector(".bpx-player-row-subtitle")||document.querySelector(".bilibili-player-video-subtitle")||document.querySelector(".vp-subtitle-wrap");if(!w)return;let t=(w.innerText||w.textContent||"").replace(/\\s+/g," ").trim();if(t&&t!==c){let n=Date.now();console.log("__BILI_SUBTITLE_SNAPSHOT__:"+JSON.stringify({time:n,text:t}));c=t;if(n-s>3e3){console.log("__BILI_SUBTITLE__:"+c);s=n}}else if(!t&&c){c="";console.log("__BILI_SUBTITLE__:[字幕消失]")}});let f=setInterval(()=>{let w=document.querySelector(".bpx-player-row-subtitle")||document.querySelector(".bilibili-player-video-subtitle")||document.querySelector(".vp-subtitle-wrap");if(w){u.observe(w,{childList:true,subtree:true,characterData:true});clearInterval(f)}},2e3)}catch(e){console.error("__BILI_VIBE_INIT_ERROR__:",e&&e.message)}})();`

const onStopLoading = (source: 'browser' | 'video'): void => {
    const wb = source === 'video' ? videoWebview.value : browserWebview.value
    safeExecuteJS(wb, INJECT_SCRIPT).catch(() => {})
    forceUIInject()

    if ((source === 'video' && isBiliVideo.value) || (source === 'browser' && !isBiliVideo.value)) {
      if (renderWaitTimeout) clearTimeout(renderWaitTimeout)
      renderWaitTimeout = setTimeout(() => {
        isHardLoading.value = false
        isFirstLoad.value = false
      }, 50)
    }
  }

  const onTabStopLoading = (tabId: string): void => {
    const wb = tabWebviews[tabId]
    if (!wb) return
    if (!injectedFlags[tabId]) {
      injectedFlags[tabId] = true
      safeExecuteJS(wb, INJECT_SCRIPT).catch(() => {})
      forceUIInject()
    }
    // 💥 后台 Tab 加载完成后立即暂停媒体，避免背景 webview 自动播放直播/视频
    // B站直播页的视频元素可能延迟加载，使用 MutationObserver + 轮询双保险
    if (currentTab.value !== tabId) {
      safeExecuteJS(
        wb,
        `(function(){const pauseAll=()=>document.querySelectorAll('video,audio').forEach(m=>{m.pause();m.muted=true;});pauseAll();const obs=new MutationObserver(ms=>{ms.forEach(m=>{m.addedNodes.forEach(n=>{if(n.tagName==='VIDEO'||n.tagName==='AUDIO'){n.pause();n.muted=true;}});});});obs.observe(document.body,{childList:true,subtree:true});setTimeout(()=>{pauseAll();obs.disconnect();},8000);})();`
      ).catch(() => {})
    }
    // 已加载过的 Tab 也要清除 loading，避免快速切换时卡在 loading
    if (currentTab.value === tabId && !isBiliVideo.value) {
      if (renderWaitTimeout) clearTimeout(renderWaitTimeout)
      renderWaitTimeout = setTimeout(() => {
        isHardLoading.value = false
        isFirstLoad.value = false
      }, 50)
    }
  }

  const navTo = (tabName: string, url: string): void => {
    const normalizeUrl = (u: string): string => u.replace(/\/$/, '')
    if (
      currentTab.value === tabName &&
      normalizeUrl(currentUrl.value) === normalizeUrl(url)
    )
      return
    poppedVideoUrls.value = []
    currentTab.value = tabName
    currentUrl.value = url
    isZenMode.value = false
    // 只有首次加载该 Tab 时才显示 loading，已缓存的 Tab 直接切过去
    if (!injectedFlags[tabName]) {
      isHardLoading.value = true
    }
    videoWebview.value?.loadURL('about:blank')
  }

  const webviewGoBack = (): void => {
    isZenMode.value = false
    if (isBiliVideo.value) {
      poppedVideoUrls.value.push(currentUrl.value)
      if (renderWaitTimeout) clearTimeout(renderWaitTimeout)
      isHardLoading.value = true
      currentUrl.value = browserWebview.value?.getURL() || 'https://www.bilibili.com'
      videoWebview.value?.loadURL('about:blank')
      isHardLoading.value = false
    } else if (browserWebview.value && browserWebview.value.canGoBack()) {
      browserWebview.value.goBack()
    }
  }

  const webviewGoForward = (): void => {
    isZenMode.value = false
    if (!isBiliVideo.value && poppedVideoUrls.value.length > 0) {
      const nextVideo = poppedVideoUrls.value.pop()
      if (nextVideo) {
        isHardLoading.value = true
        currentUrl.value = nextVideo
        videoWebview.value?.loadURL(nextVideo)
        return
      }
    }
    if (activeWebview.value && activeWebview.value.canGoForward()) {
      activeWebview.value.goForward()
    }
  }

  const webviewReload = (): void => {
    isZenMode.value = false
    activeWebview.value?.reload()
  }

  const injectBlackMagic = (): void => {
    const webview = activeWebview.value
    if (!webview) return
    const autoZenith = localStorage.getItem('bili-auto-zenith') === 'true'
    const autoMaxQuality = localStorage.getItem('bili-auto-max-quality') === 'true'
    const autoCleanPopups = localStorage.getItem('bili-auto-clean-popups') === 'true'
    if (autoCleanPopups) {
      webview
        .insertCSS(
          `.bpx-player-ending-wrap, .bpx-player-cmd-dm-wrap, .bilibili-player-electric-panel, .bpx-player-score-uncheck, .bpx-player-toast-auto { display: none !important; opacity: 0 !important; pointer-events: none !important; }`
        )
        .catch(() => {})
    }
    const blockList = JSON.parse(localStorage.getItem('bili-block-keywords') || '[]')
    if (blockList.length > 0) {
      const filterJS = `(function(){ 
        let keywords = ${JSON.stringify(blockList)}; 
        let cleanUp = () => { 
          let cards = document.querySelectorAll('.bili-video-card, .bili-live-card, .floor-card, .feed-card, .b-img'); 
          cards.forEach(card => { 
            if (card.dataset.clean === 'true') return; 
            let text = card.textContent || ''; 
            if (keywords.some(kw => text.includes(kw))) { 
              card.style.display = 'none'; card.style.opacity = '0'; card.style.pointerEvents = 'none'; 
            } 
            card.dataset.clean = 'true'; 
          }); 
        }; 
        cleanUp(); 
        setInterval(cleanUp, 2000);
      })();`
      safeExecuteJS(webview, filterJS).catch(() => {})
    }
    if (autoZenith || autoMaxQuality) {
      const jsCode = `(function() { let tries = 0; let config = { zenith: ${autoZenith}, maxQuality: ${autoMaxQuality} }; const observerFunc = setInterval(() => { tries++; if (tries > 20) { clearInterval(observerFunc); return; } if (config.zenith) { const webFsBtn = document.querySelector('.bpx-player-ctrl-web'); if (webFsBtn) { if (!webFsBtn.classList.contains('bpx-state-active')) webFsBtn.click(); config.zenith = false; } } if (config.maxQuality) { const qualityItems = document.querySelectorAll('.bpx-player-ctrl-quality-menu .bpx-player-ctrl-quality-menu-item'); if (qualityItems.length > 0) { const highest = qualityItems[0]; if (!highest.classList.contains('bpx-state-active')) highest.click(); config.maxQuality = false; } } if (!config.zenith && !config.maxQuality) clearInterval(observerFunc); }, 500); })();`
      safeExecuteJS(webview, jsCode).catch(() => {})
    }
    // 💥 修复：AI 探针必须在 dom-ready 后注入，避免 GUEST_VIEW_MANAGER_CALL 错误
    if (webview === videoWebview.value && isBiliVideo.value) {
      safeExecuteJS(videoWebview.value, AI_VIBE_SCRIPT).catch((e) => console.log('注入AI探针失败', e))
    }
  }

  const handleExtractCover = async (): Promise<void> => {
    if (!videoWebview.value) return
    try {
      const coverUrl = (await safeExecuteJS(
        videoWebview.value,
        `(function(){ let m = document.querySelector('meta[property="og:image"]') || document.querySelector('meta[itemprop="image"]'); if (m && m.content) { let url = m.content.includes('http') ? m.content : 'https:' + m.content; return url.replace('http:', 'https:'); } return null; })();`
      )) as string | null
      if (!coverUrl) return
      const rawHighResUrl = coverUrl.split('@')[0]
      const response = await fetch(rawHighResUrl)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const downloadLink = document.createElement('a')
      downloadLink.href = blobUrl
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      downloadLink.download = `Bili_Cover_${timestamp}.jpg`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.debug('提取封面失败:', err)
    }
  }

  const toggleZenMode = (): void => {
    isZenMode.value = !isZenMode.value
    updateThemeJS()
  }

  const fetchSuggests = (): void => {
    if (searchTimer) clearTimeout(searchTimer)
    if (!searchText.value.trim() || !activeWebview.value) {
      suggests.value = []
      return
    }
    searchTimer = setTimeout(async (): Promise<void> => {
      try {
        const res = await safeExecuteJS(
          activeWebview.value!,
          `fetch('https://s.search.bilibili.com/main/suggest?term=${encodeURIComponent(searchText.value)}').then(r=>r.json()).then(d=>d?.result?.tag?Object.values(d.result.tag).map(i=>({value:String(i.value||''),name:String(i.name||'')})).slice(0,10):[]).catch(()=>[])`
        )
        suggests.value = Array.isArray(res) ? res : []
        if (suggests.value.length > 0) showSearchSuggest.value = true
      } catch (err) {
        console.debug('提取搜索建议失败:', err)
      }
    }, 300)
  }

  const handleSearch = (keyword: string): void => {
    const kw = keyword.trim()
    if (!kw || !activeWebview.value) return
    const existingIdx = searchHistory.value.indexOf(kw)
    if (existingIdx > -1) searchHistory.value.splice(existingIdx, 1)
    searchHistory.value.unshift(kw)
    if (searchHistory.value.length > 10) searchHistory.value.pop()
    localStorage.setItem('bili-search-history', JSON.stringify(searchHistory.value))
    poppedVideoUrls.value = []
    searchText.value = kw
    showSearchSuggest.value = false
    currentTab.value = ''
    isZenMode.value = false
    navTo('', `https://search.bilibili.com/all?keyword=${encodeURIComponent(kw)}`)
  }

  const clearSearchHistory = (): void => {
    searchHistory.value = []
    localStorage.removeItem('bili-search-history')
  }

  const handleAutoDownloadPush = (): void => {
    if (accounts.value.length > 1) showDownloadModal.value = true
    else executeDownload(selectedPartition.value || 'default')
  }

  const executeDownload = (partition: string): void => {
    const raw = currentUrl.value
    if (!raw.match(/(BV[1-9A-HJ-NP-Za-km-z]+)/i) && !raw.match(/ep([0-9]+)/i)) return
    localStorage.setItem('bilibili-handoff-url', raw)
    localStorage.setItem('bilibili-handoff-partition', partition)
    window.dispatchEvent(new CustomEvent('app-command-nav', { detail: 'downloader' }))
    showDownloadModal.value = false
  }

  const handlePopCurrent = async (): Promise<void> => {
    const bvMatch = currentUrl.value.match(/(BV[1-9A-HJ-NP-Za-km-z]+)/i)
    if (!bvMatch) return
    if (videoWebview.value) {
      safeExecuteJS(
        videoWebview.value,
        `
        (function(){
          let video = document.querySelector('video');
          if (video && !video.paused) {
            video.pause();
          }
        })();
      `
      ).catch((e) => console.log('暂停主窗口失败:', e))
    }
    await window.api.openPlayer(bvMatch[1], selectedPartition.value)
  }

  const handleConsoleMessage = (e: ConsoleMessageEvent): void => {
    if (typeof e.message !== 'string') return
    if (e.message.startsWith('__BILI_NAV__:')) {
      currentUrl.value = e.message.substring(13).trim()
      isHardLoading.value = true
      isZenMode.value = false
      videoWebview.value?.loadURL(currentUrl.value)
    } else if (e.message.startsWith('__BILI_TITLE__:')) {
      handleVideoChange(e.message.replace('__BILI_TITLE__:', '').trim())
    } else if (e.message.startsWith('__BILI_DANMAKU__:')) {
      handleDanmaku(e.message.replace('__BILI_DANMAKU__:', '').trim())
    } else if (e.message.startsWith('__BILI_SUBTITLE__:')) {
      handleSubtitleChange(e.message.replace('__BILI_SUBTITLE__:', '').trim())
    } else if (e.message.startsWith('__BILI_DANMAKU_SNAPSHOT__')) {
      const payload = JSON.parse(e.message.substring(26))
      allDanmakuSnapshots.value.push(payload)
      if (allDanmakuSnapshots.value.length > 500) allDanmakuSnapshots.value.shift()
    } else if (e.message.startsWith('__BILI_SUBTITLE_SNAPSHOT__')) {
      const payload = JSON.parse(e.message.substring(28))
      allSubtitleSnapshots.value.push(payload)
      if (allSubtitleSnapshots.value.length > 500) allSubtitleSnapshots.value.shift()
    } else if (e.message.startsWith('__BILI_DURATION__:')) {
      const d = parseFloat(e.message.replace('__BILI_DURATION__:', ''))
      if (!isNaN(d) && d > 0) videoDuration.value = d
    }
  }

  const switchAccount = (partition: string): void => {
    if (selectedPartition.value === partition) return
    isHardLoading.value = true
    selectedPartition.value = partition
    showAccountDropdown.value = false
    for (const key of Object.keys(injectedFlags)) {
      delete injectedFlags[key]
    }
  }

  onMounted(async (): Promise<void> => {
    isDarkMode.value = document.documentElement.getAttribute('data-theme') === 'dark'
    themeObserver = new MutationObserver((): void => {
      isDarkMode.value = document.documentElement.getAttribute('data-theme') === 'dark'
      updateThemeJS()
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })
    try {
      accounts.value = await window.api.getAccounts()
      const vipAcc = accounts.value.find((a) => a.isVip)
      if (vipAcc) selectedPartition.value = vipAcc.partition
      else if (accounts.value.length > 0) selectedPartition.value = accounts.value[0].partition
    } catch (err) {
      console.debug('⚠️ API 获取账号数据响应失败:', err)
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleGlobalKeyDown)
  })

  const pauseActivities = (): void => {
    if (themeObserver) {
      themeObserver.disconnect()
      themeObserver = null
    }
    if (renderWaitTimeout) {
      clearTimeout(renderWaitTimeout)
      renderWaitTimeout = null
    }
  }

  const resumeActivities = (): void => {
    if (!themeObserver) {
      themeObserver = new MutationObserver((): void => {
        isDarkMode.value = document.documentElement.getAttribute('data-theme') === 'dark'
        updateThemeJS()
      })
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      })
    }
  }

  onBeforeUnmount((): void => {
    pauseActivities()
  })

  return {
    isTimelineExpanded,
    currentSpeed,
    showClipManager,
    handleSliceTasks,
    handleGlobalKeyDown,
    handleNavigateToVideo,
    getBvidFromUrl,
    currentBvid,
    allClipsMap,
    currentVideoClips,
    timelinePanelRef,
    startDragTimeline,
    saveAllClips,
    handleJumpToTime,
    activeTimelineMarkerId,
    setActiveTimelineMarker,
    accounts,
    selectedPartition,
    currentUrl,
    showAccountDropdown,
    showDownloadModal,
    isDarkMode,
    isZenMode,
    browserWebview,
    videoWebview,
    isFirstLoad,
    isHardLoading,
    currentTab,
    isHomeActive,
    searchText,
    suggests,
    showSearchSuggest,
    searchHistory,
    poppedVideoUrls,
    islandRef,
    startDragIsland,
    currentAccount,
    isVideoUrl,
    isBiliVideo,
    activeWebview,
    showLabsModal,
    blockKeywords,
    newKeyword,
    videoDuration,
    trackRef,
    formatTime,
    quickDeleteClip,
    startDragMarker,
    openLabs,
    addKeyword,
    removeKeyword,
    forceRefreshFilter,
    forceSpeed,
    captureVideoFrame,
    handleAudioMode,
    handleTimeJumper,
    onDidNavigate,
    onStopLoading,
    onTabDidNavigate,
    onTabStopLoading,
    TAB_CONFIG,
    tabWebviews,
    setTabWebview,
    navTo,
    webviewGoBack,
    webviewGoForward,
    webviewReload,
    injectBlackMagic,
    handleExtractCover,
    toggleZenMode,
    fetchSuggests,
    handleSearch,
    clearSearchHistory,
    handleAutoDownloadPush,
    executeDownload,
    handlePopCurrent,
    handleConsoleMessage,
    switchAccount,
    createClipFromCurrent,
    forceUIInject,
    pauseActivities,
    resumeActivities
  }
}
