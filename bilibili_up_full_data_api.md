# B站UP主全量数据获取技术文档

> 目标账号：哔哩哔哩漫剧出差（番劇出差）UID: 3546379938957500
> 文档用途：漫游开发、数据采集、UP主数据分析
> 生成日期：2026-04-27

---

## 一、接口总览

| 数据类别 | 接口地址 | 鉴权方式 | 公开性 |
|----------|---------|----------|--------|
| 全部视频 | `/x/space/wbi/arc/search` | WBI签名 | 公开 |
| 全部专栏 | `/x/space/wbi/article` | WBI签名+Cookie | 公开 |
| 全部音频 | `/audio/music-service/web/song/upper` | 无需鉴权 | 公开 |
| 投稿数量统计 | `/x/space/navnum` | 无需鉴权 | 公开 |
| 获赞/播放统计 | `/x/space/upstat` | **Cookie(任意登录态)** | **需登录** |
| 粉丝/关注统计 | `/x/relation/stat` | 无需鉴权 | 公开 |
| 单个视频数据 | `/x/web-interface/archive/stat` | 无需鉴权 | 公开 |
| 视频详细信息 | `/x/web-interface/view` | 无需鉴权 | 公开 |
| 相簿投稿数 | `/link_draw/v1/doc/upload_count` | 无需鉴权 | 公开 |
| 充电公示 | `/x/ugcpay-rank/elec/month/up` | UA标识 | 公开 |

---

## 二、全部视频数据获取

### 2.1 接口说明

```
GET https://api.bilibili.com/x/space/wbi/arc/search
```

**功能**：获取指定UP主的所有投稿视频列表，支持分页遍历获取全部视频。

**鉴权方式**：WBI签名（详见第八章）

### 2.2 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| mid | num | 是 | 目标用户UID，如 3546379938957500 |
| pn | num | 否 | 页码，默认1 |
| ps | num | 否 | 每页项数，默认30，**最大50** |
| tid | num | 否 | 分区ID，0为不进行分区筛选 |
| order | str | 否 | 排序方式：pubdate(最新发布)/click(最多播放)/stow(最多收藏) |
| keyword | str | 否 | 搜索关键词 |
| platform | str | 否 | web |
| web_location | str | 否 | 1550101 |
| order_avoided | str | 否 | true（未登录时必须） |
| dm_img_list | str | 否 | []（风控参数） |
| dm_img_str | str | 否 | V2ViR0wgMS（风控参数） |
| dm_cover_img_str | str | 否 | SW50ZWwoUikgSEQgR3JhcGhpY3NJbnRlbA（风控参数） |
| w_rid | str | 是 | WBI签名 |
| wts | num | 是 | UNIX秒级时间戳 |

### 2.3 响应字段

**data.page 对象（分页信息）**：

| 字段 | 类型 | 说明 |
|------|------|------|
| count | num | **总稿件数**，用于计算总页数 |
| pn | num | 当前页码 |
| ps | num | 每页项数 |

**data.list.vlist 数组项（视频信息）**：

| 字段 | 类型 | 说明 |
|------|------|------|
| aid | num | 稿件avid |
| bvid | str | 稿件bvid |
| title | str | 视频标题 |
| pic | str | 封面图URL |
| play | num | 播放量 |
| video_review | num | 弹幕数 |
| created | num | 发布时间UNIX时间戳 |
| length | str | 视频时长，如"12:34" |
| author | str | UP主名称 |
| description | str | 视频简介 |
| comment | num | 评论数 |
| typeid | num | 分区ID |
| is_pay | num | 是否付费视频 0否 1是 |
| is_union_video | num | 是否联合投稿 |
| is_steins_gate | num | 是否互动视频 |
| is_live_playback | num | 是否直播回放 |

### 2.4 完整分页获取方案

**核心逻辑**：先请求第1页获取`count`总数量，计算总页数，然后循环遍历所有页面。

