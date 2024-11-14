<script setup>
    import { ref, onMounted, computed } from 'vue';
    import { Calendar, ChevronLeft, ChevronRight, X, Info, Plus } from 'lucide-vue-next';
    import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';

    const currentDate = ref(new Date());
    const eventos = ref([]);
    const feriados = ref([]);
    const selectedDate = ref(null);
    const showEventDetails = ref(false);
    const isEventModalOpen = ref(false);

    // Filtros (nueva funcionalidad)
    const filters = ref({
        showFeriados: true,
        showEventos: true
    });

    // Formulario para eventos (nueva funcionalidad)
    const eventForm = ref({
        nombre: '',
        fecha: '',
        descripcion: '',
        tipo: 'evento'
    });

    // Función para cargar feriados (mantenemos la original)
    const cargarFeriados = async () => {
        try {
            const response = await fetch('https://api.argentinadatos.com/v1/feriados/2024');
            const data = await response.json();
            feriados.value = data.map(f => ({
                ...f,
                fecha: new Date(f.fecha),
                tipo: 'feriado'
            }));
        } catch (error) {
            console.error('Error cargando feriados:', error);
        }
    };

    // Computed properties (mantenemos la original y agregamos filtrado)
    const proximoFeriado = computed(() => {
        return feriados.value
            .filter(f => f.fecha > new Date())
            .sort((a, b) => a.fecha - b.fecha)[0];
    });

    const diasHastaProximoFeriado = computed(() => {
        if (!proximoFeriado.value) return null;
        return Math.ceil((proximoFeriado.value.fecha - new Date()) / (1000 * 60 * 60 * 24));
    });

    // Nuevo computed para eventos filtrados del mes
    const eventosDelMes = computed(() => {
        return [
            ...(filters.value.showEventos ? eventos.value : []),
            ...(filters.value.showFeriados ? feriados.value : [])
        ].filter(e => {
            const eventoDate = new Date(e.fecha);
            return eventoDate.getMonth() === currentDate.value.getMonth() &&
                eventoDate.getFullYear() === currentDate.value.getFullYear();
        });
    });

    // Methods (mantenemos los originales y agregamos nuevos)
    const openEventModal = (date = null) => {
        eventForm.value = {
            nombre: '',
            fecha: date ? new Date(date).toISOString().split('T')[0] : '',
            descripcion: '',
            tipo: 'evento'
        };
        isEventModalOpen.value = true;
    };

    const closeEventModal = () => {
        isEventModalOpen.value = false;
    };

    const saveEvent = () => {
        const newEvent = {
            ...eventForm.value,
            id: Date.now(),
            fecha: new Date(eventForm.value.fecha)
        };
        eventos.value.push(newEvent);
        closeEventModal();
    };

    const eliminarEvento = (id) => {
        eventos.value = eventos.value.filter(e => e.id !== id);
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
    };

    const getEventosDelDia = (date) => {
        return [
            ...(filters.value.showFeriados ? feriados.value : []),
            ...(filters.value.showEventos ? eventos.value : [])
        ].filter(e =>
            e.fecha.getDate() === date.getDate() &&
            e.fecha.getMonth() === date.getMonth() &&
            e.fecha.getFullYear() === date.getFullYear()
        );
    };

    const cambiarMes = (delta) => {
        const newDate = new Date(currentDate.value);
        newDate.setMonth(newDate.getMonth() + delta);
        currentDate.value = newDate;
    };

    onMounted(() => {
        cargarFeriados();
    });
</script>

