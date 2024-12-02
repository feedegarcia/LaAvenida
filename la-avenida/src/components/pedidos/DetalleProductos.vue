<template>
    <div class="bg-white rounded-lg shadow-lg p-4">
        <h3 class="text-lg font-semibold mb-4">Detalle del Pedido</h3>
        <div class="overflow-x-auto">
            <!-- Header común para todas las categorías -->
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
                        <th v-if="['PREPARADO', 'PREPARADO_MODIFICADO'].includes(pedido.estado)"
                            class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Recibido
                        </th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <!-- Iteración por categorías -->
                    <template v-for="(productos, categoria) in detallesAgrupados" :key="categoria">
                        <!-- Título de la categoría -->
                        <tr class="bg-gray-50">
                            <td colspan="8" class="border-l-4 border-gray-500 px-4 py-3 font-semibold text-gray-700">
                                {{ categoria }}
                            </td>
                        </tr>

                        <!-- Productos de la categoría -->
                        <tr v-for="detalle in productos"
                            :key="detalle.detalle_id"
                            :class="[
                detalle.modificado ? getModificacionStyle(detalle) : '',
                'transition-colors duration-300'
            ]">
                            <td class="px-4 py-3 pl-8">
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
                                <template v-if="esSucursalOrigen && puedeModificarCantidades">
                                    <input type="number"
                                           v-model.number="cantidadesSolicitadas[detalle.detalle_id]"
                                           :placeholder="detalle.cantidad_solicitada"
                                           min="0"
                                           class="w-20 text-right border rounded-md">
                                </template>
                                <template v-else>
                                    {{ detalle.cantidad_solicitada }}
                                </template>
                            </td>
                            <td class="px-4 py-3 text-right">
                                <template v-if="esSucursalDestino && puedeModificarCantidades">
                                    <input type="number"
                                           v-model.number="cantidadesConfirmadas[detalle.detalle_id]"
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
                            <td v-if="['PREPARADO', 'PREPARADO_MODIFICADO'].includes(pedido.estado)"
                                class="px-4 py-3 text-center">
                                <input type="checkbox"
                                       :checked="estaRecibido(detalle.detalle_id)"
                                       @change="marcarRecibido(detalle)"
                                       class="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" />
                            </td>
                        </tr>

                        <!-- Subtotal de la categoría -->
                        <tr v-if="puedeVerTotales" class="bg-gray-50 border-t">
                            <td :colspan="puedeModificar ? 4 : 3" class="px-4 py-2 text-right font-medium">
                                Subtotal {{ categoria }}:
                            </td>
                            <td class="px-4 py-2 text-right font-medium">
                                $ {{ formatoMoneda(calcularSubtotalCategoria(productos)) }}
                            </td>
                            <td v-if="puedeModificar"></td>
                            <td></td>
                            <td v-if="['PREPARADO', 'PREPARADO_MODIFICADO'].includes(pedido.estado)"></td>
                        </tr>
                    </template>
                </tbody>
            </table>

            <!-- Total general -->
            <div v-if="puedeVerTotales" class="mt-6 border-t pt-4">
                <div class="flex justify-end items-center">
                    <span class="font-medium mr-4">Total General:</span>
                    <span class="font-bold text-lg">
                        $ {{ formatoMoneda(totalPedido) }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Botón Agregar Productos -->
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
                                <div class="flex justify-end mb-4">
                                    <button v-if="hayProductosParaAgregar"
                                            @click="agregarProductosSeleccionados"
                                            class="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600">
                                        Agregar Seleccionados ({{ Object.values(nuevasSelecciones).filter(v => v > 0).length }})
                                    </button>
                                </div>
                                <!-- Lista de productos -->
                                <div class="max-h-96 overflow-y-auto">
                                    <div v-if="productosFiltrados.length === 0"
                                         class="text-center py-4 text-gray-500">
                                        No se encontraron productos
                                    </div>
                                    <div v-else
                                         v-for="producto in productosFiltrados"
                                         :key="producto.uniqueKey"
                                         class="p-4 border-b hover:bg-gray-50 flex items-center justify-between">
                                        <div>
                                            <p class="font-medium">{{ producto.nombre }}</p>
                                            <p class="text-sm text-gray-500">
                                                Codigo: {{ producto.codigo }}
                                            </p>
                                        </div>
                                        <div class="flex items-center gap-3">
                                            <input type="number"
                                                   v-model="nuevasSelecciones[producto.producto_id]"
                                                   min="0"
                                                   placeholder="Cantidad"
                                                   class="w-24 px-2 py-1 border rounded text-right" />
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
    import { ref, computed, watch, onMounted } from 'vue';
    import { Dialog, DialogPanel, DialogOverlay, TransitionChild, TransitionRoot } from '@headlessui/vue';
    import { X, X as XIcon } from 'lucide-vue-next';
    import { useAuthStore } from '@/stores/auth';
    import axios from '@/utils/axios-config';
    import { usePedidoStore } from '@/stores/pedidoStateMachine';

    const pedidoStore = usePedidoStore();
    const authStore = useAuthStore();
    const cantidadesModificadas = ref({});
    const mostrarSelectorProductos = ref(false);
    const nuevasSelecciones = ref({});
    const busquedaProducto = ref('');
    const productosDisponibles = ref([]);
    const productosRecibidos = ref(new Map());
    const cantidadesSolicitadas = ref({});  
    const cantidadesConfirmadas = ref({});  

    const esSucursalOrigen = computed(() => {
        return authStore.user.sucursales.some(s => s.id === props.pedido.sucursal_origen);
    });

    const esSucursalDestino = computed(() => {
        return authStore.user.sucursales.some(s => s.id === props.pedido.sucursal_destino);
    });

    const cargarProductosDisponibles = async () => {
        try {
            const response = await axios.get(
                `/api/pedidos/${props.pedido.pedido_id}/productos/disponibles`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
            // Asegurarnos que los productos son únicos y tienen la info necesaria
            productosDisponibles.value = response.data.map(p => ({
                ...p,
                uniqueKey: `${p.producto_id}-${Date.now()}` // Asegurar keys únicas
            }));
        } catch (error) {
            console.error('Error cargando productos:', error);
            productosDisponibles.value = [];
        }
    };


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

    const emit = defineEmits([
        'modificacion',
        'agregar-producto',
        'estado-actualizado',
        'producto-eliminado',
        'producto-agregado'
    ]);

    const totalPedido = computed(() => {
        return props.detalles.reduce((total, detalle) => {
            const cantidad = detalle.cantidad_confirmada || detalle.cantidad_solicitada;
            return total + (detalle.precio_unitario * cantidad);
        }, 0);
    });

    const detallesAgrupados = computed(() => {
        const grupos = {};
        props.detalles.forEach(detalle => {
            if (!grupos[detalle.categoria_nombre]) {
                grupos[detalle.categoria_nombre] = [];
            }
            grupos[detalle.categoria_nombre].push(detalle);
        });
        return grupos;
    });

    // Función para calcular subtotal por categoría
    const calcularSubtotalCategoria = (productos) => {
        return productos.reduce((total, detalle) => {
            const cantidad = detalle.cantidad_confirmada || detalle.cantidad_solicitada;
            return total + (detalle.precio_unitario * cantidad);
        }, 0);
    };


    const puedeModificarCantidades = computed(() => {
        return props.puedeModificar &&
            !['FINALIZADO', 'CANCELADO'].includes(props.pedido.estado);
    });

    const productosFiltrados = computed(() => {
        if (!productosDisponibles.value) return [];
        const busqueda = busquedaProducto.value.toLowerCase().trim();

        return productosDisponibles.value
            .filter(producto => {
                const nombreCoincide = producto.nombre.toLowerCase().includes(busqueda);
                const codigoCoincide = producto.codigo?.toLowerCase().includes(busqueda);
                return nombreCoincide || codigoCoincide;
            })
            .map(producto => ({
                ...producto,
                uniqueKey: `${producto.producto_id}-${producto.codigo}-${Date.now()}`
            }));
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
    const estaRecibido = (detalleId) => {
        return productosRecibidos.value.get(detalleId) || false;
    };
    const marcarRecibido = async (detalle) => {
        try {
            const currentState = productosRecibidos.value.get(detalle.detalle_id);
            const nuevoEstado = !currentState;

            const response = await axios.patch(
                `/api/pedidos/${props.pedido.pedido_id}/productos/${detalle.detalle_id}/recibido`,
                { recibido: nuevoEstado },
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            if (response.data.success) {
                // Crear un nuevo Map para forzar la reactividad
                const newMap = new Map(productosRecibidos.value);
                newMap.set(detalle.detalle_id, response.data.estadoActual);
                productosRecibidos.value = newMap;
            }
        } catch (error) {
            console.error('Error al marcar como recibido:', error.response?.data || error.message);
        }
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
        if (esSucursalOrigen.value) {
            return cantidadesSolicitadas.value[detalle.detalle_id] !== undefined &&
                cantidadesSolicitadas.value[detalle.detalle_id] !== detalle.cantidad_solicitada;
        }

        if (esSucursalDestino.value) {
            return cantidadesConfirmadas.value[detalle.detalle_id] !== undefined &&
                cantidadesConfirmadas.value[detalle.detalle_id] !== detalle.cantidad_confirmada;
        }

        return false;
    };

    const guardarCambios = async (detalle) => {
        try {
            let datosActualizacion = {
                sucursal_id: authStore.user.sucursales[0]?.id
            };

            // Determinar qué campo actualizar según la sucursal
            if (esSucursalOrigen.value) {
                datosActualizacion.cantidad = cantidadesSolicitadas.value[detalle.detalle_id];
                datosActualizacion.campo = 'cantidad_solicitada';
            } else if (esSucursalDestino.value) {
                datosActualizacion.cantidad = cantidadesConfirmadas.value[detalle.detalle_id];
                datosActualizacion.campo = 'cantidad_confirmada';
            }

            const response = await axios.patch(
                `/api/pedidos/${props.pedido.pedido_id}/productos/${detalle.detalle_id}`,
                datosActualizacion,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            if (response.data) {
                await emit('modificacion', {
                    detalle_id: detalle.detalle_id,
                    cantidad_anterior: esSucursalOrigen.value ?
                        detalle.cantidad_solicitada : detalle.cantidad_confirmada,
                    cantidad_nueva: datosActualizacion.cantidad,
                    sucursal_id: authStore.user.sucursales[0]?.id
                });
                emit('estado-actualizado');
            }
        } catch (error) {
            console.error('Error al guardar cambios:', error);
        }
    };

    // En DetalleProductos.vue, en la sección de methods
    const eliminarProducto = async (detalle) => {
        if (confirm('¿Está seguro que desea eliminar este producto?')) {
            try {
                const response = await axios.delete(
                    `/api/pedidos/${props.pedido.pedido_id}/productos/${detalle.detalle_id}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    }
                );

                console.log('Respuesta eliminación:', response.data);

                // Actualizar estado local
                if (esSucursalOrigen.value) {
                    detalle.cantidad_solicitada = 0;
                } else {
                    detalle.cantidad_confirmada = 0;
                }

                // Emitir eventos
                emit('estado-actualizado');
            } catch (error) {
                console.error('Error al eliminar producto:', error);
                // Mostrar mensaje de error al usuario
                alert('Error al eliminar el producto: ' + (error.response?.data?.message || error.message));
            }
        }
    };

    const hayProductosParaAgregar = computed(() => {
        return Object.values(nuevasSelecciones.value).some(cantidad => cantidad > 0);
    });

    const agregarProductosSeleccionados = async () => {
        try {
            const productosParaAgregar = productosFiltrados.value.filter(
                producto => nuevasSelecciones.value[producto.producto_id] > 0
            );

            for (const producto of productosParaAgregar) {
                const datosProducto = {
                    producto_id: producto.producto_id,
                    cantidad: nuevasSelecciones.value[producto.producto_id],
                    precio_unitario: producto.precio_mayorista,
                    sucursal_id: authStore.user.sucursales[0]?.id
                };

                await pedidoStore.agregarProductoAPedido(props.pedido.pedido_id, datosProducto);
            }

            nuevasSelecciones.value = {};
            mostrarSelectorProductos.value = false;
            emit('estado-actualizado');

        } catch (error) {
            console.error('Error al agregar productos:', error);
        }
    };


    watch(mostrarSelectorProductos, (nuevoValor) => {
        if (nuevoValor) {
            cargarProductosDisponibles();
        }
    });
    onMounted(() => {
        console.log('Inicializando productosRecibidos:');
        const initialState = new Map();
        props.detalles.forEach(detalle => {
            initialState.set(detalle.detalle_id, detalle.recibido === 1);
            console.log(`Detalle ID: ${detalle.detalle_id}, Recibido: ${initialState.get(detalle.detalle_id)}`);
        });
        productosRecibidos.value = initialState;
    });
</script>