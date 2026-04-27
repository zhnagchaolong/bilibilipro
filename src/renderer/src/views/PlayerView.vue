<template>
  <div class="desktop-player-view" @click="showSearchSuggest = false">
    <!-- 🌟 顶层：全新磨砂玻璃质感原生导航栏 -->
    <div class="bili-native-header glass-header" :style="{ zIndex: showClipManager ? 80 : 1000 }">
      <div class="mac-traffic-lights-spacer"></div>

      <div class="header-left">
        <div class="nav-arrows">
          <button class="icon-btn" title="后退/回到浏览原点" @click="webviewGoBack">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button class="icon-btn" title="前进" @click="webviewGoForward">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          <button class="icon-btn" title="刷新当前页" @click="webviewReload">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
              <polyline points="21 3 21 8 16 8"></polyline>
            </svg>
          </button>
        </div>
        <div class="divider"></div>
        <div class="channel-tabs">
          <div class="channel-pill">
            <div class="channel-pill-bg" :style="pillBgStyle"></div>
            <button
              ref="pillBtnLive"
              class="channel-item"
              :class="{ active: currentTab === 'live' }"
              @click="navTo('live', 'https://live.bilibili.com')"
            >
              直播
            </button>
            <button
              ref="pillBtnRecommend"
              class="channel-item"
              :class="{ active: currentTab === 'recommend' }"
              @click="navTo('recommend', 'https://www.bilibili.com')"
            >
              推荐
            </button>
            <button
              ref="pillBtnHot"
              class="channel-item"
              :class="{ active: currentTab === 'hot' }"
              @click="navTo('hot', 'https://www.bilibili.com/v/popular/all')"
            >
              热门
            </button>
            <button
              ref="pillBtnAnime"
              class="channel-item"
              :class="{ active: currentTab === 'anime' }"
              @click="navTo('anime', 'https://www.bilibili.com/anime')"
            >
              追番
            </button>
            <button
              ref="pillBtnCinema"
              class="channel-item"
              :class="{ active: currentTab === 'cinema' }"
              @click="navTo('cinema', 'https://www.bilibili.com/cinema')"
            >
              影视
            </button>
          </div>
        </div>
      </div>

      <div class="header-right">
        <!-- 把下面整段贴在上方搜索框紧挨着的左边 -->
        <div v-if="isBiliVideo" class="header-right-tools">
          <!-- 顶栏：切片标记 -->
          <button
            class="header-tool-btn purple-btn"
            title="标记当前帧为切片, 抓取高光弹幕 快捷键ALT+c"
            @click="createClipFromCurrent"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
            >
              <path
                d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 14c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm16-4h-3l-2.36-2.36 2.62-2.62L22 15.25V18zm0-11l-2.06-2.06-2.62 2.62L22 10.25V7z"
              />
            </svg>
            <span>切片</span>
          </button>

          <!-- 顶栏：打开清单 -->
          <button
            class="header-tool-btn dynamic-btn"
            title="打开切片清单与笔记编辑器"
            @click="showClipManager = true"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            <span>清单</span>
          </button>
        </div>
        <!-- 🔍 智能搜索框区 -->
        <div class="search-wrapper" @click.stop>
          <div class="search-box">
            <svg
              class="search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              v-model="searchText"
              type="text"
              placeholder="探索 Bilibili..."
              @input="fetchSuggests"
              @focus="showSearchSuggest = true"
              @keyup.enter="handleSearch(searchText)"
            />
          </div>

          <transition name="dropdown-fade">
            <!-- 🌟 搜索历史 & 搜索建议双栖面板 -->
            <div
              v-if="
                showSearchSuggest &&
                (suggests.length > 0 || (!searchText && searchHistory.length > 0))
              "
              class="search-suggest-panel glass-dropdown"
            >
              <!-- 📜 历史记录模块 -->
              <div v-if="!searchText && searchHistory.length > 0" class="search-history-panel">
                <div class="history-header">
                  <span>搜索历史</span>
                  <button
                    class="clear-history-btn"
                    title="清空历史记录"
                    @click.stop="clearSearchHistory"
                  >
                    清空
                  </button>
                </div>
                <div class="history-tags">
                  <span
                    v-for="(kw, idx) in searchHistory"
                    :key="idx"
                    class="history-tag"
                    @click.stop="handleSearch(kw)"
                  >
                    {{ kw }}
                  </span>
                </div>
              </div>

              <!-- 💡 即时搜索建议模块 -->
              <template v-else>
                <div
                  v-for="(item, index) in suggests"
                  :key="index"
                  class="suggest-item"
                  @click="handleSearch(item.value)"
                >
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <span class="suggest-keyword" v-html="item.name"></span>
                </div>
              </template>
            </div>
          </transition>
        </div>

        <div class="header-actions-group">
          <div
            class="account-switch-wrapper"
            @mouseenter="showAccountDropdown = true"
            @mouseleave="showAccountDropdown = false"
          >
            <div class="current-account">
              <img
                v-if="currentAccount"
                :src="currentAccount.face"
                class="user-avatar"
                referrerpolicy="no-referrer"
              />
              <div v-else class="user-avatar-placeholder">👤</div>
              <span class="user-acc-name">{{
                currentAccount ? currentAccount.name : '游客浏览'
              }}</span>
              <span v-if="currentAccount?.isVip" class="vip-badge">VIP</span>
            </div>
            <transition name="dropdown-spring">
              <div
                v-if="showAccountDropdown && accounts.length > 0"
                class="account-dropdown glass-dropdown"
              >
                <div
                  v-for="acc in accounts"
                  :key="acc.partition"
                  class="acc-dropdown-item"
                  :class="{ active: acc.partition === selectedPartition }"
                  @click="switchAccount(acc.partition)"
                >
                  <img :src="acc.face" class="acc-avatar-sm" referrerpolicy="no-referrer" />
                  <span class="acc-name">{{ acc.name }}</span>
                  <span v-if="acc.isVip" class="vip-badge-sm">大会员</span>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>

      <div class="ios-progress-container">
        <div
          class="ios-progress-bar"
          :class="{ 'is-loading': isHardLoading, 'is-done': !isHardLoading }"
        ></div>
      </div>
    </div>

    <!-- 🌟 内容层 -->
    <div class="main-body-layout">
      <!-- 🌟 左侧边导航栏 -->
      <div class="bili-vertical-sidebar">
        <!-- 基础内容导航 -->
        <div class="sidebar-pill">
          <div class="sidebar-pill-bg" :style="sidebarPillStyle"></div>
          <button
            ref="sideBtnHome"
            class="v-tab-item"
            :class="{ active: isHomeActive }"
            @click="navTo('recommend', 'https://www.bilibili.com')"
          >
            <span>首</span><span>页</span>
          </button>
          <button
            ref="sideBtnPopular"
            class="v-tab-item"
            :class="{ active: currentTab === 'popular' }"
            @click="navTo('popular', 'https://www.bilibili.com/v/popular/weekly')"
          >
            <span>精</span><span>选</span>
          </button>
          <button
            ref="sideBtnDynamic"
            class="v-tab-item"
            :class="{ active: currentTab === 'dynamic' }"
            @click="navTo('dynamic', 'https://t.bilibili.com')"
          >
            <span>动</span><span>态</span>
          </button>

          <!-- 📜 历史记录实体按钮 -->
          <button
            ref="sideBtnHistory"
            class="v-tab-item"
            :class="{ active: currentTab === 'history' }"
            @click="navTo('history', 'https://www.bilibili.com/account/history')"
          >
            <span>历</span><span>史</span>
          </button>

          <button
            ref="sideBtnSpace"
            class="v-tab-item"
            :class="{ active: currentTab === 'space' }"
            @click="navTo('space', 'https://space.bilibili.com')"
          >
            <span>我</span><span>的</span>
          </button>
        </div>

        <div style="flex: 1"></div>

        <!-- 🚀 视频专属特权控制组 -->
        <transition name="dropdown-fade">
          <div v-if="isBiliVideo" class="v-video-tools">
            <!-- 📸 纯净截图新增 -->
            <button
              class="v-tab-item c-gold"
              title="无损截取当前极清画面"
              @click="captureVideoFrame"
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                style="margin-bottom: 2px"
              >
                <path
                  d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                ></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              <span style="font-size: 11px">截图</span>
            </button>

            <!-- 🎆 封面提取 -->
            <button class="v-tab-item c-teal" title="提取原画封面" @click="handleExtractCover">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                style="margin-bottom: 2px"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span style="font-size: 11px">封面</span>
            </button>

            <button
              class="v-tab-item"
              :class="{ 'side-zen-active': isZenMode }"
              :title="isZenMode ? '退出禅定模式 (恢复列表)' : '开启禅定模式 (无干扰纯净播放)'"
              @click="toggleZenMode"
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                style="margin-bottom: 2px"
              >
                <path
                  d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
                ></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span style="font-size: 11px">聚焦</span>
            </button>

            <button
              class="v-tab-item c-blue"
              title="传导给视频核心并呼叫下载组"
              @click="handleAutoDownloadPush"
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                style="margin-bottom: 2px"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span style="font-size: 11px">保存</span>
            </button>

            <button class="v-tab-item side-op-gray" title="弹出纯净小窗" @click="handlePopCurrent">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                style="margin-bottom: 2px"
              >
                <rect x="2" y="3" focusable="false" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
              <span style="font-size: 11px">小窗</span>
            </button>

            <div class="side-divider"></div>
          </div>
        </transition>

        <!-- 🌟 全新的切片管理器 -->
        <ClipManager
          v-model="showClipManager"
          :clips="currentVideoClips"
          :all-clips="allClipsMap"
          :video-duration="videoDuration"
          @update:clips="currentVideoClips = $event"
          @jump-to="handleJumpToTime"
          @navigate-to="handleNavigateToVideo"
          @set-active-clip="setActiveTimelineMarker"
          @push-slice-tasks="(tasks, isMerged) => handleSliceTasks(tasks, isMerged)"
        />

        <!-- 🧪 实验室入口保底 -->
        <button
          class="v-tab-item c-purple lab-sidebar-btn"
          title="呼叫极客实验室"
          @click="openLabs"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            style="margin-bottom: 2px"
          >
            <path d="M10 2v7.31"></path>
            <path d="M14 9.3V1.99"></path>
            <path d="M8.5 2h7"></path>
            <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
            <path d="M5.52 16h12.96"></path>
          </svg>
          <span style="font-size: 13px">极客</span>
        </button>
      </div>

      <div class="webview-container">
        <div
          class="webview-underlayer"
          :class="{ 'dark-underlayer': isDarkMode, 'is-active': isHardLoading || isFirstLoad }"
        >
          <div class="glass-loader-box">
            <div class="twin-bubbles">
              <div class="b-blue"></div>
              <div class="b-pink"></div>
            </div>
          </div>
        </div>

        <webview
          v-for="tab in TAB_CONFIG"
          :key="selectedPartition + '-browser-' + tab.id"
          :ref="(el) => setTabWebview(tab.id, el)"
          v-show="currentTab === tab.id && !isBiliVideo"
          :muted="currentTab !== tab.id || isBiliVideo"
          disablewebsecurity
          webpreferences="backgroundThrottling=yes,scrollBounce=no,webgl=no,acceleratedCanvas=no"
          class="bili-webview webview-layer"
          :partition="selectedPartition"
          :src="tab.url"
          useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          @new-window="(e) => e.preventDefault()"
          @did-stop-loading="onTabStopLoading(tab.id)"
          @load-commit="forceUIInject"
          @console-message="handleConsoleMessage"
          @did-navigate="onTabDidNavigate($event, tab.id)"
          @did-navigate-in-page="onTabDidNavigate($event, tab.id)"
          @dom-ready="injectBlackMagic"
        ></webview>

        <webview
          :key="selectedPartition + '-video'"
          ref="videoWebview"
          disablewebsecurity
          webpreferences="backgroundThrottling=yes,scrollBounce=no"
          class="bili-webview webview-layer"
          :class="{ 'hidden-layer': !isBiliVideo }"
          :partition="selectedPartition"
          src="about:blank"
          useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          @new-window="(e) => e.preventDefault()"
          @did-stop-loading="onStopLoading('video')"
          @load-commit="forceUIInject"
          @console-message="handleConsoleMessage"
          @did-navigate="onDidNavigate($event, 'video')"
          @did-navigate-in-page="onDidNavigate($event, 'video')"
          @dom-ready="injectBlackMagic"
        ></webview>
        <!-- 🌟 全息高能切片时间轴 (增加了一键收回功能) -->
        <Transition name="timeline-slide">
          <div
            v-if="isBiliVideo && currentVideoClips.length > 0 && videoDuration > 0"
            ref="timelinePanelRef"
            class="clips-timeline-panel glass-header"
            :class="{ 'is-collapsed': !isTimelineExpanded }"
            style="cursor: grab"
            title="按住面板空白处可全屏随意拖拽"
            @mousedown="startDragTimeline"
          >
            <!-- 左侧标题充当折叠/展开开关 -->
            <div
              class="timeline-meta-left tl-toggle-btn"
              title="点击展开或收起面板"
              @mousedown.stop="isTimelineExpanded = !isTimelineExpanded"
            >
              <span class="tl-title">✨ {{ isTimelineExpanded ? '切片轨道' : '展开轨道' }}</span>
            </div>

            <div v-show="isTimelineExpanded" class="timeline-track-wrapper">
              <div ref="trackRef" class="timeline-track">
                <div
                  v-for="clip in currentVideoClips"
                  :key="clip.id"
                  class="timeline-marker"
                  :class="{ 'marker-active': activeTimelineMarkerId === clip.id }"
                  :style="{ left: (clip.time / videoDuration) * 100 + '%' }"
                  @mousedown.stop="startDragMarker($event, clip)"
                  @mouseenter="activeTimelineMarkerId = clip.id"
                  @mouseleave="activeTimelineMarkerId = null"
                >
                  <div class="marker-thumb pop-bounce"></div>

                  <div class="marker-popover">
                    <div class="popover-time">{{ formatTime(clip.time) }}</div>
                    <div class="popover-title" :title="clip.title">
                      {{ clip.title || '标记点' }}
                    </div>
                    <button class="popover-btn-del" @mousedown.stop="quickDeleteClip(clip.id)">
                      快速移除
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-show="isTimelineExpanded" class="timeline-meta-right">
              <span>{{ formatTime(videoDuration) }}</span>
            </div>
          </div>
        </Transition>
        <!-- 🚀 下方居中导航浮岛 (超硬核视觉锚定拖拽) -->
        <div
          ref="islandRef"
          class="floating-actions draggable-island"
          title="按住空白处随心拖拽，避免遮挡字幕"
          @mousedown="startDragIsland"
        >
          <!-- 点击事件带 .stop 防止误触拖拽触发回退 -->
          <button class="fab-btn pop-bounce" title="后退" @mousedown.stop @click="webviewGoBack">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <button
            class="fab-btn pop-bounce"
            title="刷新页面"
            @mousedown.stop
            @click="webviewReload"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
              <polyline points="21 3 21 8 16 8"></polyline>
            </svg>
          </button>

          <button class="fab-btn pop-bounce" title="前进" @mousedown.stop @click="webviewGoForward">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 💡 下载选择弹窗 -->
    <Transition name="fade">
      <div v-if="showDownloadModal" class="modal-overlay" @click.self="showDownloadModal = false">
        <div class="modal-box" @click.stop>
          <div class="modal-header"><h3>📥 配置下载抓取身份</h3></div>
          <div class="modal-body">
            <p class="modal-desc">选择具有<strong>大会员</strong>的账号进行解析拉取高画质：</p>
            <div class="download-acc-list">
              <div
                v-for="acc in accounts"
                :key="'dl-' + acc.partition"
                class="dl-acc-item hover-scale"
                :class="{ 'dl-item-vip': acc.isVip }"
                @click="executeDownload(acc.partition)"
              >
                <img :src="acc.face" class="dl-avatar" referrerpolicy="no-referrer" />
                <div class="dl-info">
                  <span class="dl-name">{{ acc.name }}</span>
                  <span class="dl-stat" :class="{ 'text-vip': acc.isVip }">{{
                    acc.isVip ? '👑 大会员画质' : '普通通道'
                  }}</span>
                </div>
                <button class="btn-text" :class="acc.isVip ? 'text-vip' : 'text-primary'">
                  派遣此项
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 🧪 极客实验室弹窗 -->
    <Transition name="fade">
      <div v-if="showLabsModal" class="modal-overlay" @click.self="showLabsModal = false">
        <div class="modal-box labs-box" @click.stop>
          <div class="modal-header"><h3>🧪 Titanium 极客实验室</h3></div>
          <div class="modal-body">
            <!-- 🛡️ 净网模块 -->
            <div class="lab-section">
              <h4>🛡️ 虚空索敌 (动态拦截关键词)</h4>
              <div class="block-input-group">
                <input
                  v-model="newKeyword"
                  placeholder="输入屏蔽词, 回车添加..."
                  @keyup.enter="addKeyword"
                />
                <button class="btn-primary" @click="addKeyword">拦截</button>
              </div>
              <div class="keyword-tags">
                <span v-for="(kw, idx) in blockKeywords" :key="idx" class="kw-tag"
                  >{{ kw }} <b @click="removeKeyword(idx)">×</b></span
                >
                <span v-if="blockKeywords.length === 0" class="empty-hint">当前未设置屏蔽词</span>
              </div>
            </div>

            <div class="lab-divider"></div>

            <div class="lab-section" :class="{ 'disabled-section': !isBiliVideo }">
              <h4>⚡ 引擎超频 (突破默认限制)</h4>
              <p class="section-desc">B站默认最高2x，你可以强制拉满！(仅当前视频生效)</p>
              <div class="speed-controls">
                <button
                  v-for="rate in [1, 1.5, 2, 3, 4, 5]"
                  :key="rate"
                  class="speed-btn"
                  :class="{
                    'active-speed': currentSpeed === rate,
                    'danger-btn': rate >= 4 && currentSpeed !== rate
                  }"
                  @click="forceSpeed(rate)"
                >
                  {{ rate === 1 ? '1.0x 恢复' : rate + 'x' }}
                </button>
              </div>
            </div>

            <div class="lab-divider"></div>

            <!-- 🎧 高维解剖刀 -->
            <div class="lab-section" :class="{ 'disabled-section': !isBiliVideo }">
              <AudioAlchemist @apply-audio-eq="handleAudioMode" />
            </div>

            <div class="lab-divider"></div>

            <!-- 🚀 时光刺客 -->
            <div class="lab-section" :class="{ 'disabled-section': !isBiliVideo }">
              <TimeJumper @apply-time-jumper="handleTimeJumper" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import AudioAlchemist from '../components/AudioAlchemist.vue'
