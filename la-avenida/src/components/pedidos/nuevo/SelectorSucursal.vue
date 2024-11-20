<template>
    <div class="bg-white shadow-lg rounded-lg p-4 mb-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Sucursal que realiza el pedido</h3>
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

<script setup>
    import { ref, onMounted } from 'vue';
    import { useNuevoPedidoStore } from '@/stores/nuevoPedidoStore';
    import { useAuthStore } from '@/stores/auth';

    const nuevoPedidoStore = useNuevoPedidoStore();
    const authStore = useAuthStore();
    const sucursalSeleccionada = ref(null);
    const sucursales = ref([]);

    const seleccionarSucursal = (sucursal) => {
        sucursalSeleccionada.value = sucursal;
        nuevoPedidoStore.pedido.sucursal_origen = sucursal.id;
        localStorage.setItem('ultimaSucursalSeleccionada', sucursal.id.toString());
    };

    onMounted(async () => {
        sucursales.value = authStore.user.sucursales;

        // Si solo hay una sucursal, seleccionarla automáticamente
        if (sucursales.value.length === 1) {
            seleccionarSucursal(sucursales.value[0]);
            return;
        }

        // Si hay más de una, intentar cargar la última seleccionada
        const ultimaSucursal = localStorage.getItem('ultimaSucursalSeleccionada');
        if (ultimaSucursal) {
            const sucursal = sucursales.value.find(s => s.id === parseInt(ultimaSucursal));
            if (sucursal) {
                seleccionarSucursal(sucursal);
            }
        }
    });
</script>