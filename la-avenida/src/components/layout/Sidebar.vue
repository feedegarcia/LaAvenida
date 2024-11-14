<template>
    <div class="fixed inset-y-0 left-0 w-64 bg-avenida-black text-white">
        <div class="p-4">
            <h2 class="text-2xl font-bold mb-8">La Avenida</h2>
            <div class="text-sm mb-4 text-gray-400">
                Rol actual: {{ userRole || 'No detectado' }}
            </div>
            <nav class="space-y-2">
                <router-link to="/"
                             class="block py-2.5 px-4 rounded transition duration-200 hover:bg-avenida-green"
                             active-class="bg-avenida-green">
                    Dashboard
                </router-link>

                <!-- Link de Usuarios solo para admins -->
                <router-link v-if="userRole === 'ADMIN'"
                             to="/admin/users"
                             class="block py-2.5 px-4 rounded transition duration-200 hover:bg-avenida-green"
                             active-class="bg-avenida-green">
                    Usuarios
                </router-link>
                <!-- Agregar después del link de Usuarios -->
                <router-link v-if="userRole === 'ADMIN'"
                             to="/admin/sucursales"
                             class="block py-2.5 px-4 rounded transition duration-200 hover:bg-avenida-green"
                             active-class="bg-avenida-green">
                    Sucursales
                </router-link>

                <router-link to="/pedidos"
                             class="block py-2.5 px-4 rounded transition duration-200 hover:bg-avenida-green"
                             active-class="bg-avenida-green">
                    Pedidos
                </router-link>

                <router-link to="/stock"
                             class="block py-2.5 px-4 rounded transition duration-200 hover:bg-avenida-green"
                             active-class="bg-avenida-green">
                    Stock
                </router-link>

                <router-link to="/cierre-caja"
                             class="block py-2.5 px-4 rounded transition duration-200 hover:bg-avenida-green"
                             active-class="bg-avenida-green">
                    Cierre de Caja
                </router-link>

                <router-link to="/calendario"
                             class="block py-2.5 px-4 rounded transition duration-200 hover:bg-avenida-green"
                             active-class="bg-avenida-green">
                    Calendario
                </router-link>

                <a href="#"
                   @click.prevent="logout"
                   class="block py-2.5 px-4 rounded transition duration-200 hover:bg-avenida-green">
                    Cerrar Sesión
                </a>
            </nav>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue'
    import { useRouter } from 'vue-router'
    import { jwtDecode } from 'jwt-decode'  // Cambiado a esta forma

    const router = useRouter()
    const userRole = ref('')

    const logout = async () => {
        localStorage.removeItem('token')
        await router.push('/login')
        window.location.reload()
    }

    onMounted(() => {
        try {
            const token = localStorage.getItem('token')
            if (token) {
                const decoded = jwtDecode(token)  // Y usar directamente jwtDecode
                userRole.value = decoded.rol
            }
        } catch (error) {
            console.error('Error decodificando token:', error)
        }
    })
</script>
