<!-- TasksView.vue -->
<script setup lang="ts">
import { useTasksView } from '@renderer/composables/tasks/useTasksView'

const {
  cronTime,
  isCronEnabled,
  isLoggedIn,
  accounts,
  activeSelectId,
  toggleSelect,
  getStrategyLabel,
  getWatchTimeLabel,
  taskConfig,
  isRunning,
  logs,
  terminalRef,
  sanitizeNumberInput,
  clearLogs,
  notifyChange,
  applyCron,
  handleTimeChange,
  handleStartTasks
} = useTasksView()
</script>

<template>
  <div class="tasks-view">
    <div class="page-header">
      <h2>🤖 自动化任务</h2>
      <p class="subtitle">配置并执行每日任务，自动获取经验与奖励</p>
    </div>

    <div class="layout-grid">
      <!-- === 控制配置面板 === -->
      <div class="settings-panel card position-relative">
        <!-- 遮罩层不变 -->
        <transition name="fade">
          <div v-if="!isLoggedIn" class="login-lock-overlay">
            <div class="lock-content">
              <div class="lock-icon">🔒</div>
              <h4>系统锁定</h4>
              <p>检测不到会话状态，<br />请先在界面完成账号登录</p>
            </div>
          </div>
        </transition>

        <h3>📋 任务模块</h3>
        <div class="task-list">
          <label class="task-item" :class="{ 'is-active': taskConfig.dailySign }">
            <div class="task-info">
              <span class="task-name">主站每日签到</span>
            </div>
            <input v-model="taskConfig.dailySign" type="checkbox" class="toggle-switch" />
          </label>
          <label class="task-item" :class="{ 'is-active': taskConfig.watchVideo }">
            <div class="task-info">
              <span class="task-name">每日模拟观看</span>
            </div>
            <input v-model="taskConfig.watchVideo" type="checkbox" class="toggle-switch" />
          </label>
          <label class="task-item" :class="{ 'is-active': taskConfig.autoCoin }">
            <div class="task-info">
              <span class="task-name">基于算法的自动投币</span>
            </div>
            <input v-model="taskConfig.autoCoin" type="checkbox" class="toggle-switch" />
          </label>

          <label class="task-item" :class="{ 'is-active': taskConfig.autoLottery }">
            <div class="task-info">
              <span class="task-name" style="color: #4caf50">自动化动态抽奖</span>
              <span class="task-desc">自动扫描指定UP主/机器人的主页，穿透套娃转发直达抽奖源头</span>

              <div v-if="taskConfig.autoLottery" class="inline-box mt-5" @click.prevent.stop>
                <span class="tip" style="margin-left: 4px">目标:</span>
                <div class="num-input-wrapper mini-wrapper" style="width: 140px">
                  <input
                    v-model="taskConfig.lotteryWord"
                    placeholder="如: 互动抽奖 或 844005"
                    class="mini-input"
                    title="可填入专门的抽奖机器人UID或名字"
                    style="width: 100%"
                    @change="notifyChange('抽奖目标节点')"
                  />
                </div>
                <span class="ml-5 tip">每日尝试:</span>
                <div class="num-input-wrapper mini-wrapper" style="width: 60px">
                  <input
                    :value="taskConfig.lotteryMaxCount"
                    type="number"
                    min="1"
                    max="10"
                    class="mini-input"
                    style="width: 100%"
                    @input="
                      sanitizeNumberInput($event, 1, 10, (val) => {
                        taskConfig.lotteryMaxCount = val
                        notifyChange('抽奖容量')
                      })
                    "
                  />
                  <span class="unit">次</span>
                </div>
              </div>
            </div>
            <input v-model="taskConfig.autoLottery" type="checkbox" class="toggle-switch" />
          </label>

          <label class="task-item" :class="{ 'is-active': taskConfig.silverToCoin }">
            <div class="task-info"><span class="task-name">银瓜子直兑硬币</span></div>
            <input v-model="taskConfig.silverToCoin" type="checkbox" class="toggle-switch" />
          </label>
          <label class="task-item" :class="{ 'is-active': taskConfig.mangaSign }">
            <div class="task-info"><span class="task-name">包含哔哩漫读签到</span></div>
            <input v-model="taskConfig.mangaSign" type="checkbox" class="toggle-switch" />
          </label>
        </div>

        <div class="advanced-params mt-10">
          <h4>⚙️ 策略与参数深度配置</h4>

          <div
            v-if="taskConfig.watchVideo || taskConfig.autoCoin || taskConfig.shareVideo"
            class="param-group"
            @click.stop
          >
            <div class="param-label text-bold">
              基础操作抓取目标池 <span class="tip">(推荐选排行榜)</span>
            </div>
            <!-- 🌟 替换：使用自定义下拉菜单组件 -->
            <div class="cy-select-container">
              <div class="cy-select-trigger" @click="toggleSelect('videoStrategy')">
                {{ getStrategyLabel(taskConfig.videoStrategy) }}
                <span class="cy-arrow" :class="{ up: activeSelectId === 'videoStrategy' }"></span>
              </div>
              <transition name="cy-fade">
                <div v-if="activeSelectId === 'videoStrategy'" class="cy-select-menu">
                  <div
                    class="cy-option"
                    @click=";((taskConfig.videoStrategy = 'rank'), notifyChange('视频获取策略'))"
                  >
                    默认排行榜公海 (有效率高)
                  </div>
                  <div
                    class="cy-option"
                    @click="
                      ;((taskConfig.videoStrategy = 'partition'), notifyChange('视频获取策略'))
                    "
                  >
                    使用指定分区ID作为样本点
                  </div>
                  <div
                    class="cy-option"
                    @click=";((taskConfig.videoStrategy = 'keyword'), notifyChange('视频获取策略'))"
                  >
                    以指定的内容关键词检索抓取
                  </div>
                  <div
                    class="cy-option"
                    @click=";((taskConfig.videoStrategy = 'custom'), notifyChange('视频获取策略'))"
                  >
                    针对固定的视频BVID一直刷
                  </div>
                </div>
              </transition>
            </div>

            <input
              v-if="taskConfig.videoStrategy === 'partition'"
              v-model="taskConfig.videoTargetValue"
              placeholder="需要传入ID，例如: 1是动画版块, 36是科学栏目"
              class="param-input mt-5"
              @change="notifyChange('指定分区')"
            />
            <input
              v-if="taskConfig.videoStrategy === 'keyword'"
              v-model="taskConfig.videoTargetValue"
              placeholder="输入相关词: 例如 游戏开发"
              class="param-input mt-5"
              @change="notifyChange('词条策略')"
            />
            <input
              v-if="taskConfig.videoStrategy === 'custom'"
              v-model="taskConfig.videoTargetValue"
              placeholder="填入单个视频例如 BV11T4y1i7Mv"
              class="param-input mt-5"
              @change="notifyChange('锁死视频源')"
            />
          </div>

          <div v-if="taskConfig.watchVideo" class="grid-2col mt-10">
            <div class="param-group">
              <div class="param-label"><span class="tip">观看频次上限</span></div>
              <div class="num-input-wrapper">
                <!-- 🔧 修复：添加输入值净化处理 -->
                <input
                  :value="taskConfig.watchVideoCount"
                  type="number"
                  min="1"
                  max="100"
                  class="param-input"
                  @input="
                    sanitizeNumberInput($event, 1, 100, (val) => {
                      taskConfig.watchVideoCount = val
                      notifyChange('频次调整')
                    })
                  "
                />
                <span class="unit">个</span>
              </div>
            </div>
            <div class="param-group" @click.stop>
              <div class="param-label"><span class="tip">逗留驻留计算引擎</span></div>
              <!-- 🌟 替换：使用自定义下拉菜单组件 -->
              <div class="cy-select-container">
                <div class="cy-select-trigger" @click="toggleSelect('watchTimeStrategy')">
                  {{ getWatchTimeLabel(taskConfig.watchTimeStrategy) }}
                  <span
                    class="cy-arrow"
                    :class="{ up: activeSelectId === 'watchTimeStrategy' }"
                  ></span>
                </div>
                <transition name="cy-fade">
                  <div v-if="activeSelectId === 'watchTimeStrategy'" class="cy-select-menu">
                    <div
                      class="cy-option"
                      @click="
                        ;((taskConfig.watchTimeStrategy = 'random'), notifyChange('反作弊留存设置'))
                      "
                    >
                      随机秒区间防风控机制
                    </div>
                    <div
                      class="cy-option"
                      @click="
                        ;((taskConfig.watchTimeStrategy = 'percentage'),
                          notifyChange('反作弊留存设置'))
                      "
                    >
                      基于原片比例推演时长
                    </div>
                    <div
                      class="cy-option"
                      @click="
                        ;((taskConfig.watchTimeStrategy = 'fixed'), notifyChange('反作弊留存设置'))
                      "
                    >
                      生硬但起步轻的固定数值
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>
          <div v-if="taskConfig.watchVideo" class="param-group">
            <div class="num-input-wrapper">
              <input
                v-if="taskConfig.watchTimeStrategy === 'random'"
                v-model="taskConfig.watchTimeRandomValue"
                placeholder="安全随机边界: 15,100"
                class="param-input tip-input"
                @change="notifyChange('上下波动边界值')"
              />
              <span v-if="taskConfig.watchTimeStrategy === 'random'" class="unit">秒</span>

              <!-- 🔧 修复：添加输入值净化处理 -->
              <input
                v-if="taskConfig.watchTimeStrategy === 'percentage'"
                :value="taskConfig.watchTimePercentage"
                type="number"
                min="1"
                max="100"
                placeholder="占比上限: 70代表看70%"
                class="param-input tip-input"
                @input="
                  sanitizeNumberInput($event, 1, 100, (val) => {
                    taskConfig.watchTimePercentage = val
                    notifyChange('比对参数')
                  })
                "
              />
              <span v-if="taskConfig.watchTimeStrategy === 'percentage'" class="unit">%</span>

              <!-- 🔧 修复：添加输入值净化处理 -->
              <input
                v-if="taskConfig.watchTimeStrategy === 'fixed'"
                :value="taskConfig.watchTimeFixed"
                type="number"
                min="1"
                max="3600"
                placeholder="强制发送数值例如 15"
                class="param-input tip-input"
                @input="
                  sanitizeNumberInput($event, 1, 3600, (val) => {
                    taskConfig.watchTimeFixed = val
                    notifyChange('基础固化')
                  })
                "
              />
              <span v-if="taskConfig.watchTimeStrategy === 'fixed'" class="unit">秒</span>
            </div>
          </div>

          <div v-if="taskConfig.autoCoin" class="param-group mb-12">
            <div class="param-label"><span>每日强制投币最大出列数量</span></div>
            <div class="num-input-wrapper">
              <!-- 🔧 修复：添加输入值净化处理 -->
              <input
                :value="taskConfig.coinTarget"
                type="number"
                min="0"
                max="5"
                class="param-input"
                @input="
                  sanitizeNumberInput($event, 0, 5, (val) => {
                    taskConfig.coinTarget = val
                    notifyChange('预算阀值')
                  })
                "
              />
              <span class="unit">枚</span>
            </div>
          </div>

          <div class="param-group mt-15 shadow-box">
            <div class="param-label text-bold">🔗 指定目标代理账号阵列</div>
            <div class="account-select-grid">
              <label
                v-for="acc in accounts"
                :key="acc.partition"
                class="acc-check-item"
                :class="{ 'is-selected': taskConfig.targetAccounts.includes(acc.partition) }"
              >
                <img :src="acc.face" class="acc-avatar" referrerpolicy="no-referrer" />
                <span class="acc-name">{{ acc.name }}</span>
                <input v-model="taskConfig.targetAccounts" type="checkbox" :value="acc.partition" />
                <div class="check-circle"><div class="check-inner"></div></div>
              </label>
              <div v-if="accounts.length === 0" class="tip text-center span-2">
                缓存库查无归隐人员可供分配。
              </div>
            </div>
          </div>

          <div class="param-group mt-10 shadow-box cron-box">
            <div class="flex-bw alg-center">
              <div>
                <span class="f14 text-bold">⏰ 常驻后台定时激活功能</span><br /><span
                  class="tip f12"
                  >通过设定具体的节点参数拉起后台指令</span
                >
              </div>
              <input
                v-model="isCronEnabled"
                type="checkbox"
                class="toggle-switch"
                @change="applyCron(false)"
              />
            </div>
            <input
              v-model="cronTime"
              type="time"
              class="param-input mt-10"
              :style="{ opacity: isCronEnabled ? 1 : 0.4 }"
              @change="handleTimeChange"
            />
          </div>
        </div>

        <div class="action-area mt-10">
          <button
            class="btn-run"
            :class="{ running: isRunning }"
            :disabled="isRunning || !isLoggedIn"
            @click="handleStartTasks"
          >
            <span class="icon">{{ isRunning ? '⚙️' : '▶️' }}</span>
            <span>{{ isRunning ? '流程锁已启动并开始作业...' : '授权运行当前选定列表' }}</span>
          </button>
        </div>
      </div>
      <!-- 右侧 Terminal 面板保持不变 -->
      <div class="terminal-panel card">
        <div class="terminal-header">
          <div class="mac-btns"><span></span><span></span><span></span></div>
          <div class="terminal-title">日志回溯</div>
          <button class="btn-clear" title="清除屏幕记录" @click="clearLogs">
            <span style="opacity: 0.6">🗑️</span>
          </button>
        </div>
        <div ref="terminalRef" class="terminal-body" :class="{ 'terminal-locked': !isLoggedIn }">
          <div v-if="logs.length === 0" class="empty-log">
            > 等待工作流激活... <span class="blink">_</span>
          </div>
          <div v-for="(log, idx) in logs" :key="idx" class="log-line">
            <span v-if="log.includes('❌') || log.includes('🚫')" class="err">{{ log }}</span>
            <span
              v-else-if="
                log.includes('✅') || log.includes('🎉') || log.includes('👑') || log.includes('🔓')
              "
              class="succ"
              >{{ log }}</span
            >
            <span
              v-else-if="
                log.includes('⚠️') || log.includes('🎯') || log.includes('🎲') || log.includes('🔒')
              "
              class="warn"
              >{{ log }}</span
            >
            <span v-else class="info">{{ log }}</span>
          </div>
          <div v-if="logs.length > 0" class="log-line">
            <span class="info"><span class="blink">_</span></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ...原样式保持不变... */

