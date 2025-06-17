import { route } from 'quasar/wrappers'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory
} from 'vue-router'
import { userRoutes } from './user.routes'
import { guestRoutes } from './guest.routes'
import { useUserStore } from 'stores/user.store' // Импортируем хранилище пользователя

// Always leave this as last one,
// but you can also remove it
const errorRoutes = [
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }]
/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default route(function ({ store /*, ssrContext */ }) { // Добавляем store в параметры
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory)

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes: [
      ...errorRoutes,
      ...guestRoutes,
      ...userRoutes
    ],

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(
      process.env.MODE === 'ssr' ? void 0 : process.env.VUE_ROUTER_BASE
    )
  })

  // Навигационный хук
  Router.beforeEach(async (to, from, next) => {
    const userStore = useUserStore(store) // Получаем экземпляр хранилища

    // Пытаемся обновить токен, если он есть, но профиль не загружен
    // Это полезно, если пользователь закрыл вкладку и открыл снова
    if (userStore.accessToken && !userStore.profile) {
      await userStore.fetchProfile();
    }

    const requiresAuth = userRoutes.some(route => to.path.startsWith(route.path));
    const isGuestRoute = guestRoutes.some(route => route.children?.some(child => child.path === to.path || (route.path === to.path && child.path === '')));

    if (requiresAuth && !userStore.isLoggedIn) {
      // Если маршрут требует авторизации, а пользователь не вошел в систему
      next({ path: '/login' }); // Перенаправляем на страницу входа
    } else if (isGuestRoute && userStore.isLoggedIn && to.path !== '/') {
      // Если это гостевой маршрут (например, /login, /register), а пользователь уже вошел
      // и это не главная страница гостя
      next({ path: '/dashboard' }); // Перенаправляем на дашборд
    } else {
      next(); // В остальных случаях разрешаем переход
    }
  });

  return Router
})
