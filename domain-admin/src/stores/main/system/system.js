import { defineStore } from 'pinia'
import useMainStore from '../main'
import useLoginStore from '@/stores/login/login'
import {
  deletePageById,
  editDomainsIsimport,
  editPageData,
  newPageData,
  postPageListData,
  checkLandingPagePath,
  sendEmail,
  generatePdf,
  editCustomerRemark,
  editCustomerPayDay,
  postCustomerList,
  setTopInvoiceEntity,
  getTopInvoiceEntity
} from '@/services/main/system/system'


const useSystemStore = defineStore('system', {
  state: () => ({
    usersList: [],
    usersAllCount: 0,

    pageList: [],
    pageAllCount: 0,
    highlightRowId: null, // 新增的那条数据的id
    justCreated: false, // 是都是新增数据


    importDomainsList: [],
    importDomainsAllCount: 0,
    normalDomainsList: [],
    normalDomainsAllCount: 0,


    allQueryInfo: {
      page: 1,
      pageSize: 10,
      short_name: "",
      payment_status: undefined,
    },
  }),
  actions: {
    /* 针对 页面数据 进行增删改查 */


    async postPageListAction(pageName, queryInfo, listType = "list") {
      const pageListResult = await postPageListData(pageName, queryInfo, listType)
      const { allCount, list } = pageListResult.data


      if (listType !== 'list') {

        if (listType === 'import_list') {
          this.importDomainsList = list
          this.importDomainsAllCount = allCount
          return
        }

        else if (listType === 'normal_list') {
          this.normalDomainsList = list
          this.normalDomainsAllCount = allCount
          return
        }
      }

      this.pageList = list
      this.pageAllCount = allCount


      if (this.justCreated && this.pageList.length) {
        this.highlightRowId = this.pageList[0].id


        this.justCreated = false

        setTimeout(() => {
          this.highlightRowId = null
        }, 2000)
      }
      

      return pageListResult.data.list
    },

    async deletePageByIdAction(pageName, id, options = {}) {

      const deleteResult = await deletePageById(pageName, id)


      if (options.showNotification !== false) {
        ElNotification({
          message: deleteResult.message,
          type: 'success'
        })
      }


      const mainStore = useMainStore()
      mainStore.fetchEntireDataAction()
    },

    async newPageDataAction(pageName, pageInfo, listType = 'list') {
      try {

        const newResult = await newPageData(pageName, pageInfo)


        if (!newResult || newResult.code !== undefined && newResult.code !== 0) {
          ElNotification({
            message: newResult?.message || '新增失败',
            type: 'error'
          })
          return null
        }


        ElNotification({
          message: '新增成功',
          type: 'success'
        })


        this.postPageListAction(pageName, null, listType)


        const mainStore = useMainStore()
        mainStore.fetchEntireDataAction()


        if (newResult.data) {
          return newResult.data.insertId
        }
      } catch (error) {
        console.error('新增失败:', error)
        ElNotification({
          message: '新增失败，请稍后重试',
          type: 'error'
        })
        return null
      }
    },

    async editPageDataAction(pageName, id, pageInfo, attachmentQuery, list) {

      const editResult = await editPageData(pageName, id, pageInfo)







      ElNotification({
        message: editResult.message,
      })


      if (attachmentQuery) {
        const obj = {
          ...this.allQueryInfo,
          ...attachmentQuery,
          "role_name": attachmentQuery.role_name || '',
          "user_id": attachmentQuery.user_id
        }
        this.postPageListAction(pageName, obj, list)
      } else {

        this.postPageListAction(pageName, null, list || 'list')
      }


      const mainStore = useMainStore()
      mainStore.fetchEntireDataAction()
    },
    /* 其他内容 进行增删改查 */

    async editDomainsIsimportAction(id, isImportant) {

      const editResult = await editDomainsIsimport(id, isImportant)








      ElNotification({
        message: editResult.message,
      })


    },

    async checkLandingPagePathAction() {

      const checkResult = await checkLandingPagePath()
    },
    

    async sendEmailAction(queryInfo) {

      const sendResult = await sendEmail(queryInfo)








      ElNotification({
        message: '邮件已发送',
      })

    },


    async generatePdfAction(pageName, queryInfo) {
      try {
        console.log("生成pdf文档", queryInfo)

        const result = await generatePdf(pageName, queryInfo)


        if (!result || result.code !== undefined && result.code !== 0) {
          ElNotification({
            message: result?.message || 'PDF生成失败',
            type: 'error'
          })
          return
        }


        ElNotification({
          message: 'PDF文件已生成',
          type: 'success'
        })


        const loginStore = useLoginStore()
        const refreshQueryInfo = {
          ...this.allQueryInfo,
          role_name: loginStore.userInfo.role.name || '',
          user_id: loginStore.userInfo.id
        }
        console.log('重新发起请求最新的数据', refreshQueryInfo)
        this.postPageListAction(pageName, refreshQueryInfo, 'attalist')
      } catch (error) {
        console.error('生成PDF失败:', error)
        ElNotification({
          message: 'PDF生成失败，请稍后重试',
          type: 'error'
        })
      }
    },


    async editCustomerRemarkAction(id, remarkInfo) {

      const editResult = await editCustomerRemark(id, remarkInfo)









      ElNotification({
        message: '备注已更新',
      })
      


    },


    async editCustomerPayDayAction(id, dayInfo) {

      const editResult = await editCustomerPayDay(id, dayInfo)

      ElNotification({
        message: '付款周期已更新',
      })
      

    },


    async postCustomerListAction(queryInfo) {
      const customerList = await postCustomerList(queryInfo)
      return customerList.data.list
    },


    async setTopInvoiceEntity(id) {
      const result = await setTopInvoiceEntity(id)

      if (!result || result.code !== 0) {
        throw new Error(result?.message || '置顶失败')
      }

      const mainStore = useMainStore()
      mainStore.fetchEntireDataAction()
      return result
    },


    async getTopInvoiceEntityAction() {
      const result = await getTopInvoiceEntity()
      return result.data
    }
  }
})

export default useSystemStore