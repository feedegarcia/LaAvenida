<!-- src/components/pedidos/TimelinePedido.vue -->
<template>
    <div class="p-4">
        <div v-if="loading" class="text-center py-4">
            <p>Cargando pedido...</p>
        </div>

        <div v-else-if="error" class="text-red-500 text-center py-4">
            <p>{{ error }}</p>
        </div>

        <template v-else-if="pedidoData">
            <!-- Información principal del pedido -->
            <div class="mb-6 grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <div>
                        <span class="text-sm text-gray-500">Origen:</span>
                        <p class="font-medium">{{ pedidoData?.sucursal_origen_nombre }}</p>
                    </div>
                    <div>
                        <span class="text-sm text-gray-500">Destino:</span>
                        <p class="font-medium">{{ pedidoData?.sucursal_destino_nombre }}</p>
                    </div>
                </div>
                <div class="space-y-2">
                    <div>
                        <span class="text-sm text-gray-500">Fecha Pedido:</span>
                        <p class="font-medium">{{ formatearFecha(pedidoData?.fecha_pedido) }}</p>
                    </div>
                    <div>
                        <span class="text-sm text-gray-500">Fecha Entrega:</span>
                        <p class="font-medium">{{ formatearFecha(pedidoData?.fecha_entrega_requerida) }}</p>
                    </div>
                </div>
            </div>

            <!-- PedidoStateManager solo si el usuario tiene permisos -->
            <PedidoStateManager v-if="pedidoStore.puedeVerPedido(pedidoData, authStore.user)"
                                :pedido="pedidoData"
                                :user-role="authStore.user.rol"
                                :user-sucursales="authStore.user.sucursales"
                                @state-change="handleStateChange" />

            <!-- Historial de cambios -->
            <div v-if="historialCambios.length > 0" class="mt-6">
                <h4 class="font-medium mb-4">Historial de Cambios</h4>
                <div class="space-y-4">
                    <div v-for="(cambio, index) in historialCambios"
                         :key="index"
                         class="bg-gray-50 p-4 rounded-lg">
                        <div class="flex justify-between items-start">
                            <div>
                                <span :class="[
                  'px-2 py-1 rounded-full text-xs',
                  `bg-${pedidoStore.obtenerColorEstado(cambio.estado_nuevo)}-100`,
                  `text-${pedidoStore.obtenerColorEstado(cambio.estado_nuevo)}-800`
                ]">
                                    {{ pedidoStore.obtenerEtiquetaEstado(cambio.estado_nuevo) }}
                                </span>
                                <p class="mt-1 text-sm text-gray-600">{{ formatearFechaCompleta(cambio.fecha) }}</p>
                            </div>
                            <span class="text-sm text-gray-500">{{ cambio.usuario }}</span>
                        </div>
                        <p v-if="cambio.notas" class="mt-2 text-sm">{{ cambio.notas }}</p>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
    import { ref, onMounted, watch } from 'vue';
    import { useAuthStore } from '@/stores/auth';
    import { usePedidoStore } from '@/stores/pedidoStateMachine';
    import axios from '@/utils/axios-config';
    import PedidoStateManager from './PedidoStateManager.vue';

    const props = defineProps({
        pedido: {
            type: Object,
            default: null
        },
        id: {
            type: Number,
            default: null
        }
    });

    const emit = defineEmits(['estadoActualizado']);
    const pedidoData = ref(null);
    const historialCambios = ref([]);
    const loading = ref(false);
    const error = ref('');

    const authStore = useAuthStore();
    const pedidoStore = usePedidoStore();

    const formatearFecha = (fecha) => {
        if (!fecha) return '-';
        return new Date(fecha).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatearFechaCompleta = (fecha) => {
        if (!fecha) return 'Sin actualización';
        return new Date(fecha).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleStateChange = async (changes) => {
        try {
            await axios.patch(`/api/pedidos/${pedidoData.value.pedido_id}/estado`, changes);
            await cargarPedido();
            emit('estadoActualizado', {
                estado: changes.estado,
                pedidoId: pedidoData.value.pedido_id,
                isFinalState: pedidoStore.estadosFinales.includes(changes.estado)
            });
        } catch (error) {
            console.error('Error actualizando estado:', error);
            throw error;
        }
    };

    const cargarPedido = async () => {
        try {
            loading.value = true;
            error.value = '';

            if (props.pedido) {
                pedidoData.value = props.pedido;
                await cargarHistorial(props.pedido.pedido_id);
                return;
            }

            if (props.id) {
                const response = await axios.get(`/api/pedidos/${props.id}`);
                pedidoData.value = response.data;
                await cargarHistorial(props.id);
            }
        } catch (error) {
            console.error('Error cargando pedido:', error);
            error.value = 'Error al cargar el pedido';
        } finally {
            loading.value = false;
        }
    };

    const cargarHistorial = async (pedidoId) => {
        try {
            const response = await axios.get(`/api/pedidos/${pedidoId}/historial`);
            historialCambios.value = response.data;
        } catch (error) {
            console.error('Error cargando historial:', error);
        }
    };

    watch(() => props.pedido, (newPedido) => {
        if (newPedido) {
            pedidoData.value = newPedido;
            cargarHistorial(newPedido.pedido_id);
        }
    });

    watch(() => props.id, (newId) => {
        if (newId) {
            cargarPedido();
        }
    });

    onMounted(() => {
        cargarPedido();
    });
</script>