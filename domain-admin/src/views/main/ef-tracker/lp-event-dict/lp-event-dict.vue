<template>
  <div class="google-content">
    <!-- 页头: 标题 + 统计 + 主操作 -->
    <div class="page-header">
      <div class="header-left">
        <!-- <div class="page-title">
          <span class="title-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#1a73e8">
              <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM10 9h8v2h-8zm0 3h4v2h-4zm0-6h8v2h-8z"/>
            </svg>
          </span>
          LP 行为事件字典
        </div> -->
      </div>
      <div class="header-right">
        <div class="stat-chips">
          <span class="stat-chip"><b>{{ rows.length }}</b> 条目</span>
          <span class="stat-chip chip-blue"><b>{{ standardCount }}</b> SDK 标准</span>
          <span class="stat-chip chip-amber"><b>{{ rows.length - standardCount }}</b> 自定义</span>
        </div>
        <button class="google-btn google-btn-primary" @click="focusNew">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          新建字典项
        </button>
      </div>
    </div>

    <!-- 列表卡片 -->
    <div class="content-card">
      <div class="card-toolbar">
        <input v-model="filterLid" class="g-input" placeholder="按 lid 筛选（空=全部，0=全局通用）" style="width: 280px" @keyup.enter="loadDict" />
        <button class="google-btn google-btn-secondary" @click="loadDict">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          查询
        </button>
      </div>

      <div class="table-wrap">
        <table class="g-table" v-loading="loading">
          <colgroup ref="colgroupRef">
            <col v-for="(col, i) in columns" :key="col.key" :style="{ width: col.width ? col.width + 'px' : undefined }" />
          </colgroup>
          <thead>
            <tr ref="theadTrRef">
              <th v-for="(col, i) in columns" :key="col.key"
                :class="{ 'col-resizable': i < columns.length - 1 }"
              >{{ col.label }}<span v-if="i < columns.length - 1" class="col-grip" @mousedown="startResize($event, i)"></span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="rows.length === 0 && !loading">
              <td :colspan="columns.length" class="g-table-empty">
                <div class="empty-box">
                  <svg viewBox="0 0 24 24" width="36" height="36" fill="#dadce0"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
                  <div>暂无字典数据</div>
                </div>
              </td>
            </tr>
            <tr v-for="row in rows" :key="row.id">
              <td class="mono dim">{{ row.lid }}</td>
              <td><code class="event-code">{{ row.event_name }}</code></td>
              <td class="display-name">{{ row.display_name || '-' }}</td>
              <td class="ellip"><el-tooltip :content="row.description" placement="top" :disabled="!row.description" :show-after="300" popper-class="dict-desc-tip"><span>{{ row.description || '-' }}</span></el-tooltip></td>
              <td>
                <span v-if="row.is_standard" class="g-chip">SDK</span>
                <span v-else class="type-custom">自定义</span>
              </td>
              <td class="dim">{{ fmtTime(row.updated_at) }}</td>
              <td><button class="g-link-btn" @click="startEdit(row)">编辑</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新建/修改弹窗：点"新建字典项"或表格"编辑"打开 -->
    <el-dialog v-model="formDialogVisible" width="640px" :close-on-click-modal="false" class="google-dialog">
      <template #header>
        <div class="g-dialog-header">
          <template v-if="editing">
            <span class="editing-dot"></span>
            修改字典项
            <code class="event-code">{{ form.event_name }}</code>
          </template>
          <template v-else>新建字典项</template>
        </div>
      </template>
      <div class="g-form">
        <div class="g-form-item lid-picker">
          <label class="g-label">归属 LP <span class="req">*</span></label>
          <!-- 已选中或编辑锁定态: 展示 chip -->
          <div v-if="editing || lidSelected" class="lid-chip big" :class="{ global: form.lid === 0, lp: form.lid !== 0 }">
            <span v-if="form.lid === 0">全局通用</span>
            <template v-else>LP {{ form.lid }} <span class="lid-name">{{ lidSelectedName }}</span></template>
            <button v-if="!editing" type="button" class="lid-clear" title="清除重选" @click="clearLid">×</button>
          </div>
          <div v-if="submitted && form.lid === null" class="field-error">请选择归属 LP（搜索选择，或点下方设为全局通用）</div>
          <!-- 选择态: 输入框(模糊搜索) + 下拉 -->
          <div v-if="!editing && !lidSelected" class="lid-search" v-click-outside="closeLidDrop">
            <input
              v-model="lidKeyword"
              class="g-input"
              placeholder="搜索 LP（id / 名称）"
              @focus="lidDropOpen = true"
              @input="lidDropOpen = true"
            />
            <div v-if="lidDropOpen && lidOptions.length" class="lid-drop">
              <div
                v-for="opt in lidOptions"
                :key="opt.value"
                class="lid-opt"
                @mousedown.prevent="pickLid(opt)"
              >
                <span class="lid-opt-id">{{ opt.value }}</span>
                <span class="lid-opt-name">{{ opt.label }}</span>
                <span v-if="opt.isExternal" class="lid-opt-tag ext">外部</span>
              </div>
              <div v-if="lidOptions.length >= 20" class="lid-drop-more">仅显示前 20 条，输入更多字符缩小范围</div>
            </div>
          </div>
          <button v-if="!editing && !lidSelected" type="button" class="lid-global-link" @click="pickLid({ value: 0 })">🌐 设为全局通用（lid=0）</button>
          <div v-if="editing" class="editing-hint-line">唯一键（lid + 事件名）已锁定，只改说明字段</div>
        </div>
        <div class="g-form-item">
          <label class="g-label">事件名 <span class="req">*</span></label>
          <input v-model="form.event_name" class="g-input" :class="{ 'input-error': submitted && !form.event_name.trim() }" placeholder="小写字母/数字/下划线" maxlength="64" :disabled="editing" />
          <div v-if="submitted && !form.event_name.trim()" class="field-error">请填写事件名</div>
        </div>
        <div class="g-form-item">
          <label class="g-label">人话名 <span class="req">*</span></label>
          <input v-model="form.display_name" class="g-input" :class="{ 'input-error': submitted && !form.display_name.trim() }" placeholder="如: 领取优惠券" maxlength="255" />
          <div v-if="submitted && !form.display_name.trim()" class="field-error">请填写人话名（这条说明给人看，必填）</div>
        </div>
        <div class="g-form-item">
          <label class="g-label">详情（触发条件 / 参数含义，可选）</label>
          <input v-model="form.description" class="g-input" placeholder="例如: 用户点击领券按钮时触发，push 位置在 claimCoupon 函数" />
        </div>
      </div>
      <template #footer>
        <button class="google-btn google-btn-secondary" @click="formDialogVisible = false">取消</button>
        <button class="google-btn google-btn-primary" @click="handleSave" :disabled="saving || form.lid === null || !form.event_name || !form.display_name">{{ saving ? '保存中…' : '保存' }}</button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getLpEventDict, upsertLpEventDict, getLanders } from '@/services/main/ef-tracker'

