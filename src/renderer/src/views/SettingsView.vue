<script setup lang="ts">
import { useSettingsView } from '@renderer/composables/settings/useSettingsView'

const {
  customTheme,
  themeMode,
  netBlocker,
  alwaysOnTop,
  closeAction,
  openAtLogin,
  hwAcceleration,
  isAssistantVisible,
  showResetModal,
  toastMsg,
  showToast,
  activeSelectId,
  toggleSelect,
  getThemeLabel,
  getActionLabel,
  llmSettings,
  assistantAISettings,
  copyAIToAssistant,
  currentProviderConfig,
  setLlmProvider,
  handleToggleAssistant,
  applyThemeColor,
  saveBasicSettings,
  selectThemeMode,
  selectCloseAction,
  clearCache
} = useSettingsView()
</script>

<template>
  <div class="settings-view">
    <div class="page-header">
      <h2>⚙️ 全局配置与 AI 引擎</h2>
      <p class="subtitle">管理应用运行偏好、AI 数据分析引擎与 Live2D 看板娘</p>
    </div>

    <div class="settings-grid">
      <!-- 左侧列 -->
      <div class="left-col">
        <!-- ==========================
             🤖 AI 数据分析引擎
             ========================== -->
        <div class="settings-card ai-engine-card">
          <div class="card-header">
            <h3>🤖 AI 数据分析引擎</h3>
            <p class="desc">为 UP主深度分析和视频深度分析提供智能洞察</p>
          </div>

          <div class="card-body mt-15">
            <div class="setting-item flex-bw alg-center mb-10">
              <div>
                <span class="f14 text-bold">🧠 启用 AI 智能分析</span><br />
                <span class="f12 tip">开启后 Dashboard 分析将接入大语言模型生成专业报告</span>
              </div>
              <input v-model="llmSettings.enabled" type="checkbox" class="toggle-switch" />
            </div>

            <div class="llm-config-wrapper" :class="{ 'is-disabled': !llmSettings.enabled }">
              <div class="provider-selector mt-15">
                <div class="param-label text-bold mb-10">选择算力供应商</div>
                <div class="pill-group">
                  <button
                    class="pill-btn"
                    :class="{ active: llmSettings.provider === 'DeepSeek' }"
                    @click="setLlmProvider('DeepSeek')"
                  >
                    DeepSeek
                  </button>
                  <button
                    class="pill-btn"
                    :class="{ active: llmSettings.provider === 'Qwen' }"
                    @click="setLlmProvider('Qwen')"
                  >
                    通义千问
                  </button>
                  <button
                    class="pill-btn"
                    :class="{ active: llmSettings.provider === 'OpenAI' }"
                    @click="setLlmProvider('OpenAI')"
                  >
                    OpenAI
                  </button>
                  <button
                    class="pill-btn"
                    :class="{ active: llmSettings.provider === 'Custom' }"
                    @click="setLlmProvider('Custom')"
                  >
                    自定义
                  </button>
                </div>
              </div>

              <div class="param-group mt-15">
                <div class="param-label text-bold">🔑 API Key (密钥)</div>
                <input
                  v-model="llmSettings.apiKey"
                  type="password"
                  placeholder="sk-xxxxxxxxxxxxxxxxxxx"
                  class="param-input secure-input"
                />
              </div>

              <div class="grid-2col mt-15">
                <div class="param-group">
                  <div class="param-label text-bold">🌐 Base URL</div>
                  <input
                    v-model="currentProviderConfig.baseUrl"
                    type="text"
                    placeholder="https://api.deepseek.com/v1"
                    class="param-input"
                  />
                </div>
                <div class="param-group">
                  <div class="param-label text-bold">🧠 Model</div>
                  <input
                    v-model="currentProviderConfig.modelName"
                    type="text"
                    placeholder="deepseek-chat"
                    class="param-input"
                  />
                </div>
              </div>

              <div class="param-group mt-15">
                <div class="flex-bw alg-center mb-5">
                  <div class="param-label text-bold mb-0">🌡️ Temperature</div>
                  <span class="val-display">{{ llmSettings.temperature.toFixed(2) }}</span>
                </div>
                <div class="slider-wrapper">
                  <input
                    v-model.number="llmSettings.temperature"
                    type="range"
                    min="0"
                    max="2"
                    step="0.01"
                    class="param-slider"
                  />
                  <div class="slider-labels">
                    <span>严谨</span>
                    <span>创造性</span>
                  </div>
                </div>
              </div>

              <div class="ai-status-bar mt-15">
                <span v-if="llmSettings.enabled && llmSettings.apiKey" class="status-succ">
                  🟢 AI 引擎已就绪
                </span>
                <span v-else-if="llmSettings.enabled" class="status-warn">
                  🟡 等待填入 API Key
                </span>
                <span v-else class="status-off">⚫ AI 引擎休眠中</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ==========================
             🎭 Live2D 看板娘 AI
             ========================== -->
        <div class="settings-card assistant-card mt-15">
          <div class="card-header">
            <h3>🎭 Live2D 看板娘 AI</h3>
            <p class="desc">召唤桌面宠物并为她注入灵魂，陪你观看视频</p>
          </div>

          <div class="card-body mt-15">
            <!-- 召唤开关 -->
            <div class="setting-item flex-bw alg-center pb-15 border-bottom">
              <div>
                <span class="f14 text-bold" style="color: var(--primary-color)"
                  >✨ 召唤桌面看板娘</span
                ><br />
                <span class="f12 tip">在屏幕右下角呼出 Live2D 虚拟助理窗口</span>
              </div>
              <input
                v-model="isAssistantVisible"
                type="checkbox"
                class="toggle-switch"
                @change="handleToggleAssistant"
              />
            </div>

            <!-- AI 对话开关 -->
            <div class="setting-item flex-bw alg-center mt-15 mb-10">
              <div>
                <span class="f14 text-bold">💬 启用 AI 对话</span><br />
                <span class="f12 tip">开启后看板娘将连接大语言模型与你互动</span>
              </div>
              <input v-model="assistantAISettings.enabled" type="checkbox" class="toggle-switch" />
            </div>

            <div
              class="llm-config-wrapper"
              :class="{ 'is-disabled': !assistantAISettings.enabled }"
            >
              <!-- AI 来源选择 -->
              <div class="setting-item flex-bw alg-center mt-15 pb-15 border-bottom">
                <div>
                  <span class="f14 text-bold">🔗 复用数据分析 AI 设置</span><br />
                  <span class="f12 tip">开启则使用上方的 AI 引擎配置，关闭可独立配置</span>
                </div>
                <input
                  v-model="assistantAISettings.useSharedAI"
                  type="checkbox"
                  class="toggle-switch"
                />
              </div>

              <!-- 一键复制按钮 -->
              <div v-if="assistantAISettings.useSharedAI" class="copy-ai-section mt-15">
                <button
                  class="btn-copy-ai"
                  :disabled="!llmSettings.enabled || !llmSettings.apiKey"
                  @click="copyAIToAssistant"
                >
                  📋 一键复制 AI 智能分析设置
                </button>
                <p
                  v-if="!llmSettings.enabled || !llmSettings.apiKey"
                  class="f12 tip mt-5"
                  style="color: #faad14"
                >
                  请先配置并启用上方的 AI 数据分析引擎
                </p>
              </div>

              <!-- 独立 API 配置（不复用时显示） -->
              <div v-else class="independent-ai-config mt-15">
                <div class="param-label text-bold mb-10" style="color: var(--primary-color)">
                  🎨 看板娘独立 AI 配置
                </div>

                <div class="pill-group mb-15">
                  <button
                    class="pill-btn"
                    :class="{ active: assistantAISettings.provider === 'DeepSeek' }"
                    @click="assistantAISettings.provider = 'DeepSeek'"
                  >
                    DeepSeek
                  </button>
                  <button
                    class="pill-btn"
                    :class="{ active: assistantAISettings.provider === 'Qwen' }"
                    @click="assistantAISettings.provider = 'Qwen'"
                  >
                    通义千问
                  </button>
                  <button
                    class="pill-btn"
                    :class="{ active: assistantAISettings.provider === 'OpenAI' }"
                    @click="assistantAISettings.provider = 'OpenAI'"
                  >
                    OpenAI
                  </button>
                  <button
                    class="pill-btn"
                    :class="{ active: assistantAISettings.provider === 'Custom' }"
                    @click="assistantAISettings.provider = 'Custom'"
                  >
                    自定义
                  </button>
                </div>

                <div class="param-group">
                  <div class="param-label text-bold">🔑 API Key</div>
                  <input
                    v-model="assistantAISettings.apiKey"
                    type="password"
                    placeholder="sk-xxxxxxxxxxxxxxxxxxx"
                    class="param-input secure-input"
                  />
                </div>

                <div class="grid-2col mt-15">
                  <div class="param-group">
                    <div class="param-label text-bold">🌐 Base URL</div>
                    <input
                      v-model="
                        (assistantAISettings.providerConfigs as any)[assistantAISettings.provider]
                          .baseUrl
                      "
                      type="text"
                      class="param-input"
                    />
                  </div>
                  <div class="param-group">
                    <div class="param-label text-bold">🧠 Model</div>
                    <input
                      v-model="
                        (assistantAISettings.providerConfigs as any)[assistantAISettings.provider]
                          .modelName
                      "
                      type="text"
                      class="param-input"
                    />
                  </div>
                </div>

                <div class="param-group mt-15">
                  <div class="flex-bw alg-center mb-5">
                    <div class="param-label text-bold mb-0">🌡️ Temperature</div>
                    <span class="val-display">{{
                      assistantAISettings.temperature.toFixed(2)
                    }}</span>
                  </div>
                  <div class="slider-wrapper">
                    <input
                      v-model.number="assistantAISettings.temperature"
                      type="range"
                      min="0"
                      max="2"
                      step="0.01"
                      class="param-slider"
                    />
                    <div class="slider-labels">
                      <span>严谨</span>
                      <span>活泼</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 弹幕吐槽设定 -->
              <div class="param-group mt-15">
                <div class="flex-bw alg-center mb-5">
                  <div class="param-label text-bold mb-0">🎭 弹幕吐槽</div>
                  <input v-model="llmSettings.enableDanmakuVibe" type="checkbox" class="toggle-switch" />
                </div>
                <div v-if="llmSettings.enableDanmakuVibe">
                  <div class="param-label mb-5">吐槽性格</div>
                  <textarea
                    v-model="llmSettings.danmakuSystemPrompt"
                    class="param-input custom-textarea"
                    rows="2"
                    placeholder="例：你是一个傲娇毒舌的虚拟助手，请根据弹幕给出简短(25字内)吐槽。"
                  ></textarea>
                </div>
              </div>

              <!-- 主动闲聊设定 -->
              <div class="param-group mt-15">
                <div class="param-label text-bold mb-5">💭 主动闲聊性格</div>
                <textarea
                  v-model="llmSettings.chatSystemPrompt"
                  class="param-input custom-textarea"
                  rows="2"
                  placeholder="例：你是一个可爱的B站看板娘，说话带喵尾音，回答简短（50字内）。"
                ></textarea>
              </div>

              <!-- 互动频率 -->
              <div class="grid-2col mt-15">
                <div class="param-group">
                  <div class="flex-bw alg-center mb-5">
                    <div class="param-label text-bold mb-0">🕒 自动闲聊间隔</div>
                    <span class="val-display">{{ llmSettings.idleInterval }}s</span>
                  </div>
                  <div class="slider-wrapper">
                    <input
                      v-model.number="llmSettings.idleInterval"
                      type="range"
                      min="10"
                      max="600"
                      step="10"
                      class="param-slider"
                    />
                    <div class="slider-labels">
                      <span>话痨</span>
                      <span>高冷</span>
                    </div>
                  </div>
                </div>

                <div v-if="llmSettings.enableDanmakuVibe" class="param-group">
                  <div class="flex-bw alg-center mb-5">
                    <div class="param-label text-bold mb-0">🎯 弹幕吐槽命中率</div>
                    <span class="val-display"
                      >{{ Math.round(llmSettings.danmakuProbability * 100) }}%</span
                    >
                  </div>
                  <div class="slider-wrapper">
                    <input
                      v-model.number="llmSettings.danmakuProbability"
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      class="param-slider"
                    />
                    <div class="slider-labels">
                      <span>装死</span>
                      <span>全弹吐槽</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 吐槽冷却 -->
              <div v-if="llmSettings.enableDanmakuVibe" class="param-group mt-15">
                <div class="flex-bw alg-center mb-5">
                  <div class="param-label text-bold mb-0">❄️ 吐槽冷却 CD</div>
                  <span class="val-display">{{ llmSettings.danmakuCooldown }}s</span>
                </div>
                <div class="slider-wrapper">
                  <input
                    v-model.number="llmSettings.danmakuCooldown"
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    class="param-slider"
                  />
                  <div class="slider-labels">
                    <span>狂轰乱炸</span>
                    <span>温和</span>
                  </div>
                </div>
              </div>

              <div class="ai-status-bar mt-15">
                <span v-if="isAssistantVisible && llmSettings.enabled" class="status-succ">
                  🟢 看板娘已激活，AI 对话就绪
                </span>
                <span v-else-if="isAssistantVisible" class="status-warn">
                  🟡 看板娘已显示但未启用 AI
                </span>
                <span v-else class="status-off">⚫ 看板娘休眠中</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧列 -->
      <div class="right-col">
        <div class="settings-card">
          <div class="card-header">
            <h3>🖥️ 界面与交互</h3>
          </div>
          <div class="card-body">
            <div class="setting-item flex-bw alg-center mt-10" @click.stop>
              <div>
                <span class="f14 text-bold">系统主色调</span>
              </div>
              <div class="color-picker-wrapper">
                <input
                  v-model="customTheme.primaryColor"
                  type="color"
                  class="color-input"
                  @change="applyThemeColor"
                />
              </div>
            </div>

            <div class="setting-item flex-bw alg-center mt-15" @click.stop>
              <div><span class="f14 text-bold">主题外观</span></div>
              <div class="cy-select-container" style="width: 140px">
                <div class="cy-select-trigger" @click="toggleSelect('themeMode')">
                  {{ getThemeLabel(themeMode) }}
                  <span class="cy-arrow" :class="{ up: activeSelectId === 'themeMode' }"></span>
                </div>
                <transition name="cy-fade">
                  <div v-if="activeSelectId === 'themeMode'" class="cy-select-menu">
                    <div class="cy-option" @click="selectThemeMode('auto')">跟随系统</div>
                    <div class="cy-option" @click="selectThemeMode('light')">极光白</div>
                    <div class="cy-option" @click="selectThemeMode('dark')">暗夜黑</div>
                  </div>
                </transition>
              </div>
            </div>

            <div class="setting-item flex-bw alg-center mt-15">
              <div>
                <span class="f14 text-bold">主窗口置顶</span><br />
                <span class="f12 tip">始终显示在其他应用之上</span>
              </div>
              <input
                v-model="alwaysOnTop"
                type="checkbox"
                class="toggle-switch"
                @change="saveBasicSettings"
              />
            </div>

            <div class="setting-item flex-bw alg-center mt-15" @click.stop>
              <div><span class="f14 text-bold">关闭面板动作</span></div>
              <div class="cy-select-container" style="width: 140px">
                <div class="cy-select-trigger" @click="toggleSelect('closeAction')">
                  {{ getActionLabel(closeAction) }}
                  <span class="cy-arrow" :class="{ up: activeSelectId === 'closeAction' }"></span>
                </div>
                <transition name="cy-fade">
                  <div v-if="activeSelectId === 'closeAction'" class="cy-select-menu">
                    <div class="cy-option" @click="selectCloseAction('ask')">每次询问</div>
                    <div class="cy-option" @click="selectCloseAction('minimize')">缩进系统托盘</div>
                    <div class="cy-option" @click="selectCloseAction('quit')">彻底退出程序</div>
                  </div>
                </transition>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card mt-15">
          <div class="card-header">
            <h3>🛠️ 极客内核实验舱</h3>
          </div>
          <div class="card-body">
            <div class="setting-item flex-bw alg-center mt-10">
              <div>
                <span class="f14 text-bold">开机自动点火</span><br />
                <span class="f12 tip">随系统启动并在后台静默挂机</span>
              </div>
              <input
                v-model="openAtLogin"
                type="checkbox"
                class="toggle-switch"
                @change="saveBasicSettings"
              />
            </div>

            <div class="setting-item flex-bw alg-center mt-15">
              <div>
                <span class="f14 text-bold">GPU 渲染加速</span><br />
                <span class="f12 tip">关闭可解决部分老显卡黑屏/闪烁问题</span>
              </div>
              <input
                v-model="hwAcceleration"
                type="checkbox"
                class="toggle-switch"
                @change="saveBasicSettings"
              />
            </div>

            <div class="setting-item flex-bw alg-center mt-15">
              <div>
                <span class="f14 text-bold">网络流控拦截器</span><br />
                <span class="f12 tip" style="color: #faad14">阻断B站部分日志跟踪上报</span>
              </div>
              <input
                v-model="netBlocker"
                type="checkbox"
                class="toggle-switch"
                @change="saveBasicSettings"
              />
            </div>

            <div class="setting-item mt-20 pt-15 border-top">
              <span class="f14 text-bold" style="color: #ff4d4f">危险操作区</span>
              <p class="f12 tip mt-5 mb-10">当遇到登录死循环或解析彻底失效时使用</p>
              <button class="btn-danger w-100" @click="showResetModal = true">
                ⚠️ 格式化缓存与登录态
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showResetModal" class="modal-overlay" @click.self="showResetModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>警告：核心数据清除</h3>
        </div>
        <div class="modal-body">
          执行此操作将抹除<strong>所有的 Bilibili 账号凭证、会话缓存以及 Cookie</strong
          >。需要重新扫码登录，是否继续？
        </div>
        <div class="modal-action-bar">
          <button class="modal-btn-cancel" @click="showResetModal = false">取消</button>
          <button class="danger-confirm" @click="clearCache">确认格式化</button>
        </div>
      </div>
    </div>

    <transition name="slide-toast">
      <div v-if="showToast" class="global-toast toast-success">
        <span class="toast-icon">✨</span> {{ toastMsg }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* ================= 极客高级下拉菜单 ================= */
.cy-select-container {
  position: relative;
  width: 100%;
}
.cy-select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 500;
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
  right: 0;
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
  padding: 8px 12px;
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

/* ================= 颜色取色器高级样式 ================= */
.color-picker-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--border-color);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s;
}
.color-picker-wrapper:hover {
  transform: scale(1.05);
  border-color: var(--primary-color);
}
.color-input {
  width: 150%;
  height: 150%;
  margin: -25%;
  cursor: pointer;
  border: none;
  outline: none;
  padding: 0;
}

