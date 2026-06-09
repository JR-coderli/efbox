<template>
  <div class="main-menu" :class="{ 'is-fold': isFold, 'is-mobile-open': isMobileOpen }">
    <!-- Logo -->
    <div class="logo">
      <img class="logo-img" src="@/assets/img/full-screen-loading.gif" alt="" />
      <h2 v-show="!isFold" class="logo-title">管理系统</h2>
    </div>

    <!-- Menu -->
    <div class="menu-container">
      <div class="menu-list" ref="menuListRef">
        <!-- 遍历一级菜单 -->
        <div
          v-for="(item, index) in userMenus"
          :key="item.id"
          :data-id="item.id"
          :data-level="1"
          class="menu-item-wrapper"
          :class="{ 'sortable': isSortMode }"
          @mouseenter="handleMouseEnter(item)"
          @mouseleave="handleMouseLeave"
        >
          <!-- 一级菜单 -->
          <div
            class="menu-item"
            :class="{ 'is-active': isParentActive(item) }"
            @click="handleParentClick(item)"
          >
            <div class="menu-item-content">
              <span v-if="isSortMode" class="drag-handle">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </span>
              <span class="menu-icon">
                <component :is="item.icon" />
              </span>
              <span v-show="!isFold" class="menu-label">{{ item.name }}</span>
              <span v-show="!isFold && item.directLink !== 1 && item.children && item.children.length > 0" class="menu-arrow" :class="{ 'is-expanded': expandedMenus.includes(item.id) }">
                <svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
              </span>
            </div>
          </div>

          <!-- 展开状态的子菜单 -->
          <div
            v-show="!isFold && item.directLink !== 1 && expandedMenus.includes(item.id)"
            class="submenu"
            :data-parent-id="item.id"
          >
            <div
              v-for="(subitem, subIndex) in item.children"
              :key="subitem.id"
              :data-id="subitem.id"
              :data-level="2"
              :data-parent-id="item.id"
              class="submenu-item"
              :class="{ 'sortable': isSortMode, 'is-active': currentRouteId === subitem.id }"
              @click="handleItemClick(subitem)"
            >
              <span v-if="isSortMode" class="drag-handle">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </span>
              <span class="submenu-label">{{ subitem.name }}</span>
            </div>
          </div>

          <!-- 折叠状态下的悬浮弹出层 -->
          <transition name="submenu-fade">
            <div
              v-if="isFold && item.directLink !== 1 && hoveredMenuId === item.id && item.children && item.children.length > 0"
              class="submenu-popup"
              @mouseenter="handlePopupEnter"
              @mouseleave="handlePopupLeave"
            >
              <div class="submenu-popup-inner">
                <div
                  v-for="subitem in item.children"
                  :key="subitem.id"
                  class="submenu-popup-item"
                  :class="{ 'is-active': currentRouteId === subitem.id }"
                  @click="handleItemClick(subitem)"
                >
                  <span class="submenu-popup-label">{{ subitem.name }}</span>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>

      <!-- 底部按钮组 -->
      <div class="bottom-actions">
        <!-- Header 显示切换按钮 -->
        <div class="action-btn" @click="toggleHeaderVisible" :title="isHeaderVisible ? '隐藏顶部栏' : '显示顶部栏'">
          <svg v-if="isHeaderVisible" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M3 4h18v2H3V4zm0 14h18v2H3v-2zm0-5h18v2H3v-2z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
          </svg>
        </div>
        <!-- 排序模式切换按钮 -->
        <div class="action-btn" @click="toggleSortMode" :title="isSortMode ? '切换到浏览模式' : '切换到排序模式'">
          <svg v-if="!isSortMode" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import useLoginStore from '@/stores/login/login'
import useMainStore from '@/stores/main/main'
import { useRoute, useRouter } from 'vue-router'
import { mapPathToMenu } from '@/utils/map-menus'
import { ElMessage } from 'element-plus'
import Sortable from 'sortablejs'


const mainStore = useMainStore()
const isHeaderVisible = computed(() => mainStore.isHeaderVisible)


function toggleHeaderVisible() {
  mainStore.toggleHeaderVisible()
}


