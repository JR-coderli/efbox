import { createPinia } from 'pinia'
import useLoginStore from './login/login'

const pinia = createPinia()

function registerStore(app) {

  app.use(pinia)
}

export default registerStore
