<template>
  <div class="visual-editor">
    <!-- 格式工具栏:mousedown.prevent 防止点击按钮时丢失 iframe 里的文字选中;
         选中文字时回显其当前样式(字号值/颜色块/B·I·U 高亮) -->
    <div class="ve-toolbar" @mousedown.prevent>
      <el-dropdown trigger="click" @command="applyFontSize">
        <span class="ve-btn">
          {{ curSize || '字号' }} <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="s in FONT_SIZES" :key="s" :command="s">{{ s }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <span class="ve-color-wrap" title="当前文字颜色">
        <span class="ve-color-dot" :style="{ background: curColor || 'transparent' }"></span>
        <el-color-picker v-model="pickedColor" :predefine="PRESET_COLORS" size="small" @change="applyColor" />
      </span>

      <el-dropdown trigger="click" @command="applyLineHeight">
        <span class="ve-btn">
          行高 <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="h in ['1.5', '1.8', '2', '2.5']" :key="h" :command="h">{{ Number(h).toFixed(1) }} 倍</el-dropdown-item>
            <el-dropdown-item command="">默认(移除行高)</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <span class="ve-btn" title="给选中文字加跳转链接(与产品跳转同机制,当前窗口打开)" @click="addLink">链接</span>
      <span class="ve-btn" title="去掉选中文字的跳转链接" @click="removeLink">取消链接</span>

      <span class="ve-btn" :class="{ active: curBold }" title="加粗" @click="exec('bold')"><b>B</b></span>
      <span class="ve-btn" :class="{ active: curItalic }" title="斜体" @click="exec('italic')"><i>I</i></span>
      <span class="ve-btn" :class="{ active: curUnderline }" title="下划线" @click="exec('underline')"><u>U</u></span>
      <span class="ve-btn ve-clear" title="清除选中文字的所有格式" @click="exec('removeFormat')">清除格式</span>
    </div>

    <!-- 图片工具条: 点击正文里的图片后出现(图片按元素引用操作, 不依赖 iframe 选区, 不需要 mousedown.prevent) -->
    <div v-if="selectedImg" class="ve-toolbar ve-imgbar">
      <span class="ve-img-label">🖼 图片</span>
      <span class="ve-img-item">宽 <el-input-number v-model="imgW" :min="20" :max="4000" size="small" controls-position="right" style="width: 100px" /> px</span>
      <span class="ve-img-item">高 <el-input-number v-model="imgH" :min="0" :max="4000" size="small" controls-position="right" style="width: 100px" /> px<span class="ve-img-tip">(0=按宽自动)</span></span>
      <span class="ve-btn ve-apply" @click="applyImgSize">应用</span>
      <span class="ve-img-sep"></span>
      <span class="ve-img-label">快捷宽度</span>
      <span v-for="pct in [25, 50, 75, 100]" :key="pct" class="ve-btn" @click="applyImgPct(pct)">{{ pct }}%</span>
      <span class="ve-img-sep"></span>
      <span class="ve-btn" :class="{ active: imgRounded }" @click="toggleRounded">圆角</span>
      <span class="ve-btn" :class="{ active: imgCentered }" @click="toggleCenter">居中</span>
      <span class="ve-btn ve-clear" @click="clearImgSelect">取消选择</span>
    </div>

    <iframe ref="iframeRef" class="ve-frame" :srcdoc="doc" sandbox="allow-same-origin" :style="{ height: height }" @load="bindSelectionTracking"></iframe>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { GIFT_LP_BASE, toDisplayHtml, fromDisplayHtml } from '../gift-html'

const props = defineProps({
  modelValue: { type: String, default: '' },
  height: { type: String, default: '520px' },
  // 加链接弹窗的默认值(当前产品的跳转链接, 常用场景就是与产品同链)
  defaultLink: { type: String, default: '' }
})

// 正文常用字号(现内容以 24px 为主, 评分行 18px)与常用颜色
const FONT_SIZES = ['16px', '18px', '20px', '22px', '24px', '28px', '32px']
const PRESET_COLORS = ['#333333', '#000000', '#c5221f', '#e65100', '#188038', '#007bff', '#5f6368', '#ffffff']

const iframeRef = ref(null)
const pickedColor = ref(null)

// —— 当前选中文字的样式回显(选中/光标移动时刷新) ——
const curSize = ref('')        // 如 '24px'
const curColor = ref('')       // hex, 如 '#333333'
const curBold = ref(false)
const curItalic = ref(false)
const curUnderline = ref(false)

function rgbToHex(rgb) {
  const m = String(rgb || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return ''
  return '#' + [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, '0')).join('')
}

function refreshStyleState() {
  const idoc = iframeRef.value?.contentDocument
  const iwin = iframeRef.value?.contentWindow
  const sel = idoc?.getSelection?.()
  if (!idoc || !iwin || !sel || sel.rangeCount === 0) return
  // 从选区起点所在元素取计算样式(选中跨多段不同样式时, 回显起点处的样式)
  const node = sel.anchorNode
  const el = node ? (node.nodeType === 3 ? node.parentElement : node) : null
  if (!el || !idoc.contains(el)) return
  const cs = iwin.getComputedStyle(el)
  curSize.value = cs.fontSize || ''
  curColor.value = rgbToHex(cs.color) || ''
  pickedColor.value = curColor.value || null // 颜色面板打开时预选当前色
  try {
    curBold.value = idoc.queryCommandState('bold')
    curItalic.value = idoc.queryCommandState('italic')
    curUnderline.value = idoc.queryCommandState('underline')
  } catch { /* 个别浏览器不支持时忽略, 不影响编辑 */ }
}

// 用线上 LP 的 CSS 渲染 + contenteditable 直接改字(与线上页面效果一致)
// 附带与线上页面相同的防御样式: 粘贴内容带 white-space:pre 时在编辑器里同样正常换行, 所见即所得
const doc = computed(() => {
  const html = toDisplayHtml(props.modelValue)
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<link rel="stylesheet" href="' + GIFT_LP_BASE + '/css/smb-index.css">' +
    '<style>' +
    '.smb-section-main [style*="white-space: pre"], .smb-section-main [style*="white-space:pre"] { white-space: normal !important; }' +
    '.smb-section-main { overflow-wrap: anywhere; }' +
    '.smb-section-main * { max-width: 100%; }' +
    '</style>' +
    '</head><body contenteditable="true" spellcheck="false" style="margin:12px;background:#fff;outline:none;">' +
    '<div class="smb-section-main">' + (html || '') + '</div></body></html>'
})

// —— 选中文字的保存/恢复:点击工具栏(或颜色面板)会让 iframe 失焦, 应用格式前先恢复选区 ——
let savedRange = null

function bindSelectionTracking() {
  const idoc = iframeRef.value?.contentDocument
  if (!idoc) return
  idoc.addEventListener('selectionchange', () => {
    const sel = idoc.getSelection()
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      savedRange = sel.getRangeAt(0).cloneRange()
    }
    refreshStyleState()
  })
  // 点击图片 → 选中它(出图片工具条); 点其他地方 → 取消图片选中
  idoc.addEventListener('click', (e) => {
    if (e.target && e.target.tagName === 'IMG') selectImg(e.target)
    else clearImgSelect()
  })
}

