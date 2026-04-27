<template>
  <Transition name="modal-pop">
    <div v-if="modelValue" class="clip-manager-overlay" @click.self="closeManager">
      <div class="clip-manager-panel glass-panel" @click.stop>
        <!-- 🧠 顶部导航与关闭按钮 -->
        <div class="manager-header">
          <div class="header-title">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polygon points="14 2 18 6 7 17 3 17 3 13 14 2"></polygon>
              <line x1="3" y1="22" x2="21" y2="22"></line>
            </svg>
            <h2>切片装配车间 <span v-if="isMergeMode" class="badge-merge">合并排序模式</span></h2>
          </div>

          <div class="view-tabs">
            <button
              class="tab-btn"
              :class="{ active: viewMode === 'list' }"
              @click="viewMode = 'list'"
            >
              📍 原始打点
            </button>
            <button
              class="tab-btn pulse-glow"
              :class="{ active: viewMode === 'slice' }"
              @click="initSliceMode"
            >
              ✂️ 切片排产
            </button>
            <button
              class="tab-btn"
              :class="{ active: viewMode === 'all' }"
              @click="viewMode = 'all'"
            >
              📚 全局总览
            </button>
          </div>

          <button class="close-btn" @click="closeManager">×</button>
        </div>

        <!-- 🛠️ 批量操作霸王条 -->
        <div v-if="viewMode === 'slice' && generatedSegments.length > 0" class="batch-toolbar">
          <div class="batch-left">
            <button class="batch-btn c-blue" @click="toggleAllSegments">
              {{ selectedCount === generatedSegments.length ? '〇 取消' : '☑️ 全选' }}
            </button>
            <button class="batch-btn c-purple" @click="invertSelection">🔁 反选</button>
            <span class="sel-count"
              >选中: <strong>{{ selectedCount }}</strong> / {{ generatedSegments.length }}</span
            >
          </div>
          <div class="batch-right">
            <!-- ✨ 属性排序修正：v-model 在前，type 在后 -->
            <label
              class="merge-switch"
              title="开启后，所有勾选的首尾将合成为一整段视频，支持拖动排序"
            >
              <input v-model="isMergeMode" type="checkbox" />
              <div class="switch-ui"></div>
              <span>开启合并排序</span>
            </label>
            <div class="divider-line"></div>
            <button class="batch-btn danger-btn text-xs" @click="clearAllClips">🗑️ 清空</button>
          </div>
        </div>

        <!-- 📜 主体内容区 -->
        <!-- ✨ 属性排序修正：ref 在前，class 在后 -->
        <div ref="managerBodyRef">
          <!-- 📍 模式一：原始打点 -->
          <div v-if="viewMode === 'list'" class="list-view">
            <div v-if="!clips || clips.length === 0" class="empty-state">
              <svg
                viewBox="0 0 24 24"
                width="48"
                height="48"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="empty-icon"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 8 12 12 16 14"></polyline>
              </svg>
              <p>当前视频还没有打点记录</p>
              <span>快捷键 Alt+C 随时添加高光时刻标记</span>
            </div>

            <div v-else class="clip-cards">
              <div
                v-for="(clip, index) in clips"
                :key="clip.id"
                class="clip-card hover-lift"
                @mouseenter="hoverClip(clip.id)"
                @mouseleave="hoverClip(null)"
              >
                <div class="card-cover" @click="jumpTo(clip.time)">
                  <img v-if="clip.screenshot" :src="clip.screenshot" class="cover-img" />
                  <div v-else class="cover-placeholder">无画面</div>
                  <span class="time-badge">{{ formatTime(clip.time) }}</span>
                  <div class="play-overlay">▶</div>
                </div>
                <div class="card-info">
                  <input
                    v-model="clip.title"
                    class="clip-title-input"
                    placeholder="输入片段标题..."
                    @blur="saveToParent"
                  />
                  <div class="clip-meta">
                    <span v-if="clip.danmakuSnapshots?.length" class="meta-tag fire"
                      >🔥 高能预警</span
                    >
                  </div>
                </div>
                <button class="del-btn" title="删除当前打点" @click="deleteClip(index)">×</button>
              </div>
            </div>
          </div>

          <!-- ✂️ 模式二：切片排产 (支持神级原生拖拽合并) -->
          <div v-if="viewMode === 'slice'" class="slice-view">
            <div v-if="generatedSegments.length === 0" class="empty-state">
              <p>请先在打点模式添加标记，再进入此工作流</p>
            </div>

            <div v-else class="segment-list">
              <TransitionGroup name="list-anim">
                <div
                  v-for="(seg, idx) in generatedSegments"
                  :key="seg.id"
                  :draggable="isMergeMode"
                  class="segment-item"
                  :class="{
                    'is-selected': seg.selected,
                    'is-dragging': dragIndex === idx,
                    'drag-over': dragEnterIndex === idx
                  }"
                  @dragstart="onDragStart($event, idx)"
                  @dragenter.prevent="onDragEnter(idx)"
                  @dragover.prevent
                  @drop="onDrop(idx)"
                  @dragend="onDragEnd"
                  @click="!isMergeMode && (seg.selected = !seg.selected)"
                >
                  <div v-if="isMergeMode" class="drag-handle" title="拖拽调整合并顺序">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path
                        d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"
                      />
                    </svg>
                  </div>

                  <!-- ✨ 属性排序修正：v-if 在前，class，最后事件，v-model 与 type 顺序 -->
                  <div v-if="!isMergeMode || true" class="seg-checkbox" @click.stop>
                    <input v-model="seg.selected" type="checkbox" />
                  </div>

                  <div class="seg-preview">
                    <div v-if="isMergeMode && seg.selected" class="sort-badge sequence-pop">
                      {{ getMergeOrder(seg.id) }}
                    </div>
                    <img v-if="seg.preview" :src="seg.preview" />
                    <div v-else class="cover-placeholder">片段</div>
                    <span class="dur-badge">{{ formatTime(seg.duration) }}</span>
                  </div>

                  <div class="seg-info">
                    <div class="seg-title-row">
                      <span class="seg-title" :title="seg.title">{{ seg.title }}</span>
                    </div>
                    <div class="seg-timeline">
                      <span>{{ formatTime(seg.start) }}</span>
                      <div class="timeline-bar">
                        <div class="timeline-fill" :style="{ width: '100%' }"></div>
                      </div>
                      <span>{{
                        formatTime(seg.end > 900000 ? videoDuration || seg.end : seg.end)
                      }}</span>
                    </div>
                  </div>
                </div>
              </TransitionGroup>
            </div>
          </div>

          <!-- 📚 模式三：全局总览 (无需变动) -->
          <div v-if="viewMode === 'all'" class="all-view">
            <div v-if="!allClips || Object.keys(allClips).length === 0" class="empty-state">
              暂无存档记录
            </div>
            <div v-else class="archive-list">
              <div v-for="(vClips, bvid) in allClips" :key="String(bvid)" class="archive-group">
                <div class="archive-header">
                  <div class="archive-title-area">
                    <h3 class="vid-title" :title="extractVideoTitle(vClips)">
                      🎥 {{ extractVideoTitle(vClips) }}
                    </h3>
                    <div class="vid-meta-row">
                      <span class="archive-bvid">{{ String(bvid) }}</span>
                      <span class="count-tag">{{ vClips.length }} 个标记</span>
                    </div>
                  </div>
                  <div class="archive-actions">
                    <button class="go-btn" @click="navigateTo(String(bvid), vClips[0]?.time || 0)">
                      ▶ 跳转浏览
                    </button>
                    <button
                      class="clear-btn"
                      title="清空这组存档"
                      @click="clearArchive(String(bvid))"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div class="archive-cards">
                  <div v-for="(c, idx) in vClips" :key="c.id" class="arc-card">
                    <div
                      class="arc-cover"
                      title="点击跳转"
                      @click="navigateTo(String(bvid), c.time)"
                    >
                      <img v-if="c.screenshot" :src="c.screenshot" />
                      <span class="arc-time">{{ formatTime(c.time) }}</span>
                      <div class="play-overlay">▶</div>
                    </div>
                    <div class="arc-info">
                      <input
                        :value="c.title"
                        class="mini-title-input"
                        placeholder="重命名..."
                        @input="
                          updateArchiveTitle(
                            String(bvid),
                            idx,
                            ($event.target as HTMLInputElement).value
                          )
                        "
                      />
                    </div>
                    <button
                      class="arc-del-btn"
                      title="删除该记录"
                      @click="deleteArchiveClip(String(bvid), idx)"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 🚀 底部下发引擎 -->
        <div v-if="viewMode === 'slice'" class="manager-footer">
          <div class="footer-info">
            {{
              isMergeMode
                ? '合并模式：当前选中的分段将按照标号 1、2、3... 的先后顺序压制为单个视频'
                : '分离模式：当前选中的片段将会被单独切割并打包成多个视频文件'
            }}
          </div>
          <button
            class="submit-btn pop-bounce"
            :disabled="selectedCount === 0"
            :class="{ 'btn-merged': isMergeMode }"
            @click="submitSliceTasks"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                v-if="isMergeMode"
                d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
              ></path>
              <path
                v-else
                d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
              ></path>
            </svg>
            {{ isMergeMode ? '导出 1 个合并成片' : `下发 ${selectedCount} 个独立切片` }}
          </button>
        </div>

        <!-- 自定义确认弹层 -->
        <Transition name="fade-scale">
          <div v-if="confirmDialog.show" class="confirm-overlay" @click.stop>
            <div class="confirm-box">
              <div class="confirm-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="48"
                  height="48"
                  fill="none"
                  stroke="#f04c49"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                  ></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <h3 class="confirm-title">{{ confirmDialog.title }}</h3>
              <p class="confirm-msg">{{ confirmDialog.message }}</p>
              <div class="confirm-actions">
                <button class="btn-cancel" @click="closeConfirm">暂不操作</button>
                <button class="btn-danger" @click="executeConfirm">果断执行</button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Snapshot {
  time: number
  text: string
}
interface Clip {
  id: string
  time: number
  title?: string
  description?: string
  screenshot?: string | null | undefined
  danmakuSnapshots?: Snapshot[]
  subtitleSnapshots?: Snapshot[]
  isAuto?: boolean
}
interface Segment {
  id: string
  start: number
  end: number
  duration: number
  title: string
  preview?: string | null | undefined
  selected: boolean
}

