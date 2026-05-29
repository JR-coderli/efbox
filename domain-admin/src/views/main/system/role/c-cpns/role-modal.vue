<template>
  <el-dialog
    v-model="dialogVisible"
    :title="mode === 'new' ? '新建角色' : '编辑角色'"
    width="600"
    style="max-width: 90vw;"
    top="8vh"
    :close-on-click-modal="false"
    class="google-dialog"
    destroy-on-close
    draggable
  >
    <div class="dialog-content">
      <div class="form-info" v-if="mode === 'edit' && editData">
        <span class="info-label">编辑角色</span>
        <span class="info-value">{{ editData.name }}</span>
      </div>

      <el-form
        :model="formData"
        ref="formRef"
        label-position="top"
        :rules="rules"
        class="google-form"
      >
        <!-- 角色名称 -->
        <el-form-item prop="name" label="角色名称">
          <el-input
            v-model="formData.name"
            placeholder="请输入角色名称"
            class="google-input"
          />
        </el-form-item>

        <!-- 角色描述 -->
        <el-form-item prop="intro" label="角色描述">
          <el-input
            v-model="formData.intro"
            type="textarea"
            :rows="1"
            placeholder="请输入角色描述（选填）"
            class="google-input"
          />
        </el-form-item>

        <!-- 菜单权限 -->
        <el-form-item label="菜单权限">
          <div class="menu-tree-container">
            <div class="tree-header">
              <el-checkbox
                :model-value="checkAll"
                :indeterminate="isIndeterminate"
                @update:model-value="handleCheckAll"
              >
                全选
              </el-checkbox>
              <span class="selected-count">已选: {{ checkedCount }} 项</span>
            </div>
            <div class="tree-wrapper">
              <el-tree
                ref="treeRef"
                :data="menuTree"
                :props="treeProps"
                show-checkbox
                node-key="id"
                check-strictly
                :default-checked-keys="defaultCheckedKeys"
                @check="handleMenuCheck"
                class="menu-tree"
              >
                <template #default="{ node, data }">
                  <span class="tree-node" :class="{ 'node-disabled': shouldDisableNode(data.id) }">
                    <span v-if="data.icon" class="node-icon">
                      <component :is="getIcon(data.icon)" />
                    </span>
                    <span class="node-label">{{ node.label }}</span>
                    <span v-if="data.permission" class="node-permission">{{ data.permission }}</span>
                  </span>
                </template>
              </el-tree>
            </div>
          </div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <button class="google-btn google-btn-text" @click="dialogVisible = false">
          取消
        </button>
        <button class="google-btn google-btn-primary" @click="handleConfirmClick" :disabled="isSubmitDisabled">
          {{ mode === 'new' ? '创建' : '保存' }}
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, ref, computed, nextTick } from 'vue'
import useSystemStore from '@/stores/main/system/system'
import useMainStore from '@/stores/main/main'
import useLoginStore from '@/stores/login/login'
import { storeToRefs } from 'pinia'
import hyRequest from '@/services/request'
import { localCache } from '@/utils/cache'
import {
  Monitor,
  Cpu,
  User,
  ChromeFilled,
  Setting,
  Tickets,
  Lock
} from '@element-plus/icons-vue'

