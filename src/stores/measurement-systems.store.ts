import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from 'boot/axios';
import { Notify } from 'quasar';
import type { AxiosError } from 'axios';
import {
  usePagination,
  type PaginationResponse,
  type PaginationParams,
} from 'src/composables/usePagination';

const VITE_SITE_ID = import.meta.env.VITE_SITE_ID;

// 1. Интерфейсы для данных системы измерений
export interface MeasurementSystemFile {
  id: string;
  name: string;
  is_base_system: boolean;
}

export interface MeasurementSystemDetail extends MeasurementSystemFile {
  site: string;
  creator: {
    id: string;
    email: string;
    role: string;
  } | null;
  created: string; // ISO DateTime
  updated: string; // ISO DateTime
}

export interface MeasurementSystemCreatePayload {
  name: string;
  is_base_system?: boolean;
}

export interface MeasurementSystemUpdatePayload {
  name?: string;
  is_base_system?: boolean;
}

// 4. Интерфейс для ошибок от API
interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown; // Для других возможных полей ошибок
}

export const useMeasurementSystemsStore = defineStore('measurementSystems', () => {
  // === STATE ===
  const measurementSystems = ref<MeasurementSystemFile[]>([]);
  const selectedMeasurementSystem = ref<MeasurementSystemDetail | null>(null);

  // === GETTERS ===
  const siteId = computed(() => VITE_SITE_ID);

  // === PAGINATION ===
  const fetchMeasurementSystemsWithPagination = async (
    url?: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<MeasurementSystemFile>> => {
    if (!siteId.value) {
      throw new Error('VITE_SITE_ID не определен.');
    }

    try {
      let requestUrl: string;
      let requestParams: Record<string, string | number | boolean> = {};

      if (url) {
        // Используем прямую ссылку (next/previous)
        requestUrl = url;
      } else {
        // Строим URL с параметрами
        requestUrl = `/sites/${siteId.value}/measurement-systems/`;
        // Filter out undefined values and convert to the correct type
        requestParams = Object.entries(params || {}).reduce(
          (acc, [key, value]) => {
            if (value !== undefined) {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, string | number | boolean>,
        );
      }

      const { data } = await api.get<PaginationResponse<MeasurementSystemFile>>(requestUrl, {
        params: url ? {} : requestParams,
      });

      // Обновляем локальный массив систем измерений
      measurementSystems.value = data.results;

      return data;
    } catch (error) {
      handleApiError(
        error as AxiosError<ApiError>,
        'Не удалось загрузить список систем измерений.',
      );
      throw error;
    }
  };

  // Создаем экземпляр пагинации
  const pagination = usePagination<MeasurementSystemFile>(fetchMeasurementSystemsWithPagination, {
    defaultPageSize: 10,
    defaultSortBy: 'name',
    defaultDescending: false,
  });

  // === ACTIONS ===

  function handleApiError(error: AxiosError<ApiError>, defaultMessage: string) {
    console.error(defaultMessage, error);
    let errorMessage = defaultMessage;
    const errorData = error.response?.data;

    if (typeof errorData === 'string') {
      errorMessage = errorData;
    } else if (errorData?.detail) {
      errorMessage = errorData.detail;
    } else if (errorData?.message) {
      errorMessage = errorData.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    // Если есть ошибки по конкретным полям
    if (errorData && typeof errorData === 'object' && !errorData.detail && !errorData.message) {
      const fieldErrors = Object.entries(errorData)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
        .join('; ');
      if (fieldErrors) errorMessage = fieldErrors;
    }

    Notify.create({
      type: 'negative',
      message: errorMessage,
      timeout: 5000,
    });
  }

  // Обертка для загрузки систем измерений с обновлением состояния
  async function fetchMeasurementSystems(url?: string): Promise<MeasurementSystemFile[]> {
    return pagination.fetchData(url);
  }

  async function fetchMeasurementSystemById(
    systemId: string,
  ): Promise<MeasurementSystemDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }
    try {
      const { data } = await api.get<MeasurementSystemDetail>(
        `/sites/${siteId.value}/measurement-systems/${systemId}/`,
      );
      selectedMeasurementSystem.value = data;
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Не удалось загрузить данные системы измерений.');
      selectedMeasurementSystem.value = null;
      return null;
    }
  }

  async function createMeasurementSystem(
    payload: MeasurementSystemCreatePayload,
  ): Promise<MeasurementSystemDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }
    try {
      const { data } = await api.post<MeasurementSystemDetail>(
        `/sites/${siteId.value}/measurement-systems/`,
        payload,
      );
      Notify.create({
        type: 'positive',
        message: `Система измерений "${data.name}" успешно создана.`,
      });

      // Обновляем список с сохранением текущей страницы
      await fetchMeasurementSystems();
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при создании системы измерений.');
      return null;
    }
  }

  async function updateMeasurementSystem(
    systemId: string,
    payload: MeasurementSystemUpdatePayload,
  ): Promise<MeasurementSystemDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }
    try {
      const { data } = await api.put<MeasurementSystemDetail>(
        `/sites/${siteId.value}/measurement-systems/${systemId}/`,
        payload,
      );
      Notify.create({
        type: 'positive',
        message: `Система измерений "${data.name}" успешно обновлена.`,
      });

      // Обновляем список
      await fetchMeasurementSystems();
      if (selectedMeasurementSystem.value?.id === systemId) {
        await fetchMeasurementSystemById(systemId);
      }
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при обновлении системы измерений.');
      return null;
    }
  }

  async function deleteMeasurementSystem(systemId: string): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }
    try {
      await api.delete(`/sites/${siteId.value}/measurement-systems/${systemId}/`);
      Notify.create({
        type: 'positive',
        message: 'Система измерений успешно удалена.',
      });

      // Обновляем список
      await fetchMeasurementSystems();
      if (selectedMeasurementSystem.value?.id === systemId) {
        selectedMeasurementSystem.value = null;
      }
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при удалении системы измерений.');
      return false;
    }
  }

  function clearSelectedMeasurementSystem() {
    selectedMeasurementSystem.value = null;
  }

  // Быстрое обновление статуса базовой системы через PATCH
  async function patchMeasurementSystemStatus(
    systemId: string,
    is_base_system: boolean,
  ): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    try {
      await api.patch(`/sites/${siteId.value}/measurement-systems/${systemId}/`, {
        is_base_system: is_base_system,
      });

      // Обновляем локальный массив без полной перезагрузки
      const systemIndex = measurementSystems.value.findIndex((system) => system.id === systemId);
      if (systemIndex !== -1 && measurementSystems.value[systemIndex]) {
        measurementSystems.value[systemIndex].is_base_system = is_base_system;
      }

      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при изменении статуса базовой системы.');
      return false;
    }
  }

  // Массовое удаление через API
  async function bulkDeleteMeasurementSystems(systemIds: string[]): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    try {
      // Выполняем все DELETE запросы параллельно
      await Promise.all(
        systemIds.map((id) => api.delete(`/sites/${siteId.value}/measurement-systems/${id}/`)),
      );

      Notify.create({
        type: 'positive',
        message: `Успешно удалено ${systemIds.length} систем измерений.`,
      });

      // Перезагружаем список
      await fetchMeasurementSystems();
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при массовом удалении систем измерений.');
      return false;
    }
  }

  // Массовое обновление статуса через PATCH
  async function bulkUpdateMeasurementSystemStatus(
    systemIds: string[],
    is_base_system: boolean,
  ): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    try {
      // Выполняем все PATCH запросы параллельно
      await Promise.all(
        systemIds.map((id) =>
          api.patch(`/sites/${siteId.value}/measurement-systems/${id}/`, { is_base_system }),
        ),
      );

      // Обновляем локальный массив
      systemIds.forEach((id) => {
        const systemIndex = measurementSystems.value.findIndex((system) => system.id === id);
        if (systemIndex !== -1 && measurementSystems.value[systemIndex]) {
          measurementSystems.value[systemIndex].is_base_system = is_base_system;
        }
      });

      Notify.create({
        type: 'positive',
        message: `Успешно обновлено ${systemIds.length} систем измерений.`,
      });

      return true;
    } catch (err) {
      handleApiError(
        err as AxiosError<ApiError>,
        'Ошибка при массовом обновлении статуса базовой системы.',
      );
      return false;
    }
  }

  // Методы для работы с поиском и фильтрацией
  async function searchMeasurementSystems(query: string): Promise<MeasurementSystemFile[]> {
    pagination.setSearch(query);
    return await pagination.fetchData();
  }

  async function filterMeasurementSystems(
    filters: Record<string, string | number | boolean>,
  ): Promise<MeasurementSystemFile[]> {
    Object.entries(filters).forEach(([key, value]) => {
      pagination.setFilter(key, value);
    });
    return await pagination.fetchData();
  }

  async function clearFilters(): Promise<MeasurementSystemFile[]> {
    pagination.clearFilters();
    return await pagination.fetchData();
  }

  return {
    // State
    measurementSystems,
    selectedMeasurementSystem,
    loading: pagination.loading,

    // Pagination state
    currentPage: computed(() => pagination.currentPage.value),
    pageSize: computed(() => pagination.pageSize.value),
    totalCount: computed(() => pagination.totalCount.value),
    totalPages: computed(() => pagination.totalPages.value),
    hasNext: computed(() => pagination.hasNext.value),
    hasPrevious: computed(() => pagination.hasPrevious.value),
    qTablePagination: pagination.qTablePagination,

    // Methods
    fetchMeasurementSystems,
    fetchMeasurementSystemById,
    createMeasurementSystem,
    updateMeasurementSystem,
    deleteMeasurementSystem,
    clearSelectedMeasurementSystem,
    searchMeasurementSystems,
    filterMeasurementSystems,
    clearFilters,
    patchMeasurementSystemStatus,
    bulkDeleteMeasurementSystems,
    bulkUpdateMeasurementSystemStatus,

    // Pagination methods
    goToPage: pagination.goToPage,
    goToNextPage: pagination.goToNextPage,
    goToPreviousPage: pagination.goToPreviousPage,
    handleTableRequest: pagination.handleTableRequest,
  };
});