const props = defineProps<{
  modelValue: boolean
  clips: Clip[]
  allClips?: Record<string, Clip[]>
  videoDuration?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'update:clips', val: Clip[]): void
  (e: 'update:allClips', val: Record<string, Clip[]>): void
  (e: 'jump-to', time: number): void
  (e: 'navigate-to', bvid: string, time: number): void
  (e: 'set-active-clip', id: string | null): void
  (
    e: 'push-slice-tasks',
    tasks: { start: number; end: number; title: string }[],
    isMerged: boolean
  ): void
}>()

const viewMode = ref<'list' | 'slice' | 'all'>('list')
const generatedSegments = ref<Segment[]>([])

// ✨ 核心神级合并控制层
const isMergeMode = ref(false)

watch(isMergeMode, (newVal: boolean): void => {
  if (!newVal && generatedSegments.value.length > 0) {
    generatedSegments.value.sort((a, b) => a.start - b.start)
  }
})

const getMergeOrder = (id: string): number => {
  const selectedOnly = generatedSegments.value.filter((s) => s.selected)
  return selectedOnly.findIndex((s) => s.id === id) + 1
}

// 🕹️ 原生拖拽系统引擎
const dragIndex = ref<number | null>(null)
const dragEnterIndex = ref<number | null>(null)

