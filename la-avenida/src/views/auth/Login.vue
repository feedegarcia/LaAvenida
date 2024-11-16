<template>
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
        <div class="max-w-md w-full">
            <div class="bg-white rounded-lg shadow-lg p-8">
                <div class="text-center mb-8">
                    <h2 class="text-2xl font-bold text-avenida-black">La Avenida</h2>
                    <p class="text-gray-600">Ingresa a tu cuenta</p>
                </div>

                <form @submit.prevent="handleLogin" class="space-y-6">
                    <!-- Email -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input type="email"
                               v-model="email"
                               required
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-avenida-green">
                    </div>

                    <!-- Password -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                            Contraseña
                        </label>
                        <input type="password"
                               v-model="password"
                               required
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-avenida-green">
                    </div>

                    <!-- Error message -->
                    <div v-if="error"
                         class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative text-sm">
                        {{ error }}
                    </div>

                    <!-- Debug info en desarrollo -->
                    <div v-if="debug" class="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        <pre>{{ debug }}</pre>
                    </div>

                    <!-- Submit button -->
                    <div>
                        <button type="submit"
                                :disabled="loading"
                                class="w-full bg-avenida-black text-white py-2 px-4 rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50">
                            {{ loading ? 'Ingresando...' : 'Ingresar' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref } from 'vue'
    import { useRouter } from 'vue-router'
    import { useAuthStore } from '@/stores/auth'
    import axios from 'axios'

    const router = useRouter()
    const authStore = useAuthStore()
    const email = ref('')
    const password = ref('')
    const error = ref('')
    const loading = ref(false)
    const debug = ref(null) // Para información de depuración

    // Limpiar cualquier token antiguo al cargar el componente
    localStorage.removeItem('token')
    authStore.logout()

    const handleLogin = async () => {
        try {
            loading.value = true
            error.value = ''
            debug.value = null

            // Log de intento de login
            console.log('Intentando login con:', { email: email.value })

            const response = await axios.post('http://localhost:3000/api/auth/login', {
                email: email.value,
                password: password.value
            })

            // Log de respuesta exitosa
            console.log('Login exitoso:', {
                token: response.data.token ? 'Presente' : 'Ausente',
                user: response.data.user
            })

            if (!response.data.token) {
                throw new Error('No se recibió token de autenticación')
            }

            localStorage.setItem('token', response.data.token)
            authStore.setToken(response.data.token)
            await router.push('/')

        } catch (err) {
            console.error('Error completo:', err)

            // Información detallada del error para depuración
            debug.value = {
                status: err.response?.status,
                statusText: err.response?.statusText,
                data: err.response?.data,
                message: err.message
            }

            error.value = err.response?.data?.message ||
                'Error al iniciar sesión. Por favor, verifica tus credenciales.'
        } finally {
            loading.value = false
        }
    }
</script>