const loading = ref(false)
const saving = ref(false)
const rows = ref([])
const filterLid = ref('')
const editing = ref(false)
const submitted = ref(false) // 点过保存后才开始显示必填校验提示
const form = reactive({ lid: null, event_name: '', display_name: '', description: '' })

const standardCount = computed(() => rows.value.filter((r) => r.is_standard).length)

// ===== 列配置 + 列宽拖拽（与 ef-tracker 其他列表同能力; 详情列弹性无固定宽） =====
const columns = ref([
  { key: 'lid', label: 'lid', width: 70 },
  { key: 'event_name', label: '事件名', width: 200 },
  { key: 'display_name', label: '说明（人话名）', width: 180 },
  { key: 'description', label: '详情', width: null },   // 弹性列
  { key: 'type', label: '类型', width: 80 },
  { key: 'updated_at', label: '更新时间', width: 170 },
  { key: 'action', label: '操作', width: 64 }
])
const theadTrRef = ref(null)
const colgroupRef = ref(null)
let resizeCtx = null // {index, startX, startWidth}

function startResize(e, index) {
  const th = theadTrRef.value?.children[index]
  if (!th) return
  resizeCtx = { index, startX: e.clientX, startWidth: th.offsetWidth }
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  e.preventDefault()
}

function onResizeMove(e) {
  if (!resizeCtx) return
  const MIN_W = 50
  const next = resizeCtx.startWidth + (e.clientX - resizeCtx.startX)
  const clamped = Math.max(MIN_W, next)
  // 直接写 <col> 元素宽(DOM 级操作, 不改响应式 columns → 不触发整表重渲染):
  // table-layout:fixed 下 colgroup 定宽是唯一权威, 其他列宽不受牵连 → 只有本列伸缩
  const col = colgroupRef.value?.children[resizeCtx.index]
  if (col) col.style.width = clamped + 'px'
}