/* 🌟 新增：从 DownloaderView 移植过来的自定义下拉菜单样式 */
.cy-select-container {
  position: relative;
  width: 100%;
}
.cy-select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-main);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  box-sizing: border-box;
}
.cy-select-trigger:hover {
  border-color: var(--primary-color);
}
.cy-arrow {
  display: inline-block;
  width: 12px;
  height: 12px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239499A0' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3Cpolyline points='6 9 12 15 18 9'%3e%3C/polyline%3e%3C/svg%3e");
  background-size: contain;
  background-repeat: no-repeat;
  transition: transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
.cy-arrow.up {
  transform: rotate(180deg);
}
.cy-select-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 100;
  box-sizing: border-box;
}
.cy-option {
  padding: 10px 14px;
  font-size: 13px;
  color: var(--text-main);
  border-radius: 6px;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
  white-space: nowrap;
  font-weight: 500;
}
.cy-option:hover {
  background: rgba(0, 174, 236, 0.08);
  color: var(--primary-color);
}
.cy-fade-enter-active,
.cy-fade-leave-active {
  transition:
    opacity 0.2s ease,
    margin-top 0.2s ease;
}
.cy-fade-enter-from,
.cy-fade-leave-to {
  opacity: 0;
  margin-top: -8px;
}
/* ...其他样式... */
.tasks-view {
  animation: slideUp 0.4s ease-out;
}
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.page-header {
  margin-bottom: 24px;
}
.page-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: var(--text-main);
}
.subtitle {
  margin: 6px 0 0 0;
  color: var(--text-sub);
  font-size: 14px;
}
.layout-grid {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 24px;
  align-items: start;
}
.card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  overflow: hidden;
}

