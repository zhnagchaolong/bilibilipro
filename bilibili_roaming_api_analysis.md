# B站"哔哩哔哩漫剧出差"主页动态与视频API接口分析报告

> 文档生成日期：2026-04-27
> 用途：供漫游(Roaming)开发参考

---

## 一、目标账号信息

| 属性 | 值 |
|------|-----|
| 新账号名称 | 番劇出差 |
| 新账号UID | `3546379938957500` |
| 旧账号名称 | 哔哩哔哩番剧出差 |
| 旧账号UID | `299310982` |
| 空间主页 | https://space.bilibili.com/3546379938957500 |
| 账号类型 | 港澳台番剧官方号 |
| 区域限制 | 仅限港澳台地区访问 |

---

## 二、核心API接口总览

### 2.1 接口清单

| 接口类别 | 接口地址 | 鉴权方式 | 用途 |
|----------|---------|----------|------|
| 用户信息 | `/x/space/wbi/acc/info` | WBI签名 | 获取UP主详细信息 |
| 视频列表 | `/x/space/wbi/arc/search` | WBI签名 | 获取投稿视频列表 |
| 空间动态 | `/x/polymer/web-dynamic/v1/feed/space` | Cookie+风控 | 获取空间动态列表 |
| 空间图文 | `/x/polymer/web-dynamic/v1/opus/feed/space` | WBI签名 | 获取图文动态 |
| 置顶视频 | `/x/space/top/arc` | 无需鉴权 | 获取置顶视频 |
| 番剧信息 | `/pgc/view/web/season` | 无需鉴权 | 获取番剧 season 详情 |
| 番剧分集 | `/pgc/web/season/section` | 无需鉴权 | 获取番剧分集列表 |
| 剧集信息 | `/pgc/review/user` | Cookie | 通过 mdid 查询剧集 |
| PGC播放地址 | `/pgc/player/web/playurl` | Cookie+区域 | 获取番剧视频流地址 |
| PGC播放地址(APP) | `/pgc/player/api/playurl` | APP签名 | APP端获取视频流 |
| 东南亚播放 | `/intl/gateway/v2/ogv/playurl` | 无需鉴权 | 东南亚区播放地址 |
| 东南亚字幕 | `/intl/gateway/v2/app/subtitle` | 无需鉴权 | 东南亚区字幕 |
| WBI密钥获取 | `/x/web-interface/nav` | 无需鉴权 | 获取WBI签名密钥 |

---

## 三、用户信息API

### 3.1 用户空间详细信息

```
GET https://api.bilibili.com/x/space/wbi/acc/info
```

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| mid | num | 是 | 目标用户UID |
| w_rid | str | 是 | WBI签名 |
| wts | num | 是 | UNIX秒级时间戳 |
| platform | str | 否 | 平台标识，如 `web` |
| web_location | str | 否 | 如 `1550101` |

**响应字段（data对象）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| mid | num | 用户UID |
| name | str | 用户名 |
| sex | str | 性别 |
| face | str | 头像URL |
| sign | str | 个性签名 |
| rank | num | 用户等级相关 |
| level | num | 当前等级 0-6 |
| silence | num | 封禁状态 0正常 1被封 |
| coins | num | 硬币数 |
| fans | num | 粉丝数 |
| attention | num | 关注数 |
| official | obj | 认证信息 |
| vip | obj | 大会员状态 |
| face_nft | num | 是否为NFT头像 |

**请求示例：**
```bash
curl -G 'https://api.bilibili.com/x/space/wbi/acc/info' \
  --data-urlencode 'mid=3546379938957500' \
  --data-urlencode 'wts=1709535813' \
  --data-urlencode 'w_rid=xxxxxxxxx'
```

---

## 四、视频列表API

### 4.1 查询用户投稿视频明细

```
GET https://api.bilibili.com/x/space/wbi/arc/search
```

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| mid | num | 是 | 目标用户UID |
| pn | num | 否 | 页码，默认1 |
| ps | num | 否 | 每页项数，默认30，最大50 |
| tid | num | 否 | 分区ID，0为不进行分区筛选 |
| order | str | 否 | 排序方式：`pubdate`(最新发布), `click`(最多播放), `stow`(最多收藏) |
| keyword | str | 否 | 关键词搜索 |
| platform | str | 否 | `web` |
| web_location | str | 否 | `1550101` |
| order_avoided | str | 否 | `true`（未登录时需要） |
| dm_img_list | str | 否 | `[]`（风控参数） |
| dm_img_str | str | 否 | 风控参数 |
| dm_cover_img_str | str | 否 | 风控参数 |
| w_rid | str | 是 | WBI签名 |
| wts | num | 是 | UNIX秒级时间戳 |

