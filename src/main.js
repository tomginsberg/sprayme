import {createApp} from 'vue'
import './style.css'
import PrimeVueStyled from 'primevue/styled';
import "primeicons/primeicons.css";

import App from './App.vue'
import { router } from "./router";
import PrimeVue from 'primevue/config';
import PrimeOne from 'primevue/themes/primeone';
import Aura from 'primevue/themes/primeone/aura';

const app = createApp(App)
app.use(PrimeVue, {
    // Default theme configuration
    theme: {
        base: PrimeOne,
        preset: Aura,
        options: {
            darkModeSelector: 'system',
        }
    }
});
app.use(router)

app.mount('#app')
