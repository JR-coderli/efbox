import { createApp } from 'vue'
import App from './App.vue'

import "normalize.css"
import "./assets/css/index.css"
import icons from './global/register-icons.js'
import router from './router'
import pinia from './stores'

const app = createApp(App)
app.use(icons)
app.use(pinia)
app.use(router)
app.mount('#app')
