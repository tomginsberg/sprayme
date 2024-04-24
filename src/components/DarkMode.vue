<template>
  <div class="pt-1">

    <button
        @click="toggleTheme"
        id="theme-toggle"
        type="button"
        class="focus:ring-none rounded-lg p-1 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 dark:focus:ring-gray-800"
    >
      <svg v-show="theme === 'light'"
           id="theme-toggle-dark-icon"
           class="h-5 w-5"
           fill="currentColor"
           viewBox="0 0 20 20"
           xmlns="http://www.w3.org/2000/svg"
      >
        <path
            d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
        ></path>
      </svg>
      <svg
          v-show="theme === 'dark'"
          id="theme-toggle-light-icon"
          class="h-5 w-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
      >
        <path
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            fill-rule="evenodd"
            clip-rule="evenodd"
        ></path>
      </svg>
    </button>
  </div>
</template>

<script setup>

import {ref, onMounted} from 'vue';

const theme = ref(null);
onMounted(() => {
  const html = document.documentElement;
  const currentTheme = localStorage.getItem('color-theme') || 'light';
  theme.value = currentTheme;
  html.classList.add(currentTheme);
});

function toggleTheme() {
  const html = document.documentElement;
  const dark = 'dark';
  const light = 'light';
  const currentTheme = localStorage.getItem('color-theme') || light;
  const nextTheme = currentTheme === light ? dark : light;
  theme.value = nextTheme;

  html.classList.remove(currentTheme);
  html.classList.add(nextTheme);
  localStorage.setItem('color-theme', nextTheme);
}
</script>
