
<template>
    <div class="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
        <div class="flex justify-between items-start mb-6">
            <h3 class="text-lg font-bold text-avenida-black">Solicitar Modificación de Pedido</h3>
            <button @click="$emit('close')"
                    class="text-gray-400 hover:text-gray-600">
                x
            </button>
        </div>

        <!-- Lista de productos -->
        <div class="space-y-4 mb-6">
            <div v-for="detalle in detalles"
                 :key="detalle.detalle_id"
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
                               v-model="cambios[detalle.detalle_id]"
                               class="border rounded-md px-3 py-1 w-24 focus:ring-avenida-green focus:border-avenida-green"
                               :placeholder="detalle.cantidad_solicitada"
                               min="0">
                    </div>
                </div>
            </div>
        </div>

        <!-- Notas -->
        <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
                Notas adicionales
            </label>
            <textarea v-model="notas"
                      rows="3"
                      class="w-full border rounded-md shadow-sm focus:ring-avenida-green focus:border-avenida-green"
                      placeholder="Agrega notas o comentarios sobre los cambios solicitados..."></textarea>
        </div>

        <!-- Error message -->
        <div v-if="error"
             class="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {{ error }}
        </div>

        <!-- Botones -->
        <div class="flex justify-end space-x-3">
            <button @click="$emit('close')"
                    :disabled="loading"
                    class="px-4 py-2 border rounded-md hover:bg-gray-50">
                Cancelar
            </button>
            <button @click="enviarSolicitud"
                    :disabled="!hayCambios || loading"
                    class="px-4 py-2 bg-avenida-green text-white rounded-md hover:bg-green-600 disabled:opacity-50">
                {{ loading ? 'Enviando...' : 'Enviar Solicitud' }}
            </button>
        </div>
    </div>
</template>
<script setup>
    import { ref, computed } from 'vue'
    import { jwtDecode } from 'jwt-decode'
    import axios from 'axios'

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

    const emit = defineEmits(['close', 'solicitudEnviada'])

    const cambios = ref({})
    const notas = ref('')
    const loading = ref(false)
    const error = ref('')

    const hayCambios = computed(() => {
        return Object.keys(cambios.value).length > 0 &&
            Object.values(cambios.value).some(v => v !== '')
    })

    const enviarSolicitud = async () => {
        try {
            loading.value = true
            error.value = ''

            const token = localStorage.getItem('token')
            const decodedToken = jwtDecode(token)

            const cambiosFormateados = Object.entries(cambios.value)
                .filter(([, nuevaCantidad]) => nuevaCantidad !== '')
                .map(([detalleId, nuevaCantidad]) => {
                    const detalle = props.detalles.find(d => d.detalle_id === parseInt(detalleId))
                    return {
                        detalle_id: parseInt(detalleId),
                        cantidad_anterior: detalle.cantidad_solicitada,
                        cantidad_nueva: parseInt(nuevaCantidad)
                    }
                })

            const solicitud = {
                solicitado_por: decodedToken.id,
                notas: notas.value,
                cambios: cambiosFormateados
            }

            await axios.post(
                `/api/pedidos/${props.pedidoId}/solicitud-modificacion`,
                { solicitud },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            )

            emit('solicitudEnviada')
            emit('close')
        } catch (err) {
            error.value = err.response?.data?.message || 'Error al enviar la solicitud'
        } finally {
            loading.value = false
        }
    }
</script>
