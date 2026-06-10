# 预警邮件流程

项目中有**两套独立的邮件系统**，分别用于不同场景。

---

## 一、域名监控预警邮件（`url_detection_database` 服务）

> **唯一的自动化预警邮件**，由 `url_detection_database/src/index.js` 独立运行。

### 完整流程

```
启动 → 拉取域名列表 → 周期检测 → 发现异常 → 发邮件 + 自动替换域名
```

### 1. 获取待检测域名

- 调用 `domain-api` 接口 `POST /domains/import_list` 拉取所有域名
- 只取有 `landing_page_url` 的域名
- 相关代码：`url_detection_database/src/utils/api.js` → `getUrlsFromApi()`

### 2. 双重检测（每 15 分钟一次）

| 检测项 | 方式 | 代码位置 |
|--------|------|----------|
| **安全性检测** | Google Safe Browsing API（恶意软件/钓鱼/有害软件） | `src/utils/checkSafeBrowsing.js` |
| **可访问性检测** | HTTP HEAD 请求（失败最多重试 2 次，间隔 10 秒） | `src/utils/checkAccessibleOnce.js` |

### 3. 异常处理

发现异常后做三件事：

| 操作 | 说明 | 代码位置 |
|------|------|----------|
| **更新数据库状态** | 调用 `PATCH /domains/internal/is_normal/:id` 写回 `is_accessible` 和 `is_safe` | `src/utils/api.js` → `updateDomainStatus()` |
| **自动替换危险域名** | 查找 Lander → 获取替换域名 → 调用替换接口 `/lander-replacement/replace` | `src/utils/api.js` → `replaceDangerousDomain()` |
| **发送预警邮件** | 构建异常报告 HTML 表格，通过 SMTP 发送 | `src/utils/sendEmail.js` → `sendMail()` |

### 4. 邮件内容

- **异常告警邮件**：只列出异常域名（无法访问 或 被标记为危险），标题格式 `[网页监控] 异常报告 - {时间}`
- **每日汇总报告**：每天早上 8:00 发送，包含所有域名最新状态和检测次数，标题 `[网页监控] 报告 08:00`

邮件 HTML 模板代码：`src/utils/buildReportHtml.js`

### 5. 邮件配置

- SMTP：阿里云企业邮箱 `smtp.qiye.aliyun.com:465`
- 收件人：`.env` 中的 `MAIL_TO`、密送 `MAIL_BCC`

---

## 二、通用邮件发送接口（`domain-api` 内）

> **手动调用的 API 接口**，不会自动触发。

| 接口 | 路径 | 用途 |
|------|------|------|
| URL 检测 | `POST /email/check-url` | 检测单个 URL 是否可访问 |
| 发邮件 | `POST /email/send-email` | 通用邮件发送（需传 `to`、`subject`、`text`） |

- 代码位置：`domain-api/src/middleware/email.middleware.js`
- SMTP：阿里云企业邮箱，配置来自 `config/server.js` 的 `ALI_EMAIL` / `ALI_EMAIL_PASSWORD`

---

## 三、Invoice 邮件系统（`domain-api` 内）

> 独立于预警的财务发票邮件流程。

`domain-api/src/utils/email-transporter.js` 提供两个邮箱账号，按客户实体（entity）选择发件人：

| 实体 | 发件邮箱 | 用途 |
|------|----------|------|
| **Eflow** | `notice@eflow-media.com` | 默认 Invoice |
| **Terra** | `TERRA_MAIL_USER`（环境变量） | Terra Invoice |

收件人/密送由环境变量 `PROD_MAIL_TO` / `PROD_MAIL_BCC`（生产）或 `DEV_MAIL_TO` / `DEV_MAIL_BCC`（开发）控制。

---

## 四、飞书通知系统（`domain-api` 内）

`domain-api/src/service/feishu.service.js` 提供飞书机器人通知能力：

- 文本/富文本/卡片消息
- 告警通知（带级别颜色）
- 电话加急、短信加急
- 批量发送

⚠️ 目前只是一个 API 能力层，**没有后端定时任务或事件自动调用**。

---

## 五、变现域名通知（`domain-api` 内）

- 路由：`domain-api/src/router/domain-monetstatus-notice.router.js`
- 外部 webhook 接口 `POST /domain-monetstatus-notice`，接收域名被标记（`status: "flag"`）的通知
- **仅记录到数据库，不发邮件**

---

## 总结

| 系统 | 触发方式 | 是否自动发邮件 |
|------|----------|----------------|
| 域名监控预警 | 定时 15 分钟 | ✅ 自动 |
| 通用邮件接口 | 手动 API 调用 | ❌ 需手动触发 |
| Invoice 邮件 | 前端/业务触发 | ❌ 非预警用途 |
| 飞书通知 | API 调用 | ❌ 无自动触发 |
| 变现域名通知 | 外部 webhook | ❌ 仅记录 |