```python
import requests
import hashlib
import time
import urllib.parse

# WBI签名相关常量
MIXIN_KEY_ENC_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
    61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
    36, 20, 34, 44, 52
]

def get_wbi_keys():
    """获取WBI实时密钥"""
    resp = requests.get('https://api.bilibili.com/x/web-interface/nav')
    data = resp.json()
    img_url = data['data']['wbi_img']['img_url']
    sub_url = data['data']['wbi_img']['sub_url']
    img_key = img_url.split('/')[-1].split('.')[0]
    sub_key = sub_url.split('/')[-1].split('.')[0]
    return img_key, sub_key

def get_mixin_key(img_key, sub_key):
    """计算mixin_key"""
    orig = img_key + sub_key
    return ''.join([orig[i] for i in MIXIN_KEY_ENC_TAB])[:32]

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

def get_all_videos(mid, page_size=50):
    """
    获取UP主全部视频
    
    Args:
        mid: UP主UID
        page_size: 每页数量，最大50
    
    Returns:
        list: 全部视频列表
    """
    img_key, sub_key = get_wbi_keys()
    all_videos = []
    
    # 先获取第1页，得到总数量
    params = {
        'mid': mid,
        'ps': page_size,
        'pn': 1,
        'order': 'pubdate',
        'platform': 'web',
        'web_location': '1550101',
        'order_avoided': 'true',
        'dm_img_list': '[]',
        'dm_img_str': 'V2ViR0wgMS',
        'dm_cover_img_str': 'SW50ZWwoUikgSEQgR3JhcGhpY3NJbnRlbA'
    }
    signed_params = enc_wbi(params.copy(), img_key, sub_key)
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': f'https://space.bilibili.com/{mid}'
    }
    
    resp = requests.get(
        'https://api.bilibili.com/x/space/wbi/arc/search',
        params=signed_params,
        headers=headers
    )
    result = resp.json()
    
    if result['code'] != 0:
        print(f"请求失败: {result}")
        return []
    
    total_count = result['data']['page']['count']
    total_pages = (total_count + page_size - 1) // page_size
    
    # 添加第1页数据
    all_videos.extend(result['data']['list']['vlist'])
    print(f"总视频数: {total_count}, 总页数: {total_pages}")
    
    # 遍历剩余页面
    for page in range(2, total_pages + 1):
        params['pn'] = page
        # 注意：每次请求需要重新计算WBI签名（因为wts时间戳会变）
        signed_params = enc_wbi(params.copy(), img_key, sub_key)
        
        resp = requests.get(
            'https://api.bilibili.com/x/space/wbi/arc/search',
            params=signed_params,
            headers=headers
        )
        result = resp.json()
        
        if result['code'] == 0:
            all_videos.extend(result['data']['list']['vlist'])
            print(f"已获取第 {page}/{total_pages} 页, 本页 {len(result['data']['list']['vlist'])} 条")
        else:
            print(f"第 {page} 页请求失败: {result}")
        
        time.sleep(0.5)  # 限速，避免触发风控
    
    return all_videos

# 获取番剧出差全部视频
videos = get_all_videos('3546379938957500')
print(f"获取完成，共 {len(videos)} 个视频")
```

### 2.5 关键注意事项

| 注意点 | 说明 |
|--------|------|
| **WBI签名时效** | `wts`时间戳每次请求都变化，需重新计算签名 |
| **密钥有效期** | `img_key`和`sub_key`每日更替，建议缓存并定期刷新 |
| **分页大小** | `ps`最大50，超过可能报错或只返回50条 |
| **请求频率** | 建议每页间隔0.3-0.5秒，过快会触发-412风控 |
| **风控参数** | `dm_img_list/dm_img_str/dm_cover_img_str`为空或默认值即可 |
| **Referer** | 必须设置`https://space.bilibili.com/{mid}` |
| **区域限制** | 港澳台UP主可能在大陆IP下返回空数据或-10403 |

---

## 三、全部点赞数据获取（获赞统计）

### 3.1 接口说明

B站提供两个层面的"点赞"数据：

1. **UP主获赞总数** — 该UP主所有作品获得的点赞总数
2. **单个视频获赞数** — 某具体视频的点赞数

⚠️ **重要限制**：获取UP主获赞总数**需要任意用户登录态**（Cookie/SESSDATA），未登录返回空`data`。

### 3.2 UP主获赞总数接口

```
GET https://api.bilibili.com/x/space/upstat
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| mid | num | 是 | 目标用户UID |
| jsonp | str | 否 | jsonp（跨域用） |

**响应字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| code | num | 0成功，-400请求错误 |
| data.archive.view | num | **视频总播放量** |
| data.article.view | num | **专栏总阅读量** |
| data.likes | num | **累计获赞次数** |

**请求示例**：
```bash
curl -G 'https://api.bilibili.com/x/space/upstat' \
  --data-urlencode 'mid=3546379938957500' \
  -b 'SESSDATA=xxx'
