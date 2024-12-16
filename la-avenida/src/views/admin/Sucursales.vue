<template>
    <div>
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-avenida-black">Gestion de Sucursales</h2>
            <button @click="crearNuevaSucursal"
                    class="px-4 py-2 bg-avenida-green text-white rounded hover:bg-green-600 transition-colors">
                Nueva Sucursal
            </button>
        </div>
        <div class="flex items-center space-x-2 mb-4">
            <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox"
                       v-model="showInactive"
                       class="sr-only peer">
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-avenida-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-avenida-green"></div>
            </label>
            <span class="text-sm text-gray-600">Mostrar inactivos</span>
        </div>
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th @click="sortBy('nombre')"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                            <div class="flex items-center space-x-1">
                                <span>Nombre</span>
                                <span v-if="sortKey === 'nombre'" class="text-avenida-green">
                                    {{ sortOrder === 'asc' ? '^' : 'v' }}
                                </span>
                            </div>
                        </th>
                        <th @click="sortBy('direccion')"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                            <div class="flex items-center space-x-1">
                                <span>Direccion</span>
                                <span v-if="sortKey === 'direccion'" class="text-avenida-green">
                                    {{ sortOrder === 'asc' ? '^' : 'v' }}
                                </span>
                            </div>
                        </th>
                        <th @click="sortBy('tipo')"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                            <div class="flex items-center space-x-1">
                                <span>Tipo</span>
                                <span v-if="sortKey === 'tipo'" class="text-avenida-green">
                                    {{ sortOrder === 'asc' ? '^' : 'v' }}
                                </span>
                            </div>
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Color
                        </th>
                        <th @click="sortBy('activo')"
                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                            <div class="flex items-center space-x-1">
                                <span>Estado</span>
                                <span v-if="sortKey === 'activo'" class="text-avenida-green">
                                    {{ sortOrder === 'asc' ? '^' : 'v' }}
                                </span>
                            </div>
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    <tr v-for="sucursal in sortedSucursales"
                        :key="sucursal.sucursal_id"
                        class="hover:bg-gray-50"
                        :style="{ borderLeft: `4px solid ${sucursal.color || '#FFFFFF'}` }">
                        <td class="px-6 py-4 whitespace-nowrap">{{ sucursal.nombre }}</td>
                        <td class="px-6 py-4 whitespace-nowrap">{{ sucursal.direccion }}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span :class="{
                                    'px-2 py-1 text-xs rounded-full': true,
                                    'bg-blue-100 text-blue-800': sucursal.tipo === 'FABRICA_VENTA',
                                    'bg-green-100 text-green-800': sucursal.tipo === 'SOLO_VENTA'
                                }">
                                {{ sucursal.tipo === 'FABRICA_VENTA' ? 'Fabrica y Venta' : 'Solo Venta' }}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center space-x-2">
                                <div class="w-6 h-6 rounded border"
                                     :style="{
                                         backgroundColor: sucursal.color || '#FFFFFF',
                                         borderColor: sucursal.color === '#FFFFFF' ? '#D1D5DB' : sucursal.color
                                     }"></div>
                                <span class="text-sm text-gray-600">{{ sucursal.color || '#FFFFFF' }}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span :class="{
                                    'px-2 py-1 text-xs rounded-full': true,
                                    'bg-green-100 text-green-800': sucursal.activo,
                                    'bg-red-100 text-red-800': !sucursal.activo
                                }">
                                {{ sucursal.activo ? 'Activo' : 'Inactivo' }}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap space-x-2">
                            <button @click="editSucursal(sucursal)"
                                    class="text-blue-600 hover:text-blue-900">
                                Editar
                            </button>
                            <button @click="toggleSucursalStatus(sucursal)"
                                    :class="{
                                    'text-red-600 hover:text-red-900': sucursal.activo,
                                    'text-green-600 hover:text-green-900': !sucursal.activo
                                }">
                                {{ sucursal.activo ? 'Desactivar' : 'Activar' }}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    <SucursalModal :show="showModal"
                   :editing-sucursal="editingSucursal"
                   @close="showModal = false"
                   @saved="loadSucursales" />
</template>

<script setup>
    import { ref, onMounted, computed } from 'vue';
    import axios from 'axios';
    import SucursalModal from '../../components/sucursales/SucursalModal.vue';

    const showInactive = ref(false);
    const editingSucursal = ref(null);
    const sucursales = ref([]);
    const showModal = ref(false);
    const loading = ref(false);
    const error = ref('');

    // Ordenamiento
    const sortKey = ref('nombre');
    const sortOrder = ref('asc');

    const sortBy = (key) => {
        if (sortKey.value === key) {
            sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
        } else {
            sortKey.value = key;
            sortOrder.value = 'asc';
        }
    };

    const sortedSucursales = computed(() => {
        let filtered = [...sucursales.value];

        // Aplicar filtro de activos/inactivos
        if (!showInactive.value) {
            filtered = filtered.filter(s => s.activo);
        }

        // Aplicar ordenamiento
        return filtered.sort((a, b) => {
            let aValue = a[sortKey.value];
            let bValue = b[sortKey.value];

            if (typeof aValue === 'boolean') {
                aValue = aValue ? 1 : 0;
                bValue = bValue ? 1 : 0;
            }

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1;
            return 0;
        });
    });

    const loadSucursales = async () => {
        try {
            loading.value = true;
            const response = await axios.get('http://localhost:3000/api/sucursales', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            sucursales.value = response.data;
        } catch (err) {
            console.error('Error cargando sucursales:', err);
            error.value = 'Error al cargar sucursales';
        } finally {
            loading.value = false;
        }
    };

    const editSucursal = (sucursal) => {
        editingSucursal.value = sucursal;
        showModal.value = true;
    };

    const crearNuevaSucursal = () => {
        editingSucursal.value = null;
        showModal.value = true;
    };

    const toggleSucursalStatus = async (sucursal) => {
        try {
            await axios.patch(
                `http://localhost:3000/api/sucursales/${sucursal.sucursal_id}/status`,
                { activo: !sucursal.activo },
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
            await loadSucursales();
        } catch (err) {
            console.error('Error actualizando estado:', err);
            error.value = 'Error al actualizar estado de la sucursal';
        }
    };

    onMounted(() => {
        loadSucursales();
    });
</script>