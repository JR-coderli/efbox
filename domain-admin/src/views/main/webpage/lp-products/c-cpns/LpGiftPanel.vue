<template>
  <div class="lp-gift-panel">
    <div class="header">
      <div class="title">礼品清单LP(43490)</div>
      <div class="desc">管理清单页的板块标题、正文内容、图片视频、跳转链接与排序,保存后 LP 立即生效。页面: pro2.winrab.com/s2/1/ecomlistical/v5/</div>
      <div class="actions">
        <el-button @click="openConfig">页面配置</el-button>
        <el-button type="primary" @click="openCreate">新增产品</el-button>
      </div>
    </div>

    <el-table :data="products" row-key="id" v-loading="loading" id="lpGiftTable">
      <el-table-column label="" width="50" align="center">
        <template #default>
          <el-icon class="drag-handle" style="cursor: move"><Rank /></el-icon>
        </template>
      </el-table-column>
      <el-table-column label="#" width="60" align="center">
        <template #default="{ $index }">{{ $index + 1 }}</template>
      </el-table-column>
      <el-table-column label="分组" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="row.group_type === 1 ? 'primary' : 'warning'" size="small" effect="plain">
            {{ row.group_type === 1 ? '主列表' : 'New Arrivals' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="媒体" width="110">
        <template #default="{ row }">
          <el-image v-if="row.media_type === 1 && previewUrl(row.media_url)" :src="previewUrl(row.media_url)"
            fit="cover" style="width: 80px; height: 60px; border-radius: 4px" :preview-src-list="[previewUrl(row.media_url)]" preview-teleported />
          <video v-else-if="row.media_type === 2 && previewUrl(row.media_url)" :src="previewUrl(row.media_url)"
            style="width: 80px; height: 60px; border-radius: 4px; object-fit: cover" muted />
          <el-tooltip v-else :content="row.media_url || '未设置'">
            <span class="no-media">LP资源</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="板块标题" min-width="220" show-overflow-tooltip />
      <el-table-column prop="product_name" label="CTA按钮文案" min-width="180" show-overflow-tooltip />
      <el-table-column label="售罄" width="70" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.sold_out === 1" type="danger" size="small">售罄</el-tag>
          <span v-else class="no-media">-</span>
        </template>
      </el-table-column>
      <el-table-column label="显示" width="80" align="center">
        <template #default="{ row }">
          <el-switch :model-value="row.enabled === 1" @change="(v) => toggleEnabled(row, v)" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" align="center">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleRemove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 产品编辑抽屉 -->
    <el-drawer v-model="drawerVisible" :title="form.id ? '编辑产品' : '新增产品'" size="1000px" destroy-on-close>
      <el-form :model="form" label-width="100px" label-position="top">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分组">
              <el-radio-group v-model="form.group_type">
                <el-radio :value="1">主列表(带编号)</el-radio>
                <el-radio :value="2">New Arrivals(无编号)</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="跳转链接(Goto 跳转地址,如 https://eco.tsavros.com/cf/click/1)">
              <el-input v-model="form.link" placeholder="https://eco.tsavros.com/cf/click/1" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="板块标题(.smb-section-title 文本)">
          <el-input v-model="form.title" placeholder="Sherum OptiReaders Pro - The Reading Glasses That Bring Words Back to Life" />
        </el-form-item>
        <el-form-item label="CTA 按钮完整文案(如 Learn More About Sherum OptiReaders Pro »)">
          <el-input v-model="form.product_name" placeholder="Learn More About Sherum OptiReaders Pro »" />
        </el-form-item>
        <el-form-item label="媒体(上传图片或视频,或直接填 LP 已有资源路径如 images/xxx.jpg)">
          <div style="display: flex; gap: 10px; align-items: center; width: 100%">
            <el-radio-group v-model="form.media_type">
              <el-radio :value="1">图片</el-radio>
              <el-radio :value="2">视频</el-radio>
            </el-radio-group>
            <el-upload :show-file-list="false" :http-request="handleUpload" accept="image/*,video/*">
              <el-button :loading="uploading">{{ uploading ? '上传中...' : '上传图片/视频' }}</el-button>
            </el-upload>
            <el-input v-model="form.media_url" placeholder="媒体路径(上传后自动填入,也可手填)" style="flex: 1" />
          </div>
          <div v-if="form.media_url" class="media-line">
            <template v-if="form.media_type === 2">
              <video :src="previewUrl(form.media_url)" controls style="width: 260px; border-radius: 6px" />
            </template>
            <template v-else-if="previewUrl(form.media_url)">
              <el-image :src="previewUrl(form.media_url)" fit="cover" style="width: 260px; border-radius: 6px" />
            </template>
            <div v-else class="media-path">LP 相对路径(后台不预览): {{ form.media_url }}</div>
          </div>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="售罄样式(CTA 按钮加 sold-out-button 样式)">
              <el-switch v-model="form.soldOutBool" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="显示">
              <el-switch v-model="form.enabledBool" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <template #label>
            <div class="content-label">
              <span>正文内容</span>
              <el-radio-group v-model="contentMode" size="small">
                <el-radio-button value="visual">可视化编辑</el-radio-button>
                <el-radio-button value="code">源码</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div v-if="contentMode === 'visual'" class="visual-edit">
            <div class="edit-hint">下方就是这一段在页面上的真实效果:点击文字即可直接修改(选中后 Ctrl+B 加粗)。没把握的改动不要做,改完点右下角保存。</div>
            <iframe ref="contentFrameRef" class="edit-frame" :srcdoc="contentDoc" sandbox="allow-same-origin"></iframe>
          </div>
          <el-input v-else v-model="form.content" type="textarea" :rows="22" class="code-input" spellcheck="false" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-drawer>

    <!-- 页面配置 -->
    <el-dialog v-model="configVisible" title="页面配置" width="860px" destroy-on-close>
      <el-form label-position="top">
        <el-form-item label="页面大标题(h1)">
          <el-input v-model="configForm.title" />
        </el-form-item>
        <el-form-item label="头图(LP 相对路径或上传)">
          <div style="display: flex; gap: 10px; align-items: center; width: 100%">
            <el-input v-model="configForm.hero_url" style="flex: 1" />
            <el-upload :show-file-list="false" :http-request="(o) => handleUpload(o, true)" accept="image/*">
              <el-button :loading="uploading">上传</el-button>
            </el-upload>
          </div>
          <el-image v-if="previewUrl(configForm.hero_url)" :src="previewUrl(configForm.hero_url)" fit="cover"
            style="width: 320px; margin-top: 8px; border-radius: 6px" />
          <div v-else-if="configForm.hero_url" class="media-path">LP 相对路径(后台不预览): {{ configForm.hero_url }}</div>
        </el-form-item>
        <el-form-item>
          <template #label>
            <div class="content-label">
              <span>导语内容(头图之后的开头段落)</span>
              <el-radio-group v-model="introMode" size="small">
                <el-radio-button value="visual">可视化编辑</el-radio-button>
                <el-radio-button value="code">源码</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div v-if="introMode === 'visual'" class="visual-edit">
            <div class="edit-hint">点击文字直接修改,效果即页面真实样式。</div>
            <iframe ref="introFrameRef" class="edit-frame edit-frame--short" :srcdoc="introDoc" sandbox="allow-same-origin"></iframe>
          </div>
          <el-input v-else v-model="configForm.intro_html" type="textarea" :rows="12" class="code-input" spellcheck="false" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Rank } from '@element-plus/icons-vue'
import Sortable from 'sortablejs'
import {
  getGiftProducts, createGiftProduct, updateGiftProduct, removeGiftProduct,
  updateGiftSort, getGiftConfig, updateGiftConfig, uploadLpMedia
} from '@/services/main/webpage/lp-products'
import { GIFT_LP_BASE, toDisplayHtml, fromDisplayHtml } from '../gift-html'

const LP_PUBLIC_BASE = 'https://zorfell.com'

const products = ref([])
const loading = ref(false)
const drawerVisible = ref(false)
const configVisible = ref(false)
const saving = ref(false)
const uploading = ref(false)
const form = ref({})
const configForm = ref({})

// 正文/导语编辑模式: 默认可视化(直接在真实效果上改字), 源码模式兜底
const contentMode = ref('visual')
const introMode = ref('visual')
const contentFrameRef = ref(null)
const introFrameRef = ref(null)

// 可视化编辑文档: 用线上 LP 的 CSS 渲染 + contenteditable 直接改字。
// 不用富文本编辑器: 它会重写 HTML, 正文里的内链/星级图/嵌套样式会被破坏(实测)。
function buildEditDoc(html) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<link rel="stylesheet" href="' + GIFT_LP_BASE + '/css/smb-index.css">' +
    '</head><body contenteditable="true" spellcheck="false" style="margin:12px;background:#fff;outline:none;">' +
    '<div class="smb-section-main">' + (toDisplayHtml(html) || '') + '</div></body></html>'
}

