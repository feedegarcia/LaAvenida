<template>
    <div class="bg-white rounded-lg shadow-lg p-4">
        <h3 class="text-lg font-semibold mb-4">Detalle del Pedido</h3>
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Producto
                        </th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cantidad Solicitada
                        </th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cantidad Confirmada
                        </th>
                        <th v-if="puedeVerTotales"
                            class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Precio Unit.
                        </th>
                        <th v-if="puedeVerTotales"
                            class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subtotal
                        </th>
                        <th v-if="puedeModificar"
                            class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                        </th>
                        <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Eliminar
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="detalle in detalles"
                        :key="detalle.detalle_id"
                        :class="[
                            detalle.modificado ? getModificacionStyle(detalle) : '',
                            'transition-colors duration-300'
                        ]">
                        <td class="px-4 py-3">
                            <div class="flex items-center">
                                <span class="font-medium">{{ detalle.producto_nombre }}</span>
                                <span v-if="detalle.modificado"
                                      class="ml-2 px-2 py-1 text-xs rounded-full"
                                      :style="getModificadoBadgeStyle(detalle)">
                                    Modificado por {{ getSucursalNombre(detalle.modificado_por_sucursal) }}
                                </span>
                            </div>
                        </td>
                        <td class="px-4 py-3 text-right">
                            {{ detalle.cantidad_solicitada }}
                        </td>
                        <td class="px-4 py-3 text-right">
                            <template v-if="puedeModificarCantidades">
                                <input type="number"
                                       v-model.number="cantidadesModificadas[detalle.detalle_id]"
                                       :placeholder="detalle.cantidad_confirmada || detalle.cantidad_solicitada"
                                       min="0"
                                       class="w-20 text-right border rounded-md">
                            </template>
                            <template v-else>
                                {{ detalle.cantidad_confirmada || detalle.cantidad_solicitada }}
                            </template>
                        </td>
                        <td v-if="puedeVerTotales" class="px-4 py-3 text-right">
                            $ {{ formatoMoneda(detalle.precio_unitario) }}
                        </td>
                        <td v-if="puedeVerTotales" class="px-4 py-3 text-right">
                            $ {{ formatoMoneda(detalle.precio_unitario * (detalle.cantidad_confirmada || detalle.cantidad_solicitada)) }}
                        </td>
                        <td v-if="puedeModificar" class="px-4 py-3 text-center">
                            <button @click="guardarCambios(detalle)"
                                    v-bind:disabled="!hayCambios(detalle)"
                                    :class="{
                                        'text-sm transition-colors duration-200 px-3 py-1 rounded': true,
                                        'bg-emerald-500 text-white hover:bg-emerald-600': hayCambios(detalle),
                                        'bg-gray-200 text-gray-400 cursor-not-allowed': !hayCambios(detalle)
                                    }">
                                Guardar
                            </button>
                        </td>
                        <td class="px-4 py-3 text-center">
                            <button @click="eliminarProducto(detalle)"
                                    v-bind:disabled="!puedeModificar"
                                    class="text-red-500 hover:text-red-700 transition-colors duration-200"
                                    title="Eliminar producto">
                                <XIcon class="w-5 h-5" />
                            </button>
                        </td>
                    </tr>
                </tbody>
                <tfoot v-if="puedeVerTotales">
                    <tr class="bg-gray-50">
                        <td colspan="4" class="px-4 py-3 text-right font-medium">Total:</td>
                        <td class="px-4 py-3 text-right font-medium">
                            $ {{ formatoMoneda(totalPedido) }}
                        </td>
                        <td v-if="puedeModificar"></td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <!-- Boton y Modal para agregar productos -->
        <div v-if="puedeModificar" class="mt-4">
            <button @click="mostrarSelectorProductos = true"
                    class="px-4 py-2 text-sm bg-emerald-500 text-white rounded hover:bg-emerald-600">
                Agregar Producto
            </button>
        </div>

        <!-- Modal de Selector de Productos -->
        <TransitionRoot appear :show="mostrarSelectorProductos" as="template">
            <Dialog as="div" @close="mostrarSelectorProductos = false" class="relative z-50">
                <TransitionChild as="template"
                                 enter="duration-300 ease-out"
                                 enter-from="opacity-0"
                                 enter-to="opacity-100"
                                 leave="duration-200 ease-in"
                                 leave-from="opacity-100"
                                 leave-to="opacity-0">
                    <div class="fixed inset-0 bg-black bg-opacity-25" />
                </TransitionChild>

                <div class="fixed inset-0 overflow-y-auto">
                    <div class="flex min-h-full items-center justify-center p-4">
                        <TransitionChild as="template"
                                         enter="duration-300 ease-out"
                                         enter-from="opacity-0 scale-95"
                                         enter-to="opacity-100 scale-100"
                                         leave="duration-200 ease-in"
                                         leave-from="opacity-100 scale-100"
                                         leave-to="opacity-0 scale-95">
                            <DialogPanel class="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                                <div class="flex justify-between items-center mb-6">
                                    <h3 class="text-lg font-medium">Agregar Productos</h3>
                                    <button @click="mostrarSelectorProductos = false"
                                            class="text-gray-500 hover:text-gray-700">
                                        <X class="h-5 w-5" />
                                    </button>
                                </div>

                                <!-- Buscador -->
                                <div class="mb-4">
                                    <input type="text"
                                           v-model="busquedaProducto"
                                           placeholder="Buscar por nombre o codigo..."
                                           class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" />
                                </div>

                                <!-- Lista de productos -->
                                <div class="max-h-96 overflow-y-auto">
                                    <div v-if="productosFiltrados.length === 0"
                                         class="text-center py-4 text-gray-500">
                                        No se encontraron productos
                                    </div>
                                    <div v-else
                                         v-for="producto in productosFiltrados"
                                         :key="producto.producto_id"
                                         class="p-4 border-b hover:bg-gray-50 flex items-center justify-between">
                                        <div>
                                            <p class="font-medium">{{ producto.nombre }}</p>
                                            <p class="text-sm text-gray-500">
                                                Codigo: {{ producto.codigo }}
                                                <span class="ml-2">Stock: {{ producto.stock || 0 }}</span>
                                            </p>
                                        </div>
                                        <div class="flex items-center gap-3">
                                            <input type="number"
                                                   v-model="nuevasSelecciones[producto.producto_id]"
                                                   min="0"
                                                   placeholder="Cantidad"
                                                   class="w-24 px-2 py-1 border rounded text-right" />
                                            <button @click="agregarProducto(producto)"
                                                    v-bind:disabled="!nuevasSelecciones[producto.producto_id]"
                                                    class="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                                Agregar
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div class="mt-6 flex justify-end">
                                    <button @click="mostrarSelectorProductos = false"
                                            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
                                        Cerrar
                                    </button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </TransitionRoot>
    </div>
