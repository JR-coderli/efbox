# domain-verify

域名可访问性/安全性**二次核验服务**。部署在与主检测脚本（url_detection_database）**不同的服务器**上，
当主脚本重试多次仍判定"不可访问/危险"时，调用本服务用另一条网络路径复核，降低单点网络视角造成的误判。

**只做两件事，别的都不做**（无通知、无替换、无数据库、无定时器）：

1. 检测域名可访问性（GET + 浏览器 UA + 显式超时）
2. 检测域名安全性（Google Safe Browsing），并把结果返回给调用方

## 为什么这样检测（踩坑总结）

| 设计 | 原因 |
|---|---|
| GET 而非 HEAD | 很多服务器/WAF 对 HEAD 返回 405 或直接丢弃 |
| 带浏览器 User-Agent | 无 UA 请求会被 Cloudflare 等 bot 规则 403，造成"浏览器能开、脚本说挂"的假不可访问 |
| 显式 10s 超时 | Node 内置 fetch 默认 headers 超时 5 分钟，网络黑洞会拖死整轮检测 |
| 状态码 <500 即算"活着" | 403/405/429 = WAF 拦截/方法限制，服务器本身在线；只有 5xx / 网络层错误才算不可访问 |
| ipv4first | 规避部署机 IPv6 路由不通导致的挂死 |
| 失败原因带错误码 | 调用方能区分"真挂了(HTTP 5xx/ETIMEDOUT)"和"被 WAF 拦(403)"和"DNS 故障(ENOTFOUND)" |

## 接口

### POST /check

```bash
curl -X POST "http://<服务器>:8100/check" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <配置了 API_KEYS 时必填>" \
  -d '{"url": "pro.orapil.com"}'
```

响应：

```json
{
  "code": 0,
  "message": "检测完成",
  "data": {
    "url": "https://pro.orapil.com",
    "accessible": true,
    "isDanger": false,
    "isSafe": true,
    "threatTypes": [],
    "detail": {
      "httpStatus": 200,
      "error": null,
      "finalUrl": "https://pro.orapil.com/",
      "attempts": 1,
      "elapsedMs": 420,
      "safeBrowsing": "ok",
      "safeBrowsingError": null
    },
    "checkedAt": "2026-09-22T02:00:00.000Z"
  }
}
```

`detail.safeBrowsing` 取值：`ok` 正常检测 / `unavailable` Google API 不可达（此时 isDanger 不可信）/ `disabled` 未配置 Key。

### GET /ping

最简存活探针，返回纯文本 `ok`（免鉴权）。拿到 `ok` = 服务正常运行；无响应/超时 = 服务暂停。

```bash
curl http://<服务器>:8100/ping
# ok
```

### GET /health

存活探针（免鉴权），返回 JSON：运行时长、Node 版本、SafeBrowsing 是否已配置、鉴权是否开启。

## 部署（新服务器）

```bash
# Node 18+
git clone <仓库> && cd domain-verify
npm install
cp .env.example .env
# 编辑 .env: SAFE_BROWSING_API_KEY 从 domain-api 的 .env 复制同一把
npm start   # 验证能起

# pm2 常驻（日志带时间戳）
pm2 start src/server.js --name domain-verify --log-date-format "YYYY-MM-DD HH:mm:ss"
pm2 save
```

记得防火墙/安全组只放行需要的来源（主检测服务器）访问端口；公网裸奔请配置 `API_KEYS`。

## 主脚本接入方式（第二步，待做）

url_detection_database 在 `checkAccessible` 重试全部失败后，调用本服务复核：

```
本机不可访问 → 问 domain-verify → 对方也说不访问 → 才判"真不可访问"（触发告警/替换）
                                  → 对方能访问     → 判"疑似本机网络问题"（不告警/仅记录）
```

接入点在 url_detection 的 `checkAccessibleOnce`/`checkAccessible` 外层，通过 `.env` 配置
`VERIFY_API_URL` 控制，未配置则行为不变。