**响应字段：**

`data` 对象：

| 字段 | 类型 | 说明 |
|------|------|------|
| list | obj | 列表信息 |
| page | obj | 分页信息 |
| episodic_button | obj | "播放全部"按钮信息 |

`data.page` 对象：

| 字段 | 类型 | 说明 |
|------|------|------|
| count | num | 总稿件数 |
| pn | num | 当前页码 |
| ps | num | 每页项数 |

`data.list.vlist` 数组项（视频信息）：

| 字段 | 类型 | 说明 |
|------|------|------|
| aid | num | 稿件avid |
| bvid | str | 稿件bvid |
| title | str | 稿件标题 |
| pic | str | 封面图URL |
| play | num | 播放量 |
| video_review | num | 弹幕数 |
| created | num | 发布时间戳 |
| length | str | 视频时长 |
| author | str | UP主名称 |
| description | str | 简介 |
| comment | num | 评论数 |
| typeid | num | 分区ID |
| is_pay | num | 是否付费视频 |

**请求示例：**
```bash
curl -G 'https://api.bilibili.com/x/space/wbi/arc/search' \
  --data-urlencode 'mid=3546379938957500' \
  --data-urlencode 'ps=30' \
  --data-urlencode 'pn=1' \
  --data-urlencode 'order=pubdate' \
  --data-urlencode 'order_avoided=true' \
  --data-urlencode 'dm_img_list=[]' \
  --data-urlencode 'dm_img_str=V2ViR0wgMS' \
  --data-urlencode 'dm_cover_img_str=SW50ZWwoUikgSEQgR3JhcGhpY3NJbnRlbA' \
  --data-urlencode 'wts=1709535813' \
  --data-urlencode 'w_rid=xxxxxxxxx'
```

---

## 五、空间动态API

### 5.1 获取用户空间动态

```
GET https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space
```

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| host_mid | num | 是 | 目标用户UID |
| offset | str | 否 | 分页偏移量，首次请求留空 |
| type | str | 否 | `all`(全部), `article`(专栏), `dynamic`(动态) |
| web_location | str | 否 | `333.1387` |
| w_rid | str | 否 | WBI签名 |
| wts | num | 否 | UNIX秒级时间戳 |

**响应字段：**

`data` 对象：

| 字段 | 类型 | 说明 |
|------|------|------|
| has_more | bool | 是否还有更多 |
| items | array | 动态列表 |
| offset | str | 下一页偏移量 |
| update_num | num | 更新数 |

**item对象核心字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id_str | str | 动态ID |
| type | str | 动态类型 |
| modules | obj | 动态内容模块 |

**modules结构：**

| 模块 | 说明 |
|------|------|
| module_author | 作者信息，含 `pub_ts`(发布时间戳), `pub_time`(格式化时间), `name`, `face`, `mid` |
| module_dynamic | 动态内容，含文本/图片/视频 |
| module_stat | 统计数据，含点赞/评论/转发数 |

**请求示例：**
```bash
# 首次请求
curl -G 'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space' \
  --data-urlencode 'host_mid=3546379938957500' \
  --data-urlencode 'offset='

# 翻页请求
curl -G 'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space' \
  --data-urlencode 'host_mid=3546379938957500' \
  --data-urlencode 'offset=745553469258678272'
```

### 5.2 获取用户空间图文（Opus）

```
GET https://api.bilibili.com/x/polymer/web-dynamic/v1/opus/feed/space
```

**参数与主动态接口相同**，但仅返回图文内容。

---

## 六、番剧信息API

### 6.1 获取剧集明细（Web端）

```
GET https://api.bilibili.com/pgc/view/web/season
```

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| season_id | num | 二选一 | 番剧ssid |
| ep_id | num | 二选一 | 剧集epid |

**响应字段（result对象）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| season_id | num | 季度ID |
| title | str | 番剧标题 |
| cover | str | 封面图URL |
| episodes | array | 剧集列表 |
| evaluate | str | 番剧简介 |
| areas | array | 地区信息 |
| publish | obj | 发布信息 |
| rating | obj | 评分信息 |
| stat | obj | 统计数据 |

