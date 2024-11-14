<template>
    <div class="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
        <div class="flex items-center space-x-2">
            <input type="checkbox"
                   id="showFeriados"
                   v-model="modelValue.showFeriados"
                   @change="updateFilters"
                   class="rounded text-avenida-green focus:ring-avenida-green">
            <label for="showFeriados" class="text-sm text-gray-600">Feriados</label>
        </div>
        <div class="flex items-center space-x-2">
            <input type="checkbox"
                   id="showEventos"
                   v-model="modelValue.showEventos"
                   @change="updateFilters"
                   class="rounded text-avenida-green focus:ring-avenida-green">
            <label for="showEventos" class="text-sm text-gray-600">Eventos</label>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    modelValue: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['update:modelValue'])

const updateFilters = () => {
    emit('update:modelValue', props.modelValue)
}
</script>
