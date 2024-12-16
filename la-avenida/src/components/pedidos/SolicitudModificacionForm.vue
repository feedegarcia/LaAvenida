<template>
    <div class="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
        <!-- Header -->
        <div class="flex justify-between items-start mb-6">
            <h3 class="text-lg font-bold text-gray-900">Solicitud de Modificacion</h3>
            <button @click="cerrarModal"
                    class="text-gray-400 hover:text-gray-600">
                <X class="w-5 h-5" />
            </button>
        </div>

        <div class="space-y-4">
            <!-- Lista de productos con cantidades -->
            <div v-for="detalle in detalles"
                 :key="detalle.detalle_id"
                 class="p-4 border rounded-lg hover:bg-gray-50">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-medium">{{ detalle.producto_nombre }}</h4>
                        <div class="flex items-center space-x-2 text-sm text-gray-600">
                            <span>Cantidad actual: {{ detalle.cantidad_solicitada }}</span>
                            <span v-if="pedidoStore.puedeVerCostos(pedido, authStore.user)"
                                  class="text-gray-500">
                                • $ {{ formatoMoneda(detalle.precio_unitario) }}
                            </span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <label class="text-sm text-gray-600">Nueva cantidad:</label>
                        <div class="flex items-center space-x-1">
                            <button @click="decrementarCantidad(detalle)"
                                    class="p-1 rounded bg-gray-100 hover:bg-gray-200">
                                <Minus class="w-4 h-4" />
                            </button>
                            <input type="number"
                                   v-model.number="cantidades[detalle.detalle_id]"
                                   min="0"
                                   class="w-20 text-center border rounded-md px-2 py-1">
                            <button @click="incrementarCantidad(detalle)"
                                    class="p-1 rounded bg-gray-100 hover:bg-gray-200">
                                <Plus class="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Resumen de cambios -->
            <div v-if="hayCambios"
                 class="bg-blue-50 p-4 rounded-lg">
                <h4 class="font-medium text-blue-800 mb-2">Resumen de cambios</h4>
                <div v-for="(cantidad, detalleId) in cantidadesModificadas"
                     :key="detalleId"
                     class="text-sm text-blue-700">