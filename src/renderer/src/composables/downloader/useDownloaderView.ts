import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from '../useToast'
import { useConfirm } from '../useConfirm'
import { useDropdown } from '../useDropdown'
import type {
  ParsedResult,
  RawApiData,
  VideoPage,
  TaskRecord,
  CustomFolder,
  SliceTarget,
  GroupDisplay
} from './types'

export function useDownloaderView() {
  const { toast, showToast } = useToast()
  const { confirmModal, showConfirm, executeConfirm, cancelConfirm } = useConfirm()
  const { activeSelectId, toggleSelect } = useDropdown()

  // ================= 状态管理 =================
  const inputUrl = ref('')
  const isParsing = ref(false)
  const savePath = ref('')
  const taskList = ref<TaskRecord[]>([])
  const customFolders = ref<CustomFolder[]>([])

  const parsedList = ref<ParsedResult[]>([])
  const currentParsedIndex = ref(0)
  const currentParsed = computed(() => parsedList.value[currentParsedIndex.value] || null)

  const expandedGroups = ref<string[]>([])
  const searchQuery = ref('')
  const sortDesc = ref(true)

  const currentParsePartition = ref<string | undefined>(undefined)
  const pendingSliceDrops = ref<SliceTarget[] | null>(null)
  const pendingMergedMode = ref<boolean>(false)

  // ================= 批量管理与极客下拉状态 =================
  const isBatchMode = ref(false)
  const selectedHistoryIds = ref<string[]>([])

  const canReturnToPlayer = ref(false)

  const getFolderName = (id?: string): string => {
    if (!id) return ''
    return customFolders.value.find((f) => f.id === id)?.name || ''
  }

  const toggleBatchTask = (taskId: string): void => {
    const idx = selectedHistoryIds.value.indexOf(taskId)
    if (idx > -1) selectedHistoryIds.value.splice(idx, 1)
    else selectedHistoryIds.value.push(taskId)
  }

  const handleSelectGroup = (tasks: TaskRecord[]): void => {
    const ids = tasks.map((t) => t.taskId)
    const allSelected = ids.every((id) => selectedHistoryIds.value.includes(id))
    if (allSelected) {
      selectedHistoryIds.value = selectedHistoryIds.value.filter((id) => !ids.includes(id))
    } else {
      const newcomers = ids.filter((id) => !selectedHistoryIds.value.includes(id))
      selectedHistoryIds.value.push(...newcomers)
    }
  }

  const returnToPlayer = (): void => {
    window.dispatchEvent(new CustomEvent('app-command-nav', { detail: 'player' }))
    canReturnToPlayer.value = false
  }

  const batchSelectAll = (): void => {
    const targetIds = taskList.value
      .filter((t) => ['success', 'error'].includes(t.status))
      .map((t) => t.taskId)
    selectedHistoryIds.value = targetIds
  }

  const batchSelectSuccess = (): void => {
    const targetIds = taskList.value.filter((t) => t.status === 'success').map((t) => t.taskId)
    selectedHistoryIds.value = Array.from(new Set([...selectedHistoryIds.value, ...targetIds]))
  }

  const batchSelectError = (): void => {
    const targetIds = taskList.value.filter((t) => t.status === 'error').map((t) => t.taskId)
    selectedHistoryIds.value = Array.from(new Set([...selectedHistoryIds.value, ...targetIds]))
  }

  const enterBatchMode = (): void => {
    isBatchMode.value = true
    selectedHistoryIds.value = []
    expandedGroups.value = groupedCompletedRecords.value.map((g) => g.id)
  }

  const closeBatchMode = (): void => {
    isBatchMode.value = false
    selectedHistoryIds.value = []
  }

  const deleteSelectedHistory = (): void => {
    if (!selectedHistoryIds.value.length) return
    showConfirm(
      '批量删除记录',
      `确定要从记录中彻底清除已选的 ${selectedHistoryIds.value.length} 个任务吗？`,
      () => {
        taskList.value = taskList.value.filter((t) => !selectedHistoryIds.value.includes(t.taskId))
        selectedHistoryIds.value = []
        isBatchMode.value = false
        showToast('批量清理成功', 'success')
        persistTasksEngine()
      }
    )
  }

  const moveSelectedToFolder = (folderId?: string): void => {
    if (!selectedHistoryIds.value.length) return
    taskList.value.forEach((t) => {
      if (selectedHistoryIds.value.includes(t.taskId)) {
        t.folderId = folderId
      }
    })
    selectedHistoryIds.value = []
    isBatchMode.value = false
    activeSelectId.value = null
    showToast('批量转移分组成功', 'success')
    persistTasksEngine()
  }

  // ================= 弹窗与交互状态管理 =================
  const folderModal = ref({ show: false, name: '', isEdit: false, editId: '' })

  const openCreateFolder = (): void => {
    folderModal.value = { show: true, name: '', isEdit: false, editId: '' }
  }

  const openEditFolder = (id: string, oldName: string): void => {
    folderModal.value = { show: true, name: oldName, isEdit: true, editId: id }
  }

  const confirmFolder = (): void => {
    const name = folderModal.value.name.trim()
    if (!name) {
      showToast('分组名称不能为空', 'warn')
      return
    }
    if (folderModal.value.isEdit) {
      const f = customFolders.value.find((c) => c.id === folderModal.value.editId)
      if (f) f.name = name
      showToast('分组重命名成功', 'success')
    } else {
      customFolders.value.push({ id: 'f_' + Date.now().toString(), name })
      showToast('新建分组成功', 'success')
    }
    folderModal.value.show = false
  }

  // ================= API源生调用 =================
  const fetchSingleVideo = async (
    bvid: string,
    targetP: number | null
  ): Promise<ParsedResult | null> => {
    try {
      const res = await window.api.parseVideo(bvid, currentParsePartition.value)
      const resData = res.data as RawApiData | undefined

      if (res.success && resData && resData.qualities && resData.qualities.length > 0) {
        const defaultQuality = resData.qualities[0].url
        let defaultPages = [1]
        if (resData.pages && resData.pages.length > 0) {
          if (targetP && resData.pages.find((p: VideoPage) => p.page === targetP))
            defaultPages = [targetP]
          else defaultPages = [resData.pages[0].page]
        }
        return {
          bvid,
          title: resData.title,
          pic: resData.pic,
          audioUrl: resData.audioUrl,
          qualities: resData.qualities,
          audioBandwidth: resData.audioBandwidth,
          pages: resData.pages,
          selectedQualityUrl: defaultQuality,
          selectedPages: defaultPages,
          isSliceMode: !!pendingSliceDrops.value,
          isMergedSliceMode: pendingMergedMode.value,
          sliceTargets: pendingSliceDrops.value || undefined
        }
      }
      return null
    } catch {
      return null
    }
  }

  const handleParse = (): void => {
    if (!localStorage.getItem('bilibili-handoff-url')) {
      currentParsePartition.value = undefined
    }
    const performParse = async (): Promise<void> => {
      const rawInput = inputUrl.value.trim()
      if (!rawInput) {
        showToast('请输入有效的视频链接或BV号', 'warn')
        return
      }
      const bvidMatches = rawInput.match(/(BV[a-zA-Z0-9]{10})/gi)
      const uniqueBvids = bvidMatches ? Array.from(new Set(bvidMatches)) : [rawInput]

      isParsing.value = true
      parsedList.value = []
      currentParsedIndex.value = 0

      try {
        if (uniqueBvids.length === 1) {
          const pMatch = rawInput.match(/[?&]p=(\d+)/i)
          const targetP = pMatch ? parseInt(pMatch[1], 10) : null
          const res = await fetchSingleVideo(uniqueBvids[0], targetP)
          if (res) parsedList.value.push(res)
        } else {
          for (const bvid of uniqueBvids) {
            const res = await fetchSingleVideo(bvid, null)
            if (res) parsedList.value.push(res)
          }
        }
        if (parsedList.value.length === 0) {
          showToast('解析失败：未检测到有效视频资源', 'error')
        } else {
          inputUrl.value = ''
          showToast(`解析成功，共找到 ${parsedList.value.length} 个视频`, 'success')
        }
      } catch {
        showToast('网络或配置异常，解析失败', 'error')
      } finally {
        isParsing.value = false
      }
    }

    performParse().catch(() => {})
  }

  const togglePage = (pageNumber: number): void => {
    if (!currentParsed.value) return
    const idx = currentParsed.value.selectedPages.indexOf(pageNumber)
    if (idx > -1) {
      if (currentParsed.value.selectedPages.length > 1)
        currentParsed.value.selectedPages.splice(idx, 1)
    } else {
      currentParsed.value.selectedPages.push(pageNumber)
      currentParsed.value.selectedPages.sort((a, b) => a - b)
    }
  }

  const toggleAllPages = (): void => {
    if (!currentParsed.value?.pages) return
    if (currentParsed.value.selectedPages.length === currentParsed.value.pages.length) {
      currentParsed.value.selectedPages = [currentParsed.value.pages[0].page]
    } else {
      currentParsed.value.selectedPages = currentParsed.value.pages.map((p) => p.page)
    }
  }

  const prevParsed = (): void => {
    if (currentParsedIndex.value > 0) currentParsedIndex.value--
  }
  const nextParsed = (): void => {
    if (currentParsedIndex.value < parsedList.value.length - 1) currentParsedIndex.value++
  }

  const pushToDownload = async (parsedItem: ParsedResult): Promise<void> => {
    const selectedQuality = parsedItem.qualities.find(
      (q) => q.url === parsedItem.selectedQualityUrl
    )
    const hasMultiplePages = parsedItem.pages && parsedItem.pages.length > 0
    const pagesToDownload = hasMultiplePages
      ? parsedItem.pages!.filter((p) => parsedItem.selectedPages.includes(p.page))
      : [{ page: 1, cid: 0, part: '' }]

    const passQn = selectedQuality?.id || 116
    let passCodec = 'avc'
    if (selectedQuality?.label.includes('HEVC')) passCodec = 'hev'
    else if (selectedQuality?.label.includes('AV1')) passCodec = 'av01'

    const magicVideoUrl = `${parsedItem.selectedQualityUrl}|||qn=${passQn}|||codecs=${passCodec}`

    for (const p of pagesToDownload) {
      const baseTitle =
        hasMultiplePages && p.part ? `${parsedItem.title} - P${p.page} ${p.part}` : parsedItem.title

      if (parsedItem.isSliceMode && parsedItem.sliceTargets && parsedItem.sliceTargets.length > 0) {
        if (parsedItem.isMergedSliceMode) {
          const taskId =
            'merge_' + Date.now().toString() + Math.random().toString(36).substring(2, 6)
          const mergeTitle = `${baseTitle} (合并成片)`

          const newTask: TaskRecord = {
            taskId,
            bvid: parsedItem.bvid,
            title: mergeTitle,
            cover: parsedItem.pic,
            qualityLabel: (selectedQuality?.label || '默认画质') + ' | 顺序合并',
            status: 'downloading',
            progress: 0,
            statusMsg: '正在建立连接...',
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
          }
          taskList.value.unshift(newTask)

          startDownloadTask(taskId, magicVideoUrl, parsedItem.audioUrl, mergeTitle, p, {
            isMerge: true,
            targets: parsedItem.sliceTargets
          })
        } else {
          const batchTasks: TaskRecord[] = []
          for (const sliceTarget of parsedItem.sliceTargets) {
            const taskId =
              'slice_' + Date.now().toString() + Math.random().toString(36).substring(2, 6)
            const sliceTitle = `${baseTitle} - ${sliceTarget.titleExt || sliceTarget.start + 's'}`

            batchTasks.push({
              taskId,
              bvid: parsedItem.bvid,
              title: sliceTitle,
              cover: parsedItem.pic,
              qualityLabel: (selectedQuality?.label || '默认画质') + ' | 分段提取',
              status: 'downloading',
              progress: 0,
              statusMsg: '等待连接...',
              date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
            })
          }

          taskList.value = [...batchTasks, ...taskList.value]

          batchTasks.forEach((task, index) => {
            const target = parsedItem.sliceTargets![index]
            setTimeout(() => {
              startDownloadTask(task.taskId, magicVideoUrl, parsedItem.audioUrl, task.title, p, {
                start: target.start,
                end: target.end
              })
            }, index * 50)
          })
        }
      } else {
        const taskId = 'full_' + Date.now().toString() + Math.random().toString(36).substring(2, 6)
        const newTask: TaskRecord = {
          taskId,
          bvid: parsedItem.bvid,
          title: baseTitle,
          cover: parsedItem.pic,
          qualityLabel: selectedQuality?.label || '默认画质',
          status: 'downloading',
          progress: 0,
          statusMsg: '正在建立连接...',
          date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
        }
        taskList.value.unshift(newTask)
        startDownloadTask(taskId, magicVideoUrl, parsedItem.audioUrl, baseTitle, p)
      }
    }
  }

  const startDownloadTask = async (
    taskId: string,
    magicVideoUrl: string,
    audioUrl: string,
    finalTitle: string,
    p: { page: number; cid: number },
    clipPayload?: { start: number; end: number } | { isMerge: boolean; targets: SliceTarget[] }
  ): Promise<void> => {
    try {
      const apiExt = window.api as unknown as {
        downloadVideo: (
          id: string,
          vUrl: string,
          aUrl: string,
          title: string,
          path: string,
          page: number,
          cid: number,
          payload?: { start: number; end: number } | { isMerge: boolean; targets: SliceTarget[] }
        ) => Promise<{ success: boolean; filePath?: string; message?: string }>
      }

      const purePayload = clipPayload ? JSON.parse(JSON.stringify(clipPayload)) : undefined

      const res = await apiExt.downloadVideo(
        taskId,
        magicVideoUrl,
        audioUrl,
        finalTitle,
        savePath.value,
        p.page,
        p.cid,
        purePayload
      )

      const taskIndex = taskList.value.findIndex((t) => t.taskId === taskId)
      if (taskIndex !== -1 && taskList.value[taskIndex].status !== 'error') {
        if (res.success) {
          taskList.value[taskIndex].status = 'success'
          taskList.value[taskIndex].statusMsg = '下载完成'
          taskList.value[taskIndex].filePath = res.filePath
        } else {
          taskList.value[taskIndex].status = 'error'
          taskList.value[taskIndex].statusMsg = res.message || '底层接收报错'
        }
      }
    } catch (e) {
      console.error('触发下载失败：', e)
      const t = taskList.value.find((tx) => tx.taskId === taskId)
      if (t) {
        t.status = 'error'
        t.statusMsg = `主进程通讯异常`
      }
    }
  }

  const deleteCurrentParsedVideo = (): void => {
    parsedList.value.splice(currentParsedIndex.value, 1)
    const maximumBound = Math.max(0, parsedList.value.length - 1)
    if (currentParsedIndex.value > maximumBound) {
      currentParsedIndex.value = maximumBound
    }
  }

  const handleStartCurrentDownload = (): void => {
    const performDrive = async (): Promise<void> => {
      if (!currentParsed.value) return
      await pushToDownload(currentParsed.value)
      showToast('已加入下载队列', 'success')
      deleteCurrentParsedVideo()
    }
    performDrive().catch(() => {})
  }

  const handleStartAllDownload = (): void => {
    const performPushAll = async (): Promise<void> => {
      if (parsedList.value.length === 0) return
      for (const item of parsedList.value) await pushToDownload(item)
      parsedList.value = []
      showToast('全部任务已加入下载队列', 'success')
    }
    performPushAll().catch(() => {})
  }

  const handleSelectFolder = (): void => {
    const performStoragePave = async (): Promise<void> => {
      const path = await window.api.selectFolder()
      if (path) {
        savePath.value = path
        localStorage.setItem('bili-download-path', path)
        showToast('全局下载路径已更新', 'success')
      }
    }
    performStoragePave().catch(() => {})
  }

  const openFolder = (path?: string): void => {
    const performOpen = async (): Promise<void> => {
      await window.api.openFolder(path)
    }
    performOpen().catch(() => {
      showToast('打开文件夹失败，文件可能已被移动', 'error')
    })
  }

  const removeSingleTask = (taskId: string): void => {
    taskList.value = taskList.value.filter((t) => t.taskId !== taskId)
    persistTasksEngine()
  }

  // ================= 生命周期绑定 =================
  const scanHandoffData = (): void => {
    const droppedUrl = localStorage.getItem('bilibili-handoff-url')
    const droppedPartition = localStorage.getItem('bilibili-handoff-partition')
    const droppedSlices = sessionStorage.getItem('bilibili-handoff-slices')
    const droppedMerged = sessionStorage.getItem('bilibili-handoff-merged')

    if (droppedUrl) {
      inputUrl.value = droppedUrl
      currentParsePartition.value = droppedPartition || undefined
      canReturnToPlayer.value = true

      if (droppedSlices && droppedSlices !== '[]') {
        try {
          pendingSliceDrops.value = JSON.parse(droppedSlices)
          pendingMergedMode.value = droppedMerged === 'true'
        } catch {
          pendingSliceDrops.value = null
        }
      } else {
        pendingSliceDrops.value = null
        pendingMergedMode.value = false
      }

      localStorage.removeItem('bilibili-handoff-url')
      localStorage.removeItem('bilibili-handoff-partition')
      sessionStorage.removeItem('bilibili-handoff-slices')
      sessionStorage.removeItem('bilibili-handoff-merged')

      setTimeout(() => {
        manualParse(true)
      }, 100)
    }
  }

  const manualParse = (keepReturnButton = false): void => {
    if (!keepReturnButton) canReturnToPlayer.value = false
    handleParse()
  }

  const manualParseEvent = (): void => {
    manualParse(false)
  }

  onMounted((): void => {
    const saved = localStorage.getItem('bili-download-tasks-v2')
    if (saved) {
      try {
        taskList.value = JSON.parse(saved)
      } catch {
        taskList.value = []
      }
    }

    const savedFolders = localStorage.getItem('bili-download-folders')
    if (savedFolders) {
      try {
        customFolders.value = JSON.parse(savedFolders)
      } catch {
        customFolders.value = []
      }
    }

    const savedPath = localStorage.getItem('bili-download-path')
    if (savedPath) savePath.value = savedPath

    if (window.api?.onDownloadProgress) {
      window.api.onDownloadProgress(
        (data: { taskId: string; type: string; progress: number; speed?: string }): void => {
          const task = taskList.value.find((t) => t.taskId === data.taskId)
          if (!task || task.status === 'paused') return

          task.progress = data.progress || 0
          task.speed = data.speed || ''

          if (data.type === 'video')
            task.statusMsg = `正在下载视频... ${task.speed || data.progress + '%'}`
          else if (data.type === 'audio')
            task.statusMsg = `正在下载音频... ${task.speed || data.progress + '%'}`
          else if (data.type === 'merge') {
            task.status = 'merging'
            task.statusMsg = `正在合成视频/音频文件...`
          }

          if (data.progress === 100 || task.status === 'success' || task.status === 'error') {
            persistTasksEngine()
          }
        }
      )
    }

    scanHandoffData()

    window.addEventListener('app-command-nav', (e: Event): void => {
      const customEvent = e as CustomEvent
      if (customEvent.detail === 'downloader') {
        setTimeout(scanHandoffData, 100)
      }
    })
  })

  let saveTimeout: ReturnType<typeof setTimeout> | null = null

  const persistTasksEngine = (): void => {
    if (saveTimeout) clearTimeout(saveTimeout)

    saveTimeout = setTimeout(async (): Promise<void> => {
      const dataToSave = taskList.value.map((t) => {
        return {
          ...t,
          status: t.status === 'downloading' || t.status === 'merging' ? 'paused' : t.status,
          progress: t.status === 'success' ? 100 : 0,
          speed: ''
        }
      })

      if (dataToSave.length > 500) {
        dataToSave.splice(500)
      }

      const apiExt = window.api as {
        saveDataJSON?: (filename: string, data: unknown) => Promise<void>
      }

      if (apiExt && typeof apiExt.saveDataJSON === 'function') {
        try {
          await apiExt.saveDataJSON('bili-download-tasks.json', dataToSave)
        } catch {
          localStorage.setItem('bili-download-tasks-v2', JSON.stringify(dataToSave))
        }
      } else {
        localStorage.setItem('bili-download-tasks-v2', JSON.stringify(dataToSave))
      }
    }, 1500)
  }

  watch([() => taskList.value.length, customFolders], () => persistTasksEngine(), { deep: true })
  watch(
    customFolders,
    (newVal) => localStorage.setItem('bili-download-folders', JSON.stringify(newVal)),
    { deep: true }
  )

  const activeTasks = computed(() => {
    return taskList.value.filter(
      (t) => t.status === 'downloading' || t.status === 'merging' || t.status === 'paused'
    )
  })

  const groupedCompletedRecords = computed(() => {
    const list = taskList.value.filter((t) => t.status === 'success' || t.status === 'error')
    let filteredList = list

    if (searchQuery.value.trim()) {
      const keyword = searchQuery.value.toLowerCase()
      filteredList = list.filter(
        (t) => t.title.toLowerCase().includes(keyword) || t.bvid.toLowerCase().includes(keyword)
      )
    }

    const folderMap = new Map<string, TaskRecord[]>()
    const bvidMap = new Map<string, TaskRecord[]>()

    filteredList.forEach((task) => {
      if (task.folderId && customFolders.value.find((f) => f.id === task.folderId)) {
        if (!folderMap.has(task.folderId)) folderMap.set(task.folderId, [])
        folderMap.get(task.folderId)!.push(task)
      } else {
        const key = task.bvid || 'UnknownData'
        if (!bvidMap.has(key)) bvidMap.set(key, [])
        bvidMap.get(key)!.push(task)
      }
    })

    const output: GroupDisplay[] = []

    customFolders.value.forEach((folder) => {
      const tasksArray = folderMap.get(folder.id) || []
      if (searchQuery.value.trim() && tasksArray.length === 0) return
      output.push({
        isCustomFolder: true,
        id: folder.id,
        title: folder.name,
        mainCover: '',
        aggregateDate: tasksArray.length > 0 ? tasksArray[0].date : '-',
        tasks: tasksArray
      })
    })

    bvidMap.forEach((tasksArray, currentBvid) => {
      output.push({
        isCustomFolder: false,
        id: currentBvid,
        title: tasksArray.length > 1 ? tasksArray[0].title.split(' - P')[0] : tasksArray[0].title,
        mainCover: tasksArray[0].cover,
        aggregateDate: tasksArray[0].date,
        tasks: tasksArray
      })
    })

    type SortItem = {
      id?: string | number
      isCustomFolder?: boolean
      tasks?: { taskId?: string | number }[]
    }

    type FolderItem = {
      id?: string | number
    }

    return [...output].sort((a: SortItem, b: SortItem): number => {
      if (a.isCustomFolder && !b.isCustomFolder) return -1
      if (!a.isCustomFolder && b.isCustomFolder) return 1

      if (a.isCustomFolder && b.isCustomFolder) {
        const idxA = customFolders.value.findIndex((f: FolderItem): boolean => f.id === a.id)
        const idxB = customFolders.value.findIndex((f: FolderItem): boolean => f.id === b.id)
        return idxA - idxB
      }

      const getTaskTime = (item: SortItem): number => {
        if (!item.tasks || !item.tasks.length || !item.tasks[0]?.taskId) return 0
        const idStr = String(item.tasks[0].taskId)
        const timeMatch = idStr.match(/\d{13}/)
        return timeMatch ? parseInt(timeMatch[0], 10) : 1
      }

      const tA = getTaskTime(a)
      const tB = getTaskTime(b)
      return sortDesc.value ? tB - tA : tA - tB
    })
  })

  const parsedMetrics = computed(() => {
    let dur = '解析中'
    let estimatedSize = '计算中...'

    const focusData = currentParsed.value
    if (!focusData) return { dur, estimatedSize, isEstimate: true }

    const targetPages =
      focusData.pages?.filter((p) => focusData.selectedPages.includes(p.page)) || []
    let sumSec = 0
    let hasValidDur = false

    targetPages.forEach((p) => {
      if (p.duration) {
        sumSec += p.duration
        hasValidDur = true
      }
    })

    if (hasValidDur && sumSec > 0) {
      dur = `${Math.floor(sumSec / 60)}分${Math.floor(sumSec % 60)}秒`

      let exactMegsMB = 0
      const qSelected = focusData.qualities.find((q) => q.url === focusData.selectedQualityUrl)

      if (qSelected && qSelected.bandwidth) {
        const videoBps = qSelected.bandwidth
        const audioBps = focusData.audioBandwidth || 320000
        const totalBytes = ((videoBps + audioBps) * sumSec) / 8
        exactMegsMB = totalBytes / (1024 * 1024)
      } else {
        exactMegsMB = (sumSec / 60) * 20
      }

      estimatedSize =
        exactMegsMB > 1024
          ? `${(exactMegsMB / 1024).toFixed(2)} GB`
          : `${Math.floor(exactMegsMB)} MB`
    }

    return { dur, estimatedSize, isEstimate: !hasValidDur }
  })

  const deleteFolder = (id: string): void => {
    showConfirm('删除分组', '确定要删除此分组吗？其中的视频将被移出归为默认合集。', () => {
      customFolders.value = customFolders.value.filter((c) => c.id !== id)
      taskList.value.forEach((t) => {
        if (t.folderId === id) t.folderId = undefined
      })
      showToast('分组已删除', 'success')
      persistTasksEngine()
    })
  }

  const moveBvidToFolder = (bvid: string, folderId: string): void => {
    if (!folderId) return
    taskList.value.forEach((t) => {
      if (t.bvid === bvid) {
        t.folderId = folderId
      }
    })
    activeSelectId.value = null
    showToast('移动成功', 'success')
    persistTasksEngine()
  }

  const setTaskFolder = (taskId: string, folderId: string): void => {
    const task = taskList.value.find((t) => t.taskId === taskId)
    if (task) {
      task.folderId = folderId || undefined
    }
    activeSelectId.value = null
    persistTasksEngine()
  }

  const toggleGroupOpen = (groupId: string): void => {
    if (isBatchMode.value) return
    const index = expandedGroups.value.indexOf(groupId)
    if (index > -1) expandedGroups.value.splice(index, 1)
    else expandedGroups.value.push(groupId)
  }

  const handleDeleteWholeGroup = (tasks: TaskRecord[]): void => {
    showConfirm('彻底删除选中项', '此操作将从当前记录中清空对应的视频项目，确定继续吗？', () => {
      const killIdsStr = tasks.map((t) => t.taskId)
      taskList.value = taskList.value.filter((t) => !killIdsStr.includes(t.taskId))
      showToast('已删除记录', 'success')
      persistTasksEngine()
    })
  }

  const handlePauseTask = (taskId: string): void => {
    const target = taskList.value.find((t) => t.taskId === taskId)
    if (target && target.status === 'downloading') {
      target.status = 'paused'
      target.statusMsg = '已暂停'
      target.speed = ''
      try {
        // @ts-ignore API may not be available in all builds
        window.api.pauseDownload?.(taskId)
      } catch (e) {
        console.debug('通信暂停出现异常:', e)
      }
      persistTasksEngine()
    }
  }

  const handleResumeTask = (taskId: string): void => {
    const target = taskList.value.find((t) => t.taskId === taskId)
    if (target && target.status === 'paused') {
      target.status = 'downloading'
      target.statusMsg = '正在恢复连接...'
      try {
        // @ts-ignore API may not be available in all builds
        window.api.resumeDownload?.(taskId)
      } catch (e) {
        console.debug('通信恢复出现异常:', e)
      }
      persistTasksEngine()
    }
  }

  const handleCancelTaskSafely = (taskId: string): void => {
    showConfirm('取消下载', '确定要终止当前还在下载的任务吗？', () => {
      try {
        // @ts-ignore API may not be available in all builds
        window.api.cancelDownload?.(taskId)
      } catch (e) {
        console.debug('通信拦截异常:', e)
      }

      const idxtmp = taskList.value.findIndex((t) => t.taskId === taskId)
      if (idxtmp !== -1) {
        taskList.value[idxtmp].status = 'error'
        taskList.value[idxtmp].progress = 0
        taskList.value[idxtmp].statusMsg = '任务已取消'
        persistTasksEngine()
      }
    })
  }

  return {
    inputUrl,
    isParsing,
    savePath,
    taskList,
    customFolders,
    parsedList,
    currentParsedIndex,
    currentParsed,
    expandedGroups,
    searchQuery,
    sortDesc,
    currentParsePartition,
    pendingSliceDrops,
    pendingMergedMode,
    isBatchMode,
    selectedHistoryIds,
    canReturnToPlayer,
    activeSelectId,
    toast,
    confirmModal,
    folderModal,
    showToast,
    showConfirm,
    executeConfirm,
    cancelConfirm,
    toggleSelect,
    getFolderName,
    toggleBatchTask,
    handleSelectGroup,
    returnToPlayer,
    batchSelectAll,
    batchSelectSuccess,
    batchSelectError,
    enterBatchMode,
    closeBatchMode,
    deleteSelectedHistory,
    moveSelectedToFolder,
    openCreateFolder,
    openEditFolder,
    confirmFolder,
    handleParse,
    togglePage,
    toggleAllPages,
    prevParsed,
    nextParsed,
    pushToDownload,
    startDownloadTask,
    deleteCurrentParsedVideo,
    handleStartCurrentDownload,
    handleStartAllDownload,
    handleSelectFolder,
    openFolder,
    removeSingleTask,
    scanHandoffData,
    manualParse,
    manualParseEvent,
    persistTasksEngine,
    activeTasks,
    groupedCompletedRecords,
    parsedMetrics,
    deleteFolder,
    moveBvidToFolder,
    setTaskFolder,
    toggleGroupOpen,
    handleDeleteWholeGroup,
    handlePauseTask,
    handleResumeTask,
    handleCancelTaskSafely
  }
}
