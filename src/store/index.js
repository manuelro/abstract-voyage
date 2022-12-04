/* eslint-disable import/prefer-default-export */
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGlobalStore = defineStore('global', () => {
  const title = ref('Welcome');
  const service = ref(null);

  return { title, service };
});
