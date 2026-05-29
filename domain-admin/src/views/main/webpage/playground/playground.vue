<template>
  <div class="playground-container">
    <!-- 页面头部 -->
    <!-- <div class="page-header">
      <div class="header-left">
        <h1>前端演练场</h1>
        <span class="page-subtitle">HTML 单文件编辑 / 多文件代码编辑器，实时预览效果</span>
      </div>
    </div> -->

    <div class="panels-wrapper">
      <!-- HTML 演练场面板 -->
      <div class="panel-section">
        <div class="section-header" @click="toggleHtmlPanel">
          <div class="section-left">
            <el-icon class="toggle-icon" :class="{ expanded: !htmlCollapsed }">
              <ArrowRight />
            </el-icon>
            <h2>HTML编辑器</h2>
            <span class="section-desc">单文件 HTML 编辑</span>
          </div>
          <div class="section-actions" @click.stop>
            <el-button size="small" @click="handleCopy">
              <el-icon><DocumentCopy /></el-icon>
              复制
            </el-button>
            <el-button size="small" @click="handleClear">
              <el-icon><Delete /></el-icon>
              重置
            </el-button>
            <el-button size="small" @click="handleDownload">
              <el-icon><Download /></el-icon>
              下载
            </el-button>
            <el-button size="small" @click="toggleHtmlFullscreen" v-if="!htmlIsFullscreen">
              <el-icon><FullScreen /></el-icon>
              全屏
            </el-button>
            <el-button size="small" @click="exitHtmlFullscreen" v-else>
              <el-icon><Close /></el-icon>
              退出
            </el-button>
          </div>
        </div>
        <transition name="panel-slide">
          <div v-show="!htmlCollapsed" class="section-content" :class="{ 'is-fullscreen': htmlIsFullscreen }">
            <!-- 全屏提示 -->
            <transition name="fade">
              <div v-if="htmlShowFullscreenHint" class="fullscreen-hint-box">
                <span class="hint-text">按 Esc 退出全屏</span>
              </div>
            </transition>
            <splitpanes class="default-theme" @resized="handleHtmlResized">
              <!-- 左侧：代码编辑器 -->
              <pane :size="50" :min-size="20" :max-size="80">
                <div class="code-panel">
                  <div class="panel-header">
                    <span class="panel-title">HTML 代码</span>
                    <span class="panel-status">{{ htmlEditorStatus }}</span>
                  </div>
                  <div class="code-editor-wrapper">
                    <codemirror
                      v-model="htmlCode"
                      :style="{ height: '100%' }"
                      :extensions="htmlExtensions"
                      @change="handleHtmlCodeChange"
                    />
                  </div>
                </div>
              </pane>

              <!-- 右侧：预览区域 -->
              <pane :size="50" :min-size="20" :max-size="80">
                <div class="preview-panel">
                  <div class="panel-header">
                    <span class="panel-title">实时预览</span>
                    <div class="panel-actions">
                      <div class="device-toggle">
                        <button
                          :class="['device-btn', { active: htmlDeviceMode === 'pc' }]"
                          @click="setHtmlDevice('pc')"
                          title="PC 端预览"
                        >
                          <el-icon><Monitor /></el-icon>
                          <span>PC</span>
                        </button>
                        <button
                          :class="['device-btn', { active: htmlDeviceMode === 'mobile' }]"
                          @click="setHtmlDevice('mobile')"
                          title="移动端预览"
                        >
                          <el-icon><Iphone /></el-icon>
                          <span>手机</span>
                        </button>
                      </div>
                      <!-- <div class="divider"></div> -->
                      <button
                        class="visual-edit-btn"
                        @click="openHtmlVisualEditor"
                        title="可视化编辑"
                      >
                        <el-icon><Edit /></el-icon>
                        <!-- <span>可视化编辑</span> -->
                      </button>
                      <!-- <div class="divider"></div> -->
                      <button
                        :class="['refresh-btn', { 'is-refreshing': htmlIsRefreshing }]"
                        @click="handleHtmlRefresh"
                        title="刷新预览"
                      >
                        <el-icon><Refresh /></el-icon>
                      </button>
                      <button
                        class="external-btn"
                        @click="openHtmlExternal"
                        title="新窗口打开"
                      >
                        <el-icon><TopRight /></el-icon>
                      </button>
                    </div>
                  </div>
                  <div class="preview-content" :class="{ 'is-mobile': htmlDeviceMode === 'mobile' }">
                    <iframe
                      ref="htmlIframeRef"
                      class="preview-iframe"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                      :srcdoc="htmlPreviewCode"
                    ></iframe>
                  </div>
                </div>
              </pane>
            </splitpanes>
          </div>
        </transition>
      </div>

      <!-- 代码编辑器面板 -->
      <div class="panel-section">
        <!-- <div class="section-header" @click="toggleCodeEditorPanel">
          <div class="section-left">
            <el-icon class="toggle-icon" :class="{ expanded: !codeEditorCollapsed }">
              <ArrowRight />
            </el-icon>
            <h2>代码编辑器</h2>
            <span class="section-desc">多文件编辑（HTML/CSS/JS）</span>
          </div>
          <div class="section-actions" @click.stop>
            <el-button size="small" @click="handleImportLandingPage">
              <el-icon><Upload /></el-icon>
              导入落地页
            </el-button>
            <el-button size="small" @click="toggleCodeEditorFullscreen" v-if="!codeEditorIsFullscreen">
              <el-icon><FullScreen /></el-icon>
              全屏
            </el-button>
            <el-button size="small" @click="exitCodeEditorFullscreen" v-else>
              <el-icon><Close /></el-icon>
              退出
            </el-button>

            <el-button size="small" @click="handleResetProject">
              <el-icon><RefreshRight /></el-icon>
              重置项目
            </el-button>
            <el-button size="small" @click="handleExportProject">
              <el-icon><Download /></el-icon>
              导出项目
            </el-button>
          </div>
        </div> -->
        <transition name="panel-slide">
          <div v-show="!codeEditorCollapsed" class="section-content" :class="{ 'is-fullscreen': codeEditorIsFullscreen }">
            <!-- 全屏提示 -->
            <transition name="fade">
              <div v-if="codeEditorShowFullscreenHint" class="fullscreen-hint-box">
                <span class="hint-text">按 Esc 退出全屏</span>
              </div>
            </transition>
            <splitpanes class="default-theme" @resized="handleCodeEditorResized">
              <!-- 左侧：资源管理器 -->
              <pane :size="20" :min-size="15" :max-size="35">
                <div class="explorer-panel">
                  <div class="panel-header">
                    <span class="panel-title">
                      <el-icon><Folder /></el-icon>
                      资源管理器
                    </span>
                    <span class="panel-icon-btn" @click="triggerImageUpload" title="上传图片">
                      <el-icon><Plus /></el-icon>
                    </span>
                  </div>
                  <!-- 隐藏的文件上传 input -->
                  <input
                    ref="imageUploadInput"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="handleImageUpload"
                  />
                  <div class="explorer-content">
                    <div class="project-info">
                      <div class="project-name">{{ projectName }}</div>
                      <div class="file-count">{{ files.length }} 个文件</div>
                    </div>
                    <div class="file-tree">
                      <!-- 遍历文件分组 -->
                      <template v-for="(groupFiles, groupName) in groupedFiles" :key="groupName">
                        <!-- 目录标题 -->
                        <div v-if="groupName !== '/'" class="folder-header">
                          <el-icon><Folder /></el-icon>
                          <span>{{ groupName }}</span>
                        </div>
                        <!-- 文件列表 -->
                        <div
                          v-for="file in groupFiles"
                          :key="file.id"
                          :class="['file-item', {
                            active: currentFileId === file.id,
                            'is-image': file.type === 'image',
                            'is-font': file.type === 'font',
                            'is-binary': file.isBinary
                          }]"
                          @click="file.isBinary ? (file.type === 'image' ? handlePreviewImage(file) : null) : selectFile(file.id)"
                          @dblclick="!file.isBinary && renameFile(file)"
                        >
                          <span class="file-icon">
                            <!-- HTML 文件 -->
                            <el-icon v-if="file.type === 'html'"><Document /></el-icon>
                            <!-- CSS 文件 -->
                            <el-icon v-else-if="file.type === 'css'"><Tickets /></el-icon>
                            <!-- JavaScript 文件 -->
                            <el-icon v-else-if="file.type === 'javascript'"><VideoPlay /></el-icon>
                            <!-- 图片文件 -->
                            <el-icon v-else-if="file.type === 'image'"><Picture /></el-icon>
                            <!-- 字体文件 -->
                            <el-icon v-else-if="file.type === 'font'"><DocumentCopy /></el-icon>
                            <!-- 其他文件 -->
                            <el-icon v-else><Document /></el-icon>
                          </span>
                          <span v-if="!file.isRenaming" class="file-name" :title="file.name">
                            {{ file.displayName || file.name }}
                          </span>
                          <input
                            v-else
                            v-model="file.newName"
                            class="file-name-input"
                            @blur="confirmRename(file)"
                            @keyup.enter="confirmRename(file)"
                            @keyup.esc="cancelRename(file)"
                            v-focus
                          />
                          <span v-if="!file.isRenaming && currentFileId === file.id && !file.isBinary" class="file-status">●</span>
                          <span v-if="file.isBinary && file.type === 'image'" class="file-actions">
                            <span class="file-action-btn" @click.stop="handlePreviewImage(file)" title="预览">
                              <el-icon><View /></el-icon>
                            </span>
                            <span class="file-action-btn" @click.stop="replaceImage(file)" title="替换">
                              <el-icon><RefreshRight /></el-icon>
                            </span>
                          </span>
                          <span v-if="file.isBinary && file.type !== 'image'" class="file-binary-tag">只读</span>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
              </pane>

              <!-- 中间：代码编辑器 -->
              <pane :size="40" :min-size="20" :max-size="60">
                <div class="code-panel">
                  <div class="panel-header">
                    <div class="file-tabs">
                      <div
                        v-for="file in openFiles"
                        :key="file.id"
                        :class="['file-tab', { active: currentFileId === file.id }]"
                        @click="selectFile(file.id)"
                      >
                        <span class="tab-icon">
                          <el-icon v-if="file.type === 'html'"><Document /></el-icon>
                          <el-icon v-else-if="file.type === 'css'"><Tickets /></el-icon>
                          <el-icon v-else><VideoPlay /></el-icon>
                        </span>
                        <span class="tab-name">{{ file.name }}</span>
                        <span class="tab-close" @click.stop="closeFile(file.id)">
                          <el-icon><Close /></el-icon>
                        </span>
                      </div>
                    </div>
                    <span class="panel-status">{{ codeEditorStatus }}</span>
                  </div>
                  <div class="code-editor-wrapper">
                    <codemirror
                      v-if="currentFile"
                      v-model="currentFile.content"
                      :style="{ height: '100%' }"
                      :extensions="currentExtensions"
                      @change="handleCodeEditorChange"
                    />
                  </div>
                </div>
              </pane>

              <!-- 右侧：预览区域 -->
              <pane :size="40" :min-size="20" :max-size="60">
                <div class="preview-panel">
                  <div class="panel-header">
                    <span class="panel-title">实时预览</span>
                    <div class="panel-actions">
                      <!-- HTML 文件选择器 -->
                      <el-select
                        v-if="htmlFileList.length > 1"
                        v-model="previewHtmlFile"
                        size="small"
                        style="width: 180px"
                        popper-class="html-file-select-dropdown"
                        :teleported="true"
                        @change="handlePreviewHtmlChange"
                      >
                        <template #prefix>
                          <el-icon><Document /></el-icon>
                        </template>
                        <el-option
                          v-for="html in htmlFileList"
                          :key="html.id"
                          :label="html.displayName || html.name"
                          :value="html.name"
                        >
                          <span style="float: left">{{ html.displayName || html.name }}</span>
                          <span style="float: right; color: #8492a6; font-size: 12px">{{ html.name }}</span>
                        </el-option>
                      </el-select>
                      <div class="device-toggle">
                        <button
                          :class="['device-btn', { active: codeEditorDeviceMode === 'pc' }]"
                          @click="setCodeEditorDevice('pc')"
                          title="PC 端预览"
                        >
                          <el-icon><Monitor /></el-icon>
                          <span>PC</span>
                        </button>
                        <button
                          :class="['device-btn', { active: codeEditorDeviceMode === 'mobile' }]"
                          @click="setCodeEditorDevice('mobile')"
                          title="移动端预览"
                        >
                          <el-icon><Iphone /></el-icon>
                          <span>手机</span>
                        </button>
                      </div>
                      <div class="divider"></div>
                      <button
                        class="visual-edit-btn"
                        @click="openVisualEditor"
                        title="可视化编辑"
                      >
                        <el-icon><Edit /></el-icon>
                      </button>
                      <button
                        :class="['refresh-btn', { 'is-refreshing': codeEditorIsRefreshing }]"
                        @click="handleCodeEditorRefresh"
                        title="刷新预览"
                      >
                        <el-icon><Refresh /></el-icon>
                      </button>
                      <button
                        class="external-btn"
                        @click="openCodeEditorExternal"
                        title="新窗口打开"
                      >
                        <el-icon><TopRight /></el-icon>
                      </button>
                      
                    </div>
                  </div>
                  <div class="preview-content" :class="{ 'is-mobile': codeEditorDeviceMode === 'mobile' }">
                    <iframe
                      ref="codeEditorIframeRef"
                      class="preview-iframe"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                      :src="codeEditorPreviewUrl"
                    ></iframe>
                  </div>
                </div>
              </pane>
            </splitpanes>
          </div>
        </transition>
      </div>
    </div>

    <!-- 导入落地页对话框 -->
    <el-dialog
      v-model="showImportDialog"
      title="导入落地页"
      width="700px"
      :close-on-click-modal="false"
    >
      <div class="import-dialog-content">
        <div class="import-tips">
          <el-icon><InfoFilled /></el-icon>
          <span>只能导入已爬取的落地页项目</span>
        </div>

        <div class="search-section">
          <el-input
            v-model="landingPageSearch"
            placeholder="搜索落地页名称"
            clearable
            @input="handleLandingPageSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <div class="landing-page-list" v-loading="loadingLandingPages">
          <div
            v-for="item in filteredLandingPages"
            :key="item.id"
            class="landing-page-item"
            :class="{ selected: selectedLandingPage?.id === item.id }"
            @click="selectLandingPage(item)"
          >
            <div class="item-info">
              <div class="item-name">{{ item.landingname }}</div>
              <div class="item-url">{{ item.landing_url }}</div>
              <div class="item-meta">
                <span class="item-path">{{ item.landing_path }}</span>
                <span class="item-version">{{ item.version }}</span>
              </div>
            </div>
            <div class="item-status">
              <el-tag v-if="item.preview_url" type="success" size="small">已爬取</el-tag>
              <el-tag v-else type="info" size="small">未爬取</el-tag>
            </div>
          </div>

          <div v-if="filteredLandingPages.length === 0 && !loadingLandingPages" class="empty-state">
            <el-icon><Document /></el-icon>
            <p>{{ landingPageSearch ? '没有找到匹配的落地页' : '暂无可导入的落地页' }}</p>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button
          type="primary"
          @click="confirmImportLandingPage"
          :disabled="!selectedLandingPage || !selectedLandingPage.preview_url"
        >
          导入
        </el-button>
      </template>
    </el-dialog>

    <!-- 可视化编辑器对话框 -->
    <el-dialog
      v-model="visualEditorDialogVisible"
      title="可视化编辑器"
      :close-on-click-modal="false"
      :fullscreen="true"
      class="visual-editor-dialog"
      @opened="handleVisualEditorOpened"
      @closed="handleVisualEditorClosed"
    >
      <div class="visual-editor-wrapper">
        <iframe
          v-if="visualEditorDialogVisible"
          :src="visualEditorIframeUrl"
          class="visual-editor-iframe"
          @load="handleIframeLoad"
        ></iframe>
      </div>
    </el-dialog>

    <!-- HTML 编辑器可视化编辑器对话框 -->
    <el-dialog
      v-model="htmlVisualEditorDialogVisible"
      title="HTML 可视化编辑器"
      :close-on-click-modal="false"
      :fullscreen="true"
      class="visual-editor-dialog"
    >
      <div class="visual-editor-wrapper">
        <iframe
          v-if="htmlVisualEditorDialogVisible"
          :src="htmlVisualEditorIframeUrl"
          class="visual-editor-iframe"
        ></iframe>
      </div>
    </el-dialog>

    <!-- 图片预览弹窗 -->
    <el-dialog
      v-model="showImagePreview"
      :title="previewImageName"
      width="500px"
      center
      append-to-body
      custom-class="image-preview-dialog"
      modal-class="image-preview-dialog-overlay"
      :z-index="20000"
      :modal="true"
      :close-on-click-modal="true"
    >
      <div class="image-preview-container">
        <img :src="previewImageUrl" :alt="previewImageName" @error="previewImageUrl = ''" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import {
  DocumentCopy,
  Delete,
  Refresh,
  RefreshRight,
  Download,
  Upload,
  Search,
  InfoFilled,
  TopRight,
  Monitor,
  Iphone,
  ArrowRight,
  Plus,
  Folder,
  Document,
  Tickets,
  VideoPlay,
  Picture,
  Close,
  FullScreen,
  View,
  Edit,
  More
} from '@element-plus/icons-vue'
import { Codemirror } from 'vue-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import { EditorView } from '@codemirror/view'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import { getLandingPageList } from '@/services/main/webpage/landingpage'
import { BASE_URL } from '@/services/request/config'
import { localCache } from '@/utils/cache'
import { LOGIN_TOKEN } from '@/global/constants'