const props = defineProps({
  modalConfig: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['success'])


const mainStore = useMainStore()
const { entireMenus } = storeToRefs(mainStore)
const loginStore = useLoginStore()

const systemStore = useSystemStore()


const TECHNICIAN_ROLE_ID = 1


const isTechnician = computed(() => {
  return loginStore.userInfo?.role_id === TECHNICIAN_ROLE_ID
})


const userMenuIds = computed(() => {
  const menus = loginStore.userMenus || []
  const ids = []
  function extractIds(menuList) {
    menuList.forEach(menu => {
      if (menu.id) ids.push(menu.id)
      if (menu.children && menu.children.length > 0) {
        extractIds(menu.children)
      }
    })
  }
  extractIds(menus)
  return ids
})


const iconMap = {
  Monitor,
  Cpu,
  User,
  ChromeFilled,
  Setting,
  Tickets,
  Lock
}

function getIcon(iconName) {
  return iconMap[iconName] || User
}


const treeProps = {
  children: 'children',
  label: 'name',
  disabled: (data) => shouldDisableNode(data.id)
}


const formRef = ref(null)
const dialogVisible = ref(false)
const mode = ref('new')
const editData = ref()
const isSubmitDisabled = ref(false)

const initialData = {
  name: '',
  intro: ''
}
const formData = reactive({ ...initialData })


const menuTree = ref([])
const treeRef = ref()
const defaultCheckedKeys = ref([])
const checkAll = ref(false)
const isIndeterminate = ref(false)


const editingRoleMenuIds = ref([])


const checkedCount = computed(() => {
  if (!treeRef.value) return 0
  const checkedKeys = treeRef.value.getCheckedKeys()
  return checkedKeys.length
})


const rules = computed(() => {
  return {
    name: [
      { required: true, message: '请输入角色名称', trigger: 'blur' },
      { min: 2, max: 20, message: '角色名称长度为2-20个字符', trigger: 'blur' }
    ]
  }
})


function shouldDisableNode(menuId) {
  if (isTechnician.value) return false

  return !userMenuIds.value.includes(menuId)
}


function filterMenuTree(menus, allowedMenuIds) {
  if (isTechnician.value) return menus

  const filtered = []
  menus.forEach(menu => {

    const hasPermission = allowedMenuIds.includes(menu.id) ||
      (menu.children && menu.children.some(child => allowedMenuIds.includes(child.id)))

    if (hasPermission) {
      const newMenu = { ...menu }
      if (menu.children && menu.children.length > 0) {
        newMenu.children = filterMenuTree(menu.children, allowedMenuIds)

        if (newMenu.children.length === 0) {
          delete newMenu.children
        }
      }
      filtered.push(newMenu)
    }
  })
  return filtered
}


async function fetchMenuTree(isEditMode = false, roleMenuIds = []) {
  try {
    const result = await hyRequest.post({
      url: '/menu/list'
    })
    if (result.code === 0) {
      const rawMenus = result.data.list || []

      if (isEditMode && !isTechnician.value) {

        editingRoleMenuIds.value = roleMenuIds

        const mergedMenuIds = [...new Set([...userMenuIds.value, ...roleMenuIds])]
        const filteredMenus = filterMenuTree(rawMenus, mergedMenuIds)
        menuTree.value = filteredMenus
      } else if (!isTechnician.value) {

        const filteredMenus = filterMenuTree(rawMenus, userMenuIds.value)
        menuTree.value = filteredMenus
      } else {

        menuTree.value = rawMenus
      }
    }
  } catch (error) {
    console.error('获取菜单列表失败:', error)
  }
}


function getEnabledLeafKeys(nodes) {
  const keys = []
  function traverse(node) {

    if (shouldDisableNode(node.id)) return

    if (!node.children || node.children.length === 0) {
      keys.push(node.id)
    } else {
      node.children.forEach(child => traverse(child))
    }
  }
  nodes.forEach(node => traverse(node))
  return keys
}


async function handleCheckAll() {

  const newState = !checkAll.value


  isUpdatingCheckAll.value = true

  try {
    const enabledKeys = getEnabledLeafKeys(menuTree.value)

    if (newState) {
      treeRef.value?.setCheckedKeys(enabledKeys)
    } else {
      treeRef.value?.setCheckedKeys([])
    }


    await nextTick()


    checkAll.value = newState
    isIndeterminate.value = false
  } finally {
    isUpdatingCheckAll.value = false
  }
}


const isUpdatingCheckAll = ref(false)


function syncCheckboxState() {
  if (!treeRef.value) return
  const enabledKeys = getEnabledLeafKeys(menuTree.value)
  const checkedKeys = treeRef.value.getCheckedKeys()
  checkAll.value = checkedKeys.length === enabledKeys.length && enabledKeys.length > 0
  isIndeterminate.value = checkedKeys.length > 0 && checkedKeys.length < enabledKeys.length
}


function handleMenuCheck() {

  if (isUpdatingCheckAll.value) return
  syncCheckboxState()
}


function updateCheckAllState() {
  syncCheckboxState()
}


async function setModalVisible(newMode = 'new', rowData) {
  dialogVisible.value = true
  mode.value = newMode

  if (mode.value === 'edit' && rowData) {
    formData.name = rowData.name || ''
    formData.intro = rowData.intro || ''
    editData.value = rowData


    const roleMenus = await getRoleMenusData(rowData.id)
    const roleMenuIds = extractMenuIds(roleMenus || [])  // 用于过滤菜单树和设置选中状态

    await fetchMenuTree(true, roleMenuIds)

    await nextTick()
    defaultCheckedKeys.value = roleMenuIds
    treeRef.value?.setCheckedKeys(roleMenuIds)
    updateCheckAllState()
  } else {
    formData.name = ''
    formData.intro = ''
    editData.value = null
    editingRoleMenuIds.value = []


    await fetchMenuTree(false)

    defaultCheckedKeys.value = []
    await nextTick()
    treeRef.value?.setCheckedKeys([])
    updateCheckAllState()
  }


  formRef.value?.clearValidate()
}


async function getRoleMenusData(roleId) {
  try {
    const result = await hyRequest.get({
      url: `/role/${roleId}/menu`
    })
    if (result.code === 0) {
      return result.data || []
    }
  } catch (error) {
    console.error('获取角色菜单失败:', error)
  }
  return []
}


function extractMenuIds(menuList) {
  const ids = []
  function traverse(menus) {
    menus.forEach(menu => {
      ids.push(menu.id)
      if (menu.children && menu.children.length > 0) {
        traverse(menu.children)
      }
    })
  }
  traverse(menuList)
  return ids
}


function extractLeafIds(menuList) {
  const ids = []
  function traverse(menus) {
    menus.forEach(menu => {
      if (!menu.children || menu.children.length === 0) {
        ids.push(menu.id)
      } else {
        traverse(menu.children)
      }
    })
  }
  traverse(menuList)
  return ids
}


async function handleConfirmClick() {
  formRef.value?.validate(async (valid) => {
    if (!valid) {
      return
    }

    isSubmitDisabled.value = true


    let checkedKeys = treeRef.value?.getCheckedKeys() || []


    if (!isTechnician.value) {
      checkedKeys = checkedKeys.filter(id => {

        if (userMenuIds.value.includes(id)) return true

        if (editingRoleMenuIds.value.includes(id)) return true
        return false
      })
    }

    const submitData = {
      name: formData.name,
      intro: formData.intro,
      menuList: checkedKeys
    }

    try {
      if (mode.value === 'edit' && editData.value) {
        await systemStore.editPageDataAction(props.modalConfig.pageName, editData.value.id, submitData)
      } else {
        await systemStore.newPageDataAction(props.modalConfig.pageName, submitData)
      }


      localCache.removeCache('userMenus')

      dialogVisible.value = false
      emit('success')
    } finally {
      isSubmitDisabled.value = false
    }
  })
}

defineExpose({ setModalVisible })
</script>

<style lang="less" scoped>

:deep(.google-dialog) {
  .el-dialog {
    border-radius: 8px;
    overflow: hidden;
  }

  .el-dialog__header {
    padding: 16px 20px 12px;
    border-bottom: 1px solid #e8eaed;
    margin: 0;
  }

  .el-dialog__title {
    font-size: 18px;
    font-weight: 500;
    color: #202124;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
  }

  .el-dialog__headerbtn {
    top: 16px;
    right: 16px;
    width: 28px;
    height: 28px;

    .el-dialog__close {
      color: #5f6368;
      font-size: 18px;

      &:hover {
        color: #202124;
      }
    }
  }

  .el-dialog__body {
    padding: 16px 20px;
    max-height: 60vh;
    overflow-y: auto;
  }

  .el-dialog__footer {
    padding: 12px 20px;
    border-top: 1px solid #e8eaed;
  }
}

.dialog-content {
  .form-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
    background-color: #f8f9fa;
    border-radius: 4px;

    .info-label {
      font-size: 13px;
      color: #5f6368;
    }

    .info-value {
      font-size: 14px;
      font-weight: 500;
      color: #202124;
    }
  }
}