// ✨ TS 类型修正：补充所有函数的 返回值 : void 声明
const onDragStart = (e: DragEvent, idx: number): void => {
  if (!isMergeMode.value) {
    e.preventDefault()
    return
  }
  dragIndex.value = idx
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.dropEffect = 'move'
    const img = new Image()
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    e.dataTransfer.setDragImage(img, 0, 0)
  }
}

const onDragEnter = (idx: number): void => {
  if (dragIndex.value !== null && dragIndex.value !== idx) {
    dragEnterIndex.value = idx
  }
}

const onDrop = (idx: number): void => {
  if (dragIndex.value !== null && dragIndex.value !== idx) {
    const arr = [...generatedSegments.value]
    const [movedObj] = arr.splice(dragIndex.value, 1)
    arr.splice(idx, 0, movedObj)
    generatedSegments.value = arr
  }
  dragIndex.value = null
  dragEnterIndex.value = null
}

const onDragEnd = (): void => {
  dragIndex.value = null
  dragEnterIndex.value = null
}

// --- 经典逻辑基建 --- //
const confirmDialog = ref({
  show: false,
  title: '',
  message: '',
  onConfirm: null as (() => void) | null
})
const showConfirm = (title: string, message: string, onConfirm: () => void): void => {
  confirmDialog.value = { show: true, title, message, onConfirm }
}
const closeConfirm = (): void => {
  confirmDialog.value.show = false
  setTimeout(() => {
    confirmDialog.value.onConfirm = null
  }, 300)
}
const executeConfirm = (): void => {
  if (confirmDialog.value.onConfirm) confirmDialog.value.onConfirm()
  closeConfirm()
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const closeManager = (): void => emit('update:modelValue', false)
const hoverClip = (id: string | null): void => emit('set-active-clip', id)
const jumpTo = (time: number): void => emit('jump-to', time)
const navigateTo = (bvid: string, time: number): void => emit('navigate-to', bvid, time)
const saveToParent = (): void => emit('update:clips', [...props.clips])
const deleteClip = (index: number): void => {
  const newArr = [...props.clips]
  newArr.splice(index, 1)
  emit('update:clips', newArr)
}

const initSliceMode = (): void => {
  isMergeMode.value = false
  if (!props.clips || props.clips.length === 0) {
    generatedSegments.value = []
    viewMode.value = 'slice'
    return
  }
  const sorted = [...props.clips].sort((a, b) => a.time - b.time)
  const maxDur = props.videoDuration || 0
  const totalDur = maxDur > 0 ? Math.floor(maxDur) : 999999
  const pts: { time: number; screenshot?: string | null | undefined; title?: string }[] = []

  if (Math.floor(sorted[0].time) > 0)
    pts.push({ time: 0, title: '🎬 序幕：开场至第一刀', screenshot: sorted[0].screenshot })
  sorted.forEach((c) =>
    pts.push({ time: Math.floor(c.time), screenshot: c.screenshot, title: c.title })
  )
  if (pts[pts.length - 1].time < totalDur - 1)
    pts.push({
      time: totalDur,
      title: '🎞️ 尾声：至末尾',
      screenshot: sorted[sorted.length - 1].screenshot
    })

  const segs: Segment[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const start = pts[i].time
    const end = pts[i + 1].time
    let dur = end - start
    if (end >= 999999) dur = maxDur > 0 ? maxDur - start : 0
    if (dur > 0 || end >= 999999) {
      segs.push({
        id: `slice_${start}_${end}`,
        start,
        end,
        duration: Math.floor(dur),
        title: pts[i].title || `精彩片段: ${formatTime(start)} ~ ${formatTime(end)}`,
        preview: pts[i].screenshot,
        selected: true
      })
    }
  }
  generatedSegments.value = segs
  viewMode.value = 'slice'
}

const selectedCount = computed(() => generatedSegments.value.filter((s) => s.selected).length)
const toggleAllSegments = (): void => {
  const isAllChecked = selectedCount.value === generatedSegments.value.length
  generatedSegments.value.forEach((s) => (s.selected = !isAllChecked))
}
const invertSelection = (): void => {
  generatedSegments.value.forEach((s) => (s.selected = !s.selected))
}

const clearAllClips = (): void => {
  showConfirm(
    '核弹操作警报',
    '这一键按下去，本视频所有手工打下的高光节点将灰飞烟灭。依然继续吗？',
    () => {
      emit('update:clips', [])
      generatedSegments.value = []
      viewMode.value = 'list'
    }
  )
}

const submitSliceTasks = (): void => {
  const activeTasks = generatedSegments.value
    .filter((s) => s.selected)
    .map((s) => ({ start: s.start, end: s.end, title: s.title }))
  if (activeTasks.length > 0) emit('push-slice-tasks', activeTasks, isMergeMode.value)
}

const extractVideoTitle = (vClips: Clip[]): string => {
  if (!vClips || vClips.length === 0) return '未命名片段'
  const t = vClips[0].title || ''
  return t.includes(' - 标记') ? t.split(' - 标记')[0] : t || '未命名片段集'
}

const getClonedArchivedData = (): Record<string, Clip[]> =>
  props.allClips ? JSON.parse(JSON.stringify(props.allClips)) : {}
const commitArchivedData = (newData: Record<string, Clip[]>): void => {
  emit('update:allClips', newData)
  localStorage.setItem('bili-clips-map', JSON.stringify(newData))
}

const updateArchiveTitle = (bvid: string, idx: number, newTitle: string): void => {
  const cloned = getClonedArchivedData()
  if (cloned[bvid]?.[idx]) {
    cloned[bvid][idx].title = newTitle
    commitArchivedData(cloned)
  }
}
const deleteArchiveClip = (bvid: string, idx: number): void => {
  const cloned = getClonedArchivedData()
  if (!cloned[bvid]) return
  cloned[bvid].splice(idx, 1)
  if (cloned[bvid].length === 0) delete cloned[bvid]
  commitArchivedData(cloned)
}

const clearArchive = (bvid: string): void => {
  showConfirm(
    '摧毁历史档案',
    `即将从宇宙字典中彻底抹除视频 [${bvid}] 的全部记录，无法挽救。是否执行？`,
    () => {
      const cloned = getClonedArchivedData()
      delete cloned[bvid]
      commitArchivedData(cloned)
    }
  )
}
</script>

<style scoped>
.clip-manager-overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(5px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.glass-panel {
  width: 560px;
  max-height: 85vh;
  height: auto;
  border-radius: 16px;
  background: var(--card-bg, #ffffff);
  position: relative;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
[data-theme='dark'] .glass-panel {
  background: #222325;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  color: #e3e5e7;
}

.manager-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #e3e5e7);
  flex-shrink: 0;
}
[data-theme='dark'] .manager-header {
  border-color: rgba(255, 255, 255, 0.08);
}
.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  color: var(--primary-color, #00aeec);
}
.header-title h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main, #18191c);
}
[data-theme='dark'] .header-title h2 {
  color: #e3e5e7;
}
.badge-merge {
  background: linear-gradient(135deg, #ff7a00, #ff004d);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
  animation: pop-out 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: #9499a0;
  transition: 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.close-btn:hover {
  color: #f04c49;
  background: #ffeaea;
  transform: rotate(90deg);
}
[data-theme='dark'] .close-btn:hover {
  background: rgba(240, 76, 73, 0.15);
}

.view-tabs {
  display: flex;
  gap: 10px;
  background: rgba(0, 0, 0, 0.04);
  padding: 4px;
  border-radius: 8px;
}
[data-theme='dark'] .view-tabs {
  background: rgba(255, 255, 255, 0.05);
}
.tab-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 0;
  border-radius: 6px;
  font-size: 14px;
  font-weight: bold;
  color: #61666d;
  cursor: pointer;
  transition: 0.3s;
}
[data-theme='dark'] .tab-btn {
  color: #9499a0;
}
.tab-btn.active {
  background: white;
  color: #18191c;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
[data-theme='dark'] .tab-btn.active {
  background: #363738;
  color: #e3e5e7;
}
.pulse-glow.active {
  color: #00aeec !important;
}

/* 开关魔法 UI */
.batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.03);
  padding: 12px 18px;
  margin: 16px 20px 0 20px;
  border-radius: 8px;
  border: 1px dashed var(--border-color, #e3e5e7);
}
[data-theme='dark'] .batch-toolbar {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.1);
}
.batch-left,
.batch-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.divider-line {
  width: 1px;
  height: 16px;
  background: #e3e5e7;
  margin: 0 4px;
}
[data-theme='dark'] .divider-line {
  background: rgba(255, 255, 255, 0.1);
}
.merge-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  color: #18191c;
  user-select: none;
}
[data-theme='dark'] .merge-switch {
  color: #e3e5e7;
}
.merge-switch input {
  display: none;
}
.switch-ui {
  width: 34px;
  height: 20px;
  background: #d3d5d7;
  border-radius: 10px;
  position: relative;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}
[data-theme='dark'] .switch-ui {
  background: #4b4c4f;
}
.switch-ui::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.merge-switch input:checked + .switch-ui {
  background: linear-gradient(135deg, #ff7a00, #ff004d);
}
.merge-switch input:checked + .switch-ui::after {
  transform: translateX(14px);
}

.batch-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  transition: all 0.2s;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}
[data-theme='dark'] .batch-btn {
  background: #363738;
  color: #e3e5e7;
}
.batch-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
.batch-btn.c-blue {
  color: #00aeec;
}
.batch-btn.c-purple {
  color: #8a58d6;
}
.batch-btn.danger-btn {
  background: transparent;
  color: #f04c49;
  box-shadow: none;
  padding: 6px;
}
.batch-btn.danger-btn:hover {
  background: #ffeaea;
}
[data-theme='dark'] .batch-btn.danger-btn:hover {
  background: rgba(240, 76, 73, 0.15);
}
.sel-count {
  font-size: 13px;
  color: var(--text-sub, #61666d);
  margin-left: 4px;
}
.sel-count strong {
  color: #00aeec;
  font-size: 14px;
}

.manager-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  position: relative;
}
.manager-body::-webkit-scrollbar {
  width: 6px;
}
.manager-body::-webkit-scrollbar-track {
  background: transparent;
}
.manager-body::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}
[data-theme='dark'] .manager-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}
.manager-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