```

**响应示例**：
```json
{
  "code": 0,
  "message": "0",
  "ttl": 1,
  "data": {
    "archive": {
      "view": 213567370
    },
    "article": {
      "view": 3230808
    },
    "likes": 20295095
  }
}
```

### 3.3 单个视频获赞数接口

```
GET https://api.bilibili.com/x/web-interface/archive/stat
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| bvid | str | 二选一 | 稿件bvid |
| aid | num | 二选一 | 稿件avid |

**响应字段（data.stat）**：

| 字段 | 类型 | 说明 |
|------|------|------|
| view | num | 播放数 |
| danmaku | num | 弹幕数 |
| reply | num | 评论数 |
| favorite | num | 收藏数 |
| coin | num | 投币数 |
| share | num | 分享数 |
| like | num | **获赞数** |
| now_rank | num | 当前排名 |
| his_rank | num | 历史最高排行 |

**请求示例**：
```bash
curl -G 'https://api.bilibili.com/x/web-interface/archive/stat' \
  --data-urlencode 'bvid=BV1xx411c7mD'
```

### 3.4 批量获取全部视频点赞数据

由于视频列表接口不返回每个视频的点赞数，如果需要获取全部视频的详细互动数据，需要：**先获取视频列表 → 再逐个调用stat接口**。

```python
def get_video_stat(bvid):
    """获取单个视频的统计信息"""
    resp = requests.get(
        'https://api.bilibili.com/x/web-interface/archive/stat',
        params={'bvid': bvid},
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    data = resp.json()
    if data['code'] == 0:
        return data['data']
    return None

def get_all_videos_with_stats(mid):
    """获取全部视频及其点赞/投币等统计数据"""
    # 1. 获取全部视频列表
    videos = get_all_videos(mid)
    
    # 2. 逐个获取详细统计
    for video in videos:
        bvid = video['bvid']
        stat = get_video_stat(bvid)
        if stat:
            video['stat'] = {
                'view': stat['view'],
                'like': stat['like'],      # 获赞数
                'coin': stat['coin'],      # 投币数
                'favorite': stat['favorite'],  # 收藏数
                'share': stat['share'],    # 分享数
                'reply': stat['reply'],    # 评论数
                'danmaku': stat['danmaku'] # 弹幕数
            }
        time.sleep(0.3)  # 限速
    
    return videos

# 计算总点赞数
total_likes = sum(v.get('stat', {}).get('like', 0) for v in videos)
print(f"全部视频总点赞数: {total_likes}")
```

---

## 四、全部投稿数据获取

### 4.1 投稿类型总览

B站UP主的"投稿"包括多种内容类型：

| 内容类型 | 接口 | 数据标识 |
|----------|------|----------|
| 视频 | `/x/space/wbi/arc/search` | vlist |
| 专栏 | `/x/space/wbi/article` | articles |
| 音频 | `/audio/music-service/web/song/upper` | data.data |
| 相簿 | 需通过navnum获取数量 | album |
| 图文动态 | `/x/polymer/web-dynamic/v1/feed/space` | items |
| 课程 | 需通过navnum获取数量 | pugv |

### 4.2 投稿数量统计接口（推荐首先调用）

```
GET https://api.bilibili.com/x/space/navnum
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| mid | num | 是 | 目标用户UID |
| jsonp | str | 否 | jsonp |

**响应字段（data对象）**：

| 字段 | 类型 | 说明 |
|------|------|------|
| video | num | **投稿视频数** |
| bangumi | num | 追番数 |
| cinema | num | 追剧数 |
| article | num | **投稿专栏数** |
| audio | num | **投稿音频数** |
| album | num | **投稿相簿/图文数** |
| opus | num | **动态数** |
| pugv | num | **投稿课程数** |
| season_num | num | 视频合集数 |
| channel.master | num | 视频列表数 |
| favourite.master | num | 收藏夹数 |
| tag | num | 关注TAG数 |

**请求示例**：
```bash
curl -G 'https://api.bilibili.com/x/space/navnum' \
  --data-urlencode 'mid=3546379938957500'