**episodes数组项核心字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| ep_id | num | 剧集ID |
| aid | num | 视频avid |
| bvid | str | 视频bvid |
| cid | num | 视频cid（弹幕/播放用） |
| title | str | 标题 |
| long_title | str | 长标题 |
| cover | str | 封面图 |
| badge | str | 标签，如"会员"、"限免" |
| status | num | 发布状态 |

**请求示例：**
```bash
curl -G 'https://api.bilibili.com/pgc/view/web/season' \
  --data-urlencode 'season_id=42291'

curl -G 'https://api.bilibili.com/pgc/view/web/season' \
  --data-urlencode 'ep_id=723593'
```

### 6.2 获取剧集分集信息

```
GET https://api.bilibili.com/pgc/web/season/section
```

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| season_id | num | 是 | 季度ID |

**响应包含：**
- `main_section` - 正片列表
- `section` - 其他片段（PV、花絮等）

### 6.3 获取剧集基本信息（mdid方式）

```
GET https://api.bilibili.com/pgc/review/user
```

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| media_id | num | 是 | 媒体ID |

---

## 七、播放地址API（漫游核心）

### 7.1 Web端PGC播放地址

```
GET https://api.bilibili.com/pgc/player/web/playurl
```

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| ep_id | num | 二选一 | 剧集epid |
| cid | num | 二选一 | 视频cid |
| qn | num | 否 | 清晰度，80=1080P, 64=720P, 32=480P, 16=360P |
| fnval | num | 否 | 视频格式，16=DASH, 0=FLV |
| fnver | num | 否 | 版本，默认0 |
| fourk | num | 否 | 是否允许4K，1=是 |
| bvid | str | 否 | 视频bvid |
| session | str | 否 | 会话ID |
| otype | str | 否 | 输出格式，`json` |
| platform | str | 否 | `web` |
| area | str | 否 | 区域代码，`hk`(香港), `tw`(台湾), `th`(泰国), `cn`(大陆) |

**响应字段（result对象）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| dash | obj | DASH格式视频/音频流 |
| durl | array | FLV格式直接播放地址 |
| support_formats | array | 支持的清晰度列表 |
| accept_quality | array | 支持的quality值列表 |
| quality | num | 当前返回的quality |
| timelength | num | 视频时长(ms) |

**DASH格式结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| duration | num | 时长(秒) |
| video | array | 视频流列表，含不同清晰度 |
| audio | array | 音频流列表 |

**视频流项字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| base_url | str | 视频流地址 |
| backup_url | array | 备用地址 |
| bandwidth | num | 码率 |
| codecs | str | 编码格式 |
| width | num | 宽度 |
| height | num | 高度 |
| id | num | quality值 |

**错误码说明：**

| 错误码 | 含义 |
|--------|------|
| 0 | 成功 |
| -10403 | 所在地区不可观看（区域限制） |
| -403 | 访问权限不足 |
| -404 | 内容不存在 |
| -412 | 请求被拦截（风控） |
| -352 | 风控校验失败 |

### 7.2 APP端PGC播放地址

```
GET https://api.bilibili.com/pgc/player/api/playurl
```

参数与Web端基本一致，但鉴权方式使用APP签名（appkey+sign）。

### 7.3 东南亚番剧播放地址

```
GET https://api.global.bilibili.com/intl/gateway/v2/ogv/playurl
```

**上游域名：** `api.global.bilibili.com`

### 7.4 东南亚番剧字幕

```
GET https://app.global.bilibili.com/intl/gateway/v2/app/subtitle
```

**上游域名：** `app.global.bilibili.com`（注意与播放地址不同）

### 7.5 东南亚搜索

```
GET https://app.global.bilibili.com/intl/gateway/v2/app/search/type
```

---

## 八、WBI签名算法

### 8.1 签名流程

B站Web端大部分查询接口自2023年3月起使用WBI签名鉴权。

**步骤1：获取实时口令**

```
GET https://api.bilibili.com/x/web-interface/nav
```

从响应中提取：
- `data.wbi_img.img_url` -> 截取文件名作为 `img_key`
- `data.wbi_img.sub_url` -> 截取文件名作为 `sub_key`

**示例：**
```json
{
  "data": {
    "wbi_img": {
      "img_url": "https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png",
      "sub_url": "https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png"
    }
  }
}
```
得到：`img_key=7cd084941338484aae1ad9425b84077c`，`sub_key=4932caff0ff746eab6f01bf08b70ac45`

**步骤2：打乱重排获得mixin_key**

