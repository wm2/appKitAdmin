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

// 1. Интерфейсы для данных бренда
export interface BrandFile {
  id: string;
  name: string;
  slug: string;
  is_published: boolean;
  file: string; // URL
}

export interface BrandDetail extends BrandFile {
  description: string;
  file_name: string;
  file_type: string;
  site: string;
  creator: {
    id: string;
    email: string;
    role: string;
  };
  created: string; // ISO DateTime
  updated: string; // ISO DateTime
}

export interface BrandCreatePayload {
  name: string;
  description?: string;
  is_published?: boolean;
  file?: File; // Для загрузки файла
}

export interface BrandUpdatePayload {
  name?: string;
  description?: string;
  is_published?: boolean;
  file?: File; // Для загрузки файла
}

// 4. Интерфейс для ошибок от API
interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown; // Для других возможных полей ошибок
}

export const useBrandsStore = defineStore('brands', () => {
  // === STATE ===
  const brands = ref<BrandFile[]>([]);
  const selectedBrand = ref<BrandDetail | null>(null);

  // === GETTERS ===
  const siteId = computed(() => VITE_SITE_ID);

  // === PAGINATION ===
  const fetchBrandsWithPagination = async (
    url?: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<BrandFile>> => {
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
        requestUrl = `/sites/${siteId.value}/brands/`;
        // Filter out undefined values and convert to the correct type
        requestParams = Object.entries(params ?? {}).reduce(
          (acc, [key, value]) => {
            if (value !== undefined) {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, string | number | boolean>,
        );
      }

      const { data } = await api.get<PaginationResponse<BrandFile>>(requestUrl, {
        params: url ? {} : requestParams,
      });

      // Обновляем локальный массив брендов
      brands.value = data.results;

      return data;
    } catch (error) {
      handleApiError(error as AxiosError<ApiError>, 'Не удалось загрузить список брендов.');
      throw error;
    }
  };

  // Создаем экземпляр пагинации
  const pagination = usePagination<BrandFile>(fetchBrandsWithPagination, {
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

  // Обертка для загрузки брендов с обновлением состояния
  async function fetchBrands(url?: string): Promise<BrandFile[]> {
    return pagination.fetchData(url);
  }

  async function fetchBrandById(brandId: string): Promise<BrandDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }
    try {
      const { data } = await api.get<BrandDetail>(`/sites/${siteId.value}/brands/${brandId}/`);
      selectedBrand.value = data;
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Не удалось загрузить данные бренда.');
      selectedBrand.value = null;
      return null;
    }
  }

  async function createBrand(payload: BrandCreatePayload): Promise<BrandDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }
    try {
      const formData = new FormData();
      formData.append('name', payload.name);
      if (payload.description) formData.append('description', payload.description);
      if (payload.is_published !== undefined) {
        formData.append('is_published', String(payload.is_published));
      }
      if (payload.file) formData.append('file', payload.file);

      const { data } = await api.post<BrandDetail>(`/sites/${siteId.value}/brands/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      Notify.create({
        type: 'positive',
        message: `Бренд "${data.name}" успешно создан.`,
      });

      // Обновляем список с сохранением текущей страницы
      await fetchBrands();
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при создании бренда.');
      return null;
    }
  }

  async function updateBrand(
    brandId: string,
    payload: BrandUpdatePayload,
  ): Promise<BrandDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }
    try {
      const formData = new FormData();
      if (payload.name) formData.append('name', payload.name);
      if (payload.description) formData.append('description', payload.description);
      if (payload.is_published !== undefined) {
        formData.append('is_published', String(payload.is_published));
      }
      if (payload.file) formData.append('file', payload.file);

      const { data } = await api.put<BrandDetail>(
        `/sites/${siteId.value}/brands/${brandId}/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      Notify.create({
        type: 'positive',
        message: `Бренд "${data.name}" успешно обновлен.`,
      });

      // Обновляем список
      await fetchBrands();
      if (selectedBrand.value?.id === brandId) {
        await fetchBrandById(brandId);
      }
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при обновлении бренда.');
      return null;
    }
  }

  async function deleteBrand(brandId: string): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }
    try {
      await api.delete(`/sites/${siteId.value}/brands/${brandId}/`);
      Notify.create({
        type: 'positive',
        message: 'Бренд успешно удален.',
      });

      // Обновляем список
      await fetchBrands();
      if (selectedBrand.value?.id === brandId) {
        selectedBrand.value = null;
      }
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при удалении бренда.');
      return false;
    }
  }

  function clearSelectedBrand() {
    selectedBrand.value = null;
  }
  // Быстрое обновление статуса через PATCH
  async function patchBrandStatus(brandId: string, is_published: boolean): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    try {
      await api.patch(`/sites/${siteId.value}/brands/${brandId}/`, {
        is_published: is_published,
      });

      // Обновляем локальный массив без полной перезагрузки
      const brandIndex = brands.value.findIndex((brand) => brand.id === brandId);
      if (brandIndex !== -1 && brands.value[brandIndex]) {
        brands.value[brandIndex].is_published = is_published;
      }

      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при изменении статуса публикации.');
      return false;
    }
  }

  // Массовое удаление через API
  async function bulkDeleteBrands(brandIds: string[]): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    try {
      // Выполняем все DELETE запросы параллельно
      await Promise.all(brandIds.map((id) => api.delete(`/sites/${siteId.value}/brands/${id}/`)));

      Notify.create({
        type: 'positive',
        message: `Успешно удалено ${brandIds.length} брендов.`,
      });

      // Перезагружаем список
      await fetchBrands();
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при массовом удалении брендов.');
      return false;
    }
  }

  // Массовое обновление статуса через PATCH
  async function bulkUpdateBrandStatus(
    brandIds: string[],
    is_published: boolean,
  ): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    try {
      // Выполняем все PATCH запросы параллельно
      await Promise.all(
        brandIds.map((id) => api.patch(`/sites/${siteId.value}/brands/${id}/`, { is_published })),
      );

      // Обновляем локальный массив
      brandIds.forEach((id) => {
        const brandIndex = brands.value.findIndex((brand) => brand.id === id);
        if (brandIndex !== -1 && brands.value[brandIndex]) {
          brands.value[brandIndex].is_published = is_published;
        }
      });

      Notify.create({
        type: 'positive',
        message: `Успешно обновлено ${brandIds.length} брендов.`,
      });

      return true;
    } catch (err) {
      handleApiError(
        err as AxiosError<ApiError>,
        'Ошибка при массовом обновлении статуса публикации.',
      );
      return false;
    }
  }
  // Методы для работы с поиском и фильтрацией
  async function searchBrands(query: string): Promise<BrandFile[]> {
    pagination.setSearch(query);
    return await pagination.fetchData();
  }

  async function filterBrands(
    filters: Record<string, string | number | boolean>,
  ): Promise<BrandFile[]> {
    Object.entries(filters).forEach(([key, value]) => {
      pagination.setFilter(key, value);
    });
    return await pagination.fetchData();
  }

  async function clearFilters(): Promise<BrandFile[]> {
    pagination.clearFilters();
    return await pagination.fetchData();
  }

  return {
    // State
    brands,
    selectedBrand,
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
    fetchBrands,
    fetchBrandById,
    createBrand,
    updateBrand,
    deleteBrand,
    clearSelectedBrand,
    searchBrands,
    filterBrands,
    clearFilters,
    patchBrandStatus,
    bulkDeleteBrands,
    bulkUpdateBrandStatus,

    // Pagination methods
    goToPage: pagination.goToPage,
    goToNextPage: pagination.goToNextPage,
    goToPreviousPage: pagination.goToPreviousPage,
    handleTableRequest: pagination.handleTableRequest,
  };
});
