<template>
  <div class="base-echart">
    <div class="echart" ref="echartRef"></div>
  </div>
</template>

<script setup>
import * as echarts from 'echarts'
import { onMounted, ref, watchEffect } from 'vue'
import ChinaJSON from '../data/china.json'

echarts.registerMap('china', ChinaJSON) 


const props = defineProps({
  option: {
    type: Object,
    default: () => {}
  }
})

const echartRef = ref()
onMounted(() => {

  const echartInstance = echarts.init(echartRef.value, 'light', {
    renderer: 'canvas'
  })


  watchEffect(() => {
    echartInstance.setOption(props.option)
  
  })





})
</script>

<style lang="less" scoped>
.echart {
  height: 300px;
}
</style>
