# 播放器 (Player) 模块技术文档

---

## 1. 核心架构：双 Webview 引擎

PlayerView 采用两个 `<webview>` 标签协同工作，实现"浏览-播放"分离体验：

```
┌─────────────────────────────────────────────┐
│                 PlayerView                   │
│  ┌───────────────────────────────────────┐  │
│  │  browserWebview                        │  │
│  │  src="https://www.bilibili.com"        │  │
│  │  partition="persist:bili-acc-{ts}"     │  │
│  │                                        │  │
│  │  用途：浏览首页/搜索/动态/空间          │  │
│  │  显示条件：!isBiliVideo                 │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │  videoWebview                          │  │
│  │  src="about:blank"                     │  │
│  │  partition="persist:bili-acc-{ts}"     │  │
│  │                                        │  │
│  │  用途：纯净视频播放                     │  │
│  │  显示条件：isBiliVideo                  │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  导航栏 ──► navTo(tab, url)                  │
│  搜索框 ──► handleSearch(keyword)            │
│  账号切换 ──► switchAccount(partition)       │
└─────────────────────────────────────────────┘
```

---

## 2. URL 路由决策

### 2.1 自动视图切换

```typescript
const isVideoUrl = (url: string): boolean =>
  url.includes('/video/') || url.includes('/bangumi/play/')

const isBiliVideo = computed(() => isVideoUrl(currentUrl.value))
```

**浏览模式 → 视频模式：**
```
browserWebview 导航到视频 URL
  → @did-navigate 触发
  → isVideoUrl(url) === true
  → browserWebview.goBack()      // 回退到上一页
  → currentUrl = url
  → videoWebview.loadURL(url)    // 加载到视频 webview
  → isBiliVideo = true           // 切换显示
```

**视频模式 → 浏览模式：**
```
用户点击后退
  → poppedVideoUrls.push(currentUrl)
  → videoWebview.loadURL('about:blank')
  → currentUrl = browserWebview.getURL()
  → isBiliVideo = false
```

---

## 3. CSS/JS 注入系统

### 3.1 原生 UI 净化

```typescript
const NATIVE_UI_CSS = `
  .bili-header, #biliMainHeader, .international-header,
  .palette-button-wrap, .elevator, .bpx-player-ctrl-top {
    display: none !important;
  }
  .bili-layout {
    padding: 10px 40px 20px !important;
    width: 100% !important;
  }
`

const forceUIInject = (): void => {
  browserWebview.value?.insertCSS(NATIVE_UI_CSS)
  videoWebview.value?.insertCSS(NATIVE_UI_CSS)
}
```

### 3.2 主题同步

```typescript
const updateThemeJS = (): void => {
  const code = `
    document.documentElement.setAttribute('data-theme', '${isDarkMode.value ? 'dark' : 'light'}');
    // 注入暗色模式 CSS 变量覆盖...
  `
  browserWebview.value?.executeJavaScript(code)
  videoWebview.value?.executeJavaScript(code)
}
```

### 3.3 链接劫持（阻止弹窗）

```typescript
const INJECT_SCRIPT = `
  (function() {
    const isTarget = (href) => href.includes('/video/') || href.includes('/bangumi/play/');

    // 劫持 window.open
    window.open = function(url) {
      if (url && isTarget(url)) {
        console.log('__BILI_NAV__:' + url);
        return null;
      }
      window.location.href = url;
      return null;
    };

    // 劫持点击事件
    document.addEventListener('click', function(e) {
      let n = e.target;
      while(n && n !== document.body) {
        if (n.tagName === 'A') {
          if (isTarget(n.href)) {
            e.preventDefault();
            console.log('__BILI_NAV__:' + n.href);
            return;
          }
          if (n.target === '_blank') n.target = '_self';
        }
        n = n.parentNode;
      }
    }, true);
  })();
`
```

---

## 4. 控制台消息协议

webview 通过 `console.log` 与渲染进程通信：

| 消息前缀 | 方向 | 数据 | 说明 |
|---------|------|------|------|
| `__BILI_NAV__:` | webview → Vue | URL | 用户点击了视频链接 |
| `__BILI_TITLE__:` | webview → Vue | 标题 | 视频标题变化 |
| `__BILI_DANMAKU__:` | webview → Vue | 弹幕文本 | 弹幕吐槽触发 |
| `__BILI_SUBTITLE__:` | webview → Vue | 字幕文本 | 字幕变化 |
| `__BILI_DANMAKU_SNAPSHOT__` | webview → Vue | JSON | 弹幕快照（切片用） |
| `__BILI_SUBTITLE_SNAPSHOT__` | webview → Vue | JSON | 字幕快照（切片用） |
| `__BILI_DURATION__:` | webview → Vue | 秒数 | 视频总时长 |

