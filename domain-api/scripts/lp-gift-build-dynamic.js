/**
 * 礼品清单 LP 页动态化改造:把 43490 静态页(47 个硬编码产品板块)改造成
 * 从 zorfell.com/lp/gift/products 拉数据动态渲染的版本
 *
 * 源: index.static.bak.html(原始静态版备份) → 输出: index.html(动态版, 部署到 pro2.winrab.com)
 * 用法: node scripts/lp-gift-build-dynamic.js
 * 所有替换都用精确锚点, 锚点缺失立即报错退出, 不会产生半改造状态
 */
const fs = require('fs')

const DIR = 'C:/Users/aha/Desktop/1102/43490'
const SRC = DIR + '/index.static.bak.html'
const OUT = DIR + '/index.html'


// ================= 动态渲染脚本(注入页面, 替换原 data_list 渲染逻辑) =================
const RENDER_SCRIPT = `  // ===== 礼品清单 LP 动态渲染(数据来自后台 LP产品管理 → 礼品清单LP) =====
  // 接口默认走线上;本地联调可在 URL 加 ?api=http://localhost:8001 覆盖
  (function () {
    var API_BASE = (new URLSearchParams(location.search).get('api') || window.LP_API_BASE || 'https://zorfell.com').replace(/\\/+$/, '');
    var API_URL = API_BASE + '/lp/gift/products';

    function esc(s) { // 文本节点转义
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
    function attr(s) { // 属性值转义(用于 src 与 onclick 内嵌)
      return esc(s).replace(/'/g, '&#39;').replace(/"/g, '&quot;')
    }
    function gotoAttr(link) { // 统一的点击跳转属性(沿用原页 Goto/clickflare 链路)
      return 'onclick="Goto(\\'' + attr(link) + '\\')" href="javascript:void(0);"'
    }
    function mediaHtml(p) {
      // 产品主图显示样式(后台"显示大小"设置): 图片直接应用; 视频保留原 max-width 基础上叠加
      var extra = p.media_style ? ' ' + attr(p.media_style) : ''
      return p.media_type === 2
        ? '<video src="' + attr(p.media_url) + '" style="max-width:100%;' + extra + '" autoplay="autoplay" muted="muted" loop="loop"></video>'
        : '<img src="' + attr(p.media_url) + '"' + (p.media_style ? ' style="' + attr(p.media_style) + '"' : '') + '>'
    }

    // 单个产品板块(结构与原静态页一致; num=主列表编号(逆序), null=New Arrivals)
    function sectionHtml(p, num) {
      var titleA = '<a class="smb-section-title product_link" ' + gotoAttr(p.link) + '>' + esc(p.title) + '</a>'
      var headerWrap = num
        ? '<div class="smb-section-title-container">\\n          <span class="smb-section-number">' + num + '.</span>\\n          ' + titleA + '\\n        </div>'
        : '<div class="smb-section-header-container">\\n          ' + titleA + '\\n        </div>'
      var buttonCls = p.sold_out === 1 ? 'product_link sold-out-button' : 'product_link'
      return '<section>\\n' +
        '      <div class="smb-section-header">\\n        ' + headerWrap + '\\n      </div>\\n' +
        '      <div class="smb-product-source">\\n' +
        '        <a class="smb-product-img product_link" ' + gotoAttr(p.link) + '>\\n          ' + mediaHtml(p) + '\\n        </a>\\n' +
        '      </div>\\n' +
        '      <div class="smb-section-main">\\n        ' + (p.content || '') + '\\n      </div>\\n' +
        '      <div class="smb-button ">\\n' +
        '        <a class="' + buttonCls + '" ' + gotoAttr(p.link) + '>' + esc(p.product_name || '') + '</a>\\n' +
        '      </div>\\n' +
        '    </section>'
    }

    function render(data) {
      var cfg = data.config || {}
      var t = document.getElementById('lp-title-text')
      if (t && cfg.title) t.textContent = cfg.title
      var hero = document.getElementById('lp-hero')
      if (hero && cfg.hero_url) hero.src = cfg.hero_url
      var intro = document.getElementById('lp-intro')
      if (intro && cfg.intro_html) intro.innerHTML = cfg.intro_html

      var list = data.products || []
      var main = list.filter(function (p) { return p.group_type === 1 })
      var arrivals = list.filter(function (p) { return p.group_type === 2 })

      // 主列表逆序编号(复刻原 setSectionNumber: 第一个板块编号 = 可见主列表总数), 之后 New Arrivals 分隔栏 + 新品区
      var html = main.map(function (p, i) { return sectionHtml(p, main.length - i) }).join('\\n')
      if (arrivals.length > 0) {
        html += '<section>\\n        <h2>-- -- New Arrivals -- --</h2>\\n      </section>\\n'
        html += arrivals.map(function (p) { return sectionHtml(p, null) }).join('\\n')
      }
      document.getElementById('lp-sections').innerHTML = html

      // 侧栏: Quick Links(主列表, ol reversed) + Bonus(New Arrivals, ul)
      var quick = document.getElementById('lp-quick-links')
      if (quick) quick.innerHTML = main.map(function (p) {
        return '<li>\\n          <a class="product_link" ' + gotoAttr(p.link) + '>' + esc(p.title) + '</a>\\n        </li>'
      }).join('\\n')
      var bonus = document.getElementById('lp-bonus-links')
      if (bonus) bonus.innerHTML = arrivals.map(function (p) {
        return '<li>\\n          <a class="product_link" ' + gotoAttr(p.link) + '>' + esc(p.title) + '</a>\\n        </li>'
      }).join('\\n')
    }

    function load(attempt) {
      fetch(API_URL + '?t=' + Date.now())
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
        .then(function (res) {
          if (res.code !== 0 || !res.data) throw new Error('接口返回异常')
          render(res.data)
        })
        .catch(function (err) {
          if (attempt < 2) {
            setTimeout(function () { load(attempt + 1) }, attempt === 0 ? 1000 : 3000)
          } else {
            console.error('礼品清单 LP 数据加载失败:', err && err.message)
            // 兜底: 隐藏产品区与侧栏, 静态 header/footer 仍可见
            var s = document.getElementById('lp-sections'); if (s) s.style.display = 'none'
            var a = document.querySelector('aside'); if (a) a.style.display = 'none'
          }
        })
    }
    load(0)
  })();
`


