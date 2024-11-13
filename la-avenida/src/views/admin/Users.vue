
<template>
    <div>
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-avenida-black">Gestión de Usuarios</h2>
            <button @click="crearNuevoUsuario"
                    class="px-4 py-2 bg-avenida-green text-white rounded hover:bg-green-600 transition-colors">
                Nuevo Usuario
            </button>
        </div>
        <div class="flex items-center space-x-2 mb-4">
            <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox"
                       v-model="showInactive"
                       class="sr-only peer">
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-avenida-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-avenida-green"></div>
            </label>
            <span class="text-sm text-gray-600">Mostrar inactivos</span>
        </div>
        <!-- Tabla de usuarios -->
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th @click="sortBy('nombre')"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                            <div class="flex items-center space-x-1">
                                <span>Nombre</span>
                                <span v-if="sortKey === 'nombre'" class="text-avenida-green">
                                    {{ sortOrder === 'asc' ? '^' : 'v' }}
                                </span>
                            </div>
                        </th>
                        <th @click="sortBy('email')"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                            <div class="flex items-center space-x-1">
                                <span>Email</span>
                                <span v-if="sortKey === 'email'" class="text-avenida-green">
                                    {{ sortOrder === 'asc' ? '^' : 'v' }}
                                </span>
                            </div>
                        </th>
                        <th @click="sortBy('rol')"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                            <div class="flex items-center space-x-1">
                                <span>Rol</span>
                                <span v-if="sortKey === 'rol'" class="text-avenida-green">
                                    {{ sortOrder === 'asc' ? '^' : 'v' }}
                                </span>
                            </div>
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sucursales
                        </th>
                        <th @click="sortBy('activo')"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                            <div class="flex items-center space-x-1">
                                <span>Estado</span>
                                <span v-if="sortKey === 'activo'" class="text-avenida-green">
                                    {{ sortOrder === 'asc' ? '^' : 'v' }}
                                </span>
                            </div>
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    <tr v-for="user in sortedUsers" :key="user.usuario_id" class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap">{{ user.nombre }}</td>
                        <td class="px-6 py-4 whitespace-nowrap">{{ user.email }}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span :class="{
                                    'px-2 py-1 text-xs rounded-full': true,
                                    'bg-blue-100 text-blue-800': user.rol === 'ADMIN',
                                    'bg-green-100 text-green-800': user.rol === 'EMPLEADO',
                                    'bg-purple-100 text-purple-800': user.rol === 'DUEÑO'
                                }">
                                {{ user.rol }}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex flex-wrap gap-1">
                                <span v-for="sucursal in user.sucursales"
                                      :key="sucursal.sucursal_id"
                                      class="px-2 py-1 text-xs rounded-full bg-gray-100">
                                    {{ sucursal.nombre }}
                                </span>
                                <span v-if="!user.sucursales?.length"
                                      class="text-gray-400">
                                    No asignada
                                </span>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span :class="{
                                    'px-2 py-1 text-xs rounded-full': true,
                                    'bg-green-100 text-green-800': user.activo,
                                    'bg-red-100 text-red-800': !user.activo
                                }">
                                {{ user.activo ? 'Activo' : 'Inactivo' }}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap space-x-2">
                            <button @click="editUser(user)"
                                    class="text-blue-600 hover:text-blue-900">
                                Editar
                            </button>
                            <button @click="toggleUserStatus(user)"
                                    :class="{
                                    'text-red-600 hover:text-red-900': user.activo,
                                    'text-green-600 hover:text-green-900': !user.activo
                                }">
                                {{ user.activo ? 'Desactivar' : 'Activar' }}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Modal -->
        <UserModal :show="showModal"
                   :editing-user="editingUser"
                   @close="showModal = false"
                   @saved="loadUsers" />
    </div>
</template>

<script setup>
    import { ref, onMounted, computed } from 'vue'
    import axios from 'axios'
    import UserModal from '../../components/usuarios/UserModal.vue'
    const showInactive = ref(false)
    const users = ref([])
    const showModal = ref(false)
    const loading = ref(false)
    const error = ref('')
    const editingUser = ref(null)

    // Ordenamiento
    const sortKey = ref('nombre')
    const sortOrder = ref('asc')

    const sortBy = (key) => {
        if (sortKey.value === key) {
            sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
        } else {
            sortKey.value = key
            sortOrder.value = 'asc'
        }
    }

    const sortedUsers = computed(() => {
        let filtered = [...users.value]

        // Aplicar filtro de activos/inactivos
        if (!showInactive.value) {
            filtered = filtered.filter(u => u.activo)
        }

        // Aplicar ordenamiento
        return filtered.sort((a, b) => {
            let aValue = a[sortKey.value]
            let bValue = b[sortKey.value]

            if (typeof aValue === 'boolean') {
                aValue = aValue ? 1 : 0
                bValue = bValue ? 1 : 0
            }

            if (sortKey.value === 'sucursales') {
                aValue = a.sucursales?.length || 0
                bValue = b.sucursales?.length || 0
            }

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase()
                bValue = bValue.toLowerCase()
            }

            if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1
            if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1
            return 0
        })
    })

    const loadUsers = async () => {
        try {
            loading.value = true
            const response = await axios.get('http://localhost:3000/api/users', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            users.value = response.data
        } catch (err) {
            console.error('Error cargando usuarios:', err)
            error.value = 'Error al cargar usuarios'
        } finally {
            loading.value = false
        }
    }

    const editUser = (user) => {
        editingUser.value = user
        showModal.value = true
    }

    const crearNuevoUsuario = () => {
        editingUser.value = null
        showModal.value = true
    }

    const toggleUserStatus = async (user) => {
        try {
            await axios.patch(`http://localhost:3000/api/users/${user.usuario_id}/status`,
                { activo: !user.activo },
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            )
            await loadUsers()
        } catch (err) {
            console.error('Error actualizando estado:', err)
            error.value = 'Error al actualizar estado del usuario'
        }
    }

    onMounted(() => {
        loadUsers()
    })


</script>

