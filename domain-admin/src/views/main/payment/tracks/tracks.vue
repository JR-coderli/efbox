<template>
  <div class="track-page">
    <!-- 表格列表 -->
    <track-content
      ref="contentRef"
      :content-config="contentConfig"
      @new-click="handleNewClick"
      @edit-click="handleEditClick"
    >
      <!-- 状态 -->
      <template #payment_status="scope">
        <div
          class="editable-cell"
          :class="{ 'has-content': scope.payment_status, 'is-empty': !scope.payment_status, 'is-active': selectEdit.id === scope.id && selectEdit.field === 'payment_status' }"
          @dblclick.stop="startSelectEdit($event, scope.id, 'payment_status', scope.payment_status)"
        >
          <span v-if="scope.payment_status" class="tag-badge" :style="{ backgroundColor: getStatusColor(scope.payment_status).bg, color: getStatusColor(scope.payment_status).text }">{{ scope.payment_status }}</span>
          <span v-else class="edit-hint"></span>
        </div>
      </template>

      <!-- 年份（从周期提取起始年份） -->
      <template #period_year="scope">
        <span>{{ extractYear(scope.period) }}</span>
      </template>

      <!-- 月份（从周期提取起始月份） -->
      <template #period_month="scope">
        <span>{{ extractMonth(scope.period) }}</span>
      </template>

      <!-- 周期 -->
      <template #period="scope">
        <div
          v-if="!isPeriodEditing(scope.id)"
          class="editable-cell"
          :class="{ 'has-content': isValidPeriod(scope.period) }"
          @dblclick="startPeriodEdit($event, scope.id, scope.period)"
        >
          <span v-if="isValidPeriod(scope.period)" class="text-cell">{{ scope.period }}</span>
          <span v-else class="edit-hint"></span>
        </div>
        <div v-else class="inline-edit-placeholder"></div>
      </template>

      <!-- 付款主体 -->
      <template #payment_entity="scope">
        <div
          class="editable-cell"
          :class="{ 'has-content': scope.payment_entity, 'is-empty': !scope.payment_entity, 'is-active': selectEdit.id === scope.id && selectEdit.field === 'payment_entity' }"
          @dblclick.stop="startSelectEdit($event, scope.id, 'payment_entity', scope.payment_entity)"
        >
          <span v-if="scope.payment_entity" class="tag-badge" :style="{ backgroundColor: getEntityColor(scope.payment_entity).bg, color: getEntityColor(scope.payment_entity).text }">{{ scope.payment_entity }}</span>
          <span v-else class="edit-hint"></span>
        </div>
      </template>

      <!-- 币种 -->
      <template #currency="scope">
        <div
          class="editable-cell"
          :class="{ 'has-content': scope.currency, 'is-empty': !scope.currency, 'is-active': selectEdit.id === scope.id && selectEdit.field === 'currency' }"
          @dblclick.stop="startSelectEdit($event, scope.id, 'currency', scope.currency)"
        >
          <span v-if="scope.currency" class="tag-badge" :style="{ backgroundColor: getColor(scope.currency).bg, color: getColor(scope.currency).text }">{{ scope.currency }}</span>
          <span v-else class="edit-hint"></span>
        </div>
      </template>

      <!-- 应付金额 -->
      <template #amount="scope">
        <div
          v-if="!isAmountEditing(scope.id)"
          class="editable-cell amount-cell"
          :class="{ 'has-content': scope.amount }"
          @dblclick="startAmountEdit($event, scope.id, scope.amount)"
        >
          <span class="amount-text">{{ getCurrencySymbol(scope.currency) + (scope.amount != null ? Number(scope.amount).toFixed(2) : '0.00') }}</span>
        </div>
        <div v-else class="inline-edit-placeholder"></div>
      </template>

      <!-- 已付金额 -->
      <template #amount_paid="scope">
        <div
          v-if="!isAmountPaidEditing(scope.id)"
          class="editable-cell amount-cell"
          :class="{ 'has-content': scope.amount_paid }"
          @dblclick="startAmountPaidEdit($event, scope.id, scope.amount_paid)"
        >
          <span class="amount-text">{{ getCurrencySymbol(scope.currency) + (scope.amount_paid != null ? Number(scope.amount_paid).toFixed(2) : '0.00') }}</span>
        </div>
        <div v-else class="inline-edit-placeholder"></div>
      </template>

      <!-- 附件 -->
      <template #attachments="scope">
        <el-tooltip effect="light" placement="top" :show-after="500" :disabled="!scope.attachments || scope.attachments.length === 0">
          <template #content>
            <div class="file-tooltip" v-if="scope.attachments && scope.attachments.length > 0">
              <div v-for="att in scope.attachments" :key="att.id">{{ att.filename }}</div>
            </div>
          </template>
          <div
            class="upload-cell"
            :class="{ 'has-files': scope.attachments && scope.attachments.length > 0, 'is-active': preview.visible && preview.trackId === scope.id && preview.type === 'attachment' }"
            @dblclick.stop="openPreview($event, scope.attachments || [], 0, scope.id, 'attachment')"
          >
            <template v-if="scope.attachments && scope.attachments.length > 0">
              <div class="file-preview-list">
                <template v-for="(att, idx) in scope.attachments" :key="att.id">
                  <div v-if="idx < 3" class="file-preview-item clickable" @click.stop="openFileInNewWindow(att)">
                    <el-image
                      v-if="isImage(att.mimetype)"
                      :src="getFileUrl(att.destination, att.filename)"
                      fit="cover"
                      class="preview-img"
                    />
                    <img
                      v-else-if="att.thumbnail"
                      :src="getFileUrl(att.thumbnail)"
                      class="preview-img pdf-thumb"
                    />
                    <div v-else class="file-type-icon">{{ getFileExt(att.filename) }}</div>
                  </div>
                </template>
                <span v-if="scope.attachments.length > 3" class="file-more clickable" @click.stop="openFileInNewWindow(scope.attachments[0])">+{{ scope.attachments.length - 3 }}</span>
              </div>
            </template>
            <span v-else class="upload-hint" data-text="双击上传附件"></span>
            <span
              v-if="scope.attachments && scope.attachments.length > 0"
              class="cell-dropdown-arrow"
              @click.stop="openPreview($event, scope.attachments || [], 0, scope.id, 'attachment')"
            >
              <svg viewBox="0 0 24 24" width="14" height="14"><path d="M7 10l5 5 5-5z" fill="currentColor"/></svg>
            </span>
          </div>
        </el-tooltip>
      </template>

      <!-- 水单 -->
      <template #vouchers="scope">
        <el-tooltip effect="light" placement="top" :show-after="500" :disabled="!scope.vouchers || scope.vouchers.length === 0">
          <template #content>
            <div class="file-tooltip" v-if="scope.vouchers && scope.vouchers.length > 0">
              <div v-for="vou in scope.vouchers" :key="vou.id">{{ vou.filename }}</div>
            </div>
          </template>
          <div
            class="upload-cell"
            :class="{ 'has-files': scope.vouchers && scope.vouchers.length > 0, 'is-active': preview.visible && preview.trackId === scope.id && preview.type === 'voucher' }"
            @dblclick.stop="openPreview($event, scope.vouchers || [], 0, scope.id, 'voucher')"
          >
            <template v-if="scope.vouchers && scope.vouchers.length > 0">
              <div class="file-preview-list voucher">
                <template v-for="(vou, idx) in scope.vouchers" :key="vou.id">
                  <div v-if="idx < 3" class="file-preview-item clickable" @click.stop="openFileInNewWindow(vou)">
                    <el-image
                      v-if="isImage(vou.mimetype)"
                      :src="getFileUrl(vou.destination, vou.filename)"
                      fit="cover"
                      class="preview-img"
                    />
                    <img
                      v-else-if="vou.thumbnail"
                      :src="getFileUrl(vou.thumbnail)"
                      class="preview-img pdf-thumb"
                    />
                    <div v-else class="file-type-icon">{{ getFileExt(vou.filename) }}</div>
                  </div>
                </template>
                <span v-if="scope.vouchers.length > 3" class="file-more clickable" @click.stop="openFileInNewWindow(scope.vouchers[0])">+{{ scope.vouchers.length - 3 }}</span>
              </div>
            </template>
            <span v-else class="upload-hint" data-text="双击上传水单"></span>
            <span
              v-if="scope.vouchers && scope.vouchers.length > 0"
              class="cell-dropdown-arrow"
              @click.stop="openPreview($event, scope.vouchers || [], 0, scope.id, 'voucher')"
            >
              <svg viewBox="0 0 24 24" width="14" height="14"><path d="M7 10l5 5 5-5z" fill="currentColor"/></svg>
            </span>
          </div>
        </el-tooltip>
      </template>

      <!-- 备注 -->
      <template #remark="scope">
        <el-tooltip v-if="!isEditing(scope.id, 'remark') && scope.remark" effect="light" placement="top" :show-after="300" :disabled="!scope.remark">
          <template #content>
            <div class="remark-tooltip">{{ scope.remark }}</div>
          </template>
          <div
            class="editable-cell remark-cell"
            :class="{ 'has-content': scope.remark, 'is-empty': !scope.remark }"
            @dblclick="startInlineEdit($event, scope.id, 'remark', scope.remark)"
          >
            <span v-if="scope.remark" class="remark-text">{{ scope.remark }}</span>
            <span v-else class="edit-hint"></span>
          </div>
        </el-tooltip>
        <div
          v-else-if="!isEditing(scope.id, 'remark')"
          class="editable-cell remark-cell"
          :class="{ 'has-content': scope.remark, 'is-empty': !scope.remark }"
          @dblclick="startInlineEdit($event, scope.id, 'remark', scope.remark)"
        >
          <span v-if="scope.remark" class="remark-text">{{ scope.remark }}</span>
          <span v-else class="edit-hint"></span>
        </div>
        <div v-else class="inline-edit-placeholder"></div>
      </template>
    </track-content>

    <!-- 文件预览气泡 -->
    <teleport to="body">
        <div
          v-if="preview.visible"
          class="bubble-backdrop"
          @mousedown="closePreview"
        >
          <div
            class="bubble-wrapper"
            :style="previewBubbleStyle"
            @mousedown.stop
          >
            <div class="bubble-arrow" :class="previewPlacement === 'bottom' ? 'arrow-up' : 'arrow-down'" :style="previewArrowStyle"></div>
            <div class="bubble-body preview-bubble">
              <div class="preview-grid">
                <div
                  v-for="(file, fIdx) in preview.files"
                  :key="file._uploadKey || file.id"
                  class="preview-grid-item"
                  :class="{ 'is-uploading': file.isUploading }"
                >
                  <!-- 缩略图 -->
                  <div class="grid-thumb">
                    <img
                      v-if="isImage(file.mimetype)"
                      :src="getFileUrl(file.destination, file.filename)"
                    />
                    <img
                      v-else-if="file.thumbnail"
                      :src="getFileUrl(file.thumbnail)"
                    />
                    <div v-else class="grid-file-type">{{ getFileExt(file.filename) }}</div>
                  </div>
                  <!-- 上传进度遮罩 -->
                  <div v-if="file.isUploading" class="grid-upload-mask">
                    <div class="upload-progress-bar">
                      <div class="upload-progress-fill" :style="{ width: file.progress + '%' }"></div>
                    </div>
                    <span class="upload-progress-text">{{ file.progress }}%</span>
                  </div>
                  <!-- 悬浮遮罩（非上传中才显示） -->
                  <div v-else class="grid-overlay">
                    <span class="grid-filename" :title="file.filename">{{ file.filename }}</span>
                    <div class="grid-actions">
                      <button class="grid-action-btn" @click.stop="previewFile(file)" title="预览">
                        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/></svg>
                      </button>
                      <button class="grid-action-btn" @click.stop="downloadFile(file)" title="下载">
                        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/></svg>
                      </button>
                      <button class="grid-action-btn danger" @click.stop="requestDeleteFile(file)" title="删除">
                        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
                <!-- 添加文件 -->
                <div class="preview-grid-item add-item" @click="triggerPreviewUpload">
                  <svg viewBox="0 0 24 24" width="28" height="28"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>
                  <span>添加文件</span>
                </div>
              </div>
            </div>
            <!-- 删除确认遮罩（放在 bubble-wrapper 层级，脱离 bubble-body 的 overflow:hidden） -->
            <div v-if="confirmDeleteId" class="delete-confirm-overlay" @click.stop="confirmDeleteId = null">
              <div class="delete-confirm-bubble" @click.stop>
                <span>确定删除该文件？</span>
                <div class="confirm-btns">
                  <button class="confirm-yes" @click.stop="confirmDeleteYes">确定</button>
                  <button class="confirm-no" @click.stop="confirmDeleteId = null">取消</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 隐藏的文件上传 input -->
          <input type="file" ref="previewFileInput" multiple style="display: none" @change="handlePreviewFileUpload" />
        </div>
    </teleport>

    <!-- 通用选择气泡（付款主体/币种/状态） -->
    <teleport to="body">
        <div
          v-if="selectEdit.id"
          class="bubble-backdrop"
          @mousedown="cancelSelectEdit"
        >
          <div
            class="bubble-wrapper"
            :style="selectBubbleStyle"
            @mousedown.stop
          >
            <div class="bubble-arrow" :class="selectBubblePlacement === 'bottom' ? 'arrow-up' : 'arrow-down'" :style="selectArrowStyle"></div>
            <div class="bubble-body entity-select-bubble">
              <div class="entity-search-wrap">
                <input
                  v-model="selectSearch"
                  ref="selectInputRef"
                  class="entity-search-input"
                  placeholder="查找或创建选项..."
                  @keydown.esc="cancelSelectEdit"
                  @keydown.enter="confirmSelectOption"
                />
              </div>
              <div class="entity-options-list">
                <div
                  v-for="opt in filteredSelectOptions"
                  :key="opt"
                  class="entity-option-item"
                  :class="{ 'is-active': selectEdit.value === opt }"
                  @click="selectOption(opt)"
                >
                  {{ opt }}
                </div>
                <div v-if="selectSearch && !filteredSelectOptions.length" class="entity-option-create" @click="selectOption(selectSearch)">
                  创建 "{{ selectSearch }}"
                </div>
                <div v-if="!selectSearch && !selectOptions.length" class="entity-option-empty">
                  暂无历史选项
                </div>
              </div>
            </div>
          </div>
        </div>
    </teleport>

    <!-- 粘贴上传气泡框 -->
    <teleport to="body">
      <transition name="bubble">
        <div
          v-if="pasteTarget.trackId"
          class="bubble-backdrop"
          @mousedown="cancelPaste"
        >
          <div
            class="bubble-wrapper"
            :style="pasteBubbleStyle"
            @mousedown.stop
          >
            <div class="bubble-arrow" :class="pasteBubblePlacement === 'bottom' ? 'arrow-up' : 'arrow-down'" :style="pasteArrowStyle"></div>
            <div class="bubble-body">
              <div
                class="paste-area"
                :class="{ 'is-uploading': uploadProgress.uploading, 'is-done': uploadProgress.done }"
                tabindex="0"
                ref="pasteInputRef"
              >
                <!-- 上传中 -->
                <template v-if="uploadProgress.uploading || uploadProgress.done">
                  <svg class="paste-icon" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  <div class="paste-text">{{ uploadProgress.fileName }}</div>
                  <div class="progress-bar-wrapper">
                    <div class="progress-bar-track">
                      <div class="progress-bar-fill" :style="{ width: uploadProgress.percent + '%' }"></div>
                    </div>
                    <span class="progress-bar-label">{{ uploadProgress.percent }}%</span>
                  </div>
                </template>
                <!-- 等待粘贴 -->
                <template v-else>
                  <svg class="paste-icon" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
                  <div class="paste-text">Ctrl+V 粘贴文件</div>
                  <div class="paste-sub">{{ pasteTarget.type === 'attachment' ? '上传附件' : '上传水单' }} · 每次仅支持单个文件</div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- 备注行内编辑（teleport 到 body 避免被表格遮挡） -->
    <teleport to="body">
      <div
        v-if="editingCell.field === 'remark'"
        class="inline-edit-overlay"
        @mousedown="saveInlineEdit"
      >
        <div
          class="inline-edit-wrapper"
          :style="inlineEditStyle"
          @mousedown.stop
        >
          <textarea
            v-model="editingCell.value"
            ref="inlineInputRef"
            class="inline-edit-textarea"
            placeholder="请输入备注..."
            @input="autoResizeTextarea"
            @keydown.esc.prevent="cancelInlineEdit"
          />
        </div>
      </div>
    </teleport>

    <!-- 应付金额行内编辑（teleport 到 body） -->
    <teleport to="body">
      <div
        v-if="amountEdit.id !== null"
        class="inline-edit-overlay"
        @mousedown="saveAmountEdit"
      >
        <div
          class="inline-edit-wrapper"
          :style="amountEditStyle"
          @mousedown.stop
        >
          <input
            ref="amountInputRef"
            class="inline-amount-input"
            type="number"
            step="0.01"
            :value="amountEdit.value"
            @input="amountEdit.value = $event.target.value"
            @keydown.enter="saveAmountEdit"
            @keydown.esc.prevent="cancelAmountEdit"
          />
        </div>
      </div>
    </teleport>

    <!-- 已付金额行内编辑（teleport 到 body） -->
    <teleport to="body">
      <div
        v-if="amountPaidEdit.id !== null"
        class="inline-edit-overlay"
        @mousedown="saveAmountPaidEdit"
      >
        <div
          class="inline-edit-wrapper"
          :style="amountPaidEditStyle"
          @mousedown.stop
        >
          <input
            ref="amountPaidInputRef"
            class="inline-amount-input"
            type="number"
            step="0.01"
            :value="amountPaidEdit.value"
            @input="amountPaidEdit.value = $event.target.value"
            @keydown.enter="saveAmountPaidEdit"
            @keydown.esc.prevent="cancelAmountPaidEdit"
          />
        </div>
      </div>
    </teleport>

    <!-- 周期行内编辑（teleport 到 body） -->
    <teleport to="body">
      <div
        v-if="periodEdit.id !== null"
        class="inline-edit-wrapper period-edit-wrapper"
        :style="periodEditStyle"
      >
        <el-date-picker
          ref="periodPickerRef"
          v-model="periodEdit.value"
          type="daterange"
          range-separator="-"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 100%"
          @change="onPeriodChange"
          @visible-change="onPeriodPanelVisibleChange"
        />
      </div>
    </teleport>

    <!-- 弹窗 -->
    <track-modal
      ref="modalRef"
      :modal-config="modalConfig"
      @created="handleCreated"
    />
  </div>
