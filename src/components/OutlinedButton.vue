<!-- eslint-disable max-len -->
<template>
  <button
    class="flex justify-between px-2 py-2 rounded-md border border-indigo-500 text-indigo-800 text-xl items-center"
  >
    <slot name="prepend" />
    <slot />
    <slot name="append" />
  </button>
</template>
