# 系统表查询接口使用文档

> 只读分页查询接口,直接读取各张系统表的数据,供后台 / 联调 / 外部系统调用。

---

## 一、总览

| 项 | 说明 |
|---|---|
| 路由前缀 | `/query` |
| 请求方法 | `GET`(全部) |
| 鉴权 | 无(开放接口) |
| 返回格式 | JSON |
| 排序 | 固定按 `id DESC`(最新优先) |

6 个接口:

| 接口 | 数据表 |
|---|---|
| `GET /query/clicks` | `system_clicks`(媒体/系统点击) |
| `GET /query/error-logs` | `system_error_logs`(系统错误日志) |
| `GET /query/lp-clicks` | `system_lp_clicks`(LP → Offer 点击) |
| `GET /query/lp-visit-logs` | `system_lp_visit_logs`(LP 着陆流水) |
| `GET /query/conversions` | `system_conversions`(转化/媒体回传) |
| `GET /query/landers` | `ab_landers`(落地页 LP) |

---

## 二、参数说明(重点:必填/可选)

> ✅ **重要:本组接口的所有参数都是「可选」的,没有任何必传参数。**
> 直接 `GET /query/clicks`(一个参数都不带)完全合法 —— 会返回第 1 页、每页 20 条、UTC 时区、无任何过滤的记录。
>
> 下文每个参数表都有两列帮你判断:
> - **必填**:`否` = 可不传
> - **省略时**:不传该参数会发生什么(用默认值 / 还是跳过该过滤)

### 1. 分页参数

| 参数 | 必填 | 类型 | 省略时(默认) |
|---|---|---|---|
| `page` | 否 | int | 默认 `1`(页码,1-based;小于 1 按 1 处理) |
| `size` | 否 | int | 默认 `20`(每页条数,**上限 100**) |
| `limit` | 否 | int | 不传;是 `size` 的旧别名,同时传时 **`size` 优先** |

### 2. 模糊搜索参数

| 参数 | 必填 | 类型 | 省略时(默认) |
|---|---|---|---|
| `keyword` | 否 | string | 不传 = **不做模糊过滤**,返回全部 |

