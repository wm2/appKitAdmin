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

// 1. Интерфейсы для данных типов товаров
export interface ProductTypeFile {
  id: string;
  name: string;
  description: string;
}

export interface ProductTypeDetail extends ProductTypeFile {
  creator: {
    id: string;
    email: string;
    role: string;
  } | null;
  created: string; // ISO DateTime
  updated: string; // ISO DateTime
}

export interface ProductTypeCreatePayload {
  name: string;
  description?: string;
}

export interface ProductTypeUpdatePayload {
  name?: string;
  description?: string;
}

// 4. Интерфейс для ошибок от API
interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown; // Для других возможных полей ошибок
}

export const useProductTypesStore = defineStore('productTypes', () => {
  // === STATE ===
  const productTypes = ref<ProductTypeFile[]>([]);
  const selectedProductType = ref<ProductTypeDetail | null>(null);

  // === GETTERS ===
  const siteId = computed(() => VITE_SITE_ID);

  // === PAGINATION ===
  const fetchProductTypesWithPagination = async (
    url?: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<ProductTypeFile>> => {
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
        requestUrl = `/sites/${siteId.value}/product-types/`;
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

      const { data } = await api.get<PaginationResponse<ProductTypeFile>>(requestUrl, {
        params: url ? {} : requestParams,
      });

      // Обновляем локальный массив типов товаров
      productTypes.value = data.results;

      return data;
    } catch (error) {
      handleApiError(error as AxiosError<ApiError>, 'Не удалось загрузить список типов товаров.');
      throw error;
    }
  };

  // Создаем экземпляр пагинации
  const pagination = usePagination<ProductTypeFile>(fetchProductTypesWithPagination, {
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

  // Обертка для загрузки типов товаров с обновлением состояния
  async function fetchProductTypes(url?: string): Promise<ProductTypeFile[]> {
    return pagination.fetchData(url);
  }

  async function fetchProductTypeById(typeId: string): Promise<ProductTypeDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }
    try {
      const { data } = await api.get<ProductTypeDetail>(
        `/sites/${siteId.value}/product-types/${typeId}/`,
      );
      selectedProductType.value = data;
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Не удалось загрузить данные типа товара.');
      selectedProductType.value = null;
      return null;
    }
  }

  async function createProductType(
    payload: ProductTypeCreatePayload,
  ): Promise<ProductTypeDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }
    try {
      const { data } = await api.post<ProductTypeDetail>(
        `/sites/${siteId.value}/product-types/`,
        payload,
      );
      Notify.create({
        type: 'positive',
        message: `Тип товара "${data.name}" успешно создан.`,
      });

      // Обновляем список с сохранением текущей страницы
      await fetchProductTypes();
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при создании типа товара.');
      return null;
    }
  }

  async function updateProductType(
    typeId: string,
    payload: ProductTypeUpdatePayload,
  ): Promise<ProductTypeDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }
    try {
      const { data } = await api.put<ProductTypeDetail>(
        `/sites/${siteId.value}/product-types/${typeId}/`,
        payload,
      );
      Notify.create({
        type: 'positive',
        message: `Тип товара "${data.name}" успешно обновлен.`,
      });

      // Обновляем список
      await fetchProductTypes();
      if (selectedProductType.value?.id === typeId) {
        await fetchProductTypeById(typeId);
      }
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при обновлении типа товара.');
      return null;
    }
  }

  async function deleteProductType(typeId: string): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }
    try {
      await api.delete(`/sites/${siteId.value}/product-types/${typeId}/`);
      Notify.create({
        type: 'positive',
        message: 'Тип товара успешно удален.',
      });

      // Обновляем список
      await fetchProductTypes();
      if (selectedProductType.value?.id === typeId) {
        selectedProductType.value = null;
      }
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при удалении типа товара.');
      return false;
    }
  }

  function clearSelectedProductType() {
    selectedProductType.value = null;
  }

  // Массовое удаление через API
  async function bulkDeleteProductTypes(typeIds: string[]): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    try {
      // Выполняем все DELETE запросы параллельно
      await Promise.all(
        typeIds.map((id) => api.delete(`/sites/${siteId.value}/product-types/${id}/`)),
      );

      Notify.create({
        type: 'positive',
        message: `Успешно удалено ${typeIds.length} типов товаров.`,
      });

      // Перезагружаем список
      await fetchProductTypes();
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при массовом удалении типов товаров.');
      return false;
    }
  }

  // Методы для работы с поиском и фильтрацией
  async function searchProductTypes(query: string): Promise<ProductTypeFile[]> {
    pagination.setSearch(query);
    return await pagination.fetchData();
  }

  async function filterProductTypes(
    filters: Record<string, string | number | boolean>,
  ): Promise<ProductTypeFile[]> {
    Object.entries(filters).forEach(([key, value]) => {
      pagination.setFilter(key, value);
    });
    return await pagination.fetchData();
  }

  async function clearFilters(): Promise<ProductTypeFile[]> {
    pagination.clearFilters();
    return await pagination.fetchData();
  }

  return {
    // State
    productTypes,
    selectedProductType,
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
    fetchProductTypes,
    fetchProductTypeById,
    createProductType,
    updateProductType,
    deleteProductType,
    clearSelectedProductType,
    searchProductTypes,
    filterProductTypes,
    clearFilters,
    bulkDeleteProductTypes,

    // Pagination methods
    goToPage: pagination.goToPage,
    goToNextPage: pagination.goToNextPage,
    goToPreviousPage: pagination.goToPreviousPage,
    handleTableRequest: pagination.handleTableRequest,
  };
});
