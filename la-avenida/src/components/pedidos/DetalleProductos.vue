<!-- components/pedidos/DetalleProductos.vue -->
<template>
    <div class="bg-white rounded-lg shadow-lg p-4 mb-6">
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
                        <th v-if="esRolAdministrativo" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Precio Unit.
                        </th>
                        <th v-if="esRolAdministrativo" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subtotal
                        </th>
<<<<<<< Updated upstream
                        <th v-if="puedeModificar" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
=======
                        <th v-if="puedeModificar && pedido.estado !== 'FINALIZADO'"
                            class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
>>>>>>> Stashed changes
                            Acciones
                        </th>
                    </tr>
                </thead>
<<<<<<< Updated upstream
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="detalle in detalles"
                        :key="detalle.detalle_id"
                        :class="{'bg-yellow-50': detalle.modificado}">
                        <td class="px-4 py-3">
                            <div class="flex items-center">
                                <span class="font-medium">{{ detalle.nombre_producto }}</span>
                                <span v-if="detalle.modificado"
                                      class="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                    Modificado
                                </span>
                            </div>
                            <!-- Historial de cambios del producto -->
                            <div v-if="detalle.historial_cambios?.length"
                                 class="mt-1 text-sm text-gray-500">
                                <button @click="mostrarHistorial(detalle)"
                                        class="text-blue-500 hover:text-blue-700">
                                    Ver historial de cambios
                                </button>
                            </div>
                        </td>
                        <td class="px-4 py-3 text-right text-sm">
                            {{ detalle.cantidad_solicitada }}
                        </td>
                        <td class="px-4 py-3 text-right text-sm">
                            <template v-if="puedeModificar">
                                <input type="number"
                                       v-model.number="cantidadesModificadas[detalle.detalle_id]"
                                       :placeholder="detalle.cantidad_confirmada || detalle.cantidad_solicitada"
                                       class="w-20 text-right border rounded-md focus:ring-2 focus:ring-emerald-500">
                            </template>
                            <template v-else>
                                {{ detalle.cantidad_confirmada || detalle.cantidad_solicitada }}
                            </template>
                        </td>
                        <td v-if="esRolAdministrativo" class="px-4 py-3 text-right text-sm">
                            $ {{ formatoMoneda(detalle.precio_unitario) }}
                        </td>
                        <td v-if="esRolAdministrativo" class="px-4 py-3 text-right text-sm">
                            $ {{ formatoMoneda(detalle.precio_unitario * (detalle.cantidad_confirmada || detalle.cantidad_solicitada)) }}
                        </td>
                        <td v-if="puedeModificar" class="px-4 py-3 text-center">
                            <button v-if="hayCambios(detalle)"
                                    @click="guardarCambios(detalle)"
                                    class="text-sm bg-emerald-500 text-white px-3 py-1 rounded hover:bg-emerald-600">
                                Guardar
                            </button>
                        </td>
                    </tr>
=======
                <tbody class="divide-y divide-gray-200">
                    <template v-for="(productos, categoria) in detallesAgrupados" :key="categoria">
                        <tr class="bg-gray-50">
                            <td colspan="8" class="border-l-4 border-gray-500 px-4 py-3 font-semibold text-gray-700">
                                {{ categoria }}
                            </td>
                        </tr>

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
                                <template v-if="puedoModificarCantidadSegunRol('ORIGEN') && pedido.estado !== 'FINALIZADO'">
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
                                <template v-if="puedoModificarCantidadSegunRol('FABRICA') && pedido.estado !== 'FINALIZADO'">
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
                            <td v-if="puedeModificar && pedido.estado !== 'FINALIZADO'" class="px-4 py-3 text-center">
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
                                        v-bind:disabled="!puedeModificar || pedido.estado === 'FINALIZADO'"
                                        class="text-red-500 hover:text-red-700 transition-colors duration-200"
                                        title="Eliminar producto">
                                    <XIcon class="w-5 h-5" />
                                </button>
                            </td>
                            <td v-if="muestraCheckRecibido"
                                class="px-4 py-3 text-center">
                                <input type="checkbox"
                                       :checked="estaRecibido(detalle.detalle_id)"
                                       @change="marcarRecibido(detalle)"
                                       :disabled="!puedoModificarRecepcion || pedido.estado === 'FINALIZADO'"
                                       class="h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" />
                            </td>
                        </tr>
                        <tr v-if="puedeVerTotales" class="bg-gray-50 border-t">
                            <td :colspan="puedeModificar ? 4 : 3" class="px-4 py-2 text-right font-medium">
                                Subtotal {{ categoria }}:
                            </td>
                            <td class="px-4 py-2 text-right font-medium">
                                $ {{ formatoMoneda(calcularSubtotalCategoria(productos)) }}
                            </td>
                            <td v-if="puedeModificar"></td>
                            <td></td>
                            <td v-if="muestraCheckRecibido"></td>
                        </tr>
                    </template>
