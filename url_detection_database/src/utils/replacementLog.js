const axios = require('axios')

/**
 * 写入替换过程日志(落库到 domain-api 的 domain_replacement_logs 表)。
 * 记录替换/复核/二次核验全过程的事件流, 供事后排查("不只记最终结果, 过程也要有记录")。
 * 设计原则: 绝不阻塞、绝不影响主流程——失败只打本地日志; 不 await 调用方也无所谓
 * (本函数内部自捕获, fire-and-forget 安全; 需要保证顺序的场景可 await)。
 *
 * @param {string} domain 域名(hostname)
 * @param {string} event  事件类型: replace_start/backup_selected/sync/cf_result/ef_result/
 *                        both_unused/verdict/notice/verify_start/verify_result/verify_call/
 *                        alert_sent/daily_report/auto_demoted/manual_demoted/safe_browsing
 * @param {object|string} detail 事件描述(面向用户的中文)
 * @param {number} [round] 第几轮异常(1-3), 系统级事件不传
 */
async function logReplacementEvent(domain, event, detail, round) {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const body = {
      domain,
      event,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail ?? {})
    }
    if (Number.isInteger(round) && round >= 1) body.round = round
    await axios.post(`${baseUrl}/domains/internal/replacement_log`, body, { timeout: 10000 })
  } catch (err) {
    // 日志写失败绝不影响业务, 本地 console 留痕即可
    console.log(`⚠️ 替换过程日志写入失败(${domain}/${event}): ${err.message}`)
  }
}

module.exports = logReplacementEvent
