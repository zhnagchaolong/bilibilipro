<!-- eslint-disable prettier/prettier -->
<script setup lang="ts">
import { useDownloaderView } from '@renderer/composables/downloader/useDownloaderView'

const {
  inputUrl,
  isParsing,
  savePath,
  parsedList,
  currentParsedIndex,
  currentParsed,
  expandedGroups,
  searchQuery,
  sortDesc,
  isBatchMode,
  selectedHistoryIds,
  canReturnToPlayer,
  activeSelectId,
  toast,
  confirmModal,
  folderModal,
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
  executeConfirm,
  togglePage,
  toggleAllPages,
  prevParsed,
  nextParsed,
  deleteCurrentParsedVideo,
  handleStartCurrentDownload,
  handleStartAllDownload,
  handleSelectFolder,
  openFolder,
  removeSingleTask,
  manualParseEvent,
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
  handleCancelTaskSafely,
  taskList,
  customFolders
} = useDownloaderView()
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📥 下载中心</h2>
      <p class="subtitle">支持链接解析、多 P 视频下载、批量导出以及自动化分组。</p>
    </div>

    <!-- 解析中心区域 -->
    <div v-show="!isBatchMode" class="card parse-panel">
      <div class="path-configure">
        <span class="path-label">保存位置：</span>
        <input
          v-model="savePath"
          class="path-display"
          type="text"
          readonly
          placeholder="默认 (按系统目录结构)"
        />
        <button class="btn-text text-primary" @click="handleSelectFolder">更改目录</button>
        <button v-if="savePath" class="btn-text" @click="openFolder(savePath)">打开文件夹</button>
      </div>

      <div class="input-group mt-3">
        <input
          v-model="inputUrl"
          placeholder="智能解析文本中直链BV号支持多视频"
          class="url-input"
          @keyup.enter="manualParseEvent"
        />
        <button class="btn-primary input-btn" :disabled="isParsing" @click="manualParseEvent">
          {{ isParsing ? '正在读取...' : '解析链接' }}
        </button>
      </div>

      <div v-if="currentParsed" class="preview-area">
        <div v-if="parsedList.length > 1" class="toolbar">
          <div class="toolbar-info">
            🎉 解析成功，共找到 <strong>{{ parsedList.length }}</strong> 个视频项目 (当前预览：{{
              currentParsedIndex + 1
            }}/{{ parsedList.length }})
          </div>
          <div class="toolbar-actions">
            <button class="btn-outline" :disabled="currentParsedIndex === 0" @click="prevParsed">
              上一个
            </button>
            <button
              class="btn-outline"
              :disabled="currentParsedIndex === parsedList.length - 1"
              @click="nextParsed"
            >
              下一个
            </button>
            <button class="btn-primary" @click="handleStartAllDownload">全部加入下载</button>
          </div>
        </div>

        <div class="preview-card">
          <div class="preview-header">
            <div class="preview-cover-box">
              <img :src="currentParsed.pic" class="cover-img" referrerpolicy="no-referrer" />
              <span class="bvid-tag">{{ currentParsed.bvid }}</span>
            </div>
            <div class="preview-info-box">
              <h3 class="preview-title" :title="currentParsed.title">{{ currentParsed.title }}</h3>
              <div class="tag-row">
                <span v-if="!parsedMetrics.isEstimate" class="meta-tag"
                  >🕒 视频总长: {{ parsedMetrics.dur }}</span
                >
                <span v-if="!parsedMetrics.isEstimate" class="meta-tag"
                  >💾 精算全重: {{ parsedMetrics.estimatedSize }}</span
                >

                <div class="push-right flex-op">
                  <button
                    v-if="canReturnToPlayer"
                    class="btn-outline text-primary"
                    title="立刻切回视频浏览界面"
                    @click="returnToPlayer"
                  >
                    ⬅ 一键返回播放页
                  </button>
                  <button class="btn-text text-danger" @click="deleteCurrentParsedVideo">
                    移除此项
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="card-divider"></div>
          <div class="preview-options">
            <div class="option-row">
              <span class="label-text">画质格式：</span>
              <div class="quality-list">
                <button
                  v-for="q in currentParsed.qualities"
                  :key="q.label"
                  class="quality-btn"
                  :class="{ active: currentParsed.selectedQualityUrl === q.url }"
                  @click="currentParsed.selectedQualityUrl = q.url"
                >
                  <span class="q-name">{{ q.label.split(' (')[0] }}</span>
                  <span v-if="q.label.includes('(')" class="q-codec">{{
                    q.label.split('(')[1].replace(')', '')
                  }}</span>
                </button>
              </div>
            </div>
            <div
              v-if="currentParsed.pages && currentParsed.pages.length > 1"
              class="multi-part-container"
            >
              <div class="part-head">
                <span class="part-title"
                  >检测到视频包含多 P (共
                  {{ currentParsed.pages.length }} 集)，请选择批量下载的分集：</span
                >
                <button class="btn-text text-primary" @click="toggleAllPages">
                  {{
                    currentParsed.selectedPages.length === currentParsed.pages.length
                      ? '取消全选'
                      : '全选'
                  }}
                </button>
              </div>
              <div class="episodes-grid">
                <div
                  v-for="ep in currentParsed.pages"
                  :key="ep.page"
                  class="episode-item"
                  :class="{ active: currentParsed.selectedPages.includes(ep.page) }"
                  :title="ep.part"
                  @click="togglePage(ep.page)"
                >
                  P{{ ep.page }} - {{ ep.part }}
                </div>
              </div>
            </div>
          </div>
          <div class="action-row">
            <button class="btn-primary main-action" @click="handleStartCurrentDownload">
              🚀 {{ currentParsed.isMergedSliceMode ? '开始合并输出' : '开始建立下载' }}
              <span v-if="currentParsed.selectedPages.length > 1"
                >({{ currentParsed.selectedPages.length }} 项)</span
              >
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 下载任务排队与进行区 -->
    <div v-if="activeTasks.length > 0 && !isBatchMode" class="card list-panel">
      <div class="panel-header">
        <h3>
          ⚡ 正在下载 <span class="badge">{{ activeTasks.length }}</span>
        </h3>
      </div>
      <transition-group name="list" tag="div" class="item-list">
        <div
          v-for="task in activeTasks"
          :key="task.taskId"
          class="task-item ongoing-item"
          :class="{ 'is-paused': task.status === 'paused' }"
        >
          <img :src="task.cover" class="task-img" referrerpolicy="no-referrer" />
          <div class="task-info">
            <h4 class="task-name" :title="task.title">{{ task.title }}</h4>
            <div class="task-tags">
              <span class="tag-blue">{{ task.qualityLabel }}</span>
              <span class="status-tip">{{
                task.status === 'paused' ? '已暂停' : '正在获取资源...'
              }}</span>
            </div>
            <div class="progress-box">
              <div class="progress-info">
                <span class="msg" :class="{ 'text-primary': task.status === 'merging' }">{{
                  task.statusMsg
                }}</span>
                <span v-if="task.status !== 'merging'" class="pct">{{ task.progress }}%</span>
              </div>
              <div class="progress-bar-bg">
                <div
                  class="progress-bar-fill"
                  :class="{
                    'fill-merging': task.status === 'merging',
                    'fill-paused': task.status === 'paused'
                  }"
                  :style="{ width: task.progress + '%' }"
                ></div>
              </div>
            </div>
          </div>
          <div class="task-operations">
            <button
              v-if="task.status === 'downloading'"
              class="op-btn text-warning"
              title="暂停"
              @click="handlePauseTask(task.taskId)"
            >
              ⏸
            </button>
            <button
              v-if="task.status === 'paused'"
              class="op-btn text-success"
              title="恢复"
              @click="handleResumeTask(task.taskId)"
            >
              ▶
            </button>
            <button
              v-if="task.status !== 'merging'"
              class="op-btn text-danger"
              title="取消任务"
              @click="handleCancelTaskSafely(task.taskId)"
            >
              ✖
            </button>
            <div
              v-if="task.status === 'merging'"
              class="op-label text-primary"
              title="音视频正在合并，请勿关闭应用"
            >
              处理中
            </div>
          </div>
        </div>
      </transition-group>
    </div>

    <!-- 档案资料库及分组管理区 -->
    <div class="card list-panel" :class="{ 'batch-highlight': isBatchMode }">
      <div class="panel-header flex-between mb-8">
        <div class="title-left">
          <h3>
            🗂️ 已完成与历史记录
            <span class="badge badge-gray">{{ taskList.length - activeTasks.length }}</span>
          </h3>
          <button v-if="!isBatchMode" class="btn-text text-primary" @click="openCreateFolder">
            + 新建分组
          </button>
        </div>

        <div v-if="!isBatchMode" class="filter-right">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索任务标题或序列号..."
            class="search-input"
          />
          <button class="btn-outline" @click="sortDesc = !sortDesc">
            {{ sortDesc ? '倒序 (最新)' : '正序 (最旧)' }}
          </button>
          <button class="btn-primary bulk-btn" @click="enterBatchMode">⚙️ 批量管理</button>
        </div>

        <div v-else class="batch-toolbar">
          <span class="batch-title"
            >已选中 <strong>{{ selectedHistoryIds.length }}</strong> 项</span
          >
          <div class="batch-quick-btns">
            <button class="btn-text" @click="batchSelectAll">全选</button>
            <button class="btn-text" @click="batchSelectSuccess">选成功</button>
            <button class="btn-text" @click="batchSelectError">选失败</button>
          </div>

          <div class="cy-select-container">
            <button class="btn-outline" @click.stop="toggleSelect('batch_move')">
              📂 移至分组
            </button>
            <transition name="cy-fade">
              <div v-if="activeSelectId === 'batch_move'" class="cy-select-menu force-right">
                <div class="cy-option" @click.stop="moveSelectedToFolder(undefined)">
                  默认根目录
                </div>
                <div
                  v-for="f in customFolders"
                  :key="f.id"
                  class="cy-option"
                  @click.stop="moveSelectedToFolder(f.id)"
                >
                  📁 {{ f.name }}
                </div>
              </div>
            </transition>
          </div>

          <button
            class="btn-danger-solid"
            :disabled="!selectedHistoryIds.length"
            @click="deleteSelectedHistory"
          >
            🗑️ 删除记录
          </button>
          <button class="btn-text close-batch" @click="closeBatchMode">退出管理</button>
        </div>
      </div>

      <div v-if="groupedCompletedRecords.length === 0" class="empty-state">
        <div class="empty-icon">📁</div>
        <p>{{ searchQuery ? '找不到符合条件的结果' : '历史记录空空如也' }}</p>
      </div>

      <transition-group name="list" tag="div" class="item-list">
        <div
          v-for="group in groupedCompletedRecords"
          :key="'group_' + group.id"
          class="record-group"
        >
          <div
            v-if="group.tasks.length === 1 && !group.isCustomFolder"
            class="task-item complete-item"
            :class="{ 'item-checked': selectedHistoryIds.includes(group.tasks[0].taskId) }"
            @click="isBatchMode ? toggleBatchTask(group.tasks[0].taskId) : null"
          >
            <div v-if="isBatchMode" class="cy-checkbox-wrap">
              <div
                class="cy-checkbox"
                :class="{ 'is-checked': selectedHistoryIds.includes(group.tasks[0].taskId) }"
              ></div>
            </div>

            <img :src="group.mainCover" class="task-img" referrerpolicy="no-referrer" />
            <div class="task-info">
              <h4 class="task-name" :title="group.tasks[0].title">{{ group.tasks[0].title }}</h4>
              <div class="task-tags">
                <span class="tag-default">{{ group.tasks[0].qualityLabel }}</span>
                <span class="status-tip">时间: {{ group.tasks[0].date }}</span>
              </div>
              <div
                class="status-msg"
                :class="group.tasks[0].status === 'success' ? 'text-success' : 'text-danger'"
              >
                {{
                  group.tasks[0].status === 'success'
                    ? '✔ 下载成功'
                    : `🚫 下载失败: ${group.tasks[0].statusMsg}`
                }}
              </div>
            </div>

            <div v-show="!isBatchMode" class="task-operations column-ops">
              <div class="cy-select-container mb-1">
                <div
                  class="cy-select-trigger"
                  @click.stop="toggleSelect('s_task_' + group.tasks[0].taskId)"
                >
                  {{ getFolderName(group.tasks[0].folderId) || '默认分组' }}
                  <span
                    class="cy-arrow"
                    :class="{ up: activeSelectId === 's_task_' + group.tasks[0].taskId }"
                  ></span>
                </div>
                <transition name="cy-fade">
                  <div
                    v-if="activeSelectId === 's_task_' + group.tasks[0].taskId"
                    class="cy-select-menu force-right"
                  >
                    <div class="cy-option" @click.stop="setTaskFolder(group.tasks[0].taskId, '')">
                      默认分组
                    </div>
                    <div
                      v-for="f in customFolders"
                      :key="f.id"
                      class="cy-option"
                      @click.stop="setTaskFolder(group.tasks[0].taskId, f.id)"
                    >
                      📁 {{ f.name }}
                    </div>
                  </div>
                </transition>
              </div>
              <button
                v-if="group.tasks[0].status === 'success'"
                class="btn-text text-primary"
                @click.stop="openFolder(group.tasks[0].filePath)"
              >
                打开位置
              </button>
              <button
                class="btn-text text-danger"
                @click.stop="removeSingleTask(group.tasks[0].taskId)"
              >
                删除记录
              </button>
            </div>
          </div>

          <div v-else class="collection-item">
            <div
              class="task-item complete-item collection-header"
              :class="{
                expanded: expandedGroups.includes(group.id),
                'item-checked':
                  isBatchMode &&
                  group.tasks.every((t) => selectedHistoryIds.includes(t.taskId)) &&
                  group.tasks.length > 0
              }"
              @click="isBatchMode ? handleSelectGroup(group.tasks) : toggleGroupOpen(group.id)"
            >
              <div v-if="isBatchMode" class="cy-checkbox-wrap">
                <div
                  class="cy-checkbox"
                  :class="{
                    'is-checked':
                      group.tasks.every((t) => selectedHistoryIds.includes(t.taskId)) &&
                      group.tasks.length > 0
                  }"
                ></div>
              </div>

              <div v-if="group.isCustomFolder" class="cover-stack">
                <div class="folder-icon-large">📁</div>
                <span class="stack-badge">{{ group.tasks.length }} 项</span>
              </div>
              <div v-else class="cover-stack">
                <img :src="group.mainCover" class="task-img" referrerpolicy="no-referrer" />
                <span class="stack-badge">{{ group.tasks.length }} P连集</span>
              </div>

              <div class="task-info">
                <h4 class="task-name bold-title" :title="group.title">
                  {{ group.isCustomFolder ? '📁 分组: ' : '🗂️ 合集: ' }}{{ group.title }}
                </h4>
                <div class="status-tip mt-1">
                  共包含 <strong>{{ group.tasks.length }}</strong> 个视频
                </div>
                <div v-if="!isBatchMode" class="status-tip mt-1">
                  {{ group.aggregateDate }} ｜
                  {{ expandedGroups.includes(group.id) ? '收起列表' : '展开查看' }}
                </div>
              </div>

              <div v-show="!isBatchMode" class="task-operations column-ops" @click.stop>
                <template v-if="group.isCustomFolder">
                  <button class="btn-outline btn-sm" @click="openEditFolder(group.id, group.title)">
                    重命名
                  </button>
                  <button
                    class="btn-outline btn-sm text-danger mt-1"
                    @click="deleteFolder(group.id)"
                  >
                    删除分组
                  </button>
                </template>
                <template v-else>
                  <button
                    class="btn-outline btn-sm"
                    @click="openFolder(group.tasks[0]?.filePath || savePath)"
                  >
                    打开目录
                  </button>
                  <div class="cy-select-container mt-1">
                    <div
                      class="cy-select-trigger sm"
                      @click.stop="toggleSelect('g_move_' + group.id)"
                    >
                      移至.. <span class="cy-arrow"></span>
                    </div>
                    <transition name="cy-fade">
                      <div
                        v-if="activeSelectId === 'g_move_' + group.id"
                        class="cy-select-menu force-right"
                      >
                        <div
                          v-for="f in customFolders"
                          :key="f.id"
                          class="cy-option"
                          @click.stop="moveBvidToFolder(group.id, f.id)"
                        >
                          📁 {{ f.name }}
                        </div>
                      </div>
                    </transition>
                  </div>
                  <button
                    class="btn-outline btn-sm text-danger mt-1"
                    @click="handleDeleteWholeGroup(group.tasks)"
                  >
                    删除内容
                  </button>
                </template>
              </div>
            </div>

            <div v-show="expandedGroups.includes(group.id)" class="collection-children">
              <div v-if="group.tasks.length === 0" class="empty-folder-tip">
                分组为空，您可以将下方的视频转移到此处。
              </div>
              <div
                v-for="child in group.tasks"
                :key="child.taskId"
                class="child-item"
                :class="{ 'child-checked': selectedHistoryIds.includes(child.taskId) }"
                @click.stop="isBatchMode ? toggleBatchTask(child.taskId) : null"
              >
                <div v-if="isBatchMode" class="cy-checkbox-wrap mr-2">
                  <div
                    class="cy-checkbox"
                    :class="{ 'is-checked': selectedHistoryIds.includes(child.taskId) }"
                  ></div>
                </div>

                <img
                  v-if="group.isCustomFolder"
                  :src="child.cover"
                  class="child-cover"
                  referrerpolicy="no-referrer"
                />
                <div
                  class="status-dot"
                  :class="child.status === 'success' ? 'bg-success' : 'bg-danger'"
                ></div>
                <div class="child-info">
                  <span class="child-title" :title="child.title">{{ child.title }}</span>
                  <span
                    class="child-status"
                    :class="child.status === 'success' ? 'text-success' : 'text-danger'"
                    >{{ child.status === 'success' ? `✅ 成功` : '💣 失败' }}</span
                  >
                </div>

                <div v-show="!isBatchMode" class="child-ops">
                  <div class="cy-select-container mr-2">
                    <div
                      class="cy-select-trigger xs"
                      @click.stop="toggleSelect('c_task_' + child.taskId)"
                    >
                      {{ getFolderName(child.folderId) || '默认分组'
                      }}<span class="cy-arrow"></span>
                    </div>
                    <transition name="cy-fade">
                      <div
                        v-if="activeSelectId === 'c_task_' + child.taskId"
                        class="cy-select-menu force-right"
                      >
                        <div class="cy-option" @click.stop="setTaskFolder(child.taskId, '')">
                          默认分组
                        </div>
                        <div
                          v-for="f in customFolders"
                          :key="f.id"
                          class="cy-option"
                          @click.stop="setTaskFolder(child.taskId, f.id)"
                        >
                          📁 {{ f.name }}
                        </div>
                      </div>
                    </transition>
                  </div>
                  <button
                    v-if="child.status === 'success'"
                    class="btn-text p-1"
                    @click.stop="openFolder(child.filePath)"
                  >
                    打开
                  </button>
                  <button
                    class="btn-text text-danger p-1"
                    @click.stop="removeSingleTask(child.taskId)"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition-group>
    </div>

    <div v-show="activeSelectId" class="global-click-shield" @click="activeSelectId = null"></div>

    <Transition name="toast">
      <div v-if="toast.show" class="global-toast" :class="`toast-${toast.type}`">
        <span v-if="toast.type === 'success'">✅</span>
        <span v-if="toast.type === 'error'">❌</span>
        <span v-if="toast.type === 'warn'">⚠️</span>
        {{ toast.message }}
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="folderModal.show" class="modal-overlay" @click.self="folderModal.show = false">
        <div class="modal-box" @click.stop>
          <div class="modal-header">
            <h3>{{ folderModal.isEdit ? '重命名分组' : '新建分组' }}</h3>
          </div>
          <div class="modal-body">
            <input
              v-model="folderModal.name"
              type="text"
              placeholder="请输入分组名称"
              class="url-input block-input safe-input"
              autofocus
              @keyup.enter="confirmFolder"
            />
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="folderModal.show = false">取消</button>
            <button class="btn-confirm text-primary" @click="confirmFolder">确定</button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="confirmModal.show" class="modal-overlay" @click.self="confirmModal.show = false">
        <div class="modal-box">
          <div class="modal-header">
            <h3>{{ confirmModal.title }}</h3>
          </div>
          <div class="modal-body confirm-text">{{ confirmModal.message }}</div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="confirmModal.show = false">取消</button>
            <button class="btn-confirm text-danger" @click="executeConfirm">确认</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* =========== 原基础样式与卡片结构完全保留 =========== */
