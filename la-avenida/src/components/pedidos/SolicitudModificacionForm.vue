<template>
    <div class="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
        <!-- Header -->
        <div class="flex justify-between items-start mb-6">
            <h3 class="text-lg font-bold text-gray-900">Solicitud de Modificación</h3>
            <button @click="cerrarModal"
                    class="text-gray-400 hover:text-gray-600">
                <X class="w-5 h-5" />
            </button>
        </div>

        <div class="space-y-4">
            <!-- Lista de productos con cantidades -->
            <div v-for="detalle in detalles"
                 :key="detalle.detalle_id"
                 class="p-4 border rounded-lg hover:bg-gray-50">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium">{{ detalle.producto_nombre }}</h4>
                        <div class="flex items-center space-x-2 text-sm text-gray-600">
                            <span>Cantidad actual: {{ detalle.cantidad_solicitada }}</span>
                            <span v-if="pedidoStore.puedeVerCostos(pedido, authStore.user)"
                                  class="text-gray-500">
                                • $ {{ formatoMoneda(detalle.precio_unitario) }}
                            </span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <label class="text-sm text-gray-600">Nueva cantidad:</label>
                        <div class="flex items-center space-x-1">
                            <button @click="decrementarCantidad(detalle)"
                                    class="p-1 rounded bg-gray-100 hover:bg-gray-200">
                                <Minus class="w-4 h-4" />
                            </button>
                            <input type="number"
                                   v-model.number="cantidades[detalle.detalle_id]"
                                   min="0"
                                   class="w-20 text-center border rounded-md px-2 py-1">
                            <button @click="incrementarCantidad(detalle)"
                                    class="p-1 rounded bg-gray-100 hover:bg-gray-200">
                                <Plus class="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Resumen de cambios -->
            <div v-if="hayCambios"
                 class="bg-blue-50 p-4 rounded-lg">
                <h4 class="font-medium text-blue-800 mb-2">Resumen de cambios</h4>
                <div v-for="(cantidad, detalleId) in cantidadesModificadas"
                     :key="detalleId"
                     class="text-sm text-blue-700">
                    {{ obtenerNombreProducto(detalleId) }}:
                    {{ obtenerCantidadOriginal(detalleId) }} → {{ cantidad }}
                </div>
            </div>

            <!-- Notas -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Notas
                </label>
                <textarea v-model="notas"
                          rows="3"
                          required
                          class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                          placeholder="Explique el motivo de los cambios..."></textarea>
            </div>

            <!-- Error -->
            <div v-if="error"
                 class="text-red-600 bg-red-50 p-3 rounded-lg">
                {{ error }}
            </div>

            <!-- Botones -->
            <div class="flex justify-end space-x-3 pt-4">
                <button @click="cerrarModal"
                        class="px-4 py-2 border rounded-lg hover:bg-gray-50">
                    Cancelar
                </button>
                <button @click="enviarSolicitud"
                        :disabled="!puedeEnviar"
                        class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                    Enviar Solicitud
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed } from 'vue';
    import { X, Plus, Minus } from 'lucide-vue-next';
    import { useAuthStore } from '@/stores/auth';
    import { usePedidoStore } from '@/stores/pedidoStateMachine';
    import axios from '@/utils/axios-config';

    const props = defineProps({
        pedido: {
            type: Object,
            required: true
        },
        detalles: {
            type: Array,
            required: true
        }
    });

    const emit = defineEmits(['close', 'solicitud-enviada']);

    const authStore = useAuthStore();
    const pedidoStore = usePedidoStore();

    const cantidades = ref({});
    const notas = ref('');
    const error = ref('');

    // Computed
    const cantidadesModificadas = computed(() => {
        return Object.entries(cantidades.value)
            .reduce((acc, [detalleId, cantidad]) => {
                const original = obtenerCantidadOriginal(detalleId);
                if (cantidad !== original) {
                    acc[detalleId] = cantidad;
                }
                return acc;
            }, {});
    });

    const hayCambios = computed(() => {
        return Object.keys(cantidadesModificadas.value).length > 0;
    });

    const puedeEnviar = computed(() => {
        return hayCambios.value && notas.value.trim().length > 0;
    });

    // Methods
    const formatoMoneda = (valor) => {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    };

    const obtenerCantidadOriginal = (detalleId) => {
        const detalle = props.detalles.find(d => d.detalle_id === parseInt(detalleId));
        return detalle?.cantidad_solicitada || 0;
    };

    const obtenerNombreProducto = (detalleId) => {
        const detalle = props.detalles.find(d => d.detalle_id === parseInt(detalleId));
        return detalle?.producto_nombre || '';
    };

    const incrementarCantidad = (detalle) => {
        if (!cantidades.value[detalle.detalle_id]) {
            cantidades.value[detalle.detalle_id] = detalle.cantidad_solicitada;
        }
        cantidades.value[detalle.detalle_id]++;
    };

    const decrementarCantidad = (detalle) => {
        if (!cantidades.value[detalle.detalle_id]) {
            cantidades.value[detalle.detalle_id] = detalle.cantidad_solicitada;
        }
        if (cantidades.value[detalle.detalle_id] > 0) {
            cantidades.value[detalle.detalle_id]--;
        }
    };

    const cerrarModal = () => {
        emit('close');
    };

    const enviarSolicitud = async () => {
        if (!puedeEnviar.value) return;

        try {
            const cambios = Object.entries(cantidadesModificadas.value)
                .map(([detalleId, cantidadNueva]) => ({
                    detalle_id: parseInt(detalleId),
                    cantidad_anterior: obtenerCantidadOriginal(detalleId),
                    cantidad_nueva: cantidadNueva
                }));

            await axios.post(`/api/pedidos/${props.pedido.pedido_id}/solicitud-modificacion`, {
                solicitud: {
                    solicitado_por: authStore.user.id,
                    cambios,
                    notas: notas.value
                }
            });

            emit('solicitud-enviada');
            cerrarModal();
        } catch (err) {
            error.value = err.response?.data?.message || 'Error al enviar la solicitud';
        }
    };
</script>