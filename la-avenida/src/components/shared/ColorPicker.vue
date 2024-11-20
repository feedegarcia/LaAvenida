<template>
    <div class="flex flex-col gap-2">
        <label :for="id" class="block text-sm font-medium text-gray-700">
            <slot>Color</slot>
        </label>
        <div class="flex items-center gap-3">
            <div class="relative">
                <input type="color"
                       :id="id"
                       :value="modelValue"
                       @input="$emit('update:modelValue', $event.target.value)"
                       class="w-10 h-10 rounded cursor-pointer">
                <div class="absolute inset-0 pointer-events-none border rounded"
                     :style="{ borderColor: modelValue === '#FFFFFF' ? '#D1D5DB' : modelValue }" />
            </div>
            <input type="text"
                   :value="modelValue"
                   @input="handleHexInput"
                   class="px-3 py-2 border rounded-md text-sm w-28"
                   placeholder="#FFFFFF"
                   maxlength="7">
            <button type="button"
                    @click="$emit('update:modelValue', '#FFFFFF')"
                    class="px-2 py-1 text-xs text-gray-600 hover:text-gray-900">
                Resetear
            </button>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '#FFFFFF'
  },
  id: {
    type: String,
    default: () => `color-picker-${Math.random().toString(36).substring(2, 9)}`
  }
});

const emit = defineEmits(['update:modelValue']);

const handleHexInput = (event) => {
  let value = event.target.value;

  // Asegurar que empiece con #
  if (!value.startsWith('#')) {
    value = '#' + value;
  }

  // Validar formato hexadecimal
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
    emit('update:modelValue', value.toUpperCase());
  }
};
</script>