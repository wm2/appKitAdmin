// src/stores/user.ts

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from 'boot/axios';
import { Notify } from 'quasar';
import type { Router } from 'vue-router';
import type { AxiosError } from 'axios';

// 1. Интерфейс для данных профиля пользователя
interface UserProfile {
  id: string;
  email: string;
  role: string;
}

// 2. Интерфейс для состояния хранилища
interface UserState {
  accessToken: string | null;
  refreshToken: string | null;
  profile: UserProfile | null;
  loading: boolean;
}

// 3. API-интерфейс для ответа с токенами
interface TokenResponse {
  access: string;
  refresh: string;
}

// 4. Интерфейс для ошибок от API
interface ApiError {
  detail?: string;
  message?: string;
}

export const useUserStore = defineStore('user', () => {
  // === STATE ===
  const accessToken = ref<UserState['accessToken']>(localStorage.getItem('accessToken'));
  const refreshToken = ref<UserState['refreshToken']>(localStorage.getItem('refreshToken'));
  const profile = ref<UserState['profile']>(null);
  const loading = ref<UserState['loading']>(false);

  // === GETTERS ===
  const isLoggedIn = computed(() => !!accessToken.value);
  const isAdmin = computed(() => profile.value?.role === 'Admin');

  // === ACTIONS ===

  function setTokens(access: string | null, refresh?: string | null) {
    if (access) {
      localStorage.setItem('accessToken', access);
      api.defaults.headers.common.Authorization = `Bearer ${access}`;
      accessToken.value = access;
    } else {
      localStorage.removeItem('accessToken');
      delete api.defaults.headers.common.Authorization;
      accessToken.value = null;
    }

    if (refresh) {
      localStorage.setItem('refreshToken', refresh);
      refreshToken.value = refresh;
    } else if (refresh === null) {
      localStorage.removeItem('refreshToken');
      refreshToken.value = null;
    }
  }

  async function logout(router: Router) {
    setTokens(null, null);
    profile.value = null;
    Notify.create({
      type: 'info',
      message: 'Вы вышли из системы.',
    });
    await router.push({ path: '/login' });
  }

  async function fetchProfile() {
    if (!isLoggedIn.value) return;

    loading.value = true;
    try {
      const { data } = await api.get<UserProfile>('/users/me/');
      profile.value = data;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      Notify.create({
        type: 'negative',
        message: 'Не удалось загрузить профиль пользователя.',
      });
    } finally {
      loading.value = false;
    }
  }

  async function login(credentials: { email: string; password: string }, router: Router) {
    loading.value = true;

    try {
      const response = await api.post<TokenResponse>('/auth-tokens', credentials);
      setTokens(response.data.access, response.data.refresh);
      await fetchProfile();

      Notify.create({
        type: 'positive',
        message: `Добро пожаловать, ${profile.value?.email ?? ''}!`,
      });

      await router.push({ path: '/dashboard' });
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      console.error('Login failed:', error);

      let errorMessage = 'Неизвестная ошибка авторизации';
      const errorData = error.response?.data;

      if (errorData?.detail) {
        errorMessage = errorData.detail;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Notify.create({
        type: 'negative',
        message: errorMessage,
      });
    } finally {
      loading.value = false;
    }
  }

  async function refreshAccessToken(): Promise<boolean> {
    if (!refreshToken.value) {
      return false;
    }
    try {
      // ВНИМАНИЕ: Проверь этот путь!
      const response = await api.post<{ access: string }>('/auth-tokens/refresh/', {
        refresh: refreshToken.value,
      });
      setTokens(response.data.access);
      console.log('Access token has been refreshed.');
      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return false;
    }
  }

  return {
    accessToken,
    refreshToken,
    profile,
    loading,
    isLoggedIn,
    isAdmin,
    login,
    logout,
    fetchProfile,
    setTokens,
    refreshAccessToken,
  };
});