```javascript
const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52
];

// 拼接img_key+sub_key
const raw_wbi_key = img_key + sub_key; // 64位字符

// 按映射表重排，取前32位
let mixin_key = '';
for (const i of MIXIN_KEY_ENC_TAB) {
  mixin_key += raw_wbi_key[i];
}
mixin_key = mixin_key.slice(0, 32);
```

**步骤3：计算签名（w_rid）**

```javascript
// 1. 添加wts时间戳参数
params['wts'] = Math.floor(Date.now() / 1000);

// 2. 过滤value中的特殊字符 !'()*
const chr_filter = /[!'()*]/g;
for (const key in params) {
  params[key] = params[key].toString().replace(chr_filter, '');
}

// 3. 按键名升序排序
const sorted_keys = Object.keys(params).sort();

// 4. URL编码拼接（大写编码，空格编码为%20）
const query = sorted_keys.map(key => {
  return `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
}).join('&');

// 5. 拼接mixin_key计算MD5
const w_rid = md5(query + mixin_key);
```

**步骤4：添加到请求参数**

将 `wts` 和 `w_rid` 追加到原始请求参数中。

### 8.2 密钥有效期

- `img_key` 和 `sub_key` 每日更替
- 建议缓存并定期刷新（每天刷新一次）

### 8.3 多语言实现参考

以下提供各语言的核心实现片段：

**JavaScript:**
```javascript
const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52
];

function getMixinKey(orig) {
  return MIXIN_KEY_ENC_TAB.map(i => orig[i]).join('').slice(0, 32);
}

function encWbi(params, img_key, sub_key) {
  const mixin_key = getMixinKey(img_key + sub_key);
  const wts = Math.floor(Date.now() / 1000);
  const chr_filter = /[!'()*]/g;
  
  Object.assign(params, { wts });
  const query = Object.keys(params).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k].toString().replace(chr_filter, ''))}`)
    .join('&');
  
  const w_rid = md5(query + mixin_key);
  return { ...params, w_rid };
}
```

**Python:**
```python
import hashlib
import time
import urllib.parse

MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
    61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
    36, 20, 34, 44, 52
]

def get_mixin_key(img_key: str, sub_key: str) -> str:
    orig = img_key + sub_key
    return ''.join([orig[i] for i in MIXIN_KEY_ENC_TAB])[:32]

def enc_wbi(params: dict, img_key: str, sub_key: str) -> dict:
    mixin_key = get_mixin_key(img_key, sub_key)
    params['wts'] = int(time.time())
    
    # 过滤特殊字符
    chr_filter = set("!'()*")
    filtered = {k: ''.join(c for c in str(v) if c not in chr_filter) 
                for k, v in params.items()}
    
    # 排序并编码
    query = '&'.join(f"{urllib.parse.quote(k)}={urllib.parse.quote(v)}" 
                     for k, v in sorted(filtered.items()))
    
    params['w_rid'] = hashlib.md5((query + mixin_key).encode()).hexdigest()
    return params
```

---

## 九、漫游开发拦截指南

### 9.1 区域限制原理

B站通过以下方式限制区域：
1. **IP地理定位** - 根据请求IP判断所属地区
2. **CDN节点限制** - 不同地区CDN提供不同内容
3. **API响应过滤** - 服务器返回 `-10403` 错误码

### 9.2 漫游核心拦截目标

**主要拦截接口：**

| 接口 | 用途 | 代理上游 |
|------|------|----------|
| `/pgc/player/web/playurl` | Web端播放地址 | `api.bilibili.com` |
| `/pgc/player/api/playurl` | APP端播放地址 | `api.bilibili.com` |
| `/pgc/view/web/season` | 番剧信息 | `api.bilibili.com` |
| `/intl/gateway/v2/ogv/playurl` | 东南亚播放 | `api.global.bilibili.com` |
| `/intl/gateway/v2/app/subtitle` | 东南亚字幕 | `app.global.bilibili.com` |

### 9.3 请求头标识

哔哩漫游客户端会在请求中带上特殊头：

```
X-From-Biliroaming: {版本号}
```

解析服务器可通过检查此头来防止盗用。

### 9.4 区域参数

客户端会在请求中添加 `area` 参数：

| 区域代码 | 含义 |
|----------|------|
| cn | 中国大陆 |
| hk | 中国香港 |
| tw | 中国台湾 |
| th | 泰国/东南亚 |

### 9.5 漫游请求流程

```
用户请求 -> 客户端拦截 -> 添加area参数 -> 发送到解析服务器 
-> 解析服务器转发到B站API -> 获取播放地址 -> 返回给用户
```

### 9.6 解析服务器Nginx参考配置