import TimeJumper from '../components/TimeJumper.vue'
import ClipManager from '../components/ClipManager.vue'
import { usePlayerView } from '../composables/player/usePlayerView'
import { watch, ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  isActive: boolean
}>()

const {
  isTimelineExpanded,
  currentSpeed,
  showClipManager,
  handleSliceTasks,
  handleNavigateToVideo,
  allClipsMap,
  currentVideoClips,
  timelinePanelRef,
  startDragTimeline,
  handleJumpToTime,
  activeTimelineMarkerId,
  setActiveTimelineMarker,
  accounts,
  selectedPartition,
  showAccountDropdown,
  showDownloadModal,
  isDarkMode,
  isZenMode,
  browserWebview,
  videoWebview,
  TAB_CONFIG,
  tabWebviews,
  setTabWebview,
  onTabDidNavigate,
  onTabStopLoading,
  isFirstLoad,
  isHardLoading,
  currentTab,
  currentUrl,
  isHomeActive,
  searchText,
  suggests,
  showSearchSuggest,
  searchHistory,
  islandRef,
  startDragIsland,
  currentAccount,
  isBiliVideo,
  showLabsModal,
  blockKeywords,
  newKeyword,
  videoDuration,
  trackRef,
  formatTime,
  quickDeleteClip,
  startDragMarker,
  openLabs,
  addKeyword,
  removeKeyword,
  forceSpeed,
  captureVideoFrame,
  handleAudioMode,
  handleTimeJumper,
  onDidNavigate,
  onStopLoading,
  navTo: originalNavTo,
  webviewGoBack,
  webviewGoForward,
  webviewReload,
  injectBlackMagic,
  handleExtractCover,
  toggleZenMode,
  fetchSuggests,
  handleSearch,
  clearSearchHistory,
  handleAutoDownloadPush,
  executeDownload,
  handlePopCurrent,
  handleConsoleMessage,
  switchAccount,
  createClipFromCurrent,
  forceUIInject,
  pauseActivities,
  resumeActivities
} = usePlayerView()

