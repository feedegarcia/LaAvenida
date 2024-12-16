<!-- components/pedidos/EstadoPedido.vue -->
<template>
    <span :class="[
    'px-2 py-1 text-xs rounded-full font-medium',
    `bg-${pedidoStore.obtenerColorEstado(estado)}-100`,
    `text-${pedidoStore.obtenerColorEstado(estado)}-800`
  ]">
        {{ pedidoStore.obtenerEtiquetaEstado(estado) }}
    </span>
</template>

<script setup>
    import { usePedidoStore } from '@/stores/pedidoStateMachine';

    const props = defineProps({
        estado: {
            type: String,
            required: true
        }
    });

    const pedidoStore = usePedidoStore();
</script>