```nginx
server {
    server_name bili.example.com;
    listen 443 ssl http2;
    client_max_body_size 128M;

    # 港澳台/中国大陆番剧
    location /pgc/player/api/playurl {
        proxy_pass https://api.bilibili.com;
        if ($http_x_from_biliroaming ~ "^$") {
            return 403;
        }
    }

    # 东南亚番剧
    location /intl/gateway/v2/ogv/playurl {
        proxy_pass https://api.global.bilibili.com;
        if ($http_x_from_biliroaming ~ "^$") {
            return 403;
        }
    }

    # 东南亚字幕
    location /intl/gateway/v2/app/subtitle {
        proxy_pass https://app.global.bilibili.com;
        if ($http_x_from_biliroaming ~ "^$") {
            return 403;
        }
    }

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
}
```

### 9.7 开发建议

1. **缓存策略** - 播放地址有效期约2小时，建议缓存1-2小时
2. **错误缓存** - 缓存 `code=-10493`（区域不可看）的结果，避免重复请求
3. **频率限制** - 对单个用户(access_key)限制请求次数
4. **IP封禁处理** - B站会临时封禁大量请求的IP，做好容错
5. **UA模拟** - 请求B站API时需带上合理的User-Agent
6. **Referer设置** - 播放1080P及以上需要设置Referer为 `https://www.bilibili.com`

---

## 十、番剧出差账号的特殊性

### 10.1 区域限制表现

| 场景 | 大陆IP | 港澳台IP |
|------|--------|----------|
| 访问空间主页 | 可能404或内容不全 | 正常显示 |
| 获取视频列表 | 返回空/错误 | 正常返回 |
| 播放番剧视频 | -10403地区不可看 | 正常播放 |
| 查看动态 | 部分动态不可见 | 完整可见 |

### 10.2 漫游处理建议

对于"番劇出差"账号的内容获取：

1. **用户信息获取** - 使用 `/x/space/wbi/acc/info` 获取基础信息
2. **视频列表获取** - 使用 `/x/space/wbi/arc/search` 分页获取
3. **动态获取** - 使用 `/x/polymer/web-dynamic/v1/feed/space` 循环拉取
4. **番剧播放** - 通过 `/pgc/view/web/season` 获取剧集信息，再通过代理的 `/pgc/player/web/playurl` 获取播放地址

---

## 十一、完整请求链路示例

### 11.1 获取番剧出差视频列表

```python
import requests
import hashlib
import time
import urllib.parse

# WBI签名相关
MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
    61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
    36, 20, 34, 44, 52
]

def get_mixin_key(img_key, sub_key):
    orig = img_key + sub_key
    return ''.join([orig[i] for i in MIXIN_KEY_ENC_TAB])[:32]

def get_wbi_keys():
    """获取WBI密钥"""
    resp = requests.get('https://api.bilibili.com/x/web-interface/nav')
    data = resp.json()
    img_url = data['data']['wbi_img']['img_url']
    sub_url = data['data']['wbi_img']['sub_url']
    img_key = img_url.split('/')[-1].split('.')[0]
    sub_key = sub_url.split('/')[-1].split('.')[0]
    return img_key, sub_key

def enc_wbi(params, img_key, sub_key):
    """WBI签名"""
    mixin_key = get_mixin_key(img_key, sub_key)
    params['wts'] = int(time.time())
    chr_filter = set("!'()*")
    filtered = {k: ''.join(c for c in str(v) if c not in chr_filter) 
                for k, v in params.items()}
    query = '&'.join(f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(v, safe='')}" 
                     for k, v in sorted(filtered.items()))
    params['w_rid'] = hashlib.md5((query + mixin_key).encode()).hexdigest()
    return params

def get_videos(mid, page=1, page_size=30):
    """获取用户视频列表"""
    img_key, sub_key = get_wbi_keys()
    
    params = {
        'mid': mid,
        'ps': page_size,
        'pn': page,
        'order': 'pubdate',
        'platform': 'web',
        'web_location': '1550101',
        'order_avoided': 'true',
        'dm_img_list': '[]',
        'dm_img_str': 'V2ViR0wgMS',
        'dm_cover_img_str': 'SW50ZWwoUikgSEQgR3JhcGhpY3NJbnRlbA'
    }
    
    signed_params = enc_wbi(params, img_key, sub_key)
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': f'https://space.bilibili.com/{mid}'
    }
    
    resp = requests.get(
        'https://api.bilibili.com/x/space/wbi/arc/search',
        params=signed_params,
        headers=headers
    )
    return resp.json()

# 获取番剧出差视频列表
result = get_videos('3546379938957500')
print(f"总视频数: {result['data']['page']['count']}")
for video in result['data']['list']['vlist']:
    print(f"- {video['title']} ({video['bvid']})")
```