function onResizeEnd() {
  if (!resizeCtx) return
  resizeCtx = null
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(() => {
  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', onResizeEnd)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeEnd)
})

// ===== 归属 LP 选择器: 下拉直接选 / 输入模糊搜(含全局通用"0") =====
const landerList = ref([])        // [{id, name, is_external}]
const lidKeyword = ref('')
const lidDropOpen = ref(false)

const lidSelected = computed(() => form.lid !== null)
const lidSelectedName = computed(() => {
  const hit = landerList.value.find((l) => l.id === form.lid)
  return hit ? hit.name : ''
})

// 搜索项: 模糊命中(数字命中 id 前缀 / 文本命中名称), 上限 20; 全局通用不走下拉, 用下方快捷链接选
const lidOptions = computed(() => {
  const kw = lidKeyword.value.trim().toLowerCase()
  const pool = landerList.value.filter((l) => {
    if (!kw) return true
    if (/^\d+$/.test(kw)) return String(l.id).startsWith(kw)
    return l.name.toLowerCase().includes(kw)
  })
  return pool.slice(0, 20).map((l) => ({ value: l.id, label: l.name, isExternal: l.is_external === 1 }))
})

function pickLid(opt) {
  form.lid = opt.value
  lidKeyword.value = ''
  lidDropOpen.value = false
}

function clearLid() {
  form.lid = null
  lidKeyword.value = ''
}

function closeLidDrop() {
  lidDropOpen.value = false
}

// 点击外部关闭下拉(指令式, 避免 document 全局监听与组件销毁清理)
const vClickOutside = {
  mounted(el, binding) {
    el.__clickOutside__ = (e) => {
      if (!el.contains(e.target)) binding.value()
    }
    document.addEventListener('mousedown', el.__clickOutside__)
  },
  unmounted(el) {
    document.removeEventListener('mousedown', el.__clickOutside__)
  }
}

async function loadLanders() {
  try {
    const res = await getLanders({ page: 1, size: 200 })
    landerList.value = (res?.list || []).map((l) => ({ id: l.id, name: l.name || '', is_external: l.is_external }))
  } catch (e) {
    landerList.value = []
  }
}

function fmtTime(s) {
  if (!s) return '-'
  return String(s).replace('T', ' ').replace(/\.\d+/, '')
}

async function loadDict() {
  loading.value = true
  try {
    const params = {}
    const lid = filterLid.value.trim()
    if (lid !== '' && !Number.isNaN(Number(lid)) && Number(lid) >= 0) params.lid = Number(lid)
    const res = await getLpEventDict(params)
    rows.value = res?.list || []
  } catch (e) {
    ElMessage.error('加载失败: ' + (e?.response?.data?.error || e?.message || '网络错误'))
  } finally {
    loading.value = false
  }
}

function resetForm() {
  editing.value = false
  submitted.value = false
  form.lid = null
  form.event_name = ''
  form.display_name = ''
  form.description = ''
  clearLid()
}

// "新建字典项"按钮: 打开弹窗(新建态)
const formDialogVisible = ref(false)

function focusNew() {
  resetForm()
  formDialogVisible.value = true
}

function startEdit(row) {
  editing.value = true
  form.lid = row.lid
  form.event_name = row.event_name
  form.display_name = row.display_name || ''
  form.description = row.description || ''
  formDialogVisible.value = true
}

async function handleSave() {
  submitted.value = true
  if (form.lid === null || !form.event_name.trim() || !form.display_name.trim()) {
    ElMessage.warning('还有必填项未完成（红 * 标记）')
    return
  }
  saving.value = true
  try {
    const res = await upsertLpEventDict({
      lid: form.lid,
      event_name: form.event_name.trim(),
      display_name: form.display_name.trim(),
      description: form.description.trim()
    })
    ElMessage.success(`已保存：lid=${res.lid} / ${res.event_name}`)
    formDialogVisible.value = false
    resetForm()
    loadDict()
  } catch (e) {
    ElMessage.error('保存失败: ' + (e?.response?.data?.error || e?.message || '网络错误'))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadDict()
  loadLanders()
})
</script>

<style lang="less" scoped>
.google-content {
  padding: 12px 16px;
  max-width: 1280px;
  margin: 0 auto;
}

/* ===== 页头 ===== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 14px;

  .header-left { min-width: 0; }
  .header-right { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 21px;
  font-weight: 500;
  color: #202124;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;

  .title-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: #e8f0fe;
  }
}

.page-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #5f6368;
  line-height: 1.6;
}

.stat-chips { display: flex; gap: 8px; }

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 12px;
  border-radius: 15px;
  background: #f1f3f4;
  color: #5f6368;
  font-size: 12px;

  b { color: #202124; font-size: 13px; }

  &.chip-blue { background: #e8f0fe; b { color: #1a73e8; } }
  &.chip-amber { background: #fef7e0; b { color: #b06000; } }
}

/* ===== 卡片 ===== */
.content-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.10), 0 1px 2px rgba(0, 0, 0, 0.20);
  padding: 16px 20px;
  margin-bottom: 14px;
}

