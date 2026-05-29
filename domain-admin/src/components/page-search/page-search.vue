<template>
  <div class="search" v-if="isQuery">
    <!-- 1、输入搜索关键字的表单 -->
    <el-form :model="searchForm" ref="formRef" label-width="100px" size="large">
      <el-row :gutter="20">
        <template v-for="item in searchConfig.formItems" :key="item.prop">
          <el-col :span="8">
            <el-form-item :label="item.label" :prop="item.prop">
              <template v-if="item.type === 'input'">
                <el-input
                  v-model="searchForm[item.prop]"
                  :placeholder="item.placeholder"
                  clearable
                />
              </template>
              <template v-if="item.type === 'number'">
                <el-input
                  type="number"
                  v-model="searchForm[item.prop]"
                  :placeholder="item.placeholder"
                  clearable
                />
              </template>
              <template v-if="item.type === 'date-picker'">
                <el-date-picker
                  v-model="searchForm[item.prop]"
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
                  v-model="searchForm[item.prop]"
                  :placeholder="item.placeholder"
                  clearable
                >
                  <template v-for="option in item.options" :key="item.value">
                    <el-option :label="option.label" :value="option.value" />
                  </template>
                </el-select>
              </template>
            </el-form-item>
          </el-col>
        </template>
      </el-row>
    </el-form>

    <!-- 2、重置和搜索的按钮 -->
    <div class="btns">
      <el-button icon="refresh" @click="handleResetClick">重置</el-button>
      <el-button type="primary" icon="search" @click="handleQueryClick"
        >查询</el-button
      >
    </div>
  </div>
</template>

<script setup>
import usePermissions from '@/hooks/usePermissions'
import { reactive, ref } from 'vue'


const emit = defineEmits(['queryClick', 'resetClick', 'closeSearch'])
const props = defineProps({
  searchConfig: {
    type: Object,
    required: true
  }
})


const isQuery = usePermissions(`${props.searchConfig.pageName}:query`)


const initialForm = {}
for (const item of props.searchConfig.formItems) {
  initialForm[item.prop] = item.initialValue ?? ''
}
const searchForm = reactive(initialForm)


const formRef = ref()
function handleResetClick() {

  formRef.value?.resetFields() // elementplus提供的用于重置表单数据的方法(即清空表单中已经填好的数据)。


  emit('resetClick')


  emit('closeSearch')
}


function handleQueryClick() {

  emit('queryClick', searchForm)


  emit('closeSearch')
}
</script>

<style lang="less" scoped>
.search {
  background-color: #fff;
  padding: 20px;
}

.el-form-item {
  padding: 20px 30px;
  margin-bottom: 0;
}

.btns {
  text-align: right;
  padding: 0 50px 10px 0;

  .el-button {
    height: 36px;
  }
}
</style>
