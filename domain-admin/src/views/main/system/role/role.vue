<template>
  <div class="role-page">
    <!-- 角色列表 -->
    <role-content
      :content-config="contentConfig"
      @new-click="handleNewClick"
      @edit-click="handleEditClick"
    />

    <!-- 角色弹窗 -->
    <role-modal
      ref="modalRef"
      :modal-config="modalConfig"
      @success="handleModalSuccess"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import RoleContent from './c-cpns/role-content.vue'
import RoleModal from './c-cpns/role-modal.vue'
import contentConfig from './config/content.config.ts'
import modalConfig from './config/modal.config.ts'

const modalRef = ref()

function handleNewClick() {
  modalRef.value?.setModalVisible('new')
}

function handleEditClick(rowData) {
  modalRef.value?.setModalVisible('edit', rowData)
}

function handleModalSuccess() {

}
</script>

<style lang="less" scoped>
.role-page {
  width: 100%;
  height: 100%;
}
</style>
