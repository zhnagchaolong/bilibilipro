<script setup lang="ts">
import { useDashboardView } from '../composables/dashboard/useDashboardView'
const {
  activeTab,
  searchKeyword,
  isSearching,
  toastMsg,
  accountsList,
  selectedAccount,
  mainChartRef,
  upDeepStats,
  videoDeepStats,
  videoCompareStats,
  trendsStats,
  stats,
  clearCurrentAnalysis,
  formatNum,
  formatMsTime,
  formatHours,
  calcHealthRatio,
  calcTripleGrade,
  switchTab,
  switchAccount,
  handleSearch
} = useDashboardView()
</script>
<template>
  <div class="dashboard-view">
    <div class="page-header">
      <h2>📊 综合数据看板与行为报告</h2>
      <p class="subtitle">深度且直观的个人资产、视频数据转换分析及观看行为呈现。</p>
    </div>

    <!-- 🌟 顶部分段控制器 -->
    <div class="top-control-belt">
      <div class="segment-control">
        <button :class="{ active: activeTab === 'personal' }" @click="switchTab('personal')">
          资产总览
        </button>
        <button :class="{ active: activeTab === 'up' }" @click="switchTab('up')">UP主洞察</button>
        <button :class="{ active: activeTab === 'video' }" @click="switchTab('video')">
          视频数据透视
        </button>
        <button :class="{ active: activeTab === 'activity' }" @click="switchTab('activity')">
          足迹与偏好
        </button>
        <button
          :class="{ active: activeTab === 'video-compare' }"
          @click="switchTab('video-compare')"
        >
          视频对比
        </button>
        <button :class="{ active: activeTab === 'trends' }" @click="switchTab('trends')">
          🔥 趋势发现
        </button>
      </div>

      <transition name="fade-slide" mode="out-in">
        <div v-if="activeTab === 'personal' || activeTab === 'activity'" class="account-matrix">
          <span class="matrix-label">当前查询账号：</span>
          <div class="matrix-list">
            <div
              v-for="acc in accountsList"
              :key="acc.partition"
              :class="['acc-chip', { active: selectedAccount === acc.partition }]"
              @click="switchAccount(acc.partition)"
            >
              <img :src="acc.face" alt="face" referrerpolicy="no-referrer" />
              <span>{{ acc.name }}</span>
            </div>
            <div v-if="accountsList.length === 0" class="empty-hint">
              未检测到登录状态，请前往管理界面添加账号。
            </div>
          </div>
        </div>
        <div v-else-if="activeTab === 'trends'" class="account-matrix">
          <span class="matrix-label">🔥 实时发现B站热门趋势与高质量内容</span>
        </div>
        <div v-else class="search-cabin">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchKeyword"
            :placeholder="
              activeTab === 'up'
                ? '搜索UP主：请输入对方主页的末尾纯数字 UID'
                : activeTab === 'video-compare'
                  ? '对比视频：输入多个BV号，用逗号分隔'
                  : '查询视频：请输入 BV 号 (例: BV1xx123456)'
            "
            class="dash-search-input"
            @keyup.enter="handleSearch"
          />

          <!-- ✅ 清除按钮 -->
          <button
            v-if="activeTab === 'up' || activeTab === 'video' || activeTab === 'video-compare'"
            class="btn-clear mini"
            @click="clearCurrentAnalysis"
          >
            清除分析
          </button>
          <button class="btn-primary mini" @click="handleSearch">执行查询</button>
        </div>
      </transition>
    </div>

    <div v-if="isSearching" class="loading-state">
      <div class="spinner-icon"></div>
      <p>正在获取公开领域数据，请稍候...</p>
    </div>

    <transition name="pop-up">
      <div v-show="!isSearching" class="dashboard-content">
        <!-- 🎉 1. 足迹报告 -->
        <template v-if="activeTab === 'activity'">
          <div class="activity-top-grid">
            <div class="ac-tag-board stat-card shadow-plus">
              <h3>
                🧠 用户行为分析画像（样本数：历史最近 {{ stats.activity.historyCount }} 条播放）
              </h3>
              <div class="tag-flow mt-xs">
                <span v-for="t in stats.activity.tags" :key="t" class="profile-chip primary-mix">{{
                  t
                }}</span>
                <span v-if="stats.activity.tags.length === 0" class="profile-chip g-border"
                  >暂无近期画像数据</span
                >
              </div>
              <div class="hrs-block mt-s">
                <div class="hb-cell text-warn">
                  <span class="subtit">由于近期在 Bilibili 的驻留操作，估计耗时：</span>
                  <strong class="hbs-max"
                    >{{ formatHours(stats.activity.timeConsumedSec) }}
                    <sub>累计耗时(小时)</sub></strong
                  >
                </div>
              </div>
            </div>

            <div class="ac-up-board stat-card shadow-plus p-r-side">
              <h3 class="side-hb title">❤️ 近期同频互动的 UP 主排行榜</h3>
              <div class="up-listbox mt-s">
                <div v-for="(up, i) in stats.activity.topUps" :key="i" class="usx-ite">
                  <span class="ux-rank" :class="'rk-' + i">{{ i + 1 }}</span>
                  <span class="ux-nm">{{ up.name }}</span>
                  <span class="ux-pnt">累计接触与互动 {{ up.value }} 次</span>
                </div>
                <div v-if="stats.activity.topUps.length === 0" class="usx-none">
                  未能筛选出具有明显偏好的榜单
                </div>
              </div>
            </div>
          </div>
        </template>

        <div v-if="activeTab !== 'activity'" class="stats-master-grid" :class="activeTab">
          <!-- 🎉 2. 个人资产总览 -->
          <template v-if="activeTab === 'personal'">
            <div class="stat-card prime-card area-span-full">
              <div class="prime-level-box">
                <span class="lv-text" :class="{ 'vip-glory': stats.personal.isVip }"
                  >Lv.{{ stats.personal.level }}
                  <i v-if="stats.personal.isVip" class="vip-icon">大会员</i></span
                >
                <div class="prime-grow">
                  <div class="tag-row">
                    <span>当前等级经验进度：{{ stats.personal.expPercent }}%</span
                    ><span>近期活跃与综合健康度：</span>
                  </div>
                  <div class="prog-bar">
                    <div
                      class="prog-fill prime"
                      :style="`width: ${stats.personal.expPercent}%`"
                    ></div>
                  </div>
                  <div class="prog-bar mt">
                    <div
                      class="prog-fill health"
                      :style="`width: ${calcHealthRatio(stats.personal.fans, stats.personal.likes, stats.personal.archiveViews)}%`"
                    ></div>
                  </div>
                </div>
                <div class="health-eval score">
                  综合健康与活跃度
                  <strong
                    :style="`color:${calcHealthRatio(stats.personal.fans, stats.personal.likes, stats.personal.archiveViews) > 50 ? '#52c41a' : '#ea7208'}`"
                    >{{
                      calcHealthRatio(
                        stats.personal.fans,
                        stats.personal.likes,
                        stats.personal.archiveViews,
                        stats.personal.level
                      )
                    }}
                    分</strong
                  >
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="emoji">📖</div>
              <div class="info">
                <div class="label">专栏与视频投稿总播放数</div>
                <div class="value b-color">
                  {{ formatNum(stats.personal.archiveViews + stats.personal.articleViews) }}
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="emoji">🪙</div>
              <div class="info">
                <div class="label">账户内虚拟资产一览</div>
                <div class="value">
                  硬币: {{ formatNum(stats.personal.coins) }}
                  <span class="light-sec">| B币: {{ formatNum(stats.personal.bcoins) }}</span>
                </div>
              </div>
            </div>
            <div class="stat-card">
              <div class="emoji">🔥</div>
              <div class="info">
                <div class="label">累计获赞总数</div>
                <div class="value pop">{{ formatNum(stats.personal.likes) }} 赞</div>
              </div>
            </div>
            <div class="stat-card bg-hint">
              <div class="emoji">📈</div>
              <div class="info">
                <div class="label">当前吸引与积累的粉丝数</div>
                <div class="value">{{ formatNum(stats.personal.fans) }} 人关注</div>
              </div>
            </div>
          </template>

          <!-- 🎉 3. UP主详情透视 -->
          <template v-if="activeTab === 'up'">
            <div class="stat-card avatar-hero-card area-span-full">
              <div class="avatar-col relative wrap" :class="{ 'live-now': stats.up.isLive }">
                <img v-if="stats.up.face" :src="stats.up.face" referrerpolicy="no-referrer" />
                <span v-if="stats.up.isLive" class="live-tag">当前直播中 LIVE</span>
              </div>
              <div class="info-col">
                <div class="name-zone">
                  <h3 class="up-name">{{ stats.up.name }}</h3>
                  <span v-if="stats.up.isVip" class="b-badge vip">大会员</span>
                  <span v-if="stats.up.verifyType === 0" class="b-badge auth"
                    >个人知名UP主认证</span
                  >
                  <span v-if="stats.up.verifyType === 1" class="b-badge auth-blue"
                    >企业/机构官方认证</span
                  >
                  <span v-if="stats.up.verifyDesc" class="auth-desc">{{
                    stats.up.verifyDesc
                  }}</span>
                </div>
                <p class="up-sign">“{{ stats.up.sign || '这个人很懒，什么签名都没写~' }}”</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="emoji">👥</div>
              <div class="info">
                <div class="label">当前累计总粉丝量</div>
                <div class="value">{{ formatNum(stats.up.fans) }}</div>
              </div>
            </div>
            <div class="stat-card bg-hint">
              <div class="emoji">💖</div>
              <div class="info">
                <div class="label">最近{{ stats.up.latestVideoCount || 50 }}个视频获赞总数</div>
                <div class="value p-color">{{ formatNum(stats.up.likes) }}</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="emoji">📦</div>
              <div class="info">
                <div class="label">视频平均点赞</div>
                <div class="value">
                  {{
                    stats.up.latestVideoCount ? (stats.up.likes / stats.up.latestVideoCount).toFixed(1) : 0
                  }}
                  赞/视频
                </div>
              </div>
            </div>
          </template>

          <!-- 🎉 4. 视频数据详情 -->
          <template v-if="activeTab === 'video'">
            <div class="stat-card video-card-row area-span-full shadow-plus">
              <div class="vid-cover-wrap">
                <img v-if="stats.video.cover" :src="stats.video.cover" class="vid-img" />
                <div class="vid-time">
                  {{ stats.video.duration ? formatMsTime(stats.video.duration) : '--:--' }}
                </div>
              </div>
              <div class="vid-data-wrap">
                <h3>{{ stats.video.title }}</h3>
                <div class="v-mark-list">
                  <span class="mark primary">视频创作者: @{{ stats.video.ownerName }}</span>
                  <span v-if="stats.video.highestRank > 0" class="mark alert"
                    >🏆 曾荣获全站综合排行榜最高 第 {{ stats.video.highestRank }} 名</span
                  >
                </div>
                <div class="triple-evaluate-banner">
                  <div class="te-title">视频“一键三连”综合转化率评级雷达：</div>
                  <div class="te-bar-box">
                    <div class="te-val">
                      {{
                        calcTripleGrade(
                          stats.video.likes,
                          stats.video.coinMax,
                          stats.video.favorite,
                          stats.video.views
                        ).percent
                      }}
                      <span style="font-size: 12px">% (由播放转化成三连行动的概率比)</span>
                    </div>
                    <div
                      class="te-badge"
                      :style="`background-color: ${calcTripleGrade(stats.video.likes, stats.video.coinMax, stats.video.favorite, stats.video.views).color}`"
                    >
                      评级：{{
                        calcTripleGrade(
                          stats.video.likes,
                          stats.video.coinMax,
                          stats.video.favorite,
                          stats.video.views
                        ).grade
                      }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="stat-card bg-hint">
              <div class="emoji">▶️</div>
              <div class="info">
                <div class="label">该视频已在全网累计播放总数</div>
                <div class="value primary-col">{{ formatNum(stats.video.views) }} 次观看</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="emoji">💬</div>
              <div class="info">
                <div class="label">该视频当前弹幕互动热流量</div>
                <div class="value">共计 {{ formatNum(stats.video.danmaku) }} 条弹幕</div>
              </div>
            </div>

            <div class="stat-card split-triple-sect area-span-full mt-s mb-xs pb-xs pt-xs">
              <div class="t-item">
                <div class="emoji mini">👍</div>
                <div class="t-txt">{{ formatNum(stats.video.likes) }} 人点赞</div>
              </div>
              <div class="t-item border">
                <div class="emoji mini">🪙</div>
                <div class="t-txt blue">{{ formatNum(stats.video.coinMax) }} 币打赏</div>
              </div>
              <div class="t-item border">
                <div class="emoji mini">⭐</div>
                <div class="t-txt orng">{{ formatNum(stats.video.favorite) }} 次收藏</div>
              </div>
            </div>
          </template>
        </div>

        <div
          class="chart-container bottom-zone"
          :class="{ 'ac-pad-adjust': activeTab === 'activity' }"
        >
          <div class="chart-header">
            <h3>
              {{
                activeTab === 'activity'
                  ? '🧠 活跃浏览记录分区占比图例'
                  : activeTab === 'video-compare'
                    ? '🆚 视频对比分析'
                    : activeTab === 'trends'
                      ? '🔥 B站热门趋势分析'
                      : activeTab === 'up' && upDeepStats
                        ? '📈 UP主近期视频播放量趋势'
                        : activeTab === 'video' && videoDeepStats
                          ? '📊 视频综合评分雷达'
                          : '📈 近期各项内容的核心数据波动趋势折线情况'
              }}
            </h3>
            <span class="elegant-badge">{{
              activeTab === 'activity'
                ? '雷达组建完毕'
                : activeTab === 'video-compare'
                  ? '对比模式'
                  : activeTab === 'trends'
                    ? '实时趋势'
                    : '走势分析绘制完成'
            }}</span>
          </div>
          <div
            ref="mainChartRef"
            class="echarts-box"
            :style="activeTab === 'activity' ? 'margin-top: -15px' : ''"
          ></div>
        </div>

        <!-- ==========================
             🌟 UP主完整分析展示
             ========================== -->
        <template v-if="activeTab === 'up' && upDeepStats">
          <div class="deep-analysis-section">
            <h3 class="section-title">📊 UP主完整分析报告</h3>

            <!-- UP主基本信息卡片 -->
            <div class="analysis-block up-info-card">
              <div class="up-header">
                <img
                  v-if="upDeepStats.face"
                  :src="upDeepStats.face"
                  class="up-avatar"
                  referrerpolicy="no-referrer"
                />
                <div class="up-meta">
                  <div class="up-name">{{ upDeepStats.name }}</div>
                  <div v-if="upDeepStats.sign" class="up-sign">{{ upDeepStats.sign }}</div>
                  <div class="up-stats">
                    <span class="up-stat-item">👥 {{ formatNum(upDeepStats.fans) }} 粉丝</span>
                    <span class="up-stat-item"
                      >👍 {{ formatNum(upDeepStats.totalLikes) }} 获赞</span
                    >
                    <span class="up-stat-item">🎬 {{ upDeepStats.videoCount }} 视频</span>
                  </div>
                  <div class="up-hint">📊 以下分析基于最近 {{ upDeepStats.videoCount }} 个投稿视频</div>
                </div>
              </div>
            </div>

            <!-- 🤖 AI智能分析 -->
            <div v-if="upDeepStats.aiAnalysis" class="analysis-block ai-analysis-block">
              <h4>🤖 AI智能洞察</h4>
              <div class="ai-summary">
                <div class="summary-text">{{ upDeepStats.aiAnalysis.summary }}</div>
              </div>
              <div class="ai-content">
                <div class="ai-section">
                  <div class="ai-title">💪 核心优势</div>
                  <ul class="ai-list">
                    <li v-for="(item, idx) in upDeepStats.aiAnalysis.strengths" :key="idx">
                      {{ item }}
                    </li>
                  </ul>
                </div>
                <div class="ai-section">
                  <div class="ai-title">💡 改进建议</div>
                  <ul class="ai-list">
                    <li v-for="(item, idx) in upDeepStats.aiAnalysis.suggestions" :key="idx">
                      {{ item }}
                    </li>
                  </ul>
                </div>
              </div>
              <div class="ai-strategy">
                <span class="label">📋 内容策略：</span>
                <span class="value">{{ upDeepStats.aiAnalysis.contentStrategy }}</span>
              </div>
            </div>

            <!-- 更新规律与状态 -->
            <div v-if="upDeepStats.updatePattern" class="stats-master-grid">
              <div class="stat-card bg-hint">
                <div class="emoji">📅</div>
                <div class="info">
                  <div class="label">平均更新间隔</div>
                  <div class="value">{{ upDeepStats.updatePattern?.avgInterval }} 天</div>
                </div>
              </div>
              <div
                class="stat-card"
                :class="{ 'alert-card': upDeepStats.updatePattern?.status !== '正常更新' }"
              >
                <div class="emoji">⏰</div>
                <div class="info">
                  <div class="label">更新状态</div>
                  <div
                    class="value"
                    :class="{ 'text-warn': upDeepStats.updatePattern?.status !== '正常更新' }"
                  >
                    {{ upDeepStats.updatePattern?.status }}
                  </div>
                  <div class="sub">
                    已停更 {{ upDeepStats.updatePattern?.daysSinceLastUpdate }} 天
                  </div>
                </div>
              </div>
              <div class="stat-card">
                <div class="emoji">📝</div>
                <div class="info">
                  <div class="label">更新频率</div>
                  <div class="value">{{ upDeepStats.updatePattern?.isRegular }}</div>
                </div>
              </div>
              <div class="stat-card">
                <div class="emoji">🕐</div>
                <div class="info">
                  <div class="label">偏好发布时间</div>
                  <div class="value">{{ upDeepStats.publishPreference?.peakHourFormatted }}</div>
                </div>
              </div>
            </div>

            <!-- 平均数据表现 -->
            <div v-if="upDeepStats.averages" class="analysis-block">
              <h4>📈 平均数据表现 <span class="section-hint">(最近 {{ upDeepStats.videoCount }} 个视频)</span></h4>
              <div class="stats-master-grid">
                <div class="stat-card">
                  <div class="emoji">▶️</div>
                  <div class="info">
                    <div class="label">平均播放量</div>
                    <div class="value">{{ formatNum(upDeepStats.averages?.views) }}</div>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="emoji">👍</div>
                  <div class="info">
                    <div class="label">平均点赞</div>
                    <div class="value">{{ formatNum(upDeepStats.averages?.likes) }}</div>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="emoji">🪙</div>
                  <div class="info">
                    <div class="label">平均投币</div>
                    <div class="value">{{ formatNum(upDeepStats.averages?.coins) }}</div>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="emoji">📊</div>
                  <div class="info">
                    <div class="label">综合互动率</div>
                    <div class="value">{{ upDeepStats.averages?.engagementRate }}%</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 爆款视频 -->
            <div v-if="upDeepStats.hotVideos?.length > 0" class="analysis-block">
              <h4>🔥 爆款视频 (共 {{ upDeepStats.hotVideoCount }} 个)</h4>
              <div class="hot-videos-grid">
                <div
                  v-for="video in upDeepStats.hotVideos"
                  :key="video.bvid"
                  class="hot-video-card"
                >
                  <img :src="video.pic" referrerpolicy="no-referrer" />
                  <div class="hot-video-info">
                    <div class="title" :title="video.title">{{ video.title }}</div>
                    <div class="views">▶️ {{ formatNum(video.view) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 分区分布 -->
            <div v-if="upDeepStats.partitions?.length > 0" class="analysis-block">
              <h4>📂 投稿分区分布</h4>
              <div class="partition-tags">
                <span v-for="p in upDeepStats.partitions" :key="p.name" class="partition-tag">
                  {{ p.name }}: {{ p.count }} ({{ p.percent }}%)
                </span>
              </div>
            </div>

            <!-- 系列视频 -->
            <div v-if="upDeepStats.series?.length > 0" class="analysis-block">
              <h4>🔗 识别到的系列视频</h4>
              <div class="series-list">
                <div v-for="s in upDeepStats.series" :key="s.name" class="series-item">
                  <div class="series-name">{{ s.name }}</div>
                  <div class="series-count">{{ s.count }} 个视频</div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- ==========================
             🌟 视频深度分析展示
             ========================== -->
        <template v-if="activeTab === 'video' && videoDeepStats">
          <div class="deep-analysis-section">
            <h3 class="section-title">📹 视频深度分析报告</h3>

            <!-- 视频信息与创作者 -->
            <div class="analysis-block video-info-card">
              <div class="video-header">
                <img :src="videoDeepStats.cover" class="video-cover" referrerpolicy="no-referrer" />
                <div class="video-meta">
                  <div class="video-title">{{ videoDeepStats.title }}</div>
                  <div v-if="videoDeepStats.owner?.name" class="video-owner">
                    <span class="owner-label">UP主：</span>
                    <span class="owner-name">{{ videoDeepStats.owner.name }}</span>
                    <span v-if="videoDeepStats.owner.fans" class="owner-fans"
                      >({{ formatNum(videoDeepStats.owner.fans) }} 粉丝)</span
                    >
                  </div>
                  <div class="video-views">▶️ {{ formatNum(videoDeepStats.views) }} 播放</div>
                </div>
              </div>
            </div>

            <!-- 原始互动数据 -->
            <div class="analysis-block">
              <h4>📊 互动数据</h4>
              <div class="stats-master-grid">
                <div class="stat-card">
                  <div class="emoji">👍</div>
                  <div class="info">
                    <div class="label">点赞</div>
                    <div class="value">{{ formatNum(videoDeepStats.stats.like) }}</div>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="emoji">🪙</div>
                  <div class="info">
                    <div class="label">投币</div>
                    <div class="value">{{ formatNum(videoDeepStats.stats.coin) }}</div>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="emoji">⭐</div>
                  <div class="info">
                    <div class="label">收藏</div>
                    <div class="value">{{ formatNum(videoDeepStats.stats.favorite) }}</div>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="emoji">💬</div>
                  <div class="info">
                    <div class="label">弹幕</div>
                    <div class="value">{{ formatNum(videoDeepStats.stats.danmaku) }}</div>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="emoji">📝</div>
                  <div class="info">
                    <div class="label">评论</div>
                    <div class="value">{{ formatNum(videoDeepStats.stats.reply) }}</div>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="emoji">↗️</div>
                  <div class="info">
                    <div class="label">分享</div>
                    <div class="value">{{ formatNum(videoDeepStats.stats.share) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 综合评分 -->
            <div class="stats-master-grid">
              <div class="stat-card" :class="{ 'hot-card': videoDeepStats.scores.heat >= 80 }">
                <div class="emoji">🔥</div>
                <div class="info">
                  <div class="label">热度评分</div>
                  <div class="value big">{{ videoDeepStats.scores.heat }}</div>
                  <div class="sub heat-level">{{ videoDeepStats.scores.heatLevel }}</div>
                </div>
              </div>
              <div class="stat-card">
                <div class="emoji">🎯</div>
                <div class="info">
                  <div class="label">完播潜力</div>
                  <div class="value">{{ videoDeepStats.scores.completion }}分</div>
                  <div class="sub">{{ videoDeepStats.scores.completionPotential }}</div>
                </div>
              </div>
              <div class="stat-card">
                <div class="emoji">✨</div>
                <div class="info">
                  <div class="label">标题吸引力</div>
                  <div class="value">{{ videoDeepStats.scores.title }}分</div>
                  <div class="sub">{{ videoDeepStats.scores.titleFactors.join(' · ') }}</div>
                </div>
              </div>
              <div class="stat-card rating-card">
                <div class="emoji">🏆</div>
                <div class="info">
                  <div class="label">综合评级</div>
                  <div class="value rating" :class="'rating-' + videoDeepStats.overallRating">
                    {{ videoDeepStats.overallRating }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 🤖 AI智能分析 -->
            <div v-if="videoDeepStats.aiAnalysis" class="analysis-block ai-analysis-block">
              <h4>🤖 AI智能洞察</h4>
              <div class="ai-summary">
                <div class="summary-text">{{ videoDeepStats.aiAnalysis.summary }}</div>
              </div>
              <div class="ai-content">
                <div class="ai-section">
                  <div class="ai-title">✨ 亮点</div>
                  <ul class="ai-list">
                    <li v-for="(item, idx) in videoDeepStats.aiAnalysis.highlights" :key="idx">
                      {{ item }}
                    </li>
                  </ul>
                </div>
                <div class="ai-section">
                  <div class="ai-title">🔧 优化建议</div>
                  <ul class="ai-list">
                    <li v-for="(item, idx) in videoDeepStats.aiAnalysis.optimization" :key="idx">
                      {{ item }}
                    </li>
                  </ul>
                </div>
              </div>
              <div class="ai-strategy">
                <span class="label">🚀 潜力评估：</span>
                <span class="value">{{ videoDeepStats.aiAnalysis.potential }}</span>
              </div>
            </div>

            <!-- 数据比率 -->
            <div class="analysis-block">
              <h4>📊 互动数据比率 (每1000播放)</h4>
              <div class="stats-master-grid">
                <div class="stat-card">
                  <div class="emoji">👍</div>
                  <div class="info">
                    <div class="label">点赞率</div>
                    <div class="value">{{ videoDeepStats.ratios.likeRate }}%</div>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="emoji">🪙</div>
                  <div class="info">
                    <div class="label">投币率</div>
                    <div class="value">{{ videoDeepStats.ratios.coinRate }}%</div>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="emoji">⭐</div>
                  <div class="info">
                    <div class="label">收藏率</div>
                    <div class="value">{{ videoDeepStats.ratios.favRate }}%</div>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="emoji">💬</div>
                  <div class="info">
                    <div class="label">弹幕率</div>
                    <div class="value">{{ videoDeepStats.ratios.danmakuRate }}%</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 对比分析 -->
            <div class="analysis-block">
              <h4>📈 对比分析</h4>
              <div class="comparison-grid">
                <div class="comparison-item">
                  <div class="label">与UP主平均表现</div>
                  <div class="value">{{ videoDeepStats.comparison.vsUpAverage }}</div>
                </div>
                <div class="comparison-item">
                  <div class="label">与热门视频平均</div>
                  <div class="value">{{ videoDeepStats.comparison.vsHotAverage }}</div>
                </div>
              </div>
            </div>

            <!-- 评论活跃度 -->
            <div class="analysis-block">
              <h4>💬 评论活跃度</h4>
              <div class="comment-stats">
                <div class="comment-item">
                  <span class="num">{{ videoDeepStats.commentActivity.replyPer1000 }}</span>
                  <span class="label">评论/千播</span>
                </div>
                <div class="comment-item">
                  <span class="num">{{ videoDeepStats.commentActivity.danmakuPer1000 }}</span>
                  <span class="label">弹幕/千播</span>
                </div>
                <div class="comment-item">
                  <span class="level">{{ videoDeepStats.commentActivity.level }}</span>
                  <span class="label">活跃等级</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- ==========================
             🌟 新增：视频对比展示
             ========================== -->
        <template v-if="activeTab === 'video-compare' && videoCompareStats">
          <div class="deep-analysis-section compare-section">
            <h3 class="section-title">🆚 视频对比分析 ({{ videoCompareStats.count }}个视频)</h3>

            <!-- 🌟 改进：视觉对比卡片 -->
            <div class="analysis-block">
              <h4>🎬 视频对比卡片</h4>
              <div class="video-compare-cards">
                <div
                  v-for="(v, index) in videoCompareStats.videos"
                  :key="v.bvid"
                  class="video-compare-card"
                  :class="{ winner: v.bvid === videoCompareStats.winners.mostViewed.bvid }"
                >
                  <div class="card-header">
                    <span class="index">#{{ index + 1 }}</span>
                    <img :src="v.pic" referrerpolicy="no-referrer" />
                    <div
                      v-if="v.bvid === videoCompareStats.winners.mostViewed.bvid"
                      class="badge winner-badge"
                    >
                      👑 最高播放
                    </div>
                    <div
                      v-if="v.bvid === videoCompareStats.winners.bestEngagement.bvid"
                      class="badge engagement-badge"
                    >
                      💎 最佳互动
                    </div>
                    <div
                      v-if="v.bvid === videoCompareStats.winners.mostCoins.bvid"
                      class="badge coin-badge"
                    >
                      🪙 最多投币
                    </div>
                  </div>
                  <div class="card-body">
                    <div class="title" :title="v.title">{{ v.title }}</div>
                    <div class="author">@{{ v.owner }}</div>
                    <div class="stats-grid">
                      <div class="stat">
                        <div class="label">▶️ 播放</div>
                        <div class="value">{{ formatNum(v.views) }}</div>
                      </div>
                      <div class="stat">
                        <div class="label">👍 点赞</div>
                        <div class="value">{{ formatNum(v.likes) }}</div>
                      </div>
                      <div class="stat">
                        <div class="label">🪙 投币</div>
                        <div class="value">{{ formatNum(v.coins) }}</div>
                      </div>
                      <div class="stat highlight">
                        <div class="label">📊 互动评分</div>
                        <div
                          class="value score"
                          :class="'score-' + Math.floor(v.engagementScore / 20)"
                        >
                          {{ v.engagementScore }}
                        </div>
                      </div>
                    </div>
                    <div class="rate-bar">
                      <div class="rate-label">点赞率</div>
                      <div class="rate-progress">
                        <div
                          class="rate-fill"
                          :style="{ width: Math.min(100, parseFloat(v.likeRate) * 5) + '%' }"
                        ></div>
                      </div>
                      <div class="rate-value">{{ v.likeRate }}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 平均值统计 -->
            <div class="analysis-block average-block">
              <h4>📈 平均值统计</h4>
              <div class="average-stats">
                <div class="avg-item">
                  <div class="emoji">▶️</div>
                  <div class="info">
                    <div class="label">平均播放</div>
                    <div class="value">{{ formatNum(videoCompareStats.averages.views) }}</div>
                  </div>
                </div>
                <div class="avg-item">
                  <div class="emoji">👍</div>
                  <div class="info">
                    <div class="label">平均点赞</div>
                    <div class="value">{{ formatNum(videoCompareStats.averages.likes) }}</div>
                  </div>
                </div>
                <div class="avg-item">
                  <div class="emoji">📊</div>
                  <div class="info">
                    <div class="label">平均点赞率</div>
                    <div class="value">{{ videoCompareStats.averages.engagementRate }}%</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 详细对比表格 -->
            <div class="analysis-block">
              <h4>📋 详细数据对比表</h4>
              <div class="compare-table-wrapper">
                <table class="compare-table">
                  <thead>
                    <tr>
                      <th>排名</th>
                      <th>视频</th>
                      <th>播放量</th>
                      <th>点赞</th>
                      <th>投币</th>
                      <th>收藏</th>
                      <th>点赞率</th>
                      <th>互动评分</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(v, index) in videoCompareStats.videos"
                      :key="v.bvid"
                      :class="{ 'highlight-row': index === 0 }"
                    >
                      <td class="rank-cell">
                        <span class="rank" :class="'rank-' + index">{{ index + 1 }}</span>
                      </td>
                      <td class="title-cell" :title="v.title">{{ v.title }}</td>
                      <td
                        :class="{ highlight: v.bvid === videoCompareStats.winners.mostViewed.bvid }"
                      >
                        {{ formatNum(v.views) }}
                      </td>
                      <td>{{ formatNum(v.likes) }}</td>
                      <td
                        :class="{ highlight: v.bvid === videoCompareStats.winners.mostCoins.bvid }"
                      >
                        {{ formatNum(v.coins) }}
                      </td>
                      <td>{{ formatNum(v.favorites) }}</td>
                      <td
                        :class="{
                          highlight: v.bvid === videoCompareStats.winners.bestEngagement.bvid
                        }"
                      >
                        {{ v.likeRate }}%
                      </td>
                      <td>
                        <span
                          class="eng-score"
                          :class="'score-' + Math.floor(v.engagementScore / 20)"
                        >
                          {{ v.engagementScore }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 平均值 -->
            <div class="analysis-block">
              <h4>📈 平均值</h4>
              <div class="stats-master-grid">
                <div class="stat-card">
                  <div class="emoji">▶️</div>
                  <div class="info">
                    <div class="label">平均播放</div>
                    <div class="value">{{ formatNum(videoCompareStats.averages.views) }}</div>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="emoji">👍</div>
                  <div class="info">
                    <div class="label">平均点赞</div>
                    <div class="value">{{ formatNum(videoCompareStats.averages.likes) }}</div>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="emoji">📊</div>
                  <div class="info">
                    <div class="label">平均点赞率</div>
                    <div class="value">{{ videoCompareStats.averages.engagementRate }}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- ==========================
             🌟 趋势发现 - 全新设计
             ========================== -->
        <template v-if="activeTab === 'trends' && trendsStats">
          <div class="deep-analysis-section trends-section">
            <h3 class="section-title">
              🔥 B站热门趋势洞察
              <span class="update-time">{{ trendsStats.updateTime }}</span>
            </h3>
            <div class="trends-stats-bar">
              <span class="stat-pill">📊 分析 {{ trendsStats.totalAnalyzed }} 个热门视频</span>
              <span class="stat-pill">⏰ 黄金时段 {{ trendsStats.peakHour }}:00</span>
              <span class="stat-pill"
                >👍 平均点赞率 {{ trendsStats.engagementStats.avgLikeRate }}%</span
              >
            </div>

            <!-- 第一行：关键词云 + 热门视频 -->
            <div class="trends-row">
              <!-- 热门关键词 - 全新词云设计 -->
              <div class="analysis-block keyword-block">
                <h4>🔥 热门关键词云</h4>
                <div class="keyword-cloud-container">
                  <div class="keyword-cloud">
                    <span
                      v-for="kw in trendsStats.hotKeywords"
                      :key="kw.word"
                      class="keyword-tag"
                      :class="'level-' + kw.level"
                      :style="{
                        fontSize:
                          kw.level === 'hot' ? '22px' : kw.level === 'warm' ? '16px' : '13px'
                      }"
                    >
                      <span v-if="kw.rank <= 3" class="rank">{{ kw.rank }}</span>
                      {{ kw.word }}
                      <span class="count">{{ kw.count }}</span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- 热门视频预览 -->
              <div class="analysis-block hot-videos-block">
                <h4>🌟 热门视频</h4>
                <div class="hot-videos-list">
                  <div
                    v-for="(video, idx) in trendsStats.hotVideosPreview"
                    :key="video.bvid"
                    class="hot-video-item"
                  >
                    <span class="rank-badge" :class="'rank-' + idx">{{ idx + 1 }}</span>
                    <img :src="video.pic" referrerpolicy="no-referrer" />
                    <div class="video-info">
                      <div class="title" :title="video.title">{{ video.title }}</div>
                      <div class="meta">
                        <span>@{{ video.owner }}</span>
                        <span>▶️ {{ formatNum(video.views) }}</span>
                        <span>👍 {{ formatNum(video.likes) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 第二行：统计数据卡片 -->
            <div class="analysis-block">
              <h4>📊 热门视频平均数据</h4>
              <div class="engagement-cards">
                <div class="eng-card">
                  <div class="icon">▶️</div>
                  <div class="data">
                    <div class="value">{{ formatNum(trendsStats.engagementStats.avgViews) }}</div>
                    <div class="label">平均播放</div>
                  </div>
                </div>
                <div class="eng-card">
                  <div class="icon">👍</div>
                  <div class="data">
                    <div class="value">{{ formatNum(trendsStats.engagementStats.avgLikes) }}</div>
                    <div class="label">平均点赞</div>
                  </div>
                </div>
                <div class="eng-card">
                  <div class="icon">🪙</div>
                  <div class="data">
                    <div class="value">{{ formatNum(trendsStats.engagementStats.avgCoins) }}</div>
                    <div class="label">平均投币</div>
                  </div>
                </div>
                <div class="eng-card highlight">
                  <div class="icon">📈</div>
                  <div class="data">
                    <div class="value">{{ trendsStats.engagementStats.avgLikeRate }}%</div>
                    <div class="label">平均点赞率</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 第三行：时长分布 + 发布时段 -->
            <div class="trends-row">
              <div class="analysis-block">
                <h4>⏱️ 视频时长分布趋势</h4>
                <div class="duration-pills">
                  <div
                    v-for="(range, key) in trendsStats.durationRanges"
                    :key="key"
                    class="duration-pill"
                    :style="{
                      background: range.color + '20',
                      borderColor: range.color,
                      flex: range.count
                    }"
                  >
                    <div class="pill-header">
                      <span class="dot" :style="{ background: range.color }"></span>
                      <span class="label">{{ range.label }}</span>
                    </div>
                    <div class="pill-count">{{ range.count }}个</div>
                    <div class="pill-percent">
                      {{ ((range.count / trendsStats.totalAnalyzed) * 100).toFixed(1) }}%
                    </div>
                  </div>
                </div>
              </div>

              <div class="analysis-block">
                <h4>🕐 热门发布时段分布</h4>
                <div class="hour-heatmap">
                  <div
                    v-for="(count, hour) in trendsStats.hourlyDistribution"
                    :key="hour"
                    class="hour-cell"
                    :class="{ peak: hour === trendsStats.peakHour, active: count > 0 }"
                    :style="{
                      opacity:
                        count > 0
                          ? 0.3 + (count / Math.max(...trendsStats.hourlyDistribution)) * 0.7
                          : 0.1
                    }"
                  >
                    <span class="hour">{{ hour }}</span>
                    <span v-if="count > 0" class="count">{{ count }}</span>
                  </div>
                </div>
                <div class="peak-info">
                  🔥 黄金发布时段: <strong>{{ trendsStats.peakHour }}:00</strong> ({{
                    trendsStats.hourlyDistribution[trendsStats.peakHour]
                  }}
                  个视频)
                </div>
              </div>
            </div>

            <!-- 第四行：分区分布 -->
            <div class="analysis-block">
              <h4>📂 热门分区排行</h4>
              <div class="partition-chips">
                <div
                  v-for="(p, idx) in trendsStats.hotPartitions"
                  :key="p.name"
                  class="partition-chip"
                  :class="'rank-' + idx"
                >
                  <span class="rank">{{ idx + 1 }}</span>
                  <span class="name">{{ p.name }}</span>
                  <span class="count">{{ p.count }}</span>
                  <span class="percent">{{ p.percent }}%</span>
                </div>
              </div>
            </div>

            <!-- 第五行：上升UP主 -->
            <div class="analysis-block">
              <h4>📈 上升UP主排行 (多次上榜)</h4>
              <div class="rising-ups-grid">
                <div
                  v-for="up in trendsStats.risingUps"
                  :key="up.name"
                  class="rising-up-card"
                  :class="'rank-' + (up.rank - 1)"
                >
                  <span class="rank-badge">{{ up.rank }}</span>
                  <span class="name">@{{ up.name }}</span>
                  <span class="count">{{ up.videoCount }} 个视频</span>
                </div>
              </div>
            </div>

            <!-- 冷门高质量视频 -->
            <div v-if="trendsStats.hiddenGems.length > 0" class="analysis-block">
              <h4>💎 冷门高质量视频 (低播放高互动)</h4>
              <div class="hidden-gems">
                <div v-for="gem in trendsStats.hiddenGems" :key="gem.bvid" class="gem-card">
                  <img :src="gem.pic" referrerpolicy="no-referrer" />
                  <div class="gem-info">
                    <div class="title" :title="gem.title">{{ gem.title }}</div>
                    <div class="stats">
                      <span class="views">▶️ {{ formatNum(gem.views) }}</span>
                      <span class="rate">👍 {{ gem.likeRate }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </transition>
    <transition name="toast">
      <div v-if="toastMsg" class="global-toast">{{ toastMsg }}</div>
    </transition>
  </div>
</template>

<style scoped>
/* ✅ 新增：清除按钮样式 */
.btn-clear {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  background: var(--bg-color);
  color: var(--text-sub);
  font-weight: bold;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}
.btn-clear:hover {
  background: var(--card-bg);
  border-color: var(--border-color);
  color: var(--text-main);
}
.btn-clear.mini {
  padding: 8px 16px;
  font-size: 13px;
}

/* ——— 以下为原样式，未改动 ——— */
.dashboard-view {
  position: relative;
  padding-bottom: 40px;
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

.top-control-belt {
  display: flex;
  align-items: stretch;
  gap: 16px;
  margin-bottom: 24px;
  min-height: 48px;
  flex-wrap: wrap;
}

.segment-control {
  display: inline-flex;
  background: rgba(0, 0, 0, 0.04);
  padding: 4px;
  border-radius: 10px;
}
[data-theme='dark'] .segment-control {
  background: rgba(255, 255, 255, 0.08);
}
.segment-control button {
  border: none;
  background: transparent;
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-sub);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.segment-control button:hover:not(.active) {
  color: var(--text-main);
  background: rgba(0, 0, 0, 0.02);
}
.segment-control button.active {
  background: var(--card-bg, #ffffff);
  color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-weight: 800;
  transform: scale(1.02);
}
[data-theme='dark'] .segment-control button.active {
  background: #393a3c;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.account-matrix,
.search-cabin {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card-bg);
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}
.matrix-label {
  font-size: 14px;
  color: var(--text-sub);
  font-weight: 600;
  flex-shrink: 0;
}
.matrix-list {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scrollbar-width: none;
  overflow-y: hidden;
}
.matrix-list::-webkit-scrollbar {
  display: none;
}
.acc-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px 4px 4px;
  background: var(--bg-color);
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  flex-shrink: 0;
}
.acc-chip.active {
  border-color: var(--primary-color);
  background: rgba(0, 174, 236, 0.08);
}
.acc-chip img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  object-fit: cover;
}
.acc-chip span {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-main);
  margin-right: 4px;
}
.empty-hint {
  color: var(--text-sub);
  font-size: 13.5px;
  opacity: 0.8;
}

.search-icon {
  font-size: 16px;
}
.dash-search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-main);
  outline: none;
}
.dash-search-input::placeholder {
  color: var(--text-sub);
  opacity: 0.7;
}
.btn-primary.mini {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  background: var(--primary-color);
  color: #fff;
  font-weight: bold;
  border: none;
  cursor: pointer;
}

.loading-state {
  height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-sub);
}
.spinner-icon {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.stats-master-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}
.area-span-full {
  grid-column: 1 / -1;
}
.shadow-plus {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.03) !important;
}
@media (max-width: 900px) {
  .stats-master-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  background: var(--card-bg);
  padding: 22px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}
.bg-hint {
  background: linear-gradient(135deg, var(--card-bg), rgba(0, 0, 0, 0.015));
}

.emoji {
  font-size: 34px;
  line-height: 1;
  min-width: 40px;
  text-align: center;
}
.emoji.mini {
  font-size: 26px;
}
.info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  overflow: hidden;
}
.label {
  font-size: 13px;
  color: var(--text-sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.value {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.light-sec {
  font-size: 14px;
  color: var(--text-sub);
  font-weight: normal;
}
.up-hint {
  font-size: 12px;
  color: var(--text-sub);
  opacity: 0.7;
  margin-top: 6px;
}
.section-hint {
  font-size: 12px;
  color: var(--text-sub);
  opacity: 0.7;
  font-weight: normal;
  margin-left: 6px;
}
.b-color {
  color: var(--primary-color);
}
.p-color {
  color: #fb7299;
}

.prime-card {
  flex-direction: column;
  align-items: stretch;
}
.prime-level-box {
  display: flex;
  align-items: center;
  gap: 30px;
  flex-wrap: wrap;
}
.lv-text {
  font-size: 28px;
  font-style: italic;
  font-weight: 900;
  color: #f3a034;
  display: flex;
  align-items: center;
  gap: 8px;
}
.vip-icon {
  display: inline-block;
  font-size: 12px;
  font-style: normal;
  background: linear-gradient(135deg, #fb7299, #f3a034);
  padding: 4px 10px;
  border-radius: 12px;
  color: #fff;
}
.lv-text.vip-glory {
  color: #fb7299;
}
.prime-grow {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 280px;
}
.tag-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-sub);
  margin-bottom: 8px;
  font-weight: bold;
}
.prog-bar {
  height: 8px;
  background: var(--bg-color);
  border-radius: 4px;
  overflow: hidden;
}
.prog-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 1s;
}
.prog-fill.prime {
  background: linear-gradient(90deg, #f3a034, #f9c152);
}
.prog-fill.health {
  background: linear-gradient(90deg, #52c41a, #95de64);
}
.mt {
  margin-top: 8px;
}

.avatar-hero-card {
  padding: 30px;
  display: flex;
  gap: 24px;
  align-items: center;
  flex-wrap: wrap;
}
.avatar-col.wrap {
  position: relative;
  width: 85px;
  height: 85px;
  border-radius: 50%;
  padding: 3px;
  background: #e3e5e7;
}
.live-now {
  background: linear-gradient(135deg, #fb7299, #f3a034) !important;
}
.avatar-col img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid var(--card-bg);
}
.live-tag {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: #fb7299;
  color: #fff;
  font-size: 11px;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 8px;
}
.info-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.name-zone {
  display: flex;
  align-items: center;
  gap: 12px;
}
.up-name {
  margin: 0;
  font-size: 22px;
  color: var(--text-main);
}
.b-badge {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
}
.b-badge.vip {
  background: #fb7299;
  color: white;
}
.b-badge.auth {
  background: #f3a034;
  color: white;
}
.b-badge.auth-blue {
  background: #00aeec;
  color: white;
}
.auth-desc {
  font-size: 13px;
  color: var(--text-sub);
}
.up-sign {
  margin: 0;
  font-size: 14px;
  color: var(--text-sub);
}

.activity-top-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}
@media (max-width: 900px) {
  .activity-top-grid {
    grid-template-columns: 1fr;
  }
}
.ac-tag-board {
  flex-direction: column;
  align-items: flex-start;
  padding: 25px;
  justify-content: center;
}
.ac-tag-board h3 {
  margin: 0;
  font-size: 15.5px;
  font-weight: bold;
  color: var(--text-main);
}
.tag-flow {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
  width: 100%;
}
.profile-chip {
  padding: 8px 16px;
  font-size: 14.5px;
  font-weight: bold;
  border-radius: 8px;
  background: rgba(0, 174, 236, 0.06);
  color: var(--primary-color);
}
.hrs-block {
  background: var(--bg-color);
  padding: 16px;
  border-radius: 12px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}
.hbs-max {
  font-size: 26px;
  font-weight: 900;
  color: var(--text-main);
}
.subtit {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-sub);
}

.ac-up-board {
  flex-direction: column;
  align-items: flex-start;
  height: 100%;
  padding: 25px;
}
.side-hb {
  font-size: 15px;
  margin: 0;
  text-align: left;
  color: var(--text-main);
  width: 100%;
  font-weight: bold;
  border-bottom: 1px dashed var(--border-color);
  padding-bottom: 12px;
}
.up-listbox {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  flex: 1;
}
.usx-ite {
  display: flex;
  align-items: center;
  font-size: 14.5px;
  margin-top: 12px;
  background: var(--bg-color);
  padding: 8px 12px;
  border-radius: 8px;
}
.ux-rank {
  font-weight: bold;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  color: #fff;
}
.rk-0 {
  background: #fb7299;
}
.rk-1 {
  background: #f3a034;
}
.rk-2 {
  background: #00aeec;
}
.ux-nm {
  font-weight: bold;
  color: var(--text-main);
  margin-left: 12px;
  flex: 1;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ux-pnt {
  color: var(--text-sub);
  font-size: 12px;
}

.video-card-row {
  flex-direction: row;
  align-items: stretch;
  padding: 16px;
  flex-wrap: wrap;
  gap: 20px;
}
.vid-cover-wrap {
  position: relative;
  width: auto;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
  min-width: 200px;
  max-width: 250px;
}
.vid-cover-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vid-data-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4px 0;
  min-width: 200px;
}
.vid-data-wrap h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
  line-height: 1.4;
  font-weight: bold;
}
.v-mark-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.mark {
  font-size: 12px;
  font-weight: bold;
  padding: 4px 10px;
  border-radius: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
}
.mark.primary {
  background: rgba(0, 174, 236, 0.1);
  color: var(--primary-color);
}
.mark.alert {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

.triple-evaluate-banner {
  background: var(--bg-color);
  border-radius: 8px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}
.te-title {
  font-size: 13.5px;
  color: var(--text-sub);
  font-weight: 600;
}
.te-bar-box {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 50%;
  min-width: 260px;
  flex-wrap: nowrap;
}
.te-val {
  font-size: 18px;
  font-weight: 900;
  color: var(--text-main);
  flex: 1;
}
.te-badge {
  font-weight: 900;
  color: #fff;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
}

.split-triple-sect {
  padding: 0;
  flex-direction: row;
  justify-content: space-around;
  background: var(--card-bg);
}
.t-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  flex: 1;
  justify-content: center;
  overflow: hidden;
  max-width: 350px;
}
.t-txt {
  font-size: 20px;
  font-weight: bold;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chart-container {
  background: var(--card-bg);
  padding: 24px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  height: 420px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
}
.ac-pad-adjust {
  height: 480px;
}
.elegant-badge {
  font-size: 12px;
  color: var(--text-sub);
  background: var(--bg-color);
  padding: 4px 8px;
  border-radius: 4px;
}
.echarts-box {
  flex: 1;
  width: 100%;
  min-height: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
.pop-up-enter-active {
  transition: all 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
.pop-up-enter-from {
  opacity: 0;
  transform: scale(0.98) translateY(10px);
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
  border-left: 4px solid var(--primary-color);
  z-index: 1000;
}

/* ==========================
   🌟 新增：深度分析样式
   ========================== */

/* 分析模式切换 */
.analysis-mode-toggle {
  display: flex;
  gap: 4px;
  background: var(--bg-color);
  padding: 2px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}
.mode-btn {
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--text-sub);
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.mode-btn.active {
  background: var(--primary-color);
  color: #fff;
}

/* 深度分析区块 */
.deep-analysis-section {
  margin-top: 24px;
  padding: 24px;
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

/* UP主信息卡片 */
.up-info-card {
  background: linear-gradient(135deg, rgba(251, 114, 153, 0.05), var(--bg-color));
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

/* 视频信息卡片 */
.video-info-card {
  background: linear-gradient(135deg, rgba(0, 174, 236, 0.05), var(--bg-color));
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}
.video-header {
  display: flex;
  gap: 16px;
}
.video-cover {
  width: 160px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}
.video-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.video-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 8px;
  line-height: 1.4;
  display: -webkit-box;
  line-clamp: calc();
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.video-owner {
  font-size: 13px;
  color: var(--text-sub);
  margin-bottom: 4px;
}
.video-owner .owner-name {
  color: var(--primary-color);
  font-weight: 500;
}
.video-owner .owner-fans {
  margin-left: 8px;
  opacity: 0.8;
}
.video-views {
  font-size: 14px;
  color: var(--text-sub);
}
.up-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.up-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--primary-color);
  box-shadow: 0 4px 12px rgba(251, 114, 153, 0.2);
}
.up-meta {
  flex: 1;
  min-width: 0;
}
.up-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 8px;
}
.up-sign {
  font-size: 13px;
  color: var(--text-sub);
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  line-clamp: calc();
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.up-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.up-stat-item {
  font-size: 13px;
  color: var(--text-sub);
  background: var(--bg-color);
  padding: 4px 12px;
  border-radius: 12px;
}
.section-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
}
.update-time {
  font-size: 12px;
  font-weight: normal;
  color: var(--text-sub);
  margin-left: auto;
}

.analysis-block {
  margin-bottom: 24px;
}
.analysis-block h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-sub);
  padding-left: 8px;
  border-left: 3px solid var(--primary-color);
}

