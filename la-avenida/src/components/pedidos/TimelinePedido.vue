
<template>
    <div class="p-4">
        <!-- Información principal del pedido -->
        <div class="mb-6 grid grid-cols-2 gap-4">
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
                    <p class="font-medium">{{ formatoFecha(pedido.fecha_pedido) }}</p>
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

            <div class="space-y-6 ml-12 relative">
                <!-- Estado actual -->
                <div class="relative">
                    <div class="absolute -left-[2.85rem] mt-1.5">
                        <div :class="{
                            'w-5 h-5 rounded-full border-2 border-white shadow': true,
                            'bg-gray-400': pedido.estado === 'BORRADOR',
                            'bg-blue-400': pedido.estado === 'EN_FABRICA',
                            'bg-orange-400': pedido.estado === 'PREPARADO_MODIFICADO',
                            'bg-yellow-400': pedido.estado === 'RECIBIDO_CON_DIFERENCIAS',
                            'bg-green-400': pedido.estado === 'RECIBIDO',
                            'bg-red-400': pedido.estado === 'CANCELADO'
                        }"></div>
                    </div>
                    <div class="bg-white rounded-lg border p-4">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h4 class="font-medium">Estado Actual: {{ pedido.estado }}</h4>
                                <p class="text-sm text-gray-500">
                                    {{ formatoFechaCompleta(pedido.fecha_pedido) }}
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
                        <div v-if="pedido.estado !== 'RECIBIDO' && pedido.estado !== 'CANCELADO'" class="mt-4 space-x-2">
                            <button v-if="pedido.estado === 'BORRADOR'"
                                    @click="confirmarPedido"
                                    class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                                Confirmar
                            </button>

                            <button v-if="['EN_FABRICA', 'PREPARADO_MODIFICADO'].includes(pedido.estado)"
                                    @click="marcarEntregado"
                                    class="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">
                                Marcar Entregado
                            </button>

                            <button v-if="pedido.estado !== 'BORRADOR'"
                                    @click="modificarPedido"
                                    class="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600">
                                Modificar
                            </button>

                            <!-- Botón de cancelación -->
                            <button v-if="puedeCancelar"
                                    @click="mostrarModalCancelacion"
                                    class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">
                                Cancelar Pedido
                            </button>
                        </div>
                    </div>
                </div>
                <!--  Solicitudes de modificación -->>
                <div v-if="pedido.tiene_solicitud_pendiente" class="relative">
                    <div class="absolute -left-[2.85rem] mt-1.5">
                        <div class="w-5 h-5 rounded-full bg-orange-400 border-2 border-white shadow"></div>
                    </div>
                    <div class="bg-white rounded-lg border border-orange-200 p-4">
                        <div class="flex justify-between items-start mb-2">
                            <h4 class="font-medium text-orange-800">Solicitud de Modificación Pendiente</h4>
                            <span class="text-sm text-gray-500">
                                {{ formatoFechaCompleta(solicitud?.fecha_solicitud) }}
                            </span>
                        </div>

                        <!-- Lista de cambios solicitados -->
                        <div class="mt-4 space-y-3">
                            <div v-for="cambio in solicitud?.cambios"
                                 :key="cambio.detalle_id"
                                 class="flex justify-between items-center p-2 bg-orange-50 rounded">
                                <div>
                                    <span class="font-medium">{{ cambio.producto_nombre }}</span>
                                    <div class="text-sm text-gray-600">
                                        Cantidad actual: {{ cambio.cantidad_anterior }} >
                                        <span class="text-orange-600 font-medium">
                                            {{ cambio.cantidad_nueva }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Notas de la solicitud -->
                        <div v-if="solicitud?.notas" class="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <p class="font-medium">Notas:</p>
                            <p>{{ solicitud.notas }}</p>
                        </div>

                        <!-- Acciones -->
                        <div v-if="puedeAprobarSolicitud" class="mt-4 flex justify-end space-x-3">
                            <button @click="responderSolicitud('RECHAZADA')"
                                    class="px-3 py-1.5 border border-red-300 text-red-600 text-sm rounded hover:bg-red-50">
                                Rechazar
                            </button>
                            <button @click="responderSolicitud('APROBADA')"
                                    class="px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600">
                                Aprobar Cambios
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
                        <h4 class="font-medium mb-3">Detalles del Pedido</h4>
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr>
                                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                                        <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
                                    <tr v-for="detalle in pedido.detalles" :key="detalle.detalle_id">
                                        <td class="px-3 py-2 text-sm">{{ detalle.producto_nombre }}</td>
                                        <td class="px-3 py-2 text-sm text-right">
                                            {{ detalle.cantidad_solicitada }}
                                            <span v-if="detalle.cantidad_confirmada && detalle.cantidad_confirmada !== detalle.cantidad_solicitada"
                                                  class="text-xs text-orange-600">
                                                ({{ detalle.cantidad_confirmada }} conf.)
                                            </span>
                                        </td>
                                        <td class="px-3 py-2 text-sm text-right">
                                            $ {{ formatoMoneda(detalle.precio_unitario) }}
                                        </td>
                                        <td class="px-3 py-2 text-sm text-right">
                                            $ {{ formatoMoneda(detalle.cantidad_solicitada * detalle.precio_unitario) }}
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colspan="3" class="px-3 py-2 text-right font-medium">Total:</td>
                                        <td class="px-3 py-2 text-right font-medium">
                                            $ {{ formatoMoneda(pedido.total) }}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Notas -->
                <div v-if="pedido.notas" class="relative">
                    <div class="absolute -left-[2.85rem] mt-1.5">
                        <div class="w-5 h-5 rounded-full bg-gray-300 border-2 border-white shadow"></div>
                    </div>
                    <div class="bg-white rounded-lg border p-4">
                        <h4 class="font-medium mb-2">Notas</h4>
                        <p class="text-sm text-gray-600">{{ pedido.notas }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de Cancelación -->
        <CancelacionModal :show="showCancelacionModal"
                          :pedido-id="pedido.pedido_id"
                          @close="showCancelacionModal = false"
                          @confirm="cancelarPedido" />
    </div>
</template>

<script setup>
    import { ref, computed } from 'vue'
    import EstadoPedido from './EstadoPedido.vue'
    import CancelacionModal from './CancelacionModal.vue'
    import axios from 'axios'

    const props = defineProps({
        pedido: {
            type: Object,
            required: true
        }
    })

    const emit = defineEmits(['estadoActualizado'])
    const showCancelacionModal = ref(false)

    const puedeCancelar = computed(() => {
        return ['EN_FABRICA', 'PREPARADO_MODIFICADO', 'RECIBIDO_CON_DIFERENCIAS'].includes(props.pedido.estado)
    })

    const formatoFecha = (fecha) => {
        return new Date(fecha).toLocaleDateString('es-AR')
    }

    const formatoFechaCompleta = (fecha) => {
        return new Date(fecha).toLocaleString('es-AR')
    }

    const formatoMoneda = (valor) => {
        return valor.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    }

    const confirmarPedido = async () => {
        try {
            await axios.patch(
                `http://localhost:3000/api/pedidos/${props.pedido.pedido_id}/estado`,
                {
                    estado: 'EN_FABRICA',
                    detalles: props.pedido.detalles
                },
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            )
            emit('estadoActualizado')
        } catch (error) {
            console.error('Error al confirmar pedido:', error)
        }
    }

    const marcarEntregado = async () => {
        try {
            await axios.patch(
                `http://localhost:3000/api/pedidos/${props.pedido.pedido_id}/estado`,
                {
                    estado: 'RECIBIDO',
                    detalles: props.pedido.detalles
                },
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            )
            emit('estadoActualizado')
        } catch (error) {
            console.error('Error al marcar como entregado:', error)
        }
    }

    const modificarPedido = async () => {
        try {
            await axios.patch(
                `http://localhost:3000/api/pedidos/${props.pedido.pedido_id}/estado`,
                {
                    estado: 'PREPARADO_MODIFICADO',
                    detalles: props.pedido.detalles
                },
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            )
            emit('estadoActualizado')
        } catch (error) {
            console.error('Error al modificar pedido:', error)
        }
    }

    // Agregar al setup
    const solicitud = ref(null)
    const puedeAprobarSolicitud = computed(() => {
        // Aquí puedes agregar lógica adicional según roles si es necesario
        return ['EN_FABRICA', 'PREPARADO_MODIFICADO'].includes(props.pedido.estado)
    })

    // Agregar método para cargar la solicitud
    const cargarSolicitud = async () => {
        try {
            const response = await axios.get(
                `http://localhost:3000/api/pedidos/${props.pedido.pedido_id}/solicitudes`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            )
            // Tomamos la primera solicitud pendiente si existe
            solicitud.value = response.data.find(s => s.estado === 'PENDIENTE')
        } catch (error) {
            console.error('Error cargando solicitud:', error)
        }
    }

    // Agregar método para responder a la solicitud
    const responderSolicitud = async (estado) => {
        try {
            await axios.patch(
                `http://localhost:3000/api/pedidos/${props.pedido.pedido_id}/solicitudes/${solicitud.value.solicitud_id}`,
                {
                    estado,
                    notas_respuesta: estado === 'RECHAZADA' ? 'Solicitud rechazada' : 'Cambios aprobados'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            )
            emit('estadoActualizado')
        } catch (error) {
            console.error('Error respondiendo solicitud:', error)
        }
    }


    const mostrarModalCancelacion = () => {
        showCancelacionModal.value = true
    }

    const cancelarPedido = async ({ motivo }) => {
        try {
            await axios.patch(
                `http://localhost:3000/api/pedidos/${props.pedido.pedido_id}/estado`,
                {
                    estado: 'CANCELADO',
                    motivo
                },
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            )
            emit('estadoActualizado')
        } catch (error) {
            console.error('Error al cancelar pedido:', error)
        }
    }
    onMounted(async () => {
        if (props.pedido.tiene_solicitud_pendiente) {
            await cargarSolicitud()
        }
    })
</script>
