<template>
    <div v-if="proximoEvento" class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="text-center">
            <h3 class="text-lg font-semibold text-gray-800">Próximo Evento</h3>
            <p class="text-4xl font-bold text-emerald-600 my-2">
                {{ diasRestantes }} {{ diasRestantes === 1 ? 'DÍA' : 'DÍAS' }}
            </p>
            <p class="text-gray-600">
                para <span class="font-medium">{{ proximoEvento.nombre }}</span>
                el <span class="font-medium">{{ formatoFecha(proximoEvento.fecha_inicio) }}</span>
            </p>
            <p class="text-sm text-gray-500 mt-1">
                {{ proximoEvento.tipo_nombre || 'Sin categoría' }}
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import axios from '@/utils/axios-config';

const eventos = ref([]);

const proximoEvento = computed(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    return eventos.value
        .filter(evento => {
            const fechaEvento = new Date(evento.fecha_inicio);
            fechaEvento.setHours(0, 0, 0, 0);
            return fechaEvento >= hoy;
        })
        .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio))[0];
});

const diasRestantes = computed(() => {
    if (!proximoEvento.value) return 0;
    
    const hoy = new Date();
    const fechaEvento = new Date(proximoEvento.value.fecha_inicio);
    
    // Normalizar las fechas para ignorar las horas
    hoy.setHours(0, 0, 0, 0);
    fechaEvento.setHours(0, 0, 0, 0);
    
    const diferencia = fechaEvento - hoy;
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
});

const formatoFecha = (fecha) => {
    return new Intl.DateTimeFormat('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(new Date(fecha));
};

const cargarEventos = async () => {
    try {
        const response = await axios.get('/api/eventos', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        eventos.value = response.data;
    } catch (error) {
        console.error('Error cargando eventos:', error);
    }
};

// Agregar un watcher para recargar eventos cuando cambie algo
watch(() => eventos.value, () => {
    console.log('Eventos actualizados, recalculando próximo evento');
}, { deep: true });

// Cargar eventos inicialmente
onMounted(() => {
    cargarEventos();
    
    // Actualizar cada minuto para mantener el contador al día
    setInterval(() => {
        cargarEventos();
    }, 60000);
});
</script>