/* 🔒 锁屏遮罩 */
.position-relative {
  position: relative;
}
.login-lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  background: rgba(30, 30, 30, 0.8);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-lg);
}
.lock-content {
  padding: 32px;
  text-align: center;
}
.lock-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.lock-content h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 800;
  color: white;
}
.lock-content p {
  color: #ccc;
  line-height: 1.5;
}

/* 设置模块 */
.settings-panel {
  padding: 24px;
}
.settings-panel h3 {
  margin: 0 0 15px 0;
  color: var(--primary-color);
  font-size: 16px;
}
.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}
.task-item:hover {
  border-color: rgba(0, 174, 236, 0.5);
}
.task-item.is-active {
  background: rgba(0, 174, 236, 0.08);
  border-color: rgba(0, 174, 236, 0.4);
}
.task-name {
  font-weight: bold;
  font-size: 14px;
  color: var(--text-main);
}
.task-desc {
  font-size: 11px;
  color: var(--text-sub);
  display: block;
  margin-top: 3px;
}

/* 开关样式 */
.toggle-switch {
  appearance: none;
  width: 44px;
  height: 24px;
  background: var(--border-color);
  border-radius: 50px;
  outline: none;
  cursor: pointer;
  position: relative;
  transition: 0.3s;
}
.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
.toggle-switch:checked {
  background: var(--primary-color);
}
.toggle-switch:checked::after {
  transform: translateX(20px);
}