const contentDoc = computed(() => buildEditDoc(form.value.content))
const introDoc = computed(() => buildEditDoc(configForm.value.intro_html))

// 把可视化 iframe 里的内容取回 form(仅在 iframe 已渲染出内容时, 避免覆盖为空)
function pullVisualContent() {
  const el = contentFrameRef.value?.contentDocument?.querySelector('.smb-section-main')
  if (el && el.innerHTML.trim()) form.value.content = fromDisplayHtml(el.innerHTML)
}
function pullVisualIntro() {
  const el = introFrameRef.value?.contentDocument?.querySelector('.smb-section-main')
  if (el && el.innerHTML.trim()) configForm.value.intro_html = fromDisplayHtml(el.innerHTML)
}

// 切到源码模式前, 先把可视化编辑的改动取回(watch 在 DOM 更新前触发, iframe 还在)
watch(contentMode, (nv) => { if (nv !== 'visual') pullVisualContent() })
watch(introMode, (nv) => { if (nv !== 'visual') pullVisualIntro() })

// /lp/uploads/... 拼公开域名可预览;LP 自带资源(images/...)后台无法预览,显示路径
function previewUrl(url) {
  if (!url) return ''
  if (url.startsWith('/lp/uploads/')) return LP_PUBLIC_BASE + url
  if (url.startsWith('http')) return url
  return '' // LP 相对路径,后台不预览
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getGiftProducts()
    if (res.code === 0) products.value = res.data
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = { group_type: 1, title: '', product_name: '', media_type: 1, media_url: '', content: '', link: '', soldOutBool: false, enabledBool: true }
  contentMode.value = 'visual'
  drawerVisible.value = true
}

