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
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="detalle in detalles"
                        :key="detalle.detalle_id"
                        :class="getRowClasses(detalle)">
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
                            <template v-if="puedeModificar">
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
                            $ {{
 formatoMoneda(detalle.precio_unitario *
                                (detalle.cantidad_confirmada || detalle.cantidad_solicitada))
                            }}
                        </td>
                        <td v-if="puedeModificar" class="px-4 py-3 text-center">
                            <button v-if="hayCambios(detalle)"
                                    @click="guardarCambios(detalle)"
                                    class="text-sm bg-emerald-500 text-white px-3 py-1 rounded hover:bg-emerald-600">
                                Guardar
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
                    </tr>
                </tfoot>
            </table>
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
        detalles: {
            type: Array,
            required: true
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

    const emit = defineEmits(['modificacion']);
    const cantidadesModificadas = ref({});

    const totalPedido = computed(() => {
        return props.detalles.reduce((total, detalle) => {
            const cantidad = detalle.cantidad_confirmada || detalle.cantidad_solicitada;
            return total + (detalle.precio_unitario * cantidad);
        }, 0);
    });
    const getRowClasses = (detalle) => {
        if (!detalle.modificado) return '';

        const sucursal = props.pedido?.sucursales?.find(
            s => s.sucursal_id === detalle.modificado_por_sucursal
        );

        if (!sucursal?.color) return 'bg-gray-50';

        // Convertir el color HEX a RGB con opacidad
        const hex = sucursal.color.replace('#', '');
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);

        return {
            backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`
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

        const hex = sucursal.color;
        return {
            backgroundColor: `${hex}20`,
            color: hex
        };
    };

    // Nueva función para obtener nombre de sucursal
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
            cantidad_nueva: cantidadesModificadas.value[detalle.detalle_id]
        };
        emit('modificacion', cambio);
    };
</script>   