.empty-state {
  text-align: center;
  margin-top: 60px;
  color: #9499a0;
}
.empty-icon {
  opacity: 0.3;
  margin-bottom: 12px;
}
.empty-state span {
  font-size: 12px;
  opacity: 0.7;
  display: block;
  margin-top: 4px;
}

/* 卡片和排列区 */
.clip-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.clip-card {
  display: flex;
  gap: 14px;
  padding: 12px;
  background: white;
  border-radius: 10px;
  border: 1px solid var(--border-color, #e3e5e7);
  position: relative;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
[data-theme='dark'] .clip-card {
  background: #2b2c2f;
  border-color: rgba(255, 255, 255, 0.05);
}
.clip-card:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
  border-color: transparent;
}
[data-theme='dark'] .clip-card:hover {
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4);
}

.card-cover {
  width: 120px;
  height: 68px;
  background: #e3e5e7;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}
[data-theme='dark'] .card-cover {
  background: #18191c;
}
.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #9499a0;
}
.time-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
}
.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  opacity: 0;
  transition: 0.2s;
}
.card-cover:hover .play-overlay {
  opacity: 1;
  backdrop-filter: blur(2px);
}

.card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}
.clip-title-input {
  width: 100%;
  border: none;
  border-bottom: 1px dashed #c0c9d4;
  font-size: 15px;
  font-weight: bold;
  color: #18191c;
  outline: none;
  background: transparent;
  padding: 4px 0;
  transition: 0.2s;
}
[data-theme='dark'] .clip-title-input {
  color: #e3e5e7;
  border-bottom-color: #61666d;
}
.clip-title-input:focus {
  border-bottom-color: #00aeec;
}
.meta-tag.fire {
  font-size: 11px;
  background: #ffeeee;
  color: #f04c49;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
}
[data-theme='dark'] .meta-tag.fire {
  background: rgba(240, 76, 73, 0.15);
}
.del-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  border: none;
  background: #f4f5f7;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #9499a0;
  opacity: 0;
  transition: 0.2s;
}
[data-theme='dark'] .del-btn {
  background: #363738;
}
.clip-card:hover .del-btn {
  opacity: 1;
}
.del-btn:hover {
  background: #f04c49;
  color: white;
  transform: scale(1.1);
}

