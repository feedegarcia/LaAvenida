<template>
    <Dialog as="div" :open="show" @close="closeModal" class="relative z-[60]">
        <div class="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div class="fixed inset-0 overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4">
                <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                    <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4">
                        {{ editing ? 'Editar Tipo de Evento' : 'Nuevo Tipo de Evento' }}
                    </DialogTitle>

                    <form @submit.prevent="saveTipoEvento" class="space-y-4">
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
                                Color
                            </label>
                            <div class="flex items-center space-x-2">
                                <input type="color"
                                       v-model="form.color"
                                       class="w-12 h-8 p-0 rounded border border-gray-300">
                                <span class="text-sm text-gray-500">{{ form.color }}</span>
                            </div>
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

    const props = defineProps({
        show: Boolean,
        editing: Object
    })

    const emit = defineEmits(['close', 'save'])

    const form = ref({
        nombre: '',
        color: '#10B981'
    })

    watch(() => props.editing, (newVal) => {
        if (newVal) {
            form.value = { ...newVal }
        } else {
            form.value = {
                nombre: '',
                color: '#10B981'
            }
        }
    }, { immediate: true })

    const saveTipoEvento = () => {
        emit('save', { ...form.value })
    }

    const closeModal = () => {
        emit('close')
    }
</script>
