<script setup>
    import { ref, watch } from 'vue';
    import {
        Cloud,
        Sun,
        CloudRain,
        CloudLightning,
        CloudDrizzle,
        LoaderIcon,
        ChevronUp,
        ChevronDown
    } from 'lucide-vue-next';

    const props = defineProps({
        fechaPedido: {
            type: [Date, String],
            required: true
        }
    });

    const pronostico = ref([]);
    const loading = ref(false);
    const error = ref(null);

    const LAT = -34.6021;
    const LON = -58.5915;

    // Computed para procesar datos del pronostico
    const diasPronostico = ref([]);

    const cargarPronostico = async () => {
        try {
            loading.value = true;
            error.value = null;

            // Limpiar datos anteriores
            pronostico.value = [];
            diasPronostico.value = [];

            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?` +
                `latitude=${LAT}&longitude=${LON}` +
                `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
                `&timezone=America/Argentina/Buenos_Aires` +
                `&forecast_days=7`
            );

            if (!response.ok) {
                throw new Error('Error al cargar el pronóstico');
            }

            const data = await response.json();

            if (!data.daily?.time) {
                throw new Error('Formato de datos inválido');
            }

            // Procesar datos
            const fechaPedidoObj = new Date(props.fechaPedido);
            fechaPedidoObj.setHours(0, 0, 0, 0);

            const formattedData = [];
            for (let i = 0; i < data.daily.time.length; i++) {
                const currentDate = new Date(data.daily.time[i]);
                formattedData.push({
                    fecha: currentDate,
                    esDiaPedido: currentDate.toDateString() === fechaPedidoObj.toDateString(),
                    tempMax: data.daily.temperature_2m_max[i],
                    tempMin: data.daily.temperature_2m_min[i],
                    probLluvia: data.daily.precipitation_probability_max[i],
                    weathercode: data.daily.weathercode[i]
                });
            }

            // Encontrar el índice del día seleccionado
            const selectedDayIndex = formattedData.findIndex(
                day => day.fecha.toDateString() === fechaPedidoObj.toDateString()
            );

            // Tomar el día anterior, el día seleccionado y el día siguiente
            const startIndex = Math.max(0, selectedDayIndex - 1);
            diasPronostico.value = formattedData.slice(startIndex, startIndex + 3);

        } catch (error) {
            console.error('Error en cargarPronostico:', error);
            error.value = 'No se pudo cargar el pronóstico del tiempo';
        } finally {
            loading.value = false;
        }
    };

    const determinarCondicionClima = (probLluvia, weathercode) => {
        // Códigos según https://open-meteo.com/en/docs#weathervariables
        switch (true) {
            // Despejado
            case weathercode === 0:
                return 'sol';

            // Mayormente despejado, parcialmente nublado
            case weathercode === 1:
            case weathercode === 2:
                return 'nublado';

            // Nublado
            case weathercode === 3:
                return 'nublado';

            // Niebla
            case [45, 48].includes(weathercode):
                return 'nublado';

            // Llovizna (ligera, moderada, densa)
            case [51, 53, 55].includes(weathercode):
                return 'lluvia-leve';

            // Lluvia (ligera, moderada, fuerte)
            case [61, 63, 65].includes(weathercode):
            case [80, 81, 82].includes(weathercode):
                return 'lluvia';

            // Nieve
            case [71, 73, 75, 77, 85, 86].includes(weathercode):
                return 'nieve';

            // Tormenta
            case [95, 96, 99].includes(weathercode):
                return 'tormenta';

            // Caso por defecto
            default:
                // Si no tenemos un código específico, nos basamos en la probabilidad
                if (probLluvia >= 60) return 'lluvia';
                if (probLluvia >= 30) return 'lluvia-leve';
                return 'nublado';
        }
    };

    const obtenerIconoClima = (dia) => {
        const clima = determinarCondicionClima(dia.probLluvia, dia.weathercode);
        return {
            'lluvia': CloudRain,
            'lluvia-leve': CloudDrizzle,
            'sol': Sun,
            'nublado': Cloud,
            'tormenta': CloudLightning,
            'nieve': CloudDrizzle,
            'parcialmente-nublado': Cloud 
        }[clima] || Cloud;
    };

    const obtenerColorIcono = (dia) => {
        const clima = determinarCondicionClima(dia.probLluvia, dia.weathercode);
        return {
            'lluvia': 'text-blue-600',
            'lluvia-leve': 'text-blue-400',
            'sol': 'text-amber-400',
            'nublado': 'text-gray-400',
            'tormenta': 'text-indigo-600', 
            'nieve': 'text-cyan-200',
            'parcialmente-nublado': 'text-gray-400'
        }[clima] || 'text-gray-400';
    };

    const formatearFecha = (fecha) => {
        return new Intl.DateTimeFormat('es-AR', {
            weekday: 'short',
            day: 'numeric'
        }).format(fecha);
    };

    // Watch simplificado que reacciona a cualquier cambio en la fecha
    watch(() => props.fechaPedido, (newDate) => {
        console.log('Nueva fecha seleccionada:', newDate);
        if (newDate) {
            cargarPronostico();
        }
    }, { immediate: true });