</template>

<script setup>
import TrackContent from './c-cpns/track-content.vue'
import contentConfig from './config/content.config'
import TrackModal from './c-cpns/track-modal.vue'
import modalConfig from './config/modal.config'

import { nextTick, ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import useSystemStore from '@/stores/main/system/system'
import { LOGIN_TOKEN } from '@/global/constants'
import { localCache } from '@/utils/cache'
import { BASE_URL } from '@/services/request/config'
import getNowTimestampStr from '@/utils/get-now-timestamp'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const systemStore = useSystemStore()


const colorPalette = [
  { bg: '#d2e3fc', text: '#1a4da1' },
  { bg: '#d1e8d5', text: '#1a7a37' },
  { bg: '#fce8b2', text: '#8a6d00' },
  { bg: '#f8cfdc', text: '#9c2759' },
  { bg: '#d9d1f0', text: '#5a3ea6' },
  { bg: '#b4e4d3', text: '#1a7a5a' },
  { bg: '#fddbcf', text: '#a03a1a' },
  { bg: '#c8ddf0', text: '#2a5a8a' },
  { bg: '#e2d5f0', text: '#6a3ea6' },
  { bg: '#d5e8d0', text: '#3a7a27' },
]

function getColor(str) {
  if (!str) return { bg: '#f1f3f4', text: '#5f6368' }
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colorPalette[Math.abs(hash) % colorPalette.length]
}


const entityColorMap = {
  'Eflow': { bg: '#d2e3fc', text: '#1a4da1' },
  'Terra': { bg: '#d1e8d5', text: '#1a7a37' },
}

function getEntityColor(str) {
  if (!str) return { bg: '#f1f3f4', text: '#5f6368' }
  if (entityColorMap[str]) return entityColorMap[str]
  return getColor(str)
}


const statusColorMap = {
  '【已付款】': { bg: '#4E81F5', text: '#fff' },
  '已收invoice': { bg: '#C79819', text: '#fff' },
  '可付款!': { bg: '#11A896', text: '#fff' },
}

function getStatusColor(str) {
  if (!str) return { bg: '#f1f3f4', text: '#5f6368' }
  if (statusColorMap[str]) return statusColorMap[str]

  if (str.includes('已付款')) return statusColorMap['【已付款】']

  return getColor(str)
}


function extractMonth(period) {
  if (!period || typeof period !== 'string') return ''
  const start = period.split(' - ')[0]
  if (!start) return ''
  const month = parseInt(start.split('-')[1], 10)
  return month ? `${month}月` : ''
}

function extractYear(period) {
  if (!period || typeof period !== 'string') return ''
  const start = period.split(' - ')[0]
  if (!start) return ''
  const year = parseInt(start.split('-')[0], 10)
  return year ? `${year}年` : ''
}

const modalRef = ref()
const amountInputRef = ref(null)
const amountEdit = ref({ id: null, value: '', initialValue: '' })
const amountEditStyle = ref({})


const currencySymbolMap = {
  'CNY': '¥', 'RMB': '¥', '人民币': '¥',
  'USD': '$', '美元': '$',
  'EUR': '€', '欧元': '€',
  'GBP': '£', '英镑': '£',
  'JPY': '¥', '日元': '¥',
  'HKD': 'HK$', '港币': 'HK$',
  'KRW': '₩', '韩元': '₩',
  'SGD': 'S$', 'AUD': 'A$', 'CAD': 'C$',
  'THB': '฿', '泰铢': '฿', 'INR': '₹',
}

function getCurrencySymbol(currency) {
  if (!currency) return ''
  return currencySymbolMap[currency.toUpperCase()] || currency
}

function isAmountEditing(id) {
  return amountEdit.value.id === id
}

function startAmountEdit(event, id, amount) {
  const val = amount != null ? String(amount) : ''
  amountEdit.value = { id, value: val, initialValue: val }


  const cellEl = event.currentTarget
  const rect = cellEl.getBoundingClientRect()
  amountEditStyle.value = {
    position: 'absolute',
    left: `${rect.left - 12}px`,
    top: `${rect.top - 1}px`,
    width: `${rect.width + 25}px`,
    minHeight: `${rect.height + 2}px`
  }

  nextTick(() => {
    amountInputRef.value?.focus()
    amountInputRef.value?.select()
  })
}

function saveAmountEdit() {
  const { id, value, initialValue } = amountEdit.value
  if (id === null) return
  if (value !== initialValue) {
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0) {
      systemStore.editPageDataAction('payment_tracks', id, { amount: num }, null, 'list')
    }
  }
  amountEdit.value = { id: null, value: '', initialValue: '' }
  amountEditStyle.value = {}
}

