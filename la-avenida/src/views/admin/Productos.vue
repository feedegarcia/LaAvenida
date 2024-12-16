<template>
    <div>
        <!-- Calculadora fija -->
        <div v-if="showCalculator"
             class="fixed top-20 left-0 right-0 z-40 bg-[#1f1f1f] border-b border-white/10">
            <div class="container mx-auto px-4 py-2">
                <div class="flex items-center justify-between">
                    <div class="text-white/80 font-medium">Calculadora 25%</div>
                    <div class="flex items-center gap-3">
                        <input type="number"
                               v-model="precioBase"
                               class="w-28 rounded-md bg-white/10 border border-white/20 text-white placeholder-white/50 px-3 py-1"
                               placeholder="Precio base">
                        <span class="text-white/80">=</span>
                        <input type="number"
                               :value="precioConDescuento"
                               class="w-28 rounded-md bg-white/10 border border-white/20 text-white px-3 py-1"
                               readonly>
                    </div>
                </div>
            </div>
        </div>

        <!-- Espaciador cuando la calculadora esta visible -->
        <div v-if="showCalculator" class="h-12"></div>

        <!-- Contenido principal -->
        <div class="container mx-auto px-4">
            <!-- Header -->
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-avenida-black">Gestion de Productos</h2>
                <div class="flex items-center gap-4">
                    <label class="flex items-center space-x-2">
                        <input type="checkbox"
                               v-model="showCalculator"
                               class="rounded border-gray-300 text-avenida-green focus:ring-avenida-green">
                        <span class="text-sm">Mostrar calculadora</span>
                    </label>
                    <button @click="showCategoriaModal = true"
                            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                        Gestionar Categorias
                    </button>
                    <button @click="productosStore.showModal = true"
                            class="px-4 py-2 bg-avenida-green text-white rounded hover:bg-green-600 transition-colors">
                        Nuevo Producto
                    </button>
                </div>
            </div>

            <!-- Buscador -->
            <div class="bg-white rounded-lg shadow-lg p-4 mb-6">
                <input type="text"
                       v-model="productosStore.filtros.busqueda"
                       class="w-full border rounded-md px-3 py-2"
                       placeholder="Buscar productos...">
            </div>

            <!-- Lista de Categorias -->
            <div class="space-y-6">
                <div v-for="categoria in categoriasFiltradas"
                     :key="categoria.categoria_id"
                     class="bg-white rounded-lg shadow-lg overflow-hidden">
                    <!-- Titulo Categoria -->
                    <div class="bg-gray-100 px-6 py-3">
                        <h3 class="text-xl font-bold text-gray-800">{{ categoria.nombre }}</h3>
                    </div>

                    <!-- Subcategorias -->
                    <div v-for="subcategoria in categoria.subcategorias"
                         :key="subcategoria.subcategoria_id"
                         class="border-t border-gray-200">
                        <!-- Header Subcategoria -->
                        <div class="bg-white px-6 py-4">
                            <div class="flex flex-wrap items-center justify-between gap-4">
                                <h4 class="text-lg font-semibold text-gray-700">{{ subcategoria.nombre }}</h4>
                                <div class="flex flex-wrap items-center gap-2">
                                    <div class="grid grid-cols-3 gap-2">
                                        <input type="number"
                                               v-model="subcategoria.nuevoPrecioVenta"
                                               class="w-24 rounded-md border-gray-300 text-right"
                                               placeholder="P.Venta">
                                        <input type="number"
                                               v-model="subcategoria.nuevoPrecioJueves"
                                               class="w-24 rounded-md border-gray-300 text-right"
                                               placeholder="P.Jueves">
                                        <input type="number"
                                               v-model="subcategoria.nuevoPrecioMayor"
                                               class="w-24 rounded-md border-gray-300 text-right"
                                               placeholder="P.Mayor">
                                    </div>
                                    <button @click="aplicarPreciosSubcategoria(subcategoria)"
                                            class="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                                        Aplicar
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Tabla de Productos -->
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Codigo
                                        </th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Nombre
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            P.Venta
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            P.Jueves
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            P.Mayor
                                        </th>
                                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Web
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    <tr v-for="producto in subcategoria.productos"
                                        :key="producto.producto_id"
                                        class="hover:bg-gray-50">
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {{ producto.codigo }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {{ producto.nombre }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                            ${{ productosStore.formatoMoneda(producto.precio_venta) }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                            ${{ productosStore.formatoMoneda(producto.precio_jueves) }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                            ${{ productosStore.formatoMoneda(producto.precio_mayorista) }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-center">
                                            <span :class="{
                                            'px-2 py-1 text-xs rounded-full': true,
                                            'bg-green-100 text-green-800': producto.activo,
                                            'bg-red-100 text-red-800': !producto.activo
                                        }">
                                                {{ producto.activo ? 'Activo' : 'Inactivo' }}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-center">
                                            <button @click="productosStore.toggleVisibilidadWeb(producto)"
                                                    :disabled="userRole === 'EMPLEADO'"
                                                    :class="{
                                                    'px-2 py-1 text-xs rounded-full': true,
                                                    'bg-green-100 text-green-800': producto.visible_web,
                                                    'bg-gray-100 text-gray-800': !producto.visible_web,
                                                    'opacity-50 cursor-not-allowed': userRole === 'EMPLEADO'
                                                }">
                                                {{ producto.visible_web ? 'Visible' : 'No visible' }}
                                            </button>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                                            <button @click="productosStore.editarProducto(producto)"
                                                    class="text-blue-600 hover:text-blue-900">
                                                Editar
                                            </button>
                                            <button v-if="userRole !== 'EMPLEADO'"
                                                    @click="productosStore.toggleEstado(producto)"
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
                </div>
            </div>

            <!-- Modal de Producto -->
            <ProductoModal v-if="productosStore.showModal"
                           :show="productosStore.showModal"
                           :editing-producto="productosStore.editingProducto"
                           @close="productosStore.cerrarModal"
                           @saved="productosStore.cargarProductos" />
            <CategoriaModal v-if="showCategoriaModal"
                            :show="showCategoriaModal"
                            @close="showCategoriaModal = false" />
        </div>
    </div>
</template>

<script setup>
    import { ref, computed, onMounted } from 'vue'
    import { jwtDecode } from 'jwt-decode'
    import ProductoModal from '../../components/modals/ProductoModal.vue'
    import { useProductosStore } from '@/stores/productos'
    import CategoriaModal from '@/components/modals/CategoriaModal.vue'

    const showCategoriaModal = ref(false)
    const productosStore = useProductosStore()
    const userRole = ref('')
    const showCalculator = ref(false)
    const precioBase = ref('')

    // Calculadora de 25%
    const precioConDescuento = computed(() => {
        if (!precioBase.value) return ''
        return (precioBase.value * 0.75).toFixed(2)
    })

    // Computar categorias y subcategorias con productos
    const categoriasFiltradas = computed(() => {
        const productos = productosStore.productosFiltrados
        const categorias = new Map()

        productos.forEach(producto => {
            // Crear o actualizar categoria
            if (!categorias.has(producto.categoria_id)) {
                categorias.set(producto.categoria_id, {
                    categoria_id: producto.categoria_id,
                    nombre: producto.categoria_nombre,
                    subcategorias: new Map()
                })
            }

            // Crear o actualizar subcategoria
            const categoria = categorias.get(producto.categoria_id)
            if (!categoria.subcategorias.has(producto.subcategoria_id)) {
                categoria.subcategorias.set(producto.subcategoria_id, {
                    subcategoria_id: producto.subcategoria_id,
                    nombre: producto.subcategoria_nombre,
                    productos: [],
                    nuevoPrecioVenta: '',
                    nuevoPrecioMayor: '',
                    nuevoPrecioJueves: ''
                })
            }

            // Agregar producto a su subcategoria
            categoria.subcategorias.get(producto.subcategoria_id).productos.push(producto)
        })

        // Convertir Maps a arrays
        return Array.from(categorias.values()).map(cat => ({
            ...cat,
            subcategorias: Array.from(cat.subcategorias.values())
        }))
    })

    const aplicarPreciosSubcategoria = async (subcategoria) => {
        console.log('Enviando precios:', {
            precio_venta: subcategoria.nuevoPrecioVenta,
            precio_mayorista: subcategoria.nuevoPrecioMayor,
            precio_jueves: subcategoria.nuevoPrecioJueves
        })
        try {
            await productosStore.actualizarPreciosSubcategoria(
                subcategoria.subcategoria_id,
                {
                    precio_venta: subcategoria.nuevoPrecioVenta || null,
                    precio_mayorista: subcategoria.nuevoPrecioMayor || null,
                    precio_jueves: subcategoria.nuevoPrecioJueves || null
                }
            )
            subcategoria.nuevoPrecioVenta = ''
            subcategoria.nuevoPrecioMayor = ''
            subcategoria.nuevoPrecioJueves = ''
        } catch (error) {
            console.error('Error completo:', error.response?.data)
            alert('Error al actualizar precios')
        }
    }

    onMounted(async () => {
        const token = localStorage.getItem('token')
        if (token) {
            const decoded = jwtDecode(token)
            userRole.value = decoded.rol
        }
        await productosStore.cargarProductos()
        await productosStore.cargarCategorias()
    })
</script>

<style scoped>
    /* Estilos responsive */
    @media (max-width: 768px) {
        .container {
            padding-left: 1rem;
            padding-right: 1rem;
        }

        .flex-wrap {
            flex-wrap: wrap;
        }

        .w-full {
            width: 100%;
        }

        .text-sm {
            font-size: 0.875rem;
        }
    }
</style>