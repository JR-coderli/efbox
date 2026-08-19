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
          // 两边独立替换、互不影响：Clickflare 没在用不影响 ef-tracker 侧替换，反之亦然
          await replaceDangerousDomain(domain)
          await replaceEfTrackerDomain(domain)
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
    if (exists) {

    } else {
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


async function replaceDangerousDomain(domain) {
  try {

    const landerExists = await checkLanderExists(domain)
    if (!landerExists) {
      console.log(`域名 ${domain} 在 Lander 列表中不存在, 跳过替换操作`)
      return null
    }


    const replacementDomain = await getReplacementDomain(domain)
    if (!replacementDomain) {
      console.log(`无法获取替换域名, 跳过替换操作`)
      return null
    }

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
      return data
    } else {
      console.log(`❌ 替换失败: ${res?.data?.message || '未知错误'}`)
      return null
    }
  } catch (err) {
    console.log(`❌ 替换接口调用失败: ${err.message}`)
    return null
  }
}


// 替换 ef-tracker 系统(ab_landers)中的危险域名。
// 后端会先预演判断对方是否在用该域名: 没在用不产生替换记录, 在用则批量替换并记录(target_system='eftracker')。
// 与 Clickflare 侧的 replaceDangerousDomain 相互独立, 各自判断各自记录。
async function replaceEfTrackerDomain(domain) {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const res = await axios.post(`${baseUrl}/lander-replacement/ef-replace`, {
      domain: domain
    })

    if (res?.data?.code === 0) {
      console.log(`域名 ${domain} ef-tracker 替换完成: 影响 ${res.data.data?.affectedCount ?? 0} 条 Lander`)
      return res.data.data
    } else {
      // code!==0 多数是"未使用该域名, 跳过替换"的正常情况, 打印 message 即可
      console.log(`ℹ️  ef-tracker 侧: ${res?.data?.message || '跳过替换'}`)
      return null
    }
  } catch (err) {
    console.log(`❌ ef-tracker 替换接口调用失败: ${err.message}`)
    return null
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


module.exports = {
  getUrlsFromApi,
  updateDomainStatus,
  setDomainNotImportant,
  triggerUrgentPhoneCall,
  sendFeishuText,
  replaceDangerousDomain,
  replaceEfTrackerDomain,
  getDailyReportList
}