function cancelAmountEdit() {
  amountEdit.value = { id: null, value: '', initialValue: '' }
  amountEditStyle.value = {}
}


const amountPaidInputRef = ref(null)
const amountPaidEdit = ref({ id: null, value: '', initialValue: '' })
const amountPaidEditStyle = ref({})

function isAmountPaidEditing(id) {
  return amountPaidEdit.value.id === id
}

function startAmountPaidEdit(event, id, amountPaid) {
  const val = amountPaid != null ? String(amountPaid) : ''
  amountPaidEdit.value = { id, value: val, initialValue: val }

  const cellEl = event.currentTarget
  const rect = cellEl.getBoundingClientRect()
  amountPaidEditStyle.value = {
    position: 'absolute',
    left: `${rect.left - 12}px`,
    top: `${rect.top - 1}px`,
    width: `${rect.width + 25}px`,
    minHeight: `${rect.height + 2}px`
  }

  nextTick(() => {
    amountPaidInputRef.value?.focus()
    amountPaidInputRef.value?.select()
  })
}

function saveAmountPaidEdit() {
  const { id, value, initialValue } = amountPaidEdit.value
  if (id === null) return
  if (value !== initialValue) {
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0) {
      systemStore.editPageDataAction('payment_tracks', id, { amount_paid: num }, null, 'list')
    }
  }
  amountPaidEdit.value = { id: null, value: '', initialValue: '' }
  amountPaidEditStyle.value = {}
}