/* 爆款视频网格 */
.hot-videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.hot-video-card {
  background: var(--bg-color);
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s;
}
.hot-video-card:hover {
  transform: translateY(-2px);
}
.hot-video-card img {
  width: 100%;
  height: 110px;
  object-fit: cover;
}
.hot-video-info {
  padding: 8px;
}
.hot-video-info .title {
  font-size: 12px;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}
.hot-video-info .views {
  font-size: 11px;
  color: var(--primary-color);
  font-weight: 600;
}

/* 分区标签 */
.partition-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.partition-tag {
  padding: 4px 10px;
  background: var(--bg-color);
  border-radius: 20px;
  font-size: 12px;
  color: var(--text-main);
}

/* 系列视频 */
.series-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.series-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-color);
  border-radius: 6px;
}
.series-name {
  font-weight: 600;
  color: var(--text-main);
}
.series-count {
  color: var(--primary-color);
  font-size: 12px;
}

/* 评分卡片 */
.hot-card {
  background: linear-gradient(135deg, rgba(255, 77, 79, 0.1), rgba(255, 77, 79, 0.05)) !important;
  border-color: rgba(255, 77, 79, 0.3) !important;
}
.rating-card .value.big {
  font-size: 36px;
  font-weight: 800;
}
.rating {
  font-size: 32px;
  font-weight: 800;
}
.rating-S {
  color: #ff4d4f;
}
.rating-A {
  color: #f3a034;
}
.rating-B {
  color: var(--primary-color);
}
.rating-C {
  color: #52c41a;
}
.rating-D {
  color: var(--text-sub);
}

