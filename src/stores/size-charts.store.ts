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

// 1. Интерфейсы для данных размерных сеток
export interface ProductTypeRef {
  id: string;
  name: string;
  description: string;
  creator: {
    id: string;
    email: string;
    role: string;
  } | null;
  created: string;
  updated: string;
}

export interface SizeChartFile {
  id: string;
  name: string;
  description: string;
  product_type: ProductTypeRef;
}

export interface SizeChartDetail extends SizeChartFile {
  creator: {
    id: string;
    email: string;
    role: string;
  } | null;
  created: string; // ISO DateTime
  updated: string; // ISO DateTime
}

export interface SizeChartCreatePayload {
  name: string;
  description?: string;
  product_type: string; // ID типа продукта
}

export interface SizeChartUpdatePayload {
  name?: string;
  description?: string;
  product_type?: string; // ID типа продукта
}

// 4. Интерфейс для ошибок от API
interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown; // Для других возможных полей ошибок
}

export const useSizeChartsStore = defineStore('sizeCharts', () => {
  // === STATE ===
  const sizeCharts = ref<SizeChartFile[]>([]);
  const selectedSizeChart = ref<SizeChartDetail | null>(null);

  // === GETTERS ===
  const siteId = computed(() => VITE_SITE_ID);

  // === PAGINATION ===
  const fetchSizeChartsWithPagination = async (
    url?: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<SizeChartFile>> => {
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
        requestUrl = `/sites/${siteId.value}/size-charts/`;
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

      const { data } = await api.get<PaginationResponse<SizeChartFile>>(requestUrl, {
        params: url ? {} : requestParams,
      });

      // Обновляем локальный массив размерных сеток
      sizeCharts.value = data.results;

      return data;
    } catch (error) {
      handleApiError(error as AxiosError<ApiError>, 'Не удалось загрузить список размерных сеток.');
      throw error;
    }
  };

  // Создаем экземпляр пагинации
  const pagination = usePagination<SizeChartFile>(fetchSizeChartsWithPagination, {
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

  // Обертка для загрузки размерных сеток с обновлением состояния
  async function fetchSizeCharts(url?: string): Promise<SizeChartFile[]> {
    return pagination.fetchData(url);
  }

  async function fetchSizeChartById(chartId: string): Promise<SizeChartDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }
    try {
      const { data } = await api.get<SizeChartDetail>(
        `/sites/${siteId.value}/size-charts/${chartId}/`,
      );
      selectedSizeChart.value = data;
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Не удалось загрузить данные размерной сетки.');
      selectedSizeChart.value = null;
      return null;
    }
  }

  async function createSizeChart(payload: SizeChartCreatePayload): Promise<SizeChartDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }
    try {
      const { data } = await api.post<SizeChartDetail>(
        `/sites/${siteId.value}/size-charts/`,
        payload,
      );
      Notify.create({
        type: 'positive',
        message: `Размерная сетка "${data.name}" успешно создана.`,
      });

      // Обновляем список с сохранением текущей страницы
      await fetchSizeCharts();
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при создании размерной сетки.');
      return null;
    }
  }

  async function updateSizeChart(
    chartId: string,
    payload: SizeChartUpdatePayload,
  ): Promise<SizeChartDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }
    try {
      const { data } = await api.put<SizeChartDetail>(
        `/sites/${siteId.value}/size-charts/${chartId}/`,
        payload,
      );
      Notify.create({
        type: 'positive',
        message: `Размерная сетка "${data.name}" успешно обновлена.`,
      });

      // Обновляем список
      await fetchSizeCharts();
      if (selectedSizeChart.value?.id === chartId) {
        await fetchSizeChartById(chartId);
      }
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при обновлении размерной сетки.');
      return null;
    }
  }

  async function deleteSizeChart(chartId: string): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }
    try {
      await api.delete(`/sites/${siteId.value}/size-charts/${chartId}/`);
      Notify.create({
        type: 'positive',
        message: 'Размерная сетка успешно удалена.',
      });

      // Обновляем список
      await fetchSizeCharts();
      if (selectedSizeChart.value?.id === chartId) {
        selectedSizeChart.value = null;
      }
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при удалении размерной сетки.');
      return false;
    }
  }

  function clearSelectedSizeChart() {
    selectedSizeChart.value = null;
  }

  // Массовое удаление через API
  async function bulkDeleteSizeCharts(chartIds: string[]): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    try {
      // Выполняем все DELETE запросы параллельно
      await Promise.all(
        chartIds.map((id) => api.delete(`/sites/${siteId.value}/size-charts/${id}/`)),
      );

      Notify.create({
        type: 'positive',
        message: `Успешно удалено ${chartIds.length} размерных сеток.`,
      });

      // Перезагружаем список
      await fetchSizeCharts();
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при массовом удалении размерных сеток.');
      return false;
    }
  }

  // Методы для работы с поиском и фильтрацией
  async function searchSizeCharts(query: string): Promise<SizeChartFile[]> {
    pagination.setSearch(query);
    return await pagination.fetchData();
  }

  async function filterSizeCharts(
    filters: Record<string, string | number | boolean>,
  ): Promise<SizeChartFile[]> {
    Object.entries(filters).forEach(([key, value]) => {
      pagination.setFilter(key, value);
    });
    return await pagination.fetchData();
  }

  async function clearFilters(): Promise<SizeChartFile[]> {
    pagination.clearFilters();
    return await pagination.fetchData();
  }

  return {
    // State
    sizeCharts,
    selectedSizeChart,
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
    fetchSizeCharts,
    fetchSizeChartById,
    createSizeChart,
    updateSizeChart,
    deleteSizeChart,
    clearSelectedSizeChart,
    searchSizeCharts,
    filterSizeCharts,
    clearFilters,
    bulkDeleteSizeCharts,

    // Pagination methods
    goToPage: pagination.goToPage,
    goToNextPage: pagination.goToNextPage,
    goToPreviousPage: pagination.goToPreviousPage,
    handleTableRequest: pagination.handleTableRequest,
  };
});