function cancelAmountPaidEdit() {
  amountPaidEdit.value = { id: null, value: '', initialValue: '' }
  amountPaidEditStyle.value = {}
}


const periodPickerRef = ref(null)
const periodEdit = ref({ id: null, value: null, initialValue: '' })
const periodEditStyle = ref({})

function parsePeriod(periodStr) {
  if (Array.isArray(periodStr)) return periodStr
  if (!periodStr || typeof periodStr !== 'string') return null
  const parts = periodStr.split(' - ')
  if (parts.length === 2) return [parts[0].trim(), parts[1].trim()]
  return null
}

function formatPeriod(periodVal) {
  if (Array.isArray(periodVal) && periodVal.length === 2) {
    return `${periodVal[0]} - ${periodVal[1]}`
  }
  return ''
}

function isPeriodEditing(id) {
  return periodEdit.value.id === id
}

function isValidPeriod(period) {
  if (!period) return false
  if (Array.isArray(period)) return period.length === 2
  if (period === '[]' || period === '') return false
  return typeof period === 'string' && period.includes(' - ')
}

function onPeriodChange(val) {

  const formatted = formatPeriod(val)
  if (formatted !== periodEdit.value.initialValue) {
    systemStore.editPageDataAction('payment_tracks', periodEdit.value.id, { period: formatted }, null, 'list')
  }

  if (periodDocumentClickHandler) {
    document.removeEventListener('mousedown', periodDocumentClickHandler)
    periodDocumentClickHandler = null
  }
  periodEdit.value = { id: null, value: null, initialValue: '' }
  periodEditStyle.value = {}
}

function onPeriodPanelVisibleChange(visible) {

  if (!visible && periodEdit.value.id !== null) {
    if (periodDocumentClickHandler) {
      document.removeEventListener('mousedown', periodDocumentClickHandler)
      periodDocumentClickHandler = null
    }
    periodEdit.value = { id: null, value: null, initialValue: '' }
    periodEditStyle.value = {}
  }
}


let periodDocumentClickHandler = null
let periodIgnoreNextClick = false

function startPeriodEdit(event, id, period) {
  periodEdit.value = { id, value: parsePeriod(period), initialValue: period || '' }

  const cellEl = event.currentTarget
  const rect = cellEl.getBoundingClientRect()

  const pickerWidth = 190
  let left = rect.left
  if (left + pickerWidth > window.innerWidth - 12) {
    left = window.innerWidth - pickerWidth - 12
  }
  periodEditStyle.value = {
    position: 'fixed',
    left: `${left - 3}px`,
    top: `${rect.top + 4}px`,
    width: `${pickerWidth}px`,
    minHeight: `${rect.height + 2}px`,
    zIndex: 9998
  }


  if (periodDocumentClickHandler) {
    document.removeEventListener('mousedown', periodDocumentClickHandler)
  }


  periodIgnoreNextClick = true

  periodDocumentClickHandler = (e) => {
    if (periodIgnoreNextClick) {
      periodIgnoreNextClick = false
      return
    }

    const target = e.target
    if (
      target.closest('.period-edit-wrapper') ||
      target.closest('.el-picker__popper') ||
      target.closest('.el-popper') ||
      target.closest('.el-date-editor') ||
      target.closest('.el-picker-panel') ||
      target.closest('.el-date-picker')
    ) return
    savePeriodEdit()
  }


  setTimeout(() => {
    document.addEventListener('mousedown', periodDocumentClickHandler)
  }, 0)

  nextTick(() => {
    periodPickerRef.value?.focus()
  })
}