/* ================= 基础布局样式 ================= */
.settings-view {
  animation: slideUp 0.4s ease-out;
  padding-bottom: 30px;
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

.settings-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 20px;
  align-items: start;
}
.settings-card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  padding: 24px;
}
.card-header h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  color: var(--primary-color);
  font-weight: bold;
}
.desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-sub);
}
.is-disabled {
  opacity: 0.4;
  pointer-events: none;
  filter: grayscale(100%);
  transition: all 0.3s;
}

/* 实用类 */
.mt-5 {
  margin-top: 5px;
}
.mt-10 {
  margin-top: 10px;
}
.mt-15 {
  margin-top: 15px;
}
.mt-20 {
  margin-top: 20px;
}
.mb-5 {
  margin-bottom: 5px;
}
.mb-10 {
  margin-bottom: 10px;
}
.mb-0 {
  margin-bottom: 0;
}
.pb-15 {
  padding-bottom: 15px;
}
.pt-15 {
  padding-top: 15px;
}
.border-top {
  border-top: 1px dashed var(--border-color);
}
.border-bottom {
  border-bottom: 1px dashed var(--border-color);
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
.tip {
  color: var(--text-sub);
  font-weight: normal;
}
.flex-bw {
  display: flex;
  justify-content: space-between;
}
.alg-center {
  align-items: center;
}
.w-100 {
  width: 100%;
}
.grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* 按钮组选择器 */
.pill-group {
  display: flex;
  gap: 8px;
  background: var(--bg-color);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}
.pill-btn {
  flex: 1;
  background: transparent;
  border: none;
  border-radius: 6px;
  padding: 8px 0;
  font-size: 13px;
  color: var(--text-sub);
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}
.pill-btn:hover {
  color: var(--text-main);
}
.pill-btn.active {
  background: var(--card-bg);
  color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* 输入框统一 */
.param-label {
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--text-main);
}
.param-input {
  width: 100%;
  padding: 10px 14px;
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
.secure-input {
  font-family: monospace;
  letter-spacing: 2px;
}
.custom-textarea {
  resize: vertical;
  line-height: 1.5;
  font-family: inherit;
}

/* 滑块统一设计 */
.slider-wrapper {
  padding-top: 8px;
}
.param-slider {
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  outline: none;
}
.param-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
  box-shadow: 0 0 10px rgba(0, 174, 236, 0.4);
  transition: 0.2s;
}
.param-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}
.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-sub);
}
.val-display {
  background: rgba(0, 174, 236, 0.1);
  color: var(--primary-color);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

/* 状态展示条 */
.ai-status-bar {
  text-align: right;
  font-size: 12px;
  font-weight: bold;
}
.status-succ {
  color: #52c41a;
}
.status-warn {
  color: #faad14;
}
.status-off {
  color: var(--text-sub);
}

/* 滑动开关 */
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

/* 复制 AI 设置按钮 */
.btn-copy-ai {
  width: 100%;
  padding: 10px;
  background: rgba(0, 174, 236, 0.1);
  color: var(--primary-color);
  border: 1px solid rgba(0, 174, 236, 0.3);
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  font-size: 13px;
  transition: all 0.2s;
}
.btn-copy-ai:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 174, 236, 0.3);
}
.btn-copy-ai:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.copy-ai-section {
  background: rgba(0, 174, 236, 0.03);
  border-radius: 8px;
  padding: 12px;
  border: 1px dashed rgba(0, 174, 236, 0.2);
}
.independent-ai-config {
  background: rgba(251, 114, 153, 0.03);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid rgba(251, 114, 153, 0.15);
}

