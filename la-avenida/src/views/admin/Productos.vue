<template>
    <div>
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-avenida-black">Gestión de Productos</h2>
            <button @click="productosStore.showModal = true"
                    class="px-4 py-2 bg-avenida-green text-white rounded hover:bg-green-600 transition-colors">
                Nuevo Producto
            </button>
        </div>

        <!-- Filtros -->
        <div class="bg-white rounded-lg shadow-lg p-4 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                    <input type="text"
                           v-model="productosStore.filtros.busqueda"
                           class="w-full border rounded-md px-3 py-2"
                           placeholder="Buscar por nombre o código...">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select v-model="productosStore.filtros.categoria"
                            class="w-full border rounded-md px-3 py-2">
                        <option value="">Todas las categorías</option>
                        <option v-for="cat in productosStore.categorias"
                                :key="cat.categoria_id"
                                :value="cat.categoria_id">
                            {{ cat.nombre }}
                        </option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select v-model="productosStore.filtros.estado"
                            class="w-full border rounded-md px-3 py-2">
                        <option value="">Todos los estados</option>
                        <option value="true">Activos</option>
                        <option value="false">Inactivos</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Tabla de Productos -->
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th @click="productosStore.ordenarPor('codigo')"
                                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                                Código
                            </th>
                            <th @click="productosStore.ordenarPor('nombre')"
                                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                                Nombre
                            </th>
                            <th @click="productosStore.ordenarPor('categoria')"
                                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                                Categoría
                            </th>
                            <th @click="productosStore.ordenarPor('precio_venta')"
                                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                                Precio Venta
                            </th>
                            <th @click="productosStore.ordenarPor('precio_mayorista')"
                                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                                Precio Mayorista
                            </th>
                            <th @click="productosStore.ordenarPor('stock_minimo')"
                                class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                                Stock Mínimo
                            </th>
                            <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Estado
                            </th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr v-for="producto in productosStore.productosFiltrados"
                            :key="producto.producto_id"
                            class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap text-sm">
                                {{ producto.codigo }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm">
                                {{ producto.nombre }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm">
                                {{ producto.categoria }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
                                $ {{ productosStore.formatoMoneda(producto.precio_venta) }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
                                $ {{ productosStore.formatoMoneda(producto.precio_mayorista) }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
                                {{ producto.stock_minimo }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                                <span :class="{
                                    'px-2 py-1 text-xs rounded-full': true,
                                    'bg-green-100 text-green-800': producto.activo,
                                    'bg-red-100 text-red-800': !producto.activo
                                }">
                                    {{ producto.activo ? 'Activo' : 'Inactivo' }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                                <button @click="productosStore.editarProducto(producto)"
                                        class="text-blue-600 hover:text-blue-900">
                                    Editar
                                </button>
                                <button @click="productosStore.toggleEstado(producto)"
                                        :class="{
                                            'text-red-600 hover:text-red-900': producto.activo,
                                            'text-green-600 hover:text-green-900': !producto.activo
                                        }">
                                    {{ producto.activo ? 'Desactivar' : 'Activar' }}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Modal de Producto -->
        <ProductoModal v-if="productosStore.showModal"
                       :show="productosStore.showModal"
                       :editing-producto="productosStore.editingProducto"
                       @close="productosStore.cerrarModal"
                       @saved="productosStore.cargarProductos" />
    </div>
</template>

<script setup>
    import { onMounted } from 'vue'
    import ProductoModal from '@/components/modals/ProductoModal.vue'
    import { useProductosStore } from '@/stores/productos'

    const productosStore = useProductosStore()

    onMounted(() => {
        productosStore.cargarProductos()
        productosStore.cargarCategorias()
    })
</script>
