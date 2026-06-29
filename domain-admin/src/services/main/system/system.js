import hyRequest from '@/services/request'



export function postPageListData(pageName, queryInfo, listType) {
  return hyRequest.post({
    url: `/${pageName}/${listType}`,
    data: queryInfo
  })
}


export function deletePageById(pageName, id) {
  return hyRequest.delete({
    url: `/${pageName}/${id}`
  })
}


export function newPageData(pageName, pageInfo) {
  return hyRequest.post({
    url: `/${pageName}`,
    data: pageInfo
  })
}


export function editPageData(pageName, id, pageInfo) {
  return hyRequest.patch({
    url: `/${pageName}/${id}`,
    data: pageInfo
  })
}



export function editDomainsIsimport(id, isImportant) {
  return hyRequest.patch({
    url: `/domains/is_important/${id}/${isImportant}`
  })
}


export function checkLandingPagePath(url) {
  return hyRequest.post({
    url: `/email/check-url`,
    body: JSON.stringify({ url }),
  })
}


export function sendEmail(queryInfo) {
  return hyRequest.post({
    url: `/cus_attachments/send-email`,
    data: queryInfo
  })
}


export function generatePdf(pageName, queryInfo) {
  return hyRequest.post({
    url: `/${pageName}/generate`,
    data: queryInfo
  })
}


export function editCustomerRemark(id, remarkInfo) {
  return hyRequest.patch({
    url: `/customers/remark/${id}`,
    data: remarkInfo
  })
}


export function editCustomerPayDay(id, dayInfo) {
  return hyRequest.patch({
    url: `/customers/pay_cycle_days/${id}`,
    data: dayInfo
  })
}

export function postCustomerList(queryInfo) {
  return hyRequest.post({
    url: `/cus_attachments/customers`,
    data: queryInfo
  })
}


export function setTopInvoiceEntity(id) {
  return hyRequest.post({
    url: `/invoiceentity/setTop`,
    data: { id }
  })
}


export function getTopInvoiceEntity() {
  return hyRequest.get({
    url: `/invoiceentity/getTop`
  })
}


export function editPaymentCustomerRemark(id, remarkInfo) {
  return hyRequest.patch({
    url: `/payment_customers/remark/${id}`,
    data: remarkInfo
  })
}


export function editPaymentCustomerPayDay(id, dayInfo) {
  return hyRequest.patch({
    url: `/payment_customers/pay_cycle_days/${id}`,
    data: dayInfo
  })
}


export function getPaymentTrackCustomers() {
  return hyRequest.post({
    url: `/payment_tracks/customers`
  })
}


export function deletePaymentTrackAttachment(attachmentId) {
  return hyRequest.delete({
    url: `/payment_tracks/attachment/${attachmentId}`
  })
}


export function deletePaymentTrackVoucher(voucherId) {
  return hyRequest.delete({
    url: `/payment_tracks/voucher/${voucherId}`
  })
}


export function getPaymentTrackEntityOptions() {
  return hyRequest.post({
    url: `/payment_tracks/options/entity`
  })
}


export function getPaymentTrackCurrencyOptions() {
  return hyRequest.post({
    url: `/payment_tracks/options/currency`
  })
}


export function getPaymentTrackStatusOptions() {
  return hyRequest.post({
    url: `/payment_tracks/options/status`
  })
}


export function renamePaymentTrackStatus(oldStatus, newStatus) {
  return hyRequest.post({
    url: `/payment_tracks/options/status/rename`,
    data: { oldStatus, newStatus }
  })
}