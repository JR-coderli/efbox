<template>
  <div class="dashboard">
    <!-- 1、顶部数字的数据展示 -->
    <el-row :gutter="10">
      <template v-for="item in amountList" :key="item.amount">
        <!-- 普通写法: -->
        <!-- <el-col :span="6"><count-card v-bind="item" /></el-col> -->
         <!-- 响应式写法: -->
        <el-col :span="6" :xs="24" :sm="12" :md="8" :lg="6"><count-card v-bind="item" /></el-col>
      </template>
    </el-row>

    <!-- 2、中间部分的图表 -->
    <el-row :gutter="10">
      <el-col :span="7">
        <!-- 子组件中使用子组件, 在这里chart-card和pie-echart都是当前dashboard组件的子组件。 这样其实就相对于pie-echart变成了chart-card的子组件。 -->
        <chart-card>
          <pie-echart :pie-data="showGoodsCategoryCount" />
        </chart-card>
      </el-col>
      <el-col :span="10">
        <chart-card>

          <map-echart :map-data="showGoodsAddressSale" />
        </chart-card>
      </el-col>
      <el-col :span="7">
        <chart-card>
          <rose-echart :rose-data="showGoodsCategoryCount" />
        </chart-card>
      </el-col>
    </el-row>

    <!-- 3、底部部分的图表 -->
    <el-row :gutter="10">
      <el-col :span="12">
        <chart-card header="用户注册统计">
          <!-- 这里可以改成v-bind进行绑定 -->
          <line-echart
            :labels="showGoodsCategorySale.labels"
            :values="showGoodsCategorySale.values"
          />
        </chart-card>
      </el-col>
      <el-col :span="12">
        <chart-card header="新增房源统计">
          <bar-echart v-bind="showGoodsCategoryFavor" />
        </chart-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import CountCard from './c-cpns/count-card/count-card.vue'
import ChartCard from './c-cpns/chart-card/chart-card.vue'
import {
  LineEchart,
  PieEchart,
  RoseEchart,
  BarEchart,
  MapEchart
} from '@/components/page-echarts'
import { computed, ref } from 'vue'

const amountList = [
  {
    amount: 'sale',
    title: '前台用户数量',
    tips: '前台用户的总数量',
    subtitle: '前台用户数量',
    number1: 16,
    number2: 16
  },
  {
    amount: 'favor',
    title: '房源总数量',
    tips: '所有房源的总数量',
    subtitle: '房源总数量',
    number1: 21,
    number2: 21
  },
  {
    amount: 'inventory',
    title: '成交订单额',
    tips: '所有商品的总成交订单额',
    subtitle: '成交订单额',
    number1: 1289,
    number2: 1289
  },
  {
    amount: 'saleroom',
    title: '后台用户数量',
    tips: '后台用户的总数量',
    subtitle: '后台用户数量',
    number1: 5,
    number2: 5
  }
]
const goodsCategoryCount = ref([
  {
    id: 1,
    name: '女装',
    goodsCount: 30
  },
  {
    id: 2,
    name: '上衣',
    goodsCount: 26
  },
  {
    id: 3,
    name: '裤子',
    goodsCount: 19
  },
  {
    id: 4,
    name: '鞋子',
    goodsCount: 19
  },
  {
    id: 5,
    name: '厨具',
    goodsCount: 25
  },
  {
    id: 6,
    name: '家具',
    goodsCount: 18
  },
  {
    id: 7,
    name: '床上用品',
    goodsCount: 19
  }
])
const showGoodsCategoryCount = computed(() => {
  return goodsCategoryCount.value.map((item) => ({
    name: item.name,
    value: item.goodsCount
  }))
})

const goodsCategorySale = ref([
  {
    id: 1,
    name: '2025-01',
    goodsCount: 2
  },
  {
    id: 2,
    name: '2025-02',
    goodsCount: 3
  },
  {
    id: 3,
    name: '2025-03',
    goodsCount: 2
  },
  {
    id: 4,
    name: '2025-03',
    goodsCount: 3
  },
  {
    id: 5,
    name: '2025-04',
    goodsCount: 7
  }
])
const showGoodsCategorySale = computed(() => {
  const labels = goodsCategorySale.value.map((item) => item.name)
  const values = goodsCategorySale.value.map((item) => item.goodsCount)
  return { labels, values }
})

const goodsCategoryFavor = ref([
  {
    id: 1,
    name: '2024-12',
    goodsFavor: 18
  },
  {
    id: 2,
    name: '2025-01',
    goodsFavor: 12
  },
  {
    id: 3,
    name: '2025-02',
    goodsFavor: 3
  },
  {
    id: 4,
    name: '2025-03',
    goodsFavor: 1
  },
  {
    id: 5,
    name: '2025-04',
    goodsFavor: 8
  }
])
const showGoodsCategoryFavor = computed(() => {
  const labels = goodsCategoryFavor.value.map((item) => item.name)
  const values = goodsCategoryFavor.value.map((item) => item.goodsFavor)
  return { labels, values }
})

const goodsAddressSale = ref([
  {
    "address": "上海",
    "count": 62239
  },
  {
    "address": "南京",
    "count": 55687
  },
  {
    "address": "郑州",
    "count": 53716
  },
  {
    "address": "广州",
    "count": 6364
  },
  {
    "address": "西安",
    "count": 64976
  },
  {
    "address": "长沙",
    "count": 24132
  },
  {
    "address": "昆明",
    "count": 9524
  },
  {
    "address": "武汉",
    "count": 28212
  },
  {
    "address": "重庆",
    "count": 60777
  },
  {
    "address": "沈阳",
    "count": 20900
  },
  {
    "address": "宁波",
    "count": 66584
  },
  {
    "address": "苏州",
    "count": 1136
  },
  {
    "address": "青岛",
    "count": 9021
  },
  {
    "address": "成都",
    "count": 23378
  },
  {
    "address": "北京",
    "count": 6107
  },
  {
    "address": "天津",
    "count": 5096
  },
  {
    "address": "深圳",
    "count": 12480
  },
  {
    "address": "杭州",
    "count": 19654
  }
])
const showGoodsAddressSale = computed(() => {
  return goodsAddressSale.value.map(item => ({
    name: item.address,
    value: item.count
  }))
})
</script>

<style lang="less" scoped>
.el-row {
  margin-bottom: 10px;
}
</style>
