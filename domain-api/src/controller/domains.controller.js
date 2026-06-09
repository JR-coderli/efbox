const domainsService = require('../service/domains.service')

class DomainsController {

  async create(ctx, next) {

    const domains_info = ctx.request.body


    const result = await domainsService.create(domains_info)


    if (result && result.error) {
      ctx.body = {
        code: 1,
        message: result.error,
        data: null
      }
      return
    }


    ctx.body = {
      code: 0,
      message: '域名已新增',
      data: result
    }
  }



  async remove(ctx, next) {

    const { domainId } = ctx.params


    await domainsService.remove(domainId)


    ctx.body = {
      code: 0,
      message: '域名已删除'
    }
  }


  async update(ctx, next) {

    const { domainId } = ctx.params

    const { existing_domain, landing_page_url, is_important, is_normal, purpose, remark } = ctx.request.body

    await domainsService.update(domainId, existing_domain, landing_page_url, is_important, is_normal, purpose, remark)

    ctx.body = {
      code: 0,
      message: '域名已经更新'
    }
  }



  async normal_list(ctx, next) {

    let { offset = 0, size = 10, existing_domain = '', landing_page_url = '', is_normal } = ctx.request.body
    const [createAtStart, createAtEnd] = ctx.request.body.createAt ?? []

    try {
      const result = await domainsService.normal_list(String(offset), String(size), createAtStart, createAtEnd, existing_domain, landing_page_url, is_normal)
      const [ entireResult, entireTotalCount, noLimitOffsetCount ] = result
      

      ctx.body = {
        code: 0,
        message: '获取普通域名列表~',
        data: {
          list: entireResult,
          totalCount: entireTotalCount,
          allCount: noLimitOffsetCount
        }
      }
    } catch (error) {
      console.log(error)
    }
  }
  


  async import_list(ctx, next) {

    let { offset = 0, size = 10, existing_domain = '', landing_page_url = '', is_normal } = ctx.request.body
    const [createAtStart, createAtEnd] = ctx.request.body.createAt ?? []

    try {
      const result = await domainsService.import_list(String(offset), String(size), createAtStart, createAtEnd, existing_domain, landing_page_url, is_normal)
      const [ entireResult, entireTotalCount, noLimitOffsetCount ] = result
      

      ctx.body = {
        code: 0,
        message: '获取重要域名列表~',
        data: {
          list: entireResult,
          totalCount: entireTotalCount,
          allCount: noLimitOffsetCount
        }
      }
    } catch (error) {
      console.log(error)
    }
  }



  async updateIsImportant(ctx, next) {

    const { domainId, isImportant } = ctx.params


    await domainsService.updateIsImportant(domainId, isImportant)


    ctx.body = {
      code: 0,
      message: '域名等级已修改',
    }
  }


  async updateIsNormal(ctx, next) {

    const { id } = ctx.params
    const { is_accessible, is_safe } = ctx.request.body


    await domainsService.updateIsNormal(id, is_accessible, is_safe)


    ctx.body = {
      code: 0,
      message: '域名状态已修改',
    }
  }


  async updateRemark(ctx, next) {

    const { domainId } = ctx.params
    const { remark } = ctx.request.body


    await domainsService.updateRemark(domainId, remark)


    ctx.body = {
      code: 0,
      message: '备注已更新',
    }
  }


  async checkDomain(ctx, next) {

    const { url } = ctx.request.body

    if (!url) {
      ctx.body = {
        code: 1,
        message: 'URL不能为空',
        data: null
      }
      return
    }

    try {

      const result = await domainsService.checkDomain(url)


      ctx.body = {
        code: 0,
        message: '检测完成',
        data: result
      }
    } catch (error) {
      console.error('检测域名失败:', error)
      ctx.body = {
        code: 1,
        message: '检测失败: ' + error.message,
        data: null
      }
    }
  }


  async getReplacementDomain(ctx, next) {
    const { domain } = ctx.params

    if (!domain) {
      ctx.body = {
        code: 1,
        message: '域名参数不能为空',
        data: null
      }
      return
    }

    try {
      const result = await domainsService.getReplacementDomain(domain)

      if (result.success) {
        ctx.body = {
          code: 0,
          message: '获取替换域名成功',
          data: result
        }
      } else {
        ctx.body = {
          code: 1,
          message: result.message,
          data: null
        }
      }
    } catch (error) {
      console.error('获取替换域名失败:', error)
      ctx.body = {
        code: 1,
        message: '获取替换域名失败: ' + error.message,
        data: null
      }
    }
  }

}

module.exports = new DomainsController()