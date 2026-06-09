<template>
  <div class="landingpage-container" :class="{ 'fullscreen-mode': isFullscreen }">
    <!-- 页面头部 -->
    <div class="page-header" v-show="!isFullscreen">
      <div class="header-left">
        <h1>落地页管理</h1>
        <span class="page-subtitle">管理网站的落地页和爬虫任务</span>
      </div>
      <div class="header-actions">
        <el-button class="crawler-btn" @click="handleOpenCrawler">
          <el-icon><Download /></el-icon>
          爬虫工具
        </el-button>
        <el-button type="primary" class="create-btn" @click="handleCreate" style="background-color: #1a73e8;">
          <el-icon><Plus /></el-icon>
          新建落地页
        </el-button>
        <!-- 列设置按钮 -->
        <el-dropdown trigger="click" @command="handleColumnSetting" :hide-on-click="false">
          <el-button icon="Setting" circle title="列设置" />
          <template #dropdown>
            <el-dropdown-menu class="column-setting-menu">
              <div class="column-setting-header">
                <span>列设置</span>
                <el-button link type="primary" size="small" @click="resetColumns">重置</el-button>
              </div>
              <el-scrollbar max-height="350px">
                <div
                  v-for="(col, index) in orderedColumns"
                  :key="col.key"
                  class="column-item"
                  :class="{ 'column-required': col.required, 'column-hidden': !isColumnVisible(col), 'dragging': draggingIndex === index }"
                  draggable="true"
                  @dragstart="handleDragStart(index, $event)"
                  @dragover.prevent="handleDragOver(index)"
                  @dragend="handleDragEnd"
                  @drop="handleDrop(index)"
                >
                  <div class="column-drag-handle">
                    <svg viewBox="0 0 24 24">
                      <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </div>
                  <div class="column-item-left">
                    <el-checkbox
                      :model-value="isColumnVisible(col)"
                      @change="toggleColumn(col.key)"
                      :disabled="col.required"
                    >
                      {{ col.label }}
                    </el-checkbox>
                  </div>
                </div>
              </el-scrollbar>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button class="fullscreen-btn" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏'">
          <el-icon>
            <FullScreen />
          </el-icon>
        </el-button>
      </div>
    </div>

    <!-- 分类 Tab -->
    <div class="category-tabs" :class="{ 'fullscreen-tabs': isFullscreen }" ref="categoryTabsRef">
      <div class="tabs-header">
        <el-tabs
          ref="tabsRef"
          v-model="activeCategoryId"
          @tab-change="handleCategoryChange"
          class="category-tabs-el"
        >
          <el-tab-pane label="全部" name="">
            <template #label>
              <span class="tab-label">
                <span class="tab-text">全部</span>
              </span>
            </template>
          </el-tab-pane>
          <el-tab-pane
            v-for="category in visibleCategories"
            :key="category.id"
            :name="String(category.id)"
          >
            <template #label>
              <span class="tab-label" :class="{ 'draggable': isEditing }">
                <el-tooltip :content="`创建者：${category.creator_nickname || category.creator_name || '未知用户'}`" placement="top" :show-after="1200">
                  <span class="tab-text">
                    {{ category.category_name }}
                    <el-icon v-if="category.visibility === 'private'" class="visibility-icon" title="私有分类">
                      <component :is="'Lock'" />
                    </el-icon>
                  </span>
                </el-tooltip>
                <el-icon
                  v-if="isEditing"
                  class="tab-fold-icon"
                  @click.stop="handleFoldCategory(category)"
                  title="折叠分类"
                >
                  <component :is="'ArrowDown'" />
                </el-icon>
                <el-icon
                  v-if="isEditing && canDeleteCategory(category)"
                  class="tab-delete-icon"
                  @click.stop="handleDeleteCategory(category)"
                >
                  <Close />
                </el-icon>
              </span>
            </template>
          </el-tab-pane>
          <!-- 折叠分类 Tab -->
          <el-tab-pane
            v-if="foldedCategoryIds.length > 0"
            :name="'folded'"
            class="folded-tab-pane"
          >
            <template #label>
              <span class="tab-label folded-label" @click.prevent="openFoldedDialog">
                <span class="tab-text">
                  折叠
                  <span class="folded-count">({{ foldedCategoryIds.length }})</span>
                </span>
              </span>
            </template>
          </el-tab-pane>
        </el-tabs>
        <div class="tabs-right-actions">
          <!-- 全屏模式下显示的按钮 -->
          <template v-if="isFullscreen">
            <el-button type="primary" size="small" class="fullscreen-create-btn" @click="handleCreate">
              <el-icon><Plus /></el-icon>
              新建落地页
            </el-button>
            <el-button size="small" class="fullscreen-exit-btn" @click="toggleFullscreen">
              <el-icon><FullScreen /></el-icon>
              退出全屏
            </el-button>
          </template>
          <!-- 普通模式下的按钮 -->
          <template v-else>
            <button
              class="search-toggle-btn"
              :class="{ 'active': searchExpanded }"
              @click="searchExpanded = !searchExpanded"
              title="搜索"
            >
              <el-icon><Search /></el-icon>
            </button>
            <el-dropdown trigger="click" @command="handleTabMoreAction" class="tabs-more-dropdown">
              <el-icon class="tabs-more-icon"><MoreFilled /></el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="createPrivateCategory">
                    <el-icon><Plus /></el-icon>
                    新建私有分类
                  </el-dropdown-item>
                  <el-dropdown-item command="createPublicCategory">
                    <el-icon><Plus /></el-icon>
                    新建公共分类
                  </el-dropdown-item>
                  <el-dropdown-item command="toggleEdit">
                    <el-icon><Edit /></el-icon>
                    {{ isEditing ? '完成编辑' : '编辑分类' }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </div>
      </div>
    </div>

    <!-- 搜索栏 - 可折叠 -->
    <transition name="search-expand">
      <div class="search-bar" v-show="searchExpanded">
        <div class="search-row">
          <div class="search-inputs">
            <div class="search-item">
              <label>搜索</label>
              <el-input
                v-model="searchForm.landingname"
                placeholder="搜索Landers"
                clearable
                class="search-input"
                @keyup.enter="handleSearch"
                @clear="handleReset"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 数据表格 -->
    <div class="table-container">
      <el-table
        :data="tableData"
        v-loading="loading"
        class="google-table"
        stripe
        border
        style="width: 100%"
        @row-contextmenu="handleRowContextMenu"
      >
        <!-- nas文件名列 -->
        <template v-for="col in tableColumns" :key="col.key">
          <el-table-column
            v-if="col.key === 'nas_filename'"
            :label="columnConfigMap.nas_filename.label"
            :min-width="columnConfigMap.nas_filename.minWidth"
            :align="columnConfigMap.nas_filename.align"
          >
            <template #default="{ row }">
              <div
                v-if="!isCellEditing(row.id, 'nas_filename')"
                @dblclick="startEdit(row.id, 'nas_filename', row.nas_filename)"
                class="editable-cell"
              >
                <span v-if="row.nas_filename" class="nas-filename" :title="row.nas_filename">
                  {{ row.nas_filename }}
                </span>
                <span v-else class="no-url">-</span>
              </div>
              <div v-else class="editing-cell">
                <el-input
                  v-model="editingCell.value"
                  ref="inputRef"
                  @blur="saveEdit"
                  @keydown.enter="saveEdit"
                  @keydown.esc="cancelEdit"
                  class="edit-input"
                  type="textarea"
                  :rows="3"
                />
              </div>
            </template>
          </el-table-column>

          <!-- Landers列 -->
          <el-table-column
            v-else-if="col.key === 'landingname'"
            :label="columnConfigMap.landingname.label"
            :min-width="columnConfigMap.landingname.minWidth"
            :align="columnConfigMap.landingname.align"
          >
            <template #default="{ row }">
              <div
                v-if="!isCellEditing(row.id, 'landingname')"
                @dblclick="startEdit(row.id, 'landingname', row.landingname)"
                class="editable-cell"
              >
                <span v-if="row.landingname" class="editable-text">{{ row.landingname }}</span>
                <span v-else class="no-url">-</span>
              </div>
              <div v-else class="editing-cell">
                <el-input
                  v-model="editingCell.value"
                  ref="inputRef"
                  @blur="saveEdit"
                  @keydown.enter="saveEdit"
                  @keydown.esc="cancelEdit"
                  class="edit-input"
                  type="textarea"
                  :rows="3"
                />
              </div>
            </template>
          </el-table-column>

          <!-- 网页链接列 -->
          <el-table-column
            v-else-if="col.key === 'landing_url'"
            :label="columnConfigMap.landing_url.label"
            :min-width="columnConfigMap.landing_url.minWidth"
            :align="columnConfigMap.landing_url.align"
          >
            <template #default="{ row }">
              <div
                v-if="!isCellEditing(row.id, 'landing_url')"
                @dblclick="startEdit(row.id, 'landing_url', row.landing_url)"
                class="editable-cell"
              >
                <span v-if="row.landing_url" class="url-link" :title="row.landing_url">
                  {{ row.landing_url }}
                </span>
                <span v-else class="no-url">-</span>
                <a
                  v-if="row.landing_url"
                  :href="row.landing_url"
                  target="_blank"
                  class="external-link-btn"
                  title="打开链接"
                  @click.stop
                >
                  <svg viewBox="0 0 24 24" class="external-icon">
                    <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                  </svg>
                </a>
              </div>
              <div v-else class="editing-cell">
                <el-input
                  v-model="editingCell.value"
                  ref="inputRef"
                  @blur="saveEdit"
                  @keydown.enter="saveEdit"
                  @keydown.esc="cancelEdit"
                  class="edit-input"
                  type="textarea"
                  :rows="5"
                />
              </div>
            </template>
          </el-table-column>

          <!-- 预览图列 -->
          <el-table-column
            v-else-if="col.key === 'preview_url'"
            :label="columnConfigMap.preview_url.label"
            :width="columnConfigMap.preview_url.width"
            :align="columnConfigMap.preview_url.align"
          >
            <template #default="{ row }">
              <div class="preview-image-wrapper">
                <el-image
                  v-if="row.preview_url"
                  :src="row.preview_url"
                  :preview-src-list="[row.preview_url]"
                  hide-on-click-modal
                  fit="contain"
                  class="preview-image"
                  :preview-teleported="true"
                >
                  <template #error>
                    <div class="no-preview-image-error">
                      <el-icon><Picture /></el-icon>
                      <span>图片加载失败</span>
                    </div>
                  </template>
                </el-image>
                <div v-else-if="uploadingPreviewMap.has(row.id)" class="preview-loading">
                  <el-icon class="is-loading"><Loading /></el-icon>
                  <span>上传中...</span>
                </div>
                <div v-else-if="screenshotLoadingMap.get(row.id)" class="preview-loading">
                  <el-icon class="is-loading"><Loading /></el-icon>
                  <span>生成中...</span>
                </div>
                <div v-else class="no-preview">
                  <el-icon><Picture /></el-icon>
                  <span>暂无预览</span>
                </div>
                <!-- 上传预览图按钮 -->
                <button
                  class="upload-preview-btn"
                  @click="handleUploadPreview(row)"
                  title="上传预览图"
                >
                  <el-icon><Upload /></el-icon>
                </button>
                <!-- 隐藏的文件输入 -->
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  style="display: none"
                  @change="handleFileChange"
                />
              </div>
            </template>
          </el-table-column>

          <!-- 效果列 -->
          <el-table-column
            v-else-if="col.key === 'effect'"
            :label="columnConfigMap.effect.label"
            :min-width="columnConfigMap.effect.minWidth"
            :align="columnConfigMap.effect.align"
          >
            <template #default="{ row }">
              <div
                v-if="!isCellEditing(row.id, 'effect')"
                @dblclick="startEdit(row.id, 'effect', row.effect)"
                class="editable-cell"
              >
                <span v-if="row.effect" class="effect-text" :title="row.effect">
                  {{ row.effect }}
                </span>
                <span v-else class="no-url">-</span>
              </div>
              <div v-else class="editing-cell">
                <el-input
                  v-model="editingCell.value"
                  ref="inputRef"
                  @blur="saveEdit"
                  @keydown.enter="saveEdit"
                  @keydown.esc="cancelEdit"
                  class="edit-input"
                  type="textarea"
                  :rows="3"
                />
              </div>
            </template>
          </el-table-column>

          <!-- 备注列 -->
          <el-table-column
            v-else-if="col.key === 'remark'"
            :label="columnConfigMap.remark.label"
            :min-width="columnConfigMap.remark.minWidth"
            :align="columnConfigMap.remark.align"
          >
            <template #default="{ row }">
              <div
                v-if="!isCellEditing(row.id, 'remark')"
                @dblclick="startEdit(row.id, 'remark', row.remark)"
                class="editable-cell"
              >
                <span v-if="row.remark" class="remark-text" :title="row.remark">
                  {{ row.remark }}
                </span>
                <span v-else class="no-url">-</span>
              </div>
              <div v-else class="editing-cell">
                <el-input
                  v-model="editingCell.value"
                  ref="inputRef"
                  @blur="saveEdit"
                  @keydown.enter="saveEdit"
                  @keydown.esc="cancelEdit"
                  class="edit-input"
                  type="textarea"
                  :rows="5"
                />
              </div>
            </template>
          </el-table-column>

          <!-- 下载页面列 -->
          <el-table-column
            v-else-if="col.key === 'task_folder'"
            :label="columnConfigMap.task_folder.label"
            :width="columnConfigMap.task_folder.width"
            :align="columnConfigMap.task_folder.align"
          >
            <template #default="{ row }">
              <div v-if="row.task_folder" class="download-actions">
                <el-tooltip content="预览" placement="top">
                  <button class="google-icon-btn" @click="handlePreview(row)">
                    <svg viewBox="0 0 24 24" class="btn-icon">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  </button>
                </el-tooltip>
                <el-tooltip content="下载" placement="top">
                  <button class="google-icon-btn" @click="handleDownloadPage(row)">
                    <svg viewBox="0 0 24 24" class="btn-icon">
                      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                    </svg>
                  </button>
                </el-tooltip>
                <el-tooltip content="重新爬取" placement="top">
                  <button class="google-icon-btn" @click="handleReCrawl(row)">
                    <svg viewBox="0 0 24 24" class="btn-icon">
                      <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                    </svg>
                  </button>
                </el-tooltip>
              </div>
              <button v-else class="google-outline-btn" @click="handleCrawler(row)">
                <svg viewBox="0 0 24 24" class="btn-icon">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                </svg>
                爬取
              </button>
            </template>
          </el-table-column>

          <!-- 可见性列 -->
          <el-table-column
            v-else-if="col.key === 'visibility'"
            :label="columnConfigMap.visibility.label"
            :width="columnConfigMap.visibility.width"
            :align="columnConfigMap.visibility.align"
          >
            <template #default="{ row }">
              <el-tag :type="row.visibility === 'public' ? 'success' : 'info'" size="small">
                {{ row.visibility === 'public' ? '公共' : '私有' }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 创建者列 -->
          <el-table-column
            v-else-if="col.key === 'creator'"
            :label="columnConfigMap.creator.label"
            :width="columnConfigMap.creator.width"
            :align="columnConfigMap.creator.align"
          >
            <template #default="{ row }">
              <div class="creator-cell">
                <el-avatar
                  :src="row.creator_avatar_url"
                  :size="28"
                >
                  {{ (row.creator_nickname || row.creator_name || '-')?.charAt(0)?.toUpperCase() }}
                </el-avatar>
                <span class="creator-name">{{ row.creator_nickname || row.creator_name || '-' }}</span>
              </div>
            </template>
          </el-table-column>

          <!-- 分类列 -->
          <el-table-column
            v-else-if="col.key === 'category'"
            :label="columnConfigMap.category.label"
            :min-width="columnConfigMap.category.minWidth"
            :align="columnConfigMap.category.align"
          >
            <template #default="{ row }">
              <span v-if="row.category_id" class="category-name" :title="getCategoryName(row.category_id)">
                {{ getCategoryName(row.category_id) }}
              </span>
              <span v-else class="no-category">未分类</span>
            </template>
          </el-table-column>

          <!-- 创建时间列 -->
          <el-table-column
            v-else-if="col.key === 'createAt'"
            prop="createAt"
            :label="columnConfigMap.createAt.label"
            :width="columnConfigMap.createAt.width"
            :align="columnConfigMap.createAt.align"
          />
        </template>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 30]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          class="google-pagination"
        />
      </div>
    </div>

    <!-- 爬虫工具对话框（可输入任意 URL） -->
    <CrawlerDialog
      v-model:visible="crawlerDialogVisible"
      :landing-page="currentRow"
      @success="handleCrawlerSuccess"
    />

    <!-- 简化爬虫对话框（列表下载 - URL 固定） -->
    <CrawlerSimpleDialog
      v-if="simpleDialogRow"
      v-model:visible="simpleDialogVisible"
      :landing-page="simpleDialogRow"
      @success="handleSimpleDialogSuccess"
    />

    <!-- 新建/编辑落地页对话框 -->
    <LandingPageDialog
      v-model:visible="landingPageDialogVisible"
      :data="currentEditRow"
      @success="handleDialogSuccess"
    />

    <!-- 分类弹窗 -->
    <CategoryDialog
      v-model:visible="categoryDialogVisible"
      :is-public="categoryIsPublic"
      @confirm="handleCategoryConfirm"
    />

    <!-- 折叠分类对话框 -->
    <el-dialog
      v-model="foldedDialogVisible"
      title="折叠分类"
      width="400px"
      class="folded-dialog"
      :close-on-click-modal="false"
    >
      <div class="folded-categories-list">
        <div
          v-for="categoryId in foldedCategoryIds"
          :key="categoryId"
          class="folded-category-item"
        >
          <span class="folded-category-name">{{ getCategoryName(categoryId) }}</span>
          <el-icon
            class="unfold-icon"
            @click="handleUnfoldCategory(categoryId)"
            title="展开分类"
          >
            <component :is="'ArrowUp'" />
          </el-icon>
        </div>
        <div v-if="foldedCategoryIds.length === 0" class="no-folded">
          暂无折叠的分类
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="foldedDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="unfoldAllCategories">全部展开</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 右键菜单 -->
    <transition name="contextmenu-fade">
      <div
        v-if="contextMenuVisible"
        class="context-menu"
        :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
        @click.stop
      >
        <div class="context-menu-item" @click="handleContextMenuEdit">
          <el-icon><Edit /></el-icon>
          <span>编辑</span>
        </div>
        <div class="context-menu-item danger" @click="handleContextMenuDelete">
          <el-icon><Delete /></el-icon>
          <span>删除</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, watch, onBeforeUnmount, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Download, Edit, Delete, View, Lock, Close, MoreFilled, Loading, Picture, FullScreen, Upload, ArrowDown, ArrowUp, Setting } from '@element-plus/icons-vue'
