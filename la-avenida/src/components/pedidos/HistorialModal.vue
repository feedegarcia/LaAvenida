<!-- components/pedidos/HistorialModal.vue -->
<template>
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Historial de Modificaciones</h3>
                    <button @click="$emit('close')" class="text-gray-500 hover:text-gray-700">
                        ×
                    </button>
                </div>

                <div class="space-y-4">
                    <div v-for="(cambio, index) in historial"
                         :key="index"
                         class="border-b pb-4">
                        <div class="flex justify-between text-sm text-gray-500">
                            <span>{{ formatoFecha(cambio.fecha) }}</span>
                            <span>{{ cambio.sucursal }} - {{ cambio.usuario }}</span>
                        </div>
                        <div class="mt-2">
                            <span class="text-red-500">{{ cambio.cantidad_anterior }}</span>
                            <span class="mx-2">→</span>
                            <span class="text-green-500">{{ cambio.cantidad_nueva }}</span>
                        </div>
                        <p v-if="cambio.motivo" class="mt-1 text-sm text-gray-600">
                            {{ cambio.motivo }}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
  historial: {
    type: Array,
    required: true
  }
})

const formatoFecha = (fecha) => {
  return new Date(fecha).toLocaleString('es-AR')
}
</script>