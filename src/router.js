import {createRouter, createWebHistory} from "vue-router";
import App from "./App.vue";
import View from "@/views/View.vue";
import Edit from "@/views/Edit.vue";

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        {path: "/", component: View},
        {path: "/climb/:id", component: Edit},
        {path: "/:pathMatch(.*)", redirect: "/"}
    ]
});