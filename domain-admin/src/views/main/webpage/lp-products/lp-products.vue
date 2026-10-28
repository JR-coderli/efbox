<template>
  <div class="lp-products">
    <div class="header">
      <div class="title">LP 产品管理</div>
      <div class="desc">管理投放 LP 页的产品文案、图片视频、增删与排序,保存后 LP 立即生效(访客下次打开页面时拉取最新数据)</div>
      <div class="actions">
        <el-button @click="openConfig">页面配置</el-button>
        <el-button type="primary" @click="openCreate">新增产品</el-button>
      </div>
    </div>

    <el-table :data="products" row-key="id" v-loading="loading" id="lpTable">
      <el-table-column label="" width="50" align="center">
        <template #default>
          <el-icon class="drag-handle" style="cursor: move"><Rank /></el-icon>
        </template>
      </el-table-column>
      <el-table-column label="#" width="60" align="center">
        <template #default="{ $index }">{{ $index + 1 }}</template>
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
      <el-table-column prop="name" label="产品" min-width="140" show-overflow-tooltip />
      <el-table-column prop="hook" label="标题钩子" min-width="200" show-overflow-tooltip />
      <el-table-column label="折扣" width="80" align="center">
        <template #default="{ row }">
          <el-tag type="danger" size="small">{{ row.discount }}% OFF</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="评分" width="70" align="center">
        <template #default="{ row }">{{ Number(row.rating).toFixed(1) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80" align="center">
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
    <el-drawer v-model="drawerVisible" :title="form.id ? '编辑产品' : '新增产品'" size="560px">
      <el-form :model="form" label-width="100px" label-position="top">
        <el-form-item label="产品短名(用于 CTA 按钮与内链,如 Kinessana)">
          <el-input v-model="form.name" placeholder="Product Name" />
        </el-form-item>
        <el-form-item label="标题钩子(页面标题 = 短名 - 钩子)">
          <el-input v-model="form.hook" placeholder="The Shoulder Massager That Melts Tension in Minutes" />
        </el-form-item>
        <el-form-item label="第一段文案">
          <el-input v-model="form.p1" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="第二段文案">
          <el-input v-model="form.p2" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="第三段·前半(紧迫感文案,产品名内链之前)">
          <el-input v-model="form.p3_pre" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="第三段·后半(内链之后)">
          <el-input v-model="form.p3_post" type="textarea" :rows="2" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="折扣 %">
              <el-input-number v-model="form.discount" :min="1" :max="99" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="评分">
              <el-input-number v-model="form.rating" :min="1" :max="5" :step="0.1" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="上架">
              <el-switch v-model="form.enabledBool" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="媒体(上传图片或视频,或直接填 LP 已有资源路径如 images/xxx.webp)">
          <el-upload :show-file-list="false" :http-request="handleUpload" accept="image/*,video/*">
            <el-button :loading="uploading">{{ uploading ? '上传中...' : '上传图片/视频' }}</el-button>
          </el-upload>
          <div v-if="form.media_url" class="media-line">
            <template v-if="form.media_type === 2">
              <video :src="previewUrl(form.media_url)" controls style="width: 220px; border-radius: 6px" />
            </template>
            <template v-else-if="previewUrl(form.media_url)">
              <el-image :src="previewUrl(form.media_url)" fit="cover" style="width: 220px; border-radius: 6px" />
            </template>
            <div class="media-path">{{ form.media_url }}</div>
          </div>
          <el-input v-model="form.media_url" placeholder="媒体路径(上传后自动填入,也可手填)" style="margin-top: 6px" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-drawer>

    <!-- 页面配置 -->
    <el-dialog v-model="configVisible" title="页面配置" width="520px">
      <el-form label-position="top">
        <el-form-item label="页面大标题(title / h1 / 分享标签)">
          <el-input v-model="configForm.title" />
        </el-form-item>
        <el-form-item label="副标题(h2)">
          <el-input v-model="configForm.subtitle" />
        </el-form-item>
        <el-form-item label="横幅图(LP 相对路径或上传)">
          <div style="display: flex; gap: 10px; align-items: center; width: 100%">
            <el-input v-model="configForm.banner_url" style="flex: 1" />
            <el-upload :show-file-list="false" :http-request="(o) => handleUpload(o, true)" accept="image/*">
              <el-button :loading="uploading">上传</el-button>
            </el-upload>
          </div>
          <el-image v-if="previewUrl(configForm.banner_url)" :src="previewUrl(configForm.banner_url)"
            fit="cover" style="width: 240px; margin-top: 8px; border-radius: 6px" />
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
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Rank } from '@element-plus/icons-vue'
import Sortable from 'sortablejs'
import {
  getLpProducts, createLpProduct, updateLpProduct, removeLpProduct,
  updateLpSort, getLpConfig, updateLpConfig, uploadLpMedia
} from '@/services/main/webpage/lp-products'

