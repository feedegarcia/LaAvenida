<script setup>
    import { ref, onMounted } from 'vue';
    import { useNuevoPedidoStore } from '@/stores/nuevoPedidoStore';
    import { useAuthStore } from '@/stores/auth';

    const emit = defineEmits(['sucursal-seleccionada']);
    const nuevoPedidoStore = useNuevoPedidoStore();
    const authStore = useAuthStore();

    // Usar una referencia estable para sucursalSeleccionada
    const sucursalSeleccionada = ref(null);
    const sucursales = ref([]);

    // Función para seleccionar sucursal con control de estado
    const seleccionarSucursal = (sucursal) => {
        // Verificar si realmente es un cambio de sucursal
        if (sucursalSeleccionada.value?.id === sucursal.id) {
            console.log('Misma sucursal, ignorando selección');
            return;
        }

        // Actualizar estado local
        sucursalSeleccionada.value = {
            id: sucursal.id,
            nombre: sucursal.nombre
        };

        // Persistir selección
        localStorage.setItem('ultimaSucursalSeleccionada', sucursal.id.toString());

        // Emitir evento una sola vez
        emit('sucursal-seleccionada', {
            id: sucursal.id,
            nombre: sucursal.nombre
        });
    };

    // Inicialización más controlada
    onMounted(() => {
        // Cargar sucursales del usuario
        sucursales.value = authStore.user.sucursales;

        // Si hay solo una sucursal
        if (sucursales.value.length === 1) {
            sucursalSeleccionada.value = {
                id: sucursales.value[0].id,
                nombre: sucursales.value[0].nombre
            };
            localStorage.setItem('ultimaSucursalSeleccionada', sucursales.value[0].id.toString());
            return;
        }

        // Si hay más de una, intentar cargar la última seleccionada
        const ultimaSucursalId = localStorage.getItem('ultimaSucursalSeleccionada');
        if (ultimaSucursalId) {
            const sucursal = sucursales.value.find(s => s.id === parseInt(ultimaSucursalId));
            if (sucursal) {
                seleccionarSucursal({
                    id: sucursal.id,
                    nombre: sucursal.nombre
                });
            }
        }
    });
</script>

<template>
    <div class="bg-white shadow-lg rounded-lg p-4 mb-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">
            Sucursal que realiza el pedido
        </h3>
        <div v-if="sucursales.length > 0" class="border-b border-gray-200">
            <nav class="-mb-px flex space-x-8">
                <button v-for="sucursal in sucursales"
                        :key="sucursal.id"
                        @click="seleccionarSucursal(sucursal)"
                        :class="[
                        'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
                        sucursalSeleccionada?.id === sucursal.id
                            ? 'border-emerald-500 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    ]">
                    {{ sucursal.nombre }}
                </button>
            </nav>
        </div>
    </div>
</template>