// —— 图片编辑: 选中正文里的图片后调整宽高/快捷样式 ——
// 编辑器的选中描边(style.outline)在 getHtml 前会被清掉, 不会存进内容
const selectedImg = ref(null)
const imgW = ref(0)
const imgH = ref(0)
const imgRounded = ref(false)
const imgCentered = ref(false)

function selectImg(el) {
  if (selectedImg.value && selectedImg.value !== el) selectedImg.value.style.outline = ''
  selectedImg.value = el
  el.style.outline = '2px solid #409eff'
  const r = el.getBoundingClientRect()
  imgW.value = Math.round(r.width)
  imgH.value = Math.round(r.height)
  imgRounded.value = /[^0]\S*px/.test(el.style.borderRadius || '')
  imgCentered.value = el.style.display === 'block' && (el.style.marginLeft === 'auto' || el.style.margin === '0px auto' || el.style.marginRight === 'auto')
}

function clearImgSelect() {
  if (selectedImg.value) selectedImg.value.style.outline = ''
  selectedImg.value = null
}

// 应用自定义宽高: 高填 0 表示按宽度等比(height:auto); 同步移除 width/height 属性,
// 避免"属性 100x20"和"style 宽高"并存造成困惑(style 优先生效, 属性残留误导)
function applyImgSize() {
  const el = selectedImg.value
  if (!el || !imgW.value) { ElMessage.warning('请填写图片宽度'); return }
  el.removeAttribute('width')
  el.removeAttribute('height')
  el.style.width = imgW.value + 'px'
  el.style.height = imgH.value > 0 ? imgH.value + 'px' : 'auto'
  ElMessage.success('已应用图片尺寸')
}

