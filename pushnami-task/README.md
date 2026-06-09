项目结构

  pushnami-task/
  ├── src/
  │   ├── core/
  │   │   ├── browser.js       # 浏览器启动、登录
  │   │   ├── navigator.js     # 遍历 Campaign/Source
  │   │   └── page-parser.js   # 页面数据解析
  │   ├── tasks/
  │   │   ├── bid-adjust.task.js    # 需求1: Bid调整
  │   │   ├── block.task.js          # 需求2: Block
  │   │   └── budget-boost.task.js  # 需求3: Budget放量
  │   ├── utils/
  │   │   ├── config.js       # 配置管理
  │   │   ├── cooldown.js     # 冷却时间管理
  │   │   ├── db.js           # 操作记录存储
  │   │   └── logger.js       # 日志工具
  │   └── index.js            # 主入口
  ├── .env                     # 环境配置
  ├── package.json
  └── pushnami_tables.sql      # 数据库表

  ---
  后端接口 (domain-api)

  新增文件：
  - service/pushnami.service.js - 数据库操作
  - controller/pushnami.controller.js - 控制器
  - router/pushnami.router.js - 路由

  API 接口：
  ┌──────────────────────────────┬──────────┬──────────────┐
  │             接口             │   方法   │     说明     │
  ├──────────────────────────────┼──────────┼──────────────┤
  │ /api/pushnami/operation-log  │ GET/POST │ 操作日志     │
  ├──────────────────────────────┼──────────┼──────────────┤
  │ /api/pushnami/check-cooldown │ GET      │ 检查冷却时间 │
  ├──────────────────────────────┼──────────┼──────────────┤
  │ /api/pushnami/execution-log  │ GET/POST │ 任务执行日志 │
  ├──────────────────────────────┼──────────┼──────────────┤
  │ /api/pushnami/config         │ GET/PUT  │ 配置管理     │
  ├──────────────────────────────┼──────────┼──────────────┤
  │ /api/pushnami/stats          │ GET      │ 统计信息     │
  └──────────────────────────────┴──────────┴──────────────┘
  ---
  使用方式

  # 测试运行（DRY RUN 模式，执行一次后退出）
  npm run dry-run

  # 持续运行模式（按定时器循环执行）
  npm start

  # 手动触发指定任务
  npm run trigger:bid    # Bid 调整
  npm run trigger:block  # Block
  npm run trigger:budget # Budget 放量


  三种运行模式
  ┌───────────┬──────────────────────────────┬───────────────────────────────┐
  │   模式    │             配置              │            行为              │
  ├───────────┼──────────────────────────────┼───────────────────────────────┤
  │ DRY_RUN   │ TEST_MODE=true/false         |
              | DRY_RUN=true                 │ 只打印日志，不执行任何操作       │
  ├───────────┼──────────────────────────────┼───────────────────────────────┤
  │ TEST_MODE │ TEST_MODE=true DRY_RUN=false │ 选中复选框/模拟输入，验证脚本 │
  ├───────────┼──────────────────────────────┼───────────────────────────────┤
  │ 生产模式  │ TEST_MODE=false DRY_RUN=false │ 真实修改数据                  │
  └───────────┴──────────────────────────────┴───────────────────────────────┘


    ┌────────────────────────────────────────────────┬──────────────────────────────┐
  │                      场景                      │         执行哪些任务         │
  ├────────────────────────────────────────────────┼──────────────────────────────┤
  │ npm start + TASK_BID_ADJUST=true, others=true  │ 三个任务                      │
  ├────────────────────────────────────────────────┼──────────────────────────────┤
  │ npm start + TASK_BID_ADJUST=true, others=false │ 只执行 Bid 调整              │
  ├────────────────────────────────────────────────┼──────────────────────────────┤
  │ npm run trigger:bid                            │ 只执行 Bid 调整（无视开关）  │
  ├────────────────────────────────────────────────┼──────────────────────────────┤
  │ npm run trigger:block                          │ 只执行 Block（无视开关）     │
  ├────────────────────────────────────────────────┼──────────────────────────────┤
  │ npm run dry-run                                │ 执行所有三个任务（无视开关） │
  └────────────────────────────────────────────────┴──────────────────────────────┘

  优化逻辑:
   Campaign 页面:
  1. 应用筛选（Active + Today）
  2. Conversions 正序排序（从大到小）
  3. 遍历 Campaign
  4. 遇到 Conversion = 0 → 停止所有遍历

  Source 页面：
  1. Conversions 正序排序（从大到小）
  2. 遍历 Source
  3. 遇到 Conversion = 0 → 停止当前 Campaign 的 Source 遍历




    Pushnami 系统架构详解

  一、三张数据表的作用

  1. pushnami_operation_log - 操作记录表

  作用: 记录每次对 Source 或 Campaign 执行的具体操作
  ┌───────────────────┬────────────────────────────────────────────────────┐
  │       字段        │                        说明                        │
  ├───────────────────┼────────────────────────────────────────────────────┤
  │ id                │ 主键ID                                             │
  ├───────────────────┼────────────────────────────────────────────────────┤
  │ task_type         │ 任务类型: bid_adjust / block / budget_boost        │
  ├───────────────────┼────────────────────────────────────────────────────┤
  │ entity_type       │ 实体类型: source / campaign                        │
  ├───────────────────┼────────────────────────────────────────────────────┤
  │ entity_id         │ Source ID 或 Campaign ID                           │
  ├───────────────────┼────────────────────────────────────────────────────┤
  │ campaign_name     │ 所属 Campaign 名称                                 │
  ├───────────────────┼────────────────────────────────────────────────────┤
  │ old_value         │ 修改前的值 (如原 Bid)                              │
  ├───────────────────┼────────────────────────────────────────────────────┤
  │ new_value         │ 修改后的值 (如新 Bid)                              │
  ├───────────────────┼────────────────────────────────────────────────────┤
  │ rule_condition    │ 匹配的规则条件 (如 "Conversions > 3 && CPA < 2.8") │
  ├───────────────────┼────────────────────────────────────────────────────┤
  │ conversions       │ 转化数                                             │
  ├───────────────────┼────────────────────────────────────────────────────┤
  │ cpa               │ CPA 值                                             │
  ├───────────────────┼────────────────────────────────────────────────────┤
  │ total_spend       │ 每日总花费                                         │
  ├───────────────────┼────────────────────────────────────────────────────┤
  │ daily_spend_limit │ 每日花费限额                                       │
  ├───────────────────┼────────────────────────────────────────────────────┤
  │ target_cpa        │ 目标 CPA                                           │
  ├───────────────────┼────────────────────────────────────────────────────┤
  │ is_dry_run        │ 是否为 Dry Run 测试模式                            │
  ├───────────────────┼────────────────────────────────────────────────────┤
  │ created_at        │ 创建时间                                           │
  └───────────────────┴────────────────────────────────────────────────────┘
  用途:
  - 历史追踪：查看每次调整的详细数据
  - 冷却判断：防止短时间内重复操作同一 Source/Campaign
  - 审计日志：了解自动化系统的行为

  ---
  2. pushnami_execution_log - 任务执行日志表

  作用: 记录每次任务的执行概况
  ┌─────────────────────┬────────────────────────────────────┐
  │        字段         │                说明                │
  ├─────────────────────┼────────────────────────────────────┤
  │ id                  │ 主键ID                             │
  ├─────────────────────┼────────────────────────────────────┤
  │ task_type           │ 任务类型                           │
  ├─────────────────────┼────────────────────────────────────┤
  │ status              │ 状态: started / completed / failed │
  ├─────────────────────┼────────────────────────────────────┤
  │ campaigns_processed │ 处理的 Campaign 数量               │
  ├─────────────────────┼────────────────────────────────────┤
  │ sources_processed   │ 处理的 Source 数量                 │
  ├─────────────────────┼────────────────────────────────────┤
  │ actions_taken       │ 实际执行的操作数量                 │
  ├─────────────────────┼────────────────────────────────────┤
  │ errors              │ 错误数量                           │
  ├─────────────────────┼────────────────────────────────────┤
  │ message             │ 执行消息                           │
  ├─────────────────────┼────────────────────────────────────┤
  │ started_at          │ 开始时间                           │
  ├─────────────────────┼────────────────────────────────────┤
  │ completed_at        │ 完成时间                           │
  └─────────────────────┴────────────────────────────────────┘
  用途:
  - 任务监控：查看任务执行是否成功
  - 性能分析：了解每次任务处理了多少数据
  - 问题排查：通过 status 和 errors 分析失败原因

  ---
  3. pushnami_config - 配置表

  作用: 存储可动态修改的任务配置
  ┌──────────────┬────────────────────┐
  │     字段     │        说明        │
  ├──────────────┼────────────────────┤
  │ id           │ 主键ID             │
  ├──────────────┼────────────────────┤
  │ config_key   │ 配置键             │
  ├──────────────┼────────────────────┤
  │ config_value │ 配置值 (JSON 格式) │
  ├──────────────┼────────────────────┤
  │ description  │ 配置描述           │
  ├──────────────┼────────────────────┤
  │ updated_at   │ 更新时间           │
  └──────────────┴────────────────────┘
  默认配置:
  ┌────────────────────┬─────────────────────────────────────────────────────────────────────┐
  │     config_key     │                                内容                                 │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ task_switch        │ 任务开关: {"bid_adjust": true, "block": true, "budget_boost": true} │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ bid_adjust_rules   │ Bid 调整规则、间隔、冷却时间                                        │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ block_rules        │ Block 规则、间隔、冷却时间                                          │
  ├────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ budget_boost_rules │ Budget 放量规则、间隔、冷却时间                                     │
  └────────────────────┴─────────────────────────────────────────────────────────────────────┘
  用途:
  - 动态配置：无需重启脚本即可修改规则
  - 任务开关：可以远程启用/禁用特定任务

  ---
  二、domain-api 提供的接口

  路由定义 (pushnami.router.js)

  /pushnami
  ├── GET    /operation-log          # 获取操作日志列表
  ├── POST   /operation-log          # 记录一次操作
  ├── GET    /check-cooldown         # 检查冷却状态
  ├── GET    /execution-log          # 获取任务执行日志
  ├── POST   /execution-log          # 记录任务执行
  ├── GET    /config                 # 获取配置
  ├── PUT    /config                 # 更新配置
  ├── GET    /stats                  # 获取统计信息
  └── POST   /trigger/:task          # 手动触发任务

  ---
  接口详解

  1. GET /pushnami/operation-log - 获取操作日志

  调用方: 前端 domain-admin

  用途: 前端展示操作历史记录，支持筛选

  请求参数:
  page: 页码
  pageSize: 每页数量
  task_type: 任务类型筛选 (可选)
  entity_type: 实体类型筛选 (可选)
  start_time: 开始时间 (可选)
  end_time: 结束时间 (可选)

  ---
  2. POST /pushnami/operation-log - 记录操作

  调用方: pushnami-task 脚本

  用途: 每次成功调整 Source/Campaign 后，记录到数据库

  请求体:
  {
    "task_type": "bid_adjust",
    "entity_type": "source",
    "entity_id": "S0014320",
    "campaign_name": "#P Cash Sweeps 02",
    "old_value": 0.2,
    "new_value": 0.18,
    "rule_condition": "Conversions > 3 && CPA < 2.8",
    "conversions": 14,
    "cpa": 0.7,
    "total_spend": null,
    "daily_spend_limit": null,
    "target_cpa": null,
    "is_dry_run": false
  }

  ---
  3. GET /pushnami/check-cooldown - 检查冷却状态

  调用方: pushnami-task 脚本

  用途: 在执行操作前检查该 Source/Campaign 是否在冷却期内

  请求参数:
  task_type: bid_adjust
  entity_type: source
  entity_id: S0014320

  返回:
  {
    "code": 200,
    "data": {
      "isInCooldown": true,
      "lastOperation": {
        "id": 123,
        "createdAt": "2026-03-23 14:30:00"
      }
    }
  }

  ---
  4. GET /pushnami/execution-log - 获取任务执行日志

  调用方: 前端 domain-admin

  用途: 展示每次任务执行的概况

  ---
  5. POST /pushnami/execution-log - 记录任务执行

  调用方: pushnami-task 脚本

  用途: 任务开始时记录 started，完成时记录 completed/failed

  时机:
  - 任务启动时 → status: "started"
  - 任务完成时 → status: "completed" 或 "failed"

  ---
  6. GET /pushnami/config - 获取配置

  调用方: 前端 domain-admin（查看/编辑配置页）

  用途: 获取当前所有配置，用于前端配置页面展示

  ---
  7. PUT /pushnami/config - 更新配置

  调用方: 前端 domain-admin

  用途: 管理员在前端修改配置后，提交到此接口更新数据库

  ---
  8. GET /pushnami/stats - 获取统计信息

  调用方: 前端 domain-admin

  用途: 仪表盘展示统计数据

  返回示例:
  {
    "bidAdjust": { "total": 150, "real": 100, "dryRun": 50 },
    "block": { "total": 20, "real": 15, "dryRun": 5 },
    "budgetBoost": { "total": 30, "real": 25, "dryRun": 5 }
  }

  ---
  9. POST /pushnami/trigger/:task - 手动触发任务

  调用方: 前端 domain-admin（预留接口）

  用途: 管理员可以手动触发某个任务执行

  ---
  三、pushnami-task 脚本使用接口的时机

  时序图

  ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
  │  pushnami-task  │         │   domain-api    │         │     MySQL       │
  └────────┬────────┘         └────────┬────────┘         └────────┬────────┘
           │                           │                           │
           │  1. 启动任务               │                           │
           │  POST /execution-log      │                           │
           │  status="started" ────────>│                           │
           │                           │  INSERT execution_log     │
           │                           ├──────────────────────────>│
           │                           │                           │
           │  2. 遍历 Campaigns/Source │                           │
           │                           │                           │
           │  3. 检查冷却期             │                           │
           │  GET /check-cooldown ─────>│                           │
           │                           │  SELECT last operation    │
           │                           ├──────────────────────────>│
           │                           │<──────────────────────────┤
           │  <──── 返回是否在冷却期 ───┤                           │
           │                           │                           │
           │  4. 执行操作 (调整 Bid)    │                           │
           │                           │                           │
           │  5. 记录操作               │                           │
           │  POST /operation-log ─────>│                           │
           │                           │  INSERT operation_log     │
           │                           ├──────────────────────────>│
           │  <──── 成功响应 ───────────┤                           │
           │                           │                           │
           │  6. 重复 2-5 直到完成      │                           │
           │                           │                           │
           │  7. 任务完成               │                           │
           │  POST /execution-log      │                           │
           │  status="completed" ──────>│                           │
           │                           │  UPDATE execution_log     │
           │                           ├──────────────────────────>│
           │                           │                           │

  ---
  代码流程分析

  1. 任务启动时 (index.js:runBidAdjustTask)


  await db.logTaskExecution({
    taskType: 'bid_adjust',
    status: 'started',          // ← 调用 POST /execution-log
    startedAt: new Date().toISOString()
  })

  2. 处理每个 Source 前 (bid-adjust.task.js:processSource)


  const canProceed = await cooldownManager.checkAndRecord(
    'bid_adjust',
    'source',
    source.id,
    CONFIG.bidAdjust.cooldownMinutes,
    db.isInCooldown.bind(db)     // ← 调用 GET /check-cooldown
  )

  3. 操作成功后 (bid-adjust.task.js:processSource)


  await db.recordOperation({     // ← 调用 POST /operation-log
    taskType: 'bid_adjust',
    entityType: 'source',
    entityId: source.id,
    oldValue: source.currentBid,
    newValue: matchedRule.newBid,

  })

  4. 任务完成时 (index.js:runBidAdjustTask)


  await db.logTaskExecution({
    taskType: 'bid_adjust',
    status: 'completed',         // ← 调用 POST /execution-log
    campaignsProcessed: stats.totalCampaigns,
    sourcesProcessed: tasks.bidAdjust.stats.totalSources,
    actionsTaken: tasks.bidAdjust.stats.adjustedSources,

  })

  ---
  双重冷却机制

  ┌─────────────────────────────────────────────────────────────┐
  │                      冷却检查流程                            │
  ├─────────────────────────────────────────────────────────────┤
  │                                                             │
  │   Source S0014320 需要调整 Bid                              │
  │              │                                              │
  │              ▼                                              │
  │   ┌─────────────────────┐                                   │
  │   │ 1. 内存冷却检查      │  ← cooldownManager.isInCooldown   │
  │   │    (快速)           │     (内存 Map，毫秒级)             │
  │   └─────────┬───────────┘                                   │
  │         未在冷却期                                           │
  │              │                                              │
  │              ▼                                              │
  │   ┌─────────────────────┐                                   │
  │   │ 2. API 冷却检查      │  ← db.isInCooldown()              │
  │   │    (准确)           │     GET /check-cooldown           │
  │   │    查询数据库        │     查询 pushnami_operation_log   │
  │   └─────────┬───────────┘                                   │
  │         未在冷却期                                           │
  │              │                                              │
  │              ▼                                              │
  │   ┌─────────────────────┐                                   │
  │   │ 3. 执行操作          │                                   │
  │   └─────────┬───────────┘                                   │
  │              │                                              │
  │              ▼                                              │
  │   ┌─────────────────────┐                                   │
  │   │ 4. 记录到内存        │  ← cooldownManager.recordOperation│
  │   │   + 数据库          │     + POST /operation-log         │
  │   └─────────────────────┘                                   │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘

  为什么需要双重冷却？
  - 内存冷却: 快速响应，防止同一任务内重复操作
  - 数据库冷却: 跨进程持久化，防止脚本重启后重复操作

  ---
  四、完整数据流示例

  假设 Source S0014320 符合提价规则 (Conversions=14, CPA=0.7):

  1. pushnami-task 启动
     ↓ POST /execution-log (status=started)
     ↓ 插入 pushnami_execution_log 表

  2. 遍历到 S0014320
     ↓ GET /check-cooldown?task_type=bid_adjust&entity_type=source&entity_id=S0014320
     ↓ 查询 pushnami_operation_log 表，无最近记录
     ↓ 返回 isInCooldown=false

  3. 执行 Bid 调整: 0.2 → 0.18
     ↓ POST /operation-log
     ↓ 插入 pushnami_operation_log 表:
     │  {
     │    task_type: "bid_adjust",
     │    entity_type: "source",
     │    entity_id: "S0014320",
     │    old_value: 0.2,
     │    new_value: 0.18,
     │    conversions: 14,
     │    cpa: 0.7,
     │    rule_condition: "Conversions > 3 && CPA < 2.8"
     │  }

  4. 任务完成
     ↓ POST /execution-log (status=completed)
     ↓ 更新 pushnami_execution_log 表

  5. 100分钟内再次触发任务
     ↓ GET /check-cooldown?...S0014320
     ↓ 查询到 3分钟前的记录
     ↓ 返回 isInCooldown=true, 剩余 97 分钟
     ↓ 跳过该 Source

  ---
  这就是整个 Pushnami 自动化系统的完整架构。数据表负责持久化存储，API 负责 task 和 admin 之间的数据交互，task 通过 API 实现冷却检查和操作记录，确保自动化系统的安全性和可追溯性。