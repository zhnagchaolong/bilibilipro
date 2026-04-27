import express from 'express'
import axios from 'axios'
import cors from 'cors'
const app = express()
const PORT = 3000 // 本地运行端口

// 允许跨域（如果在浏览器中直接联调会用到）
app.use(cors())

// 可以在这里加上一个简单的鉴权机制，防止别人扫出你的接口并盗用
// 比如: http://你的服务器IP:3000/proxy?token=你的秘钥&target=目标URL
const SECRET_TOKEN = 'your_super_secret_token_123'

app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.target
  const token = req.headers['x-proxy-auth']

  // 1. 简单的安全校验
  if (token !== SECRET_TOKEN) {
    return res.status(403).json({ error: 'Unauthorized Access' })
  }
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing target URL' })
  }

  try {
    // 2. 提取需要透传的核心 Headers（尤其是身份认证需要用到的）
    const forwardedHeaders = {
      'User-Agent':
        req.headers['user-agent'] ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      // 透传 Cookie (比如 B站的 SESSDATA)
      Cookie: req.headers['cookie'] || '',
      // 防止防盗链拦截
      Referer: 'https://www.bilibili.com',
      Origin: 'https://www.bilibili.com'
    }

    // 3. 代替客户端向目标发起请求
    const response = await axios.get(targetUrl, {
      headers: forwardedHeaders,
      // 增加超时时间，防止接口挂死
      timeout: 10000,
      // 防止 axios 因为状态码不是 2xx 就直接抛异常，我们需要把真实状态码传给前端
      validateStatus: () => true
    })

    // 4. 将目标服务器的 Header（比如 Set-Cookie 等）和数据原封不动返回给客户端
    res.status(response.status).json(response.data)
  } catch (error) {
    console.error(`[Proxy Error] 转发失败: ${error.message}`)
    res.status(500).json({ error: 'Proxy Server Internal Error', details: error.message })
  }
})

app.listen(PORT, '127.0.0.1', () => {
  // 绑定在 127.0.0.1，只允许本机访问，外部流量由 Nginx 接入
  console.log(`Proxy Gateway running on http://127.0.0.1:${PORT}`)
})
