<template>
    <div class="space-y-4">
        <!-- Estado actual y encabezado -->
        <div class="bg-white p-4 rounded-lg shadow">
            <div class="flex justify-between items-center mb-4">
                <div>
                    <div class="flex gap-2 items-center">
                        <h3 class="text-lg font-semibold">
                            Estado actual: {{ pedidoStore.obtenerEtiquetaEstado(pedido.estado) }}
                        </h3>
                        <span :class="getEstadoClass(pedido.estado)">
                            {{ pedidoStore.obtenerEtiquetaEstado(pedido.estado) }}
                        </span>
                    </div>
                    <p class="text-sm text-gray-600">
                        Ultima actualizacion: {{ formatearFecha(pedido.updated_at) }}
                    </p>
                </div>

                <!-- Botones de acción -->
                <div class="flex gap-2">
                    <template v-for="accion in accionesDisponibles"
                              :key="accion.estado">
                        <button @click="cambiarEstado(accion.estado)"
                                :disabled="!esAccionValida(accion)"
                                :class="[
                                    'px-4 py-2 text-white rounded transition-colors',
                                    'disabled:opacity-50 disabled:cursor-not-allowed',
                                    getBotonClass(accion)
                                ]">
                            {{ accion.label }}
                        </button>
                    </template>

                    <!-- Botón de cancelar -->
                    <button v-if="puedeCancelarPedido"
                            @click="confirmarCancelacion"
                            class="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700">
                        Cancelar Pedido
                    </button>
                </div>
            </div>
        </div>

        <!-- Detalles del pedido -->
        <DetalleProductos :pedido="pedido"
                          :detalles="pedido.detalles"
                          :puede-modificar="puedeModificarPedido"
                          :puede-ver-totales="puedeVerTotales"
                          @estado-actualizado="handleEstadoActualizado"
                          @agregar-producto="handleAgregarProducto"
                          @producto-modificado="handleProductoModificado" />

        <!-- Modal de confirmación de cancelación -->
        <Dialog v-if="mostrarConfirmacionCancelacion"
                @close="mostrarConfirmacionCancelacion = false"
                class="relative z-50">
            <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div class="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left shadow-xl transition-all">
                    <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4">
                        Confirmar Cancelacion
                    </DialogTitle>
                    <p class="text-gray-600 mb-4">
                        ¿Esta seguro que desea cancelar este pedido?
                    </p>
                    <div class="flex justify-end gap-2">
                        <button @click="mostrarConfirmacionCancelacion = false"
                                class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                            No, mantener
                        </button>
                        <button @click="cancelarPedido"
                                class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                            Sí, cancelar
                        </button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    </div>
</template>

<script setup>
    import { ref, computed, onMounted, watch } from 'vue';
    import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
    import DetalleProductos from './DetalleProductos.vue';
    import { formatearFecha } from '@/utils/dateUtils';
    import { useAuthStore } from '@/stores/auth';
    import { usePedidoStore } from '@/stores/pedidoStateMachine';

    const props = defineProps({
        pedido: {
            type: Object,
            required: true
        }
    });

    const emit = defineEmits(['estado-actualizado']);

    const authStore = useAuthStore();
    const pedidoStore = usePedidoStore();
    const mostrarConfirmacionCancelacion = ref(false);
    const cambiosPendientes = ref(false);

    // Verificar cambios al montar y cuando cambie el pedido
    onMounted(async () => {
        await verificarCambios();
    });

    watch(() => props.pedido, async () => {
        await verificarCambios();
    }, { deep: true });

    async function verificarCambios() {
        cambiosPendientes.value = await pedidoStore.tieneCambios(props.pedido.pedido_id);
    }

    // Computed properties
    const puedeModificarPedido = computed(() => {
        return pedidoStore.puedeModificarPedido(props.pedido, authStore.user);
    });

    const puedeCancelarPedido = computed(() => {
        return pedidoStore.puedeCancelarPedido(props.pedido, authStore.user);
    });

    const puedeVerTotales = computed(() => {
        return pedidoStore.puedeVerTotales(props.pedido, authStore.user);
    });

    const accionesDisponibles = computed(() => {
        return pedidoStore.obtenerAccionesPermitidas(
            props.pedido.estado,
            authStore.user,
            props.pedido
        );
    });

    // Methods
    const getEstadoClass = (estado) => {
        const color = pedidoStore.obtenerColorEstado(estado);
        return {
            'px-2 py-1 rounded-full text-sm': true,
            [`bg-${color}-100`]: true,
            [`text-${color}-800`]: true
        };
    };

    const getBotonClass = (accion) => {
        const classes = {
            'bg-green-500 hover:bg-green-600': ['RECIBIDO', 'PREPARADO', 'FINALIZADO'].includes(accion.estado),
            'bg-yellow-500 hover:bg-yellow-600': ['RECIBIDO_CON_DIFERENCIAS'].includes(accion.estado),
            'bg-blue-500 hover:bg-blue-600': ['EN_FABRICA_MODIFICADO', 'PREPARADO_MODIFICADO'].includes(accion.estado)
        };

        if (!esAccionValida(accion)) {
            return 'bg-gray-400 cursor-not-allowed';
        }

        return Object.entries(classes).find(([_, condition]) => condition)?.[0] || 'bg-gray-500 hover:bg-gray-600';
    };

    const esAccionValida = (accion) => {
        if (accion.activadoSi === 'tieneCambios') {
            return cambiosPendientes.value;
        }

        if (accion.desactivadoSi === 'tieneCambios') {
            return !cambiosPendientes.value;
        }

        return true;
    };

    const cambiarEstado = async (nuevoEstado) => {
        try {
            const resultado = await pedidoStore.cambiarEstadoPedido(
                props.pedido.pedido_id,
                nuevoEstado,
                { tieneCambios: cambiosPendientes.value }
            );
            await verificarCambios();
            emit('estado-actualizado', resultado);
        } catch (error) {
            console.error('Error al cambiar estado:', error);
        }
    };

    const handleAgregarProducto = async (producto) => {
        try {
            console.log('PedidoStateManager - Agregando producto:', producto);
            await pedidoStore.agregarProductoAPedido(props.pedido.pedido_id, producto);
            await verificarCambios();
            console.log('PedidoStateManager - Producto agregado exitosamente');
            emit('estado-actualizado');
        } catch (error) {
            console.error('PedidoStateManager - Error:', error);
        }
    };

    const handleProductoModificado = async () => {
        await verificarCambios();
        emit('estado-actualizado');
    };

    const handleEstadoActualizado = async () => {
        console.log('PedidoStateManager - Actualizando estado');
        await verificarCambios();
        emit('estado-actualizado');
    };

    const confirmarCancelacion = () => {
        mostrarConfirmacionCancelacion.value = true;
    };

    const cancelarPedido = async () => {
        try {
            await pedidoStore.cambiarEstadoPedido(props.pedido.pedido_id, 'CANCELADO');
            mostrarConfirmacionCancelacion.value = false;
            emit('estado-actualizado', { estado: 'CANCELADO' });
        } catch (error) {
            console.error('Error al cancelar pedido:', error);
        }
    };
</script>