<template>
    <div class="space-y-4">
        <!-- Estado actual y encabezado -->
        <div class="bg-white p-4 rounded-lg shadow">
            <div class="flex justify-between items-center mb-4">
                <div>
                    <div class="flex gap-2 items-center">
                        <h3 class="text-lg font-semibold">Estado actual: {{ pedidoStore.obtenerEtiquetaEstado(pedido.estado) }}</h3>
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

                <!-- Botones de cambio de estado (solo si no es la sucursal origen o es admin) -->
                <div v-if="!esSucursalOrigen || authStore.userRole === 'ADMIN'" class="flex gap-2">
                    <button v-for="boton in botonesAccion"
                            :key="boton.estado"
                            @click="cambiarEstado(boton.estado)"
                            :class="[
                                'px-4 py-2 text-white rounded hover:opacity-90 transition-opacity',
                                `bg-${pedidoStore.obtenerColorEstado(boton.estado)}-500`
                            ]">
                        {{ boton.label }}
                    </button>

                    <!-- Botón de cancelar -->
                    <button v-if="pedidoStore.puedeCancelarPedido(pedido, authStore.user)"
                            @click="cambiarEstado('CANCELADO')"
                            class="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700">
                        Cancelar Pedido
                    </button>
                </div>
            </div>
        </div>

        <!-- Tabla de productos -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Producto
                        </th>
                        <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Cantidad Original
                        </th>
                        <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Cantidad Actual
                        </th>
                        <th v-if="puedeModificar" scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Nueva Cantidad
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    <tr v-for="detalle in pedido.detalles"
                        :key="detalle.detalle_id"
                        :style="getEstiloFila(detalle)">
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <span class="font-medium">{{ detalle.producto_nombre }}</span>
                                <!-- Indicador de modificación -->
                                <span v-if="detalle.modificado_por"
                                      class="ml-2 text-xs"
                                      :style="{ color: detalle.modificado_por.color }">
                                    Modificado por {{ detalle.modificado_por.nombre }}
                                </span>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-right">{{ detalle.cantidad_solicitada }}</td>
                        <td class="px-6 py-4 text-right">
                            {{ detalle.cantidad_confirmada || detalle.cantidad_solicitada }}
                        </td>
                        <td v-if="puedeModificar" class="px-6 py-4">
                            <div class="flex items-center justify-end gap-2">
                                <input type="number"
                                       :value="cantidades[detalle.detalle_id] ?? cantidadActual(detalle)"
                                       @input="handleCantidadChange(detalle, $event)"
                                       min="0"
                                       class="w-20 px-2 py-1 border rounded text-right">
                                <div class="flex gap-1">
                                    <button @click="incrementarCantidad(detalle, 1)"
                                            class="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">
                                        +
                                    </button>
                                    <button @click="incrementarCantidad(detalle, -1)"
                                            class="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">
                                        -
                                    </button>
                                </div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Notas para los cambios (solo se muestra si hay modificaciones) -->
        <div v-if="tieneModificaciones" class="bg-white p-4 rounded-lg shadow">
            <label class="block text-sm font-medium text-gray-700 mb-2">
                Notas sobre los cambios
            </label>
            <textarea v-model="notasModificacion"
                      required
                      rows="3"
                      class="w-full border rounded-md p-2"
                      placeholder="Explique el motivo de los cambios realizados..."></textarea>

            <!-- Botón para confirmar cambios -->
            <div class="mt-4 flex justify-end">
                <button @click="confirmarCambios"
                        :disabled="!notasModificacion.trim()"
                        class="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:opacity-50">
                    Confirmar Cambios
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed } from 'vue';
    import { useAuthStore } from '@/stores/auth';
    import { usePedidoStore } from '@/stores/pedidoStateMachine';
    import axios from '@/utils/axios-config';

    const props = defineProps({
        pedido: {
            type: Object,
            required: true
        }
    });

    const emit = defineEmits(['update:pedido']);
    const authStore = useAuthStore();
    const pedidoStore = usePedidoStore();

    const cantidades = ref({});
    const notasModificacion = ref('');

    // Computed
    const puedeModificar = computed(() => {
        return pedidoStore.puedeModificarPedido(props.pedido, authStore.user);
    });

    const esSucursalOrigen = computed(() => {
        return authStore.user.sucursales.some(s => s.id === props.pedido.sucursal_origen);
    });

    const tieneModificaciones = computed(() => {
        return Object.keys(cantidades.value).length > 0;
    });

    const botonesAccion = computed(() => {
        return pedidoStore.obtenerAccionesPermitidas(props.pedido.estado, authStore.user.rol)
            .map(estado => ({
                estado,
                label: pedidoStore.obtenerEtiquetaEstado(estado)
            }));
    });

    // Methods
    const getEstiloFila = (detalle) => {
        if (detalle.modificado_por) {
            return {
                borderLeft: `4px solid ${detalle.modificado_por.color}`,
                backgroundColor: `${detalle.modificado_por.color}10`
            };
        }
        return {};
    };

    const cantidadActual = (detalle) => {
        return detalle.cantidad_confirmada || detalle.cantidad_solicitada;
    };

    const handleCantidadChange = (detalle, event) => {
        const cantidad = parseInt(event.target.value) || 0;
        if (cantidad === cantidadActual(detalle)) {
            delete cantidades.value[detalle.detalle_id];
        } else {
            cantidades.value[detalle.detalle_id] = cantidad;
        }
    };

    const incrementarCantidad = (detalle, delta) => {
        const actual = cantidades.value[detalle.detalle_id] ?? cantidadActual(detalle);
        handleCantidadChange(detalle, { target: { value: Math.max(0, actual + delta) } });
    };

    const confirmarCambios = async () => {
        if (!notasModificacion.value.trim()) return;

        try {
            const cambios = {
                detalles: Object.entries(cantidades.value).map(([detalle_id, cantidad]) => ({
                    detalle_id: parseInt(detalle_id),
                    cantidad_anterior: props.pedido.detalles.find(d => d.detalle_id === parseInt(detalle_id))
                        .cantidad_solicitada,
                    cantidad_nueva: cantidad
                })),
                notas: notasModificacion.value,
                estado: esSucursalOrigen.value ? props.pedido.estado : 'EN_FABRICA_MODIFICADO'
            };

            await axios.patch(`/api/pedidos/${props.pedido.pedido_id}/estado`, cambios);

            // Limpiar estado local
            cantidades.value = {};
            notasModificacion.value = '';

            // Recargar pedido
            const response = await axios.get(`/api/pedidos/${props.pedido.pedido_id}`);
            emit('update:pedido', response.data);
        } catch (error) {
            console.error('Error al guardar cambios:', error);
        }
    };

    const cambiarEstado = async (nuevoEstado) => {
        try {
            await axios.patch(`/api/pedidos/${props.pedido.pedido_id}/estado`, {
                estado: nuevoEstado
            });

            // Recargar pedido
            const response = await axios.get(`/api/pedidos/${props.pedido.pedido_id}`);
            emit('update:pedido', response.data);
        } catch (error) {
            console.error('Error al cambiar estado:', error);
        }
    };

    const formatearFecha = (fecha) => {
        if (!fecha) return 'Sin actualización';
        return new Date(fecha).toLocaleString('es-AR');
    };
</script>