/* 对比网格 */
.comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.comparison-item {
  padding: 12px;
  background: var(--bg-color);
  border-radius: 8px;
}
.comparison-item .label {
  font-size: 12px;
  color: var(--text-sub);
  margin-bottom: 4px;
}
.comparison-item .value {
  font-weight: 600;
  color: var(--text-main);
}

/* 评论统计 */
.comment-stats {
  display: flex;
  gap: 24px;
}
.comment-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 24px;
  background: var(--bg-color);
  border-radius: 8px;
}
.comment-item .num,
.comment-item .level {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}
.comment-item .label {
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 4px;
}

/* 冠军卡片 */
.winners-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}
.winner-card {
  padding: 16px;
  background: linear-gradient(135deg, rgba(251, 114, 153, 0.1), rgba(251, 114, 153, 0.05));
  border: 1px solid rgba(251, 114, 153, 0.3);
  border-radius: 8px;
}
.winner-card .crown {
  font-size: 12px;
  color: #fb7299;
  font-weight: 600;
  margin-bottom: 8px;
}
.winner-card .title {
  font-size: 13px;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}
.winner-card .value {
  font-weight: 700;
  color: #fb7299;
}

/* 对比表格 */
.compare-table-wrapper {
  overflow-x: auto;
}
.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.compare-table th,
.compare-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}
.compare-table th {
  font-weight: 600;
  color: var(--text-sub);
  background: var(--bg-color);
}
.compare-table .title-cell {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.eng-score {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}
.eng-score.score-4 {
  background: #ff4d4f;
  color: #fff;
}
.eng-score.score-3 {
  background: #f3a034;
  color: #fff;
}
.eng-score.score-2 {
  background: var(--primary-color);
  color: #fff;
}
.eng-score.score-1 {
  background: #52c41a;
  color: #fff;
}
.eng-score.score-0 {
  background: var(--text-sub);
  color: #fff;
}

/* 关键词云 */
.keyword-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  background: var(--bg-color);
  border-radius: 8px;
}
.keyword-tag {
  padding: 4px 12px;
  background: var(--card-bg);
  border-radius: 20px;
  color: var(--primary-color);
  border: 1px solid var(--border-color);
}

