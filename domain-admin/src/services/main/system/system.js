import hyRequest from '@/services/request'

/* 一、所有菜单的网络请求 */

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

/* 二、其他内容的网络请求 */

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