</template>
<script setup>
    import { ref, computed } from 'vue';
    import { Dialog, DialogPanel, DialogOverlay, TransitionChild, TransitionRoot } from '@headlessui/vue';
    import { X, X as XIcon } from 'lucide-vue-next';
    import { useAuthStore } from '@/stores/auth';

    const authStore = useAuthStore();
    const cantidadesModificadas = ref({});
    const mostrarSelectorProductos = ref(false);
    const nuevasSelecciones = ref({});
    const busquedaProducto = ref('');

    const props = defineProps({
        pedido: {
            type: Object,
            required: true
        },
        detalles: {
            type: Array,
            required: true
        },
        productos: {
            type: Array,
            default: () => []
        },
        puedeModificar: {
            type: Boolean,
            default: false
        },
        puedeVerTotales: {
            type: Boolean,
            default: false
        }
    });

    const emit = defineEmits(['modificacion', 'agregar-producto']);

    const totalPedido = computed(() => {
        return props.detalles.reduce((total, detalle) => {
            const cantidad = detalle.cantidad_confirmada || detalle.cantidad_solicitada;
            return total + (detalle.precio_unitario * cantidad);
        }, 0);
    });

    const puedeModificarCantidades = computed(() => {
        return props.puedeModificar &&
            props.pedido.estado !== 'FINALIZADO' &&
            props.pedido.estado !== 'CANCELADO';
    });

    const productosFiltrados = computed(() => {
        if (!props.productos) return [];
        const busqueda = busquedaProducto.value.toLowerCase().trim();

        return props.productos.filter(producto => {
            const nombreCoincide = producto.nombre.toLowerCase().includes(busqueda);
            const codigoCoincide = producto.codigo?.toLowerCase().includes(busqueda);
            const noEstaEnPedido = !props.detalles.some(d => d.producto_id === producto.producto_id);
            return (nombreCoincide || codigoCoincide) && noEstaEnPedido;
        });
    });

    const getModificacionStyle = (detalle) => {
        const sucursal = props.pedido?.sucursales?.find(
            s => s.sucursal_id === detalle.modificado_por_sucursal
        );

        if (!sucursal?.color) return 'bg-gray-50';

        return {
            backgroundColor: `${sucursal.color}15`,
            borderLeft: `4px solid ${sucursal.color}`
        };
    };

    const getModificadoBadgeStyle = (detalle) => {
        const sucursal = props.pedido?.sucursales?.find(
            s => s.sucursal_id === detalle.modificado_por_sucursal
        );

        if (!sucursal?.color) return {
            backgroundColor: 'rgb(243, 244, 246)',
            color: 'rgb(107, 114, 128)'
        };

        return {
            backgroundColor: `${sucursal.color}20`,
            color: sucursal.color
        };
    };

    const getSucursalNombre = (sucursalId) => {
        const sucursal = props.pedido?.sucursales?.find(
            s => s.sucursal_id === sucursalId
        );
        return sucursal?.nombre || 'Desconocida';
    };

    const formatoMoneda = (valor) => {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    };

    const actualizarCantidad = (detalleId, nuevaCantidad) => {
        const cantidad = parseInt(nuevaCantidad) || 0;
        cantidadesModificadas.value[detalleId] = cantidad;
    };

    const hayCambios = (detalle) => {
        const nuevaCantidad = cantidadesModificadas.value[detalle.detalle_id];
        return nuevaCantidad !== undefined &&
            nuevaCantidad !== detalle.cantidad_confirmada &&
            nuevaCantidad !== detalle.cantidad_solicitada;
    };

    const guardarCambios = (detalle) => {
        const cambio = {
            detalle_id: detalle.detalle_id,
            cantidad_anterior: detalle.cantidad_confirmada || detalle.cantidad_solicitada,
            cantidad_nueva: cantidadesModificadas.value[detalle.detalle_id],
            sucursal_id: authStore.user.sucursales[0]?.id
        };
        emit('modificacion', cambio);
    };

    const agregarProducto = (producto) => {
        const cantidad = nuevasSelecciones.value[producto.producto_id];
        if (!cantidad || cantidad <= 0) return;

        emit('agregar-producto', {
            producto_id: producto.producto_id,
            cantidad: cantidad,
            precio_unitario: producto.precio_mayorista,
            sucursal_id: authStore.user.sucursales[0]?.id
        });

        nuevasSelecciones.value[producto.producto_id] = 0;
        mostrarSelectorProductos.value = false;
    };

    const eliminarProducto = (detalle) => {
        if (!confirm('¿Esta seguro que desea eliminar este producto?')) return;

        try {
            const cambio = {
                detalle_id: detalle.detalle_id,
                cantidad_anterior: detalle.cantidad_confirmada || detalle.cantidad_solicitada,
                cantidad_nueva: 0,
                eliminado: true,
                nota: 'Producto eliminado del pedido',
                sucursal_id: authStore.user.sucursales[0]?.id
            };

            emit('modificacion', cambio);
        } catch (error) {
            console.error('Error al eliminar producto:', error);
        }
    };
</script>