const vFocus = {
  mounted: (el) => el.focus()
}


const defaultHtmlCode = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HTML 编辑器</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, Arial, sans-serif;
      line-height: 1.6;
      padding: 20px;
      background: #f5f5f5;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    h1 {
      color: #333;
      margin-bottom: 20px;
      font-size: 24px;
    }

    .device-badge {
      display: inline-block;
      padding: 4px 12px;
      background: #4285f4;
      color: white;
      border-radius: 20px;
      font-size: 12px;
      margin-bottom: 20px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 20px 0;
    }

    .card {
      padding: 20px;
      background: #f9f9f9;
      border-radius: 8px;
      text-align: center;
    }

    button {
      background: #333;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      width: 100%;
    }

    button:hover {
      background: #555;
    }

    @media (max-width: 480px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .device-badge {
        background: #34a853;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="device-badge" id="badge">当前：PC 端视图</span>
    <h1>左边编辑代码, 右边实时预览</h1>

    <div class="grid">
      <div class="card">
        <img src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" alt="示例图片1" style="width:100px;height:120px;object-fit:cover;border-radius:4px;cursor:pointer;">
        <p style="margin-top:10px;color:#666;">点击图片可替换</p>
      </div>
      <div class="card">
        <img src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" alt="示例图片2" style="width:100px;height:120px;object-fit:cover;border-radius:4px;cursor:pointer;">
        <p style="margin-top:10px;color:#666;">点击图片可替换</p>
      </div>
    </div>

    <button onclick="alert('点击成功！')">点击测试</button>
  </div>

  <script>
    function checkView() {
      const badge = document.getElementById('badge');
      if (window.innerWidth < 480) {
        badge.textContent = '当前：移动端视图';
        badge.style.background = '#34a853';
      } else {
        badge.textContent = '当前：PC 端视图';
        badge.style.background = '#4285f4';
      }
    }
    checkView();
    window.addEventListener('resize', checkView);
  <\/script>
</body>
</html>`


const defaultProjectFiles = [
  {
    id: '1',
    name: 'index.html',
    displayName: 'index.html',
    type: 'html',
    content: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>产品展示</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="header">
    <div class="logo">🌿 自然生活</div>
    <nav class="nav">
      <a href="#" class="nav-link">首页</a>
      <a href="#" class="nav-link">产品</a>
      <a href="#" class="nav-link">关于</a>
      <a href="#" class="nav-link">联系</a>
    </nav>
  </header>

  <section class="hero">
    <div class="hero-content">
      <h1>回归自然，享受生活</h1>
      <p>精选天然有机产品，为您带来健康美好的生活方式</p>
      <button class="btn-primary" id="shopBtn">立即选购</button>
    </div>
    <div class="hero-image">
      <img src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=500" alt="自然风光">
    </div>
  </section>

  <section class="products">
    <h2 class="section-title">热门产品</h2>
    <div class="product-grid">
      <div class="product-card">
        <img src="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400" alt="有机茶叶">
        <h3>有机茶叶</h3>
        <p>来自高山茶园的纯正有机茶叶</p>
        <span class="price">¥128</span>
        <button class="btn-cart">加入购物车</button>
      </div>
      <div class="product-card">
        <img src="https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400" alt="蜂蜜">
        <h3>天然蜂蜜</h3>
        <p>纯天然野生蜂蜜，营养丰富</p>
        <span class="price">¥88</span>
        <button class="btn-cart">加入购物车</button>
      </div>
      <div class="product-card">
        <img src="https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=400" alt="咖啡豆">
        <h3>精选咖啡豆</h3>
        <p>来自埃塞俄比亚的优质咖啡豆</p>
        <span class="price">¥168</span>
        <button class="btn-cart">加入购物车</button>
      </div>
    </div>
  </section>

  <div class="cart-info">
    <span>购物车: <strong id="cartCount">0</strong> 件商品</span>
  </div>

  <footer class="footer">
    <p>&copy; 2024 自然生活. 让生活更美好.</p>
  </footer>

  <script src="app.js"><\/script>
</body>
</html>`,
    isEditable: true,
    isBinary: false
  },
  {
    id: '2',
    name: 'style.css',
    displayName: 'style.css',
    type: 'css',
    content: `/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f5f7fa;
  min-height: 100vh;
}

/* 顶部导航 */
.header {
  background: white;
  padding: 15px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.logo {
  font-size: 22px;
  font-weight: bold;
  color: #2ecc71;
}

.nav {
  display: flex;
  gap: 30px;
}

.nav-link {
  text-decoration: none;
  color: #666;
  transition: color 0.3s;
}

.nav-link:hover {
  color: #2ecc71;
}

/* 英雄区域 */
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 60px auto;
  padding: 0 40px;
  gap: 60px;
}

.hero-content {
  flex: 1;
}

.hero-content h1 {
  font-size: 48px;
  margin-bottom: 20px;
  color: #2c3e50;
}

.hero-content p {
  font-size: 18px;
  color: #7f8c8d;
  margin-bottom: 30px;
}

.hero-image {
  flex: 1;
}

.hero-image img {
  width: 100%;
  border-radius: 20px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.1);
}

.btn-primary {
  background: #2ecc71;
  color: white;
  border: none;
  padding: 14px 36px;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover {
  background: #27ae60;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(46, 204, 113, 0.35);
}

/* 产品区域 */
.products {
  max-width: 1200px;
  margin: 80px auto;
  padding: 0 40px;
}

.section-title {
  text-align: center;
  font-size: 32px;
  margin-bottom: 40px;
  color: #2c3e50;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
}

.product-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 5px 20px rgba(0,0,0,0.05);
  padding: 20px;
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
}

.product-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 15px 40px rgba(0,0,0,0.1);
}

.product-card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 15px;
}

.product-card h3 {
  font-size: 20px;
  margin-bottom: 8px;
  color: #2c3e50;
}

.product-card p {
  color: #7f8c8d;
  font-size: 14px;
  margin-bottom: 15px;
}

.price {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #e74c3c;
  margin-bottom: 15px;
}

.btn-cart {
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.btn-cart:hover {
  background: #2980b9;
}

/* 购物车信息 */
.cart-info {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: white;
  padding: 15px 25px;
  border-radius: 50px;
  box-shadow: 0 5px 25px rgba(0,0,0,0.15);
  font-size: 14px;
}

/* 页脚 */
.footer {
  background: #2c3e50;
  color: white;
  text-align: center;
  padding: 30px;
  margin-top: 80px;
}

/* 响应式 */
@media (max-width: 768px) {
  .hero {
    flex-direction: column;
    text-align: center;
  }

  .hero-content h1 {
    font-size: 32px;
  }

  .nav {
    display: none;
  }
}`,
  },
  {
    id: '3',
    name: 'app.js',
    displayName: 'app.js',
    type: 'javascript',
    content: `// 购物车计数
let cartCount = 0


const shopBtn = document.getElementById('shopBtn')
if (shopBtn) {
  shopBtn.addEventListener('click', function() {
    document.querySelector('.products').scrollIntoView({
      behavior: 'smooth'
    })
  })
}


const cartButtons = document.querySelectorAll('.btn-cart')
const cartCountEl = document.getElementById('cartCount')

cartButtons.forEach(btn => {
  btn.addEventListener('click', function() {
    cartCount++
    cartCountEl.textContent = cartCount


    this.textContent = '已添加 ✓'
    this.style.background = '#27ae60'

    setTimeout(() => {
      this.textContent = '加入购物车'
      this.style.background = '#3498db'
    }, 1000)
  })
})

console.log('欢迎来到自然生活！')
console.log('点击产品卡片上的按钮加入购物车')`,
    isEditable: true,
    isBinary: false
  }
]


const htmlIframeRef = ref(null)
const htmlCode = ref(defaultHtmlCode)
const htmlPreviewCode = ref(defaultHtmlCode)
const htmlEditorStatus = ref('就绪')
const htmlIsRefreshing = ref(false)
const htmlDeviceMode = ref('pc')
const htmlCollapsed = ref(false) // 默认展开
const htmlIsFullscreen = ref(false)
const htmlShowFullscreenHint = ref(false)

let htmlUpdateTimer = null
let htmlHintTimer = null


const htmlExtensions = [
  oneDark,
  html(),
  EditorView.lineWrapping,
  EditorView.theme({
    '&': { height: '100%', fontSize: '14px' },
    '.cm-scroller': { overflow: 'auto', fontFamily: 'Consolas, Monaco, "Courier New", monospace' },
    '.cm-focused': { outline: 'none' }
  })
]


const projectName = ref('我的项目')
const files = ref(JSON.parse(JSON.stringify(defaultProjectFiles)))
const currentFileId = ref('1')
const openFiles = ref(['1', '2', '3'].map(id => files.value.find(f => f.id === id)))
const codeEditorIframeRef = ref(null)
const codeEditorStatus = ref('就绪')
const codeEditorIsRefreshing = ref(false)
const codeEditorDeviceMode = ref('pc')
const codeEditorCollapsed = ref(true) // 默认折叠
const codeEditorIsFullscreen = ref(false)
const codeEditorShowFullscreenHint = ref(false)


const showImportDialog = ref(false)
const landingPageSearch = ref('')
const loadingLandingPages = ref(false)
const landingPages = ref([])
const selectedLandingPage = ref(null)


const previewHtmlFile = ref('index.html')


const showImagePreview = ref(false)
const previewImageUrl = ref('')
const previewImageName = ref('')


const imageUploadInput = ref(null)
const replacingImageFile = ref(null) // 正在替换的图片文件

let codeEditorUpdateTimer = null
let codeEditorHintTimer = null

let lastPreviewBlobUrl = null

const previewVersion = ref(0)


const currentFile = computed(() => {
  return files.value.find(f => f.id === currentFileId.value)
})