.page-container {
  max-width: 980px;
  margin: 0 auto;
  padding: 10px 16px;
  color: var(--text-main);
  position: relative; /* 为所有下拉护航 */
}
.page-header {
  margin-bottom: 24px;
}
.page-header h2 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 800;
}
.subtitle {
  color: var(--text-sub);
  font-size: 14px;
  margin: 0;
}
.card {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}
.path-configure {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin-bottom: 16px;
}
.path-label {
  font-size: 13px;
  color: var(--text-sub);
  font-weight: bold;
  white-space: nowrap;
}
.path-display {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-main);
  outline: none;
  text-overflow: ellipsis;
  font-family: monospace;
}
.input-group {
  display: flex;
  gap: 12px;
}
.url-input {
  flex: 1;
  padding: 14px 18px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background: var(--bg-color);
  color: var(--text-main);
  transition: all 0.2s;
}
.url-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(0, 174, 236, 0.1);
  background: var(--card-bg);
}
.input-btn {
  padding: 0 32px;
  font-size: 15px;
}

/* 通用按钮 */
.btn-primary {
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  padding: 10px 18px;
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 174, 236, 0.3);
}
.btn-primary:disabled {
  background: var(--text-sub);
  cursor: not-allowed;
}
.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-main);
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-outline:hover {
  background: var(--bg-color);
  border-color: var(--primary-color);
  color: var(--primary-color);
}
.btn-text {
  background: transparent;
  border: none;
  color: var(--text-sub);
  cursor: pointer;
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 6px;
  font-weight: 500;
  transition: 0.2s;
}
.btn-text:hover {
  background: var(--bg-color);
}
.text-danger {
  color: #ff4d4f !important;
}
.text-success {
  color: #52c41a !important;
}
.text-warning {
  color: #faad14 !important;
}
.text-primary {
  color: var(--primary-color) !important;
}
.btn-danger-solid {
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-danger-solid:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3);
  transform: translateY(-1px);
}
.btn-danger-solid:disabled {
  background: #ffb4b5;
  cursor: not-allowed;
}

