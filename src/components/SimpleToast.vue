<script setup>
import { computed } from 'vue';

const props = defineProps({
  type: {
    type: String,
    default: 'DEFAULT',
  },
});

const config = {
  SUCCESS: 'bg-teal-500',
  ERROR: 'bg-red-400',
  WARNING: 'bg-orange-300',
  DEFAULT: 'bg-sky-500',
};

const typeClass = computed(() => config[props.type]);
</script>

<template>
  <div :class="['px-6 py-4 text-white font-semibold', typeClass]">
    <slot />
  </div>
</template>
