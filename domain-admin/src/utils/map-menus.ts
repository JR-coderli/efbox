import type { RouteRecordRaw } from 'vue-router'
import dashboard from '@/router/main/analysis/dashboard/dashboard'
import overview from '@/router/main/analysis/overview/overview'
import role from '@/router/main/system/role/role'
import user from '@/router/main/system/user/user'
import landingpage from '@/router/main/webpage/landingpage/landingpage'
import email from '@/router/main/settings/email/email'
import log from '@/router/main/settings/log/log'
import customers from '@/router/main/invoice/customers/customers'
import attachment from '@/router/main/invoice/attachment/attachment'
import playground from '@/router/main/webpage/playground/playground'
import landers from '@/router/main/webpage/landers/landers'
import lpProjects from '@/router/main/webpage/lp-projects/lp-projects'
import invoiceentity from '@/router/main/invoice/invoiceentity/invoiceentity'
import domainname from '@/router/main/timer/domains/domains'
import pushnami from '@/router/main/timer/pushnami/pushnami'
import clickflare from '@/router/main/timer/clickflare/clickflare'
import feishu from '@/router/main/timer/feishu/feishu'
import report from '@/router/main/webpage/report/report'
import paymentCustomers from '@/router/main/payment/customers/customers'
import paymentTracks from '@/router/main/payment/tracks/tracks'


function loadLocalRoutes() {



  const localRoutes: RouteRecordRaw[] = [] // 这个RouteRecordRaw[]类型表示的是Route对象 { path: '', component: '' }的类型。


  localRoutes.push(dashboard)
  localRoutes.push(overview)
  localRoutes.push(role)
  localRoutes.push(user)
  localRoutes.push(landingpage)
  localRoutes.push(domainname)
  localRoutes.push(email)
  localRoutes.push(log)
  localRoutes.push(customers)
  localRoutes.push(attachment)
  localRoutes.push(playground)
  localRoutes.push(landers)
  localRoutes.push(lpProjects)
  localRoutes.push(invoiceentity)
  localRoutes.push(pushnami)
  localRoutes.push(clickflare)
  localRoutes.push(feishu)
  localRoutes.push(report)
  localRoutes.push(paymentCustomers)
  localRoutes.push(paymentTracks)

  return localRoutes
}


export let firstMenu: any = null


export function resetFirstMenu() {
  firstMenu = null
}

export function mapMenusToRoutes(userMenus: any[]) {

  const localRoutes = loadLocalRoutes()


  const routes: RouteRecordRaw[] = []
  for (const menu of userMenus) {

    if (menu.directLink === 1 && menu.url) {
      const route = localRoutes.find((item) => item.path === menu.url)
      if (route) {
        routes.push(route)

        if (!firstMenu) firstMenu = menu
      }
    }


    for (const submenu of menu.children ?? []) {
      const route = localRoutes.find((item) => item.path === submenu.url)
      if (route) {

        if (!routes.find((item) => item.path === menu.url)) {
          routes.push({ path: menu.url, redirect: route.path })
        }


        routes.push(route)


        if (!firstMenu && menu.directLink !== 1) {
          firstMenu = submenu
        }
      }
    }
  }

  return routes
}



export function mapPathToMenu(path: string, userMenus: any[]) {
  for (const menu of userMenus) {

    if (menu.url === path) {
      return menu
    }

    for (const submenu of menu.children ?? []) {
      if (submenu.url === path) {
        return submenu
      }
    }
  }
}



interface IBreadcrumbs {
  name: string
  path: string
}
export function mapPathToBreadcrumbs(path: string, userMenus: any[]) {

  const breadcrumbs: IBreadcrumbs[] = []


  for (const menu of userMenus) {

    if (menu.url === path) {
      breadcrumbs.push({ name: menu.name, path: menu.url })
      return breadcrumbs
    }

    for (const submenu of menu.children ?? []) {
      if (submenu.url === path) {

        breadcrumbs.push({ name: menu.name, path: menu.url })

        breadcrumbs.push({ name: submenu.name, path: submenu.url })
      }
    }
  }
  return breadcrumbs
}



export function mapMenuListToIds(menuList: any[]) {
  const ids: number[] = []

  function recurseGetId(menus: any[]) {
    for (const item of menus) {
      if (item.children) {
        recurseGetId(item.children)
      } else {
        ids.push(item.id)
      }
    }
  }
  recurseGetId(menuList)

  return ids
}


export function mapMenusToPermissions(menuList: any[]) {
  const permission: string[] = []

  function recurseGetPermission(menus: any[]) {
    for (const item of menus) {
      if (item.type === 3) {
        permission.push(item.permission)
      } else {
        recurseGetPermission(item.children ?? []) // 传入空数组防止出现遍历 "const itme of null"而报错。
      }
    }
  }
  recurseGetPermission(menuList)

  return permission
}
