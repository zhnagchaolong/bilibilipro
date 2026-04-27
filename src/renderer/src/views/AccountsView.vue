<template>
  <div class="accounts-view">
    <div class="page-header">
      <h2>👥 账号矩阵管理</h2>
      <p class="subtitle">
        管理您的多个 Bilibili 账号状态、资产与登录凭证
        <strong style="color: red"
          >!!提醒：需要用一段时间并且登录退出几次后才能拿到180天的凭证！！（让b站记住当前环境）</strong
        >
      </p>
    </div>

    <!-- 顶栏操作区 -->
    <div class="actions-bar">
      <button class="btn-primary" :disabled="isAdding" @click="handleAddAccount">
        {{ isAdding ? '⏳ 等待扫码中...' : '➕ 添加新账号' }}
      </button>
      <button
        class="btn-refresh"
        :class="{ 'is-loading': isRefreshing }"
        :disabled="isRefreshing"
        @click="loadAccounts(true)"
      >
        <span class="refresh-icon">🔄</span> {{ isRefreshing ? '刷新中...' : '刷新状态' }}
      </button>
    </div>

    <!-- 账号卡片网格 -->
    <div class="accounts-grid">
      <div v-for="acc in accounts" :key="acc.uid" class="account-card">
        <!-- 头部：头像与基本信息 -->
        <div class="card-header">
          <img :src="acc.face" alt="avatar" class="avatar" />
          <div class="user-info">
            <div class="name-row">
              <span class="name">{{ acc.name }}</span>
              <span class="vip-badge" :class="{ active: acc.isVip }">大会员</span>
            </div>
            <div class="uid">UID: {{ acc.uid }}</div>
          </div>
        </div>

        <!-- 中部：资产与状态统计 -->
        <div class="stats-grid">
          <div class="stat-item">
            <span class="label">等级</span>
            <span class="value level">Lv.{{ acc.level !== undefined ? acc.level : '-' }}</span>
          </div>
          <div class="stat-item">
            <span class="label">硬币余额</span>
            <span class="value coin">{{ acc.coins !== undefined ? acc.coins : '-' }}</span>
          </div>
          <div class="stat-item">
            <span class="label">凭证状态</span>
            <span class="value" :class="getDaysColor(acc.daysRemaining)">
              {{ formatDays(acc.daysRemaining) }}
            </span>
          </div>
        </div>

        <!-- 底部：操作区 -->
        <div class="card-footer">
          <button class="btn-delete-icon" title="移除该账号" @click="promptDeleteAccount(acc)">
            ✖
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="accounts.length === 0 && !isRefreshing" class="empty-state">
        <div class="empty-icon">📂</div>
        <h3>暂无账号</h3>
        <p>请点击左上角“添加新账号”以接入您的 Bilibili 账号</p>
      </div>
    </div>

    <!-- 🌟 全局消息提示 (Toast) -->
    <Transition name="toast">
      <div v-if="toast.show" class="global-toast" :class="`toast-${toast.type}`">
        <span v-if="toast.type === 'success'">✅</span>
        <span v-if="toast.type === 'error'">❌</span>
        <span v-if="toast.type === 'warn'">⚠️</span>
        {{ toast.message }}
      </div>
    </Transition>

    <!-- 🌟 自定义优雅模态框 (Modal) -->
    <Transition name="fade">
      <div v-if="deleteModal.show" class="modal-overlay" @click.self="cancelDelete">
        <div class="modal-box">
          <div class="modal-header">
            <h3>退出账号</h3>
          </div>
          <div class="modal-body">
            确定要从系统中移除账号 <strong>「{{ deleteModal.accName }}」</strong> 吗？<br />
            <span class="modal-subtext">移除后本地登录凭证将被销毁，需重新扫码接入。</span>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="cancelDelete">取消</button>
            <button class="btn-confirm-danger" :disabled="isDeleting" @click="executeDelete">
              {{ isDeleting ? '移除中...' : '确定退出' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useAccountsView } from '@renderer/composables/accounts/useAccountsView'

const {
  accounts,
  isAdding,
  isRefreshing,
  isDeleting,
  toast,
  deleteModal,
  promptDeleteAccount,
  cancelDelete,
  executeDelete,
  formatDays,
  getDaysColor,
  loadAccounts,
  handleAddAccount
} = useAccountsView()
</script>

<style scoped>
.accounts-view {
  animation: slideUp 0.4s ease-out;
  position: relative;
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

.actions-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}
.btn-primary {
  background: var(--primary-color, #00aeec);
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 174, 236, 0.3);
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-refresh {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border-color, #e3e5e7);
  color: var(--text-main, #18191c);
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}
.btn-refresh:hover:not(:disabled) {
  border-color: var(--primary-color, #00aeec);
  color: var(--primary-color, #00aeec);
}
.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 刷新图标的旋转动画 */
.refresh-icon {
  display: inline-block;
  transition: transform 0.3s;
}
.btn-refresh.is-loading .refresh-icon {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

.accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.account-card {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border-color, #e3e5e7);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s;
}
.account-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  border-color: var(--primary-color, #00aeec);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid var(--border-color, #e3e5e7);
}
.user-info {
  flex: 1;
  overflow: hidden;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.name {
  font-weight: bold;
  font-size: 16px;
  color: var(--text-main, #18191c);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.uid {
  font-size: 12px;
  color: var(--text-sub, #9499a0);
  margin-top: 4px;
}

.vip-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #f4f5f7;
  color: #999;
}
.vip-badge.active {
  background: #fb7299;
  color: #fff;
  font-weight: bold;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  background: var(--bg-color, #f6f7f8);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}
.stat-item .label {
  font-size: 12px;
  color: var(--text-sub, #9499a0);
}
.stat-item .value {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-main, #18191c);
}
.value.level {
  color: #f3a034;
}
.value.coin {
  color: #00aeec;
}
.value.status-safe {
  color: #4af626;
}
.value.status-warn {
  color: #e6a23c;
}
.value.status-danger {
  color: #ff5f56;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px dashed var(--border-color, #e3e5e7);
  padding-top: 12px;
}
.btn-delete-icon {
  background: transparent;
  border: none;
  color: #ff4d4f;
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
}
.btn-delete-icon:hover {
  background: #fff0f0;
  transform: scale(1.1);
}
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 0;
  background: var(--card-bg, #fff);
  border-radius: 12px;
  border: 1px dashed var(--border-color, #e3e5e7);
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}
.empty-state h3 {
  margin: 0 0 8px 0;
  color: var(--text-main, #18191c);
}
.empty-state p {
  margin: 0;
  color: var(--text-sub, #9499a0);
  font-size: 14px;
}

.global-toast {
  position: fixed;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  background: var(--card-bg, #fff);
  border-radius: 30px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main, #18191c);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 8px;
}
.toast-success {
  border-left: 4px solid #52c41a;
}
.toast-error {
  border-left: 4px solid #ff4d4f;
}
.toast-warn {
  border-left: 4px solid #faad14;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px) scale(0.9);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-box {
  background: var(--card-bg, #ffffff);
  width: 380px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  transform: scale(1);
}
.modal-header {
  padding: 20px 24px 10px;
}
.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-main, #18191c);
}
.modal-body {
  padding: 0 24px 24px;
  font-size: 15px;
  color: var(--text-main, #18191c);
  line-height: 1.5;
}
.modal-body strong {
  color: #ff4d4f;
}
.modal-subtext {
  display: block;
  font-size: 12px;
  color: var(--text-sub, #9499a0);
  margin-top: 8px;
}
.modal-footer {
  display: flex;
  border-top: 1px solid var(--border-color, #e3e5e7);
  background: var(--bg-color, #f9f9f9);
}
.modal-footer button {
  flex: 1;
  border: none;
  background: transparent;
  padding: 16px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-cancel {
  color: var(--text-main, #18191c);
  border-right: 1px solid var(--border-color, #e3e5e7) !important;
}
.btn-cancel:hover {
  background: rgba(0, 0, 0, 0.03);
}
.btn-confirm-danger {
  color: #ff4d4f;
}
.btn-confirm-danger:hover {
  background: #fff0f0;
}
.btn-confirm-danger:disabled {
  opacity: 0.5;
  background: transparent;
  cursor: not-allowed;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-active .modal-box,
.fade-leave-active .modal-box {
  transition: transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-from .modal-box,
.fade-leave-to .modal-box {
  transform: scale(0.95);
}
</style>