import Sortable from 'sortablejs'
import { getLandingPageList, deleteLandingPage, uploadLandingPreview, updateLandingPage } from '@/services/main/webpage/landingpage'
import { getCategoriesList, createCategory, deleteCategory, updateCategorySort } from '@/services/main/webpage/categories'
import { localCache } from '@/utils/cache'
import { LOGIN_TOKEN } from '@/global/constants'
import useLoginStore from '@/stores/login/login'
import { BASE_URL } from '@/services/request/config'
import { initWebSocket, onScreenshotReady, disconnectWebSocket } from '@/services/websocket'
import CrawlerDialog from './c-cpns/CrawlerDialog.vue'
import CrawlerSimpleDialog from './c-cpns/CrawlerSimpleDialog.vue'
import LandingPageDialog from './c-cpns/LandingPageDialog.vue'
import CategoryDialog from './c-cpns/CategoryDialog.vue'


const screenshotLoadingMap = ref(new Map())


const uploadingPreviewMap = ref(new Set())


const fileInputRef = ref(null)

const currentUploadLandingId = ref(null)


const isFullscreen = ref(false)


const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value

  if (isFullscreen.value) {
    searchExpanded.value = false
  }
}


const COLUMN_SETTINGS_STORAGE_KEY = 'landingpage_column_settings'