/* 参数输入框架 */
.advanced-params {
  padding-top: 15px;
  border-top: 1px dashed var(--border-color);
}
.advanced-params h4 {
  margin: 0 0 16px 0;
  font-size: 15px;
  color: var(--text-main);
  font-weight: bold;
}
.grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.param-group {
  margin-bottom: 6px;
}
.param-label {
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--text-main);
}
.param-input {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-color);
  color: var(--text-main);
  outline: none;
  font-size: 13px;
  transition: 0.2s;
  box-sizing: border-box;
}
.param-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(0, 174, 236, 0.15);
}
.tip-input {
  border-left: 3px solid #ffbd2e !important;
}

input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type='number'] {
  -moz-appearance: textfield;
  appearance: none;
}

.num-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.num-input-wrapper .param-input {
  padding-right: 32px;
}
.mini-wrapper .mini-input {
  padding-right: 22px;
}
.num-input-wrapper .unit {
  position: absolute;
  right: 12px;
  color: var(--text-sub);
  font-size: 12px;
  pointer-events: none;
  font-weight: 500;
  opacity: 0.8;
}

.mt-5 {
  margin-top: 5px;
}
.mt-10 {
  margin-top: 12px;
}
.mt-15 {
  margin-top: 20px;
}
.mb-12 {
  margin-bottom: 12px;
}
.ml-5 {
  margin-left: 8px;
}
.text-bold {
  font-weight: bold;
}
.f14 {
  font-size: 14px;
}
.f12 {
  font-size: 12px;
}
.flex-bw {
  display: flex;
  justify-content: space-between;
}
.alg-center {
  align-items: center;
}
.tip {
  color: var(--text-sub);
  font-size: 12px;
  font-weight: normal;
}
.inline-box {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--card-bg);
  padding: 6px;
  border-radius: 6px;
  border: 1px dashed var(--border-color);
}
.mini-input {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}
.mini-input:focus {
  border-color: #4caf50;
}
.shadow-box {
  background: var(--bg-color);
  padding: 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}