/* 分区条形图 */
.partition-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.partition-bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.bar-label {
  width: 100px;
  font-size: 12px;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bar-wrapper {
  flex: 1;
  height: 8px;
  background: var(--bg-color);
  border-radius: 4px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: var(--primary-color);
  border-radius: 4px;
  transition: width 0.3s ease;
}
.bar-value {
  width: 40px;
  text-align: right;
  font-size: 12px;
  color: var(--text-sub);
}

/* 上升UP主 */
.rising-ups {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.rising-up-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--bg-color);
  border-radius: 20px;
}
.rising-up-item .name {
  font-weight: 600;
  color: var(--primary-color);
}
.rising-up-item .count {
  font-size: 11px;
  color: var(--text-sub);
}

/* 冷门宝藏 */
.hidden-gems {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.gem-card {
  background: var(--bg-color);
  border-radius: 8px;
  overflow: hidden;
}
.gem-card img {
  width: 100%;
  height: 110px;
  object-fit: cover;
}
.gem-info {
  padding: 8px;
}
.gem-info .title {
  font-size: 12px;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}
.gem-info .stats {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-sub);
}

/* 警告卡片 */
.alert-card {
  background: rgba(255, 77, 79, 0.1) !important;
  border-color: rgba(255, 77, 79, 0.3) !important;
}
.text-warn {
  color: #ff4d4f !important;
}

