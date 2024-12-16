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

                <!-- Botones de accion -->
                <div class="flex gap-2">
                    <template v-for="accion in accionesDisponibles"
                              :key="accion.estado">
                        <button @click="ejecutarAccion(accion)"
                                :disabled="!accion.habilitado || loading"
                                :class="[
                                    'px-4 py-2 text-white rounded transition-colors',
                                    'disabled:opacity-50 disabled:cursor-not-allowed',
                                    getBotonClass(accion)
                                ]">
                            {{ accion.label }}
                        </button>
                    </template>
                    <!-- Boton de cancelar -->
                    <button v-if="puedeCancelarPedido"
                            @click="confirmarCancelacion"
                            class="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700">
                        Cancelar Pedido
                    </button>
                </div>
            </div>

            <!-- Error message -->
            <div v-if="error"
                 class="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                {{ error }}
            </div>

            <!-- Loading state -->
            <div v-if="loading" class="mt-2 text-sm text-blue-600">
                Procesando accion...
            </div>
        </div>

        <!-- Detalles del pedido -->
        <DetalleProductos :pedido="pedido"
                          :detalles="pedido.detalles"
                          :puede-modificar="puedeModificarPedido"
                          :puede-ver-totales="puedeVerTotales"
                          @estado-actualizado="handleEstadoActualizado"
                          @modificacion="handleProductoModificado" />

        <!-- Modal de confirmacion de cancelacion -->
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
                         Esta seguro que desea cancelar este pedido?
                    </p>
                    <div class="flex justify-end gap-2">
                        <button @click="mostrarConfirmacionCancelacion = false"
                                class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">
                            No, mantener
                        </button>
                        <button @click="cancelarPedido"
                                class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                            Si, cancelar
                        </button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    </div>
</template>
<script setup>
    import { ref, computed, watch, onMounted } from 'vue';
    import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
    import DetalleProductos from './DetalleProductos.vue';
    import { formatearFecha } from '@/utils/dateUtils';
    import { useAuthStore } from '@/stores/auth';
    import { usePedidoStore } from '@/stores/pedidoStateMachine';

    const props = defineProps({
        pedido: {
            type: Object,
            required: true
        },
        sucursalActiva: { 
            type: Number,
            required: true
        }
    });

    const emit = defineEmits(['estado-actualizado']);
    const authStore = useAuthStore();
    const pedidoStore = usePedidoStore();
    const loading = ref(false);
    const error = ref('');
    const mostrarConfirmacionCancelacion = ref(false);
    const accionesDisponibles = ref([]);
    const cambiosPendientes = ref(false);

    const puedeModificarPedido = computed(() => {
        if (props.pedido.estado === 'FINALIZADO') {
            return false;
        }
        return pedidoStore.puedeModificarPedido(props.pedido, authStore.user);
    });

    const puedeCancelarPedido = computed(() => {
        return pedidoStore.puedeCancelarPedido(props.pedido, authStore.user);
    });

    const puedeVerTotales = computed(() => {
        return pedidoStore.puedeVerTotales(props.pedido, authStore.user);
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
        if (!accion.habilitado) {
            return 'bg-gray-400';
        }

        const baseClass = 'px-4 py-2 text-white rounded transition-colors';
        const classes = {
            'bg-emerald-500 hover:bg-emerald-600': ['RECIBIDO', 'PREPARADO', 'FINALIZADO'].includes(accion.estado),
            'bg-yellow-500 hover:bg-yellow-600': ['RECIBIDO_CON_DIFERENCIAS'].includes(accion.estado),
            'bg-blue-500 hover:bg-blue-600': ['EN_FABRICA_MODIFICADO', 'PREPARADO_MODIFICADO'].includes(accion.estado)
        };

        const stateClass = Object.entries(classes).find(([_, condition]) => condition)?.[0] || 'bg-gray-500 hover:bg-gray-600';
        return `${baseClass} ${stateClass}`;
    };

    async function verificarCambios() {
        try {
            if (!props.pedido?.pedido_id) return;
            loading.value = true;
            const tieneCambios = await pedidoStore.tieneCambios(props.pedido.pedido_id);
            cambiosPendientes.value = tieneCambios;
            console.log('Estado de cambios:', {
                pedidoId: props.pedido.pedido_id,
                tieneCambios
            });
        } catch (err) {
            console.error('Error verificando cambios:', err);
            error.value = 'Error verificando cambios';
        } finally {
            loading.value = false;
        }
    }

    const ejecutarAccion = async (accion) => {
        try {
            loading.value = true;
            error.value = '';
            const nuevoEstado = accion.estado === 'RECIBIDO' ? 'FINALIZADO' : accion.estado;

            const resultado = await pedidoStore.cambiarEstadoPedido(props.pedido.pedido_id, nuevoEstado);
            emit('estado-actualizado', resultado);
            await actualizarAccionesDisponibles();
        } catch (err) {
            error.value = err.message;
            console.error('Error al ejecutar accion:', err);
        } finally {
            loading.value = false;
        }
    };

    const actualizarAccionesDisponibles = async () => {
        try {
            console.log('Actualizando acciones disponibles');
            const acciones = await pedidoStore.obtenerAccionesPermitidas(
                props.pedido.estado,
                authStore.user,
                props.pedido
            );
            accionesDisponibles.value = acciones;
            console.log('Acciones actualizadas:', acciones);
        } catch (error) {
            console.error('Error actualizando acciones:', error);
        }
    };

    const handleProductoModificado = async () => {
        await verificarCambios();
        await actualizarAccionesDisponibles();
    };

    const handleEstadoActualizado = async () => {
        console.log('Manejando actualizacion de estado');
        await actualizarAccionesDisponibles();
        emit('estado-actualizado');
    };

    const confirmarCancelacion = () => {
        mostrarConfirmacionCancelacion.value = true;
    };

    const cancelarPedido = async () => {
        try {
            loading.value = true;
            await pedidoStore.cambiarEstadoPedido(props.pedido.pedido_id, 'CANCELADO');
            mostrarConfirmacionCancelacion.value = false;
            emit('estado-actualizado', { estado: 'CANCELADO' });
        } catch (error) {
            console.error('Error al cancelar pedido:', error);
            error.value = error.message;
        } finally {
            loading.value = false;
        }
    };

    // Lifecycle hooks
    watch(() => props.pedido.estado, async () => {
        console.log('Estado del pedido cambio:', props.pedido.estado);
        await actualizarAccionesDisponibles();
    });

    watch(() => props.pedido, async (newVal) => {
        if (newVal?.pedido_id) {
            await verificarCambios();
        }
    }, { deep: true });

    onMounted(() => {
        console.log('Montando PedidoStateManager', {
            pedido: props.pedido,
            sucursalActiva: props.sucursalActiva
        });

        if (props.pedido?.pedido_id) {
            pedidoStore.setContexto(props.sucursalActiva, props.pedido);
            Promise.all([
                actualizarAccionesDisponibles(),
                verificarCambios()
            ]);
        }
    });

</script>