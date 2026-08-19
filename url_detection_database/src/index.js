require('./utils/loadEnv')();
const { getUrlsFromApi, updateDomainStatus, setDomainNotImportant, triggerUrgentPhoneCall, sendFeishuText, getDailyReportList } = require('./utils/api')
const writeLog = require('./utils/writeLog')
const sendMail = require('./utils/sendEmail')
const checkSafeBrowsing = require('./utils/checkSafeBrowsing')
const { buildStatus, buildNormalReportHtml, buildDailyReportHtml, buildAlertText, buildDomainListReportHtml } = require('./utils/buildReportHtml')
const checkAccessible = require('./utils/checkAccessibleOnce')


writeLog('程序启动, 开始检测域名')

let dailyReport = new Map()   // 保存每个URL的最新检测结果
let dailyCount = new Map()    // 保存每个URL今天检测的次数
let lastReportDate = null // 记录上次发送日报的日期 
let intervalTimer = null  // 定时检测的定时器
let dailyTimer = null // 定时发送日报的定时器
let abnormalUrls = new Set()  // 保存当前异常的 URL
let abnormalStreak = new Map()  // 保存每个域名连续异常的轮数 (id -> 次数)


async function checkUrls(urlObjs, isComplete = false) {
  // 本轮已把全部重要域名拉全时, 清理"已移出监控(被自动降级或手动改为非重要)"的域名的连续异常计数。
  // 这样域名被重新加回重要列表后, 会从 0 重新累计满 3 轮才会再次降级。
  // (仅在拉取完整时执行, 避免网络失败或分页截断时误清仍在监控中的计数)
  if (isComplete) {
    const currentIds = new Set(urlObjs.map(item => item.id))
    for (const id of [...abnormalStreak.keys()]) {
      if (!currentIds.has(id)) abnormalStreak.delete(id)
    }
  }

  if (!urlObjs.length) {
    writeLog('没有可检测的URL')
    return
  }


  const urls = urlObjs.map(item => item.url)

  const safeData = await checkSafeBrowsing(urls) // 检测安全性

  const alerts = await Promise.all(urlObjs.map(async ({ id, url }) => {
    const isDanger = safeData.matches?.some(m => m.threat.url === url) || false;
    const accessible = await checkAccessible(url, 2, 10000)




    const status = buildStatus(isDanger, accessible)

    dailyReport.set(url, { id, url, status })
    dailyCount.set(url, (dailyCount.get(url) || 0) + 1);


    try {
      if (!accessible || isDanger) {

        await updateDomainStatus(id, accessible ? 1 : 0, isDanger ? 0 : 1, url);
        abnormalUrls.add(url);

        // 连续异常轮数 +1; 连续 3 轮(约 45 分钟)仍异常则降级为非重要域名
        const streak = (abnormalStreak.get(id) || 0) + 1
        abnormalStreak.set(id, streak)
        if (streak >= 3) {
          const ok = await setDomainNotImportant(id)
          if (ok) {
            abnormalStreak.delete(id)  // 降级成功后会移出监控列表, 清空计数
            writeLog(`域名连续 ${streak} 轮异常, 已降级为非重要域名: ${url}`)
          }
          // 降级失败则保留计数, 下一轮继续重试 (streak 仍 >= 3)
        }
      } else if (abnormalUrls.has(url)) {

        console.log('恢复')
        await updateDomainStatus(id, 1, 1, url);
        abnormalUrls.delete(url);
        abnormalStreak.delete(id)  // 恢复正常, 清空连续异常计数
      }
    } catch (err) {
      writeLog(`❌ 调用状态更新接口失败 ${url}: ${err.message}`);
    }


    if (isDanger || !accessible) {
      return { id, url, status }
    }
    return null
  }))

  const filteredAlerts = alerts.filter(Boolean);
  if (filteredAlerts.length > 0) {
    await sendMail(buildNormalReportHtml(filteredAlerts));
    // 异常告警: 发邮件的同时触发飞书电话加急 (早上8点的日报只发邮件, 不打电话)
    await triggerUrgentPhoneCall(buildAlertText(filteredAlerts));
  }
}


// 第二封日报:域名清单(备用域名状态 + 主要在使用的域名),只发邮件不打电话
// 同时检查"备用域名被启用超过 24 小时仍未改标签"→ 发飞书普通文本提醒(不发邮件、不打电话)
// 提醒策略:每天 8 点检查,超过 24 小时未改就发;之后每天仍没改就每天再发,直到改掉标签为止
// 数据拉取失败时发一封带错误说明的邮件,方便发现接口异常
async function sendDomainListReport() {
  const { ok, backup, inUse, mislabelBackup } = await getDailyReportList()
  if (ok) {
    sendMail(buildDomainListReportHtml(backup, inUse), 'domainList')

    // 备用域名被启用超 24h 仍挂着"备用"标签 → 飞书普通消息提醒(每天提醒,直到标签被改)
    const pending = mislabelBackup || []
    if (pending.length > 0) {
      const lines = pending.map(r => `- ${r.existing_domain}（标签: ${r.purpose}，${String(r.last_used_at || '').replace('T', ' ').replace(/\..*$/, '')} 被启用）`)
      sendFeishuText(`【域名标签提醒】以下备用域名已被替换启用超过 24 小时，但标签仍是"备用"，请及时改为正式标签：\n${lines.join('\n')}`)
    }
  } else {
    sendMail('<p style="color:#c5221f;">域名清单数据拉取失败,请检查 domain-api 服务。</p>', 'domainList')
  }
}


function startTimers() {

  if (intervalTimer) clearInterval(intervalTimer);
  if (dailyTimer) clearInterval(dailyTimer);


  intervalTimer = setInterval(async () => {
    const { urls: urlObjs, allCount, fetchedCount, ok } = await getUrlsFromApi()
    checkUrls(urlObjs, ok && fetchedCount >= allCount)
  }, 15 * 60 * 1000) // 每 15 分钟检测一次


  dailyTimer = setInterval(() => {
    const now = new Date()
    const HH = now.getHours()
    const mm = now.getMinutes()
    const today = now.toDateString()

    if (HH === 8 && mm === 0 && lastReportDate !== today) {
      // 第一封:检测日报(域名状态汇总)
      sendMail(buildDailyReportHtml(dailyReport, dailyCount), 'daily')
      // 第二封:域名清单日报(备用域名状态 + 主要在用域名,只发邮件不打电话)
      sendDomainListReport()
      lastReportDate = today
      dailyReport = new Map()
      dailyCount = new Map()
    }
  }, 60 * 1000)
}


(async () => {
  const { urls: urlObjs, allCount, fetchedCount, ok } = await getUrlsFromApi()
  console.log("urlObjs: ", urlObjs)

  await checkUrls(urlObjs, ok && fetchedCount >= allCount)
  startTimers()
})();