.card-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

/* ===== 表格 ===== */
.table-wrap { border: 1px solid #e8eaed; border-radius: 10px; overflow: hidden; }

.g-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  /* fixed: 列宽完全由 colgroup 决定, 拖动一列不影响其他列; 渲染也更快 */
  table-layout: fixed;

  thead th {
    background: #f8f9fa;
    color: #5f6368;
    font-weight: 500;
    text-align: left;
    padding: 11px 14px;
    border-bottom: 1px solid #e8eaed;
    white-space: nowrap;
    font-size: 12px;
  }

  tbody td {
    padding: 11px 14px;
    border-bottom: 1px solid #f1f3f4;
    color: #202124;
    vertical-align: middle;
  }

  tbody tr:hover td { background: #f8f9fa; }
  tbody tr:last-child td { border-bottom: none; }
}

.g-table-empty { padding: 0 !important; }

/* 列分割线 + 拖拽: 表头与单元格右侧 1px 竖线(最后一列不加); 把手在表头右缘 6px 热区 */
.g-table th, .g-table td {
  border-right: 1px solid #f1f3f4;
}

.g-table th:last-child, .g-table td:last-child { border-right: none; }

.g-table th { position: relative; }

.col-grip {
  position: absolute;
  top: 0;
  right: -4px;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  z-index: 2;
}

.g-table th.col-resizable:hover .col-grip::after,
.col-grip:hover::after {
  content: '';
  position: absolute;
  top: 20%;
  right: 3px;
  width: 2px;
  height: 60%;
  background: #1a73e8;
  border-radius: 1px;
}

.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 30px 0;
  color: #9aa0a6;
  font-size: 13px;
}

