import * as ElementPlusIconsVue from '@element-plus/icons-vue'

function registerIcons(app) {
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component) // 全局注册所有的ElementPlus图标组件
  }
}

export default registerIcons