const currentExtensions = computed(() => {
  const ext = [
    oneDark,
    EditorView.lineWrapping,
    EditorView.theme({
      '&': { height: '100%', fontSize: '14px' },
      '.cm-scroller': { overflow: 'auto', fontFamily: 'Consolas, Monaco, "Courier New", monospace' },
      '.cm-focused': { outline: 'none' }
    })
  ]

  if (currentFile.value?.type === 'html') {
    ext.push(html())
  } else if (currentFile.value?.type === 'css') {
    ext.push(css())
  } else if (currentFile.value?.type === 'javascript') {
    ext.push(javascript())
  }

  return ext
})


const filteredLandingPages = computed(() => {
  let list = landingPages.value.filter(item => item.preview_url || item.crawler_task_folder)

  if (landingPageSearch.value) {
    const search = landingPageSearch.value.toLowerCase()
    list = list.filter(item =>
      item.landingname?.toLowerCase().includes(search) ||
      item.landing_url?.toLowerCase().includes(search)
    )
  }

  return list
})


const htmlFileList = computed(() => {
  return files.value.filter(f => f.type === 'html')
})


const currentPreviewHtmlFile = computed(() => {
  return files.value.find(f => f.name === previewHtmlFile.value && f.type === 'html')
})


const groupedFiles = computed(() => {
  const groups = {}

  files.value.forEach(file => {

    const pathParts = file.name.split('/')
    if (pathParts.length > 1) {

      const dir = pathParts.slice(0, -1).join('/')
      if (!groups[dir]) {
        groups[dir] = []
      }
      groups[dir].push(file)
    } else {

      if (!groups['/']) {
        groups['/'] = []
      }
      groups['/'].push(file)
    }
  })


  const sortedGroups = {}
  const rootFiles = groups['/'] || []
  if (rootFiles.length > 0) {
    sortedGroups['/'] = rootFiles
  }

  Object.keys(groups)
    .filter(key => key !== '/')
    .sort()
    .forEach(key => {
      sortedGroups[key] = groups[key]
    })

  return sortedGroups
})


const codeEditorPreviewUrl = computed(() => {
  const html = codeEditorPreviewCode.value
  if (!html) return ''


  if (lastPreviewBlobUrl) {
    URL.revokeObjectURL(lastPreviewBlobUrl)
    lastPreviewBlobUrl = null
  }


  const blob = new Blob([html], { type: 'text/html' })
  const blobUrl = URL.createObjectURL(blob)
  lastPreviewBlobUrl = blobUrl


  return `${blobUrl}#v${previewVersion.value}`
})

