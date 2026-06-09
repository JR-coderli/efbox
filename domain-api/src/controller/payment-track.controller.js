const paymentTrackService = require('../service/payment-track.service')
const operationLogService = require('../service/operation-log.service')
const fs = require('fs')
const path = require('path')

class PaymentTrackController {

  async create(ctx, next) {
    const trackInfo = ctx.request.body
    trackInfo.created_by = ctx.user.id

    const result = await paymentTrackService.create(trackInfo)

    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'payment_track',
      'create',
      `新增付款追踪记录: ${trackInfo.period || ''} - ${trackInfo.amount || 0}`,
      null,
      { amount: trackInfo.amount, period: trackInfo.period }
    )

    ctx.body = {
      code: 0,
      message: '新增付款追踪成功',
      data: { insertId: result.insertId }
    }
  }


  async remove(ctx, next) {
    const { trackId } = ctx.params

    await paymentTrackService.remove(trackId)

    operationLogService.log(
      ctx.user.id,
      ctx.user.name,
      'payment_track',
      'delete',
      `删除付款追踪记录 trackId: ${trackId}`,
      null,
      null
    )

    ctx.body = {
      code: 0,
      message: '删除成功'
    }
  }


  async update(ctx, next) {
    const { trackId } = ctx.params
    const trackInfo = ctx.request.body

    const changes = []
    if (trackInfo.amount_paid !== undefined) changes.push(`amount_paid: ${trackInfo.amount_paid}`)
    if (trackInfo.payment_status !== undefined) changes.push(`payment_status: ${trackInfo.payment_status}`)
    if (trackInfo.confirmed_date !== undefined) changes.push(`confirmed_date: ${trackInfo.confirmed_date}`)

    await paymentTrackService.update(trackId, trackInfo)

    if (changes.length > 0) {
      operationLogService.log(
        ctx.user.id,
        ctx.user.name,
        'payment_track',
        'update',
        `修改付款追踪记录 trackId: ${trackId}`,
        null,
        { changes: changes.join(', ') }
      )
    }

    ctx.body = {
      code: 0,
      message: '更新成功'
    }
  }


  async list(ctx, next) {
    const trackInfo = ctx.request.body

    if (!trackInfo.user_id) {
      trackInfo.user_id = ctx.user.id
    }

    const page = trackInfo.page
    const pageSize = trackInfo.pageSize

    const result = await paymentTrackService.list(trackInfo)

    ctx.body = {
      code: 0,
      message: '付款追踪列表',
      data: {
        list: result.rows,
        allCount: result.total,
        page: page ? Number(page) : null,
        pageSize: pageSize ? Number(pageSize) : null
      }
    }
  }


  async uploadAttachment(ctx, next) {
    const { trackId } = ctx.params
    const file = ctx.request.file

    if (!file) {
      ctx.body = { code: -1, message: '请选择文件' }
      return
    }

    const { filename, mimetype, size, destination } = file


    let thumbnailPath = null
    const thumbnailBase64 = ctx.request.body?.thumbnail
    if (thumbnailBase64) {
      try {
        const matches = thumbnailBase64.match(/^data:image\/\w+;base64,(.+)$/)
        if (matches) {
          const buffer = Buffer.from(matches[1], 'base64')
          const thumbDir = path.join(destination)
          const thumbFilename = `thumb_${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`
          const thumbFullPath = path.join(thumbDir, thumbFilename)
          fs.writeFileSync(thumbFullPath, buffer)
          thumbnailPath = `${destination}/${thumbFilename}`
        }
      } catch {

      }
    }

    const result = await paymentTrackService.createAttachment({
      payment_track_id: trackId,
      filename,
      mimetype,
      size,
      destination,
      thumbnail: thumbnailPath
    })

    ctx.body = {
      code: 0,
      message: '附件上传成功',
      data: { insertId: result.insertId, filename }
    }
  }


  async uploadVoucher(ctx, next) {
    const { trackId } = ctx.params
    const file = ctx.request.file

    if (!file) {
      ctx.body = { code: -1, message: '请选择文件' }
      return
    }

    const { filename, mimetype, size, destination } = file


    let thumbnailPath = null
    const thumbnailBase64 = ctx.request.body?.thumbnail
    if (thumbnailBase64) {
      try {
        const matches = thumbnailBase64.match(/^data:image\/\w+;base64,(.+)$/)
        if (matches) {
          const buffer = Buffer.from(matches[1], 'base64')
          const thumbDir = path.join(destination)
          const thumbFilename = `thumb_${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`
          const thumbFullPath = path.join(thumbDir, thumbFilename)
          fs.writeFileSync(thumbFullPath, buffer)
          thumbnailPath = `${destination}/${thumbFilename}`
        }
      } catch {

      }
    }

    const result = await paymentTrackService.createVoucher({
      payment_track_id: trackId,
      filename,
      mimetype,
      size,
      destination,
      thumbnail: thumbnailPath
    })

    ctx.body = {
      code: 0,
      message: '水单上传成功',
      data: { insertId: result.insertId, filename }
    }
  }


  async removeAttachment(ctx, next) {
    const { attachmentId } = ctx.params

    await paymentTrackService.removeAttachment(attachmentId)

    ctx.body = {
      code: 0,
      message: '附件已删除'
    }
  }


  async removeVoucher(ctx, next) {
    const { voucherId } = ctx.params

    await paymentTrackService.removeVoucher(voucherId)

    ctx.body = {
      code: 0,
      message: '水单已删除'
    }
  }


  async customerList(ctx, next) {
    const result = await paymentTrackService.customerList()

    ctx.body = {
      code: 0,
      message: '付款客户列表',
      data: {
        list: result
      }
    }
  }


  async entityOptions(ctx, next) {
    const result = await paymentTrackService.entityOptions()

    ctx.body = {
      code: 0,
      message: '付款主体选项',
      data: { list: result }
    }
  }


  async currencyOptions(ctx, next) {
    const result = await paymentTrackService.currencyOptions()

    ctx.body = {
      code: 0,
      message: '币种选项',
      data: { list: result }
    }
  }


  async statusOptions(ctx, next) {
    const result = await paymentTrackService.statusOptions()

    ctx.body = {
      code: 0,
      message: '付款状态选项',
      data: { list: result }
    }
  }
}

module.exports = new PaymentTrackController()
