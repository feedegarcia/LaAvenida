<template>
    <div class="space-y-4">
        <!-- Estado actual -->
        <div class="bg-white p-4 rounded-lg shadow">
            <div class="flex justify-between items-center mb-4">
                <div>
                    <div class="flex gap-2 items-center">
                        <h3 class="text-lg font-semibold">Estado actual: {{ pedido.estado }}</h3>
                        <span :class="[
                            'px-2 py-1 rounded-full text-sm',
                            pedido.estado === 'FINALIZADO' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        ]">
                            {{ estadoLabel }}
                        </span>
                    </div>
                    <p class="text-sm text-gray-600">
                        �ltima actualizaci�n: {{ formatearFecha(pedido.updated_at) }}
                    </p>
                </div>
            </div>

            <!-- Botones de acci�n seg�n estado -->
            <div v-if="mostrarBotones && botonesAccion.length > 0" class="flex gap-2">
                <button v-for="boton in botonesAccion"
                        :key="boton.estado"
                        @click="cambiarEstado(boton.estado)"
                        :disabled="boton.requiereNotas && tieneModificaciones && !notasModificacion"
                        :class="[
                            'px-4 py-2 text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50',
                            boton.class
                        ]">
                    {{ boton.label }}
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
                        <th v-if="puedeVerCostos" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Precio Unit.
                        </th>
                        <th v-if="puedeVerCostos" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Subtotal
                        </th>
                        <th v-if="puedeEditarCantidades" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Nueva Cantidad
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    <tr v-for="detalle in pedido.detalles"
                        :key="detalle.detalle_id"
                        :class="{ 'bg-yellow-50': detalle.modificado }">
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <span class="font-medium">{{ detalle.producto_nombre }}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-right">{{ detalle.cantidad_solicitada }}</td>
                        <td class="px-6 py-4 text-right">
                            {{ detalle.cantidad_confirmada || detalle.cantidad_solicitada }}
                        </td>
                        <td v-if="puedeVerCostos" class="px-6 py-4 text-right">
                            $ {{ formatearMoneda(detalle.precio_unitario) }}
                        </td>
                        <td v-if="puedeVerCostos" class="px-6 py-4 text-right">
                            $ {{ formatearMoneda(detalle.precio_unitario * cantidadActual(detalle)) }}
                        </td>
                        <td v-if="puedeModificarPedido" class="px-6 py-4 text-right">
                            <div class="flex items-center justify-end gap-2">
                                <input type="number"
                                       :value="cantidades[detalle.detalle_id] ?? detalle.cantidad_solicitada"
                                       min="0"
                                       class="w-20 px-2 py-1 border rounded text-right"
                                       @input="handleCantidadChange(detalle, $event)">
                                <button @click="incrementarCantidad(detalle, 1)"
                                        class="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">
                                    +
                                </button>
                                <button @click="incrementarCantidad(detalle, -1)"
                                        class="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">
                                    -
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
                <tfoot v-if="puedeVerCostos">
                    <tr class="bg-gray-50">
                        <td colspan="4" class="px-6 py-4 text-right font-medium">Total:</td>
                        <td class="px-6 py-4 text-right font-medium">
                            $ {{ formatearMoneda(totalPedido) }}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <!-- Notas para cambios -->
        <div v-if="tieneModificaciones" class="bg-white p-4 rounded-lg shadow">
            <label class="block text-sm font-medium text-gray-700 mb-2">
                Notas sobre los cambios
            </label>
            <textarea v-model="notasModificacion"
                      required
                      rows="3"
                      class="w-full border rounded-md p-2"
                      placeholder="Explique el motivo de los cambios realizados..."></textarea>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed } from 'vue';

    const props = defineProps({
        pedido: {
            type: Object,
            required: true
        },
        userRole: {
            type: String,
            required: true
        },
        userSucursales: {
            type: Array,
            required: true,
            default: () => []
        }
    });

    const emit = defineEmits(['state-change']);

    // Estado local
    const cantidades = ref({});
    const notasModificacion = ref('');

    const mostrarBotones = computed(() => {
        // No mostrar botones si el pedido est� finalizado o cancelado
        return !['FINALIZADO', 'CANCELADO'].includes(props.pedido.estado);
    });

    // Computed properties base
    const soyOrigen = computed(() =>
        props.userSucursales.some(s => s.id === props.pedido.sucursal_origen)
    );

    const soyDestino = computed(() =>
        props.userSucursales.some(s => s.id === props.pedido.sucursal_destino)
    );

    const soyFabrica = computed(() => {
        console.log('Verificando si soy f�brica:', {
            userSucursales: props.userSucursales,
            pedidoOrigen: props.pedido.sucursal_origen,
            pedidoDestino: props.pedido.sucursal_destino
        });

        // En este caso, la f�brica es el destino si el pedido est� EN_FABRICA
        if (props.pedido.estado === 'EN_FABRICA') {
            return props.userSucursales.some(s => s.id === props.pedido.sucursal_destino);
        }

        // Para otros estados, la f�brica es el origen
        return props.userSucursales.some(s => s.id === props.pedido.sucursal_origen);
    });

    // Permisos
    const puedeModificarPedido = computed(() => {
        if (!props.pedido) return false;

        console.log('Verificando permisos para:', {
            estado: props.pedido.estado,
            userSucursales: props.userSucursales,
            pedidoOrigen: props.pedido.sucursal_origen,
            pedidoDestino: props.pedido.sucursal_destino
        });

        // Verificar si el usuario tiene la sucursal donde est� el pedido
        const pedidoEnMisSucursales = props.userSucursales.some(sucursal =>
            sucursal.id === props.pedido.sucursal_destino ||
            sucursal.id === props.pedido.sucursal_origen
        );

        console.log('�Pedido en mis sucursales?', pedidoEnMisSucursales);
        return pedidoEnMisSucursales;
    });

    const puedeVerCostos = computed(() => {
        return ['ADMIN', 'DUE�O'].includes(props.userRole);
    });

    // Estados y modificaciones
    const tieneModificaciones = computed(() => {
        return Object.keys(cantidades.value).length > 0;
    });

    const estadoLabel = computed(() => {
        const labels = {
            'EN_FABRICA': 'En F�brica',
            'PREPARADO': 'Preparado',
            'RECIBIDO': 'Recibido',
            'CANCELADO': 'Cancelado',
            'EN_FABRICA_MODIFICADO': 'Modificado en F�brica',
            'RECIBIDO_CON_DIFERENCIAS': 'Con Diferencias',
            'PREPARADO_MODIFICADO': 'Preparado con Cambios',
            'FINALIZADO': 'Finalizado'
        };
        return labels[props.pedido.estado] || props.pedido.estado;
    });

    // Botones de acci�n
    const botonesAccion = computed(() => {
        // Primero verificamos si tenemos permisos
        if (!puedeModificarPedido.value) {
            console.log('Usuario no tiene permisos para modificar');
            return [];
        }

        console.log('Calculando botones para:', {
            estado: props.pedido.estado,
            soyOrigen: soyOrigen.value,
            soyDestino: soyDestino.value,
            soyFabrica: soyFabrica.value
        });

        const botones = [];

        switch (props.pedido.estado) {
            case 'EN_FABRICA':
                // Si soy la f�brica (destino en este estado)
                if (soyDestino.value) {
                    botones.push({
                        estado: tieneModificaciones.value ? 'EN_FABRICA_MODIFICADO' : 'PREPARADO',
                        label: tieneModificaciones.value ? 'Enviar con modificaciones' : 'Enviar pedido',
                        class: 'bg-blue-500'
                    });
                }
                break;

            case 'EN_FABRICA_MODIFICADO':
                // Si soy quien origin� el pedido
                if (soyOrigen.value) {
                    botones.push(
                        {
                            estado: 'RECIBIDO',
                            label: 'Aceptar cambios',
                            class: 'bg-green-500'
                        },
                        {
                            estado: 'RECIBIDO_CON_DIFERENCIAS',
                            label: 'Reportar diferencias',
                            class: 'bg-yellow-500',
                            requiereNotas: true
                        }
                    );
                }
                break;

            case 'PREPARADO':
                // Si soy quien origin� el pedido
                if (soyOrigen.value) {
                    botones.push(
                        {
                            estado: 'RECIBIDO',
                            label: 'Confirmar recepci�n',
                            class: 'bg-green-500'
                        }
                    );
                }
                break;

            case 'RECIBIDO_CON_DIFERENCIAS':
                // Si soy la f�brica (destino)
                if (soyDestino.value) {
                    botones.push(
                        {
                            estado: 'RECIBIDO',
                            label: 'Confirmar diferencias',
                            class: 'bg-green-500'
                        },
                        {
                            estado: 'PREPARADO_MODIFICADO',
                            label: 'Rechazar diferencias',
                            class: 'bg-red-500'
                        }
                    );
                }
                break;

            case 'RECIBIDO':
                // Si soy quien origin� el pedido
                if (soyOrigen.value) {
                    botones.push({
                        estado: 'FINALIZADO',
                        label: 'Finalizar pedido',
                        class: 'bg-green-600'
                    });
                }
                break;
        }

        console.log('Botones generados:', botones);
        return botones;
    });

    const puedeEditarCantidades = computed(() => {
        // No permitir edici�n si est� finalizado
        if (props.pedido.estado === 'FINALIZADO') return false;

        return puedeModificarPedido.value;
    });

    const totalPedido = computed(() => {
        return props.pedido.detalles.reduce((total, detalle) => {
            return total + (detalle.precio_unitario * cantidadActual(detalle));
        }, 0);
    });

    // M�todos
    const formatearFecha = (fecha) => {
        if (!fecha) return 'Sin actualizaci�n';
        return new Date(fecha).toLocaleString('es-AR');
    };

    const formatearMoneda = (valor) => {
        return valor.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const cantidadActual = (detalle) => {
        return cantidades.value[detalle.detalle_id] ??
            (detalle.cantidad_confirmada || detalle.cantidad_solicitada);
    };

    const handleCantidadChange = (detalle, event) => {
        const cantidad = parseInt(event.target.value) || 0;
        if (cantidad === detalle.cantidad_solicitada) {
            delete cantidades.value[detalle.detalle_id];
        } else {
            cantidades.value[detalle.detalle_id] = cantidad;
        }
    };

    const incrementarCantidad = (detalle, delta) => {
        const cantidadActualValue = cantidades.value[detalle.detalle_id] ??
            detalle.cantidad_solicitada;
        const nuevaCantidad = Math.max(0, cantidadActualValue + delta);

        if (nuevaCantidad === detalle.cantidad_solicitada) {
            delete cantidades.value[detalle.detalle_id];
        } else {
            cantidades.value[detalle.detalle_id] = nuevaCantidad;
        }
    };

    const cambiarEstado = async (nuevoEstado) => {
        try {
            const cambios = {
                estado: nuevoEstado,
                detalles: Object.entries(cantidades.value).map(([detalle_id, cantidad_nueva]) => ({
                    detalle_id: parseInt(detalle_id),
                    cantidad_anterior: props.pedido.detalles.find(d => d.detalle_id === parseInt(detalle_id)).cantidad_solicitada,
                    cantidad_nueva
                })),
                notas: notasModificacion.value
            };

            emit('state-change', cambios);

            // Si el estado es FINALIZADO o CANCELADO, cerrar autom�ticamente
            if (['FINALIZADO', 'CANCELADO'].includes(nuevoEstado)) {
                // Emitir evento especial para estados finales
                emit('final-state-reached');
            }
        } catch (error) {
            console.error('Error al cambiar estado:', error);
        }
    };
</script>