function savePeriodEdit() {

  const { id, value, initialValue } = periodEdit.value
  if (id === null) return
  const formatted = formatPeriod(value)
  if (formatted !== initialValue) {
    systemStore.editPageDataAction('payment_tracks', id, { period: formatted }, null, 'list')
  }

  if (periodDocumentClickHandler) {
    document.removeEventListener('mousedown', periodDocumentClickHandler)
    periodDocumentClickHandler = null
  }
  periodEdit.value = { id: null, value: null, initialValue: '' }
  periodEditStyle.value = {}
}

const inlineInputRef = ref(null)
const editingCell = ref({
  id: null,
  field: null,
  value: '',
  initialValue: ''
})
const inlineEditRect = ref(null)
const inlineEditStyle = ref({})


const pasteTarget = ref({ trackId: null, type: null })
const pasteRect = ref(null)
const pasteInputRef = ref(null)
const contentRef = ref(null)
const uploadProgress = ref({
  uploading: false,
  done: false,
  percent: 0,
  fileName: ''
})
let progressTimer = null


const preview = reactive({
  visible: false,
  files: [],
  trackId: null,
  type: null // 'attachment' | 'voucher'
})
const previewRect = ref(null)
const previewPlacement = ref('bottom')
const confirmDeleteId = ref(null)
const previewFileInput = ref(null)
const previewBubbleStyle = ref({})
const previewArrowStyle = ref({})

function openPreview(event, files, index, trackId, type) {
  const rect = event.currentTarget?.getBoundingClientRect() || event.target?.getBoundingClientRect()
  if (!rect) return
  previewRect.value = rect
  preview.files = files
  preview.trackId = trackId
  preview.type = type


  const bubbleWidth = 340
  const estimatedBubbleHeight = 280


  let left = rect.left + rect.width / 2 - bubbleWidth / 2
  const maxLeft = window.innerWidth - bubbleWidth - 12
  if (left > maxLeft) left = maxLeft
  if (left < 12) left = 12


  let top = rect.bottom + 14

  if (top + estimatedBubbleHeight > window.innerHeight - 12) {
    top = rect.top - estimatedBubbleHeight - 14
    previewPlacement.value = 'top'
  } else {
    previewPlacement.value = 'bottom'
  }
  if (top < 12) top = 12

  previewBubbleStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${bubbleWidth}px`
  }


  const arrowLeft = rect.left + rect.width / 2 - left
  previewArrowStyle.value = { left: `${arrowLeft}px` }

  preview.visible = true
}

function closePreview() {
  preview.visible = false
  preview.files = []
  preview.trackId = null
  preview.type = null
  previewRect.value = null
}

function refreshPreviewFiles() {
  if (!preview.trackId || !preview.type) return
  const list = contentRef.value?.pageList || []
  const row = list.find(item => item.id === preview.trackId)
  if (!row) return
  const field = preview.type === 'attachment' ? 'attachments' : 'vouchers'
  preview.files = row[field] || []
}

function previewFile(file) {
  const url = getFileUrl(file.destination, file.filename)
  if (url) window.open(url, '_blank')
}

function openFileInNewWindow(file) {
  const url = getFileUrl(file.destination, file.filename)
  if (url) window.open(url, '_blank')
}

async function downloadFile(file) {
  const url = getFileUrl(file.destination, file.filename)
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = file.filename || 'download'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, '_blank')
  }
}

function triggerPreviewUpload() {
  previewFileInput.value?.click()
}

async function handlePreviewFileUpload(event) {
  const files = event.target.files
  if (!files || files.length === 0 || !preview.trackId) return

  const fieldName = preview.type === 'attachment' ? 'payment_attachment' : 'payment_voucher'
  const uploadUrl = `${BASE_URL}/payment_tracks/upload/${preview.type === 'attachment' ? 'attachment' : 'voucher'}/${preview.trackId}`
  const token = localCache.getCache(LOGIN_TOKEN)


  const uploadItems = []
  for (let i = 0; i < files.length; i++) {
    const item = reactive({
      _uploadKey: `_upload_${Date.now()}_${i}`,
      id: null,
      filename: files[i].name,
      mimetype: files[i].type,
      isUploading: true,
      progress: 0
    })
    uploadItems.push({ file: files[i], item })
    preview.files.push(item)
  }


  const timers = uploadItems.map(({ item }) => {
    return setInterval(() => {
      if (item.progress < 85) {
        item.progress += Math.floor(Math.random() * 12) + 3
        if (item.progress > 85) item.progress = 85
      }
    }, 200)
  })

  let successCount = 0

  for (let i = 0; i < uploadItems.length; i++) {
    const { file, item } = uploadItems[i]
    const formData = new FormData()
    formData.append(fieldName, file)


    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const thumbnail = await generatePdfThumbnail(arrayBuffer)
        if (thumbnail) formData.append('thumbnail', thumbnail)
      } catch {

      }
    }

    try {
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      })
      const result = await res.json()
      if (result.code === 0) {
        successCount++
        clearInterval(timers[i])
        item.progress = 100
      } else {
        clearInterval(timers[i])
        item.progress = 0
        item.isUploading = false
      }
    } catch {
      clearInterval(timers[i])
      item.progress = 0
      item.isUploading = false
    }
  }


  await new Promise(resolve => setTimeout(resolve, 400))

  if (successCount > 0) {
    ElNotification({ message: `${successCount}个文件上传成功`, type: 'success', duration: 2000 })
    await contentRef.value?.fetchPageListData()
    refreshPreviewFiles()
  } else {

    preview.files = preview.files.filter(f => !f.isUploading)
    ElNotification({ message: '文件上传失败', type: 'error' })
  }

  event.target.value = ''
}

function requestDeleteFile(file) {
  confirmDeleteId.value = file.id
}

function confirmDeleteYes() {
  const file = preview.files.find(f => f.id === confirmDeleteId.value)
  confirmDeleteId.value = null
  if (file) deleteFile(file)
}

async function deleteFile(file) {
  if (!file || !preview.trackId) return


  const fileType = preview.type
  const trackId = preview.trackId

  try {
    const type = fileType === 'attachment' ? 'attachment' : 'voucher'
    const url = `${BASE_URL}/payment_tracks/${type}/${file.id}`
    const token = localCache.getCache(LOGIN_TOKEN)
    const res = await fetch(url, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    const result = await res.json()
    if (result.code === 0) {
      ElNotification({ message: '文件已删除', type: 'success', duration: 2000 })
      const idx = preview.files.findIndex(f => f.id === file.id)
      if (idx !== -1) preview.files.splice(idx, 1)
      if (preview.files.length === 0) {
        closePreview()
      }
      await contentRef.value?.fetchPageListData()

      if (preview.visible && preview.trackId === trackId) {
        refreshPreviewFiles()
      }
    } else {
      ElNotification({ message: result.message || '删除失败', type: 'error' })
    }
  } catch {
    ElNotification({ message: '删除失败', type: 'error' })
  }
}


const selectEdit = ref({ id: null, field: null, value: '', initialValue: '' })
const selectSearch = ref('')
const selectInputRef = ref(null)
const selectOptions = ref([])
const selectRect = ref(null)
const selectBubblePlacement = ref('top')

const filteredSelectOptions = computed(() => {
  if (!selectSearch.value) return selectOptions.value
  return selectOptions.value.filter(opt =>
    opt.toLowerCase().includes(selectSearch.value.toLowerCase())
  )
})

const selectBubbleStyle = computed(() => {
  const rect = selectRect.value
  if (!rect) return {}
  const bubbleWidth = 240
  let left = rect.left + rect.width / 2 - bubbleWidth / 2
  if (left < 12) left = 12
  const maxLeft = window.innerWidth - bubbleWidth - 12
  if (left > maxLeft) left = maxLeft

  const maxListHeight = 200
  const spaceAbove = rect.top
  const spaceBelow = window.innerHeight - rect.bottom
  const gap = 10
  let top

  if (spaceBelow >= maxListHeight + gap) {
    top = rect.bottom + gap
    selectBubblePlacement.value = 'bottom'
  } else if (spaceAbove >= maxListHeight + gap) {
    top = rect.top - maxListHeight - gap
    selectBubblePlacement.value = 'top'
  } else {
    top = 12
    selectBubblePlacement.value = 'top'
  }

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${bubbleWidth}px`
  }
})

