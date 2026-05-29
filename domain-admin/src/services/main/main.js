import hyRequest from "@/services/request";


export function getEntireRoles() {
  return hyRequest.post({
    url: '/role/list'
  })
}


export function getEntireMenus() {
  return hyRequest.post({
    url: '/menu/list'
  })
}