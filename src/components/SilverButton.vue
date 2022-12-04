<template>
  <button
    class="flex justify-between bg-gradient-to-b from-slate-50 to-slate-100 px-2 py-2 rounded-md"
  >
    <slot name="prepend" />
    <slot />
    <slot name="append" />
  </button>
</template>
