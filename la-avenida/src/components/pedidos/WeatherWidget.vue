<template>
    <div class="bg-white rounded-lg shadow-lg p-4 mb-6">
        <h3 class="text-lg font-semibold mb-4">Pronóstico para el período</h3>

        <div class="grid grid-cols-5 gap-4">
            <div v-for="(dia, index) in diasPronostico"
                 :key="index"
                 :class="[
                    'text-center p-3 border rounded-lg',
                    dia.esDiaPedido ? 'border-2 border-emerald-500 bg-emerald-50' : ''
                 ]">
                <p :class="[
                    'text-sm mb-2',
                    dia.esDiaPedido ? 'font-semibold text-emerald-700' : 'text-gray-600'
                ]">
                    {{ formatearFecha(dia.fecha) }}
                </p>

                <component :is="obtenerIconoClima(dia.clima)"
                           class="w-8 h-8 mx-auto"
                           :class="obtenerColorIcono(dia.clima)" />

                <div class="mt-2">
                    <p class="text-sm">{{ Math.round(dia.tempMax) }}° max</p>
                    <p class="text-sm text-gray-600">{{ Math.round(dia.tempMin) }}° min</p>
                </div>

                <div class="mt-1 text-xs text-gray-500">
                    <p>Prob. lluvia: {{ dia.probLluvia }}%</p>
                </div>

                <template v-if="dia.esDiaPedido">
                    <p class="text-xs text-emerald-700 mt-1">Día del pedido</p>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed, onMounted, watch } from 'vue';
    import { Cloud, Sun, CloudRain, CloudLightning, CloudDrizzle } from 'lucide-vue-next';

    // Coordenadas de Haedo
    const LAT = -34.6457;
    const LON = -58.5931;

    const props = defineProps({
        fechaPedido: {
            type: [Date, String],
            required: true
        }
    });

    const pronostico = ref([]);
    const loading = ref(false);
    const error = ref(null);

    const diasPronostico = computed(() => {
        if (!props.fechaPedido || !pronostico.value.length) return [];

        const fechaBase = new Date(props.fechaPedido);
        fechaBase.setDate(fechaBase.getDate() - 2);

        return Array.from({ length: 5 }).map((_, index) => {
            const fecha = new Date(fechaBase);
            fecha.setDate(fecha.getDate() + index);

            const pronosticoDia = pronostico.value[index] || {};

            return {
                fecha,
                esDiaPedido: fecha.toDateString() === new Date(props.fechaPedido).toDateString(),
                tempMax: pronosticoDia.temperature_2m_max,
                tempMin: pronosticoDia.temperature_2m_min,
                probLluvia: pronosticoDia.precipitation_probability_max,
                clima: obtenerCondicionClima(
                    pronosticoDia.precipitation_probability_max,
                    pronosticoDia.weathercode
                )
            };
        });
    });

    const obtenerCondicionClima = (probLluvia, weathercode) => {
        if (!weathercode) return 'nublado';

        // Códigos según OpenMeteo
        if (probLluvia >= 60) return 'lluvia';
        if (weathercode === 0) return 'sol'; // Clear sky
        if ([1, 2, 3].includes(weathercode)) return 'nublado'; // Partly cloudy
        if ([95, 96, 99].includes(weathercode)) return 'tormenta'; // Thunderstorm
        if ([71, 73, 75, 77, 85, 86].includes(weathercode)) return 'nieve'; // Snow
        if ([51, 53, 55, 56, 57].includes(weathercode)) return 'lluvia-leve'; // Drizzle
        return 'nublado';
    };

    const obtenerIconoClima = (clima) => {
        const iconos = {
            'lluvia': CloudRain,
            'lluvia-leve': CloudDrizzle,
            'sol': Sun,
            'nublado': Cloud,
            'tormenta': CloudLightning
        };
        return iconos[clima] || Cloud;
    };

    const obtenerColorIcono = (clima) => {
        const colores = {
            'lluvia': 'text-blue-600',
            'lluvia-leve': 'text-blue-400',
            'sol': 'text-yellow-400',
            'nublado': 'text-gray-400',
            'tormenta': 'text-gray-600',
            'nieve': 'text-blue-200'
        };
        return colores[clima] || 'text-gray-400';
    };

    const formatearFecha = (fecha) => {
        return new Intl.DateTimeFormat('es-AR', {
            weekday: 'short',
            day: 'numeric'
        }).format(fecha);
    };

    const cargarPronostico = async () => {
        try {
            loading.value = true;
            error.value = null;

            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?` +
                `latitude=${LAT}&longitude=${LON}` +
                `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
                `&timezone=America/Argentina/Buenos_Aires`
            );

            if (!response.ok) throw new Error('Error al cargar el pronóstico');

            const data = await response.json();
            // Convertir los datos a nuestro formato
            pronostico.value = data.daily.time.map((fecha, index) => ({
                temperature_2m_max: data.daily.temperature_2m_max[index],
                temperature_2m_min: data.daily.temperature_2m_min[index],
                precipitation_probability_max: data.daily.precipitation_probability_max[index],
                weathercode: data.daily.weathercode[index]
            }));
        } catch (err) {
            error.value = 'Error al cargar el pronóstico';
            console.error('Error:', err);
        } finally {
            loading.value = false;
        }
    };

    watch(() => props.fechaPedido, () => {
        if (props.fechaPedido) cargarPronostico();
    });

    onMounted(() => {
        if (props.fechaPedido) cargarPronostico();
    });
</script>