const loginStore = useLoginStore()
const userMenus = computed({
  get: () => loginStore.userMenus,
  set: (value) => {
    loginStore.userMenus = value
  }
})


const props = defineProps({
  isFold: {
    type: Boolean,
    default: false
  },
  isMobileOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['menuItemClick'])


const isSortMode = ref(false)


let parentSortable = null
let submenuSortables = []


const expandedMenus = ref([])


const hoveredMenuId = ref(null)
let hideTimer = null



function toggleSortMode() {
  isSortMode.value = !isSortMode.value
  handleSortModeChange(isSortMode.value)
}

function handleSortModeChange(enabled) {
  if (enabled) {

    userMenus.value.forEach(item => {
      if (item.children && item.children.length > 0) {
        if (!expandedMenus.value.includes(item.id)) {
          expandedMenus.value.push(item.id)
        }
      }
    })
    nextTick(() => {
      initSortable()
    })
  } else {
    destroySortable()
  }
}


function initSortable() {
  destroySortable()

  const menuListEl = document.querySelector('.menu-list')
  if (!menuListEl) return


  parentSortable = Sortable.create(menuListEl, {
    animation: 150,
    handle: '.menu-item',
    delay: 100,
    delayOnTouchOnly: true,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    filter: '.submenu-item',
    preventOnFilter: false,
    onEnd: (evt) => {
      const { oldIndex, newIndex } = evt
      if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
        const [removed] = userMenus.value.splice(oldIndex, 1)
        userMenus.value.splice(newIndex, 0, removed)
        saveMenuOrder()
      }
    }
  })


  const submenus = document.querySelectorAll('.submenu')
  submenus.forEach((submenu, index) => {
    const sortable = Sortable.create(submenu, {
      animation: 150,
      handle: '.submenu-item',
      delay: 100,
      delayOnTouchOnly: true,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',

      onEnd: (evt) => {
        const { oldIndex, newIndex } = evt
        const parentId = parseInt(submenu.dataset.parentId)
        const parentMenu = userMenus.value.find(m => m.id === parentId)

        if (parentMenu && parentMenu.children && oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
          const [removed] = parentMenu.children.splice(oldIndex, 1)
          parentMenu.children.splice(newIndex, 0, removed)
          saveMenuOrder()
        }
      }
    })
    submenuSortables.push(sortable)
  })
}


function destroySortable() {
  if (parentSortable) {
    parentSortable.destroy()
    parentSortable = null
  }
  submenuSortables.forEach(s => s.destroy())
  submenuSortables = []
}


function saveMenuOrder() {
  const roleId = loginStore.userInfo.role?.id
  if (!roleId) return

  const order = userMenus.value.map(menu => {
    const item = { id: menu.id, children: [] }
    if (menu.children && menu.children.length > 0) {
      item.children = menu.children.map(child => child.id)
    }
    return item
  })

  const key = `menu-order-${roleId}`
  localStorage.setItem(key, JSON.stringify(order))

  ElMessage.success('菜单顺序已保存')
}



function handleMouseEnter(item) {
  if (isSortMode.value) return

  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  if (props.isFold && item.children && item.children.length > 0) {
    hoveredMenuId.value = item.id
  }
}


function handleMouseLeave() {
  if (isSortMode.value) return

  hideTimer = setTimeout(() => {
    hoveredMenuId.value = null
  }, 150)
}


function handlePopupEnter() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}


function handlePopupLeave() {
  hoveredMenuId.value = null
}


const router = useRouter()
function handleItemClick(item) {
  if (isSortMode.value) return

  router.push(item.url)
  emit('menuItemClick')
}


const route = useRoute()
const currentRouteId = computed(() => {
  const pathMenu = mapPathToMenu(route.path, userMenus.value)
  return pathMenu?.id
})


function isParentActive(item) {

  if (item.directLink === 1) {
    const pathMenu = mapPathToMenu(route.path, userMenus.value)
    return pathMenu?.id === item.id
  }

  if (!item.children || item.children.length === 0) return false
  return item.children.some(child => child.id === currentRouteId.value)
}