/* 数值大字体 */
.value.big {
  font-size: 32px;
  font-weight: 800;
}
.value .sub {
  font-size: 11px;
  color: var(--text-sub);
  font-weight: normal;
}
.heat-level {
  color: #ff4d4f;
  font-weight: 600;
}

/* ==========================
   🌟 趋势发现专用样式
   ========================== */
.trends-section {
  background: linear-gradient(135deg, var(--card-bg) 0%, rgba(0, 174, 236, 0.03) 100%);
}

.trends-stats-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat-pill {
  padding: 6px 14px;
  background: var(--bg-color);
  border-radius: 20px;
  font-size: 13px;
  color: var(--text-main);
  border: 1px solid var(--border-color);
}

.trends-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

/* 关键词云 - 全新设计 */
.keyword-block {
  min-height: 300px;
}

.keyword-cloud-container {
  background: var(--bg-color);
  border-radius: 12px;
  padding: 20px;
  min-height: 200px;
}

.keyword-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-content: flex-start;
}

.keyword-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  transition: all 0.3s ease;
  cursor: default;
}

.keyword-tag:hover {
  transform: scale(1.05);
}

.keyword-tag .rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
}

.keyword-tag .count {
  font-size: 11px;
  opacity: 0.8;
}

.keyword-tag.level-hot {
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  color: #fff;
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3);
}