// ==========================================
// 胶囊导航栏滑块逻辑
// ==========================================
const pillBtnLive = ref<HTMLElement | null>(null)
const pillBtnRecommend = ref<HTMLElement | null>(null)
const pillBtnHot = ref<HTMLElement | null>(null)
const pillBtnAnime = ref<HTMLElement | null>(null)
const pillBtnCinema = ref<HTMLElement | null>(null)

const pillMap: Record<string, typeof pillBtnLive> = {
  live: pillBtnLive,
  recommend: pillBtnRecommend,
  hot: pillBtnHot,
  anime: pillBtnAnime,
  cinema: pillBtnCinema
}

const pillBgStyle = ref({ transform: 'translateX(64px)', width: '64px' })
const sidebarPillStyle = ref({ transform: 'translateY(0px)', height: '52px' })

function updatePillPositions(): void {
  requestAnimationFrame(() => {
    // 顶部 pill
    const parent = document.querySelector('.channel-pill')
    const el = parent?.querySelector('.channel-item.active') as HTMLElement | null
    if (parent && el) {
      const parentRect = parent.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const tx = elRect.left - parentRect.left
      const w = elRect.width
      console.log('[pill] active:', el.textContent?.trim(), 'tx:', tx.toFixed(1), 'w:', w.toFixed(1))
      pillBgStyle.value = {
        transform: `translateX(${tx}px)`,
        width: `${w}px`
      }
    }
    // 左侧 pill
    const sideParent = document.querySelector('.sidebar-pill')
    const sideEl = sideParent?.querySelector('.v-tab-item.active') as HTMLElement | null
    if (sideParent && sideEl) {
      const parentRect = sideParent.getBoundingClientRect()
      const elRect = sideEl.getBoundingClientRect()
      sidebarPillStyle.value = {
        transform: `translateY(${elRect.top - parentRect.top}px)`,
        height: `${elRect.height}px`
      }
    }
  })
}