function handleParentClick(item) {
  if (isSortMode.value) return


  if (item.directLink === 1) {
    router.push(item.url)
    emit('menuItemClick')
    return
  }

  if (props.isFold) {

    if (item.children && item.children.length > 0) {
      handleItemClick(item.children[0])
    }
  } else {

    const index = expandedMenus.value.indexOf(item.id)
    if (index > -1) {
      expandedMenus.value.splice(index, 1)
    } else {
      expandedMenus.value.push(item.id)
    }


    if (isSortMode.value && index === -1) {
      nextTick(() => {
        initSortable()
      })
    }
  }
}


if (currentRouteId.value) {
  userMenus.value.forEach(item => {
    if (item.children && item.children.some(child => child.id === currentRouteId.value)) {
      expandedMenus.value.push(item.id)
    }
  })
}


watch(currentRouteId, (newVal) => {
  if (newVal && !isSortMode.value) {
    userMenus.value.forEach(item => {
      if (item.children && item.children.some(child => child.id === newVal)) {
        if (!expandedMenus.value.includes(item.id)) {
          expandedMenus.value.push(item.id)
        }
      }
    })
  }
})


onBeforeUnmount(() => {
  destroySortable()
})
</script>

<style lang="less" scoped>
.main-menu {
  height: 100%;
  background-color: #fff;
  border-right: 1px solid #e8eaed;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  width: 240px;

  &.is-fold {
    width: 64px;
  }
}


.logo {
  display: flex;
  align-items: center;
  height: 50px;
  padding: 0 16px;
  border-bottom: 1px solid #e8eaed;
  flex-shrink: 0;

  .logo-img {
    height: 28px;
    width: 28px;
    flex-shrink: 0;
  }

  .logo-title {
    flex: 1;
    margin-left: 12px;
    font-size: 18px;
    font-weight: 400;
    color: #202124;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
  }
}

.is-fold {
  .logo {
    justify-content: center;
    padding: 0;

    .logo-img {
      margin: 0;
    }
  }


  .bottom-actions {
    display: none;
  }
}


.bottom-actions {
  position: absolute;
  left: 8px;
  bottom: 8px;
  display: flex;
  gap: 6px;
  z-index: 10;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f3f4;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #5f6368;

  &:hover {
    background: #e8eaed;
    color: #202124;
  }

  &:active {
    background: #dadce0;
  }

  svg {
    width: 18px;
    height: 18px;
  }
}


.menu-container {
  position: relative;
  flex: 1;
  overflow-y: auto;
  overflow-x: visible;
}


.is-fold {
  .menu-container {
    overflow: visible;
  }
}

.menu-list {
  padding: 8px 0;
}


.menu-item-wrapper {
  position: relative;
  transition: transform 0.15s ease;

  &.sortable {
    .menu-item,
    .submenu-item {
      cursor: move;
      transition: background 0.15s ease, transform 0.15s ease;
    }
  }
}


.menu-item {
  margin: 0 8px 4px 8px;
  border-radius: 24px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #f1f3f4;
  }

  &.is-active {
    background-color: #e8f0fe;

    .menu-icon {
      color: #1a73e8;
    }

    .menu-label {
      color: #1a73e8;
      font-weight: 500;
    }
  }
}

.menu-item-content {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 16px;
}

.drag-handle {
  color: #aaa;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;

  &:active {
    cursor: grabbing;
  }
}

.menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #5f6368;
  flex-shrink: 0;
}

.menu-label {
  flex: 1;
  margin-left: 12px;
  font-size: 14px;
  color: #202124;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
}

.menu-arrow {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5f6368;
  transition: transform 0.2s ease;

  svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }

  &.is-expanded {
    transform: rotate(180deg);
  }
}

.is-fold {
  .menu-item {
    margin: 0 8px 8px 8px;

    .menu-item-content {
      justify-content: center;
      padding: 0;
    }
  }

  .menu-icon {
    margin: 0;
  }


  .menu-item-wrapper:hover .menu-item {
    background-color: #e8f0fe;

    .menu-icon {
      color: #1a73e8;
    }
  }
}


