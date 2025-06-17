import type { RouteRecordRaw } from 'vue-router';

export const userRoutes: RouteRecordRaw[] = [
  {
    path: '/dashboard',
    component: () => import('layouts/UserLayout.vue'),
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('pages/IndexPage.vue'),
        meta: {
          title: 'Главная',
          icon: 'dashboard',
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/brands',
    component: () => import('layouts/UserLayout.vue'),
    children: [
      {
        path: '',
        name: 'Brands',
        component: () => import('pages/BrandsPage.vue'),
        meta: {
          title: 'Бренды',
          icon: 'branding_watermark',
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/measurement-systems',
    component: () => import('layouts/UserLayout.vue'),
    children: [
      {
        path: '',
        name: 'MeasurementSystems',
        component: () => import('pages/MeasurementSystemPage.vue'),
        meta: {
          title: 'Системы измерений',
          icon: 'straighten',
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/product-types',
    component: () => import('layouts/UserLayout.vue'),
    children: [
      {
        path: '',
        name: 'ProductTypes',
        component: () => import('pages/ProductTypesPage.vue'),
        meta: {
          title: 'Типы товаров',
          icon: 'category',
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/size-charts',
    component: () => import('layouts/UserLayout.vue'),
    children: [
      {
        path: '',
        name: 'SizeCharts',
        component: () => import('pages/SizeChartsPage.vue'),
        meta: {
          title: 'Размерные сетки',
          icon: 'grid_on',
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/sizes',
    component: () => import('layouts/UserLayout.vue'),
    children: [
      {
        path: '',
        name: 'Sizes',
        component: () => import('pages/SizesPage.vue'),
        meta: {
          title: 'Размеры',
          icon: 'photo_size_select_small',
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/service-categories',
    component: () => import('layouts/UserLayout.vue'),
    children: [
      {
        path: '',
        name: 'ServiceCategories',
        component: () => import('pages/ServiceCategoriesPage.vue'),
        meta: {
          title: 'Категории услуг',
          icon: 'folder_special',
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/service-attributes',
    component: () => import('layouts/UserLayout.vue'),
    children: [
      {
        path: '',
        name: 'ServiceAttributes',
        component: () => import('pages/ServiceAttributesPage.vue'),
        meta: {
          title: 'Свойства товаров/услуг',
          icon: 'label',
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/services',
    component: () => import('layouts/UserLayout.vue'),
    children: [
      {
        path: '',
        name: 'Services',
        component: () => import('pages/ServicesPage.vue'),
        meta: {
          title: 'Сервисы',
          icon: 'inventory',
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/service-variants',
    component: () => import('layouts/UserLayout.vue'),
    children: [
      {
        path: '',
        name: 'ServiceVariants',
        component: () => import('pages/ServiceVariantsPage.vue'),
        meta: {
          title: 'Варианты товаров',
          icon: 'tune',
          requiresAuth: true,
          description: 'Управление вариантами товаров - размеры, артикулы, цены',
        },
      },
    ],
  },
];