.keyword-tag.level-hot .rank {
  background: rgba(255, 255, 255, 0.9);
  color: #ff4d4f;
}

.keyword-tag.level-warm {
  background: linear-gradient(135deg, #ffa940, #ffc53d);
  color: #fff;
}

.keyword-tag.level-warm .rank {
  background: rgba(255, 255, 255, 0.9);
  color: #ffa940;
}

.keyword-tag.level-normal {
  background: var(--card-bg);
  color: var(--text-main);
  border: 1px solid var(--border-color);
}

/* 热门视频列表 */
.hot-videos-block {
  min-height: 300px;
}

.hot-videos-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hot-video-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: var(--bg-color);
  border-radius: 8px;
  transition: all 0.2s;
}

.hot-video-item:hover {
  background: rgba(0, 174, 236, 0.08);
}

.hot-video-item .rank-badge {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.rank-badge.rank-0 {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #333;
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
  color: #333;
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #cd7f32, #b87333);
  color: #fff;
}

.rank-badge.rank-3 {
  background: var(--bg-color);
  color: var(--text-sub);
  border: 1px solid var(--border-color);
}

.hot-video-item img {
  width: 80px;
  height: 50px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.hot-video-item .video-info {
  flex: 1;
  min-width: 0;
}

.hot-video-item .title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.hot-video-item .meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-sub);
}

