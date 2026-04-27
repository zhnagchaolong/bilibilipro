# 视频下载模块技术文档

---

## 1. 整体流程

```
用户输入 BV 号/链接
    │
    ▼
┌─────────────────┐
│  解析阶段        │
│  parseVideo()   │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Bilibili │
    │   API    │
    └────┬────┘
         │
    ┌────▼─────────────────────────────┐
    │  /x/web-interface/view          │  获取视频元数据（标题、封面、分P）
    │  /x/player/playurl              │  获取 DASH 流地址（视频+音频分离）
    └────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  ParsedResult                        │
│  {                                   │
│    title, pic,                       │
│    audioUrl, audioBandwidth,         │
│    qualities: [                      │
│      { id, label, url, bandwidth }   │
│    ],                                │
│    pages: [ { cid, page, part } ]    │
│  }                                   │
└──────────────────────────────────────┘
         │
         ▼
用户选择画质 + 分 P + 保存路径
         │
         ▼
┌─────────────────┐
│  下载阶段        │
│ downloadVideo() │
└────────┬────────┘
         │
    ┌────▼─────────────────────────────────┐
    │ 并发下载：                             │
    │   - 视频流 (fetch + Node Stream)       │
    │   - 音频流 (fetch + Node Stream)       │
    │ 每 500ms 推送进度到前端                 │
    └────┬───────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ FFmpeg 合并 (copy 编解码器，不重新编码) │
│ ffmpeg -i video.m4s -i audio.m4s     │
│        -c copy output.mp4            │
└──────────────────────────────────────┘
         │
         ▼
    完成 / 失败通知
```

---

## 2. 解析阶段详解

### 2.1 API 调用链

```typescript
// videoIpc.ts
async function parseVideo(bvid: string, partitionKey?: string) {
  // 1. 获取视频基本信息
  const viewRes = await fetch(`${API_URLS.VIEW}?bvid=${bvid}`, {
    headers: { ...BILI_HEADERS, Cookie: await getBestBiliCookie(partitionKey) }
  })
  const viewData = await viewRes.json()

  // 2. 获取 DASH 流地址
  const cid = viewData.data.pages[0].cid
  const playUrlRes = await fetch(
    `${API_URLS.PLAY_URL}?bvid=${bvid}&cid=${cid}&qn=126&fnver=0&fnval=4048&fourk=1`,
    { headers: { ...BILI_HEADERS, Cookie } }
  )
  const playData = await playUrlRes.json()

  // 3. 提取画质列表（按清晰度和编码排序）
  const qualities = extractQualities(playData.data.dash)

  return { title, pic, audioUrl, qualities, pages }
}
```

### 2.2 画质选择策略

支持 AVC / HEVC / AV1 三种编码，按清晰度和编码优先级排序：

```typescript
const qualityPriority = [126, 125, 120, 116, 112, 80, 74, 64, 32, 16]
// 126=4K, 125=HDR, 120=4K, 116=1080P60, 112=1080P+, 80=1080P, ...
```

---

## 3. 下载阶段详解

### 3.1 并发下载

```typescript
// 使用 Node.js Stream 进行流式下载
const videoStream = await fetch(videoUrl).then(r => r.body)
const audioStream = await fetch(audioUrl).then(r => r.body)

// 写入临时文件
await pipeline(Readable.fromWeb(videoStream), fs.createWriteStream(videoTemp))
await pipeline(Readable.fromWeb(audioStream), fs.createWriteStream(audioTemp))
```

### 3.2 进度推送

```typescript
// 每 500ms 计算进度并推送到渲染进程
const progressInterval = setInterval(() => {
  const progress = (downloadedBytes / totalBytes) * 100
  mainWindow.webContents.send('download-progress', {
    taskId,
    type: 'downloading',
    progress: Math.round(progress),
    speed: formatSpeed(bytesPerSecond)
  })
}, 500)
```

### 3.3 FFmpeg 合并

```typescript
ffmpeg()
  .input(videoTemp)
  .input(audioTemp)
  .outputOptions('-c copy')        // 极速合并，不重新编码
  .outputOptions('-y')             // 覆盖已存在文件
  .save(outputPath)
  .on('end', () => {
    // 清理临时文件
    fs.unlinkSync(videoTemp)
    fs.unlinkSync(audioTemp)
    resolve({ success: true, filePath: outputPath })
  })
```

---

## 4. 切片系统

### 4.1 两种切片模式

```typescript
// 模式 A：单片段截取（从完整视频中截取一段）
const clipPayloadA = { start: 60, end: 120 }  // 截取 1:00~2:00

// 模式 B：多片段合并（批量截取后自动拼接）
const clipPayloadB = {
  isMerge: true,
  targets: [
    { start: 60, end: 120, titleExt: '片头' },
    { start: 300, end: 360, titleExt: '高潮' }
  ]
}
```

### 4.2 Player → Downloader 切片传递

```typescript
// PlayerView 中保存切片数据
sessionStorage.setItem('bilibili-handoff-slices', JSON.stringify(dropData))
sessionStorage.setItem('bilibili-handoff-merged', String(isMerged))
localStorage.setItem('bilibili-handoff-url', `https://www.bilibili.com/video/${bvid}`)
localStorage.setItem('bilibili-handoff-partition', selectedPartition.value)

// 跳转到下载器
window.dispatchEvent(new CustomEvent('app-command-nav', { detail: 'downloader' }))
```

### 4.3 FFmpeg 切片处理

```typescript
// 单片段截取
ffmpeg(inputPath)
  .seekInput(start)
  .duration(end - start)
  .outputOptions('-c copy')
  .save(outputPath)

// 多片段合并（使用 concat demuxer）
// 1. 分别截取每个片段
// 2. 生成 concat 列表文件
// 3. ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4
```

---

## 5. 任务队列设计

### 5.1 状态机

```
排队中 (queued)
    │
    ▼
下载中 (downloading) ──暂停──> 已暂停 (paused)
    │                              │
    │ 完成                         │ 恢复
    ▼                              ▼
已完成 (success)              下载中
    │
    ▼
失败 (error)
```

### 5.2 持久化策略

```typescript
// 防抖保存，避免频繁写入 localStorage
const persistTasksEngine = debounce(() => {
  localStorage.setItem('bili-download-tasks', JSON.stringify(taskList.value))
}, 500)

// 监听任务列表变化自动保存
watch([() => taskList.value.length, customFolders], persistTasksEngine, { deep: true })
```

---

## 6. 自定义分组

```typescript
interface CustomFolder {
  id: string
  name: string
}

// 分组逻辑
const groupedCompletedRecords = computed(() => {
  const groups: Record<string, TaskRecord[]> = {}
  for (const task of completedTasks) {
    const folderId = task.folderId || 'default'
    if (!groups[folderId]) groups[folderId] = []
    groups[folderId].push(task)
  }
  return groups
})
```
