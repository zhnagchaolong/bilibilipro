<script setup lang="ts">
import { ref } from 'vue'

const appVersion = ref('v1.2.0')
const updateDate = ref('2025.04.11')

interface WindowApi {
  openExternal?: (url: string) => void
}

const openLink = (url: string): void => {
  const api = (window as unknown as { api?: WindowApi }).api
  if (api && typeof api.openExternal === 'function') {
    api.openExternal(url)
  } else {
    window.open(url, '_blank')
  }
}
</script>

<template>
  <div class="about-view">
    <div class="page-header">
      <h2>ℹ️ 运行舱说明与关于</h2>
      <p class="subtitle">BiliAssistant 极客版 - 探索自动化与数据挖掘的边界</p>
    </div>

    <!-- 🌟 Hero 顶部横幅 -->
    <div class="hero-banner card">
      <div class="hero-content">
        <div class="app-icon-wrapper">
          <div class="app-icon">🚀</div>
        </div>
        <div class="app-info">
          <h1 class="gradient-text">BiliAssistant Hub</h1>
          <div class="version-badges">
            <span class="badge primary">版本 {{ appVersion }}</span>
            <span class="badge outline">内核编译于 {{ updateDate }}</span>
            <span class="badge outline">Vue3 + Electron 架设</span>
          </div>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <!-- 📖 功能介绍与指南 -->
      <div class="card intro-card">
        <div class="card-header">
          <span class="icon">📖</span>
          <h3>系统功能运转指南</h3>
        </div>
        <div class="guide-steps">
          <div class="step-item">
            <div class="step-num">01</div>
            <div class="step-text">
              <h4>接驳账号矩阵</h4>
              <p>
                前往「矩阵管理」通过
                B站扫码授权，本地将加密存储凭证。支持高权限的大会员凭证挂载，为后续画质拉取提供密钥支持。
              </p>
            </div>
          </div>

          <div class="step-item">
            <div class="step-num">02</div>
            <div class="step-text">
              <h4>沉浸式视听引擎</h4>
              <p>
                进入「夯哔哩哔哩」开启无干扰的大力模式。内置
                <strong>Titanium 实验室</strong>：支持直接突破 5x
                倍速超频、夜魔动态音频压缩、时光刺客自动跳过恰饭与片头，并提供纯净截图与封面级提取能力。
              </p>
            </div>
          </div>

          <div class="step-item">
            <div class="step-num">03</div>
            <div class="step-text">
              <h4>资源工业化捕获</h4>
              <p>
                在播放页一键将深空信号投射至「下载中心」。支持最高画质/音轨探测、多 P
                剧集批量嗅探入库，并提供了高度自由的本地数据结构与可视化阵列管理。
              </p>
            </div>
          </div>

          <div class="step-item">
            <div class="step-num">04</div>
            <div class="step-text">
              <h4>调度自动化兵团</h4>
              <p>
                在「自动化任务」中勾选每日打卡、经验获取、硬币兑换。设定后台巡航时间，隐藏至系统托盘，开启静默释放双手的无感体验。
              </p>
            </div>
          </div>

          <div class="step-item">
            <div class="step-num">05</div>
            <div class="step-text">
              <h4>凝视深渊数据看板</h4>
              <p>
                全方位的数据透视。抓取用户全局模型估算活跃度，分析单个 UP
                主乃至独立视频的爆款转换率，用算法解构流量密码。
              </p>
            </div>
          </div>

          <div class="step-item">
            <div class="step-num">06</div>
            <div class="step-text">
              <h4>AI看板娘</h4>
              <p>一个人看视频太寂寞？让看板娘来陪陪你吧！</p>
            </div>
          </div>
        </div>

        <div class="feature-tags">
          <span class="f-tag">#引擎超频</span>
          <span class="f-tag">#纯本地运行</span>
          <span class="f-tag">#多账号阵列</span>
          <span class="f-tag">#无源解析下载</span>
          <span class="f-tag">#防风控延时</span>
        </div>
      </div>

      <div class="right-col-grid">
        <!-- 🔄 版本特性时间轴 -->
        <div class="card timeline-card">
          <div class="card-header">
            <span class="icon">✨</span>
            <h3>近期版本蜕变特性</h3>
          </div>
          <div class="timeline">
            <div class="time-node">
              <div class="node-dot active"></div>
              <div class="node-content">
                <h5>v1.2.0 (当前)</h5>
                <p>
                  重构 Dashboard 网络层：使用 axios 绕过 Chromium 网络限制，解决 412 风控问题；AI
                  配置完全分离（Dashboard AI 与看板娘 AI
                  独立配置）；修复设置持久化、看板娘启动状态同步、系统色调记忆等多项问题。
                </p>
              </div>
            </div>
            <div class="time-node">
              <div class="node-dot"></div>
              <div class="node-content">
                <h5>v1.1.0</h5>
                <p>修复一系列BUG，推出AI看板娘功能。</p>
              </div>
            </div>
            <div class="time-node">
              <div class="node-dot"></div>
              <div class="node-content">
                <h5>v1.0.0 重构版</h5>
                <p>
                  全面重写底层 Ipc 通信，内嵌 Titanium
                  播放器核心，引入超高分化下载器中心与交互拉伸动画。
                </p>
              </div>
            </div>
            <div class="time-node">
              <div class="node-dot"></div>
              <div class="node-content">
                <h5>v0.9.5 矩阵拓展版</h5>
                <p>
                  完成多账号无缝切换功能，加入定时 Cron
                  后台静默执行队列，增加全局置顶与开机自启系统级桥梁。
                </p>
              </div>
            </div>
            <div class="time-node">
              <div class="node-dot"></div>
              <div class="node-content">
                <h5>v0.1.0 雏形诞生</h5>
                <p>完成基础登录鉴权与本地持久化，构建基础的悬浮窗播放器拦截底层验证。</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 👨‍💻 作者信息与免责声明 -->
        <div class="card author-card">
          <div class="card-header">
            <span class="icon">👨‍💻</span>
            <h3>作者信息与免责声明</h3>
          </div>
          <div class="author-info">
            <p><strong>作者：</strong> ZCL 独立开发</p>
            <p>
              <strong>开发初衷：</strong> 不管是 B站网页端还是 APP
              端都太臃肿了！既然无法忍受，那就不如手搓一个极致纯净的 哔哩哔哩 PRO 版！
            </p>

            <div class="warning-box mt-s">
              <strong>⚠️ 最终警告声明</strong>
              <p>
                本项目及其全部代码均仅供<strong>个人学习与安全技术交流</strong>使用。系统不保存任何云端数据，所有账号
                token 均高强度封存于本地。
              </p>
              <p>
                严禁将此程序用于任何<strong>商业用途、工作室代挂盈利或破坏社区公平性</strong>的非法操作。使用者因违反平台协议产生的任何后果由使用者自行承担，与开发者无关。
              </p>
            </div>

            <button class="btn-github mt-m" @click="openLink('https://github.com/zhnagchaolong')">
              <span class="icon">⭐</span> 前往 GitHub (暂未开源)
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.about-view {
  animation: slideUp 0.4s ease-out;
  padding-bottom: 40px;
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

.card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  padding: 24px;
}
[data-theme='dark'] .card {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 1px dashed var(--border-color);
  padding-bottom: 16px;
}
.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: var(--text-main);
}
.card-header .icon {
  font-size: 20px;
}

