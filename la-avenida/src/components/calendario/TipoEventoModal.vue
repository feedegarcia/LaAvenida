<template>
    <Dialog :open="show"
            @close="closeModal"
            class="relative z-[60]">
        <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div class="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div class="flex justify-between items-center mb-4">
                    <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                        Nuevo Tipo de Evento
                    </DialogTitle>
                    <button type="button"
                            @click="closeModal"
                            class="text-gray-400 hover:text-gray-500">
                        <X class="h-5 w-5" />
                    </button>
                </div>

                <form @submit.prevent="saveTipoEvento" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Nombre</label>
                        <input type="text"
                               v-model="formData.nombre"
                               required
                               class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700">Color</label>
                        <input type="color"
                               v-model="formData.color"
                               required
                               class="mt-1 block w-20 p-1 rounded-md border-gray-300">
                    </div>

                    <div class="flex justify-end space-x-3 pt-4">
                        <button type="button"
                                @click="closeModal"
                                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit"
                                :disabled="loading"
                                class="px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-md hover:bg-emerald-600 disabled:opacity-50">
                            {{ loading ? 'Guardando...' : 'Guardar' }}
                        </button>
                    </div>
                </form>
            </DialogPanel>
        </div>
    </Dialog>
</template>

<script setup>
    import { ref } from 'vue';
    import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
    import { X } from 'lucide-vue-next';
    import axios from '@/utils/axios-config';

    const props = defineProps({
        show: Boolean
    });

    const emit = defineEmits(['close', 'saved']);

    const loading = ref(false);
    const formData = ref({
        nombre: '',
        color: '#2196f3'
    });

    const closeModal = () => {
        formData.value = {
            nombre: '',
            color: '#2196f3'
        };
        emit('close');
    };

    const saveTipoEvento = async () => {
        try {
            loading.value = true;

            // Validacion en el frontend
            if (!formData.value.nombre?.trim()) {
                throw new Error('El nombre es requerido');
            }

            if (!formData.value.color?.trim()) {
                throw new Error('El color es requerido');
            }

            const datos = {
                nombre: formData.value.nombre.trim(),
                color: formData.value.color.trim()
            };

            console.log('Enviando datos:', datos);

            const response = await axios.post('/api/eventos/tipos', datos, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Respuesta:', response.data);
            emit('saved', response.data);
            closeModal();
        } catch (error) {
            console.error('Error detallado:', error.response?.data || error);
            alert(error.response?.data?.error || error.message || 'Error al crear el tipo de evento');
        } finally {
            loading.value = false;
        }
    };
</script>