let pillMutationObserver: MutationObserver | null = null

onMounted(() => {
  nextTick(updatePillPositions)
  window.addEventListener('resize', updatePillPositions)

  pillMutationObserver = new MutationObserver(() => {
    updatePillPositions()
  })
  const channelPill = document.querySelector('.channel-pill')
  channelPill?.querySelectorAll('.channel-item').forEach((btn) => {
    pillMutationObserver!.observe(btn, { attributes: true, attributeFilter: ['class'] })
  })
  const sidebarPill = document.querySelector('.sidebar-pill')
  sidebarPill?.querySelectorAll('.v-tab-item').forEach((btn) => {
    pillMutationObserver!.observe(btn, { attributes: true, attributeFilter: ['class'] })
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updatePillPositions)
  pillMutationObserver?.disconnect()
})

function navTo(tab: string, url: string): void {
  originalNavTo(tab, url)
}

// ==========================================
// 左侧导航栏胶囊滑块逻辑
// ==========================================
const sideBtnHome = ref<HTMLElement | null>(null)
const sideBtnPopular = ref<HTMLElement | null>(null)
const sideBtnDynamic = ref<HTMLElement | null>(null)
const sideBtnHistory = ref<HTMLElement | null>(null)
const sideBtnSpace = ref<HTMLElement | null>(null)

function getSidebarActiveBtn(): HTMLElement | null {
  if (isHomeActive.value) return sideBtnHome.value
  const map: Record<string, typeof sideBtnHome> = {
    popular: sideBtnPopular,
    dynamic: sideBtnDynamic,
    history: sideBtnHistory,
    space: sideBtnSpace
  }
  return map[currentTab.value]?.value ?? null
}



watch(
  () => props.isActive,
  (active) => {
    if (active) {
      console.log('[PlayerView] resumed')
      resumeActivities()
      nextTick(updatePillPositions)
    } else {
      console.log('[PlayerView] paused')
      pauseActivities()
    }
  },
  { immediate: true }
)


</script>
<style scoped>
/* =========== 页面核心布局 =========== */
.desktop-player-view {
  display: flex !important;
  flex-direction: column !important;
  width: 100% !important;
  height: 100% !important;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-color);
  box-sizing: border-box;
}