/* 危险按钮 */
.btn-danger {
  padding: 10px;
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
  border: 1px solid rgba(255, 77, 79, 0.3);
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;
}
.btn-danger:hover {
  background: #ff4d4f;
  color: white;
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3);
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-card {
  background: var(--card-bg);
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}
.modal-header {
  padding: 20px;
  background: #fff2f0;
  border-bottom: 1px solid #ffccc7;
}
.modal-header h3 {
  margin: 0;
  color: #ff4d4f;
  font-size: 16px;
}
.modal-body {
  padding: 20px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-main);
}
.modal-action-bar {
  padding: 15px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid var(--border-color);
}
.modal-btn-cancel {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-sub);
  transition: all 0.2s;
}
.modal-btn-cancel:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}
.danger-confirm {
  padding: 8px 16px;
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  transition: all 0.2s;
}
.danger-confirm:hover {
  background: #ff7875;
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3);
}

/* Toast 提示 */
.global-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(-100px);
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
  z-index: 9999;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
.toast-success {
  background: var(--card-bg);
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
  box-shadow: 0 4px 16px rgba(0, 174, 236, 0.2);
}
.slide-toast-enter-active {
  transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
.slide-toast-leave-active {
  transition: all 0.3s ease-in;
}
.slide-toast-enter-from,
.slide-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-100px);
}
.slide-toast-enter-to,
.slide-toast-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>