```

### 4.3 专栏投稿列表

```
GET https://api.bilibili.com/x/space/wbi/article
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| mid | num | 是 | 用户UID |
| pn | num | 否 | 页码，默认1 |
| ps | num | 否 | 每页项数，默认30，范围[1,30] |
| sort | str | 否 | publish_time(最新)/view(最多阅读)/fav(最多收藏) |
| w_rid | str | 是 | WBI签名 |
| wts | num | 是 | UNIX时间戳 |

**响应字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| data.articles | array | 专栏文章列表 |
| data.count | num | 专栏文章总数 |
| data.pn | num | 当前页码 |
| data.ps | num | 每页项数 |

**articles数组项核心字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | num | 专栏cvid |
| title | str | 标题 |
| summary | str | 摘要 |
| author_name | str | 作者名 |
| publish_time | num | 发布时间戳 |
| view | num | 阅读量 |
| like | num | 点赞数 |
| reply | num | 评论数 |

### 4.4 音频投稿列表

```
GET https://api.bilibili.com/audio/music-service/web/song/upper
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| uid | num | 是 | 用户mid |
| pn | num | 是 | 页码，默认1 |
| ps | num | 是 | 每页项数，默认30 |
| order | num | 是 | 1最新发布/2最多播放/3最多收藏 |

**响应字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| data.curPage | num | 当前页码 |
| data.pageCount | num | 总页数 |
| data.totalSize | num | 总计数 |
| data.data | array | 音频列表 |

**音频项核心字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | num | 音频AU号 |
| title | str | 音频标题 |
| cover | str | 封面URL |
| duration | num | 时长(秒) |
| passtime | num | 发布时间戳 |
| statistic.play | num | 播放数 |
| statistic.collect | num | 收藏数 |
| statistic.comment | num | 评论数 |
| coin_num | num | 投币数 |

### 4.5 相簿投稿数量

```
GET https://api.vc.bilibili.com/link_draw/v1/doc/upload_count
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| uid | num | 是 | 目标用户UID |

**响应字段（data对象）**：

| 字段 | 类型 | 说明 |
|------|------|------|
| all_count | num | 相簿总数 |
| draw_count | num | 发布绘画数 |
| photo_count | num | 发布摄影数 |
| daily_count | num | 发布日常(图片动态)数 |

### 4.6 完整投稿获取代码

```python
def get_all_submissions(mid):
    """
    获取UP主全部投稿数据（视频+专栏+音频+相簿统计）
    """
    result = {
        'video': [],
        'article': [],
        'audio': [],
        'album_count': {},
        'navnum': {}
    }
    
    # 1. 获取投稿数量统计
    resp = requests.get(
        'https://api.bilibili.com/x/space/navnum',
        params={'mid': mid},
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    nav_data = resp.json()
    if nav_data['code'] == 0:
        result['navnum'] = nav_data['data']
        print(f"投稿统计: 视频{nav_data['data'].get('video',0)} | "
              f"专栏{nav_data['data'].get('article',0)} | "
              f"音频{nav_data['data'].get('audio',0)} | "
              f"相簿{nav_data['data'].get('album',0)}")
    
    # 2. 获取全部视频
    result['video'] = get_all_videos(mid)
    
    # 3. 获取全部专栏（如果有）
    if nav_data['data'].get('article', 0) > 0:
        result['article'] = get_all_articles(mid)
    
    # 4. 获取全部音频（如果有）
    if nav_data['data'].get('audio', 0) > 0:
        result['audio'] = get_all_audio(mid)
    
    # 5. 获取相簿统计
    resp = requests.get(
        'https://api.vc.bilibili.com/link_draw/v1/doc/upload_count',
        params={'uid': mid},
        headers={'User-Agent': 'Mozilla/5.0'}
    )
    album_data = resp.json()
    if album_data['code'] == 0:
        result['album_count'] = album_data['data']
    
    return result

def get_all_articles(mid, page_size=30):
    """获取全部专栏"""
    img_key, sub_key = get_wbi_keys()
    articles = []
    pn = 1
    
    while True:
        params = {
            'mid': mid,
            'pn': pn,
            'ps': page_size,
            'sort': 'publish_time'
        }
        signed = enc_wbi(params, img_key, sub_key)
        
        resp = requests.get(
            'https://api.bilibili.com/x/space/wbi/article',
            params=signed,
            headers={'User-Agent': 'Mozilla/5.0', 'Referer': f'https://space.bilibili.com/{mid}'}
        )
        data = resp.json()
        
        if data['code'] != 0 or not data['data']['articles']:
            break
        
        articles.extend(data['data']['articles'])
        if len(articles) >= data['data']['count']:
            break
        pn += 1
        time.sleep(0.5)
    
    return articles

def get_all_audio(mid, page_size=30):
    """获取全部音频"""
    audio_list = []
    pn = 1
    
    while True:
        resp = requests.get(
            'https://api.bilibili.com/audio/music-service/web/song/upper',
            params={
                'uid': mid,
                'pn': pn,
                'ps': page_size,
                'order': 1
            },
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        data = resp.json()
        
        if data['code'] != 0 or not data['data']['data']:
            break
        
        audio_list.extend(data['data']['data'])
        if data['data']['curPage'] >= data['data']['pageCount']:
            break
        pn += 1
        time.sleep(0.5)
    
    return audio_list
```

