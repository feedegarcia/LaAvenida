<template>
    <div class="p-4">
        <!-- Loading state -->
        <div v-if="loading" class="text-center py-4">
            <p>Cargando pedido...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-red-500 text-center py-4">
            <p>{{ error }}</p>
        </div>

        <template v-else-if="pedidoData">
            <!-- Información principal del pedido -->
            <div class="mb-6 grid grid-cols-2 gap-4">
                <div class="space-y-2">
                    <div>
                        <span class="text-sm text-gray-500">Origen:</span>
                        <p class="font-medium">{{ pedidoData.origen }}</p>
                    </div>
                    <div>
                        <span class="text-sm text-gray-500">Destino:</span>
                        <p class="font-medium">{{ pedidoData.destino }}</p>
                    </div>
                </div>
                <div class="space-y-2">
                    <div>
                        <span class="text-sm text-gray-500">Fecha Pedido:</span>
                        <p class="font-medium">{{ formatearFecha(pedidoData.fecha_pedido) }}</p>
                    </div>
                    <div>
                        <span class="text-sm text-gray-500">Fecha Entrega:</span>
                        <p class="font-medium">{{ formatearFecha(pedidoData.fecha_entrega_requerida) }}</p>
                    </div>
                </div>
            </div>

            <!-- Detalles y Estado -->
            <div class="space-y-6">
                <!-- PedidoStateManager -->
                <PedidoStateManager v-if="pedidoStore.puedeVerPedido(pedidoData, authStore.user)"
                                    :pedido="pedidoData"
                                    :sucursal-activa="props.sucursalActiva"
                                    @estado-actualizado="handleEstadoActualizado" />

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
                                    <p class="mt-1 text-sm text-gray-600">
                                        {{ formatearFechaCompleta(cambio.fecha) }}
                                    </p>
                                </div>
                                <div class="text-sm text-gray-500">
                                    <p>{{ cambio.usuario_nombre }}</p>
                                    <p>{{ cambio.sucursal_nombre }}</p>
                                </div>
                            </div>
                            <div v-if="cambio.cambios?.length" class="mt-2">
                                <p class="text-sm font-medium text-gray-700">Cambios en productos:</p>
                                <ul class="mt-1 space-y-1">
                                    <li v-for="detalle in cambio.cambios"
                                        :key="detalle.detalle_id"
                                        class="text-sm text-gray-600">
                                        {{ detalle.producto_nombre }}:
                                        {{ detalle.cantidad_anterior }} → {{ detalle.cantidad_nueva }}
                                    </li>
                                </ul>
                            </div>
                            <p v-if="cambio.notas" class="mt-2 text-sm text-gray-700">
                                {{ cambio.notas }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
    import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
    import { useAuthStore } from '@/stores/auth';
    import { usePedidoStore } from '@/stores/pedidoStateMachine';
    import PedidoStateManager from './PedidoStateManager.vue';
    import { formatearFecha, formatearFechaCompleta } from '@/utils/dateUtils';
    import axios from '@/utils/axios-config';

    const props = defineProps({
        pedido: {
            type: Object,
            default: null
        },
        id: {
            type: Number,
            default: null
        },
        sucursalActiva: {
            type: Number,
            required: true,
            validator: (value) => value > 0
        }
    });

    const emit = defineEmits(['estado-actualizado']);
    const authStore = useAuthStore();
    const pedidoStore = usePedidoStore();
    const pedidoData = ref(null);
    const historialCambios = ref([]);
    const loading = ref(false);
    const error = ref('');
    let intervalId = null;

    // Computed Properties
    const puedeVerTotales = computed(() => {
        return ['ADMIN', 'DUEÑO'].includes(authStore.user.rol);
    });

    const totalPedido = computed(() => {
        if (!pedidoData.value?.detalles) return 0;
        return pedidoData.value.detalles.reduce((total, detalle) => {
            const cantidad = detalle.cantidad_confirmada || detalle.cantidad_solicitada;
            return total + (detalle.precio_unitario * cantidad);
        }, 0);
    });

    // Methods
    const formatoMoneda = (valor) => {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    };

    const cargarPedido = async () => {
        try {
            loading.value = true;
            if (props.id) {
                const response = await axios.get(`/api/pedidos/${props.id}`);
                pedidoData.value = response.data;
                // Establecer el contexto después de cargar los datos del pedido
                pedidoStore.setContexto(props.sucursalActiva, response.data);
                await cargarHistorial(props.id);
            }
        } catch (err) {
            console.error('Error cargando pedido:', err);
            error.value = 'Error al cargar el pedido';
        } finally {
            loading.value = false;
        }
    };

    const cargarHistorial = async (pedidoId) => {
        try {
            const response = await axios.get(`/api/pedidos/${pedidoId}/historial`);
            historialCambios.value = response.data.map(cambio => ({
                ...cambio,
                cambios: typeof cambio.cambios === 'string' ?
                    JSON.parse(cambio.cambios) : cambio.cambios
            }));
        } catch (err) {
            console.error('Error cargando historial:', err);
            error.value = 'Error al cargar el historial';
        }
    };

    const handleEstadoActualizado = async () => {
        await cargarPedido();
        emit('estado-actualizado');
    };

    // Watchers
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

    watch(() => props.sucursalActiva, (newSucursalId) => {
        if (newSucursalId) {
            pedidoStore.setContexto(newSucursalId, pedidoData.value);
        }
    });

    // Lifecycle Hooks
    onMounted(async () => {
        if (!props.sucursalActiva) {
            console.error('No hay sucursal activa');
            error.value = 'No se ha especificado una sucursal activa';
            return;
        }

        console.log('Montando TimelinePedido con sucursal:', props.sucursalActiva);
        await cargarPedido();

        // Configurar intervalo de actualización automática
        intervalId = setInterval(() => {
            if (pedidoData.value?.pedido_id) {
                cargarPedido();
            }
        }, 60000);
    });

    // Cleanup hook
    onBeforeUnmount(() => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    });
</script>