/* 🌟 Hero 横幅 */
.hero-banner {
  margin-bottom: 24px;
  background: linear-gradient(135deg, rgba(0, 174, 236, 0.05) 0%, rgba(0, 174, 236, 0.01) 100%);
  position: relative;
  overflow: hidden;
  padding: 30px 40px;
}
.hero-content {
  display: flex;
  align-items: center;
  gap: 24px;
}
.app-icon-wrapper {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--primary-color), #40c5f1);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 20px rgba(0, 174, 236, 0.3);
}
.app-icon {
  font-size: 40px;
  line-height: 1;
}
.app-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.gradient-text {
  margin: 0;
  font-size: 32px;
  font-weight: 900;
  background: linear-gradient(120deg, var(--primary-color), #fb7299);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}
.version-badges {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: bold;
}
.badge.primary {
  background: var(--primary-color);
  color: white;
}
.badge.outline {
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  color: var(--text-sub);
}

/* 🌟 网格排版 */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}
.right-col-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
@media (max-width: 900px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

/* 🌟 指南与介绍 */
.intro-card {
  height: 100%;
}
.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 24px;
}
.step-item {
  display: flex;
  gap: 16px;
}
.step-num {
  font-size: 20px;
  font-weight: 900;
  color: rgba(0, 174, 236, 0.3);
  font-style: italic;
  padding-top: 2px;
  min-width: 28px;
}
.step-text h4 {
  margin: 0 0 6px 0;
  font-size: 15px;
  color: var(--text-main);
}
.step-text p {
  margin: 0;
  font-size: 13.5px;
  color: var(--text-sub);
  line-height: 1.6;
}
.feature-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 20px;
  border-top: 1px dashed var(--border-color);
}
.f-tag {
  background: var(--bg-color);
  padding: 6px 12px;
  border-radius: 50px;
  font-size: 12px;
  color: var(--text-main);
  font-weight: 600;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}
.f-tag:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: rgba(0, 174, 236, 0.05);
}

/* 🌟 版本时间轴 */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-left: 10px;
  position: relative;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 14.5px;
  top: 10px;
  bottom: 10px;
  width: 2px;
  background: var(--border-color);
}
.time-node {
  display: flex;
  gap: 20px;
  position: relative;
}
.node-dot {
  width: 12px;
  height: 12px;
  background: var(--bg-color);
  border: 2px solid var(--border-color);
  border-radius: 50%;
  position: relative;
  z-index: 1;
  margin-top: 4px;
}
.node-dot.active {
  border-color: var(--primary-color);
  background: var(--primary-color);
  box-shadow: 0 0 0 4px rgba(0, 174, 236, 0.2);
}
.node-content h5 {
  margin: 0 0 6px 0;
  font-size: 15px;
  color: var(--text-main);
}
.node-content p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-sub);
}

/* 🌟 作者与免责 */
.author-info p {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: var(--text-sub);
  line-height: 1.6;
}
.author-info strong {
  color: var(--text-main);
}
.warning-box {
  background: rgba(255, 77, 79, 0.05);
  border: 1px solid rgba(255, 77, 79, 0.2);
  border-radius: 8px;
  padding: 16px;
}
.warning-box strong {
  display: block;
  color: #ff4d4f;
  margin-bottom: 8px;
  font-size: 14px;
}
.warning-box p {
  margin: 0 0 6px 0;
  font-size: 13px;
  color: var(--text-sub);
}
.warning-box p:last-child {
  margin: 0;
}
.mt-s {
  margin-top: 12px;
}
.mt-m {
  margin-top: 24px;
}

.btn-github {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #24292e;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}
[data-theme='dark'] .btn-github {
  background: #f0f6fc;
  color: #24292e;
}
.btn-github:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}
</style>
