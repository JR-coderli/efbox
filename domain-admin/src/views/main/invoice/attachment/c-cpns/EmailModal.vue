<template>
  <el-dialog  title="发送邮件" @close="resetForm">
    <el-form :model="form" ref="formRef">
      <el-form-item label="收件人" prop="recipient" :rules="[{ required: true, message: '请输入收件人', trigger: 'blur' }]">
        <el-input v-model="form.recipient" placeholder="请输入收件人邮箱"></el-input>
      </el-form-item>
      <el-form-item label="邮件标题" prop="title" :rules="[{ required: true, message: '请输入邮件标题', trigger: 'blur' }]">
        <el-input v-model="form.title" placeholder="请输入邮件标题"></el-input>
      </el-form-item>
      <el-form-item label="邮件主题" prop="subject" :rules="[{ required: true, message: '请输入邮件主题', trigger: 'blur' }]">
        <el-input v-model="form.subject" placeholder="请输入邮件主题"></el-input>
      </el-form-item>
      <el-form-item label="邮件内容" prop="content" :rules="[{ required: true, message: '请输入邮件内容', trigger: 'blur' }]">
        <el-input type="textarea" v-model="form.content" placeholder="请输入邮件内容"></el-input>
      </el-form-item>
    </el-form>
    <span slot="footer" class="dialog-footer">
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="sendEmail">发送</el-button>
    </span>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps()
const emit = defineEmits()

const visible = ref(false)
const form = ref({
  recipient: '',
  title: '',
  subject: '',
  content: ''
})

const sendEmail = () => {

  formRef.value.validate((valid) => {
    if (valid) {

      emit('send', { ...form.value })
      resetForm()
      visible.value = false
    } else {
      console.log('error submit!!')
      return false
    }
  })
}

const resetForm = () => {
  form.value = {
    recipient: '',
    title: '',
    subject: '',
    content: ''
  }
}

const open = () => {
  visible.value = true
}

defineExpose({ open })
</script>