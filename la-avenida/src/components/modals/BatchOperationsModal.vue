<template>
    <TransitionRoot appear :show="show" as="template">
        <Dialog as="div" @close="$emit('close')" class="relative z-50">
            <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
                             leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
                <div class="fixed inset-0 bg-black/25" />
            </TransitionChild>

            <div class="fixed inset-0 overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 shadow-xl">
                        <DialogTitle class="text-lg font-medium mb-4">
                            {{ titulo }}
                        </DialogTitle>

                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Porcentaje de ajuste</label>
                                <div class="mt-1 flex items-center gap-2">
                                    <input type="number" v-model="porcentaje" step="0.1"
                                           class="block w-full rounded-md border-gray-300" />
                                    <span class="text-gray-500">%</span>
                                </div>
                                <p class="mt-1 text-sm text-gray-500">
                                    {{ porcentaje > 0 ? 'Aumento' : 'Disminucion' }} del {{ Math.abs(porcentaje) }}%
                                </p>
                            </div>

                            <div class="flex justify-end space-x-3">
                                <button @click="$emit('close')"
                                        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                                    Cancelar
                                </button>
                                <button @click="aplicarCambios"
                                        class="px-4 py-2 text-sm font-medium text-white bg-avenida-green border border-transparent rounded-md hover:bg-green-600">
                                    Aplicar
                                </button>
                            </div>
                        </div>
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    </TransitionRoot>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

const props = defineProps({
    show: Boolean,
    tipo: String,  // 'categoria' o 'subcategoria'
    itemId: Number,
    operacion: String // 'precios' o 'jueves'
})

const emit = defineEmits(['close', 'update'])
const porcentaje = ref(0)

const titulo = computed(() => {
    const base = props.tipo === 'categoria' ? 'Categoria' : 'Subcategoria'
    return props.operacion === 'precios'
        ? `Actualizar precios de ${base}`
        : `Actualizar precios de jueves de ${base}`
})

const aplicarCambios = async () => {
    try {
        await productosStore[`actualizarPrecios${props.tipo === 'categoria' ? 'Categoria' : 'Subcategoria'}`](
            props.itemId,
            porcentaje.value
        )
        emit('update')
        emit('close')
    } catch (error) {
        console.error('Error:', error)
    }
}
</script>