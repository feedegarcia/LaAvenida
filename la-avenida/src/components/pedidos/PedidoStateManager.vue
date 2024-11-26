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
                        ultima actualizacion: {{ formatearFecha(pedido.updated_at) }}
                    </p>
                </div>

                <!-- Botones de accion -->
                <div class="flex gap-2">
                    <template v-for="accion in accionesDisponibles"
                              :key="accion.estado">
                        <button @click="cambiarEstado(accion.estado)"
                                v-bind:disabled="!esAccionValida(accion)"
                                :class="[
                'px-4 py-2 text-white rounded transition-all',
                {
                    'bg-green-500 hover:bg-green-600': accion.estado === 'RECIBIDO',
                    'bg-orange-500 hover:bg-orange-600': accion.estado === 'RECIBIDO_CON_DIFERENCIAS',
                    'bg-blue-500 hover:bg-blue-600': accion.estado === 'EN_FABRICA_MODIFICADO',
                    'bg-green-500 hover:bg-green-600': accion.estado === 'PREPARADO',
                    'bg-blue-500 hover:bg-blue-600': accion.estado === 'PREPARADO_MODIFICADO',
                    'bg-gray-300 cursor-not-allowed': !esAccionValida(accion)
                }
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
        </div>

        <!-- Detalles del pedido -->
        <DetalleProductos :pedido="pedido"
                          :detalles="pedido.detalles || []"
                          :puede-modificar="puedeModificarPedido"
                          :puede-ver-totales="puedeVerTotales"
                          :productos="productos"
                          @modificacion="handleModificacion"
                          @agregar-producto="handleAgregarProducto" />

        <!-- Modal de confirmacion de cancelacion -->
        <Dialog v-if="mostrarConfirmacionCancelacion"
                @close="mostrarConfirmacionCancelacion = false"
                class="relative z-50">
            <div class="fixed inset-0 bg-black/30" />
            <div class="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6">
                    <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4">
                        Confirmar Cancelacion
                    </DialogTitle>
                    <p class="text-sm text-gray-500">
                        ¿Esta seguro que desea cancelar este pedido?
                    </p>
                    <div class="mt-4 flex justify-end space-x-3">
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
    import { ref, computed, onMounted } from 'vue';
    import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
    import DetalleProductos from './DetalleProductos.vue';
    import { formatearFecha } from '@/utils/dateUtils';
    import { useAuthStore } from '@/stores/auth';
    import { usePedidoStore } from '@/stores/pedidoStateMachine';
    import axios from '@/utils/axios-config';

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
    const productos = ref([]);

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
        const estadoConfig = pedidoStore.estadosPedido[props.pedido.estado];
        if (!estadoConfig?.acciones) return [];

        return estadoConfig.acciones.filter(accion => {
            if (accion.permiso === 'SUCURSAL_ORIGEN') {
                return authStore.user.sucursales.some(s => s.id === props.pedido.sucursal_origen);
            }
            if (accion.permiso === 'SUCURSAL_DESTINO') {
                return authStore.user.sucursales.some(s => s.id === props.pedido.sucursal_destino);
            }
            if (accion.permiso === 'ADMIN') {
                return ['ADMIN', 'DUEÑO'].includes(authStore.user.rol);
            }
            return false;
        });
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

    const cargarProductos = async () => {
        try {
            const response = await axios.get('/api/productos/pedido', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            let productosArray = [];

            if (response.data.fabricas) {
                Object.values(response.data.fabricas).forEach(fabrica => {
                    Object.values(fabrica.subcategorias || {}).forEach(subcategoria => {
                        productosArray = productosArray.concat(subcategoria.productos || []);
                    });
                });
            }

            if (response.data.sinTac?.length) {
                productosArray = productosArray.concat(response.data.sinTac);
            }

            if (response.data.varios?.length) {
                productosArray = productosArray.concat(response.data.varios);
            }

            productos.value = productosArray;
        } catch (error) {
            console.error('Error cargando productos:', error);
            productos.value = [];
        }
    };

    const handleModificacion = async (cambios) => {
        try {
            const resultado = await pedidoStore.cambiarEstadoPedido(
                props.pedido.pedido_id,
                props.pedido.estado,
                {
                    detalles: [cambios]
                }
            );
            emit('estado-actualizado', resultado);
        } catch (error) {
            console.error('Error al modificar pedido:', error);
        }
    };

    const handleAgregarProducto = async (producto) => {
        try {
            const response = await axios.post(`/api/pedidos/${props.pedido.pedido_id}/productos`, {
                productos: [{
                    producto_id: producto.producto_id,
                    cantidad: producto.cantidad,
                    precio_unitario: producto.precio_mayorista || producto.precio_unitario
                }],
                sucursal_id: authStore.user.sucursales[0]?.id
            });
            emit('estado-actualizado', response.data);
        } catch (error) {
            console.error('Error detallado:', error.response?.data);
            // Aqui podriamos agregar un toast o notificacion al usuario
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

    onMounted(() => {
        cargarProductos();
    });
</script>