// 快捷宽度: 按容器百分比, 响应式(手机上也按比例), 高度等比自适应
function applyImgPct(pct) {
  const el = selectedImg.value
  if (!el) return
  el.removeAttribute('width')
  el.removeAttribute('height')
  el.style.width = pct + '%'
  el.style.height = 'auto'
  const r = el.getBoundingClientRect()
  imgW.value = Math.round(r.width)
  imgH.value = Math.round(r.height)
}

function toggleRounded() {
  const el = selectedImg.value
  if (!el) return
  imgRounded.value = !imgRounded.value
  el.style.borderRadius = imgRounded.value ? '8px' : ''
}

function toggleCenter() {
  const el = selectedImg.value
  if (!el) return
  imgCentered.value = !imgCentered.value
  if (imgCentered.value) {
    el.style.display = 'block'
    el.style.margin = '0 auto'
  } else {
    el.style.display = ''
    el.style.margin = ''
  }
}

function restoreSelection() {
  const win = iframeRef.value?.contentWindow
  const idoc = iframeRef.value?.contentDocument
  if (!win || !idoc) return false
  win.focus()
  const sel = idoc.getSelection()
  if (!sel) return false
  // 当前有有效选中直接用; 否则恢复最近一次选区(点工具栏导致失焦的场景)
  if (sel.rangeCount > 0 && !sel.isCollapsed) return true
  if (savedRange) {
    sel.removeAllRanges()
    sel.addRange(savedRange)
    return true
  }
  return false
}

function exec(cmd, val) {
  if (!restoreSelection()) {
    ElMessage.warning('请先在正文中选中要修改的文字')
    return
  }
  const idoc = iframeRef.value.contentDocument
  // styleWithCSS: 生成 <span style="..."> 而不是 <font> 标签, 与正文现有写法一致
  idoc.execCommand('styleWithCSS', false, true)
  idoc.execCommand(cmd, false, val)
  // 应用格式后选区可能不触发 selectionchange, 主动刷新回显
  setTimeout(refreshStyleState, 0)
}

// execCommand 的 fontSize 只支持 1-7 号(映射到 xx-small..xx-large):
// 先统一打上 7 号(生成 font-size: xxx-large), 再把 xxx-large 批量替换成目标 px
function applyFontSize(px) {
  exec('fontSize', '7')
  const idoc = iframeRef.value?.contentDocument
  if (!idoc) return
  idoc.querySelectorAll('span[style*="xxx-large"]').forEach((el) => {
    el.style.fontSize = px
  })
}

function applyColor(hex) {
  if (!hex) return
  exec('foreColor', hex)
}