/* ✨ 拖拽黑魔法样式 */
.segment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}
.list-anim-move,
.list-anim-enter-active,
.list-anim-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}
.list-anim-enter-from,
.list-anim-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.segment-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: white;
  border-radius: 10px;
  border: 1.5px solid transparent;
  transition: all 0.25s;
  cursor: pointer;
  user-select: none;
}
[data-theme='dark'] .segment-item {
  background: #2b2c2f;
}
.segment-item.is-selected {
  border-color: #00aeec;
  background: rgba(0, 174, 236, 0.04);
}
[data-theme='dark'] .segment-item.is-selected {
  background: rgba(0, 174, 236, 0.1);
}

/* 拖拽态样式组 */
.segment-item.is-dragging {
  opacity: 0.3 !important;
  transform: scale(0.98);
}
.segment-item.drag-over {
  border-style: dashed;
  border-color: #ff004d !important;
  background: rgba(255, 0, 77, 0.08) !important;
  transform: scale(1.02);
}

.drag-handle {
  cursor: grab;
  padding: 4px;
  color: #c0c9d4;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.2s;
  margin-left: -6px;
}
.drag-handle:active {
  cursor: grabbing;
  color: #ff004d;
}
[data-theme='dark'] .drag-handle {
  color: #61666d;
}

