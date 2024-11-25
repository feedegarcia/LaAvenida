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
                        <span :class="[
              'px-2 py-1 rounded-full text-sm',
              `bg-${pedidoStore.obtenerColorEstado(pedido.estado)}-100`,
              `text-${pedidoStore.obtenerColorEstado(pedido.estado)}-800`
            ]">
                            {{ pedidoStore.obtenerEtiquetaEstado(pedido.estado) }}
                        </span>
                    </div>
                    <p class="text-sm text-gray-600">
                        Última actualización: {{ formatearFecha(pedido.updated_at) }}
                    </p>
                </div>

                <!-- Botones de acción -->
                <div class="flex gap-2">
                    <template v-for="accion in accionesDisponibles"
                              :key="accion.estado">
                        <button @click="cambiarEstado(accion.estado)"
                                :disabled="!esAccionValida(accion)"
                                class="px-4 py-2 text-white rounded transition-all"
                                :class="{
        'bg-green-500 hover:opacity-90': esAccionValida(accion) && accion.estado === 'PREPARADO',
        'bg-yellow-500 hover:opacity-90': esAccionValida(accion) && accion.estado === 'EN_FABRICA_MODIFICADO',
        'bg-gray-300 cursor-not-allowed': !esAccionValida(accion)
    }">
                            {{ accion.label }}
                        </button>
                    </template>

                    <!-- Botón de cancelar (único) -->
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
                          :color-sucursal="obtenerColorSucursal"
                          @modificacion="handleModificacion" />

        <!-- Modal de confirmación de cancelación -->
        <Dialog v-if="mostrarConfirmacionCancelacion"
                @close="mostrarConfirmacionCancelacion = false"
                class="relative z-50">
            <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div class="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6">
                    <h3 class="text-lg font-medium mb-4">Confirmar Cancelación</h3>
                    <p class="text-gray-600 mb-4">
                        ¿Está seguro que desea cancelar este pedido?
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
    import { ref, computed } from 'vue';
    import { Dialog, DialogPanel } from '@headlessui/vue';
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

    const puedeModificarPedido = computed(() => {
        return pedidoStore.puedeModificarPedido(props.pedido, authStore.user);
    });

    const puedeCancelarPedido = computed(() => {
        return pedidoStore.puedeCancelarPedido(props.pedido, authStore.user);
    });

    const puedeVerTotales = computed(() => {
        return pedidoStore.puedeVerTotales(props.pedido, authStore.user);
    });
    const esAccionValida = (accion) => {
        if (accion.desactivadoSi === 'tieneCambios') {
            return !props.pedido.detalles?.some(d => d.modificado);
        }
        if (accion.activadoSi === 'tieneCambios') {
            return props.pedido.detalles?.some(d => d.modificado);
        }
        return true;
    };

    // Nueva función para obtener color de sucursal
    const obtenerColorSucursal = (detalle) => {
        if (!detalle.modificado) return null;

        const sucursal = props.pedido.sucursales?.find(
            s => s.sucursal_id === detalle.modificado_por_sucursal
        );
        return sucursal?.color || null;
    };
    const accionesDisponibles = computed(() => {
        const acciones = pedidoStore.obtenerAccionesPermitidas(
            props.pedido.estado,
            authStore.user,
            props.pedido
        );
        console.log('Acciones disponibles:', acciones);
        return acciones;
    });

    const cambiarEstado = async (nuevoEstado) => {
        try {
            const resultado = await pedidoStore.cambiarEstadoPedido(
                props.pedido.pedido_id,
                nuevoEstado
            );
            emit('estado-actualizado', resultado);
        } catch (error) {
            console.error('Error al cambiar estado:', error);
        }
    };

    const handleModificacion = async (cambios) => {
        try {
            const resultado = await pedidoStore.cambiarEstadoPedido(
                props.pedido.pedido_id,
                props.pedido.estado,
                {
                    detalles: cambios,
                    sucursal_id: authStore.user.sucursales[0]?.id // Sucursal actual del usuario
                }
            );
            emit('estado-actualizado', resultado);
        } catch (error) {
            console.error('Error al modificar pedido:', error);
        }
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