---

## 五、全部投币数据获取

### 5.1 重要说明

**B站没有直接提供"UP主收到的总投币数"的API！**

获取投币数据需要通过以下间接方式：

| 方式 | 说明 | 适用场景 |
|------|------|----------|
| **逐个视频查询累加** | 遍历所有视频，调用stat接口获取coin字段累加 | 精确统计 |
| **视频列表扩展** | 视频列表接口部分返回coin信息 | 快速估算 |
| **UP主投币记录** | 查询UP主投币过的视频（需Cookie） | 非目标需求 |

### 5.2 逐个视频查询累加方案（推荐）

```python
def get_all_coins(mid):
    """
    获取UP主全部视频收到的投币总数
    
    原理：遍历所有视频，逐个查询stat接口中的coin字段并累加
    """
    # 1. 获取全部视频列表
    videos = get_all_videos(mid)
    
    total_coins = 0
    video_stats = []
    
    for video in videos:
        bvid = video['bvid']
        
        # 查询视频统计信息
        resp = requests.get(
            'https://api.bilibili.com/x/web-interface/archive/stat',
            params={'bvid': bvid},
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        data = resp.json()
        
        if data['code'] == 0:
            stat = data['data']
            coin = stat.get('coin', 0)
            total_coins += coin
            
            video_stats.append({
                'bvid': bvid,
                'title': video['title'],
                'coin': coin,
                'like': stat.get('like', 0),
                'favorite': stat.get('favorite', 0),
                'share': stat.get('share', 0),
                'view': stat.get('view', 0)
            })
        
        time.sleep(0.3)  # 限速避免风控
    
    return {
        'total_coins': total_coins,
        'video_count': len(videos),
        'video_stats': video_stats
    }

# 获取番剧出差全部投币数据
coin_data = get_all_coins('3546379938957500')
print(f"总投币数: {coin_data['total_coins']}")
print(f"视频总数: {coin_data['video_count']}")
print(f"平均每视频投币: {coin_data['total_coins'] / max(coin_data['video_count'], 1):.2f}")
```

### 5.3 视频详情接口（备用方案）

```
GET https://api.bilibili.com/x/web-interface/view
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| bvid | str | 二选一 | 稿件bvid |
| aid | num | 二选一 | 稿件avid |

**响应中 stat 对象**：

| 字段 | 类型 | 说明 |
|------|------|------|
| view | num | 播放数 |
| danmaku | num | 弹幕数 |
| reply | num | 评论数 |
| favorite | num | 收藏数 |
| coin | num | **投币数** |
| share | num | 分享数 |
| like | num | 获赞数 |

### 5.4 投币记录查询（UP主投币过的视频）

⚠️ 注意：这是查询**该UP主给其他视频投币**的记录，不是收到的投币！

```
GET https://api.bilibili.com/x/space/coin/video
```

**认证方式**：Cookie（SESSDATA）

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| vmid | num | 是 | 目标用户mid |

**限制**：
- 需要用户隐私设置为公开
- 返回53013错误表示用户隐私未公开

---

## 六、辅助数据接口

### 6.1 用户关系状态数（粉丝/关注）

```
GET https://api.bilibili.com/x/relation/stat
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| vmid | num | 是 | 目标用户mid |

