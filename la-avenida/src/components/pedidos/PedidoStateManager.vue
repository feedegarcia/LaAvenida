<template>
    <div class="space-y-4">
        <!-- Estado actual y botones de transición -->
        <div class="bg-white p-4 rounded-lg shadow">
            <div class="flex justify-between items-center mb-4">
                <div>
                    <h3 class="font-semibold text-lg">Estado actual: {{ pedido.estado }}</h3>
                    <p class="text-sm text-gray-600">Última actualización: {{ formatDate(pedido.updated_at) }}</p>
                </div>
                <EstadoPedido :estado="pedido.estado" />
            </div>

            <!-- Botones de transición según estado -->
            <div v-if="puedeModificarEstado" class="flex space-x-3">
                <!-- Fabrica: EN_FABRICA -> PREPARADO_MODIFICADO -->
                <button v-if="pedido.estado === 'EN_FABRICA' && esUsuarioFabrica"
                        @click="cambiarEstado('PREPARADO_MODIFICADO')"
                        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Marcar como Preparado
                </button>

                <!-- Destino: PREPARADO_MODIFICADO -> RECIBIDO_CON_DIFERENCIAS -->
                <button v-if="pedido.estado === 'PREPARADO_MODIFICADO' && esUsuarioDestino"
                        @click="reportarDiferencias"
                        class="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
                    Reportar Diferencias
                </button>

                <!-- Destino: PREPARADO_MODIFICADO -> RECIBIDO -->
                <button v-if="pedido.estado === 'PREPARADO_MODIFICADO' && esUsuarioDestino"
                        @click="confirmarRecepcion"
                        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                    Confirmar Recepción
                </button>

                <!-- Fabrica: RECIBIDO_CON_DIFERENCIAS -> RECIBIDO -->
                <button v-if="pedido.estado === 'RECIBIDO_CON_DIFERENCIAS' && esUsuarioFabrica"
                        @click="confirmarDiferencias"
                        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                    Confirmar Diferencias
                </button>

                <!-- Botón de cancelación para admin -->
                <button v-if="puedeSerCancelado && esAdmin"
                        @click="mostrarDialogoCancelacion"
                        class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                    Cancelar Pedido
                </button>
            </div>
        </div>

        <!-- Tabla de productos -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad Original</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad Actual</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                        <th v-if="puedeModificarCantidades" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    <tr v-for="detalle in pedido.detalles"
                        :key="detalle.detalle_id"
                        :class="{
                'bg-yellow-50': fueModificado(detalle),
                'hover:bg-yellow-100': fueModificado(detalle),
                'hover:bg-gray-50': !fueModificado(detalle)
              }">
                        <td class="px-6 py-4">
                            {{ detalle.producto_nombre }}
                            <span v-if="fueModificado(detalle)"
                                  class="ml-2 inline-block w-2 h-2 bg-yellow-400 rounded-full"
                                  title="Cantidad modificada"></span>
                        </td>
                        <td class="px-6 py-4 text-right">{{ detalle.cantidad_solicitada }}</td>
                        <td class="px-6 py-4 text-right">
                            <template v-if="puedeModificarCantidades">
                                <input type="number"
                                       v-model.number="cantidadesModificadas[detalle.detalle_id]"
                                       min="0"
                                       class="w-20 text-right border rounded px-2 py-1">
                            </template>
                            <template v-else>
                                {{ detalle.cantidad_confirmada || detalle.cantidad_solicitada }}
                            </template>
                        </td>
                        <td class="px-6 py-4 text-right">{{ formatPrice(detalle.precio_unitario) }}</td>
                        <td class="px-6 py-4 text-right">
                            {{ formatPrice(calcularSubtotal(detalle)) }}
                        </td>
                        <td v-if="puedeModificarCantidades" class="px-6 py-4 text-right">
                            <button v-if="cantidadFueModificada(detalle)"
                                    @click="revertirCambios(detalle)"
                                    class="text-gray-600 hover:text-gray-900">
                                Revertir
                            </button>
                        </td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr class="bg-gray-50">
                        <td colspan="4" class="px-6 py-4 text-right font-medium">Total:</td>
                        <td class="px-6 py-4 text-right font-medium">{{ formatPrice(calcularTotal()) }}</td>
                        <td v-if="puedeModificarCantidades"></td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <!-- Botones de acción para modificaciones -->
        <div v-if="puedeModificarCantidades && hayCambiosPendientes" class="flex justify-end space-x-3">
            <button @click="cancelarModificaciones"
                    class="px-4 py-2 border rounded hover:bg-gray-50">
                Cancelar Cambios
            </button>
            <button @click="guardarModificaciones"
                    class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Guardar Cambios
            </button>
        </div>

        <!-- Notas -->
        <div v-if="pedido.notas || hayCambiosPendientes" class="bg-white p-4 rounded-lg shadow">
            <h4 class="font-medium mb-2">Notas</h4>
            <div v-if="pedido.notas" class="mb-4 text-gray-600">
                {{ pedido.notas }}
            </div>
            <textarea v-if="hayCambiosPendientes"
                      v-model="notasModificacion"
                      rows="3"
                      placeholder="Explique los cambios realizados..."
                      class="w-full border rounded-md p-2"
                      required></textarea>
        </div>

        <!-- Modal de Cancelación -->
        <Dialog v-if="mostrarCancelacion"
                @close="mostrarCancelacion = false"
                class="relative z-50">
            <div class="fixed inset-0 bg-black/30" />
            <div class="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel class="w-full max-w-md bg-white rounded-lg p-6">
                    <h3 class="text-lg font-medium mb-4">Cancelar Pedido</h3>
                    <textarea v-model="motivoCancelacion"
                              rows="3"
                              placeholder="Ingrese el motivo de la cancelación..."
                              class="w-full border rounded-md p-2 mb-4"
                              required></textarea>
                    <div class="flex justify-end space-x-3">
                        <button @click="mostrarCancelacion = false"
                                class="px-4 py-2 border rounded hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button @click="confirmarCancelacion"
                                class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                            Confirmar Cancelación
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
    import { jwtDecode } from 'jwt-decode';
    import EstadoPedido from './EstadoPedido.vue';
    import axios from '@/utils/axios-config';

    const props = defineProps({
        pedido: {
            type: Object,
            required: true
        }
    });

    const emit = defineEmits(['actualizado']);

    // Estado local
    const cantidadesModificadas = ref({});
    const notasModificacion = ref('');
    const mostrarCancelacion = ref(false);
    const motivoCancelacion = ref('');

    // Computed properties para permisos
    const usuarioActual = computed(() => {
        const token = localStorage.getItem('token');
        return token ? jwtDecode(token) : null;
    });

    const esAdmin = computed(() =>
        ['ADMIN', 'DUEÑO'].includes(usuarioActual.value?.rol)
    );

    const esUsuarioFabrica = computed(() =>
        props.pedido.sucursal_origen === usuarioActual.value?.sucursal_id
    );

    const esUsuarioDestino = computed(() =>
        props.pedido.sucursal_destino === usuarioActual.value?.sucursal_id
    );

    const puedeModificarEstado = computed(() =>
        esAdmin.value || esUsuarioFabrica.value || esUsuarioDestino.value
    );

    const puedeModificarCantidades = computed(() => {
        if (!puedeModificarEstado.value) return false;

        const estado = props.pedido.estado;
        return (estado === 'EN_FABRICA' && esUsuarioFabrica.value) ||
            (estado === 'PREPARADO_MODIFICADO' && esUsuarioDestino.value);
    });

    const puedeSerCancelado = computed(() => {
        const estado = props.pedido.estado;
        return esAdmin.value &&
            ['RECIBIDO', 'RECIBIDO_CON_DIFERENCIAS'].includes(estado);
    });

    // Helpers
    const formatDate = (date) => {
        return new Date(date).toLocaleString('es-AR');
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(price);
    };

    const fueModificado = (detalle) => {
        return detalle.cantidad_confirmada !== null &&
            detalle.cantidad_confirmada !== detalle.cantidad_solicitada;
    };

    const cantidadFueModificada = (detalle) => {
        const cantidadModificada = cantidadesModificadas.value[detalle.detalle_id];
        return cantidadModificada !== undefined &&
            cantidadModificada !== detalle.cantidad_solicitada;
    };

    const calcularSubtotal = (detalle) => {
        const cantidad = cantidadesModificadas.value[detalle.detalle_id] ||
            detalle.cantidad_confirmada ||
            detalle.cantidad_solicitada;
        return cantidad * detalle.precio_unitario;
    };

    const calcularTotal = () => {
        return props.pedido.detalles.reduce((total, detalle) =>
            total + calcularSubtotal(detalle), 0
        );
    };

    const hayCambiosPendientes = computed(() => {
        return Object.keys(cantidadesModificadas.value).length > 0;
    });

    // Métodos de acción
    const cambiarEstado = async (nuevoEstado) => {
        try {
            await axios.patch(`/api/pedidos/${props.pedido.pedido_id}/estado`, {
                estado: nuevoEstado,
                detalles: props.pedido.detalles
            });
            emit('actualizado');
        } catch (error) {
            console.error('Error al cambiar estado:', error);
        }
    };

    const guardarModificaciones = async () => {
        if (!notasModificacion.value) {
            alert('Por favor, ingrese una nota explicando los cambios');
            return;
        }

        try {
            const detallesModificados = props.pedido.detalles
                .filter(d => cantidadesModificadas.value[d.detalle_id] !== undefined)
                .map(d => ({
                    detalle_id: d.detalle_id,
                    cantidad_anterior: d.cantidad_solicitada,
                    cantidad_nueva: cantidadesModificadas.value[d.detalle_id]
                }));

            await axios.patch(`/api/pedidos/${props.pedido.pedido_id}/estado`, {
                estado: 'PREPARADO_MODIFICADO',
                detalles: detallesModificados,
                notas: notasModificacion.value
            });

            cantidadesModificadas.value = {};
            notasModificacion.value = '';
            emit('actualizado');
        } catch (error) {
            console.error('Error al guardar modificaciones:', error);
        }
    };

    const reportarDiferencias = async () => {
        if (!hayCambiosPendientes.value) {
            alert('Debe modificar las cantidades antes de reportar diferencias');
            return;
        }

        if (!notasModificacion.value) {
            alert('Por favor, ingrese una nota explicando las diferencias');
            return;
        }

        try {
            const detallesModificados = props.pedido.detalles
                .filter(d => cantidadesModificadas.value[d.detalle_id] !== undefined)
                .map(d => ({
                    detalle_id: d.detalle_id,
                    cantidad_anterior: d.cantidad_solicitada,
                    cantidad_nueva: cantidadesModificadas.value[d.detalle_id]
                }));

            await axios.patch(`/api/pedidos/${props.pedido.pedido_id}/estado`, {
                estado: 'RECIBIDO_CON_DIFERENCIAS',
                detalles: detallesModificados,
                notas: notasModificacion.value
            });

            cantidadesModificadas.value = {};
            notasModificacion.value = '';
            emit('actualizado');
        } catch (error) {
            console.error('Error al reportar diferencias:', error);
        }
    };

    const confirmarRecepcion = async () => {
        try {
            await axios.patch(`/api/pedidos/${props.pedido.pedido_id}/estado`, {
                estado: 'RECIBIDO'
            });
            emit('actualizado');
        } catch (error) {
            console.error('Error al confirmar recepción:', error);
        }
    };

    const confirmarDiferencias = async () => {
        try {
            await axios.patch(`/api/pedidos/${props.pedido.pedido_id}/estado`, {
                estado: 'RECIBIDO'
            });
            emit('actualizado');
        } catch (error) {
            console.error('Error al confirmar diferencias:', error);
        }
    };

    const mostrarDialogoCancelacion = () => {
        mostrarCancelacion.value = true;
    };

    const confirmarCancelacion = async () => {
        if (!motivoCancelacion.value) {
            alert('Por favor, ingrese el motivo de la cancelación');
            return;
        }

        try {
            await axios.patch(`/api/pedidos/${props.pedido.pedido_id}/estado`, {
                estado: 'CANCELADO',
                motivo: motivoCancelacion.value
            });
            mostrarCancelacion.value = false;
            emit('actualizado');
        } catch (error) {
            console.error('Error al cancelar pedido:', error);
        }
    };

    const cancelarModificaciones = () => {
        cantidadesModificadas.value = {};
        notasModificacion.value = '';
    };

    const revertirCambios = (detalle) => {
        delete cantidadesModificadas.value[detalle.detalle_id];
    };
</script>