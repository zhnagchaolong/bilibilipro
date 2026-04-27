import { ipcMain, BrowserWindow, Event as ElectronEvent, session, app } from 'electron'
import { generateAIResponse, sendVibeToAssistant } from './assistant'
import Store from 'electron-store'
import type { LlmSettings, BiliAccount } from '../../shared/api.types'
import * as fs from 'fs'
import * as path from 'path'

const store = new Store({ name: 'user-settings' })

let playerWin: BrowserWindow | null = null
let coWatchInterval: NodeJS.Timeout | null = null
let garbageCollectorInterval: NodeJS.Timeout | null = null

function isAssistantEnabled(): boolean {
  // 💥 修复：弹幕吐槽依据看板娘独立AI配置的启用AI对话开关
  const assistantAISettings = store.get('assistantAISettings') as unknown as
    | { enabled: boolean; useSharedAI: boolean }
    | undefined

  // 检查看板娘独立AI是否启用
  if (assistantAISettings) {
    // 如果使用共享AI设置，则检查通用LLM
    if (assistantAISettings.useSharedAI) {
      const settings = store.get('llmSettings') as unknown as LlmSettings | undefined
      return !!settings?.enabled
    }
    // 否则检查看板娘独立AI启用状态
    return !!assistantAISettings.enabled
  }

  // 没有看板娘配置时，检查通用LLM
  const settings = store.get('llmSettings') as unknown as LlmSettings | undefined
  return !!settings?.enabled
}

async function resolveBestPartition(inputPartition: string): Promise<string> {
  const targetSession = session.fromPartition(inputPartition)
  const cookies = await targetSession.cookies.get({ url: 'https://www.bilibili.com' })
  const hasEssential = cookies.some(
    (c) => c.name === 'SESSDATA' || c.name === 'buvid3' || c.name === 'b_nut'
  )
  if (hasEssential) return inputPartition

  // 尝试从本地账号库查找有有效 cookies 的 partition
  try {
    const dbPath = path.join(app.getPath('userData'), 'bili-accounts.json')
    if (fs.existsSync(dbPath)) {
      const accounts = JSON.parse(fs.readFileSync(dbPath, 'utf8')) as BiliAccount[]
      for (const acc of accounts) {
        if (!acc.partition) continue
        try {
          const testSession = session.fromPartition(acc.partition)
          const testCookies = await testSession.cookies.get({ url: 'https://www.bilibili.com' })
          if (testCookies.some((c) => c.name === 'SESSDATA' || c.name === 'buvid3')) {
            console.log(`[Player] 自动切换到可用 partition: ${acc.partition} (${acc.name})`)
            return acc.partition
          }
        } catch {
          // 忽略错误，继续尝试下一个
        }
      }
    }
  } catch (err) {
    console.warn('[Player] 读取账号列表失败:', err)
  }

  // 兜底：返回原值，让调用方自己处理
  return inputPartition
}

