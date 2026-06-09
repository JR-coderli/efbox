import hyRequest from "@/services/request";


export function accountLoginRequest(account) {
  return hyRequest.post({
    url: "/cms_login",
    data: account
  })
}



export function accountRegisterRequest(account) {
  return hyRequest.post({
    url: '/cms_users',
    data: {
      ...account,
      roleId: 2
    }
  })
}


export function getUserInfoById(id) {
  return hyRequest.get({
    url: `/cms_users/${id}`
  })
}


export function getUserMenusByRoleId(id) {
  return hyRequest.get({
    url: `/role/${id}/menu`
  })
}
