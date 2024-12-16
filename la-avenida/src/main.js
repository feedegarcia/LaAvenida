import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import axiosInstance from './utils/axios-config'
import Draggable from 'vuedraggable'

const app = createApp(App)
const pinia = createPinia()

// Hacer disponible axios globalmente
app.config.globalProperties.$axios = axiosInstance
app.component('draggable', Draggable)
app.use(pinia)
app.use(router)
app.mount('#app')