const allColumnsConfig = [
  { key: 'landingname', label: 'Landers', prop: 'landingname', required: false },
  { key: 'landing_url', label: '网页链接', prop: 'landing_url', required: false },
  { key: 'nas_filename', label: 'nas文件名', prop: 'nas_filename', required: false },
  { key: 'effect', label: '效果', prop: 'effect', required: false },
  { key: 'remark', label: '备注', prop: 'remark', required: false },
  { key: 'preview_url', label: '预览图', prop: 'preview_url', required: false },
  { key: 'task_folder', label: '下载页面', prop: 'task_folder', required: false },
  { key: 'visibility', label: '可见性', prop: 'visibility', required: false },
  { key: 'creator', label: '创建者', prop: 'creator_nickname', required: false },
  { key: 'category', label: '分类', prop: 'category_id', required: false, defaultHidden: true },
  { key: 'createAt', label: '创建时间', prop: 'createAt', required: false, defaultHidden: true }
]


const columnSettings = ref([])
const draggingIndex = ref(null)


const isColumnVisible = (item) => {
  const key = typeof item === 'string' ? item : item.key
  const setting = columnSettings.value.find(s => s.key === key)
  if (!setting) return true // 默认可见
  return setting.visible !== false
}


const toggleColumn = (columnKey) => {
  const setting = columnSettings.value.find(s => s.key === columnKey)
  const col = allColumnsConfig.find(c => c.key === columnKey)

  if (!col || col.required) return

  if (setting) {
    setting.visible = !setting.visible
  } else {
    columnSettings.value.push({ key: columnKey, visible: true })
  }
  saveColumnSettings()
}


const handleDragStart = (index, event) => {
  draggingIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}


const handleDragOver = (index) => {

}


const handleDragEnd = () => {
  draggingIndex.value = null
}


const handleDrop = (targetIndex) => {
  const fromIndex = draggingIndex.value
  if (fromIndex === null || fromIndex === targetIndex) return

  const settings = [...columnSettings.value]
  const item = settings.splice(fromIndex, 1)[0]
  settings.splice(targetIndex, 0, item)
  columnSettings.value = settings
  saveColumnSettings()
  draggingIndex.value = null
}


const saveColumnSettings = () => {
  const settings = orderedColumns.value.map(col => ({
    key: col.key,
    visible: col.visible !== false
  }))
  columnSettings.value = settings
  localStorage.setItem(COLUMN_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}


const loadColumnSettings = () => {
  const saved = localStorage.getItem(COLUMN_SETTINGS_STORAGE_KEY)

  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      const currentKeys = new Set(allColumnsConfig.map(col => col.key))
      const visibilityMap = new Map(parsed.map(item => [item.key, item.visible]))

      const settings = []
      const processedKeys = new Set()

      for (const item of parsed) {
        if (currentKeys.has(item.key)) {
          settings.push({
            key: item.key,
            visible: visibilityMap.get(item.key) !== false
          })
          processedKeys.add(item.key)
        }
      }

      for (const col of allColumnsConfig) {
        if (!processedKeys.has(col.key)) {
          settings.push({
            key: col.key,
            visible: !col.defaultHidden
          })
        }
      }

      columnSettings.value = settings
    } catch {
      columnSettings.value = allColumnsConfig.map(col => ({
        key: col.key,
        visible: !col.defaultHidden
      }))
    }
  } else {
    columnSettings.value = allColumnsConfig.map(col => ({
      key: col.key,
      visible: !col.defaultHidden
    }))
  }
}


