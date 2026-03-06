import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '../layouts/MainLayout.vue';
import Dashboard from '../views/Dashboard.vue';

const routes = [
    {
        path: '/',
        component: MainLayout,
        children: [
            {
                path: '', // Default child
                name: 'Dashboard',
                component: Dashboard,
            },
            {
                path: '/tournaments',
                name: 'Tournaments',
                component: Dashboard, // Reuse for now or create generic list
            },
            {
                path: '/tournaments/:id',
                name: 'TournamentDetail',
                component: () => import('../views/TournamentDetail.vue')
            },
            {
                path: '/settings',
                name: 'Settings',
                component: () => import('../views/Settings.vue')
            }
        ],
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
