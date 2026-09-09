const axios = require('axios')


async function getUrlsFromApi() {
  try {
    const res = await axios.post(process.env.API_BASE_URL + '/domains/import_list', {
      offset: 0,
      size: 200
    });
    const data = res?.data?.data
    const list = data?.list || [];
    const allCount = data?.allCount ?? 0  // 重要域名总数


    const urls = list
      .filter(item => item.landing_page_url)  // 过滤掉没有 URL 的
      .map(item => ({
        id: item.id,
        url: item.landing_page_url
      }))


    // ok 且 fetchedCount >= allCount 表示本轮已把全部重要域名拉全,
    // 调用方可据此安全清理"已移出监控"的域名计数
    return { urls, allCount, fetchedCount: list.length, ok: true }
  } catch (err) {

    return { urls: [], allCount: 0, fetchedCount: 0, ok: false }
  }
}


// 上报"最后检测时间"—— 每轮检测完成时打点, 服务端记当前时间到 system_config。
// 前端域名检测页据此展示最后检测时间; 时间长期不推进 = 检测脚本没在跑。
// 失败只打日志, 不影响检测主流程。
async function reportLastCheck() {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const res = await axios.post(`${baseUrl}/domains/internal/report_last_check`, {}, { timeout: 10000 })
    return res?.data?.code === 0
  } catch (err) {
    console.log(`❌ 上报最后检测时间失败: ${err.message}`)
    return false
  }
}


// 两侧替换终态裁决（兜底）：Clickflare 侧是异步队列，ef 侧先完成触发的裁决会因对侧"还在跑"
// 而等待且无人再触发。这里轮询裁决接口直到有终态结论（继承成功 / 放弃 / 超时）。
// 幂等：两侧都已成功时立即继承；任一侧失败立即放弃。失败只打日志。
// 返回: 'success'=两侧替换全部成功(含幂等"已是目标值") / 其他=未成功或超时
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function resolvePurposeInherit(dangerousDomain, { intervalMs = 10000, timeoutMs = 5 * 60 * 1000 } = {}) {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
  const startAt = Date.now()
  let lastMessage = ''
  while (Date.now() - startAt < timeoutMs) {
    try {
      const res = await axios.post(`${baseUrl}/domain-purpose-inherit/resolve`, { dangerous_domain: dangerousDomain }, { timeout: 15000 })
      const data = res?.data?.data || {}
      lastMessage = res?.data?.message || ''
      // success=true: 继承完成（含幂等"已是目标值"）
      if (res?.data?.code === 0 && data?.success === true) {
        console.log(`[替换流程] purpose 继承完成: ${dangerousDomain} — ${lastMessage}`)
        return 'success'
      }
      // message 含"等待"→ 两侧还没都到终态，继续轮询；其他（失败/放弃/无记录）为终态结论，停
      if (!String(lastMessage).includes('等待')) {
        console.log(`[替换流程] purpose 继承未执行(终态): ${dangerousDomain} — ${lastMessage}`)
        return 'terminal'
      }
    } catch (err) {
      console.log(`❌ 裁决 purpose 继承失败: ${err.message}`)
      return 'error'
    }
    await sleep(intervalMs)
  }
  console.log(`[替换流程] purpose 继承裁决超时(${Math.round(timeoutMs / 60000)}分钟): ${dangerousDomain} — ${lastMessage}`)
  return 'timeout'
}


// 将域名降级为非重要域名 (is_important = 0)
// 供检测脚本在域名连续多轮异常后调用, 降级后该域名会移出 import_list 监控范围
async function setDomainNotImportant(id) {  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const apiUrl = `${baseUrl}/domains/internal/is_important/${id}/0`

    await axios.patch(apiUrl)
    return true
  } catch (err) {
    console.log(`❌ 降级域名为非重要失败 id=${id}: ${err.message}`)
    return false
  }
}