const resetColumns = () => {
  localStorage.removeItem(COLUMN_SETTINGS_STORAGE_KEY)
  columnSettings.value = []
  loadColumnSettings()
}


const orderedColumns = computed(() => {
  const saved = columnSettings.value
  const all = allColumnsConfig

  if (!saved.length) return all

  const ordered = []
  const remaining = [...all]

  for (const item of saved) {
    const index = remaining.findIndex(c => c.key === item.key)
    if (index !== -1) {
      const col = remaining.splice(index, 1)[0]
      ordered.push({ ...col, visible: item.visible })
    }
  }

  ordered.push(...remaining)
  return ordered
})


const displayColumnKeys = computed(() => {
  const saved = columnSettings.value
  if (!saved.length) return allColumnsConfig.map(c => c.key)

  return saved
    .filter(item => item.visible !== false)
    .map(item => item.key)
})


const shouldShowColumn = (columnKey) => {
  return displayColumnKeys.value.includes(columnKey)
}


const tableColumns = computed(() => {
  const saved = columnSettings.value
  if (!saved.length) {

    return allColumnsConfig
  }

  const ordered = []
  const remaining = [...allColumnsConfig]


  for (const item of saved) {
    const index = remaining.findIndex(c => c.key === item.key)
    if (index !== -1) {
      const col = remaining.splice(index, 1)[0]

      if (item.visible !== false) {
        ordered.push(col)
      }
    }
  }


  for (const col of remaining) {
    if (!col.defaultHidden) {
      ordered.push(col)
    }
  }

  return ordered
})


const columnConfigMap = {
  nas_filename: {
    label: 'nas文件名',
    minWidth: 150,
    align: 'center'
  },
  landingname: {
    label: 'Landers',
    minWidth: 140,
    align: 'center'
  },
  landing_url: {
    label: '网页链接',
    minWidth: 200,
    align: 'center'
  },
  preview_url: {
    label: '预览图',
    width: 180,
    align: 'center'
  },
  effect: {
    label: '效果',
    minWidth: 120,
    align: 'center'
  },
  remark: {
    label: '备注',
    minWidth: 150,
    align: 'center'
  },
  task_folder: {
    label: '下载页面',
    width: 140,
    align: 'center'
  },
  visibility: {
    label: '可见性',
    width: 100,
    align: 'center'
  },
  creator: {
    label: '创建者',
    width: 120,
    align: 'center'
  },
  category: {
    label: '分类',
    minWidth: 120,
    align: 'center'
  },
  createAt: {
    label: '创建时间',
    width: 180,
    align: 'center'
  }
}


const handleColumnSetting = () => {

}



const categories = ref([])
const activeCategoryId = ref('')
const isEditing = ref(false)
const searchExpanded = ref(false)


const FOLDED_CATEGORIES_KEY = 'landingpage_folded_categories'
const foldedCategoryIds = ref([])
const foldedDialogVisible = ref(false)


const visibleCategories = computed(() => {
  return categories.value.filter(cat => !foldedCategoryIds.value.includes(cat.id))
})


let sortableInstance = null
const tabsRef = ref(null)
const categoryTabsRef = ref(null)


const loginStore = useLoginStore()
const currentUserId = ref(loginStore.userInfo?.id || null)


const inputRef = ref(null)
const editingCell = ref({
  id: null,
  field: null,
  value: '',
  initialValue: ''
})


const getCategories = async () => {
  try {
    const res = await getCategoriesList()
    if (res.code === 0) {
      categories.value = res.data || []
    }
  } catch (error) {
    console.error('获取分类列表失败:', error)
  }
}


const handleCategoryChange = () => {
  pagination.page = 1
  getList()
}


const handleTabMoreAction = (command) => {
  if (command === 'createPrivateCategory') {
    handleCreateCategory('private')
  } else if (command === 'createPublicCategory') {
    handleCreateCategory('public')
  } else if (command === 'toggleEdit') {
    toggleEditMode()
  }
}


const toggleEditMode = () => {
  isEditing.value = !isEditing.value
  if (isEditing.value) {

    ElMessage.info('可通过拖动分类标签调整顺序')

    nextTick(() => {
      initSortable()
    })

    setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 100)
  } else {

    destroySortable()
    saveCategorySort()

    document.removeEventListener('click', handleClickOutside)
  }
}


const handleClickOutside = (event) => {
  if (!isEditing.value) return

  const categoryTabsEl = categoryTabsRef.value
  if (!categoryTabsEl) return


  if (!categoryTabsEl.contains(event.target)) {

    toggleEditMode()
  }
}


const initSortable = () => {
  destroySortable()


  const tabsEl = tabsRef.value?.$el
  if (!tabsEl) return


  const tabItems = tabsEl.querySelectorAll('.el-tabs__item')
  if (tabItems.length <= 1) return


  const sortableContainer = document.createElement('div')
  sortableContainer.className = 'sortable-tabs-container'


  for (let i = 1; i < tabItems.length; i++) {
    sortableContainer.appendChild(tabItems[i])
  }


  const tabsNav = tabsEl.querySelector('.el-tabs__nav')
  if (!tabsNav) {

    for (let i = 1; i < tabItems.length; i++) {
      tabsNav?.appendChild(tabItems[i])
    }
    return
  }

  tabsNav.appendChild(sortableContainer)

  sortableInstance = Sortable.create(sortableContainer, {
    animation: 150,
    handle: '.tab-label.draggable',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onEnd: (evt) => {
      const { oldIndex, newIndex } = evt

      if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {

        const currentActiveId = activeCategoryId.value


        const newCategories = [...categories.value]
        const [removed] = newCategories.splice(oldIndex, 1)
        newCategories.splice(newIndex, 0, removed)

        categories.value = newCategories


        activeCategoryId.value = currentActiveId
      }
    }
  })
}


const destroySortable = () => {
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }


  const tabsEl = tabsRef.value?.$el
  if (!tabsEl) return

  const sortableContainer = tabsEl.querySelector('.sortable-tabs-container')
  if (sortableContainer) {
    const tabsNav = tabsEl.querySelector('.el-tabs__nav')
    if (tabsNav) {

      while (sortableContainer.firstChild) {
        tabsNav.appendChild(sortableContainer.firstChild)
      }
    }

    sortableContainer.remove()
  }
}


const saveCategorySort = async () => {
  const categoryUpdates = categories.value.map((cat, index) => ({
    id: cat.id,
    sort: index + 1
  }))

  try {
    const res = await updateCategorySort(categoryUpdates)
    if (res.code === 0) {
      ElMessage.success('排序已保存')
      getCategories()
    } else {
      ElMessage.error(res.message || '保存排序失败')
    }
  } catch (error) {
    ElMessage.error('保存排序失败')
  }
}


const handleCreateCategory = (visibility = 'private') => {
  categoryIsPublic.value = visibility === 'public'
  categoryDialogVisible.value = true
}


const handleCategoryConfirm = (categoryName) => {
  const visibility = categoryIsPublic.value ? 'public' : 'private'
  createCategory({ category_name: categoryName, level: 1, visibility }).then(res => {
    if (res.code === 0) {
      ElMessage.success('分类创建成功')
      getCategories()
    } else {
      ElMessage.error(res.message || '创建分类失败')
    }
  })
}


const canDeleteCategory = (category) => {
  return category.user_id === currentUserId.value
}


