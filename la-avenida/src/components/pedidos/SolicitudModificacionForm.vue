<!-- components/pedidos/SolicitudModificacionForm.vue -->
<template>
    <div class="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
        <div class="flex justify-between items-start mb-6">
            <h3 class="text-lg font-bold text-gray-900">Solicitud de Modificación</h3>
            <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">×</button>
        </div>

        <div class="space-y-4">
            <!-- Lista de productos con cantidades -->
            <div v-for="detalle in detalles" :key="detalle.detalle_id"
                 class="p-4 border rounded-lg hover:bg-gray-50">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium">{{ detalle.producto_nombre }}</h4>
                        <p class="text-sm text-gray-600">
                            Cantidad actual: {{ detalle.cantidad_solicitada }}
                        </p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <label class="text-sm text-gray-600">Nueva cantidad:</label>
                        <input type="number"
                               v-model="cantidades[detalle.detalle_id]"
                               class="w-24 border rounded-md px-2 py-1"
                               :min="0">
                    </div>
                </div>
            </div>

            <!-- Notas -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Notas
                </label>
                <textarea v-model="notas"
                          rows="3"
                          class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                          placeholder="Explique el motivo de los cambios..."></textarea>
            </div>

            <!-- Error -->
            <div v-if="error" class="text-red-600 bg-red-50 p-3 rounded-lg">
                {{ error }}
            </div>

            <!-- Botones -->
            <div class="flex justify-end space-x-3 pt-4">
                <button @click="$emit('close')"
                        class="px-4 py-2 border rounded-lg hover:bg-gray-50">
                    Cancelar
                </button>
                <button @click="enviarSolicitud"
                        class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                    Enviar Solicitud
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed } from 'vue'
    import { useAuthStore } from '@/stores/auth'

    const props = defineProps({
        pedidoId: {
            type: Number,
            required: true
        },
        detalles: {
            type: Array,
            required: true
        }
    })

    const emit = defineEmits(['close', 'solicitud-enviada'])

    const authStore = useAuthStore()
    const cantidades = ref({})
    const notas = ref('')
    const error = ref('')

    const hayCambios = computed(() => {
        return Object.keys(cantidades.value).length > 0 &&
            Object.values(cantidades.value).some(v => v !== '')
    })

    const enviarSolicitud = async () => {
        try {
            if (!hayCambios.value) {
                error.value = 'Debe realizar al menos un cambio en las cantidades'
                return
            }

            const cambios = Object.entries(cantidades.value)
                .filter(([, cantidad]) => cantidad !== '')
                .map(([detalleId, cantidad]) => ({
                    detalle_id: parseInt(detalleId),
                    cantidad_anterior: props.detalles.find(d => d.detalle_id === parseInt(detalleId)).cantidad_solicitada,
                    cantidad_nueva: parseInt(cantidad)
                }))

            await axios.post(`/api/pedidos/${props.pedidoId}/solicitud-modificacion`, {
                solicitado_por: authStore.userId,
                cambios,
                notas: notas.value
            })

            emit('solicitud-enviada')
            emit('close')
        } catch (err) {
            error.value = err.response?.data?.message || 'Error al enviar la solicitud'
        }
    }
</script>