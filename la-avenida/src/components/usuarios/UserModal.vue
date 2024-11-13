<template>
    <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold">
                    {{ editingUser ? 'Editar Usuario' : 'Nuevo Usuario' }}
                </h3>
                <button @click="handleClose" class="text-gray-500 hover:text-gray-700 px-2 py-1">
                    &times;
                </button>
            </div>

            <form @submit.prevent="handleSubmit" class="space-y-4">
                <!-- Nombre -->
                <div>
                    <label class="block text-sm font-medium text-gray-700">Nombre</label>
                    <input v-model="formData.nombre"
                           type="text"
                           required
                           :disabled="loading"
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green">
                </div>

                <!-- Email -->
                <div>
                    <label class="block text-sm font-medium text-gray-700">Email</label>
                    <input v-model="formData.email"
                           type="email"
                           required
                           :disabled="editingUser || loading"
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green">
                </div>

                <!-- Contraseña (solo para nuevos usuarios) -->
                <div v-if="!editingUser">
                    <label class="block text-sm font-medium text-gray-700">Contraseña</label>
                    <input v-model="formData.password"
                           type="password"
                           required
                           :disabled="loading"
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green">
                </div>

                <!-- Rol -->
                <div>
                    <label class="block text-sm font-medium text-gray-700">Rol</label>
                    <select v-model="formData.rol_id"
                            required
                            :disabled="loading"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green">
                        <option v-for="rol in roles"
                                :key="rol.rol_id"
                                :value="rol.rol_id">
                            {{ rol.nombre }}
                        </option>
                    </select>
                </div>

                <!-- Sucursal -->
                <div>
                    <label class="block text-sm font-medium text-gray-700">Sucursales</label>
                    <div class="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                        <div v-for="sucursal in sucursales"
                             :key="sucursal.sucursal_id"
                             class="flex items-center space-x-2">
                            <input type="checkbox"
                                   :id="'sucursal-' + sucursal.sucursal_id"
                                   v-model="selectedSucursales"
                                   :value="sucursal.sucursal_id"
                                   :disabled="loading || (!sucursal.activo && !selectedSucursales.includes(sucursal.sucursal_id))"
                                   class="rounded border-gray-300 text-avenida-green focus:ring-avenida-green">
                            <label :for="'sucursal-' + sucursal.sucursal_id"
                                   class="flex items-center space-x-2">
                                <span :class="{'text-gray-400': !sucursal.activo}">
                                    {{ sucursal.nombre }}
                                </span>
                                <span v-if="!sucursal.activo"
                                      class="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                                    Inactiva
                                </span>
                            </label>
                        </div>
                    </div>
                    <p class="text-sm text-gray-500 mt-1">
                        * Las sucursales inactivas solo aparecerán si el usuario ya estaba asignado a ellas
                    </p>
                </div>

                <!-- Error message -->
                <div v-if="error"
                     class="text-red-500 text-sm p-2 bg-red-50 rounded-md border border-red-200">
                    {{ error }}
                </div>

                <div class="flex justify-end space-x-3 pt-4">
                    <button type="button"
                            @click="handleClose"
                            :disabled="loading"
                            class="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50">
                        Cancelar
                    </button>
                    <button type="submit"
                            class="px-4 py-2 bg-avenida-green text-white rounded hover:bg-green-600 disabled:opacity-50"
                            :disabled="loading">
                        {{ loading ? 'Guardando...' : 'Guardar' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
    import { ref, watch, onMounted } from 'vue'
    import axios from 'axios'

    const props = defineProps({
        show: Boolean,
        editingUser: Object
    })

    const emit = defineEmits(['close', 'saved'])

    const loading = ref(false)
    const error = ref('')
    const roles = ref([])
    const sucursales = ref([])
    const selectedSucursales = ref([])
    const formData = ref({
        nombre: '',
        email: '',
        password: '',
        rol_id: '',
        sucursal_id: ''
    })

    // Cargar roles y sucursales
    const cargarDatos = async () => {
        try {
            loading.value = true
            error.value = ''

            const [rolesRes, sucursalesRes] = await Promise.all([
                axios.get('http://localhost:3000/api/users/roles', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }),
                axios.get('http://localhost:3000/api/sucursales', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                })
            ])

            roles.value = rolesRes.data
            sucursales.value = sucursalesRes.data
        } catch (err) {
            console.error('Error cargando datos:', err)
            error.value = 'Error al cargar datos. Por favor, recarga la página.'
        } finally {
            loading.value = false
        }
    }

    const resetForm = () => {
        formData.value = {
            nombre: '',
            email: '',
            password: '',
            rol_id: '',
            sucursal_id: ''
        }
        error.value = ''
    }

    const handleClose = () => {
        if (!loading.value) {
            resetForm()
            emit('close')
        }
    }

    const handleSubmit = async () => {
        try {
            loading.value = true;
            error.value = '';

            // Asegurarnos que selectedSucursales sea un array y no tenga duplicados
            const sucursalesUnicas = [...new Set(selectedSucursales.value)];

            const dataToSend = {
                nombre: formData.value.nombre,
                email: formData.value.email,
                rol_id: formData.value.rol_id,
                sucursales: sucursalesUnicas
            };

            if (!props.editingUser) {
                dataToSend.password = formData.value.password;
            }

            const url = props.editingUser
                ? `http://localhost:3000/api/users/${props.editingUser.usuario_id}`
                : 'http://localhost:3000/api/users';

            const method = props.editingUser ? 'patch' : 'post';

            const response = await axios[method](url, dataToSend, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            resetForm();
            emit('saved');
            emit('close');
        } catch (err) {
            console.error('Error completo:', err);
            error.value = err.response?.data?.message || 'Error al guardar usuario';
        } finally {
            loading.value = false;
        }
    };

    watch(() => props.editingUser, async (user) => {
        if (user) {
            // Cargar las sucursales asignadas al usuario
            try {
                const response = await axios.get(`http://localhost:3000/api/users/${user.usuario_id}/sucursales`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                })
                selectedSucursales.value = response.data.map(s => s.sucursal_id)
                formData.value = {
                    nombre: user.nombre,
                    email: user.email,
                    rol_id: user.rol_id
                }
            } catch (err) {
                console.error('Error cargando sucursales del usuario:', err)
                error.value = 'Error al cargar las sucursales asignadas'
            }
        } else {
            selectedSucursales.value = []
            resetForm()
        }
    }, { immediate: true })

    watch(() => props.show, (isVisible) => {
        if (isVisible) {
            cargarDatos()
            if (!props.editingUser) {
                resetForm()
            }
        }
    })

    onMounted(() => {
        if (props.show) {
            cargarDatos()
        }
    })
</script>