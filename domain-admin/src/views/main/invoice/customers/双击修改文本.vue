<template>
  <div class="editable-text">
    <!-- 显示模式 -->
    <span v-if="!isEditing" @dblclick="startEdit">
      {{ text }}
    </span>

    <!-- 编辑模式 -->
    <input
      v-else
      v-model="editText"
      ref="inputRef"
      @blur="saveEdit"
      @keyup.enter="saveEdit"
    />
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const text = ref('双击修改我')
const editText = ref('')
const isEditing = ref(false)
const inputRef = ref(null)


function startEdit() {
  editText.value = text.value
  isEditing.value = true


  nextTick(() => {
    inputRef.value.focus()
  })
}


function saveEdit() {
  text.value = editText.value.trim() || text.value // 防止空输入
  isEditing.value = false
}
</script>

<style scoped>
.editable-text {
  font-size: 18px;
  cursor: pointer;
  user-select: none;
}

.editable-text input {
  font-size: 18px;
  padding: 4px 8px;
  width: 200px;
}
</style>