async function updateDomainStatus(id, isAccessible, isSafe, url) {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const apiUrl = `${baseUrl}/domains/internal/is_normal/${id}`

    await axios.patch(apiUrl, {
      is_accessible: isAccessible,
      is_safe: isSafe,
    })




    if ((isSafe === 0 || isAccessible === 0) && url) {
      try {
        const domain = extractDomain(url)
        if (domain) {
          console.log(`[替换流程] 检测到异常域名 ${domain} (is_accessible=${isAccessible} is_safe=${isSafe})，开始查询备用域名`)
          // 一次检测事件只查询一次备用域名，两边共用同一个结果，
          // 保证 Clickflare / ef-tracker 替换到同一个备用域名上（避免两侧各自查询时备用池中途变化导致分歧）
          const replacementDomain = await getReplacementDomain(domain)
          if (!replacementDomain) {
            console.log(`[替换流程] 无法获取替换域名(备用池不满足条件或危险域名purpose无s编号), 跳过替换操作: ${domain}`)
            return
          }
          console.log(`[替换流程] ${domain} -> ${replacementDomain}，开始两侧替换`)
          // 两边独立替换、互不影响：Clickflare 没在用不影响 ef-tracker 侧替换，反之亦然
          const cfResult = await replaceDangerousDomain(domain, replacementDomain)      // Clickflare 侧
          const efResult = await replaceEfTrackerDomain(domain, replacementDomain)      // ef-tracker 侧
          console.log(`[替换流程] ${domain} -> ${replacementDomain} 两侧替换请求已发出，开始兜底裁决 purpose 继承(轮询至两侧终态)`)
          // 兜底：轮询直到两侧都到终态，决定是否把备用域名 purpose 改为危险域名的(s1-备用 -> s1-LP)。
          // 任一侧失败则保持原状；两侧成功才继承。不阻塞太久(默认5分钟超时)，超时留给下次检测再裁决。
          const verdict = await resolvePurposeInherit(domain)
          // 两侧替换全部成功 → 飞书普通消息通知用户(不打电话不发邮件)，并停止该域名后续预警
          if (verdict === 'success') {
            notifiedReplaced.add(domain)
            sendReplacementSuccessNotice(domain, replacementDomain, { cfResult, efResult })
          }
        }
      } catch (err) {
        console.log(`❌ 替换危险域名失败: ${err.message}`)
      }
    }
  } catch (err) {
    console.log(`❌ 更新域名状态失败 id=${id}: ${err.message}`);
  }
}


async function checkLanderExists(domain) {
  try {
    const landerApiUrl = process.env.API_BASE_URL || 'https://efbox.work/api'

    const res = await axios.get(`${landerApiUrl}/public/lander/list`, {
      headers: {
        'api-key': 'Ln5QpO8fQ6ZAJxFvuSQs9foeCliIYMAe4AcS6VQd'
      },
      params: {
        url: domain,
        size: 1  // 只需要知道是否存在, 所以只查询1条
      },
      timeout: 10000  // 10秒超时
    })


    const exists = Array.isArray(res.data) && res.data.length > 0
    if (!exists) {
      console.log(`⚠️  Lander 列表中未找到域名 ${domain} 的记录, 跳过替换操作`)
    }
    return exists
  } catch (err) {
    console.log(`❌ 查询 Lander 列表失败: ${err.message}`)

    return false
  }
}


async function getReplacementDomain(dangerousDomain) {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const res = await axios.get(`${baseUrl}/domains/replacement/${dangerousDomain}`)

    if (res?.data?.code === 0) {
      const data = res.data.data

      return data.replacementDomain
    } else {
      console.log(`⚠️  ${res?.data?.message || '无法获取替换域名'}`)
      return null
    }
  } catch (err) {
    console.log(`❌ 获取替换域名失败: ${err.message}`)
    return null
  }
}


