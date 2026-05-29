<template>
  <div class="pie-echart">
    <!-- 将父组件中获取到的数据和当前组件的配置数据合并到一起, 传给子组件base-echart -->
    <base-echart :option="option"/>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import BaseEchart from './base-echart.vue';

const props = defineProps({
  pieData: {
    type: Array,
    default: () => []
  }
})


const option = computed(() => ({

  tooltip: {
    trigger: 'item'
  },

  legend: {
    orient: 'horizontal',
    left: 'left'
  },
  series: [
    {
      name: '访问来源',
      type: 'pie',
      radius: '50%',
      bottom: '-10%',
      data: props.pieData,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }
  ]
}))
</script>

<style lang="less" scoped></style>
