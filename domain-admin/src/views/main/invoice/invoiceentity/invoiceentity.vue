<template>
  <div class="entity-page">
    <!-- 表格列表 -->
    <entity-content
      :content-config="contentConfig"
      @new-click="handleNewClick"
      @edit-click="handleEditClick"
    />

    <!-- 弹窗 -->
    <entity-modal
      ref="modalRef"
      :modal-config="modalConfig"
    />
  </div>
</template>

<script setup>
import EntityContent from './c-cpns/entity-content.vue'
import contentConfig from './config/content.config'
import EntityModal from './c-cpns/entity-modal.vue'
import modalConfig from './config/modal.config'
import { ref } from 'vue'

const modalRef = ref()


function handleNewClick() {
  modalRef.value?.setModalVisible('new')
}

function handleEditClick(rowData) {
  modalRef.value?.setModalVisible('edit', rowData)
}
</script>

<style lang="less">
.entity-page {
  width: 100%;
  height: 100%;
}
</style>