const loadFoldedCategories = () => {
  const saved = localStorage.getItem(FOLDED_CATEGORIES_KEY)
  if (saved) {
    try {
      foldedCategoryIds.value = JSON.parse(saved)
    } catch {
      foldedCategoryIds.value = []
    }
  }
}


const saveFoldedCategories = () => {
  localStorage.setItem(FOLDED_CATEGORIES_KEY, JSON.stringify(foldedCategoryIds.value))
}


const handleFoldCategory = (category) => {
  if (!foldedCategoryIds.value.includes(category.id)) {
    foldedCategoryIds.value.push(category.id)
    saveFoldedCategories()

    if (activeCategoryId.value === String(category.id)) {
      activeCategoryId.value = ''
    }
  }
}


const handleUnfoldCategory = (categoryId) => {
  const index = foldedCategoryIds.value.indexOf(categoryId)
  if (index > -1) {
    foldedCategoryIds.value.splice(index, 1)
    saveFoldedCategories()
  }
}


const unfoldAllCategories = () => {
  foldedCategoryIds.value = []
  saveFoldedCategories()
  foldedDialogVisible.value = false
}


const openFoldedDialog = () => {
  foldedDialogVisible.value = true
}


const getCategoryName = (categoryId) => {
  const category = categories.value.find(c => c.id === categoryId)
  return category ? category.category_name : '未知分类'
}


const handleDeleteCategory = (category) => {
  ElMessageBox.confirm(
    `确定要删除分类"${category.category_name}"吗？如果该分类下有落地页，将无法删除。`,
    '删除分类',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    const res = await deleteCategory(category.id)
    if (res.code === 0) {
      ElMessage.success('删除分类成功')

      if (activeCategoryId.value === String(category.id)) {
        activeCategoryId.value = ''
      }
      isEditing.value = false
      getCategories()
      getList()
    } else {
      ElMessage.error(res.message || '删除分类失败')
    }
  }).catch(() => {

  })
}


const searchForm = reactive({
  landingname: ''
})


const tableData = ref([])
const loading = ref(false)


const pagination = reactive({
  page: 1,
  size: 10,
  total: 0
})


const crawlerDialogVisible = ref(false)
const currentRow = ref(null)


const simpleDialogVisible = ref(false)
const simpleDialogRow = ref(null)


const landingPageDialogVisible = ref(false)
const currentEditRow = ref(null)


const categoryDialogVisible = ref(false)
const categoryIsPublic = ref(false)


const contextMenuVisible = ref(false)
const contextMenuPosition = reactive({ x: 0, y: 0 })
const contextMenuRow = ref(null)


const handleRowContextMenu = (row, column, event) => {
  event.preventDefault()
  contextMenuRow.value = row


  const menuWidth = 120
  const menuHeight = 80


  let x = event.clientX
  let y = event.clientY


  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - 8
  }


  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - 8
  }

  contextMenuPosition.x = x
  contextMenuPosition.y = y
  contextMenuVisible.value = true
}


const closeContextMenu = () => {
  contextMenuVisible.value = false
  contextMenuRow.value = null
}


watch(contextMenuVisible, (val) => {
  if (val) {
    document.addEventListener('click', closeContextMenu)
    document.addEventListener('keydown', handleEscKey)
  } else {
    document.removeEventListener('click', closeContextMenu)
    document.removeEventListener('keydown', handleEscKey)
  }
})


const handleEscKey = (e) => {
  if (e.key === 'Escape') {
    closeContextMenu()
  }
}


const handleContextMenuEdit = () => {
  if (contextMenuRow.value) {
    handleEdit(contextMenuRow.value)
  }
  closeContextMenu()
}


const handleContextMenuDelete = () => {
  if (contextMenuRow.value) {
    handleDelete(contextMenuRow.value)
  }
  closeContextMenu()
}


const getList = async () => {
  loading.value = true
  try {
    const res = await getLandingPageList({
      landingname: searchForm.landingname || undefined,
      category_id: activeCategoryId.value || undefined,
      offset: (pagination.page - 1) * pagination.size,
      size: pagination.size
    })
    if (res.code === 0) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    } else {
      tableData.value = []
      pagination.total = 0
    }
  } catch (error) {
    ElMessage.error('获取列表失败')
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}


const handleSearch = () => {
  pagination.page = 1
  getList()
}


const handleReset = () => {
  searchForm.landingname = ''
  pagination.page = 1
  getList()
}


const handleCreate = () => {
  currentEditRow.value = null
  landingPageDialogVisible.value = true
}


const handleEdit = (row) => {

  if (row.visibility === 'private' && row.user_id !== currentUserId.value) {
    ElMessage.warning('私有落地页只能由创建者编辑')
    return
  }
  currentEditRow.value = row
  landingPageDialogVisible.value = true
}


const handleDialogSuccess = (result, action) => {

  if (action === 'create' && result?.insertId) {
    screenshotLoadingMap.value.set(result.insertId, true)
  }

  getList()
}


const handleDelete = async (row) => {

  if (row.visibility === 'public' && row.user_id !== currentUserId.value) {
    ElMessage.warning('公共落地页只能由创建者删除')
    return
  }

  const deleteOptions = {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }
  try {
    await ElMessageBox.confirm('确定要删除该落地页吗？', '确认删除', deleteOptions)
    const res = await deleteLandingPage(row.id)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      getList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}


const handleOpenCrawler = () => {
  currentRow.value = null
  crawlerDialogVisible.value = true
}


const handleCrawler = (row) => {
  simpleDialogRow.value = row
  simpleDialogVisible.value = true
}


const handleSimpleDialogSuccess = () => {

  setTimeout(() => {
    getList()
  }, 500)
}


const handleReCrawl = (row) => {
  ElMessageBox.confirm(
    '重新爬取将覆盖当前的爬取结果，是否继续？',
    '重新爬取确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {

    handleCrawler(row)
  }).catch(() => {

  })
}


const handleCrawlerSuccess = () => {

}


const handlePreview = (row) => {
  if (row.task_folder) {
    const previewUrl = `${BASE_URL}/crawler/preview/${row.task_folder}/index.html`
    window.open(previewUrl, '_blank')
  } else {
    ElMessage.warning('暂无预览地址，请先完成爬虫任务')
  }
}


const handleDownloadCommand = (command, row) => {
  if (command === 'preview') {

    if (row.task_folder) {
      const previewUrl = `${BASE_URL}/crawler/preview/${row.task_folder}/index.html`
      window.open(previewUrl, '_blank')
    } else {
      ElMessage.warning('暂无预览地址')
    }
  } else if (command === 'download') {

    if (row.task_folder) {
      const token = localCache.getCache(LOGIN_TOKEN)
      const downloadUrl = `${BASE_URL}/crawler/download/${row.task_folder}${token ? `?token=${token}` : ''}`

      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${row.task_folder}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      ElMessage.success('开始下载...')
    } else {
      ElMessage.warning('暂无下载地址')
    }
  }
}



const handleDownloadPage = (row) => {
  if (row.task_folder) {
    const token = localCache.getCache(LOGIN_TOKEN)
    const downloadUrl = `${BASE_URL}/crawler/download/${row.task_folder}${token ? `?token=${token}` : ''}`

    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${row.task_folder}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    ElMessage.success('开始下载...')
  } else {
    ElMessage.warning('暂无下载地址，请先完成爬虫任务')
  }
}


const handleUploadPreview = (row) => {
  currentUploadLandingId.value = row.id
  fileInputRef.value?.click()
}


const handleFileChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file || !currentUploadLandingId.value) return


  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (!validTypes.includes(file.type)) {
    ElMessage.error('请上传 PNG、JPG 或 WEBP 格式的图片')
    return
  }


  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('图片大小不能超过 5MB')
    return
  }


  uploadingPreviewMap.value.add(currentUploadLandingId.value)

  try {
    const res = await uploadLandingPreview(currentUploadLandingId.value, file)
    if (res.code === 0) {
      ElMessage.success('上传预览图成功')

      const item = tableData.value.find(row => row.id === currentUploadLandingId.value)
      if (item) {
        item.preview_url = res.data.previewUrl
      }
    } else {
      ElMessage.error(res.message || '上传预览图失败')
    }
  } catch (error) {
    ElMessage.error('上传预览图失败')
  } finally {

    uploadingPreviewMap.value.delete(currentUploadLandingId.value)

    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
    currentUploadLandingId.value = null
  }
}


const handleSizeChange = (val) => {
  pagination.size = val
  getList()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  getList()
}


const startEdit = (id, field, value) => {
  editingCell.value = {
    id,
    field,
    value,
    initialValue: value
  }

  nextTick(() => {
    inputRef.value?.focus()
  })
}


const saveEdit = async () => {
  const { id, field, value, initialValue } = editingCell.value

  if (value !== initialValue) {

    if (field === 'landing_url' && value) {
      if (!/^https?:\/\//.test(value)) {
        ElMessage.warning('请输入有效的URL（以 http:// 或 https:// 开头）')
        return
      }
    }

    try {
      await updateLandingPage(id, { [field]: value })
      ElMessage.success('修改成功')

      const item = tableData.value.find(row => row.id === id)
      if (item) {
        item[field] = value
      }
    } catch (error) {
      ElMessage.error(error.message || '修改失败')

      const item = tableData.value.find(row => row.id === id)
      if (item) {
        item[field] = initialValue
      }
    }
  }

  editingCell.value = { id: null, field: null, value: '', initialValue: '' }
}


const cancelEdit = () => {
  const { initialValue } = editingCell.value
  const item = tableData.value.find(row => row.id === editingCell.value.id)
  if (item) {
    item[editingCell.value.field] = initialValue
  }
  editingCell.value = { id: null, field: null, value: '', initialValue: '' }
}


const isCellEditing = (id, field) => {
  return editingCell.value.id === id && editingCell.value.field === field
}


onMounted(() => {
  loadColumnSettings() // 加载列设置
  getCategories()
  loadFoldedCategories()
  getList()


  initWebSocket()


  onScreenshotReady((data) => {
    const { landingPageId, previewUrl } = data


    screenshotLoadingMap.value.delete(landingPageId)


    const item = tableData.value.find(row => row.id === landingPageId)
    if (item) {

      if (previewUrl && previewUrl.startsWith('/')) {
        item.preview_url = `${BASE_URL}${previewUrl}`
      } else {
        item.preview_url = previewUrl
      }
    }

    ElMessage.success('预览图生成成功')
  })
})


onBeforeUnmount(() => {
  destroySortable()
  document.removeEventListener('click', handleClickOutside)


})
</script>