.account-select-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
}
.acc-check-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: 0.2s;
}
.acc-check-item:hover {
  border-color: var(--primary-color);
}
.acc-check-item.is-selected {
  background: rgba(0, 174, 236, 0.08);
  border-color: var(--primary-color);
}
.acc-check-item input[type='checkbox'] {
  display: none;
}
.acc-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}
.acc-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-main);
}
.check-circle {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.2s;
}
.acc-check-item.is-selected .check-circle {
  border-color: var(--primary-color);
  background: var(--primary-color);
}
.check-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
  transform: scale(0);
  transition: transform 0.2s;
}
.acc-check-item.is-selected .check-inner {
  transform: scale(1);
}

.cron-box {
  background: var(--bg-color);
}

/* 执行按钮 */
.action-area {
  display: flex;
  justify-content: center;
}
.btn-run {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-run:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 174, 236, 0.3);
}
.btn-run:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-run.running {
  background: #e6a23c;
}

/* Terminal 面板 */
.terminal-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 500px;
}
.terminal-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
}
.mac-btns {
  display: flex;
  gap: 6px;
  margin-right: 12px;
}
.mac-btns span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.mac-btns span:nth-child(1) {
  background: #ff5f56;
}
.mac-btns span:nth-child(2) {
  background: #ffbd2e;
}
.mac-btns span:nth-child(3) {
  background: #27c93f;
}
.terminal-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-sub);
}
.btn-clear {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  border-radius: 4px;
  transition: 0.2s;
}
.btn-clear:hover {
  background: rgba(0, 0, 0, 0.05);
}
.terminal-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.6;
  background: #1e1e1e;
  color: #e3e5e7;
}
.terminal-locked {
  filter: blur(2px);
  pointer-events: none;
}
.empty-log {
  color: #61666d;
}
.log-line {
  margin-bottom: 2px;
  word-break: break-all;
}
.log-line .err {
  color: #ff5f56;
}
.log-line .succ {
  color: #27c93f;
}
.log-line .warn {
  color: #ffbd2e;
}
.log-line .info {
  color: #9499a0;
}
.blink {
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