.seg-checkbox input {
  width: 18px;
  height: 18px;
  accent-color: #00aeec;
  cursor: pointer;
}
.seg-preview {
  width: 90px;
  height: 50px;
  background: #e3e5e7;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}
[data-theme='dark'] .seg-preview {
  background: #18191c;
}
.seg-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.dur-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
  z-index: 2;
}
/* 合并顺位强力高光角标 */
.sort-badge {
  position: absolute;
  top: -4px;
  left: -4px;
  width: 22px;
  height: 22px;
  background: #ff004d;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(255, 0, 77, 0.4);
  z-index: 10;
  border: 2px solid white;
}
[data-theme='dark'] .sort-badge {
  border-color: #2b2c2f;
}
.sequence-pop {
  animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.seg-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.seg-title-row {
  display: flex;
  justify-content: space-between;
}
.seg-title {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #18191c;
}
[data-theme='dark'] .seg-title {
  color: #e3e5e7;
}
.seg-timeline {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #9499a0;
  font-family: Courier, monospace;
}
.timeline-bar {
  flex: 1;
  height: 4px;
  background: #e3e5e7;
  border-radius: 2px;
  overflow: hidden;
}
[data-theme='dark'] .timeline-bar {
  background: #363738;
}
.timeline-fill {
  height: 100%;
  background: #00aeec;
  transition: 0.4s;
}
.segment-item.is-selected .timeline-fill {
  background: #00aeec;
}

/* 📚 全局档案局 */
.archive-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 10px;
}
.archive-group {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  padding: 18px;
  border: 1px solid var(--border-color, #e3e5e7);
}
[data-theme='dark'] .archive-group {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.05);
}
.archive-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.08);
  padding-bottom: 14px;
}
[data-theme='dark'] .archive-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}
.vid-title {
  font-size: 16px;
  font-weight: bold;
  color: #18191c;
  margin: 0;
  padding-right: 12px;
}
[data-theme='dark'] .vid-title {
  color: #e3e5e7;
}
.vid-meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}
.archive-bvid {
  font-size: 12px;
  color: #9499a0;
  font-family: monospace;
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 8px;
  border-radius: 6px;
}
[data-theme='dark'] .archive-bvid {
  background: rgba(255, 255, 255, 0.05);
}
.count-tag {
  font-size: 11px;
  background: rgba(0, 174, 236, 0.1);
  color: #00aeec;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: bold;
}
.archive-actions {
  display: flex;
  gap: 10px;
}
.go-btn {
  background: #00aeec;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: 0.2s;
}
.clear-btn {
  background: #ffeaea;
  color: #f04c49;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: 0.2s;
}
[data-theme='dark'] .clear-btn {
  background: rgba(240, 76, 73, 0.15);
}