>>>>>>> Stashed changes
                </tbody>
                <!-- Footer con totales para roles administrativos -->
                <tfoot v-if="esRolAdministrativo">
                    <tr class="bg-gray-50">
                        <td colspan="3" class="px-4 py-3 text-right font-medium">Total:</td>
                        <td class="px-4 py-3 text-right font-medium">
                            $ {{ formatoMoneda(totalPedido) }}
                        </td>
                        <td v-if="puedeModificar"></td>
                    </tr>
                </tfoot>
            </table>
        </div>

<<<<<<< Updated upstream
        <!-- Modal de historial -->
        <HistorialModal v-if="historialSeleccionado"
                        :historial="historialSeleccionado"
                        @close="historialSeleccionado = null" />
=======
        <!-- Boton Agregar Productos -->
        <div v-if="puedeModificar && pedido.estado !== 'FINALIZADO'" class="mt-4">
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
                                        <XIcon class="h-5 w-5" />
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
>>>>>>> Stashed changes
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import HistorialModal from './HistorialModal.vue'

const props = defineProps({
  detalles: {
    type: Array,
    required: true
  },
  estado: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['modificacion'])

const authStore = useAuthStore()
const cantidadesModificadas = ref({})
const historialSeleccionado = ref(null)

// Computed properties
const esRolAdministrativo = computed(() => {
  return ['ADMIN', 'DUEÑO'].includes(authStore.userRole)
})

const puedeModificar = computed(() => {
  return ['EN_FABRICA', 'EN_FABRICA_MODIFICADO', 'RECIBIDO'].includes(props.estado)
})

<<<<<<< Updated upstream
const totalPedido = computed(() => {
  return props.detalles.reduce((total, detalle) => {
    const cantidad = detalle.cantidad_confirmada || detalle.cantidad_solicitada
    return total + (detalle.precio_unitario * cantidad)
  }, 0)
})
=======
    // Metodos
    const cargarProductosDisponibles = async () => {
        try {
            const response = await axios.get(`/api/pedidos/${props.pedido.pedido_id}/productos/disponibles`);
            productosDisponibles.value = response.data;
        } catch (error) {
            console.error('Error al cargar productos:', error);
        }
    };
>>>>>>> Stashed changes

// Methods
const formatoMoneda = (valor) => {
  return valor.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const hayCambios = (detalle) => {
  const nuevaCantidad = cantidadesModificadas.value[detalle.detalle_id]
  return nuevaCantidad !== undefined &&
         nuevaCantidad !== detalle.cantidad_confirmada &&
         nuevaCantidad !== detalle.cantidad_solicitada
}

const guardarCambios = (detalle) => {
  const cambio = {
    detalle_id: detalle.detalle_id,
    cantidad_anterior: detalle.cantidad_confirmada || detalle.cantidad_solicitada,
    cantidad_nueva: cantidadesModificadas.value[detalle.detalle_id]
  }
  emit('modificacion', cambio)
}

<<<<<<< Updated upstream
const mostrarHistorial = (detalle) => {
  historialSeleccionado.value = detalle.historial_cambios
}
=======
    };
    const agregarProducto = async (producto) => {
        try {
            const datos = {
                producto_id: producto.producto_id,
                cantidad: nuevasSelecciones.value[producto.producto_id],
                precio_unitario: producto.precio_mayorista // Agregar esto
            };

            await pedidoStore.agregarProducto(props.pedido.pedido_id, datos);
            emit('estado-actualizado');
            mostrarSelectorProductos.value = false;
            nuevasSelecciones.value = {}; // Limpiar selecciones despues de agregar
        } catch (error) {
            console.error('Error al agregar producto:', error);
        }
    };

    const calcularSubtotalCategoria = (productos) => {
        return productos.reduce((total, detalle) => {
            const cantidad = detalle.cantidad_confirmada || detalle.cantidad_solicitada;
            return total + (detalle.precio_unitario * cantidad);
        }, 0);
    };

    const muestraCheckRecibido = computed(() => {
        return ['PREPARADO', 'PREPARADO_MODIFICADO'].includes(props.pedido.estado);
    });

    const puedoModificarRecepcion = computed(() => {
        return pedidoStore.rolEnPedido === 'ORIGEN' && muestraCheckRecibido.value;
    });

    const puedoModificarCantidadSegunRol = (rol) => {
        if (!pedidoStore.rolEnPedido || !props.puedeModificar) return false;
        return pedidoStore.rolEnPedido === rol;
    };

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

    const getModificacionStyle = (detalle) => {
        const sucursal = props.pedido?.sucursales?.find(
            s => s.sucursal_id === detalle.modificado_por_sucursal
        );
        return sucursal?.color ? {
            backgroundColor: `${sucursal.color}15`,
            borderLeft: `4px solid ${sucursal.color}`
        } : 'bg-gray-50';
    };

    const getModificadoBadgeStyle = (detalle) => {
        const sucursal = props.pedido?.sucursales?.find(
            s => s.sucursal_id === detalle.modificado_por_sucursal
        );
        return sucursal?.color ? {
            backgroundColor: `${sucursal.color}20`,
            color: sucursal.color
        } : {
            backgroundColor: 'rgb(243, 244, 246)',
            color: 'rgb(107, 114, 128)'
        };
    };

    const getSucursalNombre = (sucursalId) => {
        return props.pedido?.sucursales?.find(s => s.sucursal_id === sucursalId)?.nombre || 'Desconocida';
    };

    const formatoMoneda = (valor) => {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    };

    const hayCambios = (detalle) => {
        if (pedidoStore.rolEnPedido === 'ORIGEN') {
            return cantidadesSolicitadas.value[detalle.detalle_id] !== undefined &&
                cantidadesSolicitadas.value[detalle.detalle_id] !== detalle.cantidad_solicitada;
        }
        if (pedidoStore.rolEnPedido === 'FABRICA') {
            return cantidadesConfirmadas.value[detalle.detalle_id] !== undefined &&
                cantidadesConfirmadas.value[detalle.detalle_id] !== detalle.cantidad_confirmada;
        }
        return false;
    };

    const guardarCambios = async (detalle) => {
        try {
            let cantidad;
            if (pedidoStore.rolEnPedido === 'ORIGEN') {
                cantidad = cantidadesSolicitadas.value[detalle.detalle_id];
            } else if (pedidoStore.rolEnPedido === 'FABRICA') {
                cantidad = cantidadesConfirmadas.value[detalle.detalle_id];
            }

            await pedidoStore.modificarCantidadProducto(props.pedido.pedido_id, detalle.detalle_id, cantidad);
            emit('estado-actualizado');
        } catch (error) {
            console.error('Error al guardar cambios:', error);
        }
    };

    const eliminarProducto = async (detalle) => {
        if (!confirm('¿Esta seguro que desea eliminar este producto?')) return;

        try {
            await pedidoStore.eliminarProducto(props.pedido.pedido_id, detalle.detalle_id);
            emit('estado-actualizado');
        } catch (error) {
            console.error('Error al eliminar producto:', error);
        }
    };

    const estaRecibido = (detalleId) => {
        return productosRecibidos.value.get(detalleId) || false;
    };

    const busquedaProducto = ref('');

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

    const marcarRecibido = async (detalle) => {
        if (!puedoModificarRecepcion.value) return;

        try {
            const nuevoEstado = !estaRecibido(detalle.detalle_id);
            await pedidoStore.marcarProductoRecibido(props.pedido.pedido_id, detalle.detalle_id, nuevoEstado);
            const newMap = new Map(productosRecibidos.value);
            newMap.set(detalle.detalle_id, nuevoEstado);
            productosRecibidos.value = newMap;
        } catch (error) {
            console.error('Error al marcar producto como recibido:', error);
        }
    };
    watch(mostrarSelectorProductos, (nuevoValor) => {
        if (nuevoValor) {
            cargarProductosDisponibles();
        }
    });
    onMounted(() => {
        const initialState = new Map();
        props.detalles.forEach(detalle => {
            initialState.set(detalle.detalle_id, detalle.recibido === 1);
        });
        productosRecibidos.value = initialState;
    });
>>>>>>> Stashed changes
</script>