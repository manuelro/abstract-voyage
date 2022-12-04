<!-- eslint-disable max-len -->
<script setup>
const props = defineProps({
  attrs: {
    type: Object,
    default: () => ({}),
  },
  error: {
    type: String,
    default: null,
  },
});
</script>

<template>
  <div>
    <div class="relative flex w-full">
      <div class="absolute">
        <slot name="prepend" />
      </div>
      <input
        type="text"
        v-bind="$attrs"
        :class="[
          'border border-slate-300 rounded-t-md text-xl px-4 py-2 focus:outline-none focus:ring focus:ring-sky-100 focus:border-slate-400 w-full',
          { 'rounded-b-md': !props.error }
        ]"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <div class="absolute right-0">
        <slot name="append" />
      </div>
    </div>
    <div
      v-if="props.error"
      class="text-xs rounded-b-md border border-orange-200 bg-orange-50 px-4 py-2 text-orange-900"
    >
      {{props.error}}
    </div>
  </div>
</template>
