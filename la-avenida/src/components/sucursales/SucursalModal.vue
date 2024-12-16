<template>
    <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div class="bg-white rounded-lg p-6 w-full max-w-xl">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold">
                    {{ editingSucursal ? 'Editar Sucursal' : 'Nueva Sucursal' }}
                </h3>
                <button @click="cerrarModal" class="text-gray-500 hover:text-gray-700">
                    &times;
                </button>
            </div>

            <form @submit.prevent="guardarSucursal" class="space-y-4">
                <!-- Nombre -->
                <div>
                    <label class="block text-sm font-medium text-gray-700">Nombre</label>
                    <input v-model="formData.nombre"
                           type="text"
                           required
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                </div>

                <!-- Direccion -->
                <div>
                    <label class="block text-sm font-medium text-gray-700">Direccion</label>
                    <input v-model="formData.direccion"
                           type="text"
                           required
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                </div>

                <!-- Telefono -->
                <div>
                    <label class="block text-sm font-medium text-gray-700">Telefono</label>
                    <input v-model="formData.telefono"
                           type="text"
                           required
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                </div>

                <!-- Tipo -->
                <div>
                    <label class="block text-sm font-medium text-gray-700">Tipo</label>
                    <select v-model="formData.tipo"
                            required
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        <option value="FABRICA_VENTA">Fabrica y Venta</option>
                        <option value="SOLO_VENTA">Solo Venta</option>
                    </select>
                </div>

                <!-- Color -->
                <ColorPicker v-model="formData.color">
                    Color de identificacion
                </ColorPicker>

                <!-- Horario de atencion -->
                <div>
                    <label class="block text-sm font-medium text-gray-700">Horario de Atencion</label>
                    <input v-model="formData.horario_atencion"
                           type="text"
                           placeholder="Ej: 9:00 a 20:00"
                           required
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                </div>

                <div class="flex justify-end space-x-3 pt-4">
                    <button type="button"
                            @click="cerrarModal"
                            class="px-4 py-2 border rounded hover:bg-gray-100">
                        Cancelar
                    </button>
                    <button type="submit"
                            class="px-4 py-2 bg-avenida-green text-white rounded hover:bg-green-600"
                            :disabled="loading">
                        {{ loading ? 'Guardando...' : 'Guardar' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
    import { ref, watch } from 'vue';
    import axios from 'axios';
    import ColorPicker from '../shared/ColorPicker.vue';

    const props = defineProps({
        show: Boolean,
        editingSucursal: Object
    });

    const emit = defineEmits(['close', 'saved']);
    const loading = ref(false);

    const formData = ref({
        nombre: '',
        direccion: '',
        telefono: '',
        tipo: 'SOLO_VENTA',
        horario_atencion: '',
        color: '#FFFFFF'
    });

    watch(() => props.editingSucursal, (sucursal) => {
        if (sucursal) {
            formData.value = {
                ...sucursal,
                color: sucursal.color || '#FFFFFF'
            };
        } else {
            formData.value = {
                nombre: '',
                direccion: '',
                telefono: '',
                tipo: 'SOLO_VENTA',
                horario_atencion: '',
                color: '#FFFFFF'
            };
        }
    });

    const guardarSucursal = async () => {
        try {
            loading.value = true;
            const url = props.editingSucursal
                ? `http://localhost:3000/api/sucursales/${props.editingSucursal.sucursal_id}`
                : 'http://localhost:3000/api/sucursales';

            const method = props.editingSucursal ? 'patch' : 'post';

            await axios[method](url, formData.value, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            emit('saved');
            cerrarModal();
        } catch (error) {
            console.error('Error guardando sucursal:', error);
        } finally {
            loading.value = false;
        }
    };

    const cerrarModal = () => {
        emit('close');
    };
</script>