const LP_PUBLIC_BASE = 'https://zorfell.com'

const products = ref([])
const loading = ref(false)
const drawerVisible = ref(false)
const configVisible = ref(false)
const saving = ref(false)
const uploading = ref(false)
const form = ref({})
const configForm = ref({})

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
    const res = await getLpProducts()
    if (res.code === 0) products.value = res.data
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.value = { name: '', hook: '', p1: '', p2: '', p3_pre: '', p3_post: '', discount: 50, rating: 5.0, media_type: 1, media_url: '', enabledBool: true }
  drawerVisible.value = true
}

function openEdit(row) {
  form.value = { ...row, enabledBool: row.enabled === 1 }
  drawerVisible.value = true
}

async function handleSave() {
  const f = form.value
  if (!f.name) { ElMessage.warning('产品短名不能为空'); return }
  saving.value = true
  try {
    const payload = {
      name: f.name, hook: f.hook, p1: f.p1, p2: f.p2, p3_pre: f.p3_pre, p3_post: f.p3_post,
      discount: f.discount, rating: f.rating, media_type: Number(f.media_type) || 1,
      media_url: f.media_url, enabled: f.enabledBool ? 1 : 0
    }
    const res = f.id ? await updateLpProduct(f.id, payload) : await createLpProduct(payload)
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
  await ElMessageBox.confirm(`确定删除产品「${row.name}」?`, '提示', { type: 'warning' })
  const res = await removeLpProduct(row.id)
  if (res.code === 0) { ElMessage.success('已删除'); fetchList() }
}

async function toggleEnabled(row, v) {
  const res = await updateLpProduct(row.id, { enabled: v ? 1 : 0 })
  if (res.code === 0) { row.enabled = v ? 1 : 0 }
}

async function handleUpload(option, forBanner = false) {
  const fd = new FormData()
  fd.append('media', option.file)
  uploading.value = true
  try {
    const res = await uploadLpMedia(fd)
    if (res.code === 0) {
      if (forBanner) {
        configForm.value.banner_url = res.data.media_url
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
  const res = await getLpConfig()
  if (res.code === 0) { configForm.value = res.data || {}; configVisible.value = true }
}

async function saveConfig() {
  const res = await updateLpConfig({
    title: configForm.value.title, subtitle: configForm.value.subtitle, banner_url: configForm.value.banner_url
  })
  if (res.code === 0) { ElMessage.success('保存成功'); configVisible.value = false }
}

// 拖拽排序:拖完把新顺序整表提交
function initSortable() {
  const el = document.querySelector('#lpTable tbody')
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
      const res = await updateLpSort(list.map((p, i) => ({ id: p.id, sort: i + 1 })))
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
.header .title { font-size: 18px; font-weight: 600; }
.header .desc { color: #909399; font-size: 12px; flex: 1; min-width: 260px; }
.no-media { color: #c0c4cc; font-size: 12px; }
.media-line { margin-top: 8px; }
.media-path { color: #909399; font-size: 12px; margin-top: 4px; word-break: break-all; }
</style>
