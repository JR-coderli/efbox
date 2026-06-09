<template>
  <div class="customer">
    
    <!-- 表格列表 -->
    <customer-content 
      :content-config="contentConfig"
      @new-click="handleNewClick"
      @edit-click="handleEditClick"
    >
      <!-- 1. normal_emails -->
      <template #normal_emails="scope">
        <div v-if="scope.normal_emails && scope.normal_emails.length !== 0">
          <div v-for="item in scope.normal_emails" :key="item.id">
            {{ item.email }}
          </div>
        </div>
        <div v-else>-</div>
      </template>

      <!-- 2. send_emails -->
      <template #send_emails="scope">
        <div v-if="scope.send_emails && scope.send_emails.length !== 0">
          <div v-for="item in scope.send_emails" :key="item.id">
            {{ item.email }}
          </div>
        </div>
        <div v-else>-</div>
      </template>


      <!-- 3. 付款周期（通用编辑单元格） -->
      <template #payment_cycle_days="scope">
        <!-- 非编辑状态 -->
        <div 
          v-if="!isEditing(scope.id, 'payment_cycle_days')" 
          @dblclick="startEdit(scope.id, 'payment_cycle_days', scope.payment_cycle_days)"
        >
          {{ scope.payment_cycle_days ?? '-' }}
        </div>

        <!-- 编辑状态 -->
        <div v-else>
          <input
            type="number"
            v-model="editingCell.value"
            ref="inputRef"
            @blur="saveEdit"
            style="width: 80px;"
          />
        </div>
      </template>


      <!-- 4. 备注（通用编辑单元格） -->
      <template #remark="scope">
        <!-- 非编辑状态 -->
        <div 
          v-if="!isEditing(scope.id, 'remark')" 
          @dblclick="startEdit(scope.id, 'remark', scope.remark)"
          :style="{ color: scope.remark ? '#000' : '#adadad' }"
        >
          {{ scope.remark || '(双击添加)' }}
        </div>

        <!-- 编辑状态 -->
        <div v-else>
          <textarea 
            v-model="editingCell.value"
            ref="inputRef"
            rows="2"
            @blur="saveEdit"
            style="width: 100%;"
          ></textarea>
        </div>
      </template>

    </customer-content>

    <!-- 弹窗 -->
    <customer-modal
      ref="modalRef"
      :modal-config="modalConfig"
    />
  </div>
</template>

<script setup>
import CustomerContent from './c-cpns/customer-content.vue'
import contentConfig from './config/content.config'
import CustomerModal from './c-cpns/customer-modal.vue'
import modalConfig from './config/modal.config'

import { nextTick, ref } from 'vue'
import useSystemStore from '@/stores/main/system/system'
const systemStore = useSystemStore()

/** ============================================
 * 通用编辑单元格结构
 * id: 哪一行
 * field: 哪个字段 (remark / payment_cycle_days / ...)
 * value: 当前输入的值
 * ============================================ */
const editingCell = ref({
  id: null,
  field: null,
  value: ''
})


const inputRef = ref(null)


function isEditing(id, field) {
  return editingCell.value.id === id && editingCell.value.field === field
}


function startEdit(id, field, value) {
  editingCell.value = {
    id,
    field,
    value
  }
  nextTick(() => {
    inputRef.value?.focus()
  })
}


function saveEdit() {
  const { id, field, value } = editingCell.value


  systemStore.editCustomerRemarkAction(id, { [field]: value })


  editingCell.value = { id: null, field: null, value: '' }
}





const modalRef = ref()


function handleNewClick() {
  modalRef.value?.setModalVisible('new')
}


function handleEditClick(rowData) {
  modalRef.value?.setModalVisible('edit', rowData)
}

</script>

<style scoped>
.customer {
  padding: 10px;
}
</style>
