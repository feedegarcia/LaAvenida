<template>
    <Dialog as="div" :open="show" @close="closeModal" class="relative z-50">
        <div class="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div class="fixed inset-0 overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4">
                <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                    <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4">
                        Nuevo Evento
                    </DialogTitle>

                    <form @submit.prevent="saveEvent" class="space-y-4">
                        <!-- Nombre -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                Nombre
                            </label>
                            <input type="text"
                                   v-model="eventForm.nombre"
                                   required
                                   class="w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green">
                        </div>

                        <!-- Tipo -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                Tipo
                            </label>
                            <div class="flex items-center space-x-2">
                                <select v-model="eventForm.tipo_id"
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

                        <!-- Fechas -->
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha Inicio
                                </label>
                                <input type="date"
                                       v-model="eventForm.fecha_inicio"
                                       required
                                       class="w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha Fin
                                </label>
                                <input type="date"
                                       v-model="eventForm.fecha_fin"
                                       required
                                       class="w-full rounded-md border-gray-300 shadow-sm focus:border-avenida-green focus:ring-avenida-green">
                            </div>
                        </div>

                        <!-- Descripción -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                Descripción
                            </label>
                            <textarea v-model="eventForm.descripcion"
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

    <!-- Modal de Tipo de Evento -->
    <TipoEventoModal v-if="showTipoModal"
                     :show="showTipoModal"
                     @close="closeTipoModal"
                     @save="saveTipoEvento" />
</template>

<script setup>
import { ref, computed } from 'vue'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import { PlusIcon } from '@heroicons/vue/24/outline'
import TipoEventoModal from './TipoEventoModal.vue'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close', 'save'])

const showTipoModal = ref(false)
const eventForm = ref({
  nombre: '',
  tipo_id: '',
  fecha_inicio: '',
  fecha_fin: '',
  descripcion: ''
})

const openTipoModal = () => {
  showTipoModal.value = true
  // No cerramos el modal principal
}

const closeTipoModal = () => {
  showTipoModal.value = false
}

const closeModal = () => {
  emit('close')
}

const saveTipoEvento = async (tipo) => {
  try {
    // Aquí guardamos el tipo
    await loadTiposEvento()
    closeTipoModal()
  } catch (error) {
    console.error('Error guardando tipo:', error)
  }
}

const saveEvent = () => {
  emit('save', { ...eventForm.value })
}
</script>