async function replaceDangerousDomain(domain, replacementDomain) {
  try {

    const landerExists = await checkLanderExists(domain)
    if (!landerExists) {
      console.log(`域名 ${domain} 在 Lander 列表中不存在, 跳过替换操作`)
      return { status: 'unused', affectedCount: 0 }
    }


    // replacementDomain 由调用方统一查询传入（与 ef-tracker 侧共用同一个备用域名）
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const url = `${baseUrl}/lander-replacement/replace`

    const res = await axios.post(url, {
      domain: domain,
      replacement_domain: replacementDomain,
      workspace_type: "all"
    })

    if (res?.data?.code === 0) {
      const data = res.data.data


      console.log(`域名 ${domain} 替换任务已启动: 影响 ${data.affectedCount} 条 Lander`)
      return { status: 'replaced', affectedCount: data.affectedCount }
    } else {
      console.log(`❌ 替换失败: ${res?.data?.message || '未知错误'}`)
      return { status: 'failed', affectedCount: 0 }
    }
  } catch (err) {
    console.log(`❌ 替换接口调用失败: ${err.message}`)
    return { status: 'failed', affectedCount: 0 }
  }
}


// 替换 ef-tracker 系统(ab_landers)中的危险域名。
// 后端会先预演判断对方是否在用该域名: 没在用不产生替换记录, 在用则批量替换并记录(target_system='eftracker')。
// 与 Clickflare 侧的 replaceDangerousDomain 相互独立, 各自判断各自记录。
// replacementDomain 由调用方统一查询传入（与 Clickflare 侧共用同一个备用域名）。
async function replaceEfTrackerDomain(domain, replacementDomain) {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const res = await axios.post(`${baseUrl}/lander-replacement/ef-replace`, {
      domain: domain,
      replacement_domain: replacementDomain
    })

    if (res?.data?.code === 0) {
      const affected = res.data.data?.affectedCount ?? 0
      console.log(`域名 ${domain} ef-tracker 替换完成: 影响 ${affected} 条 Lander`)
      return { status: 'replaced', affectedCount: affected }
    } else {
      // code!==0 多数是"未使用该域名, 跳过替换"的正常情况, 打印 message 即可
      console.log(`ℹ️  ef-tracker 侧: ${res?.data?.message || '跳过替换'}`)
      const msg = String(res?.data?.message || '')
      return { status: msg.includes('未使用') ? 'unused' : 'failed', affectedCount: 0 }
    }
  } catch (err) {
    console.log(`❌ ef-tracker 替换接口调用失败: ${err.message}`)
    return { status: 'failed', affectedCount: 0 }
  }
}


function extractDomain(url) {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch (err) {
    console.log(`解析URL失败: ${url}`)
    return null
  }
}

// 触发飞书电话加急通知 (异常告警时与预警邮件一起发出)
// 接收人 open_id 通过环境变量 FEISHU_ALERT_OPEN_ID 配置, 支持逗号分隔多个; 未配置则跳过
async function triggerUrgentPhoneCall(text) {
  const raw = process.env.FEISHU_ALERT_OPEN_ID
  if (!raw) {
    console.log('⚠️ 未配置 FEISHU_ALERT_OPEN_ID, 跳过电话加急通知')
    return false
  }

  const openIds = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (!openIds.length) return false

  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
  for (const receiveId of openIds) {
    try {
      await axios.post(`${baseUrl}/feishu/send/urgent-phone`, { receiveId, text })
    } catch (err) {
      console.log(`❌ 电话加急通知失败 (${receiveId}): ${err.message}`)
    }
  }
  return true
}


// 发送飞书普通文本消息(不发邮件、不打电话)
// 接收人 open_id 通过环境变量 FEISHU_ALERT_OPEN_ID 配置(与电话加急同一份), 支持逗号分隔多个; 未配置则跳过
async function sendFeishuText(text) {
  const raw = process.env.FEISHU_ALERT_OPEN_ID
  if (!raw) {
    console.log('⚠️ 未配置 FEISHU_ALERT_OPEN_ID, 跳过飞书文本消息')
    return false
  }

  const openIds = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (!openIds.length) return false

  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
  for (const receiveId of openIds) {
    try {
      await axios.post(`${baseUrl}/feishu/send/text`, { receiveId, text })
    } catch (err) {
      console.log(`❌ 飞书文本消息发送失败 (${receiveId}): ${err.message}`)
    }
  }
  return true
}


