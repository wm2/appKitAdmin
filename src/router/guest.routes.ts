import type { RouteRecordRaw } from 'vue-router';

export const guestRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/GuestLayout.vue'),
    children: [
      {
        path: '',
        // component: () => import('pages/IndexPage.vue')
        // ToDo:  Временно отключена главная страница) отправляем на вход
        component: () => import('pages/LoginAuthPage.vue'),
      },
      {
        path: '/login',
        component: () => import('pages/LoginAuthPage.vue'),
      },
      {
        path: '/register',
        component: () => import('pages/RegisterPage.vue'),
      },
    ],
  },
];
