const KoaRouter = require('@koa/router')
const { verifyAuth } = require('../middleware/login.middleware')
const { handleAttachmentUpload, handleVoucherUpload } = require('../middleware/file.middleware')
const {
  create, remove, update, list,
  uploadAttachment, uploadVoucher,
  removeAttachment, removeVoucher,
  customerList, entityOptions, currencyOptions, statusOptions
} = require('../controller/payment-track.controller')


const paymentTrackRouter = new KoaRouter({ prefix: '/payment_tracks' })





paymentTrackRouter.post('/', verifyAuth, create)

paymentTrackRouter.post('/list', verifyAuth, list)

paymentTrackRouter.post('/upload/attachment/:trackId', verifyAuth, handleAttachmentUpload, uploadAttachment)

paymentTrackRouter.post('/upload/voucher/:trackId', verifyAuth, handleVoucherUpload, uploadVoucher)

paymentTrackRouter.delete('/attachment/:attachmentId', verifyAuth, removeAttachment)

paymentTrackRouter.delete('/voucher/:voucherId', verifyAuth, removeVoucher)

paymentTrackRouter.post('/customers', verifyAuth, customerList)

paymentTrackRouter.post('/options/entity', verifyAuth, entityOptions)

paymentTrackRouter.post('/options/currency', verifyAuth, currencyOptions)

paymentTrackRouter.post('/options/status', verifyAuth, statusOptions)

paymentTrackRouter.delete('/:trackId', verifyAuth, remove)

paymentTrackRouter.patch('/:trackId', verifyAuth, update)


module.exports = paymentTrackRouter