**响应字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| mid | num | 用户UID |
| following | num | 关注数 |
| whisper | num | 悄悄关注数 |
| black | num | 黑名单数 |
| follower | num | **粉丝数** |

### 6.2 视频状态数（仅avid，旧版）

```
GET https://api.bilibili.com/archive_stat/stat
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| aid | num | 是 | 稿件avid |

**响应字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| aid | num | 稿件avid |
| view | num | 播放次数 |
| danmaku | num | 弹幕条数 |
| reply | num | 评论条数 |
| favorite | num | 收藏人数 |
| coin | num | 投币枚数 |
| share | num | 分享次数 |
| like | num | 获赞次数 |
| his_rank | num | 历史最高排行 |
| copyright | num | 1自制/2转载 |

### 6.3 充电公示列表

```
GET https://api.bilibili.com/x/ugcpay-rank/elec/month/up
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| up_mid | num | 是 | 目标用户mid |

**响应字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| count | num | 本月充电人数 |
| total_count | num | **总计充电次数** |
| list | array | 充电用户列表 |

**错误码**：

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 88214 | UP主未开通充电 |

---

## 七、完整数据聚合方案

### 7.1 数据架构设计

```
UP主全量数据
├── 基础信息 (acc/info)
│   ├── UID、昵称、头像、签名
│   ├── 等级、认证状态
│   └── 粉丝数、关注数
├── 统计数据 (upstat + navnum + relation)
│   ├── 视频总播放量 (archive.view)
│   ├── 专栏总阅读量 (article.view)
│   ├── 累计获赞数 (likes)
│   ├── 投稿视频数 (navnum.video)
│   ├── 投稿专栏数 (navnum.article)
│   ├── 投稿音频数 (navnum.audio)
│   ├── 粉丝数 (relation.follower)
│   └── 关注数 (relation.following)
├── 视频列表 (arc/search)
│   ├── 全部视频基础信息
│   └── 每个视频的：标题/BV号/播放量/弹幕/评论/时长/发布时间
├── 视频详情 (archive/stat)
│   ├── 每个视频的：点赞/投币/收藏/分享/播放
│   └── 可累加得到总投币数
├── 专栏列表 (wbi/article)
│   └── 全部专栏：标题/CV号/阅读量/点赞/评论
├── 音频列表 (audio/upper)
│   └── 全部音频：标题/AU号/播放/收藏/评论
└── 充电数据 (elec/month/up)
    └── 充电总人数/充电次数
```

### 7.2 完整聚合代码

