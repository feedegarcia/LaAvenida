
<template>
    <div>
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-avenida-black">Gestión de Pedidos</h2>
            <div class="flex items-center">
                <router-link to="/pedidos/nuevo"
                             class="px-4 py-2 bg-avenida-green text-white rounded hover:bg-avenida-green-light">
                    Nuevo Pedido
                </router-link>
            </div>
        </div>
        <PedidosKanban />
    </div>
</template>

<script setup>
    import PedidosKanban from '../components/pedidos/PedidosKanban.vue'
</script>
