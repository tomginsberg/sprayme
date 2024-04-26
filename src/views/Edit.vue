<script setup>
import {onMounted} from 'vue';
import "leaflet/dist/leaflet.css";
import * as turf from '@turf/turf';
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import Dropdown from "primevue/dropdown";
import InputGroup from "primevue/inputgroup";
import {useRoute, useRouter} from "vue-router";
import axios from "axios";

const name = ref("");
const router = useRouter();
const route = useRoute();
const climbID = route.params.id;
const climbData = ref({name: '', grade: '', idx: [], type: []});

// grades V2 -> V14
const grades = Array.from({length: 13}, (_, i) => i + 2).map(
    (grade) => {
      return `V${grade}`;
    }
);

import L from "leaflet";

const endpoint = "https://spraypi.titanium.ddns.me";
let map;
let polygonLayers = [];
let actionStack = [];
const activePolygons = [];
const activeTypes = [];
const placeHolderName = ref('')


const holdTypes = ['any', 'start', 'finish', 'foot'];
const holdColors = ['blue', 'green', 'red', 'pink'];
const typeToColor = holdTypes.reduce((acc, type, index) => {
  acc[type] = holdColors[index];
  return acc;
}, {});

onMounted(async () => {
  // get from /get_route/:id
  if (climbID === 'new') {
    climbData.value.name = 'New Route';
    lock.value = false;
  } else {
    const response = await axios.get(`${endpoint}/get_route/${climbID}`);
    if (response.data.valueOf() === 404) {
      await router.push('/');
    }
    climbData.value = response.data;
  }


  map = L.map('map', {
    zoomControl: false,
    crs: L.CRS.Simple,
    minZoom: -5,
    maxZoom: 3,
    center: [1536, 1732],
    zoom: -1,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 120
  });

  const bounds = [[0, 0], [3072, 3464]];
  L.imageOverlay('/spray.jpg', bounds).addTo(map);
  map.fitBounds(bounds);

  await fetch('/polys.json')
      .then(function (response) {
        return response.json();
      })
      .then(function (polygons) {
        polygons.forEach(function (polygon) {
          activePolygons.push(null)
          activeTypes.push(null)
          polygonLayers.push(L.polygon(polygon));
        });
      });

  // for each index in climbData.value.index and climbData.value.type
  // add a polygon to the map with the color of the type
  if (climbData.value.idx.length > 0) {
    climbData.value.idx.forEach((index, i) => {
      let type = holdTypes[climbData.value.type[i]];
      let newLayer = L.polygon(polygonLayers[index].getLatLngs(), {color: typeToColor[type]});
      map.addLayer(newLayer);
      activePolygons[index] = newLayer;
      activeTypes[index] = type;
    });
  }

  map.on('click', function (e) {
    if (lock.value) {
      return;
    }
    let clickedPoint = e.latlng;
    let minArea = Infinity;
    let minIndex = null;
    let clickedLayers = [];

    // Identify all polygons that contain the clicked point and find the one with the smallest area
    polygonLayers.forEach(function (layer, index) {
      if (isPointInPolygon(clickedPoint, layer)) {
        clickedLayers.push(layer); // Track polygons that the point is inside
        let polyArea = turf.area(layer.toGeoJSON());
        if (polyArea < minArea) {
          minArea = polyArea;
          minIndex = index;
        }
      }
    });

    if (activePolygons[minIndex] === null) {
      let newLayer = L.polygon(polygonLayers[minIndex].getLatLngs(), {color: typeToColor['any']});
      map.addLayer(newLayer);
      activePolygons[minIndex] = newLayer;
      activeTypes[minIndex] = 'any';
      actionStack.push({action: 'add', index: minIndex, type: 'any'});
    } else {
      map.removeLayer(activePolygons[minIndex]);
      let type = activeTypes[minIndex];
      activePolygons[minIndex] = null;
      activeTypes[minIndex] = null;
      actionStack.push({action: 'remove', index: minIndex, type: type});
    }
  });
});


