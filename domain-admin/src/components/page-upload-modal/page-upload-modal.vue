<template>
  <div class="page-upload-modal">
    <el-dialog
      v-model="dialogVisible"
      title="批量新增"
      width="500"
      center
      :fullscreen="false"
    >
      <el-upload
        ref="uploadRef"
        :action="BASE_URL + uploadUrl"
        method="post"
        :headers="headersObj"
        :name="fileName"
        drag
        :auto-upload="false"
        show-file-list
        :limit="1"
        :on-exceed="handleExceed"
        v-model:file-list="fileList"
        :on-change="handleChange"
        :on-success="handleUploadSuccess"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将文件拖放到此处或 <em>单击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip" v-if="!fileList || fileList.length === 0">
            仅支持excel格式的文件
          </div>
        </template>
      </el-upload>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleConfirmClick">
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { BASE_URL } from '@/services/request/config';
import useLoginStore from '@/stores/login/login';
import useSystemStore from '@/stores/main/system/system';
import { ref } from 'vue';



const dialogVisible = ref(false); // 控制弹窗的显示和隐藏


const props = defineProps({
  pageName: {
    type: String,
    required: true
  },
  uploadUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  }
})


const loginStore = useLoginStore()
const token = loginStore.token


const uploadRef = ref()
const headersObj = {
  "Authorization": `Bearer ${token}`, // 从 localStorage 中获取 Token
}
const fileList = ref()



const handleExceed = (files, uploadFiles) => {
  ElMessage.warning(
    `限制上传一个文件, 您本次选择了${files.length}个文件, 总共${files.length + uploadFiles.length}个文件。`
  )
}


const handleChange = (uploadFile, uploadFiles) => {

  const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];


  if (uploadFile.raw && !allowedTypes.includes(uploadFile.raw.type)) {
    ElMessage.error(`允许上传的文件类型为: xlsx、xls, 您上传的图片格式为: ${uploadFile.raw.type}`)

    fileList.value?.pop() // 移除最后一个选中的文件
  } 
  else if (uploadFile.size && uploadFile.size / 1024 / 1024 > 3) { // ②、检查文件大小
    
    ElMessage.error(`文件大小不能超过3MB!, 您上传的文件大小为${(uploadFile.size / 1024 / 1024).toFixed(2)}M`)

    fileList.value?.pop() // 移除最后一个选中的文件
  }
}



const handleConfirmClick = () => {

  if (!fileList.value || fileList.value.length === 0) {
    ElMessage.error('请选择上传的文件')
    return
  }
  dialogVisible.value = false;
  uploadRef.value?.submit() // 调用elementplus提供的el-upload元素对象的submit方法可以手动将图片文件上传。
};

const systemStore = useSystemStore()
const handleUploadSuccess = (response) => {

  if (response.error) {
    ElMessage.error(response.error) // 假设接口返回的数据有 error 字段
    return
  }


  ElMessage({
    message: response.message, // 假设接口返回的数据有 message 字段
    type: 'success',
    plain: true,
    duration: 750
  })


  if (props.pageName === 'domains') {
    systemStore.postPageListAction('domains', { offset: 0, size: 10 }, 'import_list')
    systemStore.postPageListAction('domains', { offset: 0, size: 10 }, 'normal_list')
    return
  }

  systemStore.postPageListAction(props.pageName, { offset: 0, size: 10 })
}


function setModalVisible() {
  dialogVisible.value = true // 显示弹窗
  uploadRef.value?.clearFiles() // 清空上传的文件列表
}


defineExpose({ setModalVisible })
</script>

<style lang="less" scoped>

</style>
