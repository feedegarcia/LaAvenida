<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex justify-between items-center">
            <h2 class="text-2xl font-bold text-avenida-black">Control de Stock</h2>
            <!-- Selector de Sucursal -->
            <div>
                <select v-if="sucursales.length > 1"
                        v-model="sucursalSeleccionada"
                        class="block w-48 rounded-md border-gray-300 focus:border-emerald-500 focus:ring-emerald-500">
                    <option v-for="sucursal in sucursales"
                            :key="sucursal.id"
                            :value="sucursal.id">
                        {{ sucursal.nombre }}
                    </option>
                </select>
                <span v-else class="text-gray-600">
                    {{ sucursales[0]?.nombre }}
                </span>
            </div>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="text-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-avenida-green mx-auto"></div>
            <p class="mt-2 text-gray-600">Cargando stock...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
            {{ error }}
        </div>

        <!-- Tabla de Stock -->
        <div v-else class="bg-white rounded-lg shadow-lg">
            <div class="p-6">
                <!-- Buscador -->
                <div class="mb-6">
                    <input type="text"
                           v-model="busqueda"
                           placeholder="Buscar productos..."
                           class="w-full px-4 py-2 border rounded-lg">
                </div>

                <!-- Tabla -->
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th v-for="columna in columnas"
                                    :key="columna.key"
                                    @click="ordenarPor(columna.key)"
                                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                                    <div class="flex items-center space-x-1">
                                        <span>{{ columna.label }}</span>
                                        <span v-if="sortKey === columna.key"
                                              class="text-emerald-500">
                                            {{ sortOrder === 'asc' ? '↑' : '↓' }}
                                        </span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr v-for="producto in productosFiltrados"
                                :key="producto.producto_id"
                                class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm font-medium text-gray-900">
                                        {{ producto.nombre }}
                                    </div>
                                    <div class="text-xs text-gray-500">
                                        {{ producto.codigo }}
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm text-gray-900">
                                        {{ producto.categoria_nombre }}
                                    </div>
                                    <div class="text-xs text-gray-500">
                                        {{ producto.subcategoria_nombre }}
                                    </div>
                                </td>
                                <td class="px-6 py-4 text-center whitespace-nowrap">
                                    <span class="text-sm">{{ producto.stock_actual || 0 }}</span>
                                </td>
                                <td class="px-6 py-4 text-center whitespace-nowrap">
                                    <span class="text-sm text-blue-600">
                                        {{ producto.en_camino || 0 }}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-center whitespace-nowrap">
                                    <span class="text-sm text-gray-600">
                                        {{ producto.stock_minimo || 0 }}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-center whitespace-nowrap">
                                    <span :class="{
                                          'px-2 py-1 text-xs rounded-full' : true,
                                          'bg-red-100 text-red-800' : producto.stock_actual <= producto.stock_minimo,
                                        'bg-green-100 text-green-800': producto.stock_actual > producto.stock_minimo
                                    }">
                                        {{ producto.stock_actual <= producto.stock_minimo ? 'Bajo Stock' : 'OK' }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed, onMounted, watch } from 'vue';
    import { useAuthStore } from '@/stores/auth';
    import axios from '@/utils/axios-config';

    const authStore = useAuthStore();
    const productos = ref([]);
    const busqueda = ref('');
    const loading = ref(false);
    const error = ref('');

    // Ordenamiento
    const sortKey = ref('nombre');
    const sortOrder = ref('asc');

    const sucursales = computed(() => authStore.user.sucursales || []);
    const sucursalSeleccionada = ref(null);

    const columnas = [
        { key: 'nombre', label: 'Producto' },
        { key: 'categoria', label: 'Categoría' },
        { key: 'stock_actual', label: 'Stock Actual' },
        { key: 'en_camino', label: 'En Camino' },
        { key: 'stock_minimo', label: 'Stock Mínimo' },
        { key: 'estado', label: 'Estado' }
    ];

    const productosFiltrados = computed(() => {
        let resultado = [...productos.value];

        if (busqueda.value) {
            const busquedaLower = busqueda.value.toLowerCase();
            resultado = resultado.filter(p =>
                p.nombre.toLowerCase().includes(busquedaLower) ||
                p.codigo?.toLowerCase().includes(busquedaLower) ||
                p.categoria_nombre?.toLowerCase().includes(busquedaLower)
            );
        }

        return resultado.sort((a, b) => {
            let valorA = a[sortKey.value];
            let valorB = b[sortKey.value];

            if (typeof valorA === 'string') {
                valorA = valorA.toLowerCase();
                valorB = valorB.toLowerCase();
            }

            if (valorA < valorB) return sortOrder.value === 'asc' ? -1 : 1;
            if (valorA > valorB) return sortOrder.value === 'asc' ? 1 : -1;
            return 0;
        });
    });

    const ordenarPor = (key) => {
        if (sortKey.value === key) {
            sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
        } else {
            sortKey.value = key;
            sortOrder.value = 'asc';
        }
    };

    const cargarStock = async () => {
        if (!sucursalSeleccionada.value) {
            error.value = 'No hay sucursal seleccionada';
            return;
        }

        try {
            loading.value = true;
            error.value = '';

            console.log('Cargando stock para sucursal:', sucursalSeleccionada.value);
            const response = await axios.get(`/api/stock/${sucursalSeleccionada.value}`);

            if (!response?.data) {
                throw new Error('No se recibieron datos del servidor');
            }

            productos.value = response.data;
            console.log('Stock cargado:', productos.value.length, 'productos');
        } catch (err) {
            if (err.name === 'CanceledError') {
                console.log('Solicitud cancelada por nueva petición');
                return;
            }
            console.error('Error detallado:', err);
            error.value = err.response?.data?.message || 'Error al cargar el stock';
            productos.value = [];
        } finally {
            loading.value = false;
        }
    };

    const inicializarSucursal = () => {
        if (sucursales.value.length === 0) return;

        if (sucursales.value.length === 1) {
            sucursalSeleccionada.value = sucursales.value[0].id;
        } else {
            const ultimaSucursal = localStorage.getItem('ultimaSucursalSeleccionada');
            const sucursalValida = ultimaSucursal &&
                sucursales.value.find(s => s.id === parseInt(ultimaSucursal));

            sucursalSeleccionada.value = sucursalValida
                ? parseInt(ultimaSucursal)
                : sucursales.value[0].id;
        }

        localStorage.setItem('ultimaSucursalSeleccionada', sucursalSeleccionada.value?.toString() || '');
    };

    onMounted(() => {
        inicializarSucursal();
    });

    watch(sucursalSeleccionada, (newValue) => {
        if (newValue) {
            localStorage.setItem('ultimaSucursalSeleccionada', newValue.toString());
            cargarStock();
        }
    });
</script>

<style scoped>
    .animate-spin {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }

        to {
            transform: rotate(360deg);
        }
    }
</style>