const selectArrowStyle = computed(() => {
  const rect = selectRect.value
  if (!rect) return {}
  let left = rect.left + rect.width / 2 - (parseFloat(selectBubbleStyle.value.left) || 0)
  return { left: `${left}px` }
})

async function startSelectEdit(event, id, field, value) {
  selectRect.value = event.currentTarget.getBoundingClientRect()
  selectEdit.value = { id, field, value: value || '', initialValue: value || '' }
  selectSearch.value = ''


  let list = []
  if (field === 'payment_entity') {
    const defaults = ['Eflow', 'Terra']
    const history = await systemStore.getPaymentTrackEntityOptionsAction()
    const merged = [...defaults]
    ;(history || []).forEach(s => { if (!merged.includes(s)) merged.push(s) })
    list = merged
  } else if (field === 'currency') {
    const defaults = ['CNY', 'USD', 'HKD']
    const history = await systemStore.getPaymentTrackCurrencyOptionsAction()
    const merged = [...defaults]
    ;(history || []).forEach(s => { if (!merged.includes(s)) merged.push(s) })
    list = merged
  } else if (field === 'payment_status') {

    const defaults = ['【已付款】', '已收invoice', '可付款!']
    const history = await systemStore.getPaymentTrackStatusOptionsAction()
    const merged = [...defaults]
    ;(history || []).forEach(s => { if (!merged.includes(s)) merged.push(s) })
    list = merged
  }
  selectOptions.value = list || []

  nextTick(() => {
    selectInputRef.value?.focus()
    selectInputRef.value?.select()
  })
}

function selectOption(opt) {
  const { id, field, initialValue } = selectEdit.value
  if (opt && opt !== initialValue) {
    const updateData = { [field]: opt }


    if (field === 'payment_status') {
      if (opt.includes('已付款')) {
        updateData.confirmed_date = getNowTimestampStr()
      } else if (opt.includes('可付款!')) {
        updateData.confirmed_date = ''
      }
    }

    systemStore.editPageDataAction('payment_tracks', id, updateData, null, 'list')
  }
  cancelSelectEdit()
}

function confirmSelectOption() {
  const val = selectSearch.value.trim()
  if (val) {
    selectOption(val)
  } else {
    cancelSelectEdit()
  }
}

function cancelSelectEdit() {
  selectEdit.value = { id: null, field: null, value: '', initialValue: '' }
  selectSearch.value = ''
}

function handleNewClick() {
  modalRef.value?.setModalVisible('new')
}

function handleEditClick(rowData) {
  modalRef.value?.setModalVisible('edit', rowData)
}

function handleCreated() {
  contentRef.value?.fetchPageListData()
}


function isImage(mimetype) {
  return mimetype?.startsWith('image/')
}

function getFileUrl(destination, filename) {
  if (!destination) return ''
  if (destination.startsWith('http')) return destination
  const basePath = destination.startsWith('/') ? destination.slice(1) : destination
  const fullPath = filename ? `${basePath}/${filename}` : basePath
  return `${BASE_URL}/${fullPath}`
}

function getFileExt(filename) {
  if (!filename) return '?'
  const ext = filename.split('.').pop().toUpperCase()
  return ext.length > 4 ? ext.slice(0, 4) : ext
}


async function generatePdfThumbnail(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)
  const desiredWidth = 200
  const unscaledViewport = page.getViewport({ scale: 1 })
  const scale = desiredWidth / unscaledViewport.width
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(viewport.width))
  canvas.height = Math.max(1, Math.round(viewport.height))
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas.toDataURL('image/jpeg', 0.8)
}


const triggerRect = ref(null)

function startInlineEdit(event, id, field, value) {
  const cellEl = event.currentTarget
  const cellRect = cellEl.getBoundingClientRect()
  triggerRect.value = cellRect
  editingCell.value = { id, field, value: value || '', initialValue: value || '' }


  inlineEditStyle.value = {
    position: 'absolute',
    left: `${cellRect.left}px`,
    top: `${cellRect.top - 1}px`,
    minWidth: `${cellRect.width + 2}px`,
    minHeight: `${cellRect.height + 2}px`
  }

  nextTick(() => {
    const textarea = inlineInputRef.value
    if (textarea) {
      textarea.focus()

      textarea.style.height = 'auto'
      textarea.style.height = `${Math.max(cellRect.height, textarea.scrollHeight)}px`
    }
  })
}

function autoResizeTextarea() {
  const textarea = inlineInputRef.value
  if (!textarea) return
  textarea.style.height = 'auto'
  const newHeight = Math.max(30, textarea.scrollHeight)
  textarea.style.height = `${newHeight}px`
}

function saveInlineEdit() {
  const { id, field, value, initialValue } = editingCell.value
  if (value !== initialValue && field === 'remark') {
    systemStore.editPageDataAction('payment_tracks', id, { [field]: value }, null, 'list')
  }
  editingCell.value = { id: null, field: null, value: '', initialValue: '' }
  inlineEditStyle.value = {}
}

function cancelInlineEdit() {
  editingCell.value = { id: null, field: null, value: '', initialValue: '' }
  inlineEditStyle.value = {}
}

function isEditing(id, field) {
  return editingCell.value.id === id && editingCell.value.field === field
}


const pasteBubblePlacement = ref('top')

