<template>
    <div class="grid grid-cols-3 gap-6 mb-6">
        <div class="col-span-2">
            <CalendarioReducido v-model="fechaSeleccionada"
                                @update:modelValue="onFechaSeleccionada" />
        </div>
        <div class="col-span-1">
            <WeatherWidget v-if="fechaSeleccionada"
                           :fecha-pedido="normalizarFecha(fechaSeleccionada)" />
        </div>
    </div>
</template>

<script setup>
    import { ref, watch, onMounted } from 'vue';
    import CalendarioReducido from '@/components/calendario/CalendarioReducido.vue';
    import WeatherWidget from '@/components/pedidos/WeatherWidget.vue';
    import { useNuevoPedidoStore } from '@/stores/nuevoPedidoStore';

    const nuevoPedidoStore = useNuevoPedidoStore();
    const fechaSeleccionada = ref(new Date()); // Inicializamos con la fecha actual

    const normalizarFecha = (fecha) => {
        if (!fecha) return new Date();
        const date = new Date(fecha);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const onFechaSeleccionada = (fecha) => {
        fechaSeleccionada.value = fecha;
        nuevoPedidoStore.pedido.fecha_entrega_requerida = fecha;
    };

    onMounted(() => {
        const fechaProxima = nuevoPedidoStore.obtenerProximaFechaEntrega();
        fechaSeleccionada.value = fechaProxima;
        nuevoPedidoStore.pedido.fecha_entrega_requerida = fechaProxima;
    });

    watch(() => nuevoPedidoStore.pedido.fecha_entrega_requerida, (nuevaFecha) => {
        if (nuevaFecha && nuevaFecha !== fechaSeleccionada.value) {
            fechaSeleccionada.value = nuevaFecha;
        }
    });
</script>