/* 互动数据卡片 */
.engagement-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.eng-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: var(--bg-color);
  border-radius: 10px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.eng-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
}

.eng-card.highlight {
  background: linear-gradient(135deg, rgba(0, 174, 236, 0.1), rgba(251, 114, 153, 0.1));
  border-color: var(--primary-color);
}

.eng-card .icon {
  font-size: 28px;
}

.eng-card .value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
}

.eng-card .label {
  font-size: 12px;
  color: var(--text-sub);
}

/* 时长分布 pills */
.duration-pills {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.duration-pill {
  display: flex;
  flex-direction: column;
  padding: 14px 18px;
  border-radius: 10px;
  border: 2px solid;
  min-width: 100px;
  text-align: center;
  transition: all 0.2s;
}

.duration-pill:hover {
  transform: translateY(-2px);
}

.pill-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.pill-header .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.pill-header .label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main);
}

.pill-count {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
}

.pill-percent {
  font-size: 12px;
  color: var(--text-sub);
}

/* 时段热力图 */
.hour-heatmap {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 4px;
  margin-bottom: 12px;
}

.hour-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-color);
  border-radius: 4px;
  font-size: 10px;
  transition: all 0.2s;
  cursor: default;
}

.hour-cell:hover {
  transform: scale(1.1);
  z-index: 1;
}

