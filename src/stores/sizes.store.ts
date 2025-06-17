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

// Интерфейсы для размеров
export interface SizeFile {
  id: string;
  value: string;
  measurement_system: string;
  base_value: string; // Значение в эталонной системе
}

export interface SizeDetail extends SizeFile {
  creator: {
    id: string;
    email: string;
    role: string;
  } | null;
  created: string; // ISO DateTime
  updated: string; // ISO DateTime
}

export interface SizeCreatePayload {
  value: string;
  measurement_system: string; // ID системы измерений
  base_value: string; // Значение в эталонной системе
}

export interface SizeUpdatePayload {
  value?: string;
  measurement_system?: string; // ID системы измерений
  base_value?: string; // Значение в эталонной системе
}

// Интерфейс для ошибок от API
interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

export const useSizesStore = defineStore('sizes', () => {
  // === STATE ===
  const sizes = ref<SizeFile[]>([]);
  const selectedSize = ref<SizeDetail | null>(null);
  const currentSizeChartId = ref<string>('');

  // === GETTERS ===
  const siteId = computed(() => VITE_SITE_ID);

  // === PAGINATION ===
  const fetchSizesWithPagination = async (
    url?: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<SizeFile>> => {
    if (!siteId.value) {
      throw new Error('VITE_SITE_ID не определен.');
    }

    if (!currentSizeChartId.value) {
      throw new Error('ID размерной сетки не определен.');
    }

    try {
      let requestUrl: string;
      let requestParams: Record<string, string | number | boolean> = {};

      if (url) {
        // Используем прямую ссылку (next/previous)
        requestUrl = url;
      } else {
        // Строим URL с параметрами
        requestUrl = `/sites/${siteId.value}/size-charts/${currentSizeChartId.value}/sizes/`;
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

      const { data } = await api.get<PaginationResponse<SizeFile>>(requestUrl, {
        params: url ? {} : requestParams,
      });

      // Обновляем локальный массив размеров
      sizes.value = data.results;

      return data;
    } catch (error) {
      handleApiError(error as AxiosError<ApiError>, 'Не удалось загрузить список размеров.');
      throw error;
    }
  };

  // Создаем экземпляр пагинации
  const pagination = usePagination<SizeFile>(fetchSizesWithPagination, {
    defaultPageSize: 10,
    defaultSortBy: 'value',
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

  // Установка текущей размерной сетки
  function setSizeChartId(sizeChartId: string) {
    currentSizeChartId.value = sizeChartId;
  }

  // Обертка для загрузки размеров с обновлением состояния
  async function fetchSizes(url?: string): Promise<SizeFile[]> {
    return pagination.fetchData(url);
  }

  async function fetchSizeById(sizeId: string): Promise<SizeDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    if (!currentSizeChartId.value) {
      Notify.create({ type: 'negative', message: 'ID размерной сетки не определен.' });
      return null;
    }

    try {
      const { data } = await api.get<SizeDetail>(
        `/sites/${siteId.value}/size-charts/${currentSizeChartId.value}/sizes/${sizeId}/`,
      );
      selectedSize.value = data;
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Не удалось загрузить данные размера.');
      selectedSize.value = null;
      return null;
    }
  }

  async function createSize(payload: SizeCreatePayload): Promise<SizeDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    if (!currentSizeChartId.value) {
      Notify.create({ type: 'negative', message: 'ID размерной сетки не определен.' });
      return null;
    }

    try {
      const { data } = await api.post<SizeDetail>(
        `/sites/${siteId.value}/size-charts/${currentSizeChartId.value}/sizes/`,
        payload,
      );
      Notify.create({
        type: 'positive',
        message: `Размер "${data.value}" успешно создан.`,
      });

      // Обновляем список с сохранением текущей страницы
      await fetchSizes();
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при создании размера.');
      return null;
    }
  }

  async function updateSize(
    sizeId: string,
    payload: SizeUpdatePayload,
  ): Promise<SizeDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    if (!currentSizeChartId.value) {
      Notify.create({ type: 'negative', message: 'ID размерной сетки не определен.' });
      return null;
    }

    try {
      const { data } = await api.put<SizeDetail>(
        `/sites/${siteId.value}/size-charts/${currentSizeChartId.value}/sizes/${sizeId}/`,
        payload,
      );
      Notify.create({
        type: 'positive',
        message: `Размер "${data.value}" успешно обновлен.`,
      });

      // Обновляем список
      await fetchSizes();
      if (selectedSize.value?.id === sizeId) {
        await fetchSizeById(sizeId);
      }
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при обновлении размера.');
      return null;
    }
  }

  async function deleteSize(sizeId: string): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    if (!currentSizeChartId.value) {
      Notify.create({ type: 'negative', message: 'ID размерной сетки не определен.' });
      return false;
    }

    try {
      await api.delete(
        `/sites/${siteId.value}/size-charts/${currentSizeChartId.value}/sizes/${sizeId}/`,
      );
      Notify.create({
        type: 'positive',
        message: 'Размер успешно удален.',
      });

      // Обновляем список
      await fetchSizes();
      if (selectedSize.value?.id === sizeId) {
        selectedSize.value = null;
      }
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при удалении размера.');
      return false;
    }
  }

  function clearSelectedSize() {
    selectedSize.value = null;
  }

  // Массовое удаление через API
  async function bulkDeleteSizes(sizeIds: string[]): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    if (!currentSizeChartId.value) {
      Notify.create({ type: 'negative', message: 'ID размерной сетки не определен.' });
      return false;
    }

    try {
      // Выполняем все DELETE запросы параллельно
      await Promise.all(
        sizeIds.map((id) =>
          api.delete(`/sites/${siteId.value}/size-charts/${currentSizeChartId.value}/sizes/${id}/`),
        ),
      );

      Notify.create({
        type: 'positive',
        message: `Успешно удалено ${sizeIds.length} размеров.`,
      });

      // Перезагружаем список
      await fetchSizes();
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при массовом удалении размеров.');
      return false;
    }
  }

  // Методы для работы с поиском и фильтрацией
  async function searchSizes(query: string): Promise<SizeFile[]> {
    pagination.setSearch(query);
    return await pagination.fetchData();
  }

  async function filterSizes(
    filters: Record<string, string | number | boolean>,
  ): Promise<SizeFile[]> {
    Object.entries(filters).forEach(([key, value]) => {
      pagination.setFilter(key, value);
    });
    return await pagination.fetchData();
  }

  async function clearFilters(): Promise<SizeFile[]> {
    pagination.clearFilters();
    return await pagination.fetchData();
  }

  // Очистка состояния при смене размерной сетки
  function clearState() {
    sizes.value = [];
    selectedSize.value = null;
    currentSizeChartId.value = '';
    pagination.clearFilters();
  }

  return {
    // State
    sizes,
    selectedSize,
    currentSizeChartId,
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
    setSizeChartId,
    fetchSizes,
    fetchSizeById,
    createSize,
    updateSize,
    deleteSize,
    clearSelectedSize,
    searchSizes,
    filterSizes,
    clearFilters,
    bulkDeleteSizes,
    clearState,

    // Pagination methods
    goToPage: pagination.goToPage,
    goToNextPage: pagination.goToNextPage,
    goToPreviousPage: pagination.goToPreviousPage,
    handleTableRequest: pagination.handleTableRequest,
  };
});
