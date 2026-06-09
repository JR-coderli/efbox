<template>
  <div class="header-crumb">
    <el-breadcrumb separator-icon="ArrowRight" class="google-breadcrumb">
      <template v-for="item in breadcrumbs" :key="item.name">
        <el-breadcrumb-item :to="item.path">{{ item.name }}</el-breadcrumb-item>
      </template>
    </el-breadcrumb>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router';
import useLoginStore from '@/stores/login/login';
import { mapPathToBreadcrumbs } from '@/utils/map-menus'
import { computed } from 'vue';

const route = useRoute()
const userMenus = useLoginStore().userMenus
const breadcrumbs = computed(() => {
  return mapPathToBreadcrumbs(route.path, userMenus)
})

</script>

<style lang="less" scoped>
.header-crumb {
  :deep(.google-breadcrumb) {
    .el-breadcrumb__item {
      .el-breadcrumb__inner {
        color: #5f6368;
        font-size: 14px;
        font-weight: 500;

        &:hover {
          color: #1a73e8;
        }

        &.is-link {
          color: #5f6368;

          &:hover {
            color: #1a73e8;
          }
        }
      }

      &:last-child {
        .el-breadcrumb__inner {
          color: #202124;
          font-weight: 500;
        }
      }

      .el-breadcrumb__separator {
        color: #9aa0a6;
        margin: 0 8px;
      }
    }
  }
}
</style>