.submenu-popup {
  position: absolute;
  left: 100%;
  top: 0;
  margin-left: 8px;
  z-index: 1000;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  overflow: visible;


  &::before {
    content: '';
    position: absolute;
    left: -10px;
    top: 12px;
    width: 0;
    height: 0;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-right: 10px solid #fff;
  }
}

.submenu-popup-inner {
  padding: 4px 0;
}

.submenu-popup-item {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 16px;
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: #f1f3f4;
  }

  &.is-active {
    background-color: #e8f0fe;

    .submenu-popup-label {
      color: #1a73e8;
      font-weight: 500;
    }
  }
}

.submenu-popup-label {
  font-size: 14px;
  color: #202124;
  white-space: nowrap;
  user-select: none;
}


.submenu-fade-enter-active,
.submenu-fade-leave-active {
  transition: all 0.15s ease;
}

.submenu-fade-enter-from,
.submenu-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

.submenu-fade-enter-to,
.submenu-fade-leave-from {
  opacity: 1;
  transform: translateX(0);
}


.submenu {
  padding: 4px 0 12px 48px;

  .submenu-item {
    display: flex;
    align-items: center;
    height: 36px;
    padding: 0 16px;
    margin: 0 8px;
    border-radius: 18px;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: #f1f3f4;
    }

    &.is-active {
      background-color: #e8f0fe;

      .submenu-label {
        color: #1a73e8;
        font-weight: 500;
      }
    }

    .drag-handle {
      margin-right: 6px;
    }
  }
}

.submenu-label {
  font-size: 14px;
  color: #5f6368;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
}


:deep(.sortable-ghost) {
  opacity: 0.4;
  background: #e8f0fe;
}

:deep(.sortable-chosen) {
  background: #e8f0fe;
}

:deep(.sortable-drag) {
  opacity: 0.8;
  background: #e8f0fe;
}


:deep(.sortable-drag > *) {
  pointer-events: none;
}


.menu-container {
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #dadce0;
    border-radius: 3px;

    &:hover {
      background: #bdc1c6;
    }
  }
}


@media (max-width: 1024px) {
  .main-menu {
    width: 200px;

    &.is-fold {
      width: 56px;
    }
  }

  .logo {
    height: 48px;
    padding: 0 12px;

    .logo-img {
      height: 24px;
      width: 24px;
    }

    .logo-title {
      font-size: 16px;
      margin-left: 8px;
    }
  }

  .menu-item-content {
    height: 36px;
    padding: 0 12px;
  }

  .submenu {
    padding-left: 40px;

    .submenu-item {
      height: 32px;
      padding: 0 12px;
    }
  }

  .submenu-label {
    font-size: 13px;
  }
}


@media (max-width: 768px) {
  .main-menu {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 280px;
    height: 100vh;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    border-right: 1px solid #e8eaed;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;

    &.is-mobile-open {
      transform: translateX(0);
    }
  }


  .menu-container {
    height: calc(100vh - 56px);
    overflow-y: auto;
  }

  .logo {
    height: 56px;
    padding: 0 20px;
    justify-content: flex-start;

    .logo-img {
      height: 28px;
      width: 28px;
      margin: 0;
    }

    .logo-title {
      font-size: 18px;
      margin-left: 12px;
    }
  }

  .menu-item {
    margin: 0 12px;

    .menu-item-content {
      height: 48px;
      padding: 0 16px;
    }
  }

  .menu-icon {
    width: 24px;
    height: 24px;
  }

  .menu-label {
    font-size: 16px;
    margin-left: 16px;
  }

  .menu-arrow {
    width: 24px;
    height: 24px;

    svg {
      width: 20px;
      height: 20px;
    }
  }

  .submenu {
    padding: 0 0 4px 56px;

    .submenu-item {
      height: 44px;
      padding: 0 16px;
      margin: 0 12px;

      &:hover {
        background-color: #f1f3f4;
      }
    }
  }

  .submenu-label {
    font-size: 15px;
  }
}


@media (max-width: 480px) {
  .main-menu {
    width: 100%;
  }
}
</style>