- 作用:跨该接口的多个字段做 **OR 模糊匹配**(PostgreSQL `ILIKE`,大小写不敏感)。各接口的搜索字段范围见第四节。
- `%` / `_` / `\` 已自动转义,用户输入不会被当通配符。

### 3. 时区 & 时间范围参数(全部可选)

| 参数 | 必填 | 类型 | 省略时(默认) |
|---|---|---|---|
| `tz` | 否 | string | 默认 `UTC`(时区偏移) |
| `date` | 否 | string | 不传;若传则**覆盖 `start`/`end`** |
| `start` | 否 | string | 不传 = 不设下界 |
| `end` | 否 | string | 不传 = 不设上界 |

- **`tz`** 写法:`tz=8` / `tz=-4` / `tz=0` / `tz=5.5` / `tz=-04:30`
- **`date`** 单日快捷:当天 `00:00:00` ~ 次日 `00:00:00`(按 `tz`),例 `date=2026-08-01`
- **`start`** 本地墙钟下界(含),`created_at >= start`
- **`end`** 本地墙钟上界(**不含**),`created_at < end`
- 时间格式支持:`YYYY-MM-DD HH:MM:SS` / `YYYY-MM-DD HH:MM` / `YYYY-MM-DD`
- 原理:本地墙钟按 `tz` 转成 UTC 后再匹配 `timestamptz` 列。例 `tz=8&date=2026-08-01` 等价于查 UTC `2026-07-31 16:00 ~ 2026-08-01 16:00`,即「东八区 8 月 1 日全天」。
- `start`、`end`、`date` 都不传 ⇒ **不加任何时间过滤**(查全部历史)。

> ⚠️ **`+` 号的 URL 编码坑**:URL 查询串里 `+` 会被解析成空格。
> - ✅ 正偏移**推荐不带 `+`**:`tz=8`、`tz=5.5`(最安全)
> - ✅ 负偏移直接写:`tz=-4`
> - ✅ 若一定要用 `+08:00` 形式,必须把 `+` 编码成 `%2B`:`tz=%2B08:00`
> - ⚠️ 直接写 `tz=+08:00` 会被解析成 ` 08:00` 而报错(裸数字 `tz=8` 不受影响)

### 4. 各接口「精确过滤」参数(全部可选,不传即不过滤)

每个接口除了上面的通用参数外,还支持若干**精确匹配**过滤参数。它们**全部是可选的**,不传 = 该条件不参与过滤。详见第四节各接口说明。

---

## 三、返回格式

所有接口统一返回如下信封:

```json
{
  "total": 123,
  "page":  1,
  "size":  20,
  "pages": 7,
  "count": 20,
  "tz":    "UTC+08:00",
  "list":  [ ... ]
}
```

| 字段 | 说明 |
|---|---|
| `total` | 满足筛选条件的**总条数**(不受分页影响) |
| `page` | 当前页码 |
| `size` | 每页条数(实际生效值) |
| `pages` | 总页数 `ceil(total/size)` |
| `count` | 本页实际返回条数 |
| `tz` | 生效时区(如 `UTC` / `UTC+08:00` / `UTC-04:00`) |
| `list` | 本页记录数组;`created_at`/`updated_at`/`posted_at` 等时间字段按 `tz` 呈现(JSON 带对应偏移) |

### 错误响应

| HTTP | 触发条件 | body |
|---|---|---|
| `400` | `tz` 无法解析(如 `tz=abc`) | `{"error":"invalid tz ... "}` |
| `400` | `start`/`end`/`date` 时间格式非法 | `{"error":"invalid time ..."}` |
| `500` | 数据库查询失败 | `{"error":"<具体错误>"}` |

> 注意:过滤参数(如 `mid`/`tid`)传了非整数时**不会报错**,只是该条件被忽略(按未传处理);仅 `tz` 和时间格式非法会返回 400。

---

## 四、各接口详解

> 下方每个接口的「精确过滤」表中,**必填列全部为「否」**,不传即不过滤。
> `keyword` 同样可选,不传则不做模糊搜索。

### 1. `GET /query/clicks` — 媒体/系统点击

**表**:`system_clicks`

**keyword 搜索范围**(OR,任一字段命中即返回):
`media_click_id`、`system_click_id`、`campaign_name`、`adset_name`、`creative_name`、`ip_address`

**精确过滤参数**:

| 参数 | 必填 | 说明 | 省略时 |
|---|---|---|---|
| `mid` | 否 | 媒体 ID(精确匹配 `mid`) | 不过滤 |
| `tid` | 否 | Tracker ID | 不过滤 |
| `oid` | 否 | Offer ID | 不过滤 |
| `lid` | 否 | LP ID | 不过滤 |
| `path_code` | 否 | 路径代码 | 不过滤 |

**示例**:
```
GET /query/clicks?tz=8&date=2026-08-01&tid=1001&size=20
GET /query/clicks?keyword=ELF&mid=2&page=1
GET /query/clicks?tz=-4&start=2026-08-01%2000:00:00&end=2026-08-02%2000:00:00
```

**list 元素字段**:`id`, `media_click_id`, `system_click_id`, `media_param_name`(jsonb), `mid`, `tid`, `oid`, `lid`, `path_code`, `cost`, `campaign_name`, `campaign_id`, `adset_name`, `adset_id`, `creative_name`, `creative_id`, `subid`, `s1`~`s5`, `ip_address`, `user_agent`, `lander_url`, `aleid`, `axwrt`, `created_at`, `updated_at`

---

### 2. `GET /query/error-logs` — 系统错误日志

**表**:`system_error_logs`

**keyword 搜索范围**(OR):
`error_code`、`error_message`、`error_reason`、`request_url`、`endpoint`、`ip_address`

**精确过滤参数**:

| 参数 | 必填 | 说明 | 省略时 |
|---|---|---|---|
| `mid` | 否 | 媒体 ID | 不过滤 |
| `tid` | 否 | Tracker ID | 不过滤 |
| `http_status` | 否 | HTTP 状态码 | 不过滤 |

**示例**:
```
GET /query/error-logs?http_status=500&tz=8&date=2026-08-03
GET /query/error-logs?keyword=timeout&page=1&size=50
```

**list 元素字段**:`id`, `error_code`, `error_message`, `error_reason`, `http_status`, `request_url`, `request_method`, `request_params`(jsonb), `path_code`, `mid`, `tid`, `ip_address`, `user_agent`, `endpoint`, `created_at`

---

### 3. `GET /query/lp-clicks` — LP → Offer 点击

**表**:`system_lp_clicks`

**keyword 搜索范围**(OR):
`media_click_id`、`system_click_id`、`ip_address`

**精确过滤参数**:

| 参数 | 必填 | 说明 | 省略时 |
|---|---|---|---|
| `mid` | 否 | 媒体 ID | 不过滤 |
| `tid` | 否 | Tracker ID | 不过滤 |
| `lid` | 否 | LP ID | 不过滤 |
| `oid` | 否 | Offer ID | 不过滤 |
| `path_code` | 否 | 路径代码 | 不过滤 |

**示例**:
```
GET /query/lp-clicks?tz=8&date=2026-08-01&lid=2002
GET /query/lp-clicks?oid=3003&size=20
```

**list 元素字段**:`id`, `media_click_id`, `system_click_id`, `mid`, `tid`, `lid`, `oid`, `path_code`, `ip_address`, `user_agent`, `referer`, `offer_url`, `created_at`, `updated_at`

---

### 4. `GET /query/lp-visit-logs` — LP 着陆流水

**表**:`system_lp_visit_logs`

**keyword 搜索范围**(OR):
`media_click_id`、`system_click_id`、`visitor_id`、`ip_address`

**精确过滤参数**:

| 参数 | 必填 | 说明 | 省略时 |
|---|---|---|---|
| `tid` | 否 | Tracker ID | 不过滤 |
| `lid` | 否 | LP ID | 不过滤 |

**示例**:
```
GET /query/lp-visit-logs?tz=0&date=2026-08-01&lid=2002
GET /query/lp-visit-logs?keyword=visitor_abc&page=1
```

**list 元素字段**:`id`, `media_click_id`, `system_click_id`, `visitor_id`, `tid`, `lid`, `ip_address`, `user_agent`, `created_at`

---

### 5. `GET /query/conversions` — 转化/媒体回传

**表**:`system_conversions`

**keyword 搜索范围**(OR):
`system_click_id`、`media_click_id`、`response_body`

**精确过滤参数**:

| 参数 | 必填 | 说明 | 省略时 |
|---|---|---|---|
| `mid` | 否 | 媒体 ID | 不过滤 |
| `tid` | 否 | Tracker ID | 不过滤 |
| `http_status_code` | 否 | 媒体回传 HTTP 状态码 | 不过滤 |
| `should_postback` | 否 | 布尔,接受 `true`/`false`/`1`/`0`/`yes`/`no` | 不过滤 |

**示例**:
```
GET /query/conversions?should_postback=true&tz=8&date=2026-08-01
GET /query/conversions?http_status_code=200&mid=2
GET /query/conversions?keyword=ELF123&tid=1001
```

**list 元素字段**(注意:此表模型未定义 json tag,字段名是**首字母大写的 Go 字段名**,与其它表不同):
`ID`, `SystemClickID`, `MediaClickID`, `MID`, `TID`, `Payout`, `ShouldPostback`, `MediaPostbackURL`, `HTTPStatusCode`, `ResponseBody`, `ResponseHeaders`(jsonb), `CreatedAt`, `PostedAt`

---

### 6. `GET /query/landers` — 落地页 LP

**表**:`ab_landers`

**keyword 搜索范围**(OR):
`name`、`url`

**精确过滤参数**:

| 参数 | 必填 | 说明 | 省略时 |
|---|---|---|---|
| `type_id` | 否 | LP 类型 ID | 不过滤 |
| `oid` | 否 | Offer ID | 不过滤 |

**示例**:
```
GET /query/landers?keyword=aug&page=1&size=20
GET /query/landers?type_id=1&oid=3003
GET /query/landers?tz=8&date=2026-08-01
```

**list 元素字段**:`id`, `name`, `url`, `type_id`, `oid`, `created_at`, `updated_at`
> `type_id` / `oid` 为可空字段(`*int64`),未设置时 JSON 中为 `null`。

---

## 五、完整请求 / 响应示例

以「查东八区 2026-08-01 当天、tid=1001 的点击,每页 2 条」为例:

**请求**:
```
GET /query/clicks?tz=8&date=2026-08-01&tid=1001&size=2
```

**响应**:
```json
{
  "total": 53,
  "page": 1,
  "size": 2,
  "pages": 27,
  "count": 2,
  "tz": "UTC+08:00",
  "list": [
    {
      "id": 100053,
      "media_click_id": "bigo_clk_8821",
      "system_click_id": "ELF6NQK7H9ZX...",
      "media_param_name": { "bigo_click_id": "bigo_clk_8821" },
      "mid": 2, "tid": 1001, "oid": 3003, "lid": 2002,
      "path_code": "482913",
      "cost": "0.85",
      "campaign_name": "LP_Aug", "campaign_id": "cmp_12",
      "adset_name": "AS1", "adset_id": "as_5",
      "creative_name": "CR1", "creative_id": "cr_9",
      "subid": "", "s1": "", "s2": "", "s3": "", "s4": "", "s5": "",
      "ip_address": "1.2.3.4",
      "user_agent": "Mozilla/5.0 ...",
      "lander_url": "https://lp.example.com/482913",
      "aleid": "", "axwrt": "w_abc",
      "created_at": "2026-08-01T15:42:11+08:00",
      "updated_at": "2026-08-01T15:42:11+08:00"
    },
    {
      "id": 100052,
      "media_click_id": "bigo_clk_8819",
      "...": "...(其余字段结构同上)"
    }
  ]
}
```

> 解读:`total=53` 表示满足 `tid=1001 且东八区 8/1 当天` 的点击共 53 条;`pages=27` 因为 `ceil(53/2)`;时间字段带 `+08:00` 偏移,即按请求的 `tz=8` 呈现。

---

## 六、常见用法速查

```bash
# 1. 啥都不传 —— 合法,返回第1页默认20条(UTC、无过滤)
GET /query/clicks

# 2. 查「东八区今天」的所有点击(最常用)
GET /query/clicks?tz=8&date=2026-08-03

# 3. 按 system_click_id 跨表追踪一次点击的完整链路
GET /query/clicks?keyword=ELF6NQK...
GET /query/lp-visit-logs?keyword=ELF6NQK...
GET /query/lp-clicks?keyword=ELF6NQK...
GET /query/conversions?keyword=ELF6NQK...

# 4. 查某 tracker 最近失败的回传
GET /query/conversions?tid=1001&should_postback=true&http_status_code=500

# 5. 查 UTC 时区某段时间的错误日志
GET /query/error-logs?tz=0&start=2026-08-01%2000:00:00&end=2026-08-02%2000:00:00
```