/* 其他排版 */
.preview-area {
  margin-top: 24px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}
.toolbar-actions {
  display: flex;
  gap: 8px;
}
.preview-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.preview-header {
  display: flex;
  gap: 20px;
  align-items: stretch;
}
.preview-cover-box {
  position: relative;
  width: 220px;
  height: 138px;
  flex-shrink: 0;
}
.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.bvid-tag {
  position: absolute;
  right: 8px;
  bottom: 8px;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  font-size: 12px;
  padding: 3px 6px;
  border-radius: 4px;
}
.preview-info-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.preview-title {
  margin: 0;
  font-size: 19px;
  font-weight: bold;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}
.tag-row {
  display: flex;
  gap: 16px;
  align-items: center;
  background: var(--bg-color);
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px dashed var(--border-color);
}
.meta-tag {
  font-size: 13px;
  color: var(--text-sub);
  font-weight: 500;
}
.push-right {
  margin-left: auto;
}
.card-divider {
  width: 100%;
  height: 1px;
  background-color: var(--border-color);
}
.preview-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.option-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.label-text {
  font-size: 14px;
  color: var(--text-sub);
  margin-top: 8px;
  white-space: nowrap;
  font-weight: bold;
}
.quality-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.quality-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-main);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
}
.quality-btn:hover {
  border-color: var(--primary-color);
  background: rgba(0, 174, 236, 0.05);
}
.quality-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  box-shadow: 0 3px 10px rgba(0, 174, 236, 0.3);
  transform: translateY(-1px);
}
.q-name {
  font-weight: 500;
}
.q-codec {
  font-size: 11px;
  padding: 2px 6px;
  background: var(--bg-color);
  color: var(--text-sub);
  border-radius: 4px;
  font-weight: 600;
  transition: all 0.2s;
}
.quality-btn.active .q-codec {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}
.multi-part-container {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}
.part-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.part-title {
  font-size: 13px;
  color: var(--text-sub);
}
.episodes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
  max-height: 140px;
  overflow-y: auto;
}
.episode-item {
  padding: 8px 10px;
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
  transition: 0.2s;
  color: var(--text-main);
}
.episode-item.active {
  background: rgba(0, 174, 236, 0.05);
  border-color: var(--primary-color);
  border-style: solid;
  color: var(--primary-color);
}
.action-row {
  margin-top: auto;
}
.main-action {
  width: 100%;
  padding: 12px 0;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.panel-header h3 {
  margin: 0;
  font-size: 18px;
  display: flex;
  align-items: center;
}
.badge {
  background: var(--primary-color);
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  margin-left: 8px;
}
.badge-gray {
  background: var(--text-sub);
}
.flex-between {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  align-items: center;
}
.title-left,
.filter-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.item-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.task-item {
  display: flex;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  transition: 0.2s;
  gap: 16px;
}
.task-item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.ongoing-item {
  border-left: 4px solid var(--primary-color);
}
.is-paused {
  border-left-color: var(--text-sub);
  opacity: 0.7;
}
.task-img {
  width: 130px;
  height: 82px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}
.task-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.task-name {
  margin: 0 0 8px 0;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.task-tags {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: auto;
}
.tag-blue {
  font-size: 12px;
  padding: 2px 8px;
  background: rgba(0, 174, 236, 0.1);
  color: var(--primary-color);
  border-radius: 4px;
}
.tag-default {
  font-size: 12px;
  padding: 2px 8px;
  background: var(--bg-color);
  color: var(--text-sub);
  border-radius: 4px;
}
.status-tip {
  font-size: 12px;
  color: var(--text-sub);
}
.progress-box {
  margin-top: 12px;
}
.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-sub);
  margin-bottom: 6px;
}
.progress-bar-bg {
  width: 100%;
  height: 6px;
  background: var(--bg-color);
  border-radius: 3px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: var(--primary-color);
  transition: width 0.3s linear;
}
.fill-paused {
  background: var(--text-sub);
}
.task-operations {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 16px;
  border-left: 1px dashed var(--border-color);
}
.column-ops {
  flex-direction: column;
  justify-content: center;
  min-width: 120px;
  align-items: stretch;
  text-align: center;
}
.op-btn {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: 0.2s;
}
.op-btn:hover {
  background: var(--bg-color);
  transform: scale(1.1);
}
.op-label {
  font-size: 12px;
  padding: 4px 8px;
  background: rgba(0, 174, 236, 0.1);
  border-radius: 4px;
}
.complete-item {
  border-left-color: transparent !important;
}
.bold-title {
  color: var(--text-main) !important;
}
.search-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  background: var(--bg-color);
  color: var(--text-main);
  outline: none;
}
.collection-item {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--card-bg);
  transition: 0.3s;
}
.collection-header {
  border: none !important;
  margin-bottom: 0 !important;
  background: transparent;
  cursor: pointer;
}
.collection-header:hover {
  background: var(--bg-color);
}
.collection-header.expanded {
  border-bottom: 1px dashed var(--border-color) !important;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
.cover-stack {
  position: relative;
  width: 130px;
  height: 82px;
}
.cover-stack::before {
  content: '';
  position: absolute;
  top: -4px;
  right: -4px;
  width: 100%;
  height: 100%;
  background: var(--border-color);
  border-radius: 6px;
  z-index: 1;
}
.cover-stack .task-img {
  position: relative;
  z-index: 2;
  border: 2px solid var(--card-bg);
}
.stack-badge {
  position: absolute;
  right: 0;
  bottom: 0;
  background: var(--primary-color);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  z-index: 3;
}
.folder-icon-large {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  background: var(--bg-color);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  border: 2px solid var(--card-bg);
}
.collection-children {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: var(--bg-color);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  gap: 8px;
}
.child-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
}
.child-cover {
  width: 50px;
  height: 32px;
  border-radius: 4px;
}
.child-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  min-width: 0;
}
.child-title {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}
.child-status {
  font-size: 12px;
}
.empty-state {
  text-align: center;
  padding: 60px 0;
  color: var(--text-sub);
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* ================= 🚀 自定义赛博悬浮下拉菜单 ================= */
.cy-select-container {
  position: relative;
  display: flex; /* 让父容器精准锁定宽度 */
  width: 100%;
}
.cy-select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-main);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.cy-select-trigger.sm {
  padding: 6px 14px;
  border-radius: 6px;
  justify-content: center;
  gap: 6px;
}
.cy-select-trigger.xs {
  padding: 4px 8px;
  border-radius: 6px;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
}
.cy-select-trigger:hover {
  border-color: var(--primary-color);
  background-color: rgba(0, 174, 236, 0.03);
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
.cy-select-trigger:hover .cy-arrow {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2300aeec' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3Cpolyline points='6 9 12 15 18 9'%3e%3C/polyline%3e%3C/svg%3e");
}
.cy-arrow.up {
  transform: rotate(180deg);
}

/* 🎯 灵魂所在：绝对锁死右侧，任凭文字再长只往左边长，彻底告别右侧滚动条 */
.cy-select-menu,
.cy-select-menu.force-right {
  position: absolute;
  top: calc(100% + 4px);
  right: 0 !important;
  left: auto !important;
  transform: none !important; /* 断绝一切导致它水平飞出的可能 */
  width: max-content;
  min-width: 100%;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 99999;
  max-height: 250px;
  overflow-y: auto;
  overflow-x: hidden;
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
  text-align: left;
}
.cy-option:hover {
  background: rgba(0, 174, 236, 0.08);
  color: var(--primary-color);
}

/* 🛡️ 动画重写：剥夺过渡时的变形特权，改为单纯的透明度与间距变化 */
.cy-fade-enter-active,
.cy-fade-leave-active {
  transition:
    opacity 0.2s ease,
    margin-top 0.2s ease !important;
}
.cy-fade-enter-from,
.cy-fade-leave-to {
  opacity: 0;
  margin-top: -8px;
}

/* 全局透明遮罩（点别处自动关闭下拉框） */
.global-click-shield {
  position: fixed;
  inset: 0;
  z-index: 998;
}

/* ================= 🌟 批量管理引擎专区 ================= */
.batch-highlight {
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 4px rgba(0, 174, 236, 0.1) !important;
}

.batch-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 174, 236, 0.05);
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px dashed rgba(0, 174, 236, 0.4);
}
.batch-title {
  font-size: 14px;
  color: var(--primary-color);
  min-width: 80px;
}
.batch-title strong {
  font-size: 16px;
}
.batch-quick-btns {
  display: flex;
  border-right: 1px solid var(--border-color);
  padding-right: 12px;
}
.close-batch {
  margin-left: auto;
  color: var(--text-sub);
}
.close-batch:hover {
  color: var(--text-main);
}
.mb-8 {
  margin-bottom: 20px;
}

