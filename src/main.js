import {createApp} from 'vue'
import './style.css'
import "primeicons/primeicons.css";

import App from './App.vue'
import { router } from "./router";
import PrimeVue from 'primevue/config';
import PrimeOne from 'primevue/themes/primeone';
import Aura from 'primevue/themes/primeone/aura';
import Lara from '/src/presets/lara';

const app = createApp(App);
app.use(PrimeVue, {
    unstyled: true,
    pt: Lara
});

app.use(router)

app.mount('#app')
