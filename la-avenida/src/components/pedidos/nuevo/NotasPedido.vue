<template>
    <div class="mt-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">
            Notas del pedido:
        </label>
        <textarea :value="modelValue"
                  @input="$emit('update:modelValue', $event.target.value)"
                  placeholder="Agregar notas o comentarios al pedido..."
                  rows="3"
                  class="w-full border rounded-md px-3 py-2 shadow-sm focus:ring-avenida-green focus:border-avenida-green resize-none"></textarea>
    </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    default: ''
  }
});

defineEmits(['update:modelValue']);
</script>   