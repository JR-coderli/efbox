import { getAmountListData, getGoodsAddressSale, getGoodsCategoryCount, getGoodsCategoryFavor, getGoodsCategorySale } from '@/service/main/analysis/ayalysis'
import { defineStore } from 'pinia'

const useAnalysisStore = defineStore('analysis', {
  state: () => ({
    amountList: [],
    goodsCategoryCount: [],
    goodsCategorySale: [],
    goodsCategoryFavor: [],
    goodsAddressSale: []
  }),
  actions: {
    fetchAnalysisDataAction() {
      getAmountListData().then(res => {
        this.amountList = res.data
      })

      getGoodsCategoryCount().then(res => {
        this.goodsCategoryCount = res.data
      })

      getGoodsCategorySale().then(res => {
        this.goodsCategorySale = res.data
      })

      getGoodsCategoryFavor().then(res => {
        this.goodsCategoryFavor = res.data
      })

      getGoodsAddressSale().then(res => {
        this.goodsAddressSale = res.data
      })
    }
  }
})

export default useAnalysisStore