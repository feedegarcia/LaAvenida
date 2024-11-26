<template>
    <div>
        <!-- Seccion de Fabricas -->
        <div v-if="productosStore.fabricas"
             v-for="(productos, fabricaId) in productosStore.fabricas"
             :key="fabricaId"
             class="border rounded-lg p-4 mb-4">
            <h4 class="text-xl font-bold mb-4">{{ productos.nombre }}</h4>

            <div v-for="subcategoria in obtenerSubcategoriasOrdenadas(fabricaId)"
                 :key="subcategoria.subcategoria_id"
                 class="border rounded-lg mb-4">
                <!-- Header de subcategoria -->
                <div class="bg-gray-50 p-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2 flex-1">
                            <div class="flex space-x-1">
                                <button @click="moverGrupo(fabricaId, subcategoria.subcategoria_id, 'arriba')"
                                        class="p-1 hover:bg-gray-200 rounded">
                                    ↑
                                </button>
                                <button @click="moverGrupo(fabricaId, subcategoria.subcategoria_id, 'abajo')"
                                        class="p-1 hover:bg-gray-200 rounded">
                                    ↓
                                </button>
                            </div>
                            <div class="cursor-pointer"
                                 @click="toggleSubcategoria(fabricaId, subcategoria.subcategoria_id)">
                                <h5 class="font-medium">
                                    {{ subcategoria.nombre }}
                                    <span class="text-sm text-gray-500">
                                        ({{ subcategoria.productos.length }})
                                    </span>
                                </h5>
                            </div>
                        </div>
                        <span class="transform transition-transform"
                              :class="{ 'rotate-180': !isSubcategoriaColapsada(fabricaId, subcategoria.subcategoria_id) }">
                            ▼
                        </span>
                    </div>
                </div>

                <!-- Lista de productos -->
                <div v-show="!isSubcategoriaColapsada(fabricaId, subcategoria.subcategoria_id)"
                     class="p-3">
                    <div v-for="producto in subcategoria.productos"
                         :key="producto.producto_id"
                         class="grid grid-cols-4 gap-2 items-center text-sm py-1">
                        <span>{{ formatearNombre(producto.nombre) }}</span>
                        <span class="text-gray-600">Stock: {{ producto.stock || 0 }}</span>
                        <span class="text-gray-600">ultimo: {{ producto.ultimo_pedido || '-' }}</span>
                        <div class="flex items-center justify-end gap-2">
                            <input type="number"
                                   :value="obtenerCantidad(producto.producto_id)"
                                   min="0"
                                   class="w-16 px-2 py-1 border rounded text-center"
                                   @input="actualizarCantidad(producto.producto_id, $event)">
                            <button @click="incrementarCantidad(producto.producto_id, 1)"
                                    class="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">
                                +
                            </button>
                            <button @click="incrementarCantidad(producto.producto_id, -1)"
                                    class="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">
                                -
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Seccion de Sin TAC -->
        <div v-if="productosStore.sinTac?.length > 0" class="border rounded-lg p-4 mb-4">
            <h4 class="text-xl font-bold mb-4">Productos Sin TAC</h4>
            <!-- Lista de productos sin TAC similar a la de arriba -->
        </div>

        <!-- Seccion de Varios -->
        <div v-if="productosStore.varios?.length > 0" class="border rounded-lg p-4 mb-4">
            <h4 class="text-xl font-bold mb-4">Otros Productos</h4>
            <!-- Lista de productos varios similar a la de arriba -->
        </div>
    </div>
</template>

<script setup>
    import { ref, computed } from 'vue';
    import { useNuevoPedidoStore } from '@/stores/nuevoPedidoStore';

    const nuevoPedidoStore = useNuevoPedidoStore();
    const colapsados = ref(new Set());
    const ordenSubcategorias = ref(new Map());

    const productosStore = computed(() => nuevoPedidoStore.productos || {});

    const obtenerSubcategoriasOrdenadas = (fabricaId) => {
        const fabrica = productosStore.value.fabricas?.[fabricaId];
        if (!fabrica?.subcategorias) return [];

        return Object.values(fabrica.subcategorias).sort((a, b) => {
            const ordenA = ordenSubcategorias.value.get(`${fabricaId}_${a.subcategoria_id}`) || 0;
            const ordenB = ordenSubcategorias.value.get(`${fabricaId}_${b.subcategoria_id}`) || 0;
            return ordenA - ordenB;
        });
    };

    const toggleSubcategoria = (fabricaId, subcategoriaId) => {
        const key = `${fabricaId}_${subcategoriaId}`;
        if (colapsados.value.has(key)) {
            colapsados.value.delete(key);
        } else {
            colapsados.value.add(key);
        }
    };

    const isSubcategoriaColapsada = (fabricaId, subcategoriaId) => {
        return colapsados.value.has(`${fabricaId}_${subcategoriaId}`);
    };

    const obtenerCantidad = (productoId) => {
        return nuevoPedidoStore.pedido.detalles[productoId]?.cantidad || 0;
    };

    const actualizarCantidad = (productoId, event) => {
        const cantidad = parseInt(event.target.value) || 0;
        nuevoPedidoStore.actualizarCantidad(productoId, cantidad);
    };

    const incrementarCantidad = (productoId, delta) => {
        const cantidadActual = obtenerCantidad(productoId);
        nuevoPedidoStore.actualizarCantidad(productoId, Math.max(0, cantidadActual + delta));
    };

    const moverGrupo = (fabricaId, subcategoriaId, direccion) => {
        const key = `${fabricaId}_${subcategoriaId}`;
        const ordenActual = ordenSubcategorias.value.get(key) || 0;
        ordenSubcategorias.value.set(key, ordenActual + (direccion === 'arriba' ? -1 : 1));
    };

    const formatearNombre = (nombre) => {
        const palabras = nombre.split(' ');
        return palabras.length > 1 ? palabras.slice(1).join(' ') : nombre;
    };
</script>