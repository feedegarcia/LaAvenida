<script setup>
    import { ref, watch, onMounted } from 'vue';
    import CalendarioReducido from '@/components/calendario/CalendarioReducido.vue';
    import WeatherWidget from '@/components/pedidos/WeatherWidget.vue';
    import { useNuevoPedidoStore } from '@/stores/nuevoPedidoStore';

    const nuevoPedidoStore = useNuevoPedidoStore();
    const fechaSeleccionada = ref(new Date());
    const widgetKey = ref(0); 

    const normalizarFecha = (fecha) => {
        if (!fecha) return new Date();
        const date = new Date(fecha);
        date.setHours(0, 0, 0, 0);
        return date;
    };

    const onFechaSeleccionada = (fecha) => {
        const nuevaFecha = normalizarFecha(fecha);
        fechaSeleccionada.value = nuevaFecha;
        nuevoPedidoStore.pedido.fecha_entrega_requerida = nuevaFecha;
        widgetKey.value++; 
    };

    onMounted(() => {
        if (nuevoPedidoStore.pedido.fecha_entrega_requerida) {
            fechaSeleccionada.value = normalizarFecha(nuevoPedidoStore.pedido.fecha_entrega_requerida);
        } else {
            const fechaProxima = nuevoPedidoStore.obtenerProximaFechaEntrega();
            fechaSeleccionada.value = normalizarFecha(fechaProxima);
            nuevoPedidoStore.pedido.fecha_entrega_requerida = fechaSeleccionada.value;
        }
    });

    watch(() => nuevoPedidoStore.pedido.fecha_entrega_requerida, (nuevaFecha) => {
        if (nuevaFecha && nuevaFecha.getTime() !== fechaSeleccionada.value.getTime()) {
            fechaSeleccionada.value = normalizarFecha(nuevaFecha);
            widgetKey.value++; 
        }
    });
</script>

<template>
    <div class="grid grid-cols-3 gap-6 mb-6">
        <div class="col-span-2">
            <CalendarioReducido v-model="fechaSeleccionada"
                                @update:modelValue="onFechaSeleccionada" />
        </div>
        <div class="col-span-1">
            <WeatherWidget v-if="fechaSeleccionada"
                           :key="widgetKey"
                           :fecha-pedido="fechaSeleccionada" />
        </div>
    </div>
</template>