<template>
  <div class="lp-products">
    <!-- 卡片选择页:进入页面先看两个 LP 的实时预览,点卡片进入对应管理面板。
         用 v-show 而非 v-if:进面板返回时只隐藏不销毁,iframe 预览不重新加载 -->
    <div v-show="view === 'select'" v-loading="countsLoading" class="lp-cards">
      <div class="page-title">LP 产品管理</div>
      <div class="page-desc">选择要管理的落地页,卡片内为线上页面实时预览,点击进入管理</div>
      <div class="cards">
        <div class="lp-card" @click="view = 'zorfell'">
          <div class="card-preview">
            <!-- 实时预览:缩放加载线上 LP(允许其自身脚本渲染数据,但禁止触达父页面);pointer-events 屏蔽误点 -->
            <iframe :src="ZORFELL_LP_URL" sandbox="allow-scripts" loading="lazy" tabindex="-1"></iframe>
          </div>
          <div class="card-info">
            <div class="card-name">清单页LP <span class="card-sub">v2</span></div>
            <div class="card-desc">{{ zorfellCount }} 个产品 · 文案/折扣/评分/媒体/排序</div>
          </div>
        </div>
        <div class="lp-card" @click="view = 'gift'">
          <div class="card-preview">
            <iframe :src="GIFT_LP_URL" sandbox="allow-scripts" loading="lazy" tabindex="-1"></iframe>
          </div>
          <div class="card-info">
            <div class="card-name">清单页LP <span class="card-sub">v6</span></div>
            <div class="card-desc">{{ giftCount }} 个产品 · 板块/正文/跳转链接/分组/排序</div>
          </div>
        </div>
        <div class="lp-card" @click="view = 'gift7'">
          <div class="card-preview">
            <iframe :src="GIFT7_LP_URL" sandbox="allow-scripts" loading="lazy" tabindex="-1"></iframe>
          </div>
          <div class="card-info">
            <div class="card-name">清单页LP <span class="card-sub">v7</span></div>
            <div class="card-desc">{{ gift7Count }} 个产品 · 数据独立于 v6, 可自由改版</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 管理面板:各 LP 原有面板,顶部加返回入口(保持 v-if,进入面板时才挂载) -->
    <template v-if="view !== 'select'">
      <el-button class="back-btn" :icon="ArrowLeft" text @click="view = 'select'">返回选择落地页</el-button>
      <LpZorfellPanel v-if="view === 'zorfell'" />
      <LpGiftPanel v-if="view === 'gift'" />
      <LpGiftPanel v-if="view === 'gift7'" page="gift7" />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import LpZorfellPanel from './c-cpns/LpZorfellPanel.vue'
import LpGiftPanel from './c-cpns/LpGiftPanel.vue'
import { getLpProducts, getGiftProducts, getGift7Products } from '@/services/main/webpage/lp-products'

// 各 LP 的线上静态页地址(卡片实时预览用) —— 同类清单页,按版本区分
const ZORFELL_LP_URL = 'https://pro2.winrab.com/s2/1/ecomlistical/v2/'
const GIFT_LP_URL = 'https://pro2.winrab.com/s2/1/ecomlistical/v6/'
const GIFT7_LP_URL = 'https://pro2.winrab.com/s2/1/ecomlistical/v7/'

const view = ref('select') // select=卡片选择页 / zorfell / gift / gift7
const zorfellCount = ref('—')
const giftCount = ref('—')
const gift7Count = ref('—')
const countsLoading = ref(false)

// 卡片上展示各自产品数(拉取失败显示 —,不影响进入管理)
onMounted(async () => {
  countsLoading.value = true
  const [a, b, c] = await Promise.allSettled([getLpProducts(), getGiftProducts(), getGift7Products()])
  if (a.status === 'fulfilled' && a.value?.code === 0) zorfellCount.value = (a.value.data || []).length
  if (b.status === 'fulfilled' && b.value?.code === 0) giftCount.value = (b.value.data || []).length
  if (c.status === 'fulfilled' && c.value?.code === 0) gift7Count.value = (c.value.data || []).length
  countsLoading.value = false
})
</script>

<style scoped>
.lp-cards .page-title { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.lp-cards .page-desc { color: #909399; font-size: 12px; margin-bottom: 16px; }
.cards { display: flex; gap: 20px; flex-wrap: wrap; }
.lp-card { width: 372px; border: 1px solid #dcdfe6; border-radius: 8px; overflow: hidden; cursor: pointer; background: #fff; transition: box-shadow .2s, transform .2s; }
.lp-card:hover { box-shadow: 0 4px 16px rgba(0, 0, 0, .12); transform: translateY(-2px); }
/* 预览:1280 宽的线上页缩到卡片宽(≈0.29),只露上部 */
.card-preview { height: 230px; overflow: hidden; background: #f5f7fa; position: relative; }
.card-preview iframe { width: 1280px; height: 800px; border: 0; transform: scale(0.29); transform-origin: 0 0; pointer-events: none; }
.card-info { padding: 12px 14px; }
.card-name { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.card-sub { font-size: 12px; color: #909399; font-weight: 400; }
.card-desc { font-size: 12px; color: #909399; margin-top: 4px; }
.back-btn { margin-bottom: 8px; }
</style>
