<template>
  <div class="editable-remark">
    <!-- 如果 domainId 无效，只显示文本 -->
    <span
      v-if="!isValidDomainId"
      class="remark-text readonly"
    >
      {{ displayText }}
    </span>
    <!-- 显示模式 -->
    <span
      v-else-if="!isEditing"
      class="remark-text"
      @dblclick="startEdit"
      title="双击编辑"
    >
      {{ displayText }}
    </span>

    <!-- 编辑模式 -->
    <el-input
      v-else
      v-model="editText"
      ref="inputRef"
      size="small"
      class="remark-input"
      @blur="saveEdit"
      @keyup.enter="saveEdit"
      @keyup.esc="cancelEdit"
    />
  </div>
</template>

<script setup>
import { ref, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import hyRequest from '@/services/request'

const props = defineProps({
  remark: {
    type: String,
    default: ''
  },
  domainId: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['updated'])

const isEditing = ref(false)
const editText = ref('')
const inputRef = ref(null)


const isValidDomainId = computed(() => {
  return props.domainId !== null && props.domainId !== undefined && !isNaN(props.domainId)
})


const displayText = computed(() => {
  return props.remark || '-'
})


function startEdit() {
  if (!isValidDomainId.value) return
  editText.value = props.remark || ''
  isEditing.value = true

  nextTick(() => {
    inputRef.value?.focus()
  })
}


async function saveEdit() {
  if (!isValidDomainId.value) {
    isEditing.value = false
    return
  }

  const newRemark = editText.value.trim()

  try {
    const res = await hyRequest.patch({
      url: `/domains/${props.domainId}/remark`,
      data: { remark: newRemark }
    })

    if (res.code === 0) {
      ElMessage.success('备注已更新')
      emit('updated')
    } else {
      ElMessage.error(res.message || '更新失败')
    }
  } catch (error) {
    console.error('更新备注失败:', error)
    ElMessage.error('更新失败')
  } finally {
    isEditing.value = false
  }
}


function cancelEdit() {
  isEditing.value = false
}
</script>

<style lang="less" scoped>
.editable-remark {
  display: inline-block;
  width: 100%;
}

.remark-text {
  display: inline-block;
  cursor: pointer;
  color: #606266;
  font-size: 13px;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.2s;
  user-select: none;

  &:hover {
    background-color: #f5f7fa;
    color: #409eff;
  }

  &.readonly {
    cursor: default;
    color: #909399;

    &:hover {
      background-color: transparent;
      color: #909399;
    }
  }

  &:empty::before {
    content: '-';
    color: #c0c4cc;
  }
}

.remark-input {
  width: 100px;

  :deep(.el-input__wrapper) {
    padding: 5px 8px;
  }
}
</style>
