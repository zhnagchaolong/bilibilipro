<template>
  <div class="audio-alchemist-container">
    <h4>🎛️ 声音解剖刀 (Web Audio API 物理劫持)</h4>
    <p class="section-desc">从底层声卡节点重混音，绕过播放器限制。(刷新当前页面后失效)</p>

    <div class="audio-mode-grid">
      <button
        class="audio-btn"
        :class="{ 'active-normal': currentMode === 'normal' }"
        @click="switchMode('normal')"
      >
        <span class="icon">🎧</span>
        <div class="info">
          <span class="title">原始直通</span>
          <span class="sub">无任何干扰的原声</span>
        </div>
      </button>

      <button
        class="audio-btn"
        :class="{ 'active-vocal': currentMode === 'vocal' }"
        @click="switchMode('vocal')"
      >
        <span class="icon">🎙️</span>
        <div class="info">
          <span class="title">人声增强</span>
          <span class="sub">拉高2.5kHz频段突出说话</span>
        </div>
      </button>

      <button
        class="audio-btn"
        :class="{ 'active-night': currentMode === 'night' }"
        @click="switchMode('night')"
      >
        <span class="icon">🌙</span>
        <div class="info">
          <span class="title">夜魔模式</span>
          <span class="sub">动态压限，爆音不再吓人</span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

type AudioMode = 'normal' | 'vocal' | 'night'

// 1. 🚀 从本地硬盘读取上一次记录的模式，如果没用过就是 'normal'
const savedMode = (localStorage.getItem('bili-audio-mode') as AudioMode) || 'normal'
const currentMode = ref<AudioMode>(savedMode)

// 跟父组件通讯的遥控器信号
const emit = defineEmits<{
  (e: 'apply-audio-eq', mode: AudioMode): void
}>()

// 2. 💾 只要模式一改变，立刻写入硬盘持久化！
watch(currentMode, (newVal) => {
  localStorage.setItem('bili-audio-mode', newVal)
})

const switchMode = (mode: AudioMode): void => {
  if (currentMode.value === mode) return
  currentMode.value = mode
  // 向父组件申请注入底层代码
  emit('apply-audio-eq', mode)
}

// 3. ✨ 组件打开时，如果原来设置了特殊模式，顺带给底层补发一次请求（不仅修复UI，还防止底层环境变动丢失效果）
onMounted(() => {
  if (currentMode.value !== 'normal') {
    emit('apply-audio-eq', currentMode.value)
  }
})
</script>

<style scoped>
.audio-alchemist-container {
  width: 100%;
}
h4 {
  margin: 0 0 8px;
  font-size: 15px;
  color: var(--text-main, #18191c);
}
.section-desc {
  font-size: 12px;
  color: var(--text-sub, #9499a0);
  margin-bottom: 12px;
}
.audio-mode-grid {
  display: flex;
  gap: 10px;
}
.audio-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid var(--border-color, #e3e5e7);
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.audio-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}
.audio-btn .info {
  display: flex;
  flex-direction: column;
}
.audio-btn .title {
  font-size: 13px;
  font-weight: bold;
  color: var(--text-main, #18191c);
}
.audio-btn .sub {
  font-size: 10px;
  opacity: 0.6;
  color: var(--text-sub, #9499a0);
  margin-top: 2px;
}
.icon {
  font-size: 20px;
}

/* 选中状态的高亮（采用不同的颜色区分效果） */
.active-normal {
  border-color: #61666d;
  background: rgba(97, 102, 109, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.active-normal .title {
  color: #61666d;
}

.active-vocal {
  border-color: #f3a034;
  background: rgba(243, 160, 52, 0.1);
  box-shadow: 0 4px 12px rgba(243, 160, 52, 0.15);
}
.active-vocal .title {
  color: #f3a034;
}

.active-night {
  border-color: #8a58d6;
  background: rgba(138, 88, 214, 0.1);
  box-shadow: 0 4px 12px rgba(138, 88, 214, 0.15);
}
.active-night .title {
  color: #8a58d6;
}

/* 黑暗模式适配 */
[data-theme='dark'] .audio-btn {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}
[data-theme='dark'] .audio-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}
[data-theme='dark'] .active-normal .title {
  color: #e3e5e7;
}
[data-theme='dark'] .active-vocal .title {
  color: #f8c97b;
}
[data-theme='dark'] .active-vocal {
  border-color: #f8c97b;
}
[data-theme='dark'] .active-night .title {
  color: #b185f2;
}
[data-theme='dark'] .active-night {
  border-color: #b185f2;
}
</style>