.archive-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.arc-card {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  position: relative;
  border: 1px solid rgba(0, 0, 0, 0.02);
}
[data-theme='dark'] .arc-card {
  background: #222325;
  border-color: rgba(255, 255, 255, 0.05);
}
.arc-cover {
  width: 100%;
  height: 75px;
  background: #e3e5e7;
  position: relative;
  cursor: pointer;
}
[data-theme='dark'] .arc-cover {
  background: #18191c;
}
.arc-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.arc-time {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
}
.arc-cover:hover .play-overlay {
  opacity: 1;
}
.arc-info {
  padding: 6px 8px;
}
.mini-title-input {
  width: 100%;
  font-size: 13px;
  font-weight: 500;
  border: none;
  outline: none;
  background: transparent;
  color: #18191c;
}
[data-theme='dark'] .mini-title-input {
  color: #e3e5e7;
}
.arc-del-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: 0.2s;
}
.arc-card:hover .arc-del-btn {
  opacity: 1;
}
.arc-del-btn:hover {
  background: #f04c49;
  transform: scale(1.1);
}

/* 🚀 底部导出黑魔法引擎 */
.manager-footer {
  padding: 18px 24px;
  border-top: 1px solid var(--border-color, #e3e5e7);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}
[data-theme='dark'] .manager-footer {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(34, 35, 37, 0.8);
}
.footer-info {
  font-size: 12px;
  color: #9499a0;
  text-align: center;
  margin-bottom: 10px;
  font-weight: 500;
}
.submit-btn {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #00aeec, #0088cc);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: 0.3s;
  box-shadow: 0 4px 16px rgba(0, 174, 236, 0.3);
}
.submit-btn.btn-merged {
  background: linear-gradient(135deg, #ff7a00, #ff004d);
  box-shadow: 0 4px 16px rgba(255, 0, 77, 0.3);
}
.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 174, 236, 0.5);
}
.submit-btn.btn-merged:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(255, 0, 77, 0.5);
}
.submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}
.submit-btn:disabled {
  background: #e3e5e7;
  color: #9499a0;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}
[data-theme='dark'] .submit-btn:disabled {
  background: #363738;
  color: #61666d;
}

/* Modal 动画 & Confirm */
.confirm-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
.confirm-box {
  background: var(--card-bg, #ffffff);
  border-radius: 16px;
  padding: 30px;
  width: 340px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}
[data-theme='dark'] .confirm-box {
  background: #2b2c2f;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}
.confirm-icon {
  margin-bottom: 16px;
  animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes bounce-in {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes pop-out {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
.confirm-title {
  font-size: 18px;
  font-weight: bold;
  color: #18191c;
  margin: 0 0 12px;
}
[data-theme='dark'] .confirm-title {
  color: #e3e5e7;
}
.confirm-msg {
  font-size: 14px;
  color: #61666d;
  margin: 0 0 24px;
  line-height: 1.5;
}
[data-theme='dark'] .confirm-msg {
  color: #9499a0;
}
.confirm-actions {
  display: flex;
  gap: 12px;
}
.btn-cancel {
  flex: 1;
  padding: 10px 0;
  border: 1px solid #c0c9d4;
  background: transparent;
  border-radius: 8px;
  color: #61666d;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
}
[data-theme='dark'] .btn-cancel {
  border-color: rgba(255, 255, 255, 0.1);
  color: #9499a0;
}
.btn-danger {
  flex: 1;
  padding: 10px 0;
  border: none;
  background: #f04c49;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(240, 76, 73, 0.3);
}

.modal-pop-enter-active,
.modal-pop-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.modal-pop-enter-from,
.modal-pop-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(15px);
}
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}
.fade-scale-enter-from .confirm-box,
.fade-scale-leave-to .confirm-box {
  transform: scale(0.9) translateY(10px);
  opacity: 0;
}
</style>