<style lang="less" scoped>
.landingpage-container {



  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
  transition: all 0.3s ease;


  &.fullscreen-mode {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    padding: 0;
    z-index: 100;
    background: #fff;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .search-bar {
      display: none;
    }

    .table-container {
      border-radius: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      :deep(.el-table) {
        flex: 1;

        .el-table__body-wrapper {
          max-height: none !important;
          height: 100%;
        }
      }

      .pagination-wrapper {
        flex-shrink: 0;
        padding: 12px;
        border-top: 1px solid #e8eaed;
      }
    }
  }


  .fullscreen-tabs {
    flex-shrink: 0;
    margin-bottom: 0;
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-top: none;
    padding: 4px 12px 0 12px;

    .tabs-right-actions {
      gap: 8px;

      .fullscreen-create-btn {
        height: 28px;
        padding: 0 12px;
        font-size: 12px;
        background: #1a73e8;
        border-color: #1a73e8;

        &:hover {
          background: #1557b0;
          border-color: #1557b0;
        }
      }

      .fullscreen-exit-btn {
        height: 28px;
        padding: 0 12px;
        font-size: 12px;
        border: 1px solid #dadce0;
        background: #fff;
        color: #5f6368;

        &:hover {
          background: #f1f3f4;
          color: #202124;
        }
      }
    }
  }




  .category-tabs {
    background: #fff;
    border-radius: 8px;
    margin-bottom: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    padding: 4px 12px 0 12px;

    .tabs-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .tabs-right-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .search-toggle-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        color: #5f6368;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.2s;

        .el-icon {
          font-size: 18px;
        }

        &:hover {
          background: #f1f3f4;
          color: #1a73e8;
        }

        &.active {
          background: #e8f0fe;
          color: #1a73e8;
        }
      }

      :deep(.el-tabs) {
        flex: 1;
        overflow: hidden;
        min-width: 0;

        .el-tabs__header {
          margin: 0;
        }

        .el-tabs__nav-wrap {
          &::after {
            display: none;
          }
        }

        .el-tabs__active-bar {
          background-color: #1a73e8;
          height: 3px;
          border-radius: 2px 2px 0 0;
        }

        .el-tabs__item {
          color: #5f6368;
          font-size: 14px;
          font-weight: 500;
          padding: 0 12px;
          height: 40px;
          line-height: 40px;

          &:hover {
            color: #1a73e8;
          }

          &.is-active {
            color: #1a73e8;
          }

          .tab-label {
            display: inline-flex;
            align-items: center;
            gap: 4px;

            .tab-text {
              display: inline-block;
            }

            .tab-delete-icon {
              font-size: 14px;
              color: #c5221f;
              cursor: pointer;
              padding: 2px;
              border-radius: 4px;
              transition: all 0.2s;

              &:hover {
                background: #fce8e6;
              }
            }

            .tab-fold-icon {
              font-size: 14px;
              color: #5f6368;
              cursor: pointer;
              padding: 2px;
              border-radius: 4px;
              transition: all 0.2s;

              &:hover {
                background: #e8f0fe;
                color: #1a73e8;
              }
            }


            &.draggable {
              cursor: move;
              user-select: none;

              .tab-text {
                cursor: grab;
                user-select: none;

                &:active {
                  cursor: grabbing;
                }
              }
            }


            .visibility-icon {
              margin-left: 4px;
              font-size: 12px;
              color: #5f6368;
              opacity: 0.7;
            }
          }
        }
      }
    }


    :deep(.sortable-ghost) {
      opacity: 0.4;
      background: #e8f0fe;
    }

    :deep(.sortable-chosen) {
      background: #e8f0fe;
    }

    :deep(.sortable-drag) {
      opacity: 0.8;
      background: #e8f0fe;
    }


    :deep(.sortable-tabs-container) {
      display: inline-flex;
      align-items: center;
    }

    .tabs-more-dropdown {
      .tabs-more-icon {
        font-size: 18px;
        color: #5f6368;
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        transition: all 0.2s;

        &:hover {
          color: #1a73e8;
          background: #e8f0fe;
        }
      }

      :deep(.el-dropdown-menu__item) {
        .el-icon {
          margin-right: 8px;
          font-size: 14px;
        }
      }
    }
  }


  .search-expand-enter-active,
  .search-expand-leave-active {
    transition: all 0.3s ease;
    overflow: hidden;
  }

  .search-expand-enter-from,
  .search-expand-leave-to {
    max-height: 0;
    opacity: 0;
    margin-bottom: 0;
  }

  .search-expand-enter-to,
  .search-expand-leave-from {
    max-height: 120px;
    opacity: 1;
    margin-bottom: 8px;
  }


  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0;
    margin-bottom: 10px;
    flex-wrap: wrap;
    gap: 10px;

    .header-left {
      flex: 1;
      min-width: 200px;
      display: flex;
      align-items: center;

      h1 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: #202124;
      }

      .page-subtitle {
        display: none;
      }
    }

    .header-actions {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }

    .fullscreen-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: 1px solid #dadce0;
      background: #fff;
      color: #5f6368;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;

      .el-icon {
        font-size: 16px;
      }

      &:hover {
        background: #f1f3f4;
        color: #1a73e8;
        border-color: #1a73e8;
      }
    }
  }


  .search-bar {
    padding: 10px 12px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

    .search-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;

      .search-inputs {
        display: flex;
        gap: 16px;
        flex: 1;
        flex-wrap: wrap;

        .search-item {
          display: flex;
          align-items: center;
          gap: 8px;

          label {
            font-size: 13px;
            color: #5f6368;
            white-space: nowrap;
          }

          .search-input {
            width: 180px;

            :deep(.el-input__wrapper) {
              border-radius: 4px;
              border: 1px solid #dadce0;
              box-shadow: none;

              &:hover {
                border-color: #1a73e8;
              }

              &.is-focused {
                border-color: #1a73e8;
                box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
              }
            }
          }

          .search-select {
            width: 100px;

            :deep(.el-input__wrapper) {
              border-radius: 4px;
              border: 1px solid #dadce0;
              box-shadow: none;

              &:hover {
                border-color: #1a73e8;
              }

              &.is-focused {
                border-color: #1a73e8;
                box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
              }
            }
          }
        }
      }

      .search-actions {
        display: flex;
        gap: 6px;
        flex-shrink: 0;

        .el-button {
          height: 28px;
          padding: 0 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
      }
    }
  }


  .table-container {
    padding: 0;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    overflow: hidden;


    display: flex;
    flex-direction: column;

    .pagination-wrapper {
      display: flex;
      justify-content: flex-end;
      margin: 12px 12px 12px 0;
      flex-shrink: 0;
    }

    :deep(.el-table) {
      border: none;
      margin-bottom: 0;
      flex: 1;
      display: flex;
      flex-direction: column;

      .el-table__inner-wrapper {
        display: flex;
        flex-direction: column;
        flex: 1;
      }

      .el-table__body-wrapper {
        overflow-x: auto !important;
        overflow-y: auto !important;
        flex: 1;
      }


      .el-table__header,
      .el-table__body {
        width: 100% !important;
        table-layout: fixed;
      }

      &.google-table {
        thead {
          th {
            background: #f8f9fa;
            color: #3c4043;
            font-weight: 500;
            font-size: 13px;
            border-bottom: 1px solid #e8eaed;
            padding: 0 14px;
            height: 40px;
          }
        }

        tbody {

          --row-height: 230px;

          tr {
            &:hover {
              background: #f8f9fa !important;
            }

            td {
              border-bottom: 1px solid #e8eaed;
              color: #202124;
              font-size: 13px;
              padding: 0 14px;
              height: var(--row-height);


              &:nth-child(4) {
                padding: 0 8px;
              }
            }


            &:last-child td {
              border-bottom: 1px solid #e8eaed !important;
            }
          }
        }

        .el-button--link {
          border: none;
          padding: 4px 8px;
          font-size: 13px;
          font-weight: 500;

          .el-icon {
            margin-right: 4px;
          }
        }


        .editable-cell {
          cursor: text;
          width: 100%;

          border-radius: 4px;
          transition: background 0.2s;
          position: relative;

          &:hover {
            background: #e8f0fe;
          }

          .editable-text {
            display: block;
          }


          .url-link {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 8;
            overflow: hidden;
            text-overflow: ellipsis;
            word-break: break-all;
            max-width: calc(100% - 24px);
            padding-right: 24px;
          }
        }


        .editing-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 4px;

          .edit-input {
            width: 100%;

            :deep(.el-textarea__inner) {
              border: 1px solid #dadce0;
              border-radius: 4px;
              padding: 10px 12px;
              font-size: 13px;
              line-height: 1.5;
              font-family: 'Google Sans', Roboto, Arial, sans-serif;
              background: #fff;
              transition: all 0.2s;
              box-shadow: none;

              &:hover {
                border-color: #1a73e8;
              }

              &:focus {
                border-color: #1a73e8;
                box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
                outline: none;
              }
            }
          }
        }

        .url-link {
          color: #1a73e8;
          text-decoration: none;
          font-size: 13px;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 8;
          overflow: hidden;
          text-overflow: ellipsis;
          word-break: break-all;

          &:hover {
            text-decoration: none;
          }
        }

        .external-link-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 18px;
          height: 18px;
          color: #5f6368;
          text-decoration: none;
          border-radius: 4px;
          transition: all 0.2s;
          z-index: 1;

          .external-icon {
            width: 14px;
            height: 14px;
            fill: currentColor;
          }

          &:hover {
            color: #1a73e8;
            background: #e8f0fe;
          }
        }

        .category-name {
          color: #202124;
          font-size: 13px;
          font-weight: 500;
        }

        .creator-cell {
          display: flex;
          align-items: center;
          gap: 8px;

          .creator-name {
            color: #202124;
            font-size: 13px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          :deep(.el-avatar) {
            flex-shrink: 0;
          }
        }

        .no-category {
          color: #9aa0a6;
          font-size: 13px;
          font-style: italic;
        }

        .nas-filename {
          color: #202124;
          font-size: 13px;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          overflow: hidden;
          text-overflow: ellipsis;
          word-break: break-all;
        }

        .effect-text {
          color: #202124;
          font-size: 13px;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          overflow: hidden;
          text-overflow: ellipsis;
          word-break: break-word;
        }

        .remark-text {
          color: #202124;
          font-size: 13px;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 7;
          overflow: hidden;
          text-overflow: ellipsis;
          word-break: break-word;
        }

        .no-url {
          color: #9aa0a6;
          font-size: 13px;
        }

        .preview-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #1a73e8;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;

          .el-icon {
            font-size: 14px;
          }

          &:hover {
            text-decoration: underline;
          }
        }

        .download-trigger {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #1a73e8;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;

          .el-icon {
            font-size: 14px;
          }

          &:hover {
            text-decoration: underline;
          }
        }


        .download-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;

          .google-icon-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border: none;
            background: transparent;
            color: #5f6368;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
            flex-shrink: 0;

            .btn-icon {
              width: 18px;
              height: 18px;
              fill: currentColor;
            }

            &:hover {
              background: #f1f3f4;
              color: #1a73e8;
            }

            &:active {
              background: #e8eaed;
            }
          }
        }


        .google-outline-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border: 1px solid #dadce0;
          background: #fff;
          color: #5f6368;
          font-size: 13px;
          font-weight: 500;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;

          .btn-icon {
            width: 16px;
            height: 16px;
            fill: currentColor;
          }

          &:hover {
            background: #f8f9fa;
            border-color: #dadce0;
            color: #202124;
          }

          &:active {
            background: #f1f3f4;
          }
        }

        .no-preview {
          color: #9aa0a6;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;

          .el-icon {
            font-size: 14px;
            color: #9aa0a6;
          }

          &:hover {
            color: #1a73e8;

            .el-icon {
              color: #1a73e8;
            }
          }
        }


        .preview-image-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          height: 100%;
          padding: 0;

          .preview-image {
            width: 100%;
            height: 100%;

            max-height: calc(var(--row-height) - 10px);
            border-radius: 4px;
            cursor: pointer;
            border: 1px solid #e8eaed;
            transition: all 0.2s;
            box-sizing: border-box;
            overflow: hidden;


            :deep(.el-image__inner) {
              width: 100% !important;
              height: 100% !important;
              object-fit: contain;
              object-position: center;
            }
          }

          .preview-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            color: #1a73e8;
            font-size: 12px;
            width: 100%;

            height: calc(var(--row-height) - 10px);
            max-height: calc(var(--row-height) - 10px);
            background: #f8f9fa;
            border-radius: 4px;
            border: 1px solid #e8eaed;
            box-sizing: border-box;

            .el-icon {
              font-size: 20px;
            }
          }

          .no-preview {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            color: #9aa0a6;
            font-size: 12px;
            width: 100%;

            height: calc(var(--row-height) - 10px);
            max-height: calc(var(--row-height) - 10px);
            background: #f8f9fa;
            border-radius: 4px;
            border: 1px solid #e8eaed;
            box-sizing: border-box;

            .el-icon {
              font-size: 20px;
            }
          }

          .no-preview-image-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            color: #9aa0a6;
            font-size: 12px;
            width: 100%;

            height: calc(var(--row-height) - 10px);
            max-height: calc(var(--row-height) - 10px);
            background: #f8f9fa;
            border-radius: 4px;
            border: 1px solid #e8eaed;
            box-sizing: border-box;

            .el-icon {
              font-size: 20px;
            }

            &:hover {
              color: #1a73e8;

              .el-icon {
                color: #1a73e8;
              }
            }
          }


          .upload-preview-btn {
            position: absolute;
            top: 0;
            right: 0;
            width: 28px;
            height: 28px;
            border: none;
            background: rgba(0, 0, 0, 0.6);
            color: #fff;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s;

            .el-icon {
              font-size: 14px;
            }

            &:hover {
              background: rgba(26, 115, 232, 0.9);
            }
          }

          &:hover .upload-preview-btn {
            opacity: 1;
          }
        }

        .el-tag {
          border-radius: 4px;
        }
      }


      &::before {
        display: none;
      }
    }
  }
}


