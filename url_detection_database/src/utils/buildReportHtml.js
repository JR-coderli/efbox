
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


// ===== 域名清单日报(每日 8 点第二封邮件) =====
// 表1: 备用域名状态(分类/网址/是否被用过=被替换启用的次数)
// 表2: 主要在使用的域名(分类/域名/更新时间)——当前出现在 Clickflare / ef-tracker 落地页列表里的所有域名
function buildDomainListReportHtml(backup, inUse) {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 是否被用过:直接显示次数(0 表示没用过)
  const usedBadge = (n) => {
    const num = Number(n) || 0
    return num > 0
      ? `<span style="color:#c5221f;">${num}</span>`
      : '<span style="color:#5f6368;">0</span>'
  }

  const backupRows = backup.map(r => `
    <tr>
      <td>${esc(r.purpose) || '-'}</td>
      <td><a href="${esc(r.landing_page_url)}">${esc(r.landing_page_url)}</a></td>
      <td>${usedBadge(r.used_count)}</td>
    </tr>
  `).join('')

  // 来源小标签:cf=Clickflare / ef=ef-tracker,两侧都在用显示 cf+ef
  const srcTag = (sources) => {
    const s = String(sources || '')
    const cf = s.includes('clickflare')
    const ef = s.includes('eftracker')
    if (cf && ef) return 'cf+ef'
    if (cf) return 'cf'
    if (ef) return 'ef'
    return ''
  }

  const fmtTime = (t) => {
    if (!t) return '-'
    return String(t).replace('T', ' ').replace(/\.\d+/, '').replace(/Z$/, '')
  }

  const inUseRows = inUse.map(r => `
    <tr>
      <td>${esc(r.purpose) || '-'}</td>
      <td><a href="https://${esc(r.domain)}">${esc(r.domain)}</a> <span style="color:#999;font-size:12px;">(${srcTag(r.sources)})</span></td>
      <td>${fmtTime(r.updateAt)}</td>
    </tr>
  `).join('')

  const tableStyle = `border="1" cellpadding="8" style="border-collapse:collapse;width:100%;margin-bottom:8px;"`

  return `
    <h3 style="margin:16px 0 8px;">1) 备用域名状态</h3>
    <table ${tableStyle}>
      <thead>
        <tr style="background:#f2f2f2;">
          <th style="width:20%;">分类</th>
          <th>网址</th>
          <th style="width:16%;">是否被用过</th>
        </tr>
      </thead>
      <tbody>
        ${backupRows || '<tr><td colspan="3" style="color:#999;text-align:center;">暂无备用域名</td></tr>'}
      </tbody>
    </table>
    <br>

    <h3 style="margin:16px 0 8px;">2) 主要在使用的域名</h3>
    <table ${tableStyle}>
      <thead>
        <tr style="background:#f2f2f2;">
          <th style="width:20%;">分类</th>
          <th>域名</th>
          <th style="width:22%;">更新时间</th>
        </tr>
      </thead>
      <tbody>
        ${inUseRows || '<tr><td colspan="3" style="color:#999;text-align:center;">暂无数据</td></tr>'}
      </tbody>
    </table>
  `
}

module.exports = {
  buildStatus,
  buildNormalReportHtml,
  buildDailyReportHtml,
  buildAlertText,
  buildDomainListReportHtml
}