<template>
    <div class="max-w-4xl mx-auto p-4">
        <!-- Contador de próximo feriado (mantenemos el original) -->
        <div v-if="proximoFeriado && filters.showFeriados" class="bg-white rounded-lg shadow p-4 mb-6">
            <div class="text-center">
                <h3 class="text-lg font-semibold text-gray-800">Faltan</h3>
                <p class="text-4xl font-bold text-emerald-600 my-2">
                    {{ diasHastaProximoFeriado }} {{ diasHastaProximoFeriado === 1 ? 'DÍA' : 'DÍAS' }}
                </p>
                <p class="text-gray-600">
                    para el próximo feriado que es el
                    <span class="font-medium">
                        {{
 new Intl.DateTimeFormat('es-AR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        }).format(proximoFeriado.fecha)
                        }}
                    </span>
                </p>
                <p class="text-sm text-gray-500 mt-1">{{ proximoFeriado.nombre }}</p>
            </div>
        </div>

        <!-- Filtros (nueva funcionalidad) -->
        <div class="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg mb-6">
            <div class="flex items-center space-x-2">
                <input type="checkbox"
                       id="showFeriados"
                       v-model="filters.showFeriados"
                       class="rounded text-red-500 focus:ring-red-500">
                <label for="showFeriados" class="text-sm text-gray-600">Feriados</label>
            </div>
            <div class="flex items-center space-x-2">
                <input type="checkbox"
                       id="showEventos"
                       v-model="filters.showEventos"
                       class="rounded text-blue-500 focus:ring-blue-500">
                <label for="showEventos" class="text-sm text-gray-600">Eventos</label>
            </div>
        </div>

        <!-- Calendario (mantenemos el diseño original) -->
        <div class="bg-white rounded-lg shadow">
            <div class="flex items-center justify-between p-4 border-b">
                <button @click="cambiarMes(-1)"
                        class="p-2 hover:bg-gray-100 rounded-full">
                    <ChevronLeft class="w-5 h-5" />
                </button>

                <h2 class="text-lg font-semibold">
                    {{ new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(currentDate) }}
                </h2>

                <button @click="cambiarMes(1)"
                        class="p-2 hover:bg-gray-100 rounded-full">
                    <ChevronRight class="w-5 h-5" />
                </button>
            </div>

            <!-- Grilla del calendario -->
            <div class="grid grid-cols-7 gap-px bg-gray-200">
                <div v-for="day in ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']"
                     :key="day"
                     class="bg-gray-50 p-2 text-center text-sm font-medium">
                    {{ day }}
                </div>

                <div v-for="(date, i) in getDaysInMonth(currentDate)"
                     :key="i"
                     :class="[
                     'bg-white p-2 min-h-[80px] relative group' ,
                     { 'bg-red-50' : getEventosDelDia(date).some(e=>
                    e.tipo === 'feriado') }
                    ]"
                    @mouseenter="selectedDate = date"
                    @mouseleave="selectedDate = null">
                    <div class="flex justify-between items-start">
                        <span :class="[
                            'text-sm',
                            { 'text-red-500': date.getDay() === 0 }
                        ]">
                            {{ date.getDate() }}
                        </span>
                        <button v-if="getEventosDelDia(date).length > 0"
                                class="p-1 hover:bg-gray-100 rounded-full">
                            <Info class="w-4 h-4 text-gray-400" />
                        </button>
                    </div>

                    <div v-for="evento in getEventosDelDia(date)"
                         :key="evento.id || evento.fecha"
                         :class="[
                            'text-xs mt-1 p-1 rounded flex justify-between items-center',
                            evento.tipo === 'feriado'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                         ]">
                        <span class="truncate">{{ evento.nombre || evento.motivo }}</span>
                        <button v-if="evento.tipo !== 'feriado'"
                                @click="eliminarEvento(evento.id)"
                                class="ml-1 text-gray-500 hover:text-gray-700">
                            <X class="w-3 h-3" />
                        </button>
                    </div>

                    <!-- Botón para agregar evento (nueva funcionalidad) -->
                    <button class="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-gray-100 rounded-full hover:bg-gray-200"
                            @click="openEventModal(date)">
                        <Plus class="w-4 h-4 text-gray-600" />
                    </button>
                </div>
            </div>
        </div>

        <!-- Panel de detalles (modificado para mostrar solo eventos del mes) -->
        <div class="mt-6 bg-white rounded-lg shadow p-4">
            <h3 class="font-semibold mb-4">Eventos del mes</h3>
            <div class="space-y-2">
                <div v-for="evento in eventosDelMes"
                     :key="evento.id || evento.fecha"
                     :class="[
                        'p-3 rounded-lg',
                        { 'bg-gray-100': new Date(evento.fecha).getTime() === selectedDate?.getTime() }
                     ]">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-medium">{{ evento.nombre || evento.motivo }}</p>
                            <p class="text-sm text-gray-500">
                                {{
 new Intl.DateTimeFormat('es-AR', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long'
                                }).format(new Date(evento.fecha))
                                }}
                            </p>
                        </div>
                        <span :class="[
                            'text-xs px-2 py-1 rounded',
                            evento.tipo === 'feriado'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                        ]">
                            {{ evento.tipo === 'feriado' ? 'Feriado' : 'Evento' }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal para nuevo evento (nueva funcionalidad) -->
        <Dialog as="div" @close="closeEventModal" :open="isEventModalOpen" class="relative z-50">
            <div class="fixed inset-0 bg-black/30" />

            <div class="fixed inset-0 overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                        <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4">
                            Nuevo Evento
                        </DialogTitle>

                        <form @submit.prevent="saveEvent" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre
                                </label>
                                <input type="text"
                                       v-model="eventForm.nombre"
                                       required
                                       class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha
                                </label>
                                <input type="date"
                                       v-model="eventForm.fecha"
                                       required
                                       class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción
                                </label>
                                <textarea v-model="eventForm.descripcion"
                                          rows="3"
                                          class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"></textarea>
                            </div>

                            <div class="flex justify-end space-x-3 pt-4">
                                <button type="button"
                                        @click="closeEventModal"
                                        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                                    Cancelar
                                </button>
                                <button type="submit"
                                        class="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    </div>
</template>