.landingpage-container {
  :deep(.crawler-btn) {
    height: 28px;
    padding: 0 10px;
    border: 1px solid #dadce0;
    background: #fff;
    color: #3c4043;
    border-radius: 4px;
    font-size: 12px;

    &:hover {
      background: #f1f3f4;
    }
  }

  :deep(.el-button.el-button--primary) {
    height: 28px;
    padding: 0 10px;
    background: #1a73e8;
    border-color: #1a73e8;
    color: #fff;
    border-radius: 4px;
    font-size: 12px;

    &:hover {
      background: #1557b0;
      border-color: #1557b0;
    }
  }
}


:deep(.google-pagination) {
  .el-pagination__total {
    color: #5f6368;
    font-size: 13px;
  }

  .el-pagination__sizes {
    .el-select {
      .el-input__wrapper {
        border-radius: 4px;
        border: 1px solid #dadce0;

        &:hover {
          border-color: #1a73e8;
        }
      }
    }
  }

  .btn-prev,
  .btn-next {
    border-radius: 4px;
    border: 1px solid #dadce0;
    color: #5f6368;
    background: #fff;

    &:hover:not:disabled {
      background-color: #f1f3f4;
      color: #1a73e8;
    }

    &:disabled {
      opacity: 0.4;
    }
  }

  .el-pager li {
    border-radius: 4px;
    margin: 0 2px;
    color: #5f6368;
    font-weight: 500;
    min-width: 32px;
    height: 32px;
    line-height: 32px;

    &:hover {
      background-color: #f1f3f4;
    }

    &.is-active {
      background-color: #1a73e8;
      color: #fff;
    }
  }
}


@media (max-width: 768px) {
  .landingpage-container {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch !important;

    .header-actions {
      justify-content: stretch;

      .el-button {
        flex: 1;
      }
    }
  }

  .search-bar .search-row {
    flex-direction: column;
    align-items: stretch;

    .search-inputs {
      width: 100%;

      .search-item {
        flex: 1;
        min-width: 120px;

        .search-input,
        .search-select {
          width: 100%;
        }
      }
    }

    .search-actions {
      width: 100%;
      justify-content: stretch;

      .el-button {
        flex: 1;
      }
    }
  }

  .table-container {
    :deep(.el-table) {
      thead th,
      tbody td {
        padding: 0 12px;
        height: 120px;
      }
      

      .cell {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}



:deep(.el-image-viewer__wrapper) {
  .el-image-viewer__canvas {
    img {
      max-width: 80vw;
      max-height: 80vh;
      width: auto;
      height: auto;
    }
  }
}


.context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 120px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.1);
  padding: 4px 0;
  user-select: none;

  .context-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 14px;
    color: #202124;
    cursor: pointer;
    transition: background 0.2s;

    .el-icon {
      font-size: 16px;
      color: #5f6368;
    }

    &:hover {
      background: #f1f3f4;
    }

    &.danger {
      &:hover {
        background: #fce8e6;
        color: #c5221f;

        .el-icon {
          color: #c5221f;
        }
      }
    }
  }
}


.contextmenu-fade-enter-active,
.contextmenu-fade-leave-active {
  transition: opacity 0.15s ease;
}

.contextmenu-fade-enter-from,
.contextmenu-fade-leave-to {
  opacity: 0;
}


.folded-dialog {
  :deep(.el-dialog__header) {
    padding: 20px 24px 16px;
    border-bottom: 1px solid #e8eaed;
    margin: 0;

    .el-dialog__title {
      font-size: 18px;
      font-weight: 500;
      color: #202124;
    }
  }

  :deep(.el-dialog__body) {
    padding: 20px 24px;
  }

  :deep(.el-dialog__footer) {
    padding: 16px 24px;
    border-top: 1px solid #e8eaed;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  :deep(.el-button) {
    height: 36px;
    padding: 0 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;

    &:not(.el-button--primary) {
      background: #fff;
      border: 1px solid #dadce0;
      color: #5f6368;

      &:hover {
        background: #f1f3f4;
        border-color: #dadce0;
      }
    }

    &.el-button--primary {
      background: #1a73e8;
      border-color: #1a73e8;
      color: #fff;

      &:hover {
        background: #1557b0;
        border-color: #1557b0;
      }
    }
  }

  .folded-categories-list {
    max-height: 400px;
    overflow-y: auto;

    .folded-category-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 8px;
      background: #f8f9fa;
      transition: all 0.2s;
      border: 1px solid transparent;

      &:hover {
        background: #e8f0fe;
        border-color: #dadce0;
      }

      .folded-category-name {
        flex: 1;
        font-size: 14px;
        color: #202124;
      }

      .unfold-icon {
        font-size: 18px;
        color: #5f6368;
        cursor: pointer;
        padding: 6px;
        border-radius: 50%;
        transition: all 0.2s;

        &:hover {
          background: #1a73e8;
          color: #fff;
        }
      }
    }

    .no-folded {
      text-align: center;
      padding: 40px 20px;
      color: #9aa0a6;
      font-size: 14px;
    }
  }

  .folded-count {
    color: #1a73e8;
    font-weight: 500;
  }

  .folded-label {
    cursor: pointer;
  }
}


.folded-tab-pane {
  .folded-label {
    cursor: pointer;
  }
}
</style>

<style lang="less">

.el-image-viewer__wrapper {
  .el-image-viewer__canvas {
    img {
      max-width: 65vw !important;
      max-height: 75vh !important;
    }
  }
}


.landingpage-container.fullscreen-mode ~ .el-overlay,
body > .el-overlay {
  z-index: 2000 !important;
}








.column-setting-menu {
  min-width: 220px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid #e8eaed;

  .column-setting-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #e8eaed;
    font-size: 14px;
    font-weight: 500;
    color: #303133;
  }

  .el-scrollbar__view {
    padding: 4px 0;
  }

  .column-item {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    cursor: move;
    user-select: none;

    &:hover {
      background-color: #f1f3f4;
    }

    &.column-hidden {
      opacity: 0.6;
    }

    &.column-required {
      background-color: #fafafa;
    }

    &.dragging {
      opacity: 0.5;
    }
  }

  .column-drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-right: 8px;
    opacity: 0.4;
    flex-shrink: 0;

    svg {
      width: 16px;
      height: 16px;
      fill: #909399;
    }
  }

  .column-item-left {
    flex: 1;
    min-width: 0;
  }

  .el-checkbox {
    margin: 0;

    .el-checkbox__label {
      font-size: 13px;
      color: #606266;
    }

    &.is-disabled .el-checkbox__label {
      color: #c0c4cc;
    }
  }
}
</style>