function openEdit(row) {
  form.value = { ...row, soldOutBool: row.sold_out === 1, enabledBool: row.enabled === 1 }
  contentMode.value = 'visual'
  drawerVisible.value = true
}

async function handleSave() {
  if (contentMode.value === 'visual') pullVisualContent()
  const f = form.value
  if (!f.title) { ElMessage.warning('板块标题不能为空'); return }
  saving.value = true
  try {
    const payload = {
      group_type: Number(f.group_type) || 1, title: f.title, product_name: f.product_name,
      media_type: Number(f.media_type) || 1, media_url: f.media_url, content: f.content,
      link: f.link, sold_out: f.soldOutBool ? 1 : 0, enabled: f.enabledBool ? 1 : 0
    }
    const res = f.id ? await updateGiftProduct(f.id, payload) : await createGiftProduct(payload)
    if (res.code === 0) {
      ElMessage.success('保存成功')
      drawerVisible.value = false
      fetchList()
    }
  } finally {
    saving.value = false
  }
}

async function handleRemove(row) {
  await ElMessageBox.confirm(`确定删除产品「${row.title}」?`, '提示', { type: 'warning' })
  const res = await removeGiftProduct(row.id)
  if (res.code === 0) { ElMessage.success('已删除'); fetchList() }
}

async function toggleEnabled(row, v) {
  const res = await updateGiftProduct(row.id, { enabled: v ? 1 : 0 })
  if (res.code === 0) row.enabled = v ? 1 : 0
}

async function handleUpload(option, forBanner = false) {
  const fd = new FormData()
  fd.append('media', option.file)
  uploading.value = true
  try {
    const res = await uploadLpMedia(fd)
    if (res.code === 0) {
      if (forBanner) {
        configForm.value.hero_url = res.data.media_url
      } else {
        form.value.media_url = res.data.media_url
        form.value.media_type = res.data.media_type
      }
      ElMessage.success('上传成功')
    }
  } finally {
    uploading.value = false
  }
}

async function openConfig() {
  const res = await getGiftConfig()
  if (res.code === 0) { configForm.value = res.data || {}; introMode.value = 'visual'; configVisible.value = true }
}

async function saveConfig() {
  if (introMode.value === 'visual') pullVisualIntro()
  const res = await updateGiftConfig({
    title: configForm.value.title, hero_url: configForm.value.hero_url, intro_html: configForm.value.intro_html
  })
  if (res.code === 0) { ElMessage.success('保存成功'); configVisible.value = false }
}

// 拖拽排序:拖完把新顺序整表提交
// 注意: 绑定用 #lpGiftTable(本组件专属 id), 与 zorfell 面板的 #lpTable 区分
function initSortable() {
  const el = document.querySelector('#lpGiftTable tbody')
  if (!el) return
  Sortable.create(el, {
    handle: '.drag-handle',
    animation: 150,
    onEnd: async ({ oldIndex, newIndex }) => {
      if (oldIndex === newIndex) return
      const list = [...products.value]
      const [moved] = list.splice(oldIndex, 1)
      list.splice(newIndex, 0, moved)
      products.value = list
      const res = await updateGiftSort(list.map((p, i) => ({ id: p.id, sort: i + 1 })))
      if (res.code === 0) ElMessage.success('排序已保存')
    }
  })
}

onMounted(async () => {
  await fetchList()
  await nextTick()
  initSortable()
})
</script>

<style scoped>
.header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.header .title { font-size: 16px; font-weight: 600; }
.header .desc { color: #909399; font-size: 12px; flex: 1; min-width: 260px; }
.no-media { color: #c0c4cc; font-size: 12px; }
.media-line { margin-top: 8px; }
.media-path { color: #909399; font-size: 12px; margin-top: 4px; word-break: break-all; }
.content-label { display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 12px; }
.content-label > span { color: #606266; font-weight: 600; }
.visual-edit { width: 100%; }
.edit-hint { color: #909399; font-size: 12px; margin-bottom: 6px; }
.edit-frame { width: 100%; height: 520px; border: 1px solid #dcdfe6; border-radius: 4px; background: #fff; }
.edit-frame--short { height: 300px; }
.code-input :deep(textarea) { font-family: Consolas, Monaco, monospace; font-size: 12px; }
</style>