const codeEditorPreviewCode = computed(() => {
  const htmlFile = currentPreviewHtmlFile.value
  if (!htmlFile) return ''

  let html = htmlFile.content


  const fileMap = {}
  files.value.forEach(file => {
    fileMap[file.name] = file

    fileMap['/' + file.name] = file
  })


  const htmlDir = htmlFile.name.includes('/') ? htmlFile.name.substring(0, htmlFile.name.lastIndexOf('/')) : ''


  const resolvePath = (relativePath, basePath) => {

    if (basePath === undefined || basePath === null) {
      return relativePath.replace(/^\//, '')
    }

    let path = relativePath.replace(/^\//, '')


    if (path.startsWith('../')) {
      const parts = basePath.split('/')
      let remainingPath = path
      while (remainingPath.startsWith('../')) {
        remainingPath = remainingPath.substring(3)
        if (parts.length > 0) parts.pop()
      }
      return parts.length > 0 ? `${parts.join('/')}/${remainingPath}` : remainingPath
    }


    if (path.startsWith('./')) {
      path = path.substring(2)
    }


    if (relativePath.startsWith('/')) {
      return path
    }




    if (path) {
      return basePath ? `${basePath}/${path}` : path
    }

    return path
  }


  const processCssContent = (cssContent, cssFilePath) => {

    const cssDir = cssFilePath.includes('/') ? cssFilePath.substring(0, cssFilePath.lastIndexOf('/')) : ''


    return cssContent.replace(/url\(\s*['"]?([^'"()]+)['"]?\s*\)/gi, (match, urlPath) => {

      if (urlPath.startsWith('data:')) return match

      if (urlPath.startsWith('http')) return match

      if (urlPath.startsWith('about:')) return match

      if (!urlPath) return match


      const resolvedPath = resolvePath(urlPath, cssDir)


      const file = fileMap[resolvedPath]
      if (file && file.isBinary && file.content && file.content.startsWith('data:')) {
        return `url('${file.content}')`
      }


      return 'url("")'
    })
  }


  html = html.replace(/<head([^>]*)>/i, (match, attrs) => {
    return `<head${attrs}>\n  <base href="x-playground-disabled:">`
  })


  html = html.replace(/<link([^>]*href=["']([^"']+)["'][^>]*)>/gi, (match, attrs, href) => {

    if (!attrs.includes('stylesheet')) return match


    if (href.startsWith('http')) return match


    const cleanPath = resolvePath(href, htmlDir)


    const cssFile = files.value.find(f => f.name === cleanPath && f.type === 'css')
    if (cssFile) {

      const processedCss = processCssContent(cssFile.content, cssFile.name)
      return `  <style>\n${processedCss}\n  </style>`
    }


    return ''
  })


  html = html.replace(/<script([^>]*src=["']([^"']+)["'][^>]*)><\/script>/gi, (match, attrs, src) => {

    if (src.startsWith('http')) return match


    const cleanPath = resolvePath(src, htmlDir)


    const jsFile = files.value.find(f => f.name === cleanPath && f.type === 'javascript')
    if (jsFile) {
      return `  <script>\n${jsFile.content}\n  <\/script>`
    }


    return ''
  })


  html = html.replace(/<img((?:\s+[^>=]*=(?:"[^"]*"|'[^']*'|[^>\s]*)|[^>]*)*)>/gi, (match, attrs) => {

    const srcMatch = attrs.match(/src=(?:"([^"]*)"|'([^']*)'|([^>\s]*))/i)
    if (!srcMatch) return match

    const src = srcMatch[1] || srcMatch[2] || srcMatch[3]


    if (src && (src.startsWith('http') || src.startsWith('data:'))) return match


    const cleanPath = resolvePath(src || '', htmlDir)


    const imgFile = files.value.find(f => f.name === cleanPath && f.type === 'image')
    if (imgFile && imgFile.content && imgFile.content.startsWith('data:')) {


      const newAttrs = attrs.replace(/src=(?:"[^"]*"|'[^']*'|[^>\s]*)/gi, `src="${imgFile.content}"`)


      if (!attrs.includes('data-original-src')) {
        return `<img${newAttrs} data-original-src="${cleanPath}">`
      }
      return `<img${newAttrs}>`
    }


    if (src) {
      console.log('[Playground] 图片未找到:', { src, resolved: cleanPath, htmlDir })

      const newAttrs = attrs.replace(/src=(?:"[^"]*"|'[^']*'|[^>\s]*)/gi, '')
      return `<img${newAttrs} data-missing-src="${src}">`
    }


    return match
  })


  html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, cssContent) => {
    const processedCss = processCssContent(cssContent, htmlFile.name)
    return `<style>${processedCss}</style>`
  })


  previewVersion.value

  return html
})


const handleHtmlResized = () => {}

const handleHtmlCodeChange = () => {
  htmlEditorStatus.value = '编辑中...'
  clearTimeout(htmlUpdateTimer)
  htmlUpdateTimer = setTimeout(() => {
    htmlPreviewCode.value = htmlCode.value
    htmlEditorStatus.value = '已更新'
    setTimeout(() => {
      if (htmlEditorStatus.value === '已更新') {
        htmlEditorStatus.value = '就绪'
      }
    }, 1000)
  }, 300)
}

const handleCopy = () => {
  navigator.clipboard.writeText(htmlCode.value).then(() => {
    ElMessage.success('代码已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

const handleClear = () => {
  htmlCode.value = defaultHtmlCode
  htmlPreviewCode.value = defaultHtmlCode
}

const handleDownload = () => {
  const blob = new Blob([htmlCode.value], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'index.html'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('文件下载成功')
}

const handleHtmlRefresh = () => {
  htmlIsRefreshing.value = true
  htmlPreviewCode.value = ''
  setTimeout(() => {
    htmlPreviewCode.value = htmlCode.value
    setTimeout(() => {
      htmlIsRefreshing.value = false
    }, 300)
  }, 100)
}

const openHtmlExternal = () => {
  const newWindow = window.open('', '_blank')
  if (newWindow) {
    newWindow.document.write(htmlPreviewCode.value)
    newWindow.document.close()
  }
}

const setHtmlDevice = (mode) => {
  htmlDeviceMode.value = mode
}

const toggleHtmlPanel = () => {
  htmlCollapsed.value = !htmlCollapsed.value
}


const toggleHtmlFullscreen = () => {
  htmlIsFullscreen.value = true
  document.body.style.overflow = 'hidden'
  htmlShowFullscreenHint.value = true
  clearTimeout(htmlHintTimer)
  htmlHintTimer = setTimeout(() => {
    htmlShowFullscreenHint.value = false
  }, 3000)
}

const exitHtmlFullscreen = () => {
  htmlIsFullscreen.value = false
  document.body.style.overflow = ''
}


const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    if (htmlIsFullscreen.value) {
      exitHtmlFullscreen()
    }
    if (codeEditorIsFullscreen.value) {
      exitCodeEditorFullscreen()
    }
  }
}


const handleCodeEditorResized = () => {}

const handleCodeEditorChange = () => {
  codeEditorStatus.value = '编辑中...'
  clearTimeout(codeEditorUpdateTimer)
  codeEditorUpdateTimer = setTimeout(() => {

    previewVersion.value++
    codeEditorStatus.value = '已更新'
    setTimeout(() => {
      if (codeEditorStatus.value === '已更新') {
        codeEditorStatus.value = '就绪'
      }
    }, 1000)
  }, 300)
}

const selectFile = (fileId) => {
  const file = files.value.find(f => f.id === fileId)
  if (file && !openFiles.value.find(f => f.id === fileId)) {
    openFiles.value.push(file)
  }
  currentFileId.value = fileId
}

const closeFile = (fileId) => {
  const index = openFiles.value.findIndex(f => f.id === fileId)
  if (index > -1) {
    openFiles.value.splice(index, 1)
    if (currentFileId.value === fileId && openFiles.value.length > 0) {
      const newIndex = Math.min(index, openFiles.value.length - 1)
      currentFileId.value = openFiles.value[newIndex].id
    }
  }
}

const renameFile = (file) => {
  file.isRenaming = true
  file.newName = file.name
}

const confirmRename = (file) => {
  if (file.newName && file.newName !== file.name) {
    file.name = file.newName
    ElMessage.success('文件重命名成功')
  }
  file.isRenaming = false
  file.newName = ''
}

const cancelRename = (file) => {
  file.isRenaming = false
  file.newName = ''
}



const handleImportLandingPage = async () => {
  showImportDialog.value = true
  landingPageSearch.value = ''
  selectedLandingPage.value = null
  await fetchLandingPages()
}


const fetchLandingPages = async () => {
  loadingLandingPages.value = true
  try {
    const res = await getLandingPageList({
      offset: 0,
      size: 100  // 获取更多数据
    })
    if (res.code === 0) {
      landingPages.value = res.data.list || []
    } else {
      landingPages.value = []
    }
  } catch (error) {
    ElMessage.error('获取落地页列表失败')
    landingPages.value = []
  } finally {
    loadingLandingPages.value = false
  }
}


const handleLandingPageSearch = () => {

}


const selectLandingPage = (item) => {
  selectedLandingPage.value = item
}


const confirmImportLandingPage = async () => {
  if (!selectedLandingPage.value) {
    ElMessage.warning('请选择要导入的落地页')
    return
  }

  if (!selectedLandingPage.value.preview_url && !selectedLandingPage.value.crawler_task_folder) {
    ElMessage.warning('该落地页尚未爬取，无法导入')
    return
  }

  try {


    const match = selectedLandingPage.value.preview_url?.match(/\/crawler\/preview\/([^?#]+)/)
    let taskFolder = match ? match[1] : selectedLandingPage.value.crawler_task_folder

    if (!taskFolder) {
      ElMessage.error('无法获取爬虫任务文件夹')
      return
    }


    taskFolder = taskFolder.replace(/\/index\.html$/, '')

    console.log('提取的任务文件夹:', taskFolder)



    const token = localCache.getCache(LOGIN_TOKEN)
    const encodedTaskFolder = encodeURIComponent(taskFolder)
    const downloadUrl = `${BASE_URL}/crawler/download/${encodedTaskFolder}${token ? `?token=${token}` : ''}`

    console.log('下载 URL:', downloadUrl)


    const loadingMsg = ElMessage({
      message: '正在下载并解析文件，请稍候...',
      type: 'info',
      duration: 0,
      iconClass: 'el-icon-loading'
    })


    let response
    try {

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60秒超时

      response = await fetch(downloadUrl, {
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      console.log('响应状态:', response.status, response.statusText)
    } catch (fetchError) {
      loadingMsg.close()
      if (fetchError.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接或联系管理员')
      }
      throw fetchError
    }

    if (!response.ok) {
      loadingMsg.close()

      const errorText = await response.text()
      console.error('错误响应:', errorText)
      throw new Error(`下载失败: ${response.status} ${response.statusText}`)
    }


    const contentType = response.headers.get('content-type')
    console.log('响应类型:', contentType)

    if (contentType && contentType.includes('text/html')) {
      loadingMsg.close()

      const text = await response.text()
      console.error('返回内容:', text.substring(0, 500))
      throw new Error('接口返回的不是 ZIP 文件，该落地页可能没有生成 ZIP 压缩包')
    }

    const blob = await response.blob()
    console.log('下载完成，文件大小:', blob.size, 'bytes')


    if (blob.size === 0) {
      loadingMsg.close()
      throw new Error('下载的文件为空，请检查后端是否正确生成 ZIP 文件')
    }

    loadingMsg.close()
    const loadingMsg2 = ElMessage({
      message: '正在解析 ZIP 文件...',
      type: 'info',
      duration: 0,
      iconClass: 'el-icon-loading'
    })

    let zip
    try {
      zip = await JSZip.loadAsync(blob)
    } catch (zipError) {
      loadingMsg2.close()
      console.error('ZIP 解析错误:', zipError)
      throw new Error('ZIP 文件解析失败，文件可能损坏或不是有效的 ZIP 格式')
    }

    loadingMsg2.close()

    const newFiles = []
    const idCounter = { value: 1 }
    let skippedCount = 0
    let processedCount = 0
    const maxFiles = 500 // 限制最大文件数，防止卡死


    const allowedExts = new Set([
      'html', 'htm',      // HTML
      'css',              // CSS
      'js',               // JavaScript
      'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'  // 图片
    ])


    const skippedExts = new Set([
      'ttf', 'otf', 'woff', 'woff2', 'eot',  // 字体
      'mp4', 'webm', 'mov', 'avi', 'mpg', 'mpeg',  // 视频
      'mp3', 'wav', 'ogg', 'flac',  // 音频
      'pdf', 'doc', 'docx', 'xls', 'xlsx'  // 文档
    ])


    const allEntries = Object.values(zip.files)
      .filter(entry => !entry.dir)

    console.log('ZIP 中文件总数:', allEntries.length)


    for (const zipEntry of allEntries) {
      if (newFiles.length >= maxFiles) {
        console.warn(`已达到最大文件数限制 (${maxFiles})，跳过剩余文件`)
        break
      }

      const fullPath = zipEntry.name
      const fileName = fullPath.split('/').pop()
      const ext = fileName.split('.').pop().toLowerCase()


      if (skippedExts.has(ext)) {
        skippedCount++
        continue
      }


      if (!allowedExts.has(ext)) {
        skippedCount++
        continue
      }

      processedCount++

      let fileType = 'text'
      let isEditable = true
      let isBinary = false


      if (ext === 'html' || ext === 'htm') {
        fileType = 'html'
      } else if (ext === 'css') {
        fileType = 'css'
      } else if (ext === 'js') {
        fileType = 'javascript'
      } else {

        fileType = 'image'
        isEditable = false
        isBinary = true
      }

      let fileContent
      if (isBinary) {

        try {
          const uint8Array = await zipEntry.async('uint8array')

          if (uint8Array.length > 2 * 1024 * 1024) {
            console.warn('图片过大，跳过:', fullPath)
            skippedCount++
            continue
          }
          const binaryString = uint8Array.reduce((acc, byte) => acc + String.fromCharCode(byte), '')
          const base64 = btoa(binaryString)
          const mimeType = ext === 'jpg' ? 'image/jpeg' :
                          ext === 'svg' ? 'image/svg+xml' :
                          `image/${ext}`
          fileContent = `data:${mimeType};base64,${base64}`
        } catch (imgError) {
          console.error('图片处理失败:', fullPath, imgError)
          skippedCount++
          continue
        }
      } else {
        fileContent = await zipEntry.async('string')
      }

      newFiles.push({
        id: String(idCounter.value++),
        name: fullPath,
        displayName: fileName,
        type: fileType,
        content: fileContent,
        isEditable: isEditable,
        isBinary: isBinary,
        size: zipEntry._data?.uncompressedSize || 0
      })
    }

    console.log(`处理完成: ${processedCount} 个文件，跳过 ${skippedCount} 个文件`)

    if (newFiles.length === 0) {
      ElMessage.warning('未找到可导入的文件')
      return
    }


    files.value = newFiles


    console.log('[Playground] 导入的文件列表:')
    newFiles.forEach(f => {
      console.log(`  - ${f.name} (${f.type})`)
    })


    const htmlFiles = newFiles.filter(f => f.type === 'html')

    if (htmlFiles.length > 0) {

      const indexHtml = htmlFiles.find(f => f.name.toLowerCase().endsWith('index.html')) || htmlFiles[0]
      currentFileId.value = indexHtml.id

      previewHtmlFile.value = indexHtml.name

      openFiles.value = newFiles.slice(0, 3).map(f => f.id)
    } else {
      currentFileId.value = newFiles[0].id
      openFiles.value = newFiles.slice(0, 3).map(f => f.id)
    }


    projectName.value = selectedLandingPage.value.landingname || '导入的项目'

    showImportDialog.value = false
    const skipMsg = skippedCount > 0 ? `，已跳过 ${skippedCount} 个文件（字体、视频等）` : ''
    ElMessage.success(`成功导入 ${newFiles.length} 个文件（${htmlFiles.length} 个 HTML，${newFiles.filter(f => f.type === 'css').length} 个 CSS，${newFiles.filter(f => f.type === 'image').length} 个图片）${skipMsg}`)

  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error('导入失败: ' + error.message)
  }
}


const handlePreviewHtmlChange = (htmlFileName) => {
  previewHtmlFile.value = htmlFileName

  previewVersion.value++
}


const handlePreviewImage = (file) => {
  console.log('[Playground] 打开图片预览:', file)
  if (file.type === 'image' && file.content) {
    previewImageUrl.value = file.content
    previewImageName.value = file.displayName || file.name
    showImagePreview.value = true
    console.log('[Playground] 图片预览状态:', { showImagePreview: showImagePreview.value, url: previewImageUrl.value.substring(0, 50) + '...' })
  }
}


const closeImagePreview = () => {
  showImagePreview.value = false
  previewImageUrl.value = ''
  previewImageName.value = ''
}




const triggerImageUpload = () => {
  replacingImageFile.value = null
  imageUploadInput.value?.click()
}


const replaceImage = (file) => {
  replacingImageFile.value = file
  imageUploadInput.value?.click()
}


const handleImageUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return


  event.target.value = ''


  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }


  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('图片大小不能超过 5MB')
    return
  }

  try {

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target.result

      if (replacingImageFile.value) {

        const oldFile = replacingImageFile.value
        oldFile.content = base64
        oldFile.size = file.size


        files.value = [...files.value]

        ElMessage.success(`已替换图片：${oldFile.displayName}`)
      } else {

        const fileName = file.name
        const fileExt = fileName.split('.').pop().toLowerCase()
        const mimeType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt === 'svg' ? 'svg+xml' : fileExt}`


        const newId = String(Date.now())

        const newImageFile = {
          id: newId,
          name: fileName,
          displayName: fileName,
          type: 'image',
          content: base64,
          isEditable: false,
          isBinary: true,
          size: file.size
        }

        files.value.push(newImageFile)
        ElMessage.success(`已添加图片：${fileName}`)
      }


      previewVersion.value++


      replacingImageFile.value = null
    }
    reader.onerror = () => {
      ElMessage.error('读取图片文件失败')
    }
    reader.readAsDataURL(file)
  } catch (error) {
    console.error('图片上传失败:', error)
    ElMessage.error('图片上传失败')
  }
}

const handleResetProject = () => {
  ElMessageBox.confirm('确定要重置项目吗？所有未保存的更改将丢失。', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    files.value = JSON.parse(JSON.stringify(defaultProjectFiles))
    currentFileId.value = '1'
    openFiles.value = ['1', '2', '3'].map(id => files.value.find(f => f.id === id))
    previewHtmlFile.value = 'index.html'

    previewVersion.value++
    ElMessage.success('项目已重置')
  }).catch(() => {})
}

const handleExportProject = () => {
  const zip = new JSZip()


  const base64ToUint8Array = (base64) => {
    const dataUrlRegex = /^data:([^;]+);base64,(.+)$/
    const match = base64.match(dataUrlRegex)
    if (!match) return null

    const base64Data = match[2]
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  }


  const cleanHtmlContent = (content) => {
    let cleaned = content

    cleaned = cleaned.replace(/\uFEFF/g, '')

    cleaned = cleaned.replace(/<base\s+href=["']x-playground-disabled:["'][^>]*>/gi, '')

    cleaned = cleaned.replace(/\s+data-original-src=(["'])[^"']*\1/gi, '')

    cleaned = cleaned.replace(/\s+data-missing-src=(["'])[^"']*\1/gi, '')

    cleaned = cleaned.replace(/\s+data-ve-replaceable=["']?true["']?/gi, '')
    return cleaned
  }


  let exportedCount = 0
  files.value.forEach(file => {

    if (file.isBinary && file.content && file.content.startsWith('data:')) {

      const bytes = base64ToUint8Array(file.content)
      if (bytes) {
        zip.file(file.name, bytes)
        exportedCount++
      }
    } else if (file.content) {

      let content = file.content
      if (file.type === 'html') {
        content = cleanHtmlContent(content)
      }
      zip.file(file.name, content)
      exportedCount++
    }
  })


  zip.generateAsync({ type: 'blob' }).then(blob => {
    saveAs(blob, `${projectName.value}.zip`)
    ElMessage.success(`成功导出 ${exportedCount} 个文件`)
  })
}

const handleCodeEditorRefresh = () => {
  codeEditorIsRefreshing.value = true

  previewVersion.value++
  setTimeout(() => {
    codeEditorIsRefreshing.value = false
  }, 300)
}


const handleVisualEditorMessage = (event) => {

  if (event.data && event.data.type === 'visualEditorSave') {
    const modifiedHtml = event.data.html


    const currentHtmlFile = currentPreviewHtmlFile.value
    if (currentHtmlFile) {


      const imgPattern = /<img([^>]*?)data-original-src=(["'])([^"']+)\2([^>]*?)>/gi
      let match
      const updatedImageFiles = []

      while ((match = imgPattern.exec(modifiedHtml)) !== null) {
        const originalSrc = match[3] // 原始文件名
        const imgFullTag = match[0]  // 完整的 img 标签


        const srcMatch = imgFullTag.match(/src=(["'])([^"']+)\1/i)
        if (srcMatch) {
          const currentSrc = srcMatch[2]


          if (currentSrc.startsWith('data:')) {
            const imgFile = files.value.find(f => f.name === originalSrc && f.type === 'image')
            if (imgFile && imgFile.content !== currentSrc) {
              imgFile.content = currentSrc
              updatedImageFiles.push(originalSrc)
            }
          }
        }
      }


      let processedHtml = modifiedHtml
      processedHtml = processedHtml.replace(
        /<img([^>]*?)src=(["'])(data:image\/[^"']+)\2([^>]*?)data-original-src=(["'])([^"']+)\5([^>]*?)>/gi,
        (match, beforeSrc, quote1, dataSrc, afterSrc, quote2, originalSrc, rest) => {
          return `<img${beforeSrc}src="${originalSrc}"${afterSrc}>`
        }
      )


      processedHtml = processedHtml.replace(
        /\s+data-original-src=(["'])[^"']*\1/gi,
        ''
      )


      const fileIndex = files.value.findIndex(f => f.name === currentHtmlFile.name && f.type === 'html')
      if (fileIndex !== -1) {
        files.value[fileIndex].content = processedHtml
      }


      previewVersion.value++

      if (updatedImageFiles.length > 0) {
        console.log('[Playground] 已同步更新图片文件:', updatedImageFiles)
      }
    }

    ElMessage.success('可视化编辑器的内容已保存')
  } else if (event.data?.type === 'visualEditorClose') {
    visualEditorDialogVisible.value = false
  } else if (event.data && event.data.type === 'htmlVisualEditorSave') {
    const modifiedHtml = event.data.html
    htmlCode.value = modifiedHtml
    htmlPreviewCode.value = modifiedHtml
    ElMessage.success('HTML 可视化编辑器的内容已保存')
  } else if (event.data?.type === 'htmlVisualEditorClose') {
    htmlVisualEditorDialogVisible.value = false
  }
}

const openCodeEditorExternal = () => {
  const newWindow = window.open('', '_blank')
  if (newWindow) {
    newWindow.document.write(codeEditorPreviewCode.value)
    newWindow.document.close()
  }
}


const visualEditorDialogVisible = ref(false)
const visualEditorIframeUrl = ref('')


const htmlVisualEditorDialogVisible = ref(false)
const htmlVisualEditorIframeUrl = ref('')


const openVisualEditor = () => {
  const htmlCode = codeEditorPreviewCode.value


  const base64Html = btoa(unescape(encodeURIComponent(htmlCode)))


  const fullEditorHtml =
    '<!DOCTYPE html>' +
    '<html lang="zh-CN">' +
    '<head>' +
    '  <meta charset="UTF-8">' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '  <title>可视化编辑器</title>' +
    '  <style>' +
    '    *{margin:0;padding:0;box-sizing:border-box}' +
    '    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;overflow:hidden}' +
    '    .ve-toolbar{position:fixed;top:0;left:0;right:0;height:48px;background:#2d2d2d;border-bottom:1px solid #3e3e3e;display:flex;align-items:center;padding:0 12px;gap:4px;z-index:10000;box-shadow:0 2px 8px rgba(0,0,0,0.2);flex-shrink:0}' +
    '    .ve-toolbar-left{display:flex;align-items:center;gap:4px;flex:0 1 auto;min-width:0;overflow:hidden}' +
    '    .ve-toolbar-right{display:flex;align-items:center;gap:4px;flex-shrink:0}' +
    '    .ve-title{color:#999;font-size:12px;font-weight:500;margin-right:4px;white-space:nowrap}' +
    '    .ve-divider{width:1px;height:20px;background:#3e3e3e;flex-shrink:0}' +
    '    .ve-btn{display:flex;align-items:center;justify-content:center;min-width:28px;width:28px;height:28px;border:none;background:#3e3e3e;color:#ccc;border-radius:3px;cursor:pointer;transition:all 0.2s;font-size:13px;flex-shrink:0}' +
    '    .ve-btn:hover{background:#4e4e4e;color:#fff}' +
    '    .ve-btn.active{background:#667eea;color:#fff}' +
    '    .ve-device-btn{padding:5px 10px;background:#3e3e3e;color:#ccc;border:1px solid #4e4e4e;border-radius:3px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:4px;flex-shrink:0}' +
    '    .ve-device-btn:hover{background:#4e4e4e}' +
    '    .ve-device-btn.active{background:#667eea;color:#fff;border-color:#667eea}' +
    '    .ve-select{padding:4px 6px;background:#3e3e3e;color:#ccc;border:1px solid #4e4e4e;border-radius:3px;font-size:12px;cursor:pointer;flex-shrink:0}' +
    '    .ve-select:hover{background:#4e4e4e}' +
    '    .ve-color-picker{width:28px;height:28px;border:none;border-radius:3px;cursor:pointer;background:transparent;flex-shrink:0;padding:0}' +
    '    .ve-save-btn{display:flex;align-items:center;gap:4px;padding:5px 12px;background:#667eea;color:white;border:none;border-radius:3px;font-size:12px;cursor:pointer;transition:background 0.2s;flex-shrink:0;white-space:nowrap}' +
    '    .ve-save-btn:hover{background:#5568d3}' +
    '    .ve-exit-btn{display:flex;align-items:center;gap:4px;padding:5px 10px;background:#3e3e3e;color:#ccc;border:none;border-radius:3px;font-size:12px;cursor:pointer;transition:background 0.2s;flex-shrink:0;white-space:nowrap}' +
    '    .ve-exit-btn:hover{background:#4e4e4e;color:#fff}' +
    '    .ve-content{margin-top:48px;width:100%;height:calc(100vh - 48px);overflow:auto;background:#fff;padding:20px}' +
    '    .ve-content-inner{width:100%;min-height:100%;position:relative}' +
    '    [contenteditable="true"]{outline:2px dashed #667eea;outline-offset:2px}' +
    '    [contenteditable="true"]:focus{outline:2px solid #667eea}' +
    '    .ve-img-wrapper{position:relative;display:inline-block}' +
    '    .ve-img-wrapper:hover::after{content:"点击替换图片";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:8px 16px;background:rgba(0,0,0,0.8);color:white;font-size:13px;border-radius:4px;pointer-events:none;white-space:nowrap}' +
    '    .ve-img-wrapper:hover img{opacity:0.7}' +
    '    .ve-hint{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:10px 20px;background:rgba(0,0,0,0.8);color:white;font-size:13px;border-radius:20px;z-index:10001;pointer-events:none;animation:veFadeIn 0.3s ease}' +
    '    @keyframes veFadeIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}' +
    '    .ve-hidden-input{display:none}' +
    '    .ve-img-dialog{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:10002;min-width:320px;display:none}' +
    '    .ve-img-dialog.show{display:block}' +
    '    .ve-img-dialog-title{font-size:16px;font-weight:500;margin-bottom:15px;color:#333}' +
    '    .ve-img-dialog-preview{width:100%;height:150px;background:#f5f5f5;border:1px dashed #ddd;border-radius:4px;margin-bottom:15px;display:flex;align-items:center;justify-content:center;overflow:hidden}' +
    '    .ve-img-dialog-preview img{max-width:100%;max-height:100%;object-fit:contain}' +
    '    .ve-img-dialog-preview.empty{color:#999;font-size:13px}' +
    '    .ve-img-dialog-row{display:flex;gap:10px;margin-bottom:10px}' +
    '    .ve-img-dialog-col{flex:1}' +
    '    .ve-img-dialog-col label{display:block;font-size:12px;color:#666;margin-bottom:4px}' +
    '    .ve-img-dialog-col input{width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:13px}' +
    '    .ve-img-dialog-buttons{display:flex;gap:8px}' +
    '    .ve-img-dialog-btn{flex:1;padding:8px;border:none;border-radius:4px;font-size:13px;cursor:pointer}' +
    '    .ve-img-dialog-btn.primary{background:#667eea;color:white}' +
    '    .ve-img-dialog-btn.primary:hover{background:#5568d3}' +
    '    .ve-img-dialog-btn.cancel{background:#e5e5e5;color:#333}' +
    '    .ve-img-dialog-btn.cancel:hover{background:#d5d5d5}' +
    '  </style>' +
    '</head>' +
    '<body>' +
    '  <div class="ve-toolbar">' +
    '    <div class="ve-toolbar-left" style="background-color: #2D2D2D;">' +
    '      <span class="ve-title" style="background-color: #2D2D2D;">可视化编辑器</span>' +
    '      <div class="ve-divider"></div>' +
    '      <input type="color" id="veColorPicker" class="ve-color-picker" value="#333333" title="文字颜色">' +
    '      <button id="veApplyColor" class="ve-btn" title="应用颜色">C</button>' +
    '      <div class="ve-divider"></div>' +
    '      <select id="veFontSize" class="ve-select" title="字体大小">' +
    '        <option value="12px">12</option>' +
    '        <option value="14px">14</option>' +
    '        <option value="16px" selected>16</option>' +
    '        <option value="18px">18</option>' +
    '        <option value="20px">20</option>' +
    '        <option value="24px">24</option>' +
    '        <option value="32px">32</option>' +
    '      </select>' +
    '      <button id="veApplySize" class="ve-btn" title="应用大小">S</button>' +
    '      <div class="ve-divider"></div>' +
    '      <button id="veBold" class="ve-btn" title="加粗">B</button>' +
    '      <button id="veItalic" class="ve-btn" title="斜体">I</button>' +
    '      <button id="veUnderline" class="ve-btn" title="下划线">U</button>' +
    '    </div>' +
    '    <div class="ve-toolbar-right" style="background-color: #2D2D2D;">' +
    '      <button class="ve-save-btn" id="veSave">保存修改</button>' +
    '      <button class="ve-exit-btn" id="veExit">关闭</button>' +
    '    </div>' +
    '  </div>' +
    '  <div class="ve-content" id="veContent"><div class="ve-content-inner"></div></div>' +
    '  <input type="file" id="veImageInput" class="ve-hidden-input" accept="image/*">' +
    '  <div class="ve-img-dialog" id="veImgDialog">' +
    '    <div class="ve-img-dialog-title">设置图片</div>' +
    '    <div class="ve-img-dialog-preview" id="veImgPreview">' +
    '      <span class="empty">暂无图片</span>' +
    '    </div>' +
    '    <div class="ve-img-dialog-row">' +
    '      <div class="ve-img-dialog-col">' +
    '        <label>宽度 (px)</label>' +
    '        <input type="number" id="veImgWidth" value="200" min="50" max="2000">' +
    '      </div>' +
    '      <div class="ve-img-dialog-col">' +
    '        <label>高度 (px)</label>' +
    '        <input type="number" id="veImgHeight" value="120" min="50" max="2000">' +
    '      </div>' +
    '    </div>' +
    '    <div class="ve-img-dialog-row">' +
    '      <button class="ve-img-dialog-btn primary" id="veImgSelectBtn">选择图片</button>' +
    '      <button class="ve-img-dialog-btn primary" id="veImgApplyBtn">应用</button>' +
    '      <button class="ve-img-dialog-btn cancel" id="veImgCancelBtn">取消</button>' +
    '    </div>' +
    '  </div>' +
    '  <script type="ve-data" id="veHtmlData" style="display:none">' + base64Html + '</scr' + 'ipt>' +
    '  <script>' +
    '    (function() {' +
    '      "use strict";' +
    '      let veContent, veContentInner, veColorPicker, veFontSize, veApplyColor, veApplySize;' +
    '      let veBold, veItalic, veUnderline, veSave, veExit, veImageInput;' +
    '      let veImgDialog, veImgPreview, veImgWidth, veImgHeight;' +
    '      let veImgSelectBtn, veImgApplyBtn, veImgCancelBtn;' +
    '      let currentReplacingImg = null;' +
    '      let selectedImgSrc = null;' +
    '      let originalHtmlPrefix = "";' +
    '      let originalHtmlSuffix = "";' +
    '' +
    '      function decodeBase64_utf8(str) {' +
    '        return decodeURIComponent(escape(atob(str)));' +
    '      }' +
    '' +
    '      function htmlEncode(str) {' +
    '        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\'/g, "&#039;");' +
    '      }' +
    '' +
    '      function makeTextEditable() {' +
    '        veContentInner.addEventListener("dblclick", function(e) {' +
    '          var target = e.target;' +
    '          var editableEl = target.closest("h1,h2,h3,h4,h5,h6,p,span,div,a,button,li,td,th,label,strong,em,u,b,i,small,mark,input,textarea");' +
    '          if (!editableEl) return;' +
    '          if (editableEl.closest(".ve-toolbar")) return;' +
    '          if (editableEl.closest(".ve-img-wrapper")) return;' +
    '          e.preventDefault();' +
    '          e.stopPropagation();' +
    '          e.stopImmediatePropagation();' +
    '          editableEl.setAttribute("contenteditable", "true");' +
    '          editableEl.focus();' +
    '          showHint("正在编辑...按 ESC 或点击外部退出编辑模式");' +
    '        }, true);' +
    '' +
    '        veContentInner.addEventListener("keydown", function(e) {' +
    '          if (e.key === "Escape" && e.target.getAttribute("contenteditable") === "true") {' +
    '            e.preventDefault();' +
    '            e.target.setAttribute("contenteditable", "false");' +
    '            e.target.blur();' +
    '            hideHint();' +
    '          }' +
    '        }, true);' +
    '' +
    '        veContentInner.addEventListener("focusout", function(e) {' +
    '          if (e.target.getAttribute("contenteditable") === "true") {' +
    '            e.target.setAttribute("contenteditable", "false");' +
    '            hideHint();' +
    '          }' +
    '        }, true);' +
    '      }' +
    '' +
    '      function makeImagesReplaceable() {' +
    '        veContentInner.querySelectorAll("img").forEach(function(img) {' +
    '          img.setAttribute("data-ve-replaceable", "true");' +
    '          img.style.cursor = "pointer";' +
    '        });' +
    '        veContentInner.addEventListener("click", function(e) {' +
    '          var target = e.target;' +
    '          if (target.tagName === "IMG" && target.hasAttribute("data-ve-replaceable")) {' +
    '            e.preventDefault();' +
    '            e.stopPropagation();' +
    '            currentReplacingImg = target;' +
    '            openImgDialog();' +
    '          }' +
    '        }, true);' +
    '      }' +
    '' +
    '      function openImgDialog() {' +
    '        selectedImgSrc = currentReplacingImg.src;' +
    '        veImgWidth.value = currentReplacingImg.offsetWidth || 200;' +
    '        veImgHeight.value = currentReplacingImg.offsetHeight || 120;' +
    '        updateImgPreview();' +
    '        veImgDialog.classList.add("show");' +
    '      }' +
    '' +
    '      function closeImgDialog() {' +
    '        veImgDialog.classList.remove("show");' +
    '        selectedImgSrc = null;' +
    '      }' +
    '' +
    '      function updateImgPreview() {' +
    '        veImgPreview.innerHTML = "";' +
    '        if (selectedImgSrc) {' +
    '          var img = document.createElement("img");' +
    '          img.src = selectedImgSrc;' +
    '          img.style.maxWidth = "100%";' +
    '          img.style.maxHeight = "100%";' +
    '          veImgPreview.appendChild(img);' +
    '        } else {' +
    '          veImgPreview.innerHTML = "<span class=\\"empty\\">暂无图片</span>";' +
    '        }' +
    '      }' +
    '' +
    '      function applyImageSettings() {' +
    '        if (!currentReplacingImg || !selectedImgSrc) return;' +
    '        var width = parseInt(veImgWidth.value) || 200;' +
    '        var height = parseInt(veImgHeight.value) || 120;' +
    '        currentReplacingImg.src = selectedImgSrc;' +
    '        currentReplacingImg.style.width = width + "px";' +
    '        currentReplacingImg.style.height = height + "px";' +
    '        closeImgDialog();' +
    '        showHint("图片设置已应用");' +
    '      }' +
    '' +
    '      function applyStyle(property, value) {' +
    '        const selection = window.getSelection();' +
    '        if (!selection.rangeCount) {' +
    '          showHint("请先选中要修改的文字");' +
    '          return;' +
    '        }' +
    '        const range = selection.getRangeAt(0);' +
    '        if (range.toString().trim() === "") {' +
    '          showHint("请先选中要修改的文字");' +
    '          return;' +
    '        }' +
    '        switch (property) {' +
    '          case "color":' +
    '            applyInlineStyle(range, "color", value);' +
    '            break;' +
    '          case "fontSize":' +
    '            applyInlineStyle(range, "fontSize", value);' +
    '            break;' +
    '          case "bold":' +
    '            applyInlineStyle(range, "fontWeight", "bold");' +
    '            break;' +
    '          case "italic":' +
    '            applyInlineStyle(range, "fontStyle", "italic");' +
    '            break;' +
    '          case "underline":' +
    '            applyInlineStyle(range, "textDecoration", "underline");' +
    '            break;' +
    '        }' +
    '        showHint("样式已应用");' +
    '      }' +
    '' +
    '      function applyInlineStyle(range, property, value) {' +
    '        const span = document.createElement("span");' +
    '        span.style[property] = value;' +
    '        try {' +
    '          range.surroundContents(span);' +
    '        } catch (e) {' +
    '          const fragment = range.extractContents();' +
    '          span.appendChild(fragment);' +
    '          range.insertNode(span);' +
    '        }' +
    '        selection.removeAllRanges();' +
    '        const newRange = document.createRange();' +
    '        newRange.selectNodeContents(span);' +
    '        selection.addRange(newRange);' +
    '      }' +
    '' +
    '      function setupEventListeners() {' +
    '        veColorPicker.addEventListener("input", function() {' +
    '          applyStyle("color", veColorPicker.value);' +
    '        });' +
    '        veApplyColor.addEventListener("click", function() {' +
    '          applyStyle("color", veColorPicker.value);' +
    '        });' +
    '        veFontSize.addEventListener("change", function() {' +
    '          applyStyle("fontSize", veFontSize.value);' +
    '        });' +
    '        veApplySize.addEventListener("click", function() {' +
    '          applyStyle("fontSize", veFontSize.value);' +
    '        });' +
    '        veBold.addEventListener("click", function() {' +
    '          applyStyle("bold");' +
    '        });' +
    '        veItalic.addEventListener("click", function() {' +
    '          applyStyle("italic");' +
    '        });' +
    '        veUnderline.addEventListener("click", function() {' +
    '          applyStyle("underline");' +
    '        });' +
    '        veImageInput.addEventListener("change", function(e) {' +
    '          var file = e.target.files[0];' +
    '          if (file) {' +
    '            if (!file.type.startsWith("image/")) {' +
    '              showHint("请选择图片文件");' +
    '              return;' +
    '            }' +
    '            var reader = new FileReader();' +
    '            reader.onload = function(e) {' +
    '              selectedImgSrc = e.target.result;' +
    '              updateImgPreview();' +
    '              veImageInput.value = "";' +
    '            };' +
    '            reader.readAsDataURL(file);' +
    '          }' +
    '        });' +
    '        veImgSelectBtn.addEventListener("click", function() {' +
    '          veImageInput.click();' +
    '        });' +
    '        veImgApplyBtn.addEventListener("click", function() {' +
    '          applyImageSettings();' +
    '        });' +
    '        veImgCancelBtn.addEventListener("click", function() {' +
    '          closeImgDialog();' +
    '        });' +
    '        veSave.addEventListener("click", function() {' +
    '          var bodyContent = veContentInner.innerHTML;' +
    '          var modifiedHtml = originalHtmlPrefix + bodyContent + originalHtmlSuffix;' +
    '          window.parent.postMessage({type: "visualEditorSave", html: modifiedHtml}, "*");' +
    '          showHint("修改已保存");' +
    '        });' +
    '        veExit.addEventListener("click", function() {' +
    '          window.parent.postMessage({type: "visualEditorClose"}, "*");' +
    '        });' +
    '      }' +
    '' +
    '      function showHint(message) {' +
    '        var existingHint = document.querySelector(".ve-hint");' +
    '        if (existingHint) existingHint.remove();' +
    '        var hint = document.createElement("div");' +
    '        hint.className = "ve-hint";' +
    '        hint.textContent = message;' +
    '        document.body.appendChild(hint);' +
    '        setTimeout(function() { hint.remove(); }, 3000);' +
    '      }' +
    '' +
    '      function hideHint() {' +
    '        var hint = document.querySelector(".ve-hint");' +
    '        if (hint) hint.remove();' +
    '      }' +
    '' +
    '      document.addEventListener("DOMContentLoaded", function() {' +
    '        veContent = document.getElementById("veContent");' +
    '        veContentInner = veContent.querySelector(".ve-content-inner");' +
    '        veColorPicker = document.getElementById("veColorPicker");' +
    '        veFontSize = document.getElementById("veFontSize");' +
    '        veApplyColor = document.getElementById("veApplyColor");' +
    '        veApplySize = document.getElementById("veApplySize");' +
    '        veBold = document.getElementById("veBold");' +
    '        veItalic = document.getElementById("veItalic");' +
    '        veUnderline = document.getElementById("veUnderline");' +
    '        veSave = document.getElementById("veSave");' +
    '        veExit = document.getElementById("veExit");' +
    '        veImageInput = document.getElementById("veImageInput");' +
    '        veImgDialog = document.getElementById("veImgDialog");' +
    '        veImgPreview = document.getElementById("veImgPreview");' +
    '        veImgWidth = document.getElementById("veImgWidth");' +
    '        veImgHeight = document.getElementById("veImgHeight");' +
    '        veImgSelectBtn = document.getElementById("veImgSelectBtn");' +
    '        veImgApplyBtn = document.getElementById("veImgApplyBtn");' +
    '        veImgCancelBtn = document.getElementById("veImgCancelBtn");' +
    '        try {' +
    '          var base64Data = document.getElementById("veHtmlData").textContent;' +
    '          var originalHtml = decodeBase64_utf8(base64Data);' +
    '          originalHtml = originalHtml.replace(/^\uFEFF/, "");' +
    '          var parser = new DOMParser();' +
    '          var doc = parser.parseFromString(originalHtml, "text/html");' +
    '          var doctype = null;' +
    '          if (doc.doctype) {' +
    '            doctype = "<!DOCTYPE " + doc.doctype.name + ">";' +
    '          } else if (originalHtml.match(/<!DOCTYPE/i)) {' +
    '            doctype = "<!DOCTYPE html>";' +
    '          }' +
    '          var htmlEl = doc.documentElement;' +
    '          var htmlTag = "<html";' +
    '          if (htmlEl.attributes.length > 0) {' +
    '            for (var i = 0; i < htmlEl.attributes.length; i++) {' +
    '              htmlTag += " " + htmlEl.attributes[i].name + "=\\"" + htmlEl.attributes[i].value + "\\"";' +
    '            }' +
    '          }' +
    '          htmlTag += ">";' +
    '          var headContent = doc.head.outerHTML;' +
    '          headContent = headContent.replace(/^\uFEFF/, "");' +
    '          var bodyEl = doc.body;' +
    '          var bodyTag = "<body";' +
    '          if (bodyEl.attributes.length > 0) {' +
    '            for (var j = 0; j < bodyEl.attributes.length; j++) {' +
    '              bodyTag += " " + bodyEl.attributes[j].name + "=\\"" + bodyEl.attributes[j].value + "\\"";' +
    '            }' +
    '          }' +
    '          bodyTag += ">";' +
    '          originalHtmlPrefix = (doctype || "") + htmlTag + headContent + bodyTag;' +
    '          originalHtmlSuffix = "</body></html>";' +
    '          veContentInner.innerHTML = originalHtml;' +
    '        } catch (e) {' +
    '          console.error("Failed to decode HTML:", e);' +
    '          veContentInner.innerHTML = "<p style=\\"color:red; padding:20px;\\">加载失败：无法解析HTML内容</p>";' +
    '        }' +
    '        makeTextEditable();' +
    '        makeImagesReplaceable();' +
    '        setupEventListeners();' +
    '      });' +
    '    })();' +
    '  </scr' + 'ipt>' +
    '</body>' +
    '</html>'


  const blob = new Blob([fullEditorHtml], { type: 'text/html;charset=utf-8' })
  visualEditorIframeUrl.value = URL.createObjectURL(blob)
  visualEditorDialogVisible.value = true
}


const openHtmlVisualEditor = () => {
  const htmlCode = htmlPreviewCode.value


  const base64Html = btoa(unescape(encodeURIComponent(htmlCode)))


  const fullEditorHtml =
    '<!DOCTYPE html>' +
    '<html lang="zh-CN">' +
    '<head>' +
    '  <meta charset="UTF-8">' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '  <title>HTML 可视化编辑器</title>' +
    '  <style>' +
    '    *{margin:0;padding:0;box-sizing:border-box}' +
    '    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;overflow:hidden}' +
    '    .ve-toolbar{position:fixed;top:0;left:0;right:0;height:48px;background:#2d2d2d;border-bottom:1px solid #3e3e3e;display:flex;align-items:center;padding:0 12px;gap:4px;z-index:10000;box-shadow:0 2px 8px rgba(0,0,0,0.2);flex-shrink:0}' +
    '    .ve-toolbar-left{display:flex;align-items:center;gap:4px;flex:0 1 auto;min-width:0;overflow:hidden}' +
    '    .ve-toolbar-right{display:flex;align-items:center;gap:4px;flex-shrink:0}' +
    '    .ve-title{color:#999;font-size:12px;font-weight:500;margin-right:4px;white-space:nowrap}' +
    '    .ve-divider{width:1px;height:20px;background:#3e3e3e;flex-shrink:0}' +
    '    .ve-btn{display:flex;align-items:center;justify-content:center;min-width:28px;width:28px;height:28px;border:none;background:#3e3e3e;color:#ccc;border-radius:3px;cursor:pointer;transition:all 0.2s;font-size:13px;flex-shrink:0}' +
    '    .ve-btn:hover{background:#4e4e4e;color:#fff}' +
    '    .ve-btn.active{background:#667eea;color:#fff}' +
    '    .ve-select{padding:4px 6px;background:#3e3e3e;color:#ccc;border:1px solid #4e4e4e;border-radius:3px;font-size:12px;cursor:pointer;flex-shrink:0}' +
    '    .ve-select:hover{background:#4e4e4e}' +
    '    .ve-color-picker{width:28px;height:28px;border:none;border-radius:3px;cursor:pointer;background:transparent;flex-shrink:0;padding:0}' +
    '    .ve-save-btn{display:flex;align-items:center;gap:4px;padding:5px 12px;background:#667eea;color:white;border:none;border-radius:3px;font-size:12px;cursor:pointer;transition:background 0.2s;flex-shrink:0;white-space:nowrap}' +
    '    .ve-save-btn:hover{background:#5568d3}' +
    '    .ve-exit-btn{display:flex;align-items:center;gap:4px;padding:5px 10px;background:#3e3e3e;color:#ccc;border:none;border-radius:3px;font-size:12px;cursor:pointer;transition:background 0.2s;flex-shrink:0;white-space:nowrap}' +
    '    .ve-exit-btn:hover{background:#4e4e4e;color:#fff}' +
    '    .ve-content{margin-top:48px;width:100%;height:calc(100vh - 48px);overflow:auto;background:#fff;padding:20px}' +
    '    .ve-content-inner{width:100%;min-height:100%;position:relative}' +
    '    [contenteditable="true"]{outline:2px dashed #667eea;outline-offset:2px}' +
    '    [contenteditable="true"]:focus{outline:2px solid #667eea}' +
    '    .ve-img-wrapper{position:relative;display:inline-block}' +
    '    .ve-img-wrapper:hover::after{content:"点击替换图片";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:8px 16px;background:rgba(0,0,0,0.8);color:white;font-size:13px;border-radius:4px;pointer-events:none;white-space:nowrap}' +
    '    .ve-img-wrapper:hover img{opacity:0.7}' +
    '    .ve-hint{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:10px 20px;background:rgba(0,0,0,0.8);color:white;font-size:13px;border-radius:20px;z-index:10001;pointer-events:none;animation:veFadeIn 0.3s ease}' +
    '    @keyframes veFadeIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}' +
    '    .ve-hidden-input{display:none}' +
    '    .ve-img-dialog{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:10002;min-width:320px;display:none}' +
    '    .ve-img-dialog.show{display:block}' +
    '    .ve-img-dialog-title{font-size:16px;font-weight:500;margin-bottom:15px;color:#333}' +
    '    .ve-img-dialog-preview{width:100%;height:150px;background:#f5f5f5;border:1px dashed #ddd;border-radius:4px;margin-bottom:15px;display:flex;align-items:center;justify-content:center;overflow:hidden}' +
    '    .ve-img-dialog-preview img{max-width:100%;max-height:100%;object-fit:contain}' +
    '    .ve-img-dialog-preview.empty{color:#999;font-size:13px}' +
    '    .ve-img-dialog-row{display:flex;gap:10px;margin-bottom:10px}' +
    '    .ve-img-dialog-col{flex:1}' +
    '    .ve-img-dialog-col label{display:block;font-size:12px;color:#666;margin-bottom:4px}' +
    '    .ve-img-dialog-col input{width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:13px}' +
    '    .ve-img-dialog-buttons{display:flex;gap:8px}' +
    '    .ve-img-dialog-btn{flex:1;padding:8px;border:none;border-radius:4px;font-size:13px;cursor:pointer}' +
    '    .ve-img-dialog-btn.primary{background:#667eea;color:white}' +
    '    .ve-img-dialog-btn.primary:hover{background:#5568d3}' +
    '    .ve-img-dialog-btn.cancel{background:#e5e5e5;color:#333}' +
    '    .ve-img-dialog-btn.cancel:hover{background:#d5d5d5}' +
    '  </style>' +
    '</head>' +
    '<body>' +
    '  <div class="ve-toolbar">' +
    '    <div class="ve-toolbar-left">' +
    '      <span class="ve-title">可视化编辑器</span>' +
    '      <div class="ve-divider"></div>' +
    '      <input type="color" id="veColorPicker" class="ve-color-picker" value="#333333" title="文字颜色">' +
    '      <button id="veApplyColor" class="ve-btn" title="应用颜色">C</button>' +
    '      <div class="ve-divider"></div>' +
    '      <select id="veFontSize" class="ve-select" title="字体大小">' +
    '        <option value="12px">12</option>' +
    '        <option value="14px">14</option>' +
    '        <option value="16px" selected>16</option>' +
    '        <option value="18px">18</option>' +
    '        <option value="20px">20</option>' +
    '        <option value="24px">24</option>' +
    '        <option value="32px">32</option>' +
    '      </select>' +
    '      <button id="veApplySize" class="ve-btn" title="应用大小">S</button>' +
    '      <div class="ve-divider"></div>' +
    '      <button id="veBold" class="ve-btn" title="加粗">B</button>' +
    '      <button id="veItalic" class="ve-btn" title="斜体">I</button>' +
    '      <button id="veUnderline" class="ve-btn" title="下划线">U</button>' +
    '    </div>' +
    '    <div class="ve-toolbar-right">' +
    '      <button class="ve-save-btn" id="veSave">保存修改</button>' +
    '      <button class="ve-exit-btn" id="veExit">关闭</button>' +
    '    </div>' +
    '  </div>' +
    '  <div class="ve-content" id="veContent"><div class="ve-content-inner"></div></div>' +
    '  <input type="file" id="veImageInput" class="ve-hidden-input" accept="image/*">' +
    '  <div class="ve-img-dialog" id="veImgDialog">' +
    '    <div class="ve-img-dialog-title">设置图片</div>' +
    '    <div class="ve-img-dialog-preview" id="veImgPreview">' +
    '      <span class="empty">暂无图片</span>' +
    '    </div>' +
    '    <div class="ve-img-dialog-row">' +
    '      <div class="ve-img-dialog-col">' +
    '        <label>宽度 (px)</label>' +
    '        <input type="number" id="veImgWidth" value="200" min="50" max="2000">' +
    '      </div>' +
    '      <div class="ve-img-dialog-col">' +
    '        <label>高度 (px)</label>' +
    '        <input type="number" id="veImgHeight" value="120" min="50" max="2000">' +
    '      </div>' +
    '    </div>' +
    '    <div class="ve-img-dialog-row">' +
    '      <button class="ve-img-dialog-btn primary" id="veImgSelectBtn">选择图片</button>' +
    '      <button class="ve-img-dialog-btn primary" id="veImgApplyBtn">应用</button>' +
    '      <button class="ve-img-dialog-btn cancel" id="veImgCancelBtn">取消</button>' +
    '    </div>' +
    '  </div>' +
    '  <script type="ve-data" id="veHtmlData" style="display:none">' + base64Html + '</scr' + 'ipt>' +
    '  <script>' +
    '    (function() {' +
    '      "use strict";' +
    '      let veContent, veContentInner, veColorPicker, veFontSize, veApplyColor, veApplySize;' +
    '      let veBold, veItalic, veUnderline, veSave, veExit, veImageInput;' +
    '      let veImgDialog, veImgPreview, veImgWidth, veImgHeight;' +
    '      let veImgSelectBtn, veImgApplyBtn, veImgCancelBtn;' +
    '      let currentReplacingImg = null;' +
    '      let selectedImgSrc = null;' +
    '' +
    '      function decodeBase64_utf8(str) {' +
    '        return decodeURIComponent(escape(atob(str)));' +
    '      }' +
    '' +
    '      function htmlEncode(str) {' +
    '        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\'/g, "&#039;");' +
    '      }' +
    '' +
    '      function makeTextEditable() {' +
    '        veContentInner.addEventListener("dblclick", function(e) {' +
    '          var target = e.target;' +
    '          var editableEl = target.closest("h1,h2,h3,h4,h5,h6,p,span,div,li,td,th,label,strong,em,u,b,i,small,mark,button,a,input,textarea");' +
    '          if (!editableEl) return;' +
    '          if (editableEl.closest(".ve-toolbar")) return;' +
    '          if (editableEl.closest(".ve-img-wrapper")) return;' +
    '          e.preventDefault();' +
    '          e.stopPropagation();' +
    '          e.stopImmediatePropagation();' +
    '          editableEl.setAttribute("contenteditable", "true");' +
    '          editableEl.focus();' +
    '          showHint("正在编辑...按 ESC 或点击外部退出编辑模式");' +
    '        }, true);' +
    '' +
    '        veContentInner.addEventListener("keydown", function(e) {' +
    '          if (e.key === "Escape" && e.target.getAttribute("contenteditable") === "true") {' +
    '            e.preventDefault();' +
    '            e.target.setAttribute("contenteditable", "false");' +
    '            e.target.blur();' +
    '            hideHint();' +
    '          }' +
    '        }, true);' +
    '' +
    '        veContentInner.addEventListener("focusout", function(e) {' +
    '          if (e.target.getAttribute("contenteditable") === "true") {' +
    '            e.target.setAttribute("contenteditable", "false");' +
    '            hideHint();' +
    '          }' +
    '        }, true);' +
    '      }' +
    '' +
    '      function makeImagesReplaceable() {' +
    '        veContentInner.querySelectorAll("img").forEach(function(img) {' +
    '          if (img.hasAttribute("data-ve-replaceable")) return;' +
    '          img.setAttribute("data-ve-replaceable", "true");' +
    '          img.style.cursor = "pointer";' +
    '        });' +
    '        veContentInner.addEventListener("click", function(e) {' +
    '          var target = e.target;' +
    '          if (target.tagName === "IMG" && target.hasAttribute("data-ve-replaceable")) {' +
    '            e.preventDefault();' +
    '            e.stopPropagation();' +
    '            currentReplacingImg = target;' +
    '            openImgDialog();' +
    '          }' +
    '        }, true);' +
    '      }' +
    '' +
    '      function openImgDialog() {' +
    '        selectedImgSrc = currentReplacingImg.src;' +
    '        veImgWidth.value = currentReplacingImg.offsetWidth || 200;' +
    '        veImgHeight.value = currentReplacingImg.offsetHeight || 120;' +
    '        updateImgPreview();' +
    '        veImgDialog.classList.add("show");' +
    '      }' +
    '' +
    '      function closeImgDialog() {' +
    '        veImgDialog.classList.remove("show");' +
    '        selectedImgSrc = null;' +
    '      }' +
    '' +
    '      function updateImgPreview() {' +
    '        veImgPreview.innerHTML = "";' +
    '        if (selectedImgSrc) {' +
    '          var img = document.createElement("img");' +
    '          img.src = selectedImgSrc;' +
    '          img.style.maxWidth = "100%";' +
    '          img.style.maxHeight = "100%";' +
    '          veImgPreview.appendChild(img);' +
    '        } else {' +
    '          veImgPreview.innerHTML = "<span class=\\"empty\\">暂无图片</span>";' +
    '        }' +
    '      }' +
    '' +
    '      function applyImageSettings() {' +
    '        if (!currentReplacingImg || !selectedImgSrc) return;' +
    '        var width = parseInt(veImgWidth.value) || 200;' +
    '        var height = parseInt(veImgHeight.value) || 120;' +
    '        currentReplacingImg.src = selectedImgSrc;' +
    '        currentReplacingImg.style.width = width + "px";' +
    '        currentReplacingImg.style.height = height + "px";' +
    '        closeImgDialog();' +
    '        showHint("图片设置已应用");' +
    '      }' +
    '' +
    '      function applyStyle(property, value) {' +
    '        const selection = window.getSelection();' +
    '        if (!selection.rangeCount) {' +
    '          showHint("请先选中要修改的文字");' +
    '          return;' +
    '        }' +
    '        const range = selection.getRangeAt(0);' +
    '        if (range.toString().trim() === "") {' +
    '          showHint("请先选中要修改的文字");' +
    '          return;' +
    '        }' +
    '        switch (property) {' +
    '          case "color":' +
    '            applyInlineStyle(range, "color", value);' +
    '            break;' +
    '          case "fontSize":' +
    '            applyInlineStyle(range, "fontSize", value);' +
    '            break;' +
    '          case "bold":' +
    '            applyInlineStyle(range, "fontWeight", "bold");' +
    '            break;' +
    '          case "italic":' +
    '            applyInlineStyle(range, "fontStyle", "italic");' +
    '            break;' +
    '          case "underline":' +
    '            applyInlineStyle(range, "textDecoration", "underline");' +
    '            break;' +
    '        }' +
    '        showHint("样式已应用");' +
    '      }' +
    '' +
    '      function applyInlineStyle(range, property, value) {' +
    '        const span = document.createElement("span");' +
    '        span.style[property] = value;' +
    '        try {' +
    '          range.surroundContents(span);' +
    '        } catch (e) {' +
    '          const fragment = range.extractContents();' +
    '          span.appendChild(fragment);' +
    '          range.insertNode(span);' +
    '        }' +
    '        selection.removeAllRanges();' +
    '        const newRange = document.createRange();' +
    '        newRange.selectNodeContents(span);' +
    '        selection.addRange(newRange);' +
    '      }' +
    '' +
    '      function setupEventListeners() {' +
    '        veColorPicker.addEventListener("input", function() {' +
    '          applyStyle("color", veColorPicker.value);' +
    '        });' +
    '        veApplyColor.addEventListener("click", function() {' +
    '          applyStyle("color", veColorPicker.value);' +
    '        });' +
    '        veFontSize.addEventListener("change", function() {' +
    '          applyStyle("fontSize", veFontSize.value);' +
    '        });' +
    '        veApplySize.addEventListener("click", function() {' +
    '          applyStyle("fontSize", veFontSize.value);' +
    '        });' +
    '        veBold.addEventListener("click", function() {' +
    '          applyStyle("bold");' +
    '        });' +
    '        veItalic.addEventListener("click", function() {' +
    '          applyStyle("italic");' +
    '        });' +
    '        veUnderline.addEventListener("click", function() {' +
    '          applyStyle("underline");' +
    '        });' +
    '        veImageInput.addEventListener("change", function(e) {' +
    '          var file = e.target.files[0];' +
    '          if (file) {' +
    '            if (!file.type.startsWith("image/")) {' +
    '              showHint("请选择图片文件");' +
    '              return;' +
    '            }' +
    '            var reader = new FileReader();' +
    '            reader.onload = function(e) {' +
    '              selectedImgSrc = e.target.result;' +
    '              updateImgPreview();' +
    '              veImageInput.value = "";' +
    '            };' +
    '            reader.readAsDataURL(file);' +
    '          }' +
    '        });' +
    '        veImgSelectBtn.addEventListener("click", function() {' +
    '          veImageInput.click();' +
    '        });' +
    '        veImgApplyBtn.addEventListener("click", function() {' +
    '          applyImageSettings();' +
    '        });' +
    '        veImgCancelBtn.addEventListener("click", function() {' +
    '          closeImgDialog();' +
    '        });' +
    '        veSave.addEventListener("click", function() {' +
    '          var modifiedHtml = veContentInner.innerHTML;' +
    '          window.parent.postMessage({type: "htmlVisualEditorSave", html: modifiedHtml}, "*");' +
    '          showHint("修改已保存");' +
    '        });' +
    '        veExit.addEventListener("click", function() {' +
    '          window.parent.postMessage({type: "htmlVisualEditorClose"}, "*");' +
    '        });' +
    '      }' +
    '' +
    '      function showHint(message) {' +
    '        var existingHint = document.querySelector(".ve-hint");' +
    '        if (existingHint) existingHint.remove();' +
    '        var hint = document.createElement("div");' +
    '        hint.className = "ve-hint";' +
    '        hint.textContent = message;' +
    '        document.body.appendChild(hint);' +
    '        setTimeout(function() { hint.remove(); }, 3000);' +
    '      }' +
    '' +
    '      function hideHint() {' +
    '        var hint = document.querySelector(".ve-hint");' +
    '        if (hint) hint.remove();' +
    '      }' +
    '' +
    '      document.addEventListener("DOMContentLoaded", function() {' +
    '        veContent = document.getElementById("veContent");' +
    '        veContentInner = veContent.querySelector(".ve-content-inner");' +
    '        veColorPicker = document.getElementById("veColorPicker");' +
    '        veFontSize = document.getElementById("veFontSize");' +
    '        veApplyColor = document.getElementById("veApplyColor");' +
    '        veApplySize = document.getElementById("veApplySize");' +
    '        veBold = document.getElementById("veBold");' +
    '        veItalic = document.getElementById("veItalic");' +
    '        veUnderline = document.getElementById("veUnderline");' +
    '        veSave = document.getElementById("veSave");' +
    '        veExit = document.getElementById("veExit");' +
    '        veImageInput = document.getElementById("veImageInput");' +
    '        veImgDialog = document.getElementById("veImgDialog");' +
    '        veImgPreview = document.getElementById("veImgPreview");' +
    '        veImgWidth = document.getElementById("veImgWidth");' +
    '        veImgHeight = document.getElementById("veImgHeight");' +
    '        veImgSelectBtn = document.getElementById("veImgSelectBtn");' +
    '        veImgApplyBtn = document.getElementById("veImgApplyBtn");' +
    '        veImgCancelBtn = document.getElementById("veImgCancelBtn");' +
    '        try {' +
    '          var base64Data = document.getElementById("veHtmlData").textContent;' +
    '          var originalHtml = decodeBase64_utf8(base64Data);' +
    '          veContentInner.innerHTML = originalHtml;' +
    '        } catch (e) {' +
    '          console.error("Failed to decode HTML:", e);' +
    '          veContentInner.innerHTML = "<p style=\\"color:red; padding:20px;\\">加载失败：无法解析HTML内容</p>";' +
    '        }' +
    '        makeTextEditable();' +
    '        makeImagesReplaceable();' +
    '        setupEventListeners();' +
    '      });' +
    '    })();' +
    '  </scr' + 'ipt>' +
    '</body>' +
    '</html>'


  const blob = new Blob([fullEditorHtml], { type: 'text/html;charset=utf-8' })
  htmlVisualEditorIframeUrl.value = URL.createObjectURL(blob)
  htmlVisualEditorDialogVisible.value = true
}


const handleVisualEditorOpened = () => {

}


const handleVisualEditorClosed = () => {

  if (visualEditorIframeUrl.value) {
    URL.revokeObjectURL(visualEditorIframeUrl.value)
    visualEditorIframeUrl.value = ''
  }
}


const handleIframeLoad = () => {

}

const setCodeEditorDevice = (mode) => {
  codeEditorDeviceMode.value = mode
}

const toggleCodeEditorPanel = () => {
  codeEditorCollapsed.value = !codeEditorCollapsed.value
}


const toggleCodeEditorFullscreen = () => {
  codeEditorIsFullscreen.value = true
  document.body.style.overflow = 'hidden'
  codeEditorShowFullscreenHint.value = true
  clearTimeout(codeEditorHintTimer)
  codeEditorHintTimer = setTimeout(() => {
    codeEditorShowFullscreenHint.value = false
  }, 3000)
}

const exitCodeEditorFullscreen = () => {
  codeEditorIsFullscreen.value = false
  document.body.style.overflow = ''
}


onMounted(() => {

  document.addEventListener('keydown', handleKeydown)


  window.addEventListener('message', handleVisualEditorMessage)


  const savedHtml = localStorage.getItem('playground-html-code')
  if (savedHtml) {
    try {
      htmlCode.value = savedHtml
      htmlPreviewCode.value = savedHtml
    } catch (e) {}
  }

  const savedProject = localStorage.getItem('playground-code-editor-project')
  if (savedProject) {
    try {
      const project = JSON.parse(savedProject)
      files.value = project.files
      currentFileId.value = project.currentFileId || '1'
      openFiles.value = project.openFiles || files.value
    } catch (e) {}
  }
})

onBeforeUnmount(() => {
  clearTimeout(htmlUpdateTimer)
  clearTimeout(htmlHintTimer)
  clearTimeout(codeEditorUpdateTimer)
  clearTimeout(codeEditorHintTimer)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('message', handleVisualEditorMessage)


  if (lastPreviewBlobUrl) {
    URL.revokeObjectURL(lastPreviewBlobUrl)
    lastPreviewBlobUrl = null
  }


  localStorage.setItem('playground-html-code', htmlCode.value)
  localStorage.setItem('playground-code-editor-project', JSON.stringify({
    files: files.value,
    currentFileId: currentFileId.value,
    openFiles: openFiles.value
  }))
})


watch(htmlCode, () => {
  localStorage.setItem('playground-html-code', htmlCode.value)
})

watch(files, () => {
  localStorage.setItem('playground-code-editor-project', JSON.stringify({
    files: files.value,
    currentFileId: currentFileId.value,
    openFiles: openFiles.value
  }))
}, { deep: true })
</script>

<style lang="less" scoped>
.playground-container {
  display: flex;
  flex-direction: column;
  height: 100%;

}

.page-header {
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e8eaed;

  .header-left {
    h1 {
      font-size: 20px;
      font-weight: 500;
      color: #202124;
      margin: 0 0 4px 0;
    }

    .page-subtitle {
      font-size: 13px;
      color: #5f6368;
    }
  }
}

.panels-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}


.panel-section {
  background: white;
  border-radius: 8px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:last-child {
    margin-bottom: 0;
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  border-radius: 8px 8px 0 0;
  transition: background 0.2s;

  &:hover {
    background: #f8f9fa;
  }
}

.section-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-icon {
  font-size: 14px;
  color: #888;
  transition: transform 0.2s;

  &.expanded {
    transform: rotate(90deg);
  }
}

.section-left h2 {
  font-size: 15px;
  font-weight: 500;
  color: #202124;
  margin: 0;
}

.section-desc {
  font-size: 12px;
  color: #888;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
}

.section-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.section-content {
  border-top: 1px solid #e8eaed;

  &.is-fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    border-radius: 0;
  }
}


.fullscreen-hint-box {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  z-index: 10000;
  pointer-events: none;
}

.hint-text {
  font-size: 13px;
  color: #fff;
  white-space: nowrap;
  letter-spacing: 0.5px;
}


.fade-enter-active {
  transition: opacity 0.4s ease;
}

.fade-leave-active {
  transition: opacity 0.6s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}


.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.3s ease;
  transform-origin: top;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: scaleY(0);
  max-height: 0;
}

.panel-slide-enter-to,
.panel-slide-leave-from {
  opacity: 1;
  transform: scaleY(1);
  max-height: 600px;
}


.code-panel,
.preview-panel {
  display: flex;
  flex-direction: column;
  height: 500px;
  overflow: hidden;
}


.section-content.is-fullscreen {
  display: flex;
  flex-direction: column;
  height: 100vh;

  :deep(.splitpanes) {
    height: 100%;
  }

  .code-panel,
  .preview-panel {
    height: 100%;
  }

  .explorer-panel {
    height: 100%;
  }
}

.code-panel {
  background: #1e1e1e;
}

.preview-panel {
  background: white;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #2d2d2d;
  border-bottom: 1px solid #3e3e3e;
  min-height: 36px;

  .panel-title {
    font-size: 13px;
    color: #ccc;
    font-weight: 500;
  }

  .panel-status {
    font-size: 12px;
    color: #888;
  }

  .panel-actions {
    display: flex;
    gap: 6px;
    align-items: center;

    button {
      background: none;
      border: none;
      color: #888;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        background: #3e3e3e;
        color: #ccc;
      }

      span {
        font-size: 12px;
      }
    }

    .refresh-btn.is-refreshing :deep(.el-icon) {
      animation: spin 0.5s linear;
    }

    .visual-edit-btn {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}


.explorer-panel {
  display: flex;
  flex-direction: column;
  height: 500px;
  background: #252526;
  border-right: 1px solid #3e3e3e;
}

.explorer-panel .panel-header {
  background: #2d2d2d;
  border-bottom: 1px solid #3e3e3e;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;

  .panel-title {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    font-size: 13px;
    color: #ccc;
    font-weight: 500;
  }

  .panel-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    color: #888;
    transition: all 0.2s;

    &:hover {
      background: #3e3e3e;
      color: #ccc;
    }

    .el-icon {
      font-size: 14px;
    }
  }

  :deep(.el-button) {
    padding: 4px 8px;
    height: 24px;
    font-size: 12px;
  }

  :deep(.el-button .el-icon) {
    font-size: 12px;
  }
}

.explorer-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.project-info {
  padding: 10px 16px 6px;

  .project-name {
    font-size: 12px;
    color: #fff;
    font-weight: 500;
  }

  .file-count {
    font-size: 11px;
    color: #888;
    margin-top: 2px;
  }
}

.file-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #1e1e1e;
  }

  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;

    &:hover {
      background: #666;
    }
  }
}


.folder-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px 4px;
  font-size: 12px;
  color: #9aa0a6;
  font-weight: 500;
  user-select: none;

  .el-icon {
    font-size: 14px;
  }
}

.file-item {
  display: flex;
  align-items: center;
  padding: 5px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;

  &:hover {
    background: #2a2d2e;
  }

  &.active {
    background: #37373d;

    .file-name {
      color: #fff;
    }
  }

  .file-icon {
    color: #888;
    margin-right: 6px;
    font-size: 14px;
  }

  .file-name {
    flex: 1;
    font-size: 13px;
    color: #cccccc;
  }

  .file-name-input {
    flex: 1;
    background: #3c3c3c;
    border: 1px solid #007acc;
    color: #fff;
    font-size: 13px;
    padding: 2px 6px;
    outline: none;
    border-radius: 2px;
  }

  .file-status {
    color: #007acc;
    font-size: 8px;
    margin-left: auto;
  }


  &.is-image {
    .file-icon {
      color: #a5d6ff;
    }

    &:hover {
      background: #2a2d2e;
    }
  }


  &.is-font {
    .file-icon {
      color: #b4a0ff;
    }
  }


  &.is-binary {
    cursor: default;

    &:hover {
      background: transparent;
    }
  }

  .file-binary-tag {
    font-size: 10px;
    color: #888;
    background: #3c3c3c;
    padding: 1px 4px;
    border-radius: 2px;
    margin-left: auto;
  }


  .file-actions {
    display: flex;
    gap: 4px;
    margin-left: auto;
    opacity: 0;
    transition: opacity 0.15s;
  }

  &:hover .file-actions {
    opacity: 1;
  }

  &.is-image .file-actions {
    opacity: 1;
  }

  .file-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
    color: #888;
    transition: all 0.15s;

    &:hover {
      background: #3e3e3e;
      color: #4a90e2;
    }

    .el-icon {
      font-size: 12px;
    }
  }
}

.explorer-footer {
  padding: 6px 12px;
  border-top: 1px solid #3e3e3e;
}


.file-tabs {
  display: flex;
  flex: 1;
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 0;
  }
}

.file-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  cursor: pointer;
  background: #2d2d2d;
  border-right: 1px solid #3e3e3e;
  min-width: fit-content;
  transition: background 0.15s;

  &:hover {
    background: #323232;
  }

  &.active {
    background: #1e1e1e;

    .tab-name {
      color: #fff;
    }
  }

  .tab-icon {
    font-size: 13px;
    color: #888;
  }

  .tab-name {
    font-size: 12px;
    color: #969696;
  }

  .tab-close {
    display: flex;
    align-items: center;
    font-size: 11px;
    color: #888;
    opacity: 0;
    transition: opacity 0.15s;

    &:hover {
      color: #fff;
    }
  }

  &:hover .tab-close {
    opacity: 1;
  }

  &.active .tab-close {
    opacity: 1;
  }
}


.code-editor-wrapper {
  flex: 1;
  overflow: hidden;

  :deep(.cm-editor) {
    height: 100%;
  }

  :deep(.cm-scroller) {
    overflow: auto;
  }

  :deep(.cm-scroller::-webkit-scrollbar) {
    width: 10px;
    height: 10px;
  }

  :deep(.cm-scroller::-webkit-scrollbar-track) {
    background: #1e1e1e;
  }

  :deep(.cm-scroller::-webkit-scrollbar-thumb) {
    background: #555;
    border-radius: 5px;

    &:hover {
      background: #666;
    }
  }
}


.preview-panel .panel-header {
  background: #f5f5f5;
  border-bottom: 1px solid #e8eaed;

  .panel-title {
    color: #333;
  }

  .panel-actions {
    button {
      color: #666;

      &:hover {
        background: #e8eaed;
        color: #333;
      }
    }

    .visual-edit-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      background: transparent;
      color: #666;
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        background: #e8eaed;
        color: #333;
      }

      .el-icon {
        font-size: 14px;
      }
    }
  }
}

.device-toggle {
  display: flex;
  background: #e8eaed;
  border-radius: 6px;
  padding: 2px;
}

.device-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #333;
  }

  &.active {
    background: white !important;
    color: #2ecc71 !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    font-weight: 600;
  }

  span {
    font-size: 11px;
  }
}

.divider {
  width: 1px;
  height: 18px;
  background: #e8eaed;
  margin: 0 4px;
}

.preview-content {
  flex: 1;
  position: relative;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: auto;
  align-items: stretch;

  &.is-mobile {
    background: #e8eaed;
    padding: 20px;

    .preview-iframe {
      width: 375px;
      height: 100%;
      min-height: 667px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
  }
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}


@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

:deep(.el-button) {
  height: 32px;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 13px;
}

:deep(.splitpanes) {
  background: #f8f9fa;
}

:deep(.splitpanes__pane) {
  background: none;
  overflow: hidden;
}

:deep(.splitpanes__splitter) {
  position: relative;
  background: #e8eaed;
  z-index: 100;
  flex-shrink: 0;
}

:deep(.splitpanes__splitter:before) {
  content: '';
  position: absolute;
  left: -4px;
  top: 0;
  right: -4px;
  bottom: 0;
  background: transparent;
  opacity: 1;
  z-index: 1;
}

:deep(.splitpanes__splitter:after) {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: #e8eaed;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
  pointer-events: none;
}

:deep(.splitpanes__splitter:hover:after) {
  opacity: 1;
  background: #667eea;
}

:deep(.splitpanes__splitter:hover) {
  background: #667eea;
}

:deep(.splitpanes__dragging) {
  cursor: col-resize;
}

:deep(.splitpanes__splitter__dragging:after) {
  background: #667eea !important;
}


.import-dialog-content {
  .import-tips {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #e8f0fe;
    border-radius: 8px;
    color: #1967d2;
    font-size: 13px;
    margin-bottom: 16px;

    .el-icon {
      font-size: 18px;
    }
  }

  .search-section {
    margin-bottom: 16px;
  }

  .landing-page-list {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #e8eaed;
    border-radius: 8px;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: #f8f9fa;
    }

    &::-webkit-scrollbar-thumb {
      background: #dadce0;
      border-radius: 3px;

      &:hover {
        background: #bdc1c6;
      }
    }

    .landing-page-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #e8eaed;
      cursor: pointer;
      transition: background 0.2s;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: #f8f9fa;
      }

      &.selected {
        background: #e8f0fe;

        .item-name {
          color: #1a73e8;
        }
      }

      .item-info {
        flex: 1;
        min-width: 0;

        .item-name {
          font-size: 14px;
          font-weight: 500;
          color: #202124;
          margin-bottom: 4px;
        }

        .item-url {
          font-size: 12px;
          color: #5f6368;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 4px;
        }

        .item-meta {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #9aa0a6;

          .item-path,
          .item-version {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      }

      .item-status {
        flex-shrink: 0;
        margin-left: 12px;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #9aa0a6;

      .el-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }

      p {
        margin: 0;
        font-size: 14px;
      }
    }
  }
}


.image-preview-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  max-height: 60vh;
  overflow: hidden;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;

  img {
    max-width: 100%;
    max-height: 55vh;
    object-fit: contain;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }
}



:global(.image-preview-dialog) {
  z-index: 20001 !important;
}

:global(.el-overlay.image-preview-dialog-overlay) {
  z-index: 20000 !important;
}
</style>

<!-- 全局样式：确保图片预览对话框在全屏时也能显示 -->
<style>
/* HTML 文件选择器下拉菜单 - 确保全屏时也能显示 */
.html-file-select-dropdown {
  z-index: 20003 !important;
}

/* 图片预览对话框的遮罩层 - 使用极高的 z-index 确保全屏时也能显示 */
.el-overlay.image-preview-dialog-overlay {
  z-index: 20000 !important;
}

/* 图片预览对话框本身 */
.el-dialog.image-preview-dialog {
  z-index: 20001 !important;
}

/* 可视化编辑器对话框 */
.visual-editor-dialog {
  overflow: hidden;
}

.visual-editor-dialog .el-dialog__header {
  padding: 15px 20px;
  border-bottom: 1px solid #ebeef5;
}

.visual-editor-dialog .el-dialog__body {
  padding: 0;
  height: 70vh;
  overflow: hidden;
}

.visual-editor-wrapper {
  width: 100%;
  height: 100%;
}

.visual-editor-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

/* 全屏模式下可视化编辑器对话框 */
.visual-editor-dialog.is-fullscreen .el-dialog__body {
  height: calc(100vh - 60px);
}
</style>
