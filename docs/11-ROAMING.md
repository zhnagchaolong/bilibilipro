# 番剧区域解锁 (Roaming) 技术文档

---

## 1. 功能概述

通过拦截 `api.bilibili.com/pgc/...` 相关接口，将请求代理到第三方解析服务器（`kghost.info`），实现番剧区域限制内容的访问。

---

## 2. 核心原理

```
Bilibili 客户端请求
    │
    ▼
┌─────────────────────────────┐
│  Electron WebRequest API     │
│  session.webRequest          │
│  .onBeforeSendHeaders()      │
│  .onHeadersReceived()        │
└─────────────┬───────────────┘
              │
    ┌─────────▼──────────┐
    │  判断是否 PGC 接口   │
    │  (api.bilibili.com) │
    └─────────┬──────────┘
              │
    ┌─────────▼─────────────────────────────┐
    │  是 PGC 请求：转发到 kghost.info       │
    │  - 修改 Host 头                        │
    │  - 注入 Referer / Origin / Cookie      │
    │  - 移除 CSP / CORS 限制头              │
    └─────────┬─────────────────────────────┘
              │
    ┌─────────▼──────────┐
    │  不是 PGC 请求：     │
    │  正常放行            │
    └────────────────────┘
```

---

## 3. 实现代码

### 3.1 智能路由挂载

```typescript
// src/main/ipc/roamingIpc.ts
export function setupSmartRoutingForPartition(partition: string): void {
  const sess = session.fromPartition(partition)

  // 请求发出前：修改目标地址和请求头
  sess.webRequest.onBeforeSendHeaders(
    { urls: ['https://api.bilibili.com/pgc/*'] },
    (details, callback) => {
      // 修改 Host 指向代理服务器
      details.requestHeaders['Host'] = 'kghost.info'

      // 注入合法 Referer 和 Origin
      details.requestHeaders['Referer'] = 'https://www.bilibili.com'
      details.requestHeaders['Origin'] = 'https://www.bilibili.com'

      // 注入用户 Cookie
      const cookie = details.requestHeaders['Cookie'] || ''
      if (cookie) {
        details.requestHeaders['Cookie'] = cookie
      }

      callback({ requestHeaders: details.requestHeaders })
    }
  )

  // 响应返回后：移除安全限制头
  sess.webRequest.onHeadersReceived(
    { urls: ['https://api.bilibili.com/pgc/*'] },
    (details, callback) => {
      const headers = details.responseHeaders || {}

      // 移除 CSP 限制
      delete headers['content-security-policy']
      delete headers['content-security-policy-report-only']

      // 移除 CORS 限制
      delete headers['access-control-allow-origin']
      headers['access-control-allow-origin'] = ['*']
      headers['access-control-allow-credentials'] = ['true']

      callback({ responseHeaders: headers })
    }
  )
}
```

### 3.2 全账号批量挂载

```typescript
export function setupSmartRoutingForAllAccounts(): void {
  const accounts = readAccounts()
  for (const acc of accounts) {
    setupSmartRoutingForPartition(acc.partition)
  }
  // 同时挂载默认 session
  setupSmartRoutingForPartition('')
}
```

---

## 4. 账号关联流程

```
用户添加账号
    │
    ▼
登录窗口（使用 partition: persist:bili-acc-{ts}）
    │
    ▼
登录成功 → 保存 Cookie
    │
    ▼
调用 setupSmartRoutingForPartition(partition)
    │
    ▼
该账号的 Session 启用 roaming 拦截
```

---

## 5. 主进程启动时预加载

```typescript
// src/main/index.ts
app.whenReady().then(() => {
  // 预加载所有已有账号的 roaming 路由
  setupSmartRoutingForAllAccounts()
})
```

这意味着：
- 新增账号时自动挂载拦截器
- 应用重启后自动恢复所有账号的拦截配置
- 无需用户手动开启

---

## 6. 安全与隐私

| 措施 | 说明 |
|------|------|
| 仅拦截 PGC 接口 | `urls: ['https://api.bilibili.com/pgc/*']`，不影响其他 API |
| 保留用户 Cookie | 转发请求时注入原始 Cookie，维持登录状态 |
| 不泄露凭据 | 仅修改请求目标地址和必要头信息，不读取或存储 Cookie 内容 |
| CSP/CORS 降级 | 仅对 PGC 响应移除限制，降低安全风险 |

---

## 7. 故障排查

| 现象 | 可能原因 | 排查方法 |
|------|---------|---------|
| 番剧仍显示区域限制 | 代理服务器不可用 | 检查 `kghost.info` 连通性 |
| 视频无法播放 | Cookie 过期 | 重新登录账号 |
| 页面加载缓慢 | 代理服务器延迟高 | 切换网络环境 |
| 其他功能异常 | 拦截器过度拦截 | 检查 `urls` 过滤规则是否准确 |