function clear() {
  // add a clear action
  let populatedIndices = [];
  let types = [];
  activePolygons.forEach(function (layer, index) {
    if (layer) {
      populatedIndices.push(index);
      types.push(activeTypes[index]);
    }
  });
  actionStack.push({action: 'clear', indices: populatedIndices, types: types});

  activePolygons.forEach(function (layer) {
    if (layer) {
      map.removeLayer(layer);
    }
  });
  // reset the active polygons to null
  activePolygons.forEach(function (layer, index) {
    activePolygons[index] = null;
    activeTypes[index] = null;
  });
}


function isPointInPolygon(point, polygonLayer) {
  const poly = polygonLayer.toGeoJSON();
  const pt = turf.point([point.lng, point.lat]);
  return turf.booleanPointInPolygon(pt, poly);
}

function undo() {
  // pop the last action from the stack and reverse it
  if (actionStack.length === 0) {
    return;
  }
  let lastAction = actionStack.pop();
  let lastActionType = lastAction.action;
  if (lastActionType === 'clear') {
    for (let i = 0; i < lastAction.indices.length; i++) {
      let index = lastAction.indices[i];
      let type = lastAction.types[i];
      let newLayer = L.polygon(polygonLayers[index].getLatLngs(), {color: typeToColor[type]});
      map.addLayer(newLayer);
      activePolygons[index] = newLayer;
      activeTypes[index] = type;
    }
    return;
  }


  let lastIndex = lastAction.index;
  let lastLayer = activePolygons[lastIndex];

  if (lastActionType === 'add') {
    map.removeLayer(lastLayer);
    activePolygons[lastIndex] = null;
    activeTypes[lastIndex] = null;

  } else if (lastActionType === 'remove') {
    let newLayer = L.polygon(polygonLayers[lastIndex].getLatLngs(), {color: typeToColor[lastAction.type]});
    map.addLayer(newLayer);
    activePolygons[lastIndex] = newLayer;
    activeTypes[lastIndex] = lastAction.type;

  } else if (lastActionType === 'color') {
    let oldColor = lastAction.old;

    let newLayer = L.polygon(lastLayer.getLatLngs(), {color: typeToColor[oldColor]});
    map.removeLayer(lastLayer);
    map.addLayer(newLayer);
    activePolygons[lastIndex] = newLayer;
    activeTypes[lastIndex] = oldColor;
  }

}

function setHoldType(type) {
  // check the last hold on the action stack
  // add an old and new color action to the stack
  let lastAction = actionStack[actionStack.length - 1];
  if (lastAction.action === 'color' && lastAction.new === type) {
    return;
  } else if (lastAction.action === 'add' && type === 'any') {
    return;
  }
  if (lastAction) {
    let lastActionType = lastAction.action;
    if (lastActionType !== 'remove') {
      let index = lastAction.index;
      let oldType = activeTypes[index];
      let lastLayer = activePolygons[index];
      let newLayer = L.polygon(lastLayer.getLatLngs(), {color: typeToColor[type]});
      map.removeLayer(lastLayer);
      map.addLayer(newLayer);
      activePolygons[index] = newLayer;
      activeTypes[index] = type;
      actionStack.push({action: 'color', index: index, old: oldType, new: type});
    }
  }
}

function printMapLayers() {
  router.push('/');
}

import {ref} from "vue";

const visible = ref(false);
const grade = ref(null);

async function saveButton() {
  visible.value = true;
  const name = await axios.get(`${endpoint}/random_name`);
  placeHolderName.value = name.data.name.replaceAll('-', ' ');
}

async function saveOrCheckRoute(name, idx, types) {
  console.log(`name: ${name.value}, idx: ${idx}, types: ${types}`)
  let saveName = placeHolderName.value;
  if (name.value) {
    saveName = name.value.replaceAll(' ', '-');
  }

  // uses name_exists api with {name: name, idx: idx, types: types}
  const response = await axios.post(`${endpoint}/save_route`,
      {name: saveName, idx: idx, type: types, grade: grade.value});
  const errors = response.data.errors;
  if (errors && errors.length > 0) {
    // join all the values in for key message in errors and alert
    const errMessage = errors.map((error) => error.message).join('\n');
    alert(errMessage);
    return [400, errors];
  } else {
    climbData.value.name = saveName.replaceAll(' ', '-');
    climbData.value.grade = grade.value;
    lock.value = true;
    return [200, response.data.message]
  }
}