```python
import requests
import time
import hashlib
import urllib.parse

class BilibiliUPDataCollector:
    """B站UP主全量数据采集器"""
    
    def __init__(self, mid):
        self.mid = mid
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': f'https://space.bilibili.com/{mid}'
        })
        self.wbi_keys = None
    
    def _get_wbi_keys(self):
        """获取WBI密钥（带缓存）"""
        if self.wbi_keys is None:
            resp = self.session.get('https://api.bilibili.com/x/web-interface/nav')
            data = resp.json()
            img_url = data['data']['wbi_img']['img_url']
            sub_url = data['data']['wbi_img']['sub_url']
            img_key = img_url.split('/')[-1].split('.')[0]
            sub_key = sub_url.split('/')[-1].split('.')[0]
            self.wbi_keys = (img_key, sub_key)
        return self.wbi_keys
    
    def _enc_wbi(self, params):
        """WBI签名"""
        img_key, sub_key = self._get_wbi_keys()
        MIXIN_KEY_ENC_TAB = [
            46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
            33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
            61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
            36, 20, 34, 44, 52
        ]
        orig = img_key + sub_key
        mixin_key = ''.join([orig[i] for i in MIXIN_KEY_ENC_TAB])[:32]
        
        params['wts'] = int(time.time())
        chr_filter = set("!'()*")
        filtered = {k: ''.join(c for c in str(v) if c not in chr_filter) 
                    for k, v in params.items()}
        query = '&'.join(f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(v, safe='')}" 
                         for k, v in sorted(filtered.items()))
        params['w_rid'] = hashlib.md5((query + mixin_key).encode()).hexdigest()
        return params
    
    def get_basic_info(self):
        """获取基础信息+统计数据"""
        result = {}
        
        # 1. 用户详情
        params = self._enc_wbi({'mid': self.mid})
        resp = self.session.get('https://api.bilibili.com/x/space/wbi/acc/info', params=params)
        info = resp.json()
        if info['code'] == 0:
            d = info['data']
            result['basic'] = {
                'mid': d['mid'],
                'name': d['name'],
                'face': d['face'],
                'sign': d['sign'],
                'level': d['level'],
                'official': d.get('official', {}),
                'vip': d.get('vip', {})
            }
        
        # 2. 粉丝/关注
        resp = self.session.get(
            'https://api.bilibili.com/x/relation/stat',
            params={'vmid': self.mid}
        )
        relation = resp.json()
        if relation['code'] == 0:
            d = relation['data']
            result['relation'] = {
                'following': d['following'],
                'follower': d['follower']
            }
        
        # 3. 获赞/播放统计（需要Cookie，未登录可能为空）
        resp = self.session.get(
            'https://api.bilibili.com/x/space/upstat',
            params={'mid': self.mid}
        )
        upstat = resp.json()
        if upstat['code'] == 0 and upstat.get('data'):
            d = upstat['data']
            result['upstat'] = {
                'video_view': d['archive']['view'],
                'article_view': d['article']['view'],
                'likes': d['likes']
            }
        
        # 4. 投稿数量统计
        resp = self.session.get(
            'https://api.bilibili.com/x/space/navnum',
            params={'mid': self.mid}
        )
        navnum = resp.json()
        if navnum['code'] == 0:
            d = navnum['data']
            result['navnum'] = {
                'video': d.get('video', 0),
                'article': d.get('article', 0),
                'audio': d.get('audio', 0),
                'album': d.get('album', 0),
                'opus': d.get('opus', 0),
                'pugv': d.get('pugv', 0),
                'season': d.get('season_num', 0)
            }
        
        return result
    
    def get_all_videos(self):
        """获取全部视频"""
        videos = []
        page_size = 50
        
        # 第1页获取总数
        params = self._enc_wbi({
            'mid': self.mid,
            'ps': page_size,
            'pn': 1,
            'order': 'pubdate',
            'platform': 'web',
            'web_location': '1550101',
            'order_avoided': 'true',
            'dm_img_list': '[]',
            'dm_img_str': 'V2ViR0wgMS',
            'dm_cover_img_str': 'SW50ZWwoUikgSEQgR3JhcGhpY3NJbnRlbA'
        })
        
        resp = self.session.get(
            'https://api.bilibili.com/x/space/wbi/arc/search',
            params=params
        )
        data = resp.json()
        
        if data['code'] != 0:
            return []
        
        total = data['data']['page']['count']
        videos.extend(data['data']['list']['vlist'])
        total_pages = (total + page_size - 1) // page_size
        
        # 获取剩余页面
        for pn in range(2, total_pages + 1):
            params = self._enc_wbi({
                'mid': self.mid,
                'ps': page_size,
                'pn': pn,
                'order': 'pubdate',
                'platform': 'web',
                'web_location': '1550101',
                'order_avoided': 'true',
                'dm_img_list': '[]',
                'dm_img_str': 'V2ViR0wgMS',
                'dm_cover_img_str': 'SW50ZWwoUikgSEQgR3JhcGhpY3NJbnRlbA'
            })
            resp = self.session.get(
                'https://api.bilibili.com/x/space/wbi/arc/search',
                params=params
            )
            data = resp.json()
            if data['code'] == 0:
                videos.extend(data['data']['list']['vlist'])
            time.sleep(0.5)
        
        return videos
    
    def get_video_stats(self, bvids):
        """批量获取视频统计（点赞/投币等）"""
        stats = []
        for bvid in bvids:
            resp = self.session.get(
                'https://api.bilibili.com/x/web-interface/archive/stat',
                params={'bvid': bvid}
            )
            data = resp.json()
            if data['code'] == 0:
                stats.append(data['data'])
            time.sleep(0.3)
        return stats
    
    def collect_all(self):
        """采集全部数据"""
        print("=" * 50)
        print(f"开始采集 UP主 {self.mid} 的全量数据")
        print("=" * 50)
        
        # 1. 基础统计
        print("[1/4] 采集基础统计数据...")
        basic = self.get_basic_info()
        
        # 2. 全部视频
        print("[2/4] 采集全部视频列表...")
        videos = self.get_all_videos()
        
        # 3. 视频详细统计（点赞/投币）
        print("[3/4] 采集视频详细统计（点赞/投币/收藏）...")
        bvids = [v['bvid'] for v in videos]
        stats = self.get_video_stats(bvids)
        
        # 合并数据
        for v, s in zip(videos, stats):
            v['stat'] = s
        
        # 4. 计算汇总
        total_likes = sum(v.get('stat', {}).get('like', 0) for v in videos)
        total_coins = sum(v.get('stat', {}).get('coin', 0) for v in videos)
        total_favorites = sum(v.get('stat', {}).get('favorite', 0) for v in videos)
        total_shares = sum(v.get('stat', {}).get('share', 0) for v in videos)
        
        result = {
            'basic': basic,
            'videos': videos,
            'summary': {
                'video_count': len(videos),
                'total_likes': total_likes,
                'total_coins': total_coins,
                'total_favorites': total_favorites,
                'total_shares': total_shares
            }
        }
        
        print("[4/4] 采集完成!")
        print(f"  视频总数: {result['summary']['video_count']}")
        print(f"  累计点赞: {result['summary']['total_likes']}")
        print(f"  累计投币: {result['summary']['total_coins']}")
        print(f"  累计收藏: {result['summary']['total_favorites']}")
        
        return result


# 使用示例
collector = BilibiliUPDataCollector('3546379938957500')
data = collector.collect_all()
```

