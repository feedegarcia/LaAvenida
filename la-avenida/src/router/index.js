// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { jwtDecode } from 'jwt-decode'

// Importaciones de componentes
import Dashboard from '../views/Dashboard.vue'
import Pedidos from '../views/Pedidos.vue'
import Stock from '../views/Stock.vue'
import CierreCaja from '../views/CierreCaja.vue'
import Calendario from '../views/Calendario.vue'
import NuevoPedido from '../components/pedidos/NuevoPedido.vue'
import Login from '../views/auth/Login.vue'
import Users from '../views/admin/Users.vue'
import Sucursales from '../views/admin/Sucursales.vue'
import TimelinePedido from '../components/pedidos/TimelinePedido.vue'
import Productos from '../views/admin/Productos.vue'
import axios from 'axios'


const routes = [
    {
        path: '/login',
        name: 'Login',
        component: Login,
        meta: { requiresAuth: false }
    },
    {
        path: '/admin/users',
        name: 'Users',
        component: Users,
        meta: {
            requiresAuth: true,
            allowedRoles: ['DUEÑO', 'ADMIN']
        }
    },
    {
        path: '/admin/productos',
        name: 'Productos',
        component: Productos,
        meta: {
            requiresAuth: true,
            allowedRoles: ['DUEÑO', 'ADMIN', 'EMPLEADO']
        }
    },
    {
        path: '/pedidos/:id',
        name: 'DetallePedido',
        component: TimelinePedido,
        props: route => ({
            id: parseInt(route.params.id),
            sucursalActiva: parseInt(localStorage.getItem('ultimaSucursalSeleccionada')) || undefined
        })
    },
    {
        path: '/',
        name: 'Dashboard',
        component: Dashboard,
        meta: { requiresAuth: true }
    },
    {
        path: '/pedidos',
        name: 'Pedidos',
        component: Pedidos,
        meta: { requiresAuth: true }
    },
    {
        path: '/pedidos/nuevo',
        name: 'NuevoPedido',
        component: NuevoPedido,
        meta: { requiresAuth: true }
    },
    {
        path: '/stock',
        name: 'Stock',
        component: Stock,
        meta: { requiresAuth: true }
    },
    {
        path: '/cierre-caja',
        name: 'CierreCaja',
        component: CierreCaja,
        meta: { requiresAuth: true }
    },
    {
        path: '/admin/sucursales',
        name: 'Sucursales',
        component: Sucursales,
        meta: {
            requiresAuth: true,
            allowedRoles: ['DUEÑO', 'ADMIN']
        }
    },
    {
        path: '/calendario',
        name: 'Calendario',
        component: Calendario,
        meta: { requiresAuth: true }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

const verifyToken = (token) => {
    if (!token) return false;
    try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        // Verificar si el token esta expirado (8 horas)
        if (decoded.exp && decoded.exp < currentTime) {
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error verificando token:', error);
        return false;
    }
}

// Guard de navegacion mejorado
router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')

    // Si la ruta requiere autenticacion
    if (to.meta.requiresAuth) {
        if (!token || !verifyToken(token)) {
            localStorage.removeItem('token')
            next('/login')
            return
        }

        try {
            const decoded = jwtDecode(token)

            // Verificar roles permitidos
            if (to.meta.allowedRoles && !to.meta.allowedRoles.includes(decoded.rol)) {
                next('/')
                return
            }

            next()
        } catch (error) {
            console.error('Error verificando rol:', error)
            next('/login')
            return
        }
    } else if (to.path === '/login' && token && verifyToken(token)) {
        // Si intenta acceder al login con un token valido
        next('/')
    } else {
        next()
    }
})

// Configuracion global de axios
axios.defaults.baseURL = 'http://localhost:3000'

// Interceptor para agregar el token a todas las peticiones
axios.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    error => {
        return Promise.reject(error)
    }
)

// Interceptor para manejar errores de respuesta
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem('token')
            if (router.currentRoute.value.path !== '/login') {
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

export default router