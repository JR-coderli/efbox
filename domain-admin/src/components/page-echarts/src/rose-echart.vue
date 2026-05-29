<template>
  <div class="rose-echart">
    <base-echart :option="option"/>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import BaseEchart from '..';

const props = defineProps({
  roseData: {
    type: Array,
    default: () => []
  }
})

const option = computed(() => {
  return {
    toolbox: {
      show: true,
      feature: {
        mark: { show: true },
        dataView: { show: true, readOnly: false },
        restore: { show: true },
        saveAsImage: { show: true }
      }
    },
    tooltip: {
      trigger: 'item'
    },
    series: [
      {
        name: '访问来源',
        type: 'pie',

        radius: [10, 160],

        center: ['50%', '50%'],
        bottom: '-15%',
        roseType: 'area', // 圆心角一样, 通过半径的不同表示大小
        itemStyle: {
          borderRadius: 8
        },
        data: props.roseData, 
        label: {
          show: false
        }
      }
    ]
  }
})

</script>

<style lang="less" scoped></style>
