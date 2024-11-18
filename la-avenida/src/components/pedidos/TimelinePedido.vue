<!-- components/pedidos/TimelinePedido.vue -->
<template>
    <div v-if="loading" class="flex justify-center items-center p-8">
        <span>Cargando...</span>
    </div>

    <div v-else-if="error" class="text-red-600 p-8">
        {{ error }}
    </div>

    <div v-else class="max-w-4xl mx-auto p-4">
        <!-- Información principal del pedido -->
        <div class="bg-white rounded-lg shadow-lg p-4 mb-6 grid md:grid-cols-2 gap-4">
            <div class="space-y-2">
                <div>
                    <span class="text-sm text-gray-500">Origen:</span>
                    <p class="font-medium">{{ pedido.sucursal_origen_nombre }}</p>
                </div>
                <div>
                    <span class="text-sm text-gray-500">Destino:</span>
                    <p class="font-medium">{{ pedido.sucursal_destino_nombre }}</p>
                </div>
            </div>
            <div class="space-y-2">
                <div>
                    <span class="text-sm text-gray-500">Fecha Pedido:</span>
                    <p class="font-medium">{{ formatoFechaCompleta(pedido.fecha_pedido) }}</p>
                </div>
                <div>
                    <span class="text-sm text-gray-500">Fecha Entrega:</span>
                    <p class="font-medium">{{ formatoFecha(pedido.fecha_entrega_requerida) }}</p>
                </div>
            </div>
        </div>

        <!-- Timeline de estados -->
        <div class="relative">
            <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

            <div class="space-y-6">
                <!-- Estado actual -->
                <div class="relative">
                    <div class="absolute -left-[2.85rem] mt-1.5">
                        <div :class="[
                            'w-5 h-5 rounded-full border-2 border-white shadow',
                            estadoClasses[pedido.estado]
                        ]"></div>
                    </div>
                    <div class="bg-white rounded-lg border p-4">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h4 class="font-medium">Estado Actual: {{ pedido.estado }}</h4>
                                <p class="text-sm text-gray-500">
                                    {{ formatoFechaCompleta(pedido.fecha_ultima_actualizacion || pedido.fecha_pedido) }}
                                </p>
                            </div>
                            <EstadoPedido :estado="pedido.estado" />
                        </div>

                        <!-- Mostrar información de cancelación si está cancelado -->
                        <div v-if="pedido.estado === 'CANCELADO'" class="mt-2 text-sm text-red-600">
                            <p><strong>Cancelado por:</strong> {{ pedido.cancelado_por }}</p>
                            <p><strong>Motivo:</strong> {{ pedido.motivo_cancelacion }}</p>
                            <p><strong>Fecha:</strong> {{ formatoFechaCompleta(pedido.fecha_cancelacion) }}</p>
                        </div>

                        <!-- Acciones disponibles según estado -->
                        <div v-if="accionesDisponibles.length > 0" class="mt-4 space-x-2">
                            <button v-for="accion in accionesDisponibles"
                                    :key="accion.tipo"
                                    @click="ejecutarAccion(accion.tipo)"
                                    :class="[
                                'px-4 py-2 rounded-lg text-white',
                                accion.clase
                            ]">
                                {{ accion.texto }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Detalles del pedido -->
                <div class="relative">
                    <div class="absolute -left-[2.85rem] mt-1.5">
                        <div class="w-5 h-5 rounded-full bg-gray-300 border-2 border-white shadow"></div>
                    </div>
                    <div class="bg-white rounded-lg border p-4">
                        <h4 class="font-medium mb-4">Detalles del Pedido</h4>

                        <!-- Productos agrupados por categoría -->
                        <div class="space-y-6">
                            <template v-for="(productosPorSubcategoria, categoria) in productosAgrupados" :key="categoria">
                                <div class="border rounded-lg overflow-hidden">
                                    <!-- Header de categoría -->
                                    <div class="bg-gray-50 px-4 py-2 font-medium text-gray-700">
                                        {{ categoria }}
                                    </div>

                                    <!-- Subcategorías -->
                                    <div v-for="(productos, subcategoria) in productosPorSubcategoria"
                                         :key="subcategoria"
                                         class="border-t">
                                        <!-- Header de subcategoría -->
                                        <div class="bg-gray-100/50 px-4 py-1.5 text-sm font-medium text-gray-600">
                                            {{ subcategoria }}
                                        </div>

                                        <!-- Tabla de productos -->
                                        <div class="overflow-x-auto">
                                            <table class="min-w-full divide-y divide-gray-200">
                                                <thead>
                                                    <tr>
                                                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                                                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                                                        <th v-if="esRolAdministrativo" class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                                                        <th v-if="esRolAdministrativo" class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody class="divide-y divide-gray-200">
                                                    <tr v-for="detalle in productos"
                                                        :key="detalle.detalle_id"
                                                        :class="{ 'bg-yellow-50': detalle.modificado }">
                                                        <td class="px-3 py-2 text-sm">
                                                            {{ detalle.producto_nombre }}
                                                            <span v-if="detalle.modificado"
                                                                  class="ml-2 text-xs text-orange-600">
                                                                (Modificado)
                                                            </span>
                                                        </td>
                                                        <td class="px-3 py-2 text-sm text-right whitespace-nowrap">
                                                            {{ detalle.cantidad_solicitada }}
                                                            <span v-if="detalle.cantidad_confirmada && detalle.cantidad_confirmada !== detalle.cantidad_solicitada"
                                                                  class="text-xs text-orange-600 ml-1">
                                                                ({{ detalle.cantidad_confirmada }} conf.)
                                                            </span>
                                                        </td>
                                                        <td v-if="esRolAdministrativo" class="px-3 py-2 text-sm text-right">
                                                            $ {{ formatoMoneda(detalle.precio_unitario) }}
                                                        </td>
                                                        <td v-if="esRolAdministrativo" class="px-3 py-2 text-sm text-right">
                                                            $ {{ formatoMoneda(detalle.cantidad_solicitada * detalle.precio_unitario) }}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                                <!-- Subtotal por subcategoría -->
                                                <tfoot v-if="esRolAdministrativo">
                                                    <tr class="bg-gray-50">
                                                        <td colspan="3" class="px-3 py-2 text-sm text-right font-medium">
                                                            Subtotal {{ subcategoria }}:
                                                        </td>
                                                        <td class="px-3 py-2 text-sm text-right font-medium">
                                                            $ {{ formatoMoneda(calcularSubtotalGrupo(productos)) }}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>

                                    <!-- Subtotal por categoría -->
                                    <div v-if="esRolAdministrativo" class="bg-gray-50 px-4 py-2 text-right">
                                        <span class="font-medium">
                                            Total {{ categoria }}: $ {{ formatoMoneda(calcularSubtotalCategoria(productosPorSubcategoria)) }}
                                        </span>
                                    </div>
                                </div>
                            </template>
                        </div>

                        <!-- Total general -->
                        <div v-if="esRolAdministrativo" class="mt-6 pt-4 border-t flex justify-end">
                            <div class="text-right">
                                <span class="text-lg font-medium">
                                    Total del Pedido: $ {{ formatoMoneda(calcularTotal()) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sistema de notas -->
                <div class="relative">
                    <div class="absolute -left-[2.85rem] mt-1.5">
                        <div class="w-5 h-5 rounded-full bg-gray-300 border-2 border-white shadow"></div>
                    </div>
                    <div class="bg-white rounded-lg border p-4">
                        <h4 class="font-medium mb-3">Notas</h4>

                        <!-- Historial de notas -->
                        <div v-if="notas.length > 0" class="space-y-4 mb-4">
                            <div v-for="nota in notas"
                                 :key="nota.nota_id"
                                 class="bg-gray-50 p-3 rounded">
                                <div class="flex justify-between text-sm text-gray-500 mb-1">
                                    <span>{{ formatoFechaCompleta(nota.fecha_creacion) }}</span>
                                    <span>{{ nota.sucursal_nombre }} - {{ nota.usuario_nombre }}</span>
                                </div>
                                <p>{{ nota.texto }}</p>
                            </div>
                        </div>
                        <div v-else class="text-gray-500 text-sm mb-4">
                            No hay notas en este pedido
                        </div>

                        <!-- Agregar nota -->
                        <div v-if="puedeAgregarNotas" class="mt-4">
                            <textarea v-model="nuevaNota"
                                      rows="3"
                                      class="w-full p-2 border rounded-lg resize-none focus:ring-2 focus:ring-emerald-500"
                                      placeholder="Agregar una nota..."></textarea>
                            <div class="flex justify-end mt-2">
                                <button @click="agregarNota"
                                        :disabled="!nuevaNota.trim()"
                                        class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                                    Agregar Nota
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de cancelación -->
        <Dialog :open="showCancelModal" @close="showCancelModal = false" class="relative z-50">
            <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div class="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel class="w-full max-w-md bg-white rounded-lg p-6">
                    <h3 class="text-lg font-medium mb-4">¿Está seguro que desea cancelar este pedido?</h3>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                            Motivo de cancelación
                        </label>
                        <textarea v-model="motivoCancelacion"
                                  rows="3"
                                  class="w-full p-2 border rounded-lg resize-none"
                                  required></textarea>
                    </div>
                    <div class="flex justify-end space-x-3">
                        <button @click="showCancelModal = false"
                                class="px-4 py-2 border rounded-lg hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button @click="confirmarCancelacion"
                                class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                            Confirmar Cancelación
                        </button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    </div>
</template>
<script setup>
    import { ref, computed, onMounted } from 'vue';
    import { Dialog, DialogPanel } from '@headlessui/vue';
    import { useAuthStore } from '@/stores/auth';
    import EstadoPedido from './EstadoPedido.vue';
    import axios from '@/utils/axios-config';
    import { jwtDecode } from 'jwt-decode'; 

    const props = defineProps({
        id: {
            type: Number,
            required: true
        }
    });
    const esRolAdministrativo = computed(() => {
        return ['ADMIN', 'DUEÑO'].includes(authStore.userRole);
    });

    const emit = defineEmits(['actualizar']);
    

    // Estados locales
    const pedido = ref(null);
    const loading = ref(true);
    const error = ref(null);
    const showCancelModal = ref(false);
    const motivoCancelacion = ref('');
    const notas = ref([]);
    const nuevaNota = ref('');
    const authStore = useAuthStore();

    // Clases para estados
    const estadoClasses = {
        'BORRADOR': 'bg-gray-400',
        'EN_FABRICA': 'bg-blue-400',
        'EN_FABRICA_MODIFICADO': 'bg-orange-400',
        'RECIBIDO': 'bg-green-400',
        'RECIBIDO_CON_DIFERENCIAS': 'bg-yellow-400',
        'FINALIZADO': 'bg-green-600',
        'CANCELADO': 'bg-red-400'
    };

    // Computed
    const accionesDisponibles = computed(() => {
        const acciones = [];
        if (!pedido.value) return acciones;

        const { estado } = pedido.value;
        const esFabrica = authStore.sucursalActual?.tipo === 'FABRICA_VENTA';
        const esSucursalDestino = authStore.sucursalActual?.sucursal_id === pedido.value.sucursal_destino;

        switch (estado) {
            case 'BORRADOR':
                acciones.push({
                    tipo: 'confirmar',
                    texto: 'Confirmar Pedido',
                    clase: 'bg-emerald-500 hover:bg-emerald-600'
                });
                break;
            case 'EN_FABRICA':
                if (esFabrica) {
                    acciones.push({
                        tipo: 'preparar',
                        texto: 'Marcar como Preparado',
                        clase: 'bg-emerald-500 hover:bg-emerald-600'
                    });
                }
                break;
            case 'RECIBIDO':
                if (esSucursalDestino) {
                    acciones.push({
                        tipo: 'confirmar_recepcion',
                        texto: 'Confirmar Recepción',
                        clase: 'bg-emerald-500 hover:bg-emerald-600'
                    });
                }
                break;
            case 'RECIBIDO_CON_DIFERENCIAS':
                if (esFabrica) {
                    acciones.push({
                        tipo: 'confirmar_diferencias',
                        texto: 'Confirmar Diferencias',
                        clase: 'bg-emerald-500 hover:bg-emerald-600'
                    });
                }
                break;
        }

        if (!['FINALIZADO', 'CANCELADO'].includes(estado)) {
            acciones.push({
                tipo: 'cancelar',
                texto: 'Cancelar Pedido',
                clase: 'bg-red-500 hover:bg-red-600'
            });
        }

        return acciones;
    });

    const puedeAgregarNotas = computed(() => {
        return pedido.value && !['FINALIZADO', 'CANCELADO'].includes(pedido.value.estado);
    });

    // Función para cargar notas
    const cargarNotas = async () => {
        try {
            const response = await axios.get(`/api/pedidos/${props.id}/notas`);
            notas.value = response.data;
        } catch (error) {
            console.error('Error al cargar notas:', error);
            notas.value = []; // En caso de error, inicializamos como array vacío
        }

    };
    // Métodos de formateo
    const formatoFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString('es-AR');
    };

    const formatoFechaCompleta = (fecha) => {
        return new Date(fecha).toLocaleString('es-AR');
    };

    const formatoMoneda = (valor) => {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    };

    // Cálculo del total
    const calcularTotal = () => {
        if (!pedido.value?.detalles) return 0;
        return pedido.value.detalles.reduce((total, detalle) => {
            return total + (detalle.cantidad_solicitada * detalle.precio_unitario);
        }, 0);
    };

    const productosAgrupados = computed(() => {
        if (!pedido.value?.detalles) return {};

        return pedido.value.detalles.reduce((grupos, detalle) => {
            const categoria = detalle.categoria_nombre;
            const subcategoria = detalle.subcategoria_nombre;

            if (!grupos[categoria]) {
                grupos[categoria] = {};
            }
            if (!grupos[categoria][subcategoria]) {
                grupos[categoria][subcategoria] = [];
            }

            grupos[categoria][subcategoria].push(detalle);
            return grupos;
        }, {});
    });
    const calcularSubtotalGrupo = (productos) => {
        return productos.reduce((total, detalle) => {
            return total + (detalle.cantidad_solicitada * detalle.precio_unitario);
        }, 0);
    };

    const calcularSubtotalCategoria = (subcategorias) => {
        return Object.values(subcategorias).reduce((total, productos) => {
            return total + calcularSubtotalGrupo(productos);
        }, 0);
    };

    // Función para cargar el pedido
    const cargarPedido = async () => {
        try {
            loading.value = true;
            const response = await axios.get(`/api/pedidos/${props.id}`);
            pedido.value = response.data;
        } catch (err) {
            error.value = 'Error al cargar el pedido';
            console.error('Error cargando pedido:', err);
        } finally {
            loading.value = false;
        }
    };

    const ejecutarAccion = async (tipo) => {
        switch (tipo) {
            case 'cancelar':
                showCancelModal.value = true;
                break;
            case 'confirmar':
                if (pedido.value.estado !== 'BORRADOR') {
                    throw new Error('Solo se pueden confirmar pedidos en estado borrador');
                }
                if (!pedido.value.detalles?.length) {
                    throw new Error('No se puede confirmar un pedido sin productos');
                }
                await cambiarEstado('EN_FABRICA');
                break;
            case 'preparar':
                await cambiarEstado('EN_FABRICA_MODIFICADO');
                break;
            case 'confirmar_recepcion':
                await cambiarEstado('FINALIZADO');
                break;
            case 'confirmar_diferencias':
                await cambiarEstado('FINALIZADO');
                break;
        }
    };

    const cambiarEstado = async (nuevoEstado) => {
        try {
            await axios.patch(`/api/pedidos/${props.id}/estado`, {
                estado: nuevoEstado
            });
            await cargarPedido();
        } catch (error) {
            console.error('Error al cambiar estado:', error);
        }
    };

    // Función para confirmar cancelación
    const confirmarCancelacion = async () => {
        if (!motivoCancelacion.value.trim()) {
            // Aquí podrías agregar una validación visual
            return;
        }

        try {
            await axios.patch(`/api/pedidos/${props.id}/estado`, {
                estado: 'CANCELADO',
                motivo: motivoCancelacion.value
            });

            showCancelModal.value = false;
            motivoCancelacion.value = '';
            await cargarPedido(); // Recargar el pedido para mostrar los cambios
        } catch (error) {
            console.error('Error al cancelar pedido:', error);
            // Aquí podrías agregar una notificación de error
        }
    };

    // Función para agregar nota
    const agregarNota = async () => {
        if (!nuevaNota.value.trim()) return;

        try {
            const response = await axios.post(`/api/pedidos/${props.id}/notas`, {
                texto: nuevaNota.value
            });

            // Agregar la nueva nota al principio del array
            notas.value.unshift(response.data.nota);
            nuevaNota.value = ''; // Limpiar el campo después de agregar
        } catch (error) {
            console.error('Error al agregar nota:', error);
            // Aquí podrías agregar alguna notificación de error para el usuario
        }
    };

    // Inicialización
    onMounted(async () => {
        await Promise.all([
            cargarPedido(),
            cargarNotas()
        ]);
    });
</script>