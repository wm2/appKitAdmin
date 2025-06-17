import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosError } from 'axios';
import { boot } from 'quasar/wrappers';
import { useUserStore } from 'stores/user.store';

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

type FailedQueuePromise = {
  resolve: (value: string) => void;
  reject: (reason?: AxiosError) => void;
};

let isRefreshing = false;
let failedQueue: FailedQueuePromise[] = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export default boot(async ({ app, router, store }) => {
  const userStore = useUserStore(store);

  // ===================================================================
  // ИСПРАВЛЕНИЕ: Устанавливаем заголовок из localStorage при загрузке
  // ===================================================================
  const initialToken = localStorage.getItem('accessToken');
  if (initialToken) {
    // Эта строка устанавливает токен по умолчанию для всех последующих запросов через 'api'
    api.defaults.headers.common.Authorization = `Bearer ${initialToken}`;
    console.log('axios boot: Bearer token set from localStorage.');
  }
  // ===================================================================
  // КОНЕЦ ИСПРАВЛЕНИЯ
  // ===================================================================

  // Логика загрузки профиля (теперь будет работать, т.к. токен установлен)
  if (userStore.isLoggedIn) {
    console.log('axios boot: Пользователь авторизован, загружаем профиль...');
    try {
      await userStore.fetchProfile();
      console.log('axios boot: Профиль успешно загружен.');
    } catch (e) {
      console.error('axios boot: Ошибка при начальной загрузке профиля.', e);
    }
  } else {
    console.log('axios boot: Токен не найден, пропускаем загрузку профиля.');
  }

  // Перехватчик для автоматического обновления токена
  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        if (originalRequest.url?.includes('/auth-tokens/refresh/')) {
          console.error('Refresh токен невалиден или просрочен. Выход из системы.');
          await userStore.logout(router);
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshSuccessful = await userStore.refreshAccessToken();

          if (refreshSuccessful && userStore.accessToken) {
            processQueue(null, userStore.accessToken);
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${userStore.accessToken}`;
            }
            return api(originalRequest);
          } else {
            processQueue(error, null);
            await userStore.logout(router);
            return Promise.reject(error);
          }
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    },
  );

  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

export { api };
