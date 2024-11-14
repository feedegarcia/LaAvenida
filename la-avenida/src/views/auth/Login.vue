
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
                    <div v-if="error" class="text-red-500 text-sm text-center">
                        {{ error }}
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
    import axios from 'axios'

    const router = useRouter()
    const email = ref('')
    const password = ref('')
    const error = ref('')
    const loading = ref(false)

    const handleLogin = async () => {
        try {
            loading.value = true
            error.value = ''

            console.log('Intentando login con:', { email: email.value, password: password.value }); // Debug

            const response = await axios.post('http://localhost:3000/api/auth/login', {
                email: email.value,
                password: password.value
            })

            console.log('Respuesta del servidor:', response.data); // Debug

            localStorage.setItem('token', response.data.token)
            router.push('/')
        } catch (err) {
            console.error('Error completo:', err); // Debug
            error.value = err.response?.data?.message || 'Error al iniciar sesión'
        } finally {
            loading.value = false
        }
    }
</script>
