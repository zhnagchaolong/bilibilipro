// 统一的 B站请求头
export const BILI_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://www.bilibili.com/'
}

// 统一的 API 路由
export const API_URLS = {
  NAV: 'https://api.bilibili.com/x/web-interface/nav',
  LOGIN: 'https://passport.bilibili.com/login',
  VIEW: 'https://api.bilibili.com/x/web-interface/view',
  PLAY_URL: 'https://api.bilibili.com/x/player/playurl'
}
