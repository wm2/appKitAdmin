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

// === ИНТЕРФЕЙСЫ ===

/**
 * Интерфейс для чтения информации о размере (совместимый с SizeFile из размеров)
 */
export interface SizeRead {
  readonly id: string;
  readonly value: string;
  readonly measurement_system: string;
  readonly base_value: string;
}

/**
 * Базовый интерфейс для варианта товара
 */
export interface ProductVariant {
  readonly id: string;
  readonly size: SizeRead;
  readonly sku: string;
  readonly price: string;
  readonly is_active: boolean;
  readonly attributes: Record<string, unknown>;
}

/**
 * Детальная информация о варианте товара
 * Расширяет базовый интерфейс (пока без дополнительных полей)
 */
export interface ProductVariantDetail extends ProductVariant {
  // Зарезервировано для будущих расширений
}

/**
 * Payload для создания нового варианта товара
 */
export interface ProductVariantCreatePayload {
  size: string; // UUID размера
  sku: string;
  price: string;
  is_active: boolean;
  attributes: Record<string, unknown>;
}

/**
 * Payload для обновления существующего варианта товара
 */
export interface ProductVariantUpdatePayload {
  size: string; // UUID размера
  sku: string;
  price: string;
  is_active: boolean;
  attributes: Record<string, unknown>;
}

/**
 * Интерфейс для ошибок от API
 */
interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Параметры для методов стора, требующих service_id
 */
interface ServiceContextParams {
  serviceId: string;
}

/**
 * Расширенные параметры для пагинации с контекстом сервиса
 */
interface ServicePaginationParams extends PaginationParams, ServiceContextParams {}

// === СТОР ===