export function setupPlayerIpc(): void {
  ipcMain.handle(
    'open-player',
    async (_event: ElectronEvent, bvid: string, partition: string): Promise<void> => {
      if (playerWin) {
        playerWin.close()
      }

      if (coWatchInterval) clearInterval(coWatchInterval)

      // 💥 如果传入的 partition 没有有效 Cookie，自动回退到已登录账号
      const effectivePartition = await resolveBestPartition(partition || 'default')

      playerWin = new BrowserWindow({
        width: 640,
        height: 360,
        frame: false,
        alwaysOnTop: true,
        resizable: true,
        backgroundColor: '#000000',
        webPreferences: {
          partition: effectivePartition,
          nodeIntegration: false,
          contextIsolation: true,
          // 💥 B站播放器需要关闭 sandbox 才能正常初始化 MSE / WASM 解码器
          sandbox: false,
          // 💥 允许跨域加载视频 CDN 流地址（upos-sz-mirror.bilivideo.com 等）
          webSecurity: false,
          // 💥 避免后台播放被 Chromium 降频导致卡顿或暂停
          backgroundThrottling: false,
          // 💥 禁用不必要功能
          spellcheck: false,
          enableWebSQL: false,
          v8CacheOptions: 'code'
        }
      })

      // 💥 为当前 partition 注入合法 Referer，避免 B站视频 API / CDN 被拦截
      playerWin.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
        const hostname = new URL(details.url).hostname
        if (
          hostname.includes('bilibili.com') ||
          hostname.includes('bilivideo') ||
          hostname.includes('hdslb.com')
        ) {
          details.requestHeaders['Referer'] = 'https://www.bilibili.com/'
          details.requestHeaders['Origin'] = 'https://www.bilibili.com'
          details.requestHeaders['User-Agent'] =
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        callback({ requestHeaders: details.requestHeaders })
      })

      playerWin.webContents.on('did-finish-load', () => {
        console.log('✅ [系统] 页面加载完成，启动播放器容器...')

        if (coWatchInterval) clearInterval(coWatchInterval)

        const injectMagicJS = `
          (function() {
            if (document.getElementById('titanium-drag-wrap')) return;

            const style = document.createElement('style');
            style.innerHTML = \`
              /* 精确隐藏页面级 UI，避免误伤播放器内部元素 */
              #biliMainHeader, .bili-header, #bili-header-container, .header-v3,
              .left-container-under-player, .video-toolbar-v1, .video-toolbar-container,
              .right-container, .right-container-inner, .recommend-list-v1,
              .reply-wrap, .comment-wrap, .note-pc,
              .pop-live-room, .bottom-right-ad, .bili-dialog-wrap,
              .palette-button-wrap, .fixed-sidenav-opt, .sidenav-v2, .voya-sidenav,
              .storage-side-bar, .bili-sider {
                display: none !important;
                opacity: 0 !important;
                pointer-events: none !important;
                width: 0 !important; height: 0 !important;
                position: absolute !important; left: -9999px !important;
              }

              html, body { overflow: hidden !important; background: #000 !important; width: 100vw !important; height: 100vh !important; margin: 0 !important; padding: 0 !important; }

              /* 全屏填充播放器 */
              #bilibili-player, .bpx-player-container, #bilibili-player-wrap {
                position: fixed !important; top: 0 !important; left: 0 !important;
                width: 100vw !important; height: 100vh !important;
                z-index: 2147483647 !important;
                margin: 0 !important; padding: 0 !important; border: none !important;
                border-radius: 0 !important; background: #000 !important;
              }

              .bpx-player-primary-area, .bpx-player-video-area { width: 100% !important; height: 100% !important; }

              /* 隐藏部分播放器控件与广告，保留核心播放功能 */
              .bpx-player-sending-area, .bpx-player-sending-bar,
              .bpx-player-cmd-popup, .bpx-player-top-left-follow,
              .bpx-player-top-issue, .bpx-player-ending-wrap, .bpx-player-ending-panel,
              .bpx-player-bhh-msg, .bpx-player-ctrl-nota,
              .bpx-player-ctrl-pip, .bpx-player-top-right-wrap {
                display: none !important;
              }

              /* 弹幕容器保留在原位供 AI 嗅探，但不可见且不拦截鼠标 */
              .bpx-player-danmaku { opacity: 0.001 !important; pointer-events: none !important; }

              /* 自定义拖拽栏与关闭按钮 */
              #titanium-drag-wrap { position: fixed; top: 0; left: 0; width: 100vw; height: 40px; z-index: 2147483647; -webkit-app-region: drag; display: flex; align-items: center; justify-content: center; background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent); opacity: 0; transition: opacity 0.3s; color: rgba(255,255,255,0.8); font-family: monospace; font-size: 12px; pointer-events: none; }
              body:hover #titanium-drag-wrap { opacity: 1; }

              #titanium-close-btn { position: fixed; top: 10px; right: 10px; width: 32px; height: 32px; border-radius: 8px; background: rgba(0, 0, 0, 0.5); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 2147483647; backdrop-filter: blur(4px); border: none; transition: all 0.2s ease; -webkit-app-region: no-drag; opacity: 0; }
              body:hover #titanium-close-btn { opacity: 1; }
              #titanium-close-btn:hover { background: rgba(251, 114, 153, 0.9); transform: scale(1.05); }
            \`;
            document.head.appendChild(style);

            const dragWrap = document.createElement('div');
            dragWrap.id = 'titanium-drag-wrap';
            dragWrap.innerText = 'BILI ASSISTANT | IMMERSIVE PLAYER';
            document.body.appendChild(dragWrap);

            const closeBtn = document.createElement('button');
            closeBtn.id = 'titanium-close-btn';
            closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            closeBtn.onclick = function() { window.location.href = "titanium://close-window"; };
            document.body.appendChild(closeBtn);

            // 阻止外部弹窗（保留播放器内必要的浮层）
            const origOpen = window.open;
            window.open = function(url, target, features) {
              if (typeof url === 'string' && url.startsWith('http')) return null;
              return origOpen.apply(this, arguments);
            };

            // 定时清理残留的页面级 UI，避免误删播放器内部动态节点
            const garbageCollector = () => {
              try {
                const selectors = [
                  '.bili-sider', '.fixed-sidenav-opt', '.sidenav-v2', '.voya-sidenav',
                  '.right-side-bar', '.v-side-bar', '.storage-side-bar', '.palette-button-wrap'
                ];
                selectors.forEach(sel => {
                  document.querySelectorAll(sel).forEach(el => {
                    if (el && el.style) el.style.display = 'none';
                  });
                });
              } catch (e) {}
            };

            setTimeout(garbageCollector, 2000);
            window.setInterval(garbageCollector, 30000);

            // 播放器就绪后触发全屏自适应与自动播放
            let attempts = 0;
            const boot = setInterval(() => {
              const video = document.querySelector('video');
              const player = document.querySelector('.bpx-player-container');
              if (video && player) {
                window.dispatchEvent(new Event('resize'));
                if (video.paused) {
                  video.muted = false;
                  video.play().catch(() => {});
                }
                attempts++;
                if (attempts > 15 || video.readyState > 2) clearInterval(boot);
              }
            }, 600);
          })();
        `
        // 💥 延迟注入，确保渲染进程完全就绪，避免 GUEST_VIEW_MANAGER_CALL 错误
        setTimeout(() => {
          if (!playerWin || playerWin.isDestroyed()) return
          playerWin.webContents.executeJavaScript(injectMagicJS).catch(console.error)
        }, 500)

        // ==========================================
        // 🌟 智能伴看嗅探器 (保持原样不动)
        // ==========================================
        let lastDanmakuCount = 0
        let lastTitle = ''
        let emptyStreak = 0 // 连续无弹幕轮次计数

        // 💥 读取用户设置的吐槽参数
        const llmSettings = store.get('llmSettings') as unknown as LlmSettings | undefined
        const coWatchCooldown = (llmSettings?.danmakuCooldown ?? 30) * 1000
        const coWatchProbability = llmSettings?.danmakuProbability ?? 0.3
        const coWatchPrompt = llmSettings?.danmakuSystemPrompt || ''

        setTimeout(() => {
          console.log(`👀 [伴看引擎] 嗅探器已挂载，间隔 ${coWatchCooldown}ms，概率 ${coWatchProbability}`)

          coWatchInterval = setInterval(async () => {
            if (!playerWin || playerWin.isDestroyed()) return
            if (playerWin.webContents.isLoading()) return
            if (!isAssistantEnabled()) return

            // 💥 弹幕吐槽总开关检查
            const latestLlmSettings = store.get('llmSettings') as unknown as LlmSettings | undefined
            if (latestLlmSettings?.enableDanmakuVibe === false) {
              console.log('🚫 [伴看] 弹幕吐槽已关闭，跳过本轮')
              return
            }

            // 💥 概率命中检查
            if (Math.random() > coWatchProbability) {
              console.log('🎲 [伴看] 未命中吐槽概率，跳过本轮')
              return
            }

            try {
              const scrapData = await playerWin.webContents.executeJavaScript(`
                (() => {
                  const title = document.title.replace('_哔哩哔哩_bilibili', '').replace(' - 哔哩哔哩', '').trim();
                  let dms = [];

                  // 策略1：优先读取弹幕容器 innerText（最可靠，兼容B站新版DOM）
                  const dmWrap = document.querySelector('.bpx-player-row-dm-wrap') ||
                                 document.querySelector('.bili-danmaku-x') ||
                                 document.querySelector('.bpx-player-danmaku') ||
                                 document.querySelector('.bpx-player-dm-wrap');
                  if (dmWrap) {
                    const text = (dmWrap.innerText || dmWrap.textContent || '').trim();
                    if (text) {
                      dms = text.split(/\\n|\\r/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 100);
                    }
                  }

                  // 策略2：兜底按具体弹幕节点选择
                  if (dms.length === 0) {
                    const dmNodes = document.querySelectorAll(
                      '.bpx-player-dm-item, .danmaku-item, .bili-danmaku-x-item, ' +
                      '.dm-item, .bullet-item, [class*="danmaku"], [class*="dm-"], ' +
                      '.bpx-player-dm-wrap span, .bpx-player-dm-container span, ' +
                      '[data-type="danmaku"], [role="danmaku"]'
                    );
                    dms = Array.from(dmNodes).map(n => n.textContent || n.innerText).filter(Boolean);
                  }

                  const uniqueDms = [...new Set(dms)];
                  return { title, dms: uniqueDms.slice(-8) };
                })()
              `)

              if (scrapData && scrapData.title && !scrapData.title.includes('出错')) {
                const currentDmCount = scrapData.dms.length
                const titleChanged = scrapData.title !== lastTitle
                const hasNewDanmaku = currentDmCount !== lastDanmakuCount
                // 💥 修复：连续3轮无弹幕也强制触发一次标题兜底吐槽，避免死锁
                const forceTitleVibe = currentDmCount === 0 && emptyStreak >= 2

                if (hasNewDanmaku || titleChanged || forceTitleVibe) {
                  lastDanmakuCount = currentDmCount
                  lastTitle = scrapData.title
                  if (currentDmCount > 0) {
                    emptyStreak = 0
                  } else {
                    emptyStreak++
                  }

                  let userMsg = ''
                  let sysPrompt = ''

                  if (scrapData.dms.length > 0) {
                    console.log(`\n📺 [伴看] 抓到弹幕: ${scrapData.dms.join(' | ')}`)
                    userMsg = `正在看《${scrapData.title}》，弹幕："${scrapData.dms.join(' | ')}"`
                    sysPrompt = coWatchPrompt || `你正在陪我一起看B站视频。请像一个傲娇、幽默或可爱的二次元伙伴一样，针对弹幕给出吐槽或共鸣。必须非常口语化，不超过30个字！结尾带"喵"或"哩"。`
                  } else {
                    console.log(`\n📭 [伴看] 无弹幕，启动视频标题兜底吐槽: ${scrapData.title}`)
                    userMsg = `正在看《${scrapData.title}》，没有弹幕`
                    sysPrompt = coWatchPrompt || `你正在陪我一起看B站视频。现在没有弹幕。请像一个幽默可爱的二次元伙伴一样，直接针对视频标题吐槽一下或表达期待。必须非常口语化，不超过30个字！结尾带"喵"或"哩"。`
                  }

                  console.log('🤖 [伴看引擎] 呼叫大脑处理...')
                  const vibeComment = await generateAIResponse(userMsg, sysPrompt, true)
                  console.log('🤖 [伴看引擎] AI 生成结果:', vibeComment)

                  if (vibeComment) {
                    console.log(`✨ [伴看引擎] 发送气泡: ${vibeComment}`)
                    sendVibeToAssistant(vibeComment)
                  } else {
                    console.log('❌ [伴看引擎] AI 生成失败或为空')
                  }
                } else {
                  emptyStreak++
                }
              }
            } catch (e) {
              console.log('❌ [伴看嗅探器] 抓取异常:', e)
            }
          }, coWatchCooldown)
        }, 5000)
      })

      playerWin.webContents.setWindowOpenHandler(() => {
        return { action: 'deny' }
      })

      playerWin.webContents.on('will-navigate', (e: ElectronEvent, url: string) => {
        if (url.includes('titanium://close-window')) {
          e.preventDefault()
          const mainWindow = BrowserWindow.getAllWindows().find((w) => w !== playerWin)
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.show()
            mainWindow.focus()
          }
          playerWin?.close()
          return
        }
        // 允许 Bilibili 主站内的视频/番剧/课堂页面，阻止外部跳转
        if (!url.startsWith('https://www.bilibili.com/')) {
          e.preventDefault()
        }
      })

      playerWin.on('closed', (): void => {
        if (coWatchInterval) clearInterval(coWatchInterval)
        if (garbageCollectorInterval) clearInterval(garbageCollectorInterval)
        coWatchInterval = null
        garbageCollectorInterval = null
        playerWin = null
      })

      const mainSiteUrl = `https://www.bilibili.com/video/${bvid}?autoplay=1`
      await playerWin.loadURL(mainSiteUrl, {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      })
    }
  )
}
