import hyRequest from '@/services/request'

const BASE_URL = '/domain-monetstatus-notice'

export function getNoticeList(params) {
  return hyRequest.post({
    url: `${BASE_URL}/list`,
    data: params
  })
}

export function deleteNotice(id) {
  return hyRequest.delete({
    url: `${BASE_URL}/${id}`
  })
}
