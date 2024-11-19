<template>
    <div class="p-4">
        <!-- Loading state -->
        <div v-if="loading" class="text-center py-4">
            <p>Cargando pedido...</p>
        </div>

        <!-- Error state -->
        <div v-if="error" class="text-red-500 text-center py-4">
            <p>{{ error }}</p>
        </div>

        <!-- Content only shown when pedidoData exists -->
        <template v-if="pedidoData">
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

            <!-- Solo renderizar PedidoStateManager cuando tengamos datos -->
            <PedidoStateManager v-if="pedidoData && currentUser"
                                :pedido="pedidoData"
                                :user-role="currentUser.rol"
                                :user-sucursales="currentUser.sucursales"
                                @state-change="handleStateChange" />

            <!-- Historial de cambios -->
            <div v-if="historialCambios.length > 0" class="mt-6">
                <h4 class="font-medium mb-4">Historial de Cambios</h4>
                <div class="space-y-4">
                    <div v-for="(cambio, index) in historialCambios"
                         :key="index"
                         class="bg-gray-50 p-4 rounded-lg">
                        <p class="font-medium">{{ cambio.estado }}</p>
                        <p class="text-sm text-gray-600">{{ formatearFechaCompleta(cambio.fecha) }}</p>
                        <p v-if="cambio.notas" class="mt-2 text-sm">{{ cambio.notas }}</p>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>
<script setup>
    import { ref, onMounted, computed, watch } from 'vue'; 
    import axios from '@/utils/axios-config';
    import PedidoStateManager from './PedidoStateManager.vue';
    import { useAuthStore } from '@/stores/auth';
    import { jwtDecode } from 'jwt-decode';

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

    const currentUser = computed(() => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        try {
            const decoded = jwtDecode(token);
            console.log('Token decodificado:', decoded);
            return {
                rol: decoded.rol,
                sucursales: decoded.sucursales || []
            };
        } catch {
            console.error('Error decodificando token');
            return null;
        }
    });

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
            console.log('Recibiendo cambios de estado:', changes);
            const response = await axios.patch(`/api/pedidos/${pedidoData.value.pedido_id}/estado`, changes);
            console.log('Respuesta del servidor:', response.data);

            // Emitir evento con los detalles del cambio
            emit('estadoActualizado', {
                estado: changes.estado,
                pedidoId: pedidoData.value.pedido_id,
                isFinalState: ['FINALIZADO', 'CANCELADO'].includes(changes.estado)
            });

        } catch (error) {
            console.error('Error actualizando estado:', error);
            alert('Error al actualizar el estado del pedido');
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
                console.log('Cargando pedido con ID:', props.id);
                const response = await axios.get(`/api/pedidos/${props.id}`);
                console.log('Datos del pedido recibidos:', response.data);
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
            // No establecemos error.value aquí para no sobreescribir otros errores más críticos
        }
    };

    // Watch para props
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