---

## 八、风控与限制

### 8.1 常见错误码

| 错误码 | 含义 | 解决方案 |
|--------|------|----------|
| 0 | 成功 | - |
| -101 | 账号未登录 | 补充Cookie/SESSDATA |
| -352 | 风控校验失败 | 检查WBI签名/UA/dm_img参数 |
| -400 | 请求错误 | 检查参数完整性 |
| -403 | 访问权限不足 | 检查Cookie和权限 |
| -404 | 内容不存在 | 检查ID是否正确 |
| -412 | 请求被拦截 | 降低请求频率，更换IP |
| -10403 | 所在地区不可观看 | 使用代理/解析服务器 |
| -10493 | 版权受限 | 更换区域尝试 |
| 53013 | 用户隐私设置未公开 | 无法获取，尊重隐私 |

### 8.2 请求频率建议

| 场景 | 建议间隔 | 说明 |
|------|----------|------|
| WBI接口 | 0.5-1秒/页 | arc/search/article |
| 公开接口 | 0.3-0.5秒/次 | archive/stat/view |
| 批量stat查询 | 0.3秒/视频 | 100个视频约30秒 |
| 总视频数>500 | 增加间隔到1秒 | 避免触发-412 |

### 8.3 特殊账号限制

对于"番劇出差"这类港澳台区域限定账号：

| 场景 | 大陆IP | 港澳台IP |
|------|--------|----------|
| 视频列表 | 可能返回空 | 正常返回 |
| 基础信息 | 正常返回 | 正常返回 |
| 获赞统计 | 需Cookie | 需Cookie |
| 视频stat | 正常返回 | 正常返回 |

---

## 九、数据导出建议

### 9.1 CSV导出格式

```python
import csv

def export_to_csv(videos, filename='up_data.csv'):
    """导出视频数据到CSV"""
    with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow([
            'BV号', '标题', '发布时间', '时长', 
            '播放量', '点赞', '投币', '收藏', '分享', '评论', '弹幕'
        ])
        for v in videos:
            stat = v.get('stat', {})
            writer.writerow([
                v['bvid'],
                v['title'],
                time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(v['created'])),
                v['length'],
                stat.get('view', v.get('play', 0)),
                stat.get('like', 0),
                stat.get('coin', 0),
                stat.get('favorite', 0),
                stat.get('share', 0),
                stat.get('reply', v.get('comment', 0)),
                stat.get('danmaku', v.get('video_review', 0))
            ])
```

### 9.2 JSON导出格式

```python
import json

def export_to_json(data, filename='up_data.json'):
    """导出完整数据到JSON"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
```

---

> 免责声明：本文档仅供技术学习和研究参考。使用B站API请遵守相关法律法规及B站用户协议。大量数据采集可能对服务器造成压力，请合理控制请求频率。