```typescript
const handleConsoleMessage = (e: ConsoleMessageEvent): void => {
  if (e.message.startsWith('__BILI_NAV__:')) {
    currentUrl.value = e.message.substring(13).trim()
    videoWebview.value?.loadURL(currentUrl.value)
  } else if (e.message.startsWith('__BILI_TITLE__:')) {
    handleVideoChange(e.message.replace('__BILI_TITLE__:', '').trim())
  } else if (e.message.startsWith('__BILI_DANMAKU_SNAPSHOT__')) {
    allDanmakuSnapshots.value.push(JSON.parse(e.message.substring(26)))
  }
  // ...
}
```

---

## 5. 切片系统

### 5.1 切片数据结构

```typescript
interface Clip {
  id: string           // clip-${Date.now()}
  time: number         // 秒（如 123.45）
  title?: string
  screenshot?: string | null   // Base64 截图
  danmakuSnapshots?: { time: number; text: string }[]
  subtitleSnapshots?: { time: number; text: string }[]
  isAuto?: boolean     // 是否自动标记
}

// 全局切片字典
const allClipsMap = ref<Record<string, Clip[]>>({})
```

### 5.2 创建切片

快捷键 `Alt + C` 触发：

```typescript
const createClipFromCurrent = async (): Promise<void> => {
  const currentTime = await videoWebview.value.executeJavaScript(
    `document.querySelector('video')?.currentTime || 0`
  )

  // 防重复：距离太近（<1.5秒）则拒绝
  const isTooClose = currentVideoClips.value.some(
    c => Math.abs(c.time - currentTime) < 1.5
  )
  if (isTooClose) { /* 显示警告 */ return }

  // 截图
  const screenshot = await videoWebview.value.executeJavaScript(`
    (() => {
      const v = document.querySelector('video');
      const c = document.createElement('canvas');
      c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext('2d').drawImage(v, 0, 0);
      return c.toDataURL('image/jpeg', 0.6);
    })()
  `)

  const clip: Clip = {
    id: `clip-${Date.now()}`,
    time: currentTime,
    screenshot,
    title: `${videoTitle.substring(0, 10)}... - 标记 ${n + 1}`,
    isAuto: false
  }

  // 关联附近弹幕和字幕
  linkSnapshotsToClip(clip)

  allClipsMap.value[currentBvid.value].push(clip)
  localStorage.setItem('bili-clips-map', JSON.stringify(allClipsMap.value))
}
```

### 5.3 时间轴渲染

```vue
<div ref="trackRef" class="timeline-track">
  <div
    v-for="clip in currentVideoClips"
    :key="clip.id"
    class="timeline-marker"
    :style="{ left: (clip.time / videoDuration) * 100 + '%' }"
    @mousedown.stop="startDragMarker($event, clip)"
  >
    <div class="marker-thumb" />
    <div class="marker-popover">
      <div class="popover-time">{{ formatTime(clip.time) }}</div>
      <button @mousedown.stop="quickDeleteClip(clip.id)">移除</button>
    </div>
  </div>
</div>
```

---

## 6. 极客实验室

### 6.1 虚空索敌（关键词过滤）

```typescript
const blockKeywords = ref<string[]>(
  JSON.parse(localStorage.getItem('bili-block-keywords') || '[]')
)

const injectBlackMagic = (): void => {
  const filterJS = `(function(){
    const keywords = ${JSON.stringify(blockKeywords.value)};
    setInterval(() => {
      document.querySelectorAll('.bili-video-card').forEach(card => {
        if (keywords.some(kw => card.textContent.includes(kw))) {
          card.style.display = 'none';
        }
      });
    }, 2000);
  })();`
  activeWebview.value?.executeJavaScript(filterJS)
}
```

### 6.2 引擎超频（倍速）

```typescript
const forceSpeed = (rate: number): void => {
  videoWebview.value?.executeJavaScript(`
    document.querySelector('video').playbackRate = ${rate};
  `)
}
```

### 6.3 音频模式

通过 `AudioContext` + `BiquadFilter` 实现：
- **Bass Boost**: lowshelf filter, freq=100, gain=15
- **Vocal Enhance**: peaking filter, freq=3000, gain=10
- **Night Mode**: dynamics compressor

---

## 7. 搜索建议系统

```typescript
const fetchSuggests = (): void => {
  if (!searchText.value.trim() || !activeWebview.value) return

  searchTimer = setTimeout(async () => {
    const res = await activeWebview.value!.executeJavaScript(`
      fetch('https://s.search.bilibili.com/main/suggest?term=${encodeURIComponent(searchText.value)}')
        .then(r => r.json())
        .then(d => d?.result?.tag ? ... : [])
        .catch(() => [])
    `)
    suggests.value = Array.isArray(res) ? res : []
  }, 300)
}
```

**特点**：利用 webview 已有的 Bilibili Cookie 和 CORS 权限，直接在页面内调用搜索建议 API。
