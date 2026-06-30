
function buildStatus(isDanger, accessible) {
  const safeStr = isDanger
    ? `<span style="color:red;">⚠️ 危险</span>`
    : `<span style="color:green;">✅ 安全</span>`;
  const accessStr = accessible
    ? `<span style="color:green;">✅ 可以访问</span>`
    : `<span style="color:red;">❌ 无法访问</span>`;
  return `${safeStr} / ${accessStr}`;
}


function buildNormalReportHtml(results) {
  let rows = results.map(r => `
    <tr>
      <td><a href="${r.url}">${r.url}</a></td>
      <td>${r.status}</td>
    </tr>
  `).join('');

  return `
    <table border="1" cellpadding="8" style="border-collapse:collapse;">
      <thead>
        <tr style="background:#f2f2f2;">
          <th>网址</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}


function buildDailyReportHtml(dailyReport, dailyCount) {
  let rows = Array.from(dailyReport.values()).map(r => {
    const count = dailyCount.get(r.url) || 0;
    return `
      <tr>
        <td><a href="${r.url}">${r.url}</a></td>
        <td>${r.status}</td>
        <td>${count}</td>
      </tr>
    `;
  }).join('');

  return `
    <table border="1" cellpadding="8" style="border-collapse:collapse;">
      <thead>
        <tr style="background:#f2f2f2;">
          <th>网址</th>
          <th>状态</th>
          <th>昨日检测次数</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// 构建异常告警的纯文本摘要 (用于飞书电话加急的文本消息)
function buildAlertText(alerts) {
  const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
  const list = alerts.map(a => `- ${a.url}`).join('\n')
  return `【网页监控】异常告警 ${time}\n检测到 ${alerts.length} 个异常域名(无法访问或被标记为危险):\n${list}\n请尽快处理`
}

module.exports = {
  buildStatus,
  buildNormalReportHtml,
  buildDailyReportHtml,
  buildAlertText
}