</script>

<template>
    <div class="bg-white rounded-lg shadow-lg p-4 mb-6 max-w-sm">
        <!-- Loading -->
        <div v-if="loading"
             class="flex items-center justify-center h-24">
            <LoaderIcon class="animate-spin w-6 h-6 text-emerald-500" />
        </div>

        <!-- Error -->
        <div v-else-if="error"
             class="text-red-500 text-center p-4">
            <p>{{ error }}</p>
        </div>

        <!-- Contenido -->
        <template v-else>
            <h3 class="text-base font-semibold mb-2">
                Pronóstico para el día seleccionado
            </h3>

            <div class="grid grid-cols-3 gap-2">
                <div v-for="dia in diasPronostico"
                     :key="dia.fecha.getTime()"
                     :class="[
                        'text-center p-2 rounded-lg',
                        dia.esDiaPedido ? 'bg-emerald-50 border border-emerald-200' : ''
                     ]">
                    <!-- Fecha -->
                    <p class="text-sm mb-1 font-medium">
                        {{ formatearFecha(dia.fecha) }}
                    </p>

                    <!-- Icono del clima con indicador de probabilidad -->
                    <div class="relative w-8 h-8 mx-auto">
                        <component :is="obtenerIconoClima(dia)"
                                   class="w-full h-full"
                                   :class="obtenerColorIcono(dia)" />

                        <!-- Indicador de probabilidad de lluvia -->
                        <div v-if="dia.probLluvia >= 30"
                             class="absolute -bottom-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-blue-100 border border-blue-200">
                            <span class="text-[8px] text-blue-600 font-medium">
                                {{ dia.probLluvia }}
                            </span>
                        </div>
                    </div>

                    <!-- Información de temperaturas -->
                    <div class="mt-2 space-y-1">
                        <!-- Temperatura máxima -->
                        <div class="flex items-center justify-center gap-1">
                            <ChevronUp class="w-3 h-3 text-red-500" />
                            <p class="text-xs font-medium">
                                {{ Math.round(dia.tempMax) }}°
                            </p>
                        </div>

                        <!-- Temperatura mínima -->
                        <div class="flex items-center justify-center gap-1">
                            <ChevronDown class="w-3 h-3 text-blue-500" />
                            <p class="text-xs font-medium text-gray-600">
                                {{ Math.round(dia.tempMin) }}°
                            </p>
                        </div>

                        <!-- Probabilidad de lluvia -->
                        <div class="flex items-center justify-center gap-1 mt-1">
                            <CloudRain class="w-3 h-3 text-blue-400" />
                            <p class="text-xs text-gray-500">
                                {{ dia.probLluvia }}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>