const pasteBubbleStyle = computed(() => {
  const rect = pasteRect.value
  if (!rect) return {}
  const bubbleWidth = 220
  const bubbleHeight = 120
  let left = rect.left + rect.width / 2 - bubbleWidth / 2
  if (left < 12) left = 12
  const maxLeft = window.innerWidth - bubbleWidth - 12
  if (left > maxLeft) left = maxLeft

  const spaceAbove = rect.top
  const spaceBelow = window.innerHeight - rect.bottom
  const gap = 10
  let top

  if (spaceAbove >= bubbleHeight + gap) {
    top = rect.top - bubbleHeight - gap
    pasteBubblePlacement.value = 'top'
  } else if (spaceBelow >= bubbleHeight + gap) {
    top = rect.bottom + gap
    pasteBubblePlacement.value = 'bottom'
  } else {
    top = 12
    pasteBubblePlacement.value = 'top'
  }

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${bubbleWidth}px`
  }
})

const pasteArrowStyle = computed(() => {
  const rect = pasteRect.value
  if (!rect) return {}
  let left = rect.left + rect.width / 2 - (parseFloat(pasteBubbleStyle.value.left) || 0)
  return { left: `${left}px` }
})


function startPaste(event, trackId, type) {
  pasteRect.value = event.currentTarget.getBoundingClientRect()
  pasteTarget.value = { trackId, type }
  nextTick(() => {
    pasteInputRef.value?.focus()
  })
}

function cancelPaste() {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
  pasteTarget.value = { trackId: null, type: null }
  uploadProgress.value = { uploading: false, done: false, percent: 0, fileName: '' }
}

function simulateProgress() {
  uploadProgress.value.uploading = true
  uploadProgress.value.percent = 0

  progressTimer = setInterval(() => {
    if (uploadProgress.value.percent < 85) {
      uploadProgress.value.percent += Math.floor(Math.random() * 12) + 3
      if (uploadProgress.value.percent > 85) uploadProgress.value.percent = 85
    }
  }, 200)
}

async function handlePaste(event) {
  const { trackId, type } = pasteTarget.value
  if (!trackId || !type) return

  const files = event.clipboardData?.files
  if (!files || files.length === 0) return

  event.preventDefault()

  const file = files[0]
  uploadProgress.value.fileName = file.name
  simulateProgress()

  const fieldName = type === 'attachment' ? 'payment_attachment' : 'payment_voucher'
  const url = `${BASE_URL}/payment_tracks/upload/${type === 'attachment' ? 'attachment' : 'voucher'}/${trackId}`

  const formData = new FormData()
  formData.append(fieldName, file)


  if (file.type === 'application/pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const thumbnail = await generatePdfThumbnail(arrayBuffer)
      if (thumbnail) formData.append('thumbnail', thumbnail)
    } catch {

    }
  }

  const token = localCache.getCache(LOGIN_TOKEN)
  let uploadSuccess = false

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    })
    const result = await res.json()
    if (result.code === 0) {
      uploadSuccess = true
    } else {
      ElNotification({ message: result.message || '上传失败', type: 'error' })
    }
  } catch {
    ElNotification({ message: '文件上传失败', type: 'error' })
  }

  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }

  if (uploadSuccess) {
    uploadProgress.value.percent = 100
    uploadProgress.value.done = true
    await new Promise(resolve => setTimeout(resolve, 600))
    ElNotification({ message: type === 'attachment' ? '附件上传成功' : '水单上传成功', type: 'success', duration: 2000 })
    contentRef.value?.fetchPageListData()
  }

  cancelPaste()
}

function handlePreviewKeydown(event) {
  if (!preview.visible) return
  if (event.key === 'Escape') {
    closePreview()
  }
}

onMounted(() => {
  document.addEventListener('paste', handlePaste)
  document.addEventListener('keydown', handlePreviewKeydown)
})

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)
  document.removeEventListener('keydown', handlePreviewKeydown)
  if (periodDocumentClickHandler) {
    document.removeEventListener('mousedown', periodDocumentClickHandler)
    periodDocumentClickHandler = null
  }
})

console.log("ccc")
</script>

<style lang="less">
.el-tooltip__popper.is-light {
  background-color: #fff !important;
  border: 1px solid #e8eaed !important;
  .el-tooltip__arrow::before {
    border: 1px solid #e8eaed !important;
    background-color: #fff !important;
  }
}


.el-picker__popper {
  z-index: 9999 !important;
}


.preview-bubble {
  padding: 10px;
}


.delete-confirm-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
}

.delete-confirm-bubble {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  color: #202124;

  .confirm-btns {
    display: flex;
    gap: 8px;
  }

  .confirm-yes {
    border: none;
    background: #d93025;
    color: #fff;
    padding: 6px 20px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;

    &:hover { background: #c5221f; }
  }

  .confirm-no {
    border: 1px solid #dadce0;
    background: #fff;
    color: #5f6368;
    padding: 6px 20px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;

    &:hover { background: #f1f3f4; }
  }
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.preview-grid-item {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: #f1f3f4;
  cursor: pointer;

  &.is-uploading {
    cursor: default;
    &:hover .grid-overlay { opacity: 0; }
  }

  .grid-thumb {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .grid-file-type {
    font-size: 11px;
    font-weight: 600;
    color: #5f6368;
  }

  .grid-upload-mask {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px;
  }

  .upload-progress-bar {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    overflow: hidden;
  }

  .upload-progress-fill {
    height: 100%;
    background: #fff;
    border-radius: 2px;
    transition: width 0.2s ease;
  }

  .upload-progress-text {
    font-size: 11px;
    color: #fff;
    font-weight: 500;
  }

  .grid-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.18s;
    padding: 6px;
  }

  &:hover .grid-overlay {
    opacity: 1;
  }

  .grid-filename {
    font-size: 10px;
    color: #fff;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    line-height: 1.3;
  }

  .grid-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .grid-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover {
      background: rgba(255, 255, 255, 0.4);
    }

    &.danger:hover {
      background: rgba(217, 48, 37, 0.6);
    }
  }
}

.preview-grid-item.add-item {
  border: 1px dashed #dadce0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #9aa0a6;
  transition: border-color 0.15s, color 0.15s, background-color 0.15s;

  svg {
    fill: #9aa0a6;
    width: 22px;
    height: 22px;
  }

  span {
    font-size: 10px;
  }

  &:hover {
    border-color: #1a73e8;
    color: #1a73e8;
    background-color: #f0f5ff;

    svg {
      fill: #1a73e8;
    }
  }
}
</style>

<style lang="less" scoped>
.track-page {
  width: 100%;
  height: 100%;
}


.file-preview-list {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
  overflow: hidden;
}

.file-preview-item {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #e8eaed;

  &.clickable {
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;

    &:hover {
      border-color: #1a73e8;
      box-shadow: 0 0 0 1px #1a73e8;
    }
  }

  .preview-img {
    width: 100%;
    height: 100%;
  }

  .pdf-thumb {
    object-fit: cover;
    background: #fff;
  }
}

.file-more.clickable {
  cursor: pointer;
  &:hover {
    color: #1a73e8;
  }
}

.file-type-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f1f3f4;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 600;
  color: #5f6368;
}

.file-more {
  font-size: 11px;
  color: #5f6368;
  font-weight: 500;
}

.file-tooltip {
  div {
    font-size: 13px;
    line-height: 1.6;
    color: #202124;
  }
}

.empty-placeholder {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: #e8eaed;
  border-radius: 50%;
}

.upload-hint {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: #e8eaed;
  border-radius: 50%;
}

.upload-cell:hover > .upload-hint {
  width: auto;
  height: auto;
  background-color: transparent;
  border-radius: 0;
  color: #9aa0a6;
  font-size: 13px;

  &::after {
    content: attr(data-text);
  }
}

.upload-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 40px;
  padding: 4px 6px;
  box-sizing: border-box;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
  position: relative;

  &:hover {
    border-color: #1a73e8;
    background-color: #f0f5ff;
  }

  &.is-active {
    border-color: #1a73e8;
    background-color: #f0f5ff;
  }

  &.has-files:hover {
    background-color: transparent;
  }

  &.has-files.is-active {
    background-color: transparent;
  }
}

.cell-dropdown-arrow {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  color: #9aa0a6;
  opacity: 0;
  transition: opacity 0.15s, background-color 0.15s, color 0.15s;
  cursor: pointer;

  &:hover {
    background-color: #1a73e8;
    color: #fff;
  }
}

.upload-cell:hover > .cell-dropdown-arrow {
  opacity: 1;
}

.editable-cell {
  justify-content: center;
  cursor: text;
  width: 100%;
  min-height: 40px;
  display: flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: border-color 0.15s, background-color 0.15s;

  &:hover { border-color: #1a73e8; background-color: #f0f5ff; color: #1a73e8; }
  &.is-active { border-color: #1a73e8; background-color: #f0f5ff; color: #1a73e8; }

  &.has-content { color: #202124; }
  &.is-empty { color: #9aa0a6; justify-content: center; }

  .remark-text {
    text-align: center;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
  }
}

.remark-tooltip {
  max-width: 360px;
  word-break: break-word;
  line-height: 1.5;
  color: #202124;
}

.remark-cell {
  &.has-content {
    justify-content: flex-start;
  }
}

.edit-hint {
  user-select: none;
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: #e8eaed;
  border-radius: 50%;
}

.tag-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
}

.editable-cell:hover > .edit-hint {
  width: auto;
  height: auto;
  background-color: transparent;
  border-radius: 0;
  color: #9aa0a6;
  font-size: 13px;

  &::after {
    content: '双击编辑';
  }
}


.entity-select-bubble {
  padding: 0;
}

.entity-search-wrap {
  padding: 8px 10px;
  border-bottom: 1px solid #f1f3f4;
}

.entity-search-input {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #e8eaed;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  color: #202124;
  background: #f8f9fa;
  box-sizing: border-box;
  transition: border-color 0.15s, background-color 0.15s;

  &:focus {
    border-color: #1a73e8;
    background-color: #fff;
  }

  &::placeholder {
    color: #9aa0a6;
  }
}

.entity-options-list {
  max-height: 180px;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-content: flex-start;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #dadce0;
    border-radius: 2px;
  }
}

.entity-option-item {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: #3c4043;
  background-color: #f1f3f4;
  cursor: pointer;
  transition: background-color 0.12s, color 0.12s;
  white-space: nowrap;
  line-height: 1.5;

  &:hover {
    background-color: #d2e3fc;
    color: #1a73e8;
  }

  &.is-active {


    font-weight: 500;
    border: 1px solid #1a73e8;
  }
}

.entity-option-create {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: #1a73e8;
  background-color: #e8f0fe;
  cursor: pointer;
  transition: background-color 0.12s;
  white-space: nowrap;
  line-height: 1.5;

  &:hover {
    background-color: #d2e3fc;
  }
}

.entity-option-empty {
  padding: 16px 10px;
  text-align: center;
  font-size: 13px;
  color: #9aa0a6;
}


.inline-edit-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

.inline-edit-placeholder {
  min-height: 40px;
}

.inline-edit-wrapper {
  box-sizing: border-box;
  background: #fff !important;
  border: 2px solid #1a73e8;
  border-radius: 2px;
  box-shadow: 0 1px 4px rgba(26, 115, 232, 0.15);
  overflow: visible;
  padding: 0;
}

.period-edit-wrapper {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
}


.amount-cell {
  justify-content: center;
  width: 100%;
}

.inline-amount-input {
  width: 100%;
  height: 100%;
  min-height: 30px;
  padding: 0 6px;
  border: none;
  font-size: 13px;
  font-family: 'Roboto Mono', monospace;
  text-align: center;
  outline: none;
  color: #202124;
  background: #fff;
  box-sizing: border-box;

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  -moz-appearance: textfield;
}

.inline-edit-textarea {
  display: block;
  width: 100%;
  min-height: 30px;
  padding: 4px 6px;
  border: none;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
  resize: none;
  outline: none;
  color: #202124;
  word-break: break-all;
  background: #fff !important;
  box-sizing: border-box;
}


.bubble-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.bubble-wrapper {
  position: absolute;
  filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.15));
  transform-origin: center bottom;
}


.bubble-arrow {
  position: absolute;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border: 8px solid transparent;

  &.arrow-down {
    bottom: -16px;
    border-top-color: #fff;
    border-bottom-width: 0;
  }

  &.arrow-up {
    top: -16px;
    border-bottom-color: #fff;
    border-top-width: 0;
  }
}

.bubble-body {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}


.paste-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 90px;
  padding: 16px 20px;
  outline: none;
  cursor: text;
  border: 2px solid transparent;
  border-radius: 10px;
  transition: border-color 0.2s, background-color 0.2s;

  &:focus {
    border-color: #1a73e8;
    background-color: #f8faff;

    .paste-icon {
      fill: #1a73e8;
    }
  }

  &.is-uploading {
    cursor: default;
    border-color: #1a73e8;
    background-color: #f8faff;

    .paste-icon {
      fill: #1a73e8;
      animation: check-bounce 0.4s cubic-bezier(0.34, 1.4, 0.64, 1);
    }
  }

  &.is-done {
    border-color: #1e8e3e;
    background-color: #f0faf2;

    .paste-icon {
      fill: #1e8e3e;
    }
  }
}

.paste-icon {
  width: 32px;
  height: 32px;
  fill: #9aa0a6;
  margin-bottom: 8px;
  transition: fill 0.2s;
}

.paste-text {
  font-size: 14px;
  color: #5f6368;
  font-weight: 500;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.paste-sub {
  font-size: 12px;
  color: #9aa0a6;
  margin-top: 4px;
}


.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 10px;
}

.progress-bar-track {
  flex: 1;
  height: 6px;
  background-color: #e8eaed;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background-color: #1a73e8;
  border-radius: 3px;
  transition: width 0.25s ease-out;

  .is-done & {
    background-color: #1e8e3e;
  }
}

.progress-bar-label {
  font-size: 12px;
  color: #5f6368;
  font-weight: 500;
  min-width: 32px;
  text-align: right;
}

@keyframes check-bounce {
  0% { transform: scale(0); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}


.bubble-enter-active {
  transition: opacity 0.22s cubic-bezier(0.2, 0, 0, 1);
  .bubble-wrapper {
    animation: bubble-pop-in 0.28s cubic-bezier(0.34, 1.4, 0.64, 1);
  }
}
.bubble-leave-active {
  transition: opacity 0.16s ease-in;
  .bubble-wrapper {
    animation: bubble-pop-out 0.16s ease-in forwards;
  }
}
.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
}

@keyframes bubble-pop-in {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }
  60% {
    opacity: 1;
    transform: scale(1.04);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes bubble-pop-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.7);
  }
}
</style>