// 拉取域名清单日报数据(每日 8 点第二封邮件用)
// 返回 { backup: [...], inUse: [...], mislabelBackup: [备用被启用超24h仍未改标签的域名] }
async function getDailyReportList() {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const res = await axios.get(`${baseUrl}/domains/internal/daily_report_list`, { timeout: 15000 })
    if (res?.data?.code === 0) {
      return { ok: true, ...res.data.data }
    }
    console.log(`⚠️ 域名清单日报数据返回异常: ${res?.data?.message || '未知错误'}`)
    return { ok: false, backup: [], inUse: [], mislabelBackup: [] }
  } catch (err) {
    console.log(`❌ 拉取域名清单日报数据失败: ${err.message}`)
    return { ok: false, backup: [], inUse: [], mislabelBackup: [] }
  }
}


// 已替换成功并通知过飞书的域名集合(内存态)。
// 域名替换成功后加入: 之后该域名即使仍异常也不再发预警(电话/普通消息都不发),
// 避免"已经处理完"的域名继续占用提醒轮次。脚本重启后集合清空——彼时域名通常已被
// 降级移出监控或已恢复, 不会造成重复轰炸; 即使仍在监控中, 重新走满 3 轮告警也是合理兜底。
const notifiedReplaced = new Set()

// 拉取备用域名池数量(口径与后端选备用一致: 安全+可访问+在监控中的备用域名)
async function getBackupPoolCount() {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const res = await axios.get(`${baseUrl}/domains/internal/backup_pool_count`, { timeout: 10000 })
    if (res?.data?.code === 0 && res?.data?.data) {
      return res.data.data  // { availableCount, totalCount }
    }
    console.log(`⚠️ 备用域名数量接口返回异常: ${res?.data?.message || '未知错误'}`)
    return null
  } catch (err) {
    console.log(`❌ 拉取备用域名数量失败: ${err.message}`)
    return null
  }
}

// 替换成功后的飞书普通消息通知(不打电话、不发邮件):
// 内容 = 被替换域名 -> 替换域名 + 各系统替换明细(哪侧替换了/哪侧未使用/影响条数)
//       + 备用池分类数量提醒(按 s 编号逐类展示; 拉取失败时不带这部分, 不阻塞通知)
// sides: { cfResult, efResult } —— 两侧替换函数的结构化返回 { status: replaced|unused|failed, affectedCount }
function buildSideResultText(sideName, result) {
  if (result?.status === 'replaced') {
    return `- ${sideName}：已替换完毕（影响 ${result.affectedCount} 条 Lander）`
  }
  if (result?.status === 'unused') {
    return `- ${sideName}：未使用该域名，无需替换`
  }
  return `- ${sideName}：替换未确认（${result?.status || '无结果'}，请到替换记录页核查）`
}

async function sendReplacementSuccessNotice(dangerousDomain, replacementDomain, { cfResult, efResult } = {}) {
  try {
    const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    const lines = [
      `【域名替换完成】${time}`,
      `危险域名已自动替换成功：`,
      `- ${dangerousDomain} -> ${replacementDomain}`,
      buildSideResultText('Clickflare 侧', cfResult),
      buildSideResultText('ef-tracker 侧', efResult)
    ]
    const pool = await getBackupPoolCount()
    if (pool) {
      const catLines = (pool.categories || []).map(c =>
        `- ${c.category}-备用域名：可用 ${c.availableCount} 个（共 ${c.totalCount} 个）`)
      lines.push(``,
        `- 备用域名池：当前可用 ${pool.availableCount} 个（备用总数 ${pool.totalCount} 个）`,
        ...(catLines.length ? catLines : ['- 暂无分类备用域名']),
        `[提醒] 请及时注册新域名补充备用池，保持备用域名数量充足`)
    }
    await sendFeishuText(lines.join('\n'))
    console.log(`[替换流程] ✅ 替换成功通知已发送: ${dangerousDomain} -> ${replacementDomain}`)
  } catch (err) {
    console.log(`❌ 发送替换成功通知失败: ${err.message}`)
  }
}

module.exports = {
  getUrlsFromApi,
  updateDomainStatus,
  setDomainNotImportant,
  triggerUrgentPhoneCall,
  sendFeishuText,
  replaceDangerousDomain,
  replaceEfTrackerDomain,
  getDailyReportList,
  reportLastCheck,
  resolvePurposeInherit,
  notifiedReplaced
}
