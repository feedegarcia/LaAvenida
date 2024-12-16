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
                Pronostico para el dia seleccionado
            </h3>

            <div class="grid grid-cols-3 gap-2">
                <div v-for="(dia, index) in diasPronostico.slice(0, 3)"
                     :key="index"
                     :class="[
              'text-center p-2 rounded-lg',
              dia.esDiaPedido ? 'bg-emerald-50 border border-emerald-200' : ''
            ]">
                    <p class="text-sm mb-1">{{ formatearFecha(dia.fecha) }}</p>

                    <div class="w-6 h-6 mx-auto">
                        <component :is="obtenerIconoClima(dia.clima)"
                                   class="w-full h-full"
                                   :class="obtenerColorIcono(dia.clima)" />
                    </div>

                    <div class="mt-1 space-y-0.5">
                        <p class="text-xs">{{ Math.round(dia.tempMax) }}° max</p>
                        <p class="text-xs text-gray-600">{{ Math.round(dia.tempMin) }}° min</p>
                        <p class="text-xs text-gray-500">
                            {{ dia.probLluvia }}% lluvia
                        </p>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup>
    import { ref, computed, watch } from 'vue';
    import {
        Cloud,
        Sun,
        CloudRain,
        CloudLightning,
        CloudDrizzle,
        LoaderIcon
    } from 'lucide-vue-next';

    // Constantes para la API
    const LAT = -34.6021;
    const LON = -58.5915;
    const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 horas

    const props = defineProps({
        fechaPedido: {
            type: [Date, String],
            required: true,
            validator: (value) => {
                try {
                    const date = value instanceof Date ? value : new Date(value);
                    return !isNaN(date.getTime());
                } catch {
                    return false;
                }
            }
        }
    });

    const pronostico = ref([]);
    const loading = ref(false);
    const error = ref(null);

    // Sistema de cache mejorado
    const cacheKey = computed(() => {
        const fecha = props.fechaPedido instanceof Date ?
            props.fechaPedido : new Date(props.fechaPedido);
        return `forecast-${fecha.toISOString().split('T')[0]}`;
    });

    const checkCache = (key) => {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > CACHE_DURATION) {
            localStorage.removeItem(key);
            return null;
        }

        return data;
    };

    const setCache = (key, data) => {
        localStorage.setItem(key, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    };

    // Computed para procesar datos del pronostico
    const diasPronostico = computed(() => {
        if (!pronostico.value.length) return [];

        const fechaPedidoObj = new Date(props.fechaPedido);
        fechaPedidoObj.setHours(0, 0, 0, 0);

        const fechaBase = new Date(fechaPedidoObj);
        fechaBase.setDate(fechaBase.getDate() - 1);

        return Array.from({ length: 3 }).map((_, index) => {
            const fecha = new Date(fechaBase);
            fecha.setDate(fecha.getDate() + index);

            const pronosticoDia = pronostico.value[index] || {};

            return {
                fecha,
                esDiaPedido: fecha.toDateString() === fechaPedidoObj.toDateString(),
                tempMax: pronosticoDia.temperature_2m_max || 0,
                tempMin: pronosticoDia.temperature_2m_min || 0,
                probLluvia: pronosticoDia.precipitation_probability_max || 0,
                clima: determinarCondicionClima(
                    pronosticoDia.precipitation_probability_max,
                    pronosticoDia.weathercode
                )
            };
        });
    });

    // Funciones de utilidad
    const determinarCondicionClima = (probLluvia, weathercode) => {
        if (!weathercode) return 'nublado';

        if (probLluvia >= 60) return 'lluvia';
        if (weathercode === 0) return 'sol';
        if ([1, 2, 3].includes(weathercode)) return 'nublado';
        if ([95, 96, 99].includes(weathercode)) return 'tormenta';
        if ([71, 73, 75, 77, 85, 86].includes(weathercode)) return 'nieve';
        if ([51, 53, 55, 56, 57].includes(weathercode)) return 'lluvia-leve';

        return 'nublado';
    };

    const obtenerIconoClima = (clima) => ({
        'lluvia': CloudRain,
        'lluvia-leve': CloudDrizzle,
        'sol': Sun,
        'nublado': Cloud,
        'tormenta': CloudLightning,
        'nieve': CloudDrizzle
    }[clima] || Cloud);

    const obtenerColorIcono = (clima) => ({
        'lluvia': 'text-blue-600',
        'lluvia-leve': 'text-blue-400',
        'sol': 'text-yellow-400',
        'nublado': 'text-gray-400',
        'tormenta': 'text-gray-600',
        'nieve': 'text-blue-200'
    }[clima] || 'text-gray-400');

    const formatearFecha = (fecha) => {
        return new Intl.DateTimeFormat('es-AR', {
            weekday: 'short',
            day: 'numeric'
        }).format(fecha);
    };

    // Carga de datos
    const cargarPronostico = async () => {
        try {
            loading.value = true;
            error.value = null;

            // Verificar cache
            const cachedData = checkCache(cacheKey.value);
            if (cachedData) {
                pronostico.value = cachedData;
                return;
            }

            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?` +
                `latitude=${LAT}&longitude=${LON}` +
                `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
                `&timezone=America/Argentina/Buenos_Aires` +
                `&forecast_days=7`
            );

            if (!response.ok) {
                throw new Error('Error al cargar el pronostico');
            }

            const data = await response.json();

            if (!data.daily?.time) {
                throw new Error('Formato de datos invalido');
            }

            const formattedData = data.daily.time.map((fecha, index) => ({
                temperature_2m_max: data.daily.temperature_2m_max[index],
                temperature_2m_min: data.daily.temperature_2m_min[index],
                precipitation_probability_max: data.daily.precipitation_probability_max[index],
                weathercode: data.daily.weathercode[index]
            }));

            setCache(cacheKey.value, formattedData);
            pronostico.value = formattedData;
        } catch (error) {
            console.error('Error en cargarPronostico:', error);
            error.value = 'No se pudo cargar el pronostico del tiempo';
        } finally {
            loading.value = false;
        }
    };

    // Watchers
    watch(() => props.fechaPedido, () => {
        if (props.fechaPedido) {
            cargarPronostico();
        }
    }, { immediate: true });
</script>