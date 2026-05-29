<template>
  <div class="count-card">
    <div class="header">
      <span class="title">{{ title }}</span>
      <el-tooltip :content="tips" placement="top" effect="dark">
        <el-icon><Warning /></el-icon>
      </el-tooltip>
    </div>
    <div class="content">
      <span ref="count1Ref">{{ number1 }}</span>
    </div>
    <div class="footer">
      <span>{{ subtitle }}</span>
      <span ref="count2Ref">{{ number2 }}</span>
    </div>
  </div>
</template>

<script setup>
import { CountUp } from 'countup.js'
import { ref, onMounted } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '房源总销量'
  },
  tips: {
    type: String,
    default: '房源总销量'
  },
  number1: {
    type: Number,
    default: 509989
  },
  number2: {
    type: Number,
    default: 509989
  },
  subtitle: {
    type: String,
    default: '房源总销量'
  }
})


const count1Ref = ref() // countRef是span类型, 可以用HTMLElement类型代替, 不用写的特别详细。
const count2Ref = ref()
const countOption = {
  prefix: '￥',

}



onMounted(() => {
  const countup1 = new CountUp(count1Ref.value, props.number1, countOption)
  const countup2 = new CountUp(count2Ref.value, props.number2, countOption)
  countup1.start()
  countup2.start()
})

</script>

<style lang="less" scoped>
.count-card {
  display: flex;
  flex-direction: column;
  padding: 0 20px;
  height: 130px;
  background: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);

  .header {
    display: flex;
    height: 38px;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.45);
    justify-content: space-between;
    align-items: flex-end;
  }

  .content {
    display: flex;
    align-items: center;
    flex: 1;
    margin-left: 0px;
    font-size: 26px;
    color: rgba(0, 0, 0, 0.85);
  }

  .footer {
    display: flex;
    height: 38px;
    line-height: 38px;
    font-size: 14px;
    letter-spacing: 1px;
    color: rgba(0, 0, 0, 0.85);
    border-top: 1px solid #f0f0f0;
  }
}
</style>
