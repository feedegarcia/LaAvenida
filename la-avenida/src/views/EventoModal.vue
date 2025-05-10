<template>
    <Dialog as="div" :open="show" @close="closeModal" class="relative z-50">
        <div class="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div class="fixed inset-0 overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4">
                <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                    <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4">
                        {{ editing ? 'Editar Evento' : 'Nuevo Evento' }}
                    </DialogTitle>

                    <form @submit.prevent="saveEvent" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                Nombre
                            </label>
                            <input type="text"
                                   v-model="form.nombre"
                                   required
                                   class="w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                Tipo
                            </label>
                            <div class="flex items-center space-x-2">
                                <select v-model="form.tipo_id"
                                        required
                                        class="w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green">
                                    <option value="">Seleccionar tipo</option>
                                    <option v-for="tipo in tiposEvento"
                                            :key="tipo.tipo_id"
                                            :value="tipo.tipo_id">
                                        {{ tipo.nombre }}
                                    </option>
                                </select>
                                <button type="button"
                                        @click="openTipoModal"
                                        class="text-avenida-green hover:text-green-600">
                                    <PlusIcon class="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha Inicio
                                </label>
                                <input type="date"
                                       v-model="form.fecha_inicio"
                                       required
                                       class="w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha Fin
                                </label>
                                <input type="date"
                                       v-model="form.fecha_fin"
                                       required
                                       class="w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green">
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                Descripcion
                            </label>
                            <textarea v-model="form.descripcion"
                                      rows="3"
                                      class="w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green"></textarea>
                        </div>

                        <div class="flex justify-end space-x-3 pt-4">
                            <button type="button"
                                    @click="closeModal"
                                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                                Cancelar
                            </button>
                            <button type="submit"
                                    class="px-4 py-2 text-sm font-medium text-white bg-avenida-green rounded-md hover:bg-green-600">
                                Guardar
                            </button>
                        </div>
                    </form>
                </DialogPanel>
            </div>
        </div>
    </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import { PlusIcon } from 'lucide-vue-next'

const props = defineProps({
    show: Boolean,
    editing: Object,
    tiposEvento: Array
})

const emit = defineEmits(['close', 'save', 'openTipoModal'])

const form = ref({
    nombre: '',
    tipo_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    descripcion: ''
})

watch(() => props.editing, (newVal) => {
    if (newVal) {
        form.value = { ...newVal }
    } else {
        form.value = {
            nombre: '',
            tipo_id: '',
            fecha_inicio: '',
            fecha_fin: '',
            descripcion: ''
        }
    }
}, { immediate: true })

const saveEvent = () => {
    emit('save', { ...form.value })
}

const closeModal = () => {
    emit('close')
}

const openTipoModal = () => {
    emit('openTipoModal')
}
</script>