export const useServiceVariantsStore = defineStore('serviceVariants', () => {
  // === STATE ===
  const variants = ref<ProductVariant[]>([]);
  const selectedVariant = ref<ProductVariantDetail | null>(null);
  const currentServiceId = ref<string | null>(null);

  // === GETTERS ===
  const siteId = computed(() => VITE_SITE_ID);

  /**
   * Проверяет, установлен ли текущий serviceId
   */
  const hasServiceContext = computed(() => !!currentServiceId.value);

  /**
   * Возвращает количество активных вариантов
   */
  const activeVariantsCount = computed(
    () => variants.value.filter((variant) => variant.is_active).length,
  );

  /**
   * Возвращает количество неактивных вариантов
   */
  const inactiveVariantsCount = computed(
    () => variants.value.filter((variant) => !variant.is_active).length,
  );

  // === PAGINATION ===
  const fetchVariantsWithPagination = async (
    url?: string,
    params?: ServicePaginationParams,
  ): Promise<PaginationResponse<ProductVariant>> => {
    if (!siteId.value) {
      throw new Error('VITE_SITE_ID не определен.');
    }

    const serviceId = params?.serviceId || currentServiceId.value;
    if (!serviceId) {
      throw new Error('service_id не определен. Установите контекст сервиса.');
    }

    try {
      let requestUrl: string;
      let requestParams: Record<string, string | number | boolean> = {};

      if (url) {
        // Используем прямую ссылку (next/previous)
        requestUrl = url;
      } else {
        // Строим URL с параметрами
        requestUrl = `/sites/${siteId.value}/services/${serviceId}/variants/`;
        // Фильтруем undefined значения и приводим к правильному типу
        requestParams = Object.entries(params ?? {}).reduce(
          (acc, [key, value]) => {
            if (value !== undefined && key !== 'serviceId') {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, string | number | boolean>,
        );
      }

      const { data } = await api.get<PaginationResponse<ProductVariant>>(requestUrl, {
        params: url ? {} : requestParams,
      });

      // Обновляем локальный массив вариантов
      variants.value = data.results;

      return data;
    } catch (error) {
      handleApiError(
        error as AxiosError<ApiError>,
        'Не удалось загрузить список вариантов товара.',
      );
      throw error;
    }
  };

  // Создаем экземпляр пагинации
  const pagination = usePagination<ProductVariant>(fetchVariantsWithPagination, {
    defaultPageSize: 10,
    defaultSortBy: 'sku',
    defaultDescending: false,
  });

  // === HELPER FUNCTIONS ===

  /**
   * Обработчик ошибок API с уведомлениями пользователя
   */
  function handleApiError(error: AxiosError<ApiError>, defaultMessage: string): void {
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

  /**
   * Валидирует наличие необходимых параметров
   */
  function validateRequiredParams(serviceId?: string): boolean {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!effectiveServiceId) {
      Notify.create({
        type: 'negative',
        message: 'service_id не определен. Установите контекст сервиса.',
      });
      return false;
    }

    return true;
  }

  // === ACTIONS ===

  /**
   * Устанавливает контекст текущего сервиса
   */
  function setServiceContext(serviceId: string): void {
    if (!serviceId) {
      console.warn('Попытка установить пустой serviceId');
      return;
    }
    currentServiceId.value = serviceId;
  }

  /**
   * Очищает контекст сервиса
   */
  function clearServiceContext(): void {
    currentServiceId.value = null;
    variants.value = [];
    selectedVariant.value = null;
  }

  /**
   * Загружает варианты товара с пагинацией
   */
  async function fetchVariants(serviceId?: string, url?: string): Promise<ProductVariant[]> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return [];
    }

    return pagination.fetchData(url, { serviceId: effectiveServiceId! });
  }

  /**
   * Получает детальную информацию о варианте товара по ID
   */
  async function fetchVariantById(
    variantId: string,
    serviceId?: string,
  ): Promise<ProductVariantDetail | null> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return null;
    }

    try {
      const { data } = await api.get<ProductVariantDetail>(
        `/sites/${siteId.value}/services/${effectiveServiceId}/variants/${variantId}/`,
      );
      selectedVariant.value = data;
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Не удалось загрузить данные варианта товара.');
      selectedVariant.value = null;
      return null;
    }
  }

  /**
   * Создает новый вариант товара
   */
  async function createVariant(
    payload: ProductVariantCreatePayload,
    serviceId?: string,
  ): Promise<ProductVariantDetail | null> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return null;
    }

    try {
      const { data } = await api.post<ProductVariantDetail>(
        `/sites/${siteId.value}/services/${effectiveServiceId}/variants/`,
        {
          size: payload.size,
          sku: payload.sku || '',
          price: payload.price || '',
          is_active: payload.is_active,
          attributes: payload.attributes || {},
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      Notify.create({
        type: 'positive',
        message: `Вариант товара ${data.sku ? `"${data.sku}"` : ''} успешно создан.`,
      });

      // Обновляем список с сохранением текущей страницы
      await fetchVariants(effectiveServiceId);
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при создании варианта товара.');
      return null;
    }
  }

  /**
   * Обновляет существующий вариант товара (полное обновление)
   */
  async function updateVariant(
    variantId: string,
    payload: ProductVariantUpdatePayload,
    serviceId?: string,
  ): Promise<ProductVariantDetail | null> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return null;
    }

    try {
      const { data } = await api.put<ProductVariantDetail>(
        `/sites/${siteId.value}/services/${effectiveServiceId}/variants/${variantId}/`,
        {
          size: payload.size,
          sku: payload.sku || '',
          price: payload.price || '',
          is_active: payload.is_active,
          attributes: payload.attributes || {},
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      Notify.create({
        type: 'positive',
        message: `Вариант товара ${data.sku ? `"${data.sku}"` : ''} успешно обновлен.`,
      });

      // Обновляем список
      await fetchVariants(effectiveServiceId);
      if (selectedVariant.value?.id === variantId) {
        await fetchVariantById(variantId, effectiveServiceId);
      }
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при обновлении варианта товара.');
      return null;
    }
  }

  /**
   * Частично обновляет вариант товара (PATCH)
   */
  async function patchVariant(
    variantId: string,
    payload: Partial<ProductVariantUpdatePayload>,
    serviceId?: string,
  ): Promise<ProductVariantDetail | null> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return null;
    }

    try {
      const { data } = await api.patch<ProductVariantDetail>(
        `/sites/${siteId.value}/services/${effectiveServiceId}/variants/${variantId}/`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      // Обновляем локальный массив без полной перезагрузки
      const variantIndex = variants.value.findIndex((variant) => variant.id === variantId);
      if (variantIndex !== -1 && variants.value[variantIndex]) {
        // Обновляем только измененные поля
        Object.assign(variants.value[variantIndex], data);
      }

      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при обновлении варианта товара.');
      return null;
    }
  }

  /**
   * Быстрое изменение статуса активности варианта
   */
  async function patchVariantStatus(
    variantId: string,
    isActive: boolean,
    serviceId?: string,
  ): Promise<boolean> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return false;
    }

    try {
      await api.patch(
        `/sites/${siteId.value}/services/${effectiveServiceId}/variants/${variantId}/`,
        { is_active: isActive },
      );

      // Обновляем локальный массив без полной перезагрузки
      const variantIndex = variants.value.findIndex((variant) => variant.id === variantId);
      if (variantIndex !== -1 && variants.value[variantIndex]) {
        variants.value[variantIndex] = {
          ...variants.value[variantIndex],
          is_active: isActive,
        };
      }

      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при изменении статуса активности.');
      return false;
    }
  }

  /**
   * Удаляет вариант товара
   */
  async function deleteVariant(variantId: string, serviceId?: string): Promise<boolean> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return false;
    }

    try {
      await api.delete(
        `/sites/${siteId.value}/services/${effectiveServiceId}/variants/${variantId}/`,
      );

      Notify.create({
        type: 'positive',
        message: 'Вариант товара успешно удален.',
      });

      // Обновляем список
      await fetchVariants(effectiveServiceId);
      if (selectedVariant.value?.id === variantId) {
        selectedVariant.value = null;
      }
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при удалении варианта товара.');
      return false;
    }
  }

  /**
   * Массовое удаление вариантов
   */
  async function bulkDeleteVariants(variantIds: string[], serviceId?: string): Promise<boolean> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return false;
    }

    try {
      // Выполняем все DELETE запросы параллельно
      await Promise.all(
        variantIds.map((id) =>
          api.delete(`/sites/${siteId.value}/services/${effectiveServiceId}/variants/${id}/`),
        ),
      );

      Notify.create({
        type: 'positive',
        message: `Успешно удалено ${variantIds.length} вариантов товара.`,
      });

      // Перезагружаем список
      await fetchVariants(effectiveServiceId);
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при массовом удалении вариантов.');
      return false;
    }
  }

  /**
   * Массовое обновление статуса активности
   */
  async function bulkUpdateVariantStatus(
    variantIds: string[],
    isActive: boolean,
    serviceId?: string,
  ): Promise<boolean> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return false;
    }

    try {
      // Выполняем все PATCH запросы параллельно
      await Promise.all(
        variantIds.map((id) =>
          api.patch(`/sites/${siteId.value}/services/${effectiveServiceId}/variants/${id}/`, {
            is_active: isActive,
          }),
        ),
      );

      // Обновляем локальный массив
      variantIds.forEach((id) => {
        const variantIndex = variants.value.findIndex((variant) => variant.id === id);
        if (variantIndex !== -1 && variants.value[variantIndex]) {
          variants.value[variantIndex] = {
            ...variants.value[variantIndex],
            is_active: isActive,
          };
        }
      });

      Notify.create({
        type: 'positive',
        message: `Успешно обновлено ${variantIds.length} вариантов товара.`,
      });

      return true;
    } catch (err) {
      handleApiError(
        err as AxiosError<ApiError>,
        'Ошибка при массовом обновлении статуса активности.',
      );
      return false;
    }
  }

  /**
   * Очищает выбранный вариант
   */
  function clearSelectedVariant(): void {
    selectedVariant.value = null;
  }

  // === SEARCH & FILTER METHODS ===

  /**
   * Поиск вариантов по запросу
   */
  async function searchVariants(query: string, serviceId?: string): Promise<ProductVariant[]> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return [];
    }

    pagination.setSearch(query);
    return await pagination.fetchData(undefined, { serviceId: effectiveServiceId });
  }

  /**
   * Применяет фильтры к списку вариантов
   */
  async function filterVariants(
    filters: Record<string, string | number | boolean>,
    serviceId?: string,
  ): Promise<ProductVariant[]> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return [];
    }

    Object.entries(filters).forEach(([key, value]) => {
      pagination.setFilter(key, value);
    });
    return await pagination.fetchData(undefined, { serviceId: effectiveServiceId });
  }

  /**
   * Очищает все фильтры
   */
  async function clearFilters(serviceId?: string): Promise<ProductVariant[]> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return [];
    }

    pagination.clearFilters();
    return await pagination.fetchData(undefined, { serviceId: effectiveServiceId });
  }

  // === RETURN STORE INTERFACE ===
  return {
    // State
    variants: computed(() => variants.value),
    selectedVariant: computed(() => selectedVariant.value),
    currentServiceId: computed(() => currentServiceId.value),
    loading: pagination.loading,

    // Computed getters
    hasServiceContext,
    activeVariantsCount,
    inactiveVariantsCount,

    // Pagination state
    currentPage: computed(() => pagination.currentPage.value),
    pageSize: computed(() => pagination.pageSize.value),
    totalCount: computed(() => pagination.totalCount.value),
    totalPages: computed(() => pagination.totalPages.value),
    hasNext: computed(() => pagination.hasNext.value),
    hasPrevious: computed(() => pagination.hasPrevious.value),
    qTablePagination: pagination.qTablePagination,

    // Context methods
    setServiceContext,
    clearServiceContext,

    // CRUD methods
    fetchVariants,
    fetchVariantById,
    createVariant,
    updateVariant,
    patchVariant,
    deleteVariant,
    clearSelectedVariant,

    // Status management
    patchVariantStatus,

    // Bulk operations
    bulkDeleteVariants,
    bulkUpdateVariantStatus,

    // Search & Filter methods
    searchVariants,
    filterVariants,
    clearFilters,

    // Pagination methods
    goToPage: pagination.goToPage,
    goToNextPage: pagination.goToNextPage,
    goToPreviousPage: pagination.goToPreviousPage,
    handleTableRequest: pagination.handleTableRequest,
  };
});
