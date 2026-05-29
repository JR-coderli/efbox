<template>
  <div class="landingpage">
    <!-- 1、搜索区域 -->
    <el-button
      style="margin-bottom: 10px;"
      circle
      @click="showSearch = !showSearch"
    ><el-icon><Search /></el-icon>
    </el-button>
    <el-collapse-transition>
      <page-search
        v-show="showSearch"
        :search-config="searchConfig"
        @query-click="handleQueryClick"
        @reset-click="handleResetClick"
        @close-search="showSearch = false"
      />
    </el-collapse-transition>

    <!-- 2、列表内容区域 -->
    <page-content
      :content-config="contentConfig"
      ref="contentRef"
      @new-click="handleNewClick"
      @edit-click="handleEditClick"
      @upload-file="handleUploadFile"
    >
      <template #preview_url="scope">
        <div class="demo-image__preview">
          <el-image
            style="width: 100%; height: 100%"
            :src="scope[scope.prop]"
            :zoom-rate="1.2"
            :max-scale="7"
            :min-scale="0.2"
            :preview-src-list="[
              scope[scope.prop]
            ]"
            show-progress
            :initial-index="0"
            fit="contain"
            preview-teleported
            hide-on-click-modal
          />
        </div>
      </template>
      <template #status="scope">
        <el-tag
          v-if="scope.row[scope.prop] === 1"
          type="success"
          >正常</el-tag
        >
        <el-tag
          v-else-if="scope.row[scope.prop] === 0"
          type="danger"
          >异常</el-tag
        >
      </template>
    </page-content>

    <!-- 3、弹窗区域 -->
    <page-modal
      ref="modalRef"
      :modal-config="modalConfig"
      :upload-ref="uploadRef"
      @prod-insert-Id="handleProdInsertIdClick"
      @prod-pic-url="handleProdPicUrl"
    >

      <!-- ①、action接口地址 ②、method请求方式 ③、headers请求头(可用于携带token) ④、name原input标签的name属性  ⑤、drag是否允许拖拽上传   ⑥、auto-upload是否选择图片后就直接上传图片给后端 ⑦、show-file-list  是否显示选中的图片列表 ⑧、list-type图片列表显示的样式(单文字/单图片/文字+图片) ⑨、limit限制可以上传的图片数量  ⑩、on-exceed事件, 通常和limit属性一起用, 当上传的图片超过limit属性值的个数时, 就会触发on-exceed事件, 监听到这个事件可以进行替换图片、提醒用户等操作。
        11、 :on-success="文件上传成功执行的函数" 12、:before-upload="文件上传之前执行的函数" 13、multiple是否允许多选文件 13、file-list: 当前选中的图片 14、on-change, 文件状态改变时的钩子，添加文件、上传成功和上传失败时都会被调用
        -->
      <template #preview_url>
        <el-upload
          ref="uploadRef"
          class="avatar-uploader"
          :action="uploadUrl"
          method="post"
          :headers="headersObj"
          name="landingpage_preview"
          :auto-upload="false"
          show-file-list
          list-type="picture"
          :limit="1"
          :on-exceed="handleExceed"
          v-model:file-list="fileList"
          :on-change="handleChange"
        >
          <el-icon class="avatar-uploader-icon"><Plus /></el-icon>
        </el-upload>
      </template>
    </page-modal>

    <page-upload-modal
      ref="uploadModalRef"
      page-name="landingpage"
      upload-url="/file/landingpage"
      file-name="landingpage_file"
    />
  </div>
</template>

<script setup>
import PageSearch from '@/components/page-search/page-search.vue'
import searchConfig from './config/search.config'

import PageContent from '@/components/page-content/page-content.vue'
import contentConfig from './config/content.config'

import PageModal from '@/components/page-modal/page-modal.vue'
import modalConfig from './config/modal.config'

import PageUploadModal from '@/components/page-upload-modal/page-upload-modal.vue'

import usePageContent from '@/hooks/usePageContent';
import usePageModal from '@/hooks/usePageModal'

import { ref } from 'vue';
import useLoginStore from '@/stores/login/login'
import { BASE_URL } from '@/services/request/config'


const { contentRef, handleQueryClick, handleResetClick } = usePageContent()


const { modalRef, handleNewClick, handleEditClick, uploadModalRef, handleUploadFile } = usePageModal(newCallBack)


const loginStore = useLoginStore()
const token = loginStore.token


const uploadRef = ref()
let uploadUrl = ref(`${BASE_URL}/file/landingpage_preview/1`)
const headersObj = {
  "Authorization": `Bearer ${token}`, // 从 localStorage 中获取 Token
}
const fileList = ref()



const handleExceed = (files, uploadFiles) => {
  ElMessage.warning(
    `限制为1张图片, 您本次选择了${files.length}张图片, 总共${files.length + uploadFiles.length}张图片。`
  )
}


const handleChange = (uploadFile, uploadFiles) => {

  const allowedTypes = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp'];


  if (uploadFile.raw && !allowedTypes.includes(uploadFile.raw.type)) {
    ElMessage.error(`允许上传的图片类型为: jpeg、png、jpg、webp, 您上传的图片格式为: ${uploadFile.raw.type}`)

    fileList.value?.pop() // 移除最后一个选中的图片
  } 
  else if (uploadFile.size && uploadFile.size / 1024 / 1024 > 3) { // ②、检查文件大小
    ElMessage.error(`图片大小不能超过3MB!, 您上传的图片大小为${(uploadFile.size / 1024 / 1024).toFixed(2)}M`)

    fileList.value?.pop() // 移除最后一个选中的图片
  }
}



function handleProdInsertIdClick(insertId) {
  uploadUrl.value = `${BASE_URL}/file/landingpage_preview/${insertId}`
}


function handleProdPicUrl(picture_url) {
  if (picture_url) {
    fileList.value = [{ url: picture_url }]
  } else {
    fileList.value = []
  }
}


function newCallBack() {
  uploadRef.value?.clearFiles()
}


const showSearch = ref(false)

</script>

<style lang="less" scoped>
:deep(.el-image img) {
  height: 80px;
}


.preview_img {
  width: 135px;
  height: 80px;
}


:deep(.el-image-viewer__wrapper) {
  z-index: 3000 !important;
}


.el-icon.avatar-uploader-icon { // 还没上传图片时, 上传的提示框的样式
  font-size: 28px;
  color: #8c939d;
  width: 250px;
  height: 130px;
  text-align: center;
}
:deep(.el-upload.el-upload--picture) {
  border: 1px dotted #dcdfe6;

  &:hover {
    border-color: rgb(159.5, 206.5, 255);
  }
}


</style>
