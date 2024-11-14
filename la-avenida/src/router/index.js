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
            requiresAdmin: true
        }
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
            requiresAdmin: true
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

// Guard de navegación mejorado
router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')

    if (to.meta.requiresAuth && !token) {
        next('/login')
        return
    }

    if (to.meta.requiresAdmin && token) {
        try {
            const decoded = jwtDecode(token)
            if (decoded.rol !== 'ADMIN' && decoded.rol !== 'DUEÑO') {
                next('/')
                return
            }
        } catch (error) {
            next('/login')
            return
        }
    }

    if (to.path === '/login' && token) {
        next('/')
        return
    }

    next()
})

export default router
