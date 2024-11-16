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
                        <th v-if="puedeModificar" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                        </th>
                    </tr>
                </thead>
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

        <!-- Modal de historial -->
        <HistorialModal v-if="historialSeleccionado"
                        :historial="historialSeleccionado"
                        @close="historialSeleccionado = null" />
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

const totalPedido = computed(() => {
  return props.detalles.reduce((total, detalle) => {
    const cantidad = detalle.cantidad_confirmada || detalle.cantidad_solicitada
    return total + (detalle.precio_unitario * cantidad)
  }, 0)
})

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

const mostrarHistorial = (detalle) => {
  historialSeleccionado.value = detalle.historial_cambios
}
</script>