### 11.2 获取番剧出差动态

```python
def get_dynamics(host_mid):
    """获取用户空间动态"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': f'https://space.bilibili.com/{host_mid}/dynamic',
        'Cookie': 'buvid3=xxxx;'  # 需要有效的buvid3
    }
    
    all_items = []
    offset = ''
    
    while True:
        params = {
            'host_mid': host_mid,
            'offset': offset
        }
        
        resp = requests.get(
            'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space',
            params=params,
            headers=headers
        )
        data = resp.json()
        
        if data['code'] != 0:
            print(f"Error: {data}")
            break
        
        items = data['data']['items']
        all_items.extend(items)
        
        if not data['data']['has_more']:
            break
        
        offset = data['data']['offset']
    
    return all_items

# 获取番剧出差动态
dynamics = get_dynamics('3546379938957500')
for item in dynamics[:10]:
    author = item['modules']['module_author']
    print(f"[{author['pub_time']}] {author['name']}: {item['id_str']}")
```

### 11.3 通过代理获取番剧播放地址

```python
def get_pgc_playurl_via_proxy(ep_id, cid, area='hk', proxy_server='https://your-proxy.com'):
    """通过解析服务器获取番剧播放地址"""
    params = {
        'ep_id': ep_id,
        'cid': cid,
        'qn': 80,          # 1080P
        'fnval': 16,       # DASH格式
        'fnver': 0,
        'fourk': 1,
        'area': area,      # hk, tw, th, cn
        'otype': 'json',
        'platform': 'web'
    }
    
    resp = requests.get(
        f'{proxy_server}/pgc/player/web/playurl',
        params=params,
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    return resp.json()
```

---

## 十二、附录

### 12.1 清晰度(quality)对照表

| qn值 | 清晰度 | 备注 |
|------|--------|------|
| 112 | 1080P+ 高码率 | 需大会员 |
| 80 | 1080P 高清 | 需登录 |
| 64 | 720P 高清 | 需登录 |
| 32 | 480P 清晰 | 无需登录 |
| 16 | 360P 流畅 | 无需登录 |

### 12.2 视频格式(fnval)位掩码

| 位 | 值 | 含义 |
|----|-----|------|
| 0 | 1 | FLV格式 |
| 1 | 2 | MP4格式 |
| 2 | 4 | DASH格式（推荐） |
| 3 | 8 | HDR视频 |
| 4 | 16 | 4K分辨率 |
| 5 | 32 | DOLBY AUDIO |
| 6 | 64 | DOLBY VISION |
| 7 | 128 | 8K分辨率 |

常用组合：`16`(DASH), `4048`(DASH+4K+HDR+杜比)

### 12.3 常见错误码

| 错误码 | 含义 | 解决方案 |
|--------|------|----------|
| 0 | 成功 | - |
| -101 | 账号未登录 | 补充Cookie/SESSDATA |
| -111 | CSRF校验失败 | 更新csrf token |
| -352 | 风控校验失败 | 检查WBI签名/UA/dm_img参数 |
| -400 | 请求错误 | 检查参数完整性 |
| -403 | 访问权限不足 | 检查Cookie和权限 |
| -404 | 内容不存在 | 检查ID是否正确 |
| -412 | 请求被拦截 | 降低请求频率，检查UA |
| -10403 | 所在地区不可观看 | 使用解析服务器代理 |
| -10493 | 版权受限 | 更换区域尝试 |

### 12.4 参考项目

| 项目 | 地址 | 说明 |
|------|------|------|
| bilibili-API-collect | https://github.com/SocialSisterYi/bilibili-API-collect | B站API文档整理 |
| BiliRoaming | https://github.com/yujincheng08/BiliRoaming | 安卓端漫游模块 |
| BiliRoaming-PHP-Server | https://github.com/david082321/BiliRoaming-PHP-Server | PHP解析服务器 |
| bilibili-helper | https://github.com/ipcjs/bilibili-helper | 油猴脚本版 |
| bilibili-api | https://github.com/nemo2011/bilibili-api | Python API封装 |

---

> 免责声明：本文档仅供技术学习和研究参考。使用B站API请遵守相关法律法规及B站用户协议。漫游开发涉及版权内容跨境访问，请自行评估法律风险。
