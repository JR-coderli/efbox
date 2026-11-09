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

      <span class="ve-btn" :class="{ active: curBold }" title="加粗" @click="exec('bold')"><b>B</b></span>
      <span class="ve-btn" :class="{ active: curItalic }" title="斜体" @click="exec('italic')"><i>I</i></span>
      <span class="ve-btn" :class="{ active: curUnderline }" title="下划线" @click="exec('underline')"><u>U</u></span>
      <span class="ve-btn ve-clear" title="清除选中文字的所有格式" @click="exec('removeFormat')">清除格式</span>
    </div>

    <iframe ref="iframeRef" class="ve-frame" :srcdoc="doc" sandbox="allow-same-origin" :style="{ height: height }" @load="bindSelectionTracking"></iframe>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { GIFT_LP_BASE, toDisplayHtml, fromDisplayHtml } from '../gift-html'

const props = defineProps({
  modelValue: { type: String, default: '' },
  height: { type: String, default: '520px' }
})

// 正文常用字号(现内容以 24px 为主, 评分行 18px)与常用颜色
const FONT_SIZES = ['16px', '18px', '20px', '22px', '24px', '28px', '32px']
const PRESET_COLORS = ['#333333', '#000000', '#c5221f', '#e65100', '#188038', '#1a73e8', '#5f6368', '#ffffff']

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

// 供父组件取编辑结果(已还原为存储格式; iframe 未加载完/内容为空返回 '')
function getHtml() {
  const el = iframeRef.value?.contentDocument?.querySelector('.smb-section-main')
  const html = el ? el.innerHTML.trim() : ''
  return html ? fromDisplayHtml(html) : ''
}

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
.ve-color-wrap { display: inline-flex; align-items: center; gap: 4px; }
.ve-color-dot { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #dcdfe6; display: inline-block; }
.ve-frame { width: 100%; border: 1px solid #dcdfe6; border-radius: 0 0 4px 4px; background: #fff; display: block; }
</style>
