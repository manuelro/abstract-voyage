<script setup>
import { useRoute } from 'vue-router';
import SimpleSubtitle from './SimpleSubtitle.vue';
import SimpleLink from './SimpleLink.vue';
import { useGlobalStore } from '../store/index.js';

const route = useRoute();
const store = useGlobalStore();
</script>

<template>
  <nav>
    <ul class="flex">
      <li
        v-if="!route.meta.isHome"
        class="border-slate-300 border-r pr-4 mr-4"
      >
          <SimpleSubtitle class="flex items-center font-bold">
            <SimpleLink to="/">
              Home
            </SimpleLink>
          </SimpleSubtitle>
      </li>
      <li>
        <SimpleSubtitle class="flex items-center font-bold">
          <slot />
          {{ store.title }}
        </SimpleSubtitle>
      </li>
    </ul>
  </nav>
</template>
