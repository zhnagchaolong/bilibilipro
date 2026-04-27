<template>
  <div class="time-jumper-wrapper">
    <h4>🚀 时光刺客 (Time Jumper)</h4>
    <p class="section-desc">修改时间轴规则，利用弹幕高维启发式雷达自动闪避不想看的内容。</p>

    <div class="jumper-controls">
      <!-- 恰饭雷达开关 -->
      <button class="radar-btn" :class="{ 'radar-active': config.radar }" @click="toggleRadar">
        <div v-if="config.radar" class="radar-scan"></div>
        <span class="icon">{{ config.radar ? '🛡️' : '📡' }}</span>
        <div class="info">
          <span class="title">恰饭智能雷达 {{ config.radar ? 'ON' : 'OFF' }}</span>
          <span class="sub">检测到“恰饭/跳过”等弹幕暴增时，自动跃迁15秒</span>
        </div>
      </button>

      <!-- 片头尾设置 -->
      <div class="skip-inputs-group">
        <div class="skip-item">
          <span class="label">⏭️ 跳过片头</span>
          <div class="input-box">
            <input v-model="config.intro" type="number" min="0" max="999" @change="emitUpdate" />
            <span class="unit">秒</span>
          </div>
        </div>
        <div class="divider-v"></div>
        <div class="skip-item">
          <span class="label">⏭️ 斩断片尾</span>
          <div class="input-box">
            <input v-model="config.outro" type="number" min="0" max="999" @change="emitUpdate" />
            <span class="unit">秒</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, onMounted } from 'vue'

const emit = defineEmits<{
  (e: 'apply-time-jumper', config: { radar: boolean; intro: number; outro: number }): void
}>()

// 🚀 从本地硬盘读取记忆，默认值为之前的设置
const config = reactive({
  radar: localStorage.getItem('bili-tj-radar') === 'true',
  intro: Number(localStorage.getItem('bili-tj-intro') || 0),
  outro: Number(localStorage.getItem('bili-tj-outro') || 0)
})

// 💾 一旦状态改变，瞬间存入本地，治愈失忆症！
watch(
  () => config.radar,
  (val) => localStorage.setItem('bili-tj-radar', val.toString())
)
watch(
  () => config.intro,
  (val) => localStorage.setItem('bili-tj-intro', val.toString())
)
watch(
  () => config.outro,
  (val) => localStorage.setItem('bili-tj-outro', val.toString())
)

const toggleRadar = (): void => {
  config.radar = !config.radar
  emitUpdate()
}

const emitUpdate = (): void => {
  emit('apply-time-jumper', { ...config })
}

// 打开面板时，主动将现有状态发送给底部引擎一次，防止它睡着
onMounted(() => {
  if (config.radar || config.intro > 0 || config.outro > 0) {
    emitUpdate()
  }
})
</script>

<style scoped>
.time-jumper-wrapper {
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
.jumper-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 雷达按钮 */
.radar-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid var(--border-color, #e3e5e7);
  padding: 12px 16px;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: all 0.3s;
  overflow: hidden;
}
.radar-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}
.radar-btn.radar-active {
  border-color: #f04c49;
  background: rgba(240, 76, 73, 0.1);
  box-shadow: 0 4px 12px rgba(240, 76, 73, 0.15);
}
.radar-btn .info {
  display: flex;
  flex-direction: column;
  z-index: 2;
}
.radar-btn .title {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-main, #18191c);
  transition: color 0.3s;
}
.radar-btn.radar-active .title {
  color: #f04c49;
}
.radar-btn .sub {
  font-size: 11px;
  opacity: 0.7;
  color: var(--text-sub, #9499a0);
  margin-top: 2px;
}
.icon {
  font-size: 20px;
  z-index: 2;
}

/* 扫描动画 */
.radar-scan {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(240, 76, 73, 0.2), transparent);
  width: 200%;
  transform: translateX(-100%);
  animation: scan 2.5s infinite linear;
  z-index: 1;
  pointer-events: none;
}
@keyframes scan {
  100% {
    transform: translateX(50%);
  }
}

/* 片头片尾输入框 */
.skip-inputs-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.02);
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid var(--border-color, #e3e5e7);
}
.skip-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
.label {
  font-size: 12px;
  font-weight: bold;
  color: var(--text-main);
}
.input-box {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.input-box input {
  width: 50px;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 14px;
  font-family: monospace;
  font-weight: bold;
  color: var(--primary-color, #00aeec);
  outline: none;
  transition: 0.3s;
  text-align: center;
}
.input-box input:focus {
  border-color: var(--primary-color, #00aeec);
  background: transparent;
}
.unit {
  font-size: 12px;
  color: var(--text-sub);
}
.divider-v {
  width: 1px;
  height: 30px;
  background: var(--border-color, #e3e5e7);
  margin: 0 20px;
}

/* 暗黑模式 */
[data-theme='dark'] .radar-btn {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}
[data-theme='dark'] .radar-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}
[data-theme='dark'] .radar-btn.radar-active {
  background: rgba(240, 76, 73, 0.15);
  border-color: #f04c49;
}
[data-theme='dark'] .skip-inputs-group {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
}
[data-theme='dark'] .input-box input {
  background: rgba(255, 255, 255, 0.1);
}
[data-theme='dark'] .divider-v {
  background: rgba(255, 255, 255, 0.1);
}
</style>