// 行高: 作用于选区覆盖到的所有段落(p / 飞书 rich-text-paragraph)。
// 段落级设置才是"不同产品行距不一致"的病根(有的段落带 line-height:29px !important),
// 用 setProperty(...,'important') 保证能覆盖已存在的 !important 行高; 空值=移除
function applyLineHeight(val) {
  const idoc = iframeRef.value?.contentDocument
  if (!idoc || !restoreSelection()) {
    ElMessage.warning('请先选中要调整行高的文字')
    return
  }
  const range = idoc.getSelection().getRangeAt(0)
  const root = idoc.querySelector('.smb-section-main')
  let touched = 0
  root.querySelectorAll('p, div.rich-text-paragraph').forEach((p) => {
    if (!range.intersectsNode(p)) return
    if (val) p.style.setProperty('line-height', val, 'important')
    else p.style.removeProperty('line-height')
    touched++
  })
  if (!touched) ElMessage.warning('没找到选中文字所在的段落')
}

// 给选中文字加跳转链接: 编辑器里先生成普通 <a href>, 保存时由 fromDisplayHtml
// 还原成产品内链标准形式(onclick Goto)——线上点击与产品按钮同机制, 当前窗口打开
async function addLink() {
  if (!restoreSelection()) {
    ElMessage.warning('请先选中要加链接的文字')
    return
  }
  let url
  try {
    const res = await ElMessageBox.prompt(
      '填短链接(与产品跳转链接同机制: 线上自动变长链, 点击在当前窗口打开)',
      '添加跳转链接',
      { inputValue: props.defaultLink || '', confirmButtonText: '确定', cancelButtonText: '取消' }
    )
    url = String(res.value || '').trim()
  } catch { return /* 用户取消 */ }
  if (!url) return
  restoreSelection() // 弹窗会夺走焦点, 应用前再恢复一次选区
  const idoc = iframeRef.value.contentDocument
  idoc.execCommand('styleWithCSS', false, true)
  idoc.execCommand('createLink', false, url)
}

function removeLink() {
  if (!restoreSelection()) {
    ElMessage.warning('请先选中要取消链接的文字')
    return
  }
  const idoc = iframeRef.value.contentDocument
  idoc.execCommand('unlink', false, null)
}

// 供父组件取编辑结果(已还原为存储格式; iframe 未加载完/内容为空返回 '')
function getHtml() {
  clearImgSelect() // 先去掉图片选中描边, 避免存进内容
  const el = iframeRef.value?.contentDocument?.querySelector('.smb-section-main')
  const html = el ? el.innerHTML.trim() : ''
  return html ? fromDisplayHtml(html) : ''
}

// script setup 默认对外封闭, 必须显式暴露, 否则父组件 ref 拿不到 getHtml(保存时报 not a function)
defineExpose({ getHtml })

onBeforeUnmount(() => {
  iframeRef.value = null
  savedRange = null
})
</script>

<style scoped>
.visual-editor { width: 100%; }
.ve-toolbar { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border: 1px solid #dcdfe6; border-bottom: none; border-radius: 4px 4px 0 0; background: #f5f7fa; }
.ve-btn { cursor: pointer; font-size: 13px; color: #606266; user-select: none; display: inline-flex; align-items: center; gap: 2px; padding: 2px 6px; border-radius: 4px; }
.ve-btn:hover { color: #409eff; }
.ve-btn.active { color: #409eff; background: #ecf5ff; }
.ve-clear { font-size: 12px; color: #909399; margin-left: 4px; }
.ve-imgbar { border-top: none; border-bottom: none; border-radius: 0; background: #f0f7ff; }
.ve-img-label { font-size: 12px; color: #409eff; font-weight: 600; }
.ve-img-item { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #606266; }
.ve-img-tip { color: #c0c4cc; font-size: 11px; }
.ve-img-sep { width: 1px; height: 14px; background: #dcdfe6; display: inline-block; }
.ve-apply { color: #409eff; font-weight: 600; }
.ve-color-wrap { display: inline-flex; align-items: center; gap: 4px; }
.ve-color-dot { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #dcdfe6; display: inline-block; }
.ve-frame { width: 100%; border: 1px solid #dcdfe6; border-radius: 0 0 4px 4px; background: #fff; display: block; }
</style>