.hour-cell .hour {
  font-weight: 600;
  color: var(--text-main);
}

.hour-cell .count {
  font-size: 9px;
  color: var(--text-sub);
}

.hour-cell.peak {
  border: 2px solid #ff4d4f;
  box-shadow: 0 0 8px rgba(255, 77, 79, 0.4);
}

.peak-info {
  text-align: center;
  padding: 10px;
  background: rgba(255, 77, 79, 0.1);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-main);
}

.peak-info strong {
  color: #ff4d4f;
  font-size: 16px;
}

/* 分区芯片 */
.partition-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.partition-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--bg-color);
  border-radius: 20px;
  font-size: 13px;
  transition: all 0.2s;
}

.partition-chip:hover {
  transform: translateY(-2px);
}

.partition-chip .rank {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  background: var(--card-bg);
  color: var(--text-sub);
}

.partition-chip.rank-0 {
  background: linear-gradient(135deg, #ffd70020, #ffb70020);
  border: 1px solid #ffd700;
}

.partition-chip.rank-0 .rank {
  background: #ffd700;
  color: #333;
}

.partition-chip.rank-1 {
  background: linear-gradient(135deg, #c0c0c020, #a0a0a020);
  border: 1px solid #c0c0c0;
}

.partition-chip.rank-1 .rank {
  background: #c0c0c0;
  color: #333;
}

.partition-chip.rank-2 {
  background: linear-gradient(135deg, #cd7f3220, #b8733320);
  border: 1px solid #cd7f32;
}

.partition-chip.rank-2 .rank {
  background: #cd7f32;
  color: #fff;
}

.partition-chip .name {
  font-weight: 600;
  color: var(--text-main);
}

.partition-chip .count {
  color: var(--text-sub);
}

.partition-chip .percent {
  padding: 2px 6px;
  background: var(--card-bg);
  border-radius: 10px;
  font-size: 11px;
  color: var(--primary-color);
  font-weight: 600;
}

/* 上升UP主网格 */
.rising-ups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.rising-up-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--bg-color);
  border-radius: 10px;
  transition: all 0.2s;
}

.rising-up-card:hover {
  transform: translateX(4px);
}

.rising-up-card .rank-badge {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--card-bg);
  color: var(--text-sub);
  flex-shrink: 0;
}

.rising-up-card.rank-0 .rank-badge {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #333;
}

.rising-up-card.rank-1 .rank-badge {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
  color: #333;
}

.rising-up-card.rank-2 .rank-badge {
  background: linear-gradient(135deg, #cd7f32, #b87333);
  color: #fff;
}

.rising-up-card .name {
  flex: 1;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rising-up-card .count {
  font-size: 12px;
  color: var(--text-sub);
  padding: 2px 8px;
  background: var(--card-bg);
  border-radius: 10px;
}

/* ==========================
   🌟 新增：视频对比专用样式
   ========================== */
.video-compare-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
.video-compare-card {
  background: var(--bg-color);
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}
.video-compare-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}
.video-compare-card.winner {
  border-color: #fb7299;
  background: linear-gradient(135deg, rgba(251, 114, 153, 0.05), var(--bg-color));
}
.card-header {
  position: relative;
  height: 140px;
}
.card-header img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-header .index {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}
.card-header .badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.winner-badge {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #333;
}
.engagement-badge {
  background: linear-gradient(135deg, #00aeec, #0096c7);
  color: #fff;
}
.coin-badge {
  background: linear-gradient(135deg, #f3a034, #e8910d);
  color: #fff;
}
.card-body {
  padding: 12px;
}
.card-body .title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}
.card-body .author {
  font-size: 11px;
  color: var(--text-sub);
  margin-bottom: 12px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.stats-grid .stat {
  background: var(--card-bg);
  padding: 8px;
  border-radius: 6px;
  text-align: center;
}
.stats-grid .stat.highlight {
  background: rgba(0, 174, 236, 0.1);
}
.stats-grid .stat .label {
  font-size: 10px;
  color: var(--text-sub);
  margin-bottom: 2px;
}
.stats-grid .stat .value {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
}
.stats-grid .stat .value.score {
  font-size: 16px;
}
.rate-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rate-bar .rate-label {
  font-size: 11px;
  color: var(--text-sub);
  width: 50px;
}
.rate-bar .rate-progress {
  flex: 1;
  height: 6px;
  background: var(--card-bg);
  border-radius: 3px;
  overflow: hidden;
}
.rate-bar .rate-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), #fb7299);
  border-radius: 3px;
  transition: width 0.5s ease;
}
.rate-bar .rate-value {
  font-size: 11px;
  font-weight: 600;
  color: var(--primary-color);
  width: 50px;
  text-align: right;
}

/* 平均值统计 */
.average-block {
  background: linear-gradient(135deg, rgba(0, 174, 236, 0.05), rgba(251, 114, 153, 0.05));
  border-radius: 12px;
  padding: 16px;
}
.average-stats {
  display: flex;
  justify-content: space-around;
  gap: 16px;
}
.avg-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--card-bg);
  border-radius: 8px;
  flex: 1;
}
.avg-item .emoji {
  font-size: 24px;
}
.avg-item .info .label {
  font-size: 12px;
  color: var(--text-sub);
}
.avg-item .info .value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
}

/* 对比表格优化 */
.rank-cell {
  text-align: center;
}
.rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
}
.rank-0 {
  background: #ffd700;
  color: #333;
}
.rank-1 {
  background: #c0c0c0;
  color: #333;
}
.rank-2 {
  background: #cd7f32;
  color: #fff;
}
.highlight-row {
  background: rgba(0, 174, 236, 0.05);
}
.highlight {
  color: #fb7299;
  font-weight: 700;
}

/* ==========================
   🤖 AI智能分析样式
   ========================== */
.ai-analysis-block {
  background: linear-gradient(135deg, rgba(0, 174, 236, 0.08), rgba(139, 92, 246, 0.08));
  border: 1px solid rgba(0, 174, 236, 0.2);
  border-radius: 12px;
  padding: 20px;
}

.ai-summary {
  margin-bottom: 16px;
  padding: 14px 18px;
  background: var(--card-bg);
  border-radius: 10px;
  border-left: 4px solid var(--primary-color);
}

.ai-summary .summary-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.6;
}

.ai-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.ai-section {
  background: var(--card-bg);
  border-radius: 10px;
  padding: 16px;
}

.ai-section .ai-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.ai-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.ai-list li {
  position: relative;
  padding: 8px 0 8px 20px;
  font-size: 13px;
  color: var(--text-main);
  border-bottom: 1px dashed var(--border-color);
}

.ai-list li:last-child {
  border-bottom: none;
}

.ai-list li::before {
  content: '•';
  position: absolute;
  left: 6px;
  color: var(--primary-color);
  font-weight: 700;
}

.ai-strategy {
  padding: 12px 16px;
  background: var(--card-bg);
  border-radius: 10px;
  font-size: 13px;
}

.ai-strategy .label {
  font-weight: 600;
  color: var(--text-sub);
}

.ai-strategy .value {
  font-weight: 600;
  color: var(--primary-color);
}
</style>
