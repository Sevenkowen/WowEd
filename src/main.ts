import { createApp } from 'vue'
import './css/app.css'
import App from './App.vue'
import { registerBoot } from './boot/register'
import { initColorMode } from './composables/colorMode'
import { router } from './router'

initColorMode()

const app = createApp(App)
registerBoot(app)
app.use(router)
app.mount('#app')
