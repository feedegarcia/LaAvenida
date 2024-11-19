<template>
    <div class="bg-white rounded-lg shadow-lg p-4 mb-6 max-w-sm">
        <!-- Loading state -->
        <div v-if="loading" class="flex items-center justify-center h-24">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-red-500 text-center p-4">
            <p>{{ error }}</p>
        </div>

        <!-- Contenido principal -->
        <template v-else>
            <h3 class="text-base font-semibold mb-2">
                Pronóstico para el día seleccionado
            </h3>

            <div class="grid grid-cols-3 gap-2">
                <div v-for="(dia, index) in diasPronostico.slice(0, 3)"
                     :key="index"
                     :class="[
                        'text-center p-2 rounded-lg',
                        dia.esDiaPedido ? 'bg-emerald-50 border border-emerald-200' : ''
                     ]">
                    <p class="text-sm mb-1">{{ formatearFecha(dia.fecha) }}</p>

                    <component :is="obtenerIconoClima(dia.clima)"
                               class="w-6 h-6 mx-auto"
                               :class="obtenerColorIcono(dia.clima)" />

                    <div class="mt-1">
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
    import { ref, computed, onMounted, watch } from 'vue';
    import { Cloud, Sun, CloudRain, CloudLightning, CloudDrizzle } from 'lucide-vue-next';

    const debounce = (fn, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
        };
    };

    // Coordenadas exactas de Haedo
    const LAT = -34.6021;
    const LON = -58.5915;

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

    // Sistema de caché mejorado
    const getCacheKey = (fecha) => {
        const date = fecha instanceof Date ? fecha : new Date(fecha);
        return `forecast-${date.toISOString().split('T')[0]}`;
    };
    const checkCache = (key) => {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        // Expirar el caché después de 3 horas
        if (Date.now() - timestamp > 3 * 60 * 60 * 1000) {
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
    const diasPronostico = computed(() => {
        if (!props.fechaPedido || !pronostico.value.length) return [];

        const fechaPedidoObj = props.fechaPedido instanceof Date ?
            props.fechaPedido :
            new Date(props.fechaPedido);

        // Asegurarse de que la fecha sea válida
        if (isNaN(fechaPedidoObj.getTime())) return [];

        const fechaBase = new Date(fechaPedidoObj);
        fechaBase.setHours(0, 0, 0, 0); // Resetear la hora a medianoche
        fechaBase.setDate(fechaBase.getDate() - 2);

        return Array.from({ length: 5 }).map((_, index) => {
            const fecha = new Date(fechaBase);
            fecha.setDate(fecha.getDate() + index);

            const pronosticoDia = pronostico.value[index] || {};

            return {
                fecha,
                esDiaPedido: fecha.toDateString() === fechaPedidoObj.toDateString(),
                tempMax: pronosticoDia.temperature_2m_max || 0,
                tempMin: pronosticoDia.temperature_2m_min || 0,
                probLluvia: pronosticoDia.precipitation_probability_max || 0,
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

            const cacheKey = getCacheKey(props.fechaPedido);
            const cachedData = checkCache(cacheKey);

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
                throw new Error('Error al cargar el pronóstico');
            }

            const data = await response.json();

            if (!data.daily || !Array.isArray(data.daily.time)) {
                throw new Error('Formato de datos inválido');
            }

            const formattedData = data.daily.time.map((fecha, index) => ({
                temperature_2m_max: data.daily.temperature_2m_max[index],
                temperature_2m_min: data.daily.temperature_2m_min[index],
                precipitation_probability_max: data.daily.precipitation_probability_max[index],
                weathercode: data.daily.weathercode[index]
            }));

            // Guardar en caché
            setCache(cacheKey, formattedData);
            pronostico.value = formattedData;
        } catch (err) {
            error.value = 'No se pudo cargar el pronóstico del tiempo';
            console.error('Error en cargarPronostico:', err);
        } finally {
            loading.value = false;
        }
    };

    // Observar cambios en fechaPedido y recargar datos cuando sea necesario
    watch(
        () => props.fechaPedido,
        (newDate) => {
            if (!newDate) return;

            const fecha = new Date(newDate);
            fecha.setHours(0, 0, 0, 0);
            cargarPronostico();
        },
        { immediate: true }
    );

    // Cargar datos iniciales al montar el componente
    onMounted(() => {
        if (props.fechaPedido) {
            cargarPronostico();
        }
    });
</script>
