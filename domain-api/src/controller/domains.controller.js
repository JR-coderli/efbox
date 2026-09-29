const domainsService = require('../service/domains.service')
const systemConfigService = require('../service/system-config.service')
const feishuService = require('../service/feishu.service')

// 检测脚本最后运行时间的 system_config 键
const LAST_CHECK_KEY = 'domain_check.last_run_at'

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

    const result = await domainsService.update(domainId, existing_domain, landing_page_url, is_important, is_normal, purpose, remark)

    // 业务错误（如域名重复）→ 正常响应 code:1，前端弹提示，而不是抛异常挂掉请求
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

  /**
   * 手动修改域名等级(前端操作)。
   * 移出监控(is_important=0)时: 写过程日志 + 发飞书提醒——手动移除和三轮自动降级一样,
   * 都是"域名退出检测"的动作, 需要留痕和知晓。
   * (自动降级走 /internal/is_important 路由, 那条路的通知由检测脚本带上下文发送, 不在此重复)
   * 通知/日志失败不影响修改本身。
   */
  async updateIsImportantManual(ctx, next) {
    const { domainId, isImportant } = ctx.params

    await domainsService.updateIsImportant(domainId, isImportant)

    if (String(isImportant) === '0') {
      try {
        const info = await domainsService.getDomainById(domainId)
        const domainName = info?.existing_domain || `id=${domainId}`
        console.log(`[域名移出监控] 手动移除: ${domainName}(id=${domainId})`)
        await domainsService.writeReplacementLog(domainName, 'manual_demoted',
          `已被手动移出监控，不再检测（域名 id=${domainId}）`)

        const raw = process.env.FEISHU_ALERT_OPEN_ID
        if (raw) {
          const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
          for (const receiveId of raw.split(',').map(s => s.trim()).filter(Boolean)) {
            feishuService.sendText(receiveId,
              `【域名已手动移出监控】${time}\n` +
              `- ${domainName}(id=${domainId}) 已被手动移出检测列表(不再检测)\n` +
              `- 若因域名废弃, 请确认两侧系统已无 lander 在使用; 若误移, 可在重要域名页改回继续监控`
            ).catch(err => console.log(`❌ 手动移出监控的飞书提醒发送失败: ${err.message}`))
          }
        } else {
          console.log('⚠️ 未配置 FEISHU_ALERT_OPEN_ID, 跳过手动移出监控提醒')
        }
      } catch (err) {
        console.error('移出监控的记录/提醒处理失败(不影响修改结果):', err)
      }
    }

    ctx.body = {
      code: 0,
      message: '域名等级已修改',
    }
  }


  /**
   * 域名清单日报数据(供 url_detection_database 每日 8 点第二封邮件)
   * data: { backup: [备用域名+被替换次数], inUse: [主要使用域名+更新时间] }
   */
  async dailyReportList(ctx, next) {
    try {
      const data = await domainsService.dailyReportList()
      ctx.body = {
        code: 0,
        message: '获取成功',
        data
      }
    } catch (error) {
      console.log(error)
      ctx.body = {
        code: 1,
        message: '获取失败: ' + error.message,
        data: null
      }
    }
  }


  /**
   * 备用域名池数量(供 url_detection_database 替换成功后发飞书提醒用)
   * 返回 availableCount(可用: 安全+可访问+在监控) 与 totalCount(全部备用)
   */
  async backupPoolCount(ctx, next) {
    try {
      const data = await domainsService.getBackupPoolCount()
      ctx.body = {
        code: data.success ? 0 : 1,
        message: data.success ? '获取成功' : (data.message || '获取失败'),
        data: data.success ? data : null
      }
    } catch (error) {
      console.log(error)
      ctx.body = {
        code: 1,
        message: '获取失败: ' + error.message,
        data: null
      }
    }
  }


  /**
   * 上报"最后检测时间"(供 url_detection_database 每轮检测完成时打点)
   * 时间取服务器当前时间(脚本时钟不可靠,不信任客户端传值),格式 YYYY-MM-DD HH:mm:ss
   */
  async reportLastCheck(ctx, next) {
    try {
      const now = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

      await systemConfigService.set(LAST_CHECK_KEY, timeStr)

      ctx.body = {
        code: 0,
        message: '上报成功',
        data: { last_check_time: timeStr }
      }
    } catch (error) {
      console.log('上报最后检测时间失败:', error)
      ctx.body = {
        code: 1,
        message: '上报失败: ' + error.message,
        data: null
      }
    }
  }

  /**
   * 查询"最后检测时间"(前端域名检测页展示用)
   */
  async getLastCheck(ctx, next) {
    try {
      const value = await systemConfigService.get(LAST_CHECK_KEY, null)

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: { last_check_time: value }
      }
    } catch (error) {
      console.log('获取最后检测时间失败:', error)
      ctx.body = {
        code: 1,
        message: '获取失败: ' + error.message,
        data: null
      }
    }
  }


  /**
   * Clickflare 域名覆盖对比（前端域名检测页展示：哪些 Clickflare 在用域名未纳入检测）
   */
  async coverage(ctx, next) {
    try {
      const data = await domainsService.coverageList()
      ctx.body = {
        code: 0,
        message: '获取成功',
        data
      }
    } catch (error) {
      console.log('获取域名覆盖对比失败:', error)
      ctx.body = {
        code: 1,
        message: '获取失败: ' + error.message,
        data: null
      }
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

  /**
   * 写入替换过程日志(url_detection_database 调用, internal 无鉴权)
   * body: { domain, event, detail }
   */
  async writeReplacementLog(ctx, next) {
    const { domain, event, detail, round } = ctx.request.body || {}

    if (!domain || !event) {
      ctx.body = { code: 400, message: 'domain 和 event 不能为空', data: null }
      return
    }

    try {
      const roundNo = Number.isInteger(round) && round >= 1 && round <= 9 ? round : null
      await domainsService.writeReplacementLog(
        domain,
        event,
        typeof detail === 'string' ? detail : JSON.stringify(detail ?? {}),
        roundNo
      )
      ctx.body = { code: 0, message: 'ok', data: null }
    } catch (error) {
      console.error('写入替换过程日志失败:', error)
      ctx.body = { code: 500, message: error.message, data: null }
    }
  }

  /**
   * 查询替换过程日志(前端展示用)
   * query: domain(可选, 精确过滤), limit(默认 100, 上限 500)
   */
  async getReplacementLogs(ctx, next) {
    try {
      const domain = ctx.query.domain || ''
      const limit = Math.min(Number(ctx.query.limit) || 100, 500)
      const list = await domainsService.getReplacementLogs(domain, limit)
      ctx.body = { code: 0, message: '获取成功', data: { list } }
    } catch (error) {
      console.error('查询替换过程日志失败:', error)
      ctx.body = { code: 500, message: error.message, data: null }
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