.google-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(.el-form-item__label) {
    font-size: 14px;
    font-weight: 500;
    color: #3c4043;
    margin-bottom: 6px;
  }

  :deep(.google-input) {
    .el-input__wrapper {
      border-radius: 4px;
      border: 1px solid #dadce0;
      box-shadow: none;
      padding: 6px 10px;
      transition: all 0.2s ease;

      &:hover {
        border-color: #1a73e8;
      }

      &.is-focus {
        border-color: #1a73e8;
        box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
      }

      .el-input__inner {
        color: #202124;
        font-size: 14px;

        &::placeholder {
          color: #9aa0a6;
        }
      }
    }

    .el-textarea__inner {
      border-radius: 4px;
      border: 1px solid #dadce0;
      box-shadow: none;
      padding: 6px 10px;
      transition: all 0.2s ease;
      font-family: inherit;

      &:hover {
        border-color: #1a73e8;
      }

      &:focus {
        border-color: #1a73e8;
        box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
      }

      &::placeholder {
        color: #9aa0a6;
      }
    }
  }


  .menu-tree-container {
    width: 100%;
    border: 1px solid #dadce0;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .tree-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 10px;
      background-color: #f8f9fa;
      border-bottom: 1px solid #e8eaed;
      flex-shrink: 0;

      :deep(.el-checkbox) {
        .el-checkbox__label {
          font-size: 14px;
          font-weight: 500;
          color: #202124;
        }
      }

      .selected-count {
        font-size: 13px;
        color: #5f6368;
      }
    }

    .tree-wrapper {
      max-height: 180px;
      overflow-y: auto;
      background-color: #fff;
      padding: 4px;
    }

    .menu-tree {
      background-color: #fff;

      :deep(.el-tree-node__content) {
        height: 28px;
        border-radius: 4px;
        padding-left: 8px;
        margin: 1px 0;

        &:hover {
          background-color: #f1f3f4;
        }
      }

      :deep(.el-tree-node__expand-icon) {
        color: #5f6368;
      }

      :deep(.is-checked .el-tree-node__label) {
        color: #1a73e8;
        font-weight: 500;
      }
    }

    .tree-node {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;

      .node-icon {
        display: flex;
        align-items: center;
        font-size: 14px;
        color: #5f6368;
      }

      .node-label {
        font-size: 14px;
        color: #202124;
      }

      .node-permission {
        font-size: 11px;
        color: #9aa0a6;
        font-family: 'Roboto Mono', monospace;
      }

      &.node-disabled {
        opacity: 0.5;
        cursor: not-allowed;

        .node-icon,
        .node-label,
        .node-permission {
          color: #9aa0a6;
        }
      }
    }


    :deep(.el-checkbox.is-disabled) {
      .el-checkbox__input.is-disabled .el-checkbox__inner {
        background-color: #f1f3f4;
        border-color: #dadce0;
      }

      .el-checkbox__label {
        color: #9aa0a6;
      }
    }
  }
}


.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.google-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  height: 28px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  min-width: 60px;
}

.google-btn-primary {
  background-color: #1a73e8;
  color: #fff;

  &:hover:not(:disabled) {
    background-color: #1557b0;
  }

  &:active:not(:disabled) {
    background-color: #174ea6;
  }

  &:disabled {
    background-color: #dadce0;
    color: #9aa0a6;
    cursor: not-allowed;
  }
}

.google-btn-text {
  background-color: transparent;
  color: #1a73e8;

  &:hover {
    background-color: #f1f3f4;
  }

  &:active {
    background-color: #e8eaed;
  }
}


:deep(.el-dialog__body),
:deep(.tree-wrapper) {
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f3f4;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #dadce0;
    border-radius: 4px;

    &:hover {
      background: #bdc1c6;
    }
  }
}
</style>
