require('./utils/loadEnv')();
const { getUrlsFromApi, updateDomainStatus, setDomainNotImportant } = require('./utils/api')
const writeLog = require('./utils/writeLog')
const sendMail = require('./utils/sendEmail')
const checkSafeBrowsing = require('./utils/checkSafeBrowsing')
const { buildStatus, buildNormalReportHtml, buildDailyReportHtml } = require('./utils/buildReportHtml')
const checkAccessible = require('./utils/checkAccessibleOnce')


writeLog('程序启动, 开始检测域名')

let dailyReport = new Map()   // 保存每个URL的最新检测结果
let dailyCount = new Map()    // 保存每个URL今天检测的次数
let lastReportDate = null // 记录上次发送日报的日期 
let intervalTimer = null  // 定时检测的定时器
let dailyTimer = null // 定时发送日报的定时器
let abnormalUrls = new Set()  // 保存当前异常的 URL
let abnormalStreak = new Map()  // 保存每个域名连续异常的轮数 (id -> 次数)


async function checkUrls(urlObjs) {
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
      console.log("url: ", url)
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
  }
}


function startTimers() {

  if (intervalTimer) clearInterval(intervalTimer);
  if (dailyTimer) clearInterval(dailyTimer);


  intervalTimer = setInterval(async () => {
    const urlObjs  = await getUrlsFromApi()
    checkUrls(urlObjs)
  }, 15 * 60 * 1000) // 每 15 分钟检测一次


  dailyTimer = setInterval(() => {
    const now = new Date()
    const HH = now.getHours()
    const mm = now.getMinutes()
    const today = now.toDateString()

    if (HH === 8 && mm === 0 && lastReportDate !== today) {
      sendMail(buildDailyReportHtml(dailyReport, dailyCount), true)
      lastReportDate = today
      dailyReport = new Map()
      dailyCount = new Map()
    }
  }, 60 * 1000)
}


(async () => {
  const urlObjs  = await getUrlsFromApi()
  console.log("urlObjs: ", urlObjs)

  await checkUrls(urlObjs)
  startTimers()
})();

