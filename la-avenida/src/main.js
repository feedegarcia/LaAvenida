import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import Draggable from 'vuedraggable'

const app = createApp(App)
const pinia = createPinia()

app.component('draggable', Draggable)
app.use(pinia)
app.use(router)
app.mount('#app')