.dim { color: #9aa0a6; font-size: 12px; }
.mono { font-family: 'Roboto Mono', Consolas, monospace; }
.ellip { max-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.display-name { font-weight: 500; }

/* 归属 chip */
.lid-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;

  &.global { background: #e8f0fe; color: #1a73e8; }
  &.lp { background: #f1f3f4; color: #5f6368; font-family: 'Roboto Mono', Consolas, monospace; }
}

/* ===== 归属 LP 选择器 ===== */
.lid-picker { position: relative; }

/* 全局通用快捷链接 */
.lid-global-link {
  margin-top: 6px;
  border: none;
  background: none;
  padding: 0;
  color: #1a73e8;
  font-size: 12px;
  cursor: pointer;
  text-align: left;

  &:hover { text-decoration: underline; }
}

.lid-chip.big {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px;
  font-size: 13px;
  border-radius: 8px;

  .lid-name {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
    color: #3c4043;
  }
}

.lid-clear {
  border: none;
  background: none;
  color: #9aa0a6;
  font-size: 15px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;

  &:hover { color: #d93025; }
}

.lid-search { position: relative; }

.lid-drop {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 340px;
  max-height: 280px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #dadce0;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
  z-index: 30;
  padding: 6px;
}

.lid-opt {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;

  &:hover { background: #f1f3f4; }
}

.lid-opt-id {
  flex-shrink: 0;
  min-width: 36px;
  font-family: 'Roboto Mono', Consolas, monospace;
  color: #5f6368;
  text-align: right;
}

.lid-opt-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #202124;
}

.lid-opt-tag {
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: 10px;
  background: #e8f0fe;
  color: #1a73e8;
  font-size: 11px;

  &.ext { background: #fef7e0; color: #b06000; }
}

.lid-drop-more {
  padding: 8px 10px 6px;
  font-size: 11px;
  color: #9aa0a6;
  text-align: center;
}

/* 事件名: 代码风格 */
.event-code {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f1f3f4;
  color: #188038;
  font-family: 'Roboto Mono', Consolas, monospace;
  font-size: 12px;
  white-space: nowrap;
}

.g-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  background: #e8f0fe;
  color: #1a73e8;
  font-size: 11px;
  font-weight: 500;
}

.type-custom { color: #9aa0a6; font-size: 12px; }

.g-link-btn {
  border: none;
  background: none;
  color: #1a73e8;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  &:hover { text-decoration: underline; }
}

/* ===== 表单弹窗（谷歌风, 与落地页新建弹窗同款容器） ===== */
:deep(.google-dialog) {
  border-radius: 12px;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;

  .el-dialog__header { padding: 18px 24px 8px; }
  .el-dialog__body { padding: 8px 24px 16px; }
  .el-dialog__footer {
    padding: 8px 24px 18px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

.g-dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 500;
  color: #202124;

  .editing-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #1a73e8;
  }
}

.g-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.editing-hint-line {
  margin-top: 4px;
  font-size: 12px;
  color: #9aa0a6;
}

.g-form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.g-label {
  font-size: 12px;
  font-weight: 500;
  color: #5f6368;

  .req { color: #d93025; margin-left: 2px; }
}

/* 必填校验: 提交后未填的输入框红边 + 下方红字 */
.g-input.input-error {
  border-color: #d93025;

  &:focus { border-color: #d93025; box-shadow: 0 0 0 1px #d93025 inset; }
}

.field-error {
  margin-top: 3px;
  font-size: 12px;
  color: #d93025;
}

.g-input {
  height: 34px;
  padding: 0 12px;
  border: 1px solid #dadce0;
  border-radius: 6px;
  font-size: 13px;
  color: #202124;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;

  &::placeholder { color: #9aa0a6; }
  &:focus { border-color: #1a73e8; box-shadow: 0 0 0 1px #1a73e8 inset; }
  &:disabled { background: #f1f3f4; color: #80868b; cursor: not-allowed; }
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

/* ===== 帮助卡 ===== */
.help-card {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: #f8f9fa;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 12px;
  color: #5f6368;
  line-height: 1.7;

  svg { flex-shrink: 0; margin-top: 2px; }
}

/* ===== 谷歌按钮 ===== */
.google-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  height: 34px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  transition: background-color 0.2s, box-shadow 0.2s;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.google-btn-primary {
  background-color: #1a73e8;
  color: #fff;
  &:hover:not(:disabled) { background-color: #1557b0; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
}

.google-btn-secondary {
  background-color: #fff;
  color: #5f6368;
  border: 1px solid #dadce0;
  &:hover:not(:disabled) { background-color: #f1f3f4; color: #202124; }
}
</style>

<style lang="less">
/* el-tooltip 传送到 body, scoped 选不中: 限制宽度并保留换行 */
.dict-desc-tip.el-popper {
  max-width: 420px;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  line-height: 1.6;
  word-break: break-all;
}
</style>