.cy-checkbox-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  cursor: pointer;
}
.cy-checkbox {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 2px solid var(--text-sub);
  transition: all 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
}
.cy-checkbox.is-checked {
  border-color: var(--primary-color);
  background-color: var(--primary-color);
}
.cy-checkbox.is-checked::after {
  content: '';
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg) translate(-1px, -1px);
}

/* 被选中时的卡片底色高亮反馈 */
.item-checked {
  background-color: rgba(0, 174, 236, 0.05) !important;
  border-color: rgba(0, 174, 236, 0.5) !important;
}
.child-checked {
  background-color: rgba(0, 174, 236, 0.08) !important;
  border-color: rgba(0, 174, 236, 0.3) !important;
}
.mr-2 {
  margin-right: 8px;
}

/* 🌟 全局 Modal 及 Toast 通用基础动画 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.modal-box {
  background: var(--card-bg);
  width: 360px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--border-color);
}
.modal-header {
  padding: 20px 24px 10px;
  font-size: 18px;
  font-weight: bold;
}
.modal-header h3 {
  margin: 0;
}
.modal-body {
  padding: 0 24px 20px;
}
.confirm-text {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-sub);
}
.block-input {
  width: 100%;
  box-sizing: border-box;
}
.modal-footer {
  display: flex;
  border-top: 1px solid var(--border-color);
  background: var(--bg-color);
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
}
.modal-footer button {
  flex: 1;
  border: none;
  background: transparent;
  padding: 14px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
}
.btn-cancel {
  border-right: 1px solid var(--border-color) !important;
  color: var(--text-sub);
}

.global-toast {
  position: fixed;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  background: var(--card-bg);
  border-radius: 30px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  font-weight: 600;
  z-index: 10000;
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
.toast-leave-active,
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px) scale(0.9);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-from .modal-box,
.fade-leave-to .modal-box {
  transform: scale(0.95);
}
.safe-input {
  -webkit-app-region: no-drag !important;
  pointer-events: auto !important;
  user-select: text !important;
  cursor: text !important;
}
.flex-op {
  display: flex;
  align-items: center;
  gap: 12px;
}
.btn-outline.text-primary {
  border-color: var(--primary-color) !important;
  color: var(--primary-color) !important;
  font-weight: bold;
}
.btn-outline.text-primary:hover {
  background: rgba(0, 174, 236, 0.1) !important;
}
</style>
