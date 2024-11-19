<template>
    <div class="bg-white rounded-lg shadow p-4">
        <div class="grid grid-cols-6 gap-2">
            <!-- Próximos 11 días -->
            <div v-for="date in proximosDias"
                 :key="date.toISOString()"
                 @click="seleccionarFecha(date)"
                 class="group relative cursor-pointer rounded-lg hover:bg-gray-50 transition-colors border"
                 :class="[
                    esFechaSeleccionada(date) ? 'border-2 border-emerald-500' : 'border-gray-200',
                    esHoy(date) ? 'bg-emerald-50' : '',
                    esProximaEntrega(date) ? 'bg-blue-50' : '',
                    !esFechaValida(date) ? 'opacity-50 cursor-not-allowed' : ''
                 ]">
                <!-- Contenedor principal del día -->
                <div class="p-2">
                    <!-- Día y fecha -->
                    <div class="text-center">
                        <div class="text-xs text-gray-500">
                            {{ formatearDiaSemana(date) }}
                        </div>
                        <div class="font-medium" :class="{'text-emerald-600': esFechaSeleccionada(date)}">
                            {{ date.getDate() }}
                        </div>
                    </div>

                    <!-- Eventos del día (versión compacta) -->
                    <div v-if="eventosStore.tieneEventos(date)"
                         class="mt-1">
                        <div class="text-xs text-center px-1 py-0.5 bg-[#4C9F38]/10 rounded truncate"
                             :style="{ color: '#4C9F38' }">
                            {{ eventosStore.eventosPorFecha(date)[0].nombre }}
                            <span v-if="eventosStore.eventosPorFecha(date).length > 1">
                                +{{ eventosStore.eventosPorFecha(date).length - 1 }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Tooltip detallado de eventos -->
                <div v-if="eventosStore.tieneEventos(date)"
                     class="absolute left-0 right-0 top-full mt-1 z-20 hidden group-hover:block">
                    <div class="bg-white shadow-lg rounded-lg p-3 text-sm border border-gray-200">
                        <div v-for="evento in eventosStore.eventosPorFecha(date)"
                             :key="evento.evento_id"
                             class="mb-2 last:mb-0">
                            <div class="font-medium" :style="{ color: '#4C9F38' }">
                                {{ evento.nombre }}
                            </div>
                            <div class="text-xs text-gray-500" v-if="evento.descripcion">
                                {{ evento.descripcion }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed } from 'vue';
    import { useEventosStore } from '@/stores/eventos';

    const props = defineProps({
        modelValue: {
            type: Date,
            required: true
        }
    });

    const emit = defineEmits(['update:modelValue']);

    const eventosStore = useEventosStore();

    // Generar array con los próximos 11 días
    const proximosDias = computed(() => {
        const dias = [];
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        for (let i = 0; i < 11; i++) {
            const fecha = new Date(hoy);
            fecha.setDate(hoy.getDate() + i);
            dias.push(fecha);
        }
        return dias;
    });

    const formatearDiaSemana = (fecha) => {
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return dias[fecha.getDay()];
    };

    const esHoy = (fecha) => {
        const hoy = new Date();
        return fecha.toDateString() === hoy.toDateString();
    };

    const esFechaSeleccionada = (fecha) => {
        if (!props.modelValue) return false;
        return fecha.toDateString() === props.modelValue.toDateString();
    };

    const esProximaEntrega = (fecha) => {
        const dia = fecha.getDay();
        return (dia === 3 || dia === 6) && esFechaValida(fecha);
    };

    const esFechaValida = (fecha) => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        return fecha >= hoy;
    };

    const seleccionarFecha = (fecha) => {
        if (!esFechaValida(fecha)) return;
        emit('update:modelValue', fecha);
    };
</script>