/* =========== 顶栏实现 =========== */
.bili-native-header {
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px 0 16px;
  -webkit-app-region: drag;
  z-index: 1000;
  transition:
    background-color 0.3s ease,
    border-bottom 0.3s ease;
}
.glass-header {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
[data-theme='dark'] .glass-header {
  background: rgba(24, 25, 28, 0.75);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.mac-traffic-lights-spacer {
  width: 50px;
}
.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  -webkit-app-region: no-drag;
}
.header-left {
  flex: 1;
}
.nav-arrows {
  display: flex;
  gap: 6px;
  align-items: center;
}
.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-sub, #61666d);
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.icon-btn svg {
  width: 18px;
  height: 18px;
}
.icon-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--text-main, #18191c);
  transform: translateY(-1px);
}
.icon-btn:active {
  transform: scale(0.92);
}
[data-theme='dark'] .icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e3e5e7;
}
.divider {
  width: 1.5px;
  height: 18px;
  background: var(--border-color, #e3e5e7);
  margin: 0 8px;
  border-radius: 1px;
}
.channel-tabs {
  display: flex;
  align-items: center;
}

/* 胶囊容器 */
.channel-pill {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 20px;
  padding: 2px;
  gap: 0;
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.04),
    0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
[data-theme='dark'] .channel-pill {
  background: rgba(40, 40, 45, 0.7);
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.2),
    0 2px 12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* 滑块背景 */
.channel-pill-bg {
  position: absolute;
  top: 2px;
  left: 2px;
  height: calc(100% - 4px);
  background: #fb7299;
  border-radius: 18px;
  transition:
    transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
  box-shadow: 0 2px 8px rgba(251, 114, 153, 0.35);
}

/* 导航项 */
.channel-item {
  position: relative;
  z-index: 1;
  background: transparent;
  border: none;
  font-size: 14px;
  color: #18191c;
  cursor: pointer;
  font-weight: 500;
  padding: 6px 16px;
  border-radius: 17px;
  transition: color 0.3s ease;
  white-space: nowrap;
}
.channel-item:hover {
  color: #000000;
}
[data-theme='dark'] .channel-item {
  color: #e3e5e7;
}
[data-theme='dark'] .channel-item:hover {
  color: #ffffff;
}
.channel-item.active {
  color: #ffffff;
  font-weight: 600;
}
.channel-item.active:hover {
  color: #ffffff;
}
.header-right {
  flex: 1;
  justify-content: flex-end;
}
.search-wrapper {
  position: relative;
}
.search-box {
  display: flex;
  align-items: center;
  width: 180px;
  height: 36px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 18px;
  padding: 0 14px;
  border: 1.5px solid transparent;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.search-box:focus-within {
  width: 260px;
  background: var(--card-bg, #ffffff);
  border-color: var(--primary-color, #00aeec);
  box-shadow: 0 4px 16px rgba(0, 174, 236, 0.15);
  transform: translateY(-1px);
}
.search-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  color: var(--text-sub, #9499a0);
  transition: color 0.3s ease;
}
.search-box:focus-within .search-icon {
  color: var(--primary-color, #00aeec);
}
.search-box input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13.5px;
  color: var(--text-main, #18191c);
}
.glass-dropdown {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}
[data-theme='dark'] .glass-dropdown {
  background: #2f3134;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}
.search-suggest-panel {
  position: absolute;
  top: 48px;
  left: 0;
  width: 100%;
  border-radius: 12px;
  padding: 8px 0;
  z-index: 1000;
  max-height: 400px;
  overflow-y: auto;
}
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* =========== 搜索历史及建议区域 =========== */
.search-history-panel {
  padding: 4px 16px 8px;
}
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.history-header span {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}
.clear-history-btn {
  background: none;
  border: none;
  font-size: 12px;
  color: var(--text-sub);
  cursor: pointer;
  transition: 0.2s;
  padding: 4px;
}
.clear-history-btn:hover {
  color: #f04c49;
}
.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.history-tag {
  background: rgba(0, 0, 0, 0.04);
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 6px;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s ease;
}
.history-tag:hover {
  background: rgba(0, 174, 236, 0.1);
  color: var(--primary-color, #00aeec);
  transform: translateY(-1px);
}
[data-theme='dark'] .history-tag {
  background: rgba(255, 255, 255, 0.08);
}
[data-theme='dark'] .history-tag:hover {
  background: rgba(0, 174, 236, 0.2);
}

.suggest-item {
  padding: 10px 16px;
  font-size: 13.5px;
  color: var(--text-main, #18191c);
  cursor: pointer;
  transition: background 0.2s;
}
.suggest-item:hover {
  background: rgba(0, 0, 0, 0.04);
}
:deep(.suggest-keyword em) {
  font-style: normal;
  color: var(--primary-color, #00aeec);
  font-weight: 700;
}
.account-switch-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  margin-right: 2px;
}
.current-account {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  border-radius: 24px;
  background: transparent;
  cursor: pointer;
  transition: background 0.25s ease;
}
.current-account:hover {
  background: rgba(0, 0, 0, 0.05);
}
.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}
.user-avatar-placeholder {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.user-acc-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main, #18191c);
  max-width: 65px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vip-badge {
  background: #fb7299;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: bold;
}
.account-dropdown {
  position: absolute;
  top: 48px;
  right: 0;
  width: 180px;
  border-radius: 12px;
  padding: 8px 0;
  z-index: 2000;
}
.dropdown-spring-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dropdown-spring-leave-active {
  transition: all 0.2s ease-in;
}
.dropdown-spring-enter-from,
.dropdown-spring-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(0.95);
}
.acc-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
}
.acc-dropdown-item:hover {
  background: rgba(0, 0, 0, 0.04);
}
.acc-dropdown-item.active {
  background: rgba(0, 174, 236, 0.08);
}
.acc-avatar-sm {
  width: 26px;
  height: 26px;
  border-radius: 50%;
}
.acc-name {
  margin-top: 2px;
  font-size: 13px;
  color: var(--text-main);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vip-badge-sm {
  background: #fb7299;
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 4px;
}
.header-actions-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.ios-progress-container {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  overflow: hidden;
}
.ios-progress-bar {
  height: 100%;
  width: 0%;
  background: var(--primary-color, #00aeec);
  box-shadow: 0 0 10px rgba(0, 174, 236, 0.8);
  transition:
    width 0s,
    opacity 0s;
  opacity: 0;
  pointer-events: none;
}
.ios-progress-bar.is-loading {
  opacity: 1;
  transition: width 3s cubic-bezier(0.1, 0.8, 0.2, 1);
  width: 85%;
}
.ios-progress-bar.is-done {
  opacity: 0;
  width: 100%;
  transition:
    width 0.3s ease-out,
    opacity 0.5s ease 0.2s;
}

/* =========== 下方侧栏与内容区 =========== */
.main-body-layout {
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #ffffff;
}
[data-theme='dark'] .main-body-layout {
  background: #18191c;
}

.bili-vertical-sidebar {
  flex-shrink: 0;
  width: 58px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
  padding-bottom: 24px;
  gap: 16px;
  z-index: 90;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 左侧胶囊容器 */
.sidebar-pill {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 20px;
  padding: 2px;
  gap: 0;
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.04),
    0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  width: 36px;
}
[data-theme='dark'] .sidebar-pill {
  background: rgba(40, 40, 45, 0.7);
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.2),
    0 2px 12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* 左侧滑块背景 */
.sidebar-pill-bg {
  position: absolute;
  top: 2px;
  left: 2px;
  width: calc(100% - 4px);
  background: #fb7299;
  border-radius: 18px;
  transition:
    transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
  box-shadow: 0 2px 8px rgba(251, 114, 153, 0.35);
}

.v-tab-item {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  line-height: 1.1;
  background: transparent;
  border: none;
  font-size: 14px;
  color: #18191c;
  cursor: pointer;
  font-weight: 500;
  padding: 8px 0;
  width: 32px;
  border-radius: 16px;
  transition: color 0.3s ease;
}
.v-tab-item span {
  display: block;
}
.v-tab-item:hover {
  color: #000000;
}
[data-theme='dark'] .v-tab-item {
  color: #e3e5e7;
}
[data-theme='dark'] .v-tab-item:hover {
  color: #ffffff;
}
.v-tab-item.active {
  color: #ffffff;
  font-weight: 700;
}
.v-tab-item.active:hover {
  color: #ffffff;
}

.v-video-tools {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  margin-top: auto;
}

/* 视频专属控制颜色 */
.c-gold {
  color: #e6a23c;
}
.c-gold:hover {
  color: #f0c040;
}
.c-teal {
  color: #20b2aa;
}
.c-teal:hover {
  color: #48d1cc;
}
.c-blue {
  color: #409eff;
}
.c-blue:hover {
  color: #66b1ff;
}
.c-purple {
  color: #8a58d6;
}
.c-purple:hover {
  color: #a67cf0;
}
.side-op-gray {
  color: var(--text-sub);
}
.side-zen-active {
  color: #18191c !important;
  font-weight: bold;
}
[data-theme='dark'] .side-zen-active {
  color: white !important;
}
.side-divider {
  width: 24px;
  height: 1.5px;
  background: var(--border-color);
  margin: 6px 0;
  border-radius: 2px;
}

/* 实验室侧边按钮专属 */
.lab-sidebar-btn {
  color: #8a58d6;
  opacity: 0.7;
}
.lab-sidebar-btn:hover {
  opacity: 1;
  color: #8a58d6;
  transform: translateY(-2px) scale(1.05);
}
[data-theme='dark'] .lab-sidebar-btn {
  color: #b185f2;
}

/* 🌟 WebView 战区 */
.webview-container {
  flex: 1;
  position: relative;
  border-top-left-radius: 12px;
  overflow: hidden;
  background: transparent;
}
.webview-underlayer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  z-index: 30;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}
.webview-underlayer.dark-underlayer {
  background-color: rgba(24, 25, 28, 0.5);
}
.webview-underlayer.is-active {
  opacity: 1;
  pointer-events: auto;
  transition: opacity 0.2s cubic-bezier(0.1, 0.8, 0.2, 1);
}

.glass-loader-box {
  width: 68px;
  height: 68px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.65);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.08),
    inset 0 0 0 1px rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: float-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
[data-theme='dark'] .glass-loader-box {
  background: rgba(40, 42, 45, 0.65);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.3),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}
@keyframes float-up {
  0% {
    transform: translateY(10px) scale(0.95);
    opacity: 0;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.twin-bubbles {
  width: 26px;
  height: 26px;
  position: relative;
  animation: spin-bubbles 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
.b-blue,
.b-pink {
  position: absolute;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  animation: pulse-bubbles 2s ease-in-out infinite;
}
.b-blue {
  background: var(--primary-color, #00aeec);
  top: 0;
  left: 0;
}
.b-pink {
  background: #fb7299;
  bottom: 0;
  right: 0;
  animation-delay: -1s;
}
@keyframes spin-bubbles {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
@keyframes pulse-bubbles {
  0%,
  100% {
    transform: scale(0.75);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.25);
    opacity: 1;
    filter: drop-shadow(0 0 4px currentColor);
  }
}

.bili-webview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 20;
  background: transparent;
}
.bili-webview.hidden-layer {
  opacity: 0;
  pointer-events: none;
  z-index: -1;
  visibility: hidden;
}

/* 🛸 物理引擎接管版：悬浮灵动岛 (完全解绑相对坐标) */
.draggable-island {
  position: fixed; /* 从absolute彻底解绑，实现全视角物理浮动 */
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 9999;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  padding: 8px 16px;
  border-radius: 30px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.4);
  cursor: grab; /* 拖拽光标 */
  user-select: none;
}
.draggable-island:active {
  cursor: grabbing;
}
[data-theme='dark'] .draggable-island {
  background: rgba(24, 25, 28, 0.6);
  border-color: rgba(255, 255, 255, 0.05);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

/* 按钮精细化，脱离拖放绑定 */
.fab-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  box-shadow: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-main, #61666d);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
}
.fab-btn svg {
  width: 18px;
  height: 18px;
}
.pop-bounce:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--primary-color, #00aeec);
  transform: translateY(-2px) scale(1.1);
}
.pop-bounce:active {
  transform: translateY(0) scale(0.9);
}
[data-theme='dark'] .fab-btn {
  background: transparent;
  box-shadow: none;
  color: #e3e5e7;
}
[data-theme='dark'] .pop-bounce:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--primary-color);
}

/* 公共弹窗样式 */
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
  background: var(--card-bg, #ffffff);
  width: 420px;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color, #e3e5e7);
  -webkit-app-region: no-drag;
}
.modal-header {
  padding: 20px 24px 10px;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid var(--border-color, #e3e5e7);
}
.modal-header h3 {
  margin: 0;
}
.modal-body {
  padding: 20px 24px 24px;
}
.modal-desc {
  font-size: 13px;
  color: var(--text-sub, #61666d);
  margin: 0 0 16px;
  line-height: 1.5;
}

/* 下载拉取列表样式 */
.download-acc-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 240px;
  overflow-y: auto;
  padding-right: 4px;
}
.dl-acc-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-color, #f6f7f8);
  border-radius: 12px;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.hover-scale:hover {
  transform: scale(1.02);
}
.dl-acc-item:hover {
  border-color: var(--primary-color, #00aeec);
  background: rgba(0, 174, 236, 0.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.dl-item-vip:hover {
  border-color: #fb7299;
  background: rgba(251, 114, 153, 0.05);
}
.dl-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
.dl-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dl-name {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-main, #18191c);
}
.dl-stat {
  font-size: 12px;
  color: var(--text-sub, #61666d);
}
.text-vip {
  color: #fb7299 !important;
  font-weight: bold;
}
.text-primary {
  color: var(--primary-color, #00aeec) !important;
  font-weight: bold;
}
.btn-text {
  background: transparent;
  border: none;
  font-size: 13px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  transition: 0.2s;
}
.btn-text:hover {
  background: rgba(0, 0, 0, 0.05);
}

/* ==========================================
   🧪 极客实验室控制台样式
========================================== */
.labs-box {
  width: 480px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.labs-box .modal-body {
  overflow-y: auto;
  flex: 1;
}
.labs-box .modal-body::-webkit-scrollbar {
  width: 6px;
}
.labs-box .modal-body::-webkit-scrollbar-track {
  background: transparent;
}
.labs-box .modal-body::-webkit-scrollbar-thumb {
  background: rgba(148, 153, 160, 0.3);
  border-radius: 10px;
}
.labs-box .modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 153, 160, 0.6);
}
[data-theme='dark'] .labs-box .modal-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}
[data-theme='dark'] .labs-box .modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
}
.lab-section {
  margin-bottom: 20px;
}
.lab-section.disabled-section {
  opacity: 0.4;
  pointer-events: none;
  filter: grayscale(1);
}
.lab-section h4 {
  margin: 0 0 8px;
  font-size: 15px;
  color: var(--text-main, #18191c);
}
.section-desc {
  font-size: 12px;
  color: var(--text-sub, #9499a0);
  margin-bottom: 12px;
}
.block-input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.block-input-group input {
  flex: 1;
  border: 1px solid var(--border-color, #e3e5e7);
  background: rgba(0, 0, 0, 0.03);
  padding: 8px 12px;
  border-radius: 8px;
  outline: none;
  color: var(--text-main);
  transition: 0.3s;
}
.block-input-group input:focus {
  border-color: #8a58d6;
  background: transparent;
  box-shadow: 0 0 0 2px rgba(138, 88, 214, 0.1);
}
.btn-primary {
  background: #8a58d6;
  color: white;
  border: none;
  padding: 0 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: 0.2s;
}
.btn-primary:active {
  transform: scale(0.95);
}
.full-width {
  width: 100%;
  height: 40px;
}
.keyword-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.kw-tag {
  background: rgba(240, 76, 73, 0.1);
  color: #f04c49;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.kw-tag b {
  cursor: pointer;
  font-size: 14px;
  opacity: 0.6;
}
.kw-tag b:hover {
  opacity: 1;
}
.empty-hint {
  font-size: 12px;
  color: var(--text-sub);
}
.lab-divider {
  width: 100%;
  height: 1px;
  background: var(--border-color, #e3e5e7);
  margin: 20px 0;
}
.speed-controls {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.speed-btn {
  background: rgba(0, 0, 0, 0.05);
  border: none;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-main);
  font-weight: bold;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.speed-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}
.speed-btn.active-speed {
  background: #8a58d6 !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(138, 88, 214, 0.3);
  transform: scale(1.05);
}
.danger-btn {
  background: rgba(240, 76, 73, 0.1);
  color: #f04c49;
}
.danger-btn:hover {
  background: #f04c49;
  color: white;
}

[data-theme='dark'] .speed-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #e3e5e7;
}
[data-theme='dark'] .speed-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}
[data-theme='dark'] .speed-btn.active-speed {
  background: #b185f2 !important;
  color: #18191c !important;
}

/* =========== 暗流底层接管适配区 =========== */
[data-theme='dark'] .search-box {
  background: rgba(255, 255, 255, 0.05);
}
[data-theme='dark'] .search-box:focus-within {
  background: #18191c;
}
[data-theme='dark'] .suggest-item:hover,
[data-theme='dark'] .current-account:hover,
[data-theme='dark'] .acc-dropdown-item:hover {
  background: rgba(255, 255, 255, 0.05);
}
[data-theme='dark'] .dl-acc-item {
  background: #18191c;
  border-color: #3f4144;
}
[data-theme='dark'] .btn-text:hover {
  background: rgba(255, 255, 255, 0.1);
}
[data-theme='dark'] .block-input-group input {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.clip-timeline-container {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 100;
}

.clip-timeline-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #e3e5e7;
  margin-bottom: 6px;
}

.clip-timeline {
  position: relative;
  height: 24px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
}

.clip-marker {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 24px;
  background: #00aeec;
  border-radius: 4px;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
}

.clip-marker:hover {
  width: 16px;
  background: #1dc4ba;
}

.clip-marker.auto-clip {
  background: rgba(138, 88, 214, 0.5);
  width: 4px;
}

.clip-tooltip {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  background: #18191c;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: #e3e5e7;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-width: 180px;
}

.clip-marker:hover .clip-tooltip {
  opacity: 1;
}
/* =========== 悬浮玻璃时间轴 =========== */
.clips-timeline-panel {
  position: absolute;
  bottom: 86px; /* 故意悬浮高一点，躲过B站原版自带的播放进度条 */
  left: 50%;
  transform: translateX(-50%);
  width: clamp(400px, 60%, 800px);
  height: 48px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 16px;
  z-index: 9999;
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.12);
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.timeline-track-wrapper {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
}
.timeline-track {
  position: relative;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.1);
}
[data-theme='dark'] .timeline-track {
  background: rgba(255, 255, 255, 0.15);
}
.timeline-marker {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  transform: translate(-50%, -50%);
  cursor: grab;
  display: flex;
  justify-content: center;
  z-index: 2;
}
.timeline-marker:active {
  cursor: grabbing;
}
.marker-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fb7299;
  border: 2px solid white;
  box-shadow: 0 0 8px rgba(251, 114, 153, 0.6);
  transition: transform 0.2s cubic-bezier(0.3, 1.5, 0.6, 1);
}
[data-theme='dark'] .marker-thumb {
  border: 2px solid #2f3134;
}
.timeline-marker:hover .marker-thumb,
.marker-active .marker-thumb {
  transform: scale(1.4);
}

/* 弹出菜单面板 */
.marker-popover {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%) scale(0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  width: max-content;
  background: var(--card-bg, #ffffff);
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  opacity: 0;
  pointer-events: none;
  transition: 0.2s cubic-bezier(0.3, 1.5, 0.6, 1);
  border: 1px solid rgba(0, 0, 0, 0.05);
}
[data-theme='dark'] .marker-popover {
  background: #2f3134;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.timeline-marker:hover .marker-popover {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(-50%) scale(1);
}

.popover-time {
  font-size: 15px;
  font-weight: 800;
  color: #00aeec;
  font-family: monospace;
}
.popover-title {
  font-size: 12px;
  color: var(--text-sub);
  border-bottom: 1.5px dashed var(--border-color);
  padding-bottom: 8px;
  margin: 4px 0 8px;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.popover-btn-del {
  border: none;
  background: #fff0f0;
  color: #f04c49;
  font-size: 11px;
  font-weight: bold;
  padding: 6px 14px;
  border-radius: 12px;
  cursor: pointer;
  transition: 0.2s;
}
[data-theme='dark'] .popover-btn-del {
  background: rgba(240, 76, 73, 0.15);
}
.popover-btn-del:hover {
  background: #f04c49;
  color: white;
  transform: translateY(-1px);
}

.tl-title {
  font-size: 12px;
  font-weight: bold;
  color: #fb7299;
  white-space: nowrap;
  margin-right: 4px;
}
.timeline-meta-right span {
  font-size: 11px;
  font-weight: bold;
  color: var(--text-sub);
  font-family: monospace;
}

.timeline-slide-enter-active,
.timeline-slide-leave-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.timeline-slide-enter-from,
.timeline-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px) scale(0.9);
}
/* ✅ 魔法修复：为弹出框增加一个透明的底部延伸桥梁，鼠标经过空气时判定依然留在菜单上！ */
.marker-popover::after {
  content: '';
  position: absolute;
  top: 100%; /* 位于悬浮框下方 */
  left: -20%; /* 稍加展宽，防止鼠标手滑走偏 */
  width: 140%;
  height: 30px; /* 高度必须足够连接到下方的发光圆点 */
}

/* 一键折叠状态的美化：让面板缩成一个酷炫的小胶囊 */
.clips-timeline-panel.is-collapsed {
  width: auto !important; /* 解除原本写死的巨大宽度 */
  min-width: 110px;
  justify-content: center;
  padding: 0 16px;
  cursor: grab !important;
}

/* 按钮悬停动画 */
.tl-toggle-btn {
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 12px;
  transition: all 0.2s ease;
}
.tl-toggle-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  transform: scale(1.05);
}
[data-theme='dark'] .tl-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
/* =========== 顶栏右侧专属工具区 =========== */
/* =========== 顶栏专属工具区 =========== */
.header-right-tools {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-right: 24px; /* 和右侧搜索框保持优雅距离 */
}

/* 顶部胶囊按钮基础通用样式 */
.header-tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 16px;
  border-radius: 16px; /* 圆润的胶囊 */
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); /* Q弹特效 */
}

.header-tool-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.header-tool-btn span {
  font-size: 13px !important;
}

/* 紫色标记按钮专属配色 */
.purple-btn {
  background: rgba(162, 82, 255, 0.08); /* 极低透明度的紫底 */
  color: #a252ff;
}
.purple-btn:hover {
  background: rgba(162, 82, 255, 0.15);
}

/* ================================================== */
/* 清单按钮 - 智能跟随明暗模式 (采用B站原生色值) */
/* ================================================== */

/* 1. 默认明亮模式：深灰文字，极淡的灰底 */
.dynamic-btn {
  background: rgba(0, 0, 0, 0.04);
  color: #18191c; /* B站标准深灰 */
}
.dynamic-btn:hover {
  background: rgba(0, 0, 0, 0.08); /* 悬停时稍微加深 */
}

/* 2. 全局暗黑模式：浅灰文字，半透明白底 */
[data-theme='dark'] .dynamic-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #e3e5e7; /* B站暗黑标准白 */
}
[data-theme='dark'] .dynamic-btn:hover {
  background: rgba(255, 255, 255, 0.15); /* 悬停发亮 */
}
</style>
