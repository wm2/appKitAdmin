import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUiStore = defineStore('ui', () => {
  const isLeftDrawerOpen = ref(false);

  function toggleLeftDrawer() {
    isLeftDrawerOpen.value = !isLeftDrawerOpen.value;
  }

  return {
    isLeftDrawerOpen,
    toggleLeftDrawer,
  };
});