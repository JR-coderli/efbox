/**
 * Gift LP 正文的"显示格式"与"存储格式"互转(纯字符串替换, 不重写 HTML)
 *
 * 背景: 曾试过 wangeditor 富文本编辑器, 但它会重写 HTML —— 正文里的产品名内链
 * (onclick Goto)被静默删除、相对路径星级图被丢弃、嵌套 span 被合并、引用底色丢失,
 * 对建站系统产出的内容破坏太大, 已弃用。现改为"可视化编辑": iframe 按线上真实
 * CSS 渲染正文并直接可编辑(contenteditable), 浏览器原生编辑只改动用户碰到的文字,
 * 其余内容原样保留, 存取之间不做任何结构转换。
 *
 * 需要转换的只有两件事:
 * 1. 图片路径: 正文里的星级图等用的是 LP 相对路径(images/xxx.png), 后台 iframe
 *    里加载不出来, 显示时拼上线上 LP 域名, 保存时还原;
 * 2. 浏览器序列化归一化: innerHTML 会把 U+00A0 空格写成 &nbsp;、<img/> 写成 <img>,
 *    保存时还原成原始写法, 使"打开→不改→保存"与库里内容字节一致(便于识别真实改动)。
 */

// 线上静态页地址(可视化编辑时引用其 CSS 并补全相对图片路径)
// 注意: 随投放版本升级同步更新(当前投放 v6, 资源结构与 v5 相同)
export const GIFT_LP_BASE = 'https://pro2.winrab.com/s2/1/ecomlistical/v6'

// 存储格式 → 显示格式: img 的相对路径(images/、videos/)拼上线上域名
export function toDisplayHtml(html) {
  if (!html) return html
  return html.replace(
    /(<img[^>]*\ssrc=")(images\/|videos\/)/g,
    (m, pre, rel) => pre + GIFT_LP_BASE + '/' + rel
  )
}

// 显示格式 → 存储格式
export function fromDisplayHtml(html) {
  if (!html) return html
  const base = GIFT_LP_BASE.replace(/\//g, '\\/')
  let out = html.replace(
    new RegExp('(<img[^>]*\\ssrc=")' + base + '\\/(images\\/|videos\\/)', 'g'),
    (m, pre, rel) => pre + rel
  )
  out = out.replace(/&nbsp;/g, ' ')
  out = out.replace(/<br>/g, '<br/>')
  out = out.replace(/<img([^>]*[^/])>/g, '<img$1/>')
  // 编辑器里新加的跳转链接(createLink 只生成裸 href): 还原成产品内链标准形式,
  // 与正文已有内链一致(线上点击走 Goto → clickflare 长链 → 当前窗口打开)
  out = out.replace(/<a href="([^"]*\/cf\/click\/[^"]*)">/g,
    (m, url) => "<a class='product_link' onclick='Goto(\"" + url + "\")'>")
  // 产品内链: 浏览器把单引号属性序列化成双引号+&quot;, 还原成原始写法。
  // 用"原地改写这两个属性"而不是重建整个标签: 编辑操作可能给 <a> 加上别的属性
  // (如给内链整体加粗的 style) 或改变属性顺序, 重建会把它们丢掉
  out = out.replace(/class="product_link"/g, "class='product_link'")
  out = out.replace(/onclick="Goto\(&quot;([^"]*)&quot;\)"/g, "onclick='Goto(\"$1\")'")
  return out
}
