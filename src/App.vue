<script setup>

</script>

<template>
  <router-view v-slot="{ Component }">

    <component :is="Component" :key="$route.fullPath"/>

  </router-view>
</template>

<style>
/* Slide-left transition */
.slide-left-enter-active, .slide-left-leave-active {
  transition: transform 0.35s ease;
}

.slide-left-enter, .slide-left-leave-to /* .slide-left-leave-active in <2.1.8 */
{
  transform: translateX(100%);
}

/* Slide-right transition */
.slide-right-enter-active, .slide-right-leave-active {
  transition: transform 0.35s ease;
}

.slide-right-enter, .slide-right-leave-to /* .slide-right-leave-active in <2.1.8 */
{
  transform: translateX(-100%);
}

</style>