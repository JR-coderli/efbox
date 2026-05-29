<template>
  <div class="modal">
    <el-dialog
      v-model="dialogVisible"
      :title="isNewRef ? modalConfig.header.newTitle : modalConfig.header.editTitle"
      width="500"
      style="max-width: 90vw;"
      center
      :fullscreen="modalConfig.fullscreen"
    >
      <div class="form">
        <el-form ref="formRef" :model="formData" :rules="formRules" :label-width="modalConfig.labelWidth ?? '100px'" size="large">
          <template v-for="item in modalConfig.formItems" :key="item.prop">
            <el-form-item :label="item.label" :prop="item.prop">
              <template v-if="item.type === 'input'">
                
                <el-input
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  clearable
                  v-if="item.prop == 'landing_path'"
                  @focus="handleLandingPathFocus"
                />
                <el-input
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  clearable
                  v-else-if="item.prop == 'existing_domain'"
                  @focus="handleExistingDomainFocus"
                />
                <el-input
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  clearable
                  v-else
                />
              </template>
              <template v-if="item.type === 'date-picker'">
                <el-date-picker
                  v-model="formData[item.prop]"
                  type="daterange"
                  range-separator="-"
                  start-placeholder="开始时间"
                  end-placeholder="结束时间"
                  size="large"
                  clearable
                />
              </template>
              <template v-if="item.type === 'select'">
                <el-select
                  v-model="formData[item.prop]"
                  :placeholder="item.placeholder"
                  clearable
                >
                  <template v-for="option in item.options" :key="item.value">
                    <el-option :label="option.label" :value="option.value" />
                  </template>
                </el-select>
              </template>
              <template v-if="item.type === 'custom'">
                <slot :name="item.slotName"></slot>
              </template>
            </el-form-item>
          </template>
        </el-form>
      </div>
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
import useSystemStore from '@/stores/main/system/system'
import { reactive, ref, computed } from 'vue'
import { parse } from 'tldts'



const props = defineProps({
  modalConfig: {
    type: Object,
    default: () => ({})
  },
  uploadRef: {
    type: Object,
    default: () => ({})
  }
})
const emit = defineEmits(['prodInsertId', 'prodPicUrls', 'prodPicUrl'])


const dialogVisible = ref(false)
const formRef = ref()
const initialData = {}
for (const item of props.modalConfig.formItems) {
  initialData[item.prop] = item.initialValue
}
const formData = reactive({ ...initialData })
const isNewRef = ref(true) // 记录是否是新增用户
const editData = ref() // 记录编辑的用户的所有数据


const formRules = computed(() => {
  const rules = {}
  for (const item of props.modalConfig.formItems) {
    const fieldRules = []


    if (item.required) {
      fieldRules.push({ required: true, message: `请输入${item.label}`, trigger: 'blur' })
    }


    if (item.rules && Array.isArray(item.rules)) {
      fieldRules.push(...item.rules)
    }

    if (fieldRules.length > 0) {
      rules[item.prop] = fieldRules
    }
  }
  return rules
})


function setModalVisible(isNew = true, itemData, isProduct) {
  dialogVisible.value = true // 显示弹窗
  isNewRef.value = isNew // 记录是否是新增用户

  if (!isNew && itemData) {

    for (const key in formData) {
      formData[key] = itemData[key]
    }
    editData.value = itemData

    if (isProduct) {

      emit('prodPicUrl', itemData.preview_url)
    }
  } else {

    for (const key in formData) {
      formData[key] = initialData[key] // 重置为初始值
    }
    editData.value = null 
  }
}


const systemStore = useSystemStore()
function handleConfirmClick() {

  formRef.value?.validate((valid) => {
    if (!valid) {
      return // 验证失败，不继续执行
    }


    dialogVisible.value = false

    let infoData = formData
    if (props.otherInfo) {
      infoData = { ...infoData, ...props.otherInfo }
    }

  if (!isNewRef.value && editData.value) {


    systemStore.editPageDataAction(props.modalConfig.pageName, editData.value.id, infoData)


    if (props.modalConfig.pageName === 'landingpage') {


      emit('prodInsertId', editData.value.id)

      if (props.uploadRef) props.uploadRef?.submit() // 调用elementplus提供的el-upload元素对象的submit方法可以手动将图片文件上传。
    }
    
  } else {


    systemStore.newPageDataAction(props.modalConfig.pageName, infoData).then(prodInsertId => {


      if (props.modalConfig.pageName === 'product' || props.modalConfig.pageName === 'landingpage') {


        emit('prodInsertId', prodInsertId)

        if (props.uploadRef) props.uploadRef?.submit()

      }
    })
  }
  })
}



function handleLandingPathFocus() {

  const url = formData['landing_url']
  if (url) {
    try {

      const path = new URL(url).pathname
      formData['landing_path'] = path
    } catch (e) {

      const match = url.match(/^https?:\/\/[^/]+(\/[^?#]*)/)
      formData['landing_path'] = match ? match[1] : ''
    }
  }
}


function handleExistingDomainFocus() {

  const url = formData['landing_page_url']

  if (url) {
    const parsed = parse(url)
    formData['existing_domain'] = parsed.domain
  }






}


defineExpose({ setModalVisible, formData })
</script>

<style lang="less" scoped>
.form {
  padding: 0 20px;
}
</style>