async function saveRoute() {
  // get the index and type of each active polygon
  let idx = [];
  let types = [];
  activePolygons.forEach(function (layer, index) {
    if (layer) {
      idx.push(index);
      types.push(holdTypes.indexOf(activeTypes[index]));
    }
  });
  // validate the route
  let response = await saveOrCheckRoute(name, idx, types);
  console.log(response)
  if (response[0] === 200) {
    visible.value = false;
  }
}

const lock = ref(true);

function toggleLock() {
  if (lock.value) {
    climbData.value.name = 'New Route';
    climbData.value.grade = '';
  }
  lock.value = !lock.value;
}

const lightMode = (localStorage.getItem('color-theme') || 'light') === 'light';

import Toast from 'primevue/toast';
import {useToast} from 'primevue/usetoast';

const toast = useToast();

function copyToClipboard() {
  // copies https://sprayme.titanium.ddns.me/climb/:id to clipboard
  const url = `https://sprayme.titanium.ddns.me/climb/${climbID}`;
  navigator.clipboard.writeText(url);
  toast.add({
    severity: 'success',
    summary: 'Copied to clipboard',
    detail: `sprayme/${climbData.value.name}`,
    life: 2000
  });
}


</script>


<template>


  <div id="marketing-banner" tabindex="-1"
       class="fixed z-[1000] flex flex-col md:flex-row justify-between w-[calc(100%-2rem)] p-4 -translate-x-1/2 bg-white border border-gray-100 rounded-lg shadow-sm lg:max-w-7xl left-1/2 top-6 dark:bg-gray-700 dark:border-gray-600">
    <div class="flex flex-row justify-between">
      <div class="flex flex-row space-x-3">

        <button v-show="climbData.name !== 'New Route'" class="p-2 mt-1 rounded-lg dark:bg-gray-500 bg-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                @click="copyToClipboard">
          <svg class="w-4 h-5 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
               width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path
                d="M17.5 3a3.5 3.5 0 0 0-3.456 4.06L8.143 9.704a3.5 3.5 0 1 0-.01 4.6l5.91 2.65a3.5 3.5 0 1 0 .863-1.805l-5.94-2.662a3.53 3.53 0 0 0 .002-.961l5.948-2.667A3.5 3.5 0 1 0 17.5 3Z"/>
          </svg>
        </button>
        <span class="self-center text-lg font-semibold whitespace-nowrap text-gray-800 dark:text-white">{{
            climbData.name.replaceAll('-', ' ')
          }}</span>
      </div>


      <div class="flex flex-row space-x-4">
        <p v-if="climbData.grade" class="flex items-center text-sm font-normal text-gray-500 dark:text-gray-400">
          {{ climbData.grade }}
        </p>
        <button type="button"
                @click="toggleLock">
          <svg v-if="lock"
               class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
               width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd"
                  d="M8 10V7a4 4 0 1 1 8 0v3h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h1Zm2-3a2 2 0 1 1 4 0v3h-4V7Zm2 6a1 1 0 0 1 1 1v3a1 1 0 1 1-2 0v-3a1 1 0 0 1 1-1Z"
                  clip-rule="evenodd"/>
          </svg>
          <svg v-if="!lock"
               class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
               width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd"
                  d="M15 7a2 2 0 1 1 4 0v4a1 1 0 1 0 2 0V7a4 4 0 0 0-8 0v3H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2V7Zm-5 6a1 1 0 0 1 1 1v3a1 1 0 1 1-2 0v-3a1 1 0 0 1 1-1Z"
                  clip-rule="evenodd"/>
          </svg>

        </button>
      </div>


    </div>
  </div>
  <Toast position="bottom-center"/>


  <div id="map" class="h-screen" :style="{ backgroundColor: lightMode ? '#e2e8f0' : '#1e293b' }"></div>

  <div
      class="fixed bottom-0 left-0 z-[1000] w-full h-16 bg-white border-t border-gray-200 dark:bg-gray-700 dark:border-gray-600">
    <div class="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
      <button type="button"
              id="home"
              @click="printMapLayers"
              class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group">
        <svg class="w-6 h-6 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
             width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path fill-rule="evenodd"
                d="M11.293 3.293a1 1 0 0 1 1.414 0l6 6 2 2a1 1 0 0 1-1.414 1.414L19 12.414V19a2 2 0 0 1-2 2h-3a1 1 0 0 1-1-1v-3h-2v3a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2v-6.586l-.293.293a1 1 0 0 1-1.414-1.414l2-2 6-6Z"
                clip-rule="evenodd"/>
        </svg>

        <span class="text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500">Home</span>
      </button>
      <button type="button"
              @click="saveButton"
              id="save"
              class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group">
        <svg class="w-6 h-6 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
             width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path
              d="m7.4 3.736 3.43 3.429A5.046 5.046 0 0 1 12.133 7c.356.01.71.06 1.056.147l3.41-3.412a2.32 2.32 0 0 1 .451-.344A9.89 9.89 0 0 0 12.268 2a10.022 10.022 0 0 0-5.322 1.392c.165.095.318.211.454.344Zm11.451 1.54-.127-.127a.5.5 0 0 0-.706 0l-2.932 2.932c.03.023.05.054.078.077.237.194.454.41.651.645.033.038.077.067.11.107l2.926-2.927a.5.5 0 0 0 0-.707Zm-2.931 9.81c-.025.03-.058.052-.082.082a4.97 4.97 0 0 1-.633.639c-.04.036-.072.083-.115.117l2.927 2.927a.5.5 0 0 0 .707 0l.127-.127a.5.5 0 0 0 0-.707l-2.932-2.931Zm-1.443-4.763a3.037 3.037 0 0 0-1.383-1.1l-.012-.007a2.956 2.956 0 0 0-1-.213H12a2.964 2.964 0 0 0-2.122.893c-.285.29-.509.634-.657 1.013l-.009.016a2.96 2.96 0 0 0-.21 1 2.99 2.99 0 0 0 .488 1.716l.032.04a3.04 3.04 0 0 0 1.384 1.1l.012.007c.319.129.657.2 1 .213.393.015.784-.05 1.15-.192.012-.005.021-.013.033-.018a3.01 3.01 0 0 0 1.676-1.7v-.007a2.89 2.89 0 0 0 0-2.207 2.868 2.868 0 0 0-.27-.515c-.007-.012-.02-.025-.03-.039Zm6.137-3.373a2.53 2.53 0 0 1-.349.447l-3.426 3.426c.112.428.166.869.161 1.311a4.954 4.954 0 0 1-.148 1.054l3.413 3.412c.133.134.249.283.347.444A9.88 9.88 0 0 0 22 12.269a9.913 9.913 0 0 0-1.386-5.319ZM16.6 20.264l-3.42-3.421c-.386.1-.782.152-1.18.157h-.135c-.356-.01-.71-.06-1.056-.147L7.4 20.265a2.503 2.503 0 0 1-.444.347A9.884 9.884 0 0 0 11.732 22H12a9.9 9.9 0 0 0 5.044-1.388 2.515 2.515 0 0 1-.444-.348ZM3.735 16.6l3.426-3.426a4.608 4.608 0 0 1-.013-2.367L3.735 7.4a2.508 2.508 0 0 1-.349-.447 9.889 9.889 0 0 0 0 10.1 2.48 2.48 0 0 1 .35-.453Zm5.101-.758a4.959 4.959 0 0 1-.65-.645c-.034-.038-.078-.067-.11-.107L5.15 18.017a.5.5 0 0 0 0 .707l.127.127a.5.5 0 0 0 .706 0l2.932-2.933c-.029-.018-.049-.053-.078-.076Zm-.755-6.928c.03-.037.07-.063.1-.1.183-.22.383-.423.6-.609.046-.04.081-.092.128-.13L5.983 5.149a.5.5 0 0 0-.707 0l-.127.127a.5.5 0 0 0 0 .707l2.932 2.931Z"/>
        </svg>

        <span class="text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500">Save</span>
      </button>
      <button type="button"
              :disabled="lock"
              @click="undo"
              id="undo"
              class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group">
        <svg class="w-6 h-6 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
             width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path
              d="M14.502 7.046h-2.5v-.928a2.122 2.122 0 0 0-1.199-1.954 1.827 1.827 0 0 0-1.984.311L3.71 8.965a2.2 2.2 0 0 0 0 3.24L8.82 16.7a1.829 1.829 0 0 0 1.985.31 2.121 2.121 0 0 0 1.199-1.959v-.928h1a2.025 2.025 0 0 1 1.999 2.047V19a1 1 0 0 0 1.275.961 6.59 6.59 0 0 0 4.662-7.22 6.593 6.593 0 0 0-6.437-5.695Z"/>
        </svg>
        <span class="text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500">Undo</span>
      </button>
      <button type="button"
              :disabled="lock"
              @click="clear"
              id="clear"
              class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group">
        <svg class="w-6 h-6 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
             width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path fill-rule="evenodd"
                d="M17.44 3a1 1 0 0 1 .707.293l2.56 2.56a1 1 0 0 1 0 1.414L18.194 9.78 14.22 5.806l2.513-2.513A1 1 0 0 1 17.44 3Zm-4.634 4.22-9.513 9.513a1 1 0 0 0 0 1.414l2.56 2.56a1 1 0 0 0 1.414 0l9.513-9.513-3.974-3.974ZM6 6a1 1 0 0 1 1 1v1h1a1 1 0 0 1 0 2H7v1a1 1 0 1 1-2 0v-1H4a1 1 0 0 1 0-2h1V7a1 1 0 0 1 1-1Zm9 9a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1h-1a1 1 0 1 1 0-2h1v-1a1 1 0 0 1 1-1Z"
                clip-rule="evenodd"/>
          <path d="M19 13h-2v2h2v-2ZM13 3h-2v2h2V3Zm-2 2H9v2h2V5ZM9 3H7v2h2V3Zm12 8h-2v2h2v-2Zm0 4h-2v2h2v-2Z"/>
        </svg>

        <span class="text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-500">Clear</span>
      </button>
    </div>


  </div>

  <div class="fixed flex flex-row justify-center justify-items-center z-[1000] w-full bottom-16 my-4">

    <button id="start" type="button"
            :disabled="lock"
            @click="setHoldType('start')"
            class="text-white bg-lime-500 dark:bg-lime-500 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center me-2  dark:focus:ring-blue-800">
      🔰
      Start
    </button>

    <button id="finish" type="button"
            :disabled="lock"
            @click="setHoldType('finish')"
            class="text-white bg-red-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center me-2   dark:focus:ring-blue-800">
      🏁
      Finish
    </button>

    <button id="foot" type="button"
            :disabled="lock"
            @click="setHoldType('foot')"
            class="text-white bg-rose-300 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center me-2   dark:focus:ring-blue-800">
      🦶
      Foot
    </button>

    <button
        id="any" type="button"
        :disabled="lock"
        @click="setHoldType('any')"
        class="text-white bg-blue-500 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center me-2   dark:focus:ring-blue-800">
      🪜
      Any
    </button>
  </div>

  <InputGroup>
    <InputText :placeholder="placeHolderName" id="Name" v-model="name"/>

  </InputGroup>

  <Dialog
      v-model:visible="visible"
      modal
      header="🧗 Save Route"
      :style="{ width: '25rem' }"
  >
    <template #container="{ closeCallback }">
      <div class="flex flex-col px-10 py-7 gap-5 bg-gray-200 dark:bg-gray-800 rounded-lg">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-primary-50">🧗 Save Route</h1>
        <div class="inline-flex flex-col gap-2">
          <label for="Name" class="text-gray-900 dark:text-primary-50 font-semibold">Name</label>
          <InputText :placeholder="placeHolderName" id="Name" v-model="name"
          />
        </div>
        <div class="inline-flex flex-col gap-2">
          <label for="Grade" class="text-gray-900 dark:text-primary-50 font-semibold">Grade</label>
          <Dropdown id="Grade" autocomplete="off" :options="grades"
                    v-model="grade"
                    placeholder="Grade"
          />
        </div>
        <div class="flex items-center gap-2">
          <Button icon="pi pi-save" label="Save" @click="saveRoute" text
                  class="p-4 w-full text-white bg-green-600 hover:bg-white/10"></Button>
          <Button icon="pi pi-times" label="Cancel" @click="closeCallback" text
                  class="p-4 w-full text-white bg-red-600 hover:bg-white/10"></Button>
        </div>
      </div>
    </template>
  </Dialog>


</template>

<style scoped>

</style>
