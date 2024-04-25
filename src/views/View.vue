<script setup>
import TopBar from "@/components/TopBar.vue";
import axios from "axios";
import Fuse from "fuse.js";
import {ref, onMounted, computed, watch} from "vue";
import {useRouter} from "vue-router";
import Button from "primevue/button";

const router = useRouter();
const endpoint = "https://spraypi.titanium.ddns.me";

const climbs = ref([]);

const searchTerm = ref("");
const options = {
  keys: ["name", "grade"],
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.2,
  isCaseSensitive: false,
};
const fuse = ref(new Fuse([], options));
watch(climbs, (newValue) => {
  fuse.value = new Fuse(newValue, options);
});
const filteredClimbs = computed(() => {
  if (!searchTerm.value.trim()) {
    return climbs.value;
  }
  return fuse.value.search(searchTerm.value).map((result) => result.item);
});

onMounted(async () => {
  const response = await axios.get(`${endpoint}/get_routes`);
  climbs.value = response.data;
});

function openClimb(index) {
  router.push(`/climb/${index}`);
}

</script>

<template>
  <TopBar v-model="searchTerm"/>
  <div class="pt-[7.25rem]">
    <div
        class="my-3 grid w-full grid-flow-dense grid-cols-1 gap-3 px-3 pb-32 md:grid-cols-3 lg:grid-cols-5"
    >
      <div
          v-for="(item, index) in filteredClimbs"
          @click="openClimb(item.name)"
          :key="index"
          class="bg-gray-200 text-gray-900 dark:bg-gray-800 flex transform cursor-pointer flex-col justify-between text-wrap break-words rounded-lg p-4 text-black transition duration-150 ease-in-out active:scale-95 dark:text-gray-100"
      >
        <div class="flex-auto">
          <div class="flex flex-wrap justify-between">
            <h2
                class="mr-3 truncate text-balance text-lg font-bold tracking-tight text-gray-900 dark:text-white"
            >
              {{ item.name.replaceAll('-', ' ') }}
            </h2>
            <p
                class="mt-[0.1rem] truncate font-normal tracking-tight text-gray-700 dark:text-gray-400"
            >
              {{
                item.grade
              }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>


  <div
      class="fixed z-50 w-16 h-16 max-w-lg -translate-x-1/2 bg-white border-gray-200 rounded-full bottom-4 left-1/2 dark:bg-gray-700 dark:border-gray-600">
    <div class="grid h-full max-w-lg grid-cols-1 mx-auto">

      <div class="flex items-center justify-center">
        <Button
            rounded
            icon="pi pi-plus"
            @click="openClimb('new')"
            data-tooltip-target="tooltip-new" type="button"
        />
      </div>
      <div id="tooltip-new" role="tooltip"
           class="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700">
        Create new route
        <div class="tooltip-arrow" data-popper-arrow></div>
      </div>

    </div>
  </div>

</template>

<style scoped>

</style>