// ================= Goto 委托版(替换原函数, 见下方第 7 步说明) =================
const GOTO_FN = `function Goto(url) {
      try {
        gtag('event', 'list_product', {
          'event_label': 'List Product',
          'event_category': 'ecommerce'
        });
      } catch (e) { /* GTM 未启用时 gtag 不存在, 不影响跳转 */ }

      // clickflare 长链: 委托同序号隐藏锚点(.cta-btn001...)的真实点击。
      // 锚点已被 clickflare 改写时, href 是 javascript:window.clickflare.l=... (由 clickflare 接管带参跳转);
      // 未被改写时点击锚点仍直达短链, 与原行为一致
      var cf = String(url).match(/\\/cf\\/click\\/(\\d+)/);
      if (cf) {
        var cfA = document.querySelector('.cta-btn' + ('00' + cf[1]).slice(-3));
        if (cfA) { cfA.click(); return; }
      }

      if(url.indexOf('?') != -1){
        if(url.lastIndexOf('?') == (url.length -1)){
          url = url;
        }else if(url.lastIndexOf('&') == (url.length -1)){
          url = url;
        }else{
          url = url + '&';
        }
      }else{
        url = url + '?';
      }

      var link = url + GetRequest();
      if (window.clickflare && window.clickflare.push) {
        window.clickflare.push("jump");
      }
      window.location.href = link;
    }`


let html = fs.readFileSync(SRC, 'utf8')
const assert = (cond, msg) => { if (!cond) { console.error('转换失败: ' + msg); process.exit(1) } }

// ---------- 1. header: 大标题 span 挂 id(接口数据注入点, 保留原文本作兜底) ----------
const titleOld = '<span style="font-size: 36px;">29+ Clever Gadgets Worth Adding to Your 2026 Holiday Gift List</span>'
assert(html.includes(titleOld), '未找到大标题 span')
html = html.replace(titleOld, '<span style="font-size: 36px;" id="lp-title-text">29+ Clever Gadgets Worth Adding to Your 2026 Holiday Gift List</span>')

// ---------- 2. header: 头图挂 id ----------
const HERO_IMG = 'images/1789104504_a70aa546456456457e01842ad774c52c.jpg'
const heroOld = '<p style="white-space: normal;"><img src="' + HERO_IMG + '"/></p>'
assert(html.includes(heroOld), '未找到头图段落')
html = html.replace(heroOld, '<p style="white-space: normal;"><img src="' + HERO_IMG + '" id="lp-hero"/></p>')

// ---------- 3. header: 导语段落包一层 #lp-intro ----------
const introStart = '<p style="white-space: normal;"><strong style="font-size: 24px;">The 2026 Holiday Gift Hunt Starts Early</strong></p>'
assert(html.includes(introStart), '未找到导语起始段')
html = html.replace(introStart, '<div id="lp-intro">' + introStart)
assert(html.split('</header>').length === 2, '</header> 应只出现一次')
html = html.replace('</p>    </header>', '</p></div>    </header>')

// ---------- 4. 移除全部产品板块(</header> 到 <aside> 之间), 换成动态容器 ----------
const hEnd = html.indexOf('</header>')
const aStart = html.indexOf('<aside>')
assert(hEnd > -1 && aStart > hEnd, 'header/aside 定位失败')
const sectionCount = (html.slice(hEnd, aStart).match(/<section>/g) || []).length
html = html.slice(0, hEnd + '</header>'.length) +
  '\n\n    <!-- 产品板块由接口动态渲染(后台: LP产品管理 → 礼品清单LP), 数据接口 /lp/gift/products -->\n    <div id="lp-sections"></div>\n\n  ' +
  html.slice(aStart)
console.log('已移除硬编码板块数(含 New Arrivals 分隔栏):', sectionCount)

// ---------- 5. aside: 两个侧栏列表清空并挂 id(Quick Links 主列表 + Bonus 新品) ----------
const olOld = '<ol class="smb-aside-ol" reversed>'
const olStart = html.indexOf(olOld)
assert(olStart > -1, '未找到 Quick Links ol')
const olEnd = html.indexOf('</ol>', olStart)
html = html.slice(0, olStart) + '<ol class="smb-aside-ol" reversed id="lp-quick-links"></ol>' +
  html.slice(olEnd + '</ol>'.length)

const ulOld = '<ul class="smb-new-arrivals-ul">'
const ulStart = html.indexOf(ulOld)
assert(ulStart > -1, '未找到 Bonus ul')
const ulEnd = html.indexOf('</ul>', ulStart)
html = html.slice(0, ulStart) + '<ul class="smb-new-arrivals-ul" id="lp-bonus-links"></ul>' +
  html.slice(ulEnd + '</ul>'.length)

// ---------- 6. 底部脚本: 移除 data_list/setSectionNumber/setSectionProductLink, 注入动态渲染 ----------
const scriptStart = html.indexOf('  getDataList();\n')
assert(scriptStart > -1, '未找到 getDataList 调用')
const endMarker = "  function setSectionProductLink(){\n    $('.product_link').attr('href','javascript:void(0);')\n  }"
const endIdx = html.indexOf(endMarker)
assert(endIdx > scriptStart, '未找到 setSectionProductLink 结束锚点')

html = html.slice(0, scriptStart) + RENDER_SCRIPT + html.slice(endIdx + endMarker.length)

// ---------- 7. clickflare 长链支持: 隐藏锚点池 + Goto 委托 ----------
// clickflare 只在页面加载阶段把 <a href="短链"> 改写为长链 js-href; 动态渲染的产品锚点
// (onclick=Goto) 永远不会被改写, 导致投放时产品跳转仍是短链。
// 解决: 在 <body> 顶部(clickflare 脚本之前)放一个静态隐藏锚点池(序号 1-60)供其改写,
// Goto 点击产品时按序号委托锚点真实点击(改写后 href 是 javascript:window.clickflare.l=...,
// 配合锚点自身的 onclick push('jump') 走完整长链跳转, 与 zorfell LP 同款机制)。
// 注意: 产品链接序号上限 60, 超出则回退直接跳短链
const CF_POOL = Array.from({ length: 60 }, (_, i) => {
  const n = i + 1
  const id = ('00' + n).slice(-3)
  return '  <a class="cta-btn' + id + '" style="display: none;" href="https://eco.tsavros.com/cf/click/' + n + '" onclick="window.clickflare&&window.clickflare.push(\'jump\')"></a>'
}).join('\n')
const bodyOpen = html.indexOf('<body>')
assert(bodyOpen > -1, '未找到 <body>')
html = html.slice(0, bodyOpen + 6) + '\n\n  <!-- clickflare 长链隐藏锚点池(序号1-60): Goto 按序号委托点击 -->\n' + CF_POOL + '\n' + html.slice(bodyOpen + 6)

// Goto 函数替换为委托版(保留原短链逻辑作兜底)
const gotoStart = html.indexOf('function Goto(url) {')
const gotoEndMarker = '      window.location.href = link;\n    }'
const gotoEnd = html.indexOf(gotoEndMarker)
assert(gotoStart > -1 && gotoEnd > gotoStart, 'Goto 函数定位失败')
html = html.slice(0, gotoStart) + GOTO_FN + html.slice(gotoEnd + gotoEndMarker.length)

// ---------- 8. 防御样式: 后台粘贴的外部正文可能带 white-space:pre(整段不换行), 会把页面撑出横向滚动 ----------
const cssLink = '<link rel="stylesheet" href="css/smb-index.css">'
assert(html.includes(cssLink), '未找到 css link')
html = html.replace(cssLink, cssLink + `
  <style>
    /* 防御: 后台粘贴的外部正文(飞书等)可能带内联 white-space:pre(整段不换行)或超宽元素, 会把页面撑出横向滚动条 */
    .smb-section-main [style*="white-space: pre"], .smb-section-main [style*="white-space:pre"],
    #lp-intro [style*="white-space: pre"], #lp-intro [style*="white-space:pre"] { white-space: normal !important; }
    .smb-section-main, #lp-intro { overflow-wrap: anywhere; }
    .smb-section-main *, #lp-intro * { max-width: 100%; }
    /* 产品主图: 无论后台设置多大宽度, 都压在内容区内, 不撑破排版 */
    .smb-product-source img, .smb-product-source video { max-width: 100%; }
  </style>`)

fs.writeFileSync(OUT, html)
console.log('已生成动态版:', OUT, `(${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`)
