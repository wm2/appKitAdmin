import { defineStore } from 'pinia';
import { ref, computed, readonly } from 'vue';
import { api } from 'boot/axios';
import { Notify } from 'quasar';
import type { AxiosError } from 'axios';
import type { QTableProps } from 'quasar';
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
  readonly created?: string;
  readonly updated?: string;
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
 * Интерфейс для вложения варианта сервиса (attachments)
 */
export interface VariantAttachment {
  readonly id: string;
  readonly file: string;
  readonly alt_text?: string;
  readonly is_primary: boolean;
  readonly order: number;
}

/**
 * Payload для создания вложения варианта
 */
export interface VariantAttachmentCreatePayload {
  file: File;
  alt_text?: string | undefined;
  is_primary?: boolean;
  order?: number;
}

/**
 * Payload для обновления вложения варианта
 */
export interface VariantAttachmentUpdatePayload {
  file?: File;
  alt_text?: string;
  is_primary?: boolean;
  order?: number;
}

/**
 * Интерфейс для ошибок от API
 */
interface ApiError {
  readonly detail?: string;
  readonly message?: string;
  readonly [key: string]: unknown;
}

/**
 * Интерфейс для ответа API attachments вариантов
 */
interface VariantAttachmentsApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: VariantAttachment[];
}

// === СТОР ===

export const useServiceVariantsStore = defineStore('serviceVariants', () => {
  // === STATE ===
  const variants = ref<readonly ProductVariant[]>([]);
  const selectedVariant = ref<ProductVariantDetail | null>(null);
  const currentServiceId = ref<string | null>(null);

  // НОВОЕ: состояние для управления attachments вариантов
  const variantAttachments = ref<Record<string, VariantAttachment[]>>({});
  const attachmentsLoading = ref(false);

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
    params?: PaginationParams,
  ): Promise<PaginationResponse<ProductVariant>> => {
    if (!siteId.value) {
      throw new Error('VITE_SITE_ID не определен.');
    }

    // Всегда используем текущий контекст сервиса
    const serviceId = currentServiceId.value;
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
            if (value !== undefined) {
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
      variants.value = Object.freeze(data.results);

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

    // 🔍 УЛУЧШЕННАЯ ОТЛАДКА: выводим детали запроса и ответа
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);

      // 🆕 ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ОШИБОК ВАЛИДАЦИИ
      if (error.response.data && typeof error.response.data === 'object') {
        // ✅ ИСПРАВЛЕНИЕ: заменяем any на конкретный тип
        const responseData = error.response.data as Record<string, unknown>;

        // Логируем каждое поле с ошибками
        Object.entries(responseData).forEach(([key, value]) => {
          console.error(`🚨 Validation error for field "${key}":`, value);

          // Если это массив, логируем каждый элемент
          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              console.error(`  - Error ${index + 1}:`, item);
            });
          }
        });
      }

      console.error('Request config:', error.config);
      console.error('Request data:', error.config?.data);
    }

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
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: ${value.join('; ')}`;
          }
          return `${key}: ${String(value)}`;
        })
        .join('; ');

      if (fieldErrors) {
        errorMessage = `Ошибки валидации: ${fieldErrors}`;
        console.error('Field validation errors:', errorData);
      }
    }

    Notify.create({
      type: 'negative',
      message: errorMessage,
      timeout: 10000, // Увеличиваем время показа для отладки
    });
  }

  /**
   * ✅ ИСПРАВЛЕНИЕ: изменяем сигнатуру для принятия string | null | undefined
   * Валидирует наличие необходимых параметров
   */
  function validateRequiredParams(serviceId?: string | null): boolean {
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

  /**
   * 🆕 Проверяет существующие варианты для данного сервиса и размера
   */
  async function checkExistingVariant(sizeId: string, serviceId?: string | null): Promise<boolean> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return false;
    }

    try {
      console.log('🔍 Checking existing variants for:', {
        serviceId: effectiveServiceId,
        sizeId,
        url: `/sites/${siteId.value}/services/${effectiveServiceId}/variants/`,
      });

      // Загружаем ВСЕ варианты для проверки (включая неактивные)
      const { data } = await api.get<PaginationResponse<ProductVariant>>(
        `/sites/${siteId.value}/services/${effectiveServiceId}/variants/`,
        {
          params: {
            page_size: 1000, // Загружаем максимально возможное количество
            // Не фильтруем по is_active - хотим видеть все
          },
        },
      );

      console.log('📊 All existing variants:', data.results);
      console.log('🔢 Total variants count:', data.count);

      // Проверяем дублирование по размеру
      const existingVariantWithSameSize = data.results.find(
        (variant) => variant.size.id === sizeId,
      );

      if (existingVariantWithSameSize) {
        console.log('🚨 Found existing variant with same size:', existingVariantWithSameSize);
        return true;
      }

      console.log('✅ No conflicts found, size is available');
      return false;
    } catch (error) {
      console.error('Error checking existing variants:', error);
      return false; // В случае ошибки разрешаем создание
    }
  }

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
   * Очищает выбранный вариант
   */
  function clearSelectedVariant(): void {
    selectedVariant.value = null;
  }

  /**
   * Загружает варианты товара с пагинацией
   */
  async function fetchVariants(
    serviceId?: string | null,
    url?: string,
  ): Promise<readonly ProductVariant[]> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return [];
    }

    // Устанавливаем контекст если передан serviceId
    if (serviceId) {
      setServiceContext(serviceId);
    }

    try {
      return await pagination.fetchData(url);
    } catch (error) {
      console.error('Error in fetchVariants:', error);
      return [];
    }
  }

  /**
   * Получает детальную информацию о варианте товара по ID
   */
  async function fetchVariantById(
    variantId: string,
    serviceId?: string | null,
  ): Promise<ProductVariantDetail | null> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return null;
    }

    if (!variantId) {
      console.warn('variantId is required');
      return null;
    }

    try {
      const { data } = await api.get<ProductVariantDetail>(
        `/sites/${siteId.value}/services/${effectiveServiceId}/variants/${variantId}/`,
      );
      selectedVariant.value = Object.freeze(data);
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
    serviceId?: string | null,
  ): Promise<ProductVariantDetail | null> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return null;
    }

    if (!payload.size) {
      Notify.create({ type: 'negative', message: 'Размер обязателен для заполнения.' });
      return null;
    }

    // 🆕 ПРОВЕРЯЕМ СУЩЕСТВУЮЩИЕ ВАРИАНТЫ ПЕРЕД СОЗДАНИЕМ
    console.log('🔍 Pre-checking for existing variants...');
    const hasConflict = await checkExistingVariant(payload.size, effectiveServiceId);

    if (hasConflict) {
      Notify.create({
        type: 'negative',
        message:
          'Для этого сервиса уже существует вариант с выбранным размером. Выберите другой размер или отредактируйте существующий вариант.',
        timeout: 8000,
      });
      return null;
    }

    // 🔧 Подготавливаем данные для отправки
    const requestData = {
      size: payload.size,
      sku: payload.sku || '',
      price: payload.price || '0',
      is_active: payload.is_active,
      attributes: payload.attributes || {},
    };

    console.log('🚀 Creating variant with data:', requestData);
    console.log('🌐 URL:', `/sites/${siteId.value}/services/${effectiveServiceId}/variants/`);

    try {
      const { data } = await api.post<ProductVariantDetail>(
        `/sites/${siteId.value}/services/${effectiveServiceId}/variants/`,
        requestData,
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
      return Object.freeze(data);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;

      // ✅ УЛУЧШЕННАЯ ОБРАБОТКА ОШИБОК
      console.error('❌ CREATE VARIANT ERROR:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        url: axiosError.config?.url,
        method: axiosError.config?.method,
        data: axiosError.config?.data,
        responseData: axiosError.response?.data,
      });

      // Для ошибки 500 (серверная ошибка) не пытаемся retry
      if (axiosError.response?.status === 500) {
        console.error('🚨 SERVER ERROR 500 - проблема на бэкенде');
        Notify.create({
          type: 'negative',
          message: 'Серверная ошибка. Обратитесь к разработчику.',
          timeout: 10000,
        });
        return null;
      }

      // Для ошибки 400 пробуем другой формат данных
      if (axiosError.response?.status === 400) {
        console.log('💡 Retrying with string price...');
        const retryData = { ...requestData, price: String(payload.price || '0') };

        try {
          const { data } = await api.post<ProductVariantDetail>(
            `/sites/${siteId.value}/services/${effectiveServiceId}/variants/`,
            retryData,
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

          await fetchVariants(effectiveServiceId);
          return Object.freeze(data);
        } catch (retryErr) {
          handleApiError(
            retryErr as AxiosError<ApiError>,
            'Ошибка при создании варианта товара (retry).',
          );
          return null;
        }
      }

      // Для всех остальных ошибок
      handleApiError(axiosError, 'Ошибка при создании варианта товара.');
      return null;
    }
  }

  /**
   * Обновляет существующий вариант товара (полное обновление)
   */
  async function updateVariant(
    variantId: string,
    payload: ProductVariantUpdatePayload,
    serviceId?: string | null,
  ): Promise<ProductVariantDetail | null> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return null;
    }

    if (!variantId) {
      console.warn('variantId is required');
      return null;
    }

    if (!payload.size) {
      Notify.create({ type: 'negative', message: 'Размер обязателен для заполнения.' });
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
      return Object.freeze(data);
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
    serviceId?: string | null,
  ): Promise<ProductVariantDetail | null> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return null;
    }

    if (!variantId) {
      console.warn('variantId is required');
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
        // Создаем новый массив с обновленными данными для иммутабельности
        const updatedVariants = [...variants.value];
        updatedVariants[variantIndex] = Object.freeze({
          ...updatedVariants[variantIndex],
          ...data,
        });
        variants.value = Object.freeze(updatedVariants);
      }

      return Object.freeze(data);
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при обновлении варианта товара.');
      return null;
    }
  }

  /**
   * ✅ ИСПРАВЛЕНИЕ: улучшенная типизация для обновления массива
   * Быстрое изменение статуса активности варианта
   */
  async function patchVariantStatus(
    variantId: string,
    isActive: boolean,
    serviceId?: string | null,
  ): Promise<boolean> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return false;
    }

    if (!variantId) {
      console.warn('variantId is required');
      return false;
    }

    try {
      await api.patch(
        `/sites/${siteId.value}/services/${effectiveServiceId}/variants/${variantId}/`,
        { is_active: isActive },
      );

      // ✅ ИСПРАВЛЕНИЕ: правильная типизация при обновлении массива
      const variantIndex = variants.value.findIndex((variant) => variant.id === variantId);
      if (variantIndex !== -1 && variants.value[variantIndex]) {
        const currentVariant = variants.value[variantIndex];
        if (currentVariant) {
          const updatedVariants = [...variants.value];
          updatedVariants[variantIndex] = Object.freeze({
            ...currentVariant,
            is_active: isActive,
          });
          variants.value = Object.freeze(updatedVariants);
        }
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
  async function deleteVariant(variantId: string, serviceId?: string | null): Promise<boolean> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return false;
    }

    if (!variantId) {
      console.warn('variantId is required');
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
  async function bulkDeleteVariants(
    variantIds: readonly string[],
    serviceId?: string | null,
  ): Promise<boolean> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return false;
    }

    if (!variantIds || variantIds.length === 0) {
      console.warn('variantIds array is required and cannot be empty');
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
    variantIds: readonly string[],
    isActive: boolean,
    serviceId?: string | null,
  ): Promise<boolean> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return false;
    }

    if (!variantIds || variantIds.length === 0) {
      console.warn('variantIds array is required and cannot be empty');
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

      Notify.create({
        type: 'positive',
        message: `Статус активности обновлен для ${variantIds.length} вариантов товара.`,
      });

      // Перезагружаем список
      await fetchVariants(effectiveServiceId);
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при массовом обновлении статуса.');
      return false;
    }
  }

  /**
   * Поиск вариантов по запросу
   */
  async function searchVariants(
    query: string,
    serviceId?: string | null,
  ): Promise<readonly ProductVariant[]> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return [];
    }

    // Устанавливаем контекст сервиса перед поиском
    if (serviceId) {
      setServiceContext(serviceId);
    }

    try {
      pagination.setSearch(query);
      return await pagination.fetchData();
    } catch (error) {
      console.error('Error in searchVariants:', error);
      return [];
    }
  }

  /**
   * Фильтрация вариантов
   */
  async function filterVariants(
    filters: Record<string, string | number | boolean | undefined>,
    serviceId?: string | null,
  ): Promise<readonly ProductVariant[]> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return [];
    }

    // Устанавливаем контекст сервиса перед фильтрацией
    if (serviceId) {
      setServiceContext(serviceId);
    }

    try {
      Object.entries(filters).forEach(([key, value]) => {
        pagination.setFilter(key, value);
      });

      return await pagination.fetchData();
    } catch (error) {
      console.error('Error in filterVariants:', error);
      return [];
    }
  }

  /**
   * Очищает все фильтры
   */
  async function clearFilters(serviceId?: string | null): Promise<readonly ProductVariant[]> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return [];
    }

    // Устанавливаем контекст сервиса перед очисткой
    if (serviceId) {
      setServiceContext(serviceId);
    }

    try {
      pagination.clearFilters();
      return await pagination.fetchData();
    } catch (error) {
      console.error('Error in clearFilters:', error);
      return [];
    }
  }

  /**
   * Обработчик запросов от QTable (КРИТИЧЕСКИ ВАЖНЫЙ МЕТОД!)
   */
  async function handleTableRequest(props: {
    pagination: QTableProps['pagination'];
  }): Promise<readonly ProductVariant[]> {
    if (!props.pagination) {
      console.warn('pagination props are required');
      return [];
    }

    const effectiveServiceId = currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId)) {
      return [];
    }

    try {
      // 🔧 ИСПРАВЛЕНИЕ: правильно вызываем handleTableRequest из композабла
      return await pagination.handleTableRequest(props);
    } catch (error) {
      console.error('Error in handleTableRequest:', error);
      return [];
    }
  }

  // === МЕТОДЫ ДЛЯ РАБОТЫ С ATTACHMENTS ВАРИАНТОВ ===

  /**
   * Валидация файла изображения
   */
  function validateImageFile(file: File): { isValid: boolean; error?: string } {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB

    if (!imageTypes.includes(file.type)) {
      return { isValid: false, error: 'Файл должен быть изображением (JPG, PNG, GIF, WebP).' };
    }

    if (file.size > maxSizeBytes) {
      return { isValid: false, error: 'Размер файла не должен превышать 10MB.' };
    }

    return { isValid: true };
  }

  /**
   * Получение attachments для варианта
   */
  function getVariantAttachments(variantId: string): VariantAttachment[] {
    return variantAttachments.value[variantId] || [];
  }

  /**
   * Загрузка attachments для варианта
   */
  async function fetchVariantAttachments(
    variantId: string,
    serviceId?: string | null,
  ): Promise<VariantAttachment[]> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId) || !variantId) {
      console.warn('serviceId and variantId are required');
      return [];
    }

    attachmentsLoading.value = true;
    try {
      const { data } = await api.get<VariantAttachmentsApiResponse>(
        `/sites/${siteId.value}/services/${effectiveServiceId}/variants/${variantId}/attachments/`,
      );

      variantAttachments.value = {
        ...variantAttachments.value,
        [variantId]: data.results,
      };

      return data.results;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Не удалось загрузить изображения варианта.');
      return [];
    } finally {
      attachmentsLoading.value = false;
    }
  }

  /**
   * Создание attachment для варианта
   */
  async function createVariantAttachment(
    variantId: string,
    payload: VariantAttachmentCreatePayload,
    serviceId?: string | null,
  ): Promise<VariantAttachment | null> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId) || !variantId || !payload.file) {
      console.warn('serviceId, variantId and file are required');
      return null;
    }

    attachmentsLoading.value = true;
    try {
      const formData = new FormData();
      formData.append('file', payload.file);

      if (payload.alt_text) formData.append('alt_text', payload.alt_text);
      if (payload.is_primary !== undefined)
        formData.append('is_primary', String(payload.is_primary));
      if (payload.order !== undefined) formData.append('order', String(payload.order));

      const uploadUrl = `/sites/${siteId.value}/services/${effectiveServiceId}/variants/${variantId}/attachments/`;
      console.log('🚀 POST request to:', uploadUrl);
      console.log(
        '📦 FormData entries:',
        Array.from(formData.entries()).map(([key, value]) =>
          value instanceof File ? [key, `File(${value.name})`] : [key, value],
        ),
      );

      const { data } = await api.post<VariantAttachment>(uploadUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('✅ Upload successful:', data);

      Notify.create({ type: 'positive', message: 'Изображение варианта успешно добавлено.' });

      // Обновляем локальный кеш
      await fetchVariantAttachments(variantId, effectiveServiceId);

      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при добавлении изображения варианта.');
      return null;
    } finally {
      attachmentsLoading.value = false;
    }
  }

  /**
   * Обновление attachment варианта
   */
  async function updateVariantAttachment(
    variantId: string,
    attachmentId: string,
    payload: VariantAttachmentUpdatePayload,
    serviceId?: string | null,
  ): Promise<VariantAttachment | null> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId) || !variantId || !attachmentId) {
      console.warn('serviceId, variantId and attachmentId are required');
      return null;
    }

    attachmentsLoading.value = true;
    try {
      const formData = new FormData();

      if (payload.file) formData.append('file', payload.file);
      if (payload.alt_text !== undefined) formData.append('alt_text', payload.alt_text);
      if (payload.is_primary !== undefined)
        formData.append('is_primary', String(payload.is_primary));
      if (payload.order !== undefined) formData.append('order', String(payload.order));

      const { data } = await api.patch<VariantAttachment>(
        `/sites/${siteId.value}/services/${effectiveServiceId}/variants/${variantId}/attachments/${attachmentId}/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      Notify.create({ type: 'positive', message: 'Изображение варианта успешно обновлено.' });

      // Обновляем локальный кеш
      await fetchVariantAttachments(variantId, effectiveServiceId);

      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при обновлении изображения варианта.');
      return null;
    } finally {
      attachmentsLoading.value = false;
    }
  }

  /**
   * Удаление attachment варианта
   */
  async function deleteVariantAttachment(
    variantId: string,
    attachmentId: string,
    serviceId?: string | null,
  ): Promise<boolean> {
    const effectiveServiceId = serviceId || currentServiceId.value;
    if (!validateRequiredParams(effectiveServiceId) || !variantId || !attachmentId) {
      console.warn('serviceId, variantId and attachmentId are required');
      return false;
    }

    attachmentsLoading.value = true;
    try {
      await api.delete(
        `/sites/${siteId.value}/services/${effectiveServiceId}/variants/${variantId}/attachments/${attachmentId}/`,
      );

      Notify.create({ type: 'positive', message: 'Изображение варианта успешно удалено.' });

      // Обновляем локальный кеш
      await fetchVariantAttachments(variantId, effectiveServiceId);

      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при удалении изображения варианта.');
      return false;
    } finally {
      attachmentsLoading.value = false;
    }
  }

  /**
   * Установка главного изображения варианта
   */
  async function setVariantPrimaryAttachment(
    variantId: string,
    attachmentId: string,
    serviceId?: string | null,
  ): Promise<boolean> {
    return !!(await updateVariantAttachment(
      variantId,
      attachmentId,
      { is_primary: true },
      serviceId,
    ));
  }

  /**
   * Массовая загрузка attachments для варианта
   */
  async function uploadMultipleVariantAttachments(
    variantId: string,
    files: File[],
    altTexts?: string[],
    serviceId?: string | null,
  ): Promise<VariantAttachment[]> {
    console.log('🔄 uploadMultipleVariantAttachments called with:', {
      variantId,
      filesCount: files.length,
      altTextsCount: altTexts?.length || 0,
      serviceId,
    });

    const effectiveServiceId = serviceId || currentServiceId.value;
    console.log('🔍 Validation check:', {
      hasEffectiveServiceId: !!effectiveServiceId,
      hasVariantId: !!variantId,
      hasFiles: !!files.length,
      validateRequiredParams: validateRequiredParams(effectiveServiceId),
    });

    if (!validateRequiredParams(effectiveServiceId) || !variantId || !files.length) {
      console.warn('❌ Validation failed - serviceId, variantId and files are required');
      return [];
    }

    console.log('✅ Using serviceId:', effectiveServiceId);
    console.log(
      '🎯 Will upload to URL pattern: /sites/{siteId}/services/{serviceId}/variants/{variantId}/attachments/',
    );
    const results: VariantAttachment[] = [];
    const isFirstUpload = getVariantAttachments(variantId).length === 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;

      console.log(`📤 Processing file ${i + 1}/${files.length}:`, {
        name: file.name,
        type: file.type,
        size: file.size,
        altText: altTexts?.[i],
      });

      const validation = validateImageFile(file);
      if (!validation.isValid) {
        console.warn(`❌ File validation failed for ${file.name}:`, validation.error);
        Notify.create({
          type: 'negative',
          message: `${file.name}: ${validation.error}`,
        });
        continue;
      }

      const payload: VariantAttachmentCreatePayload = {
        file,
        alt_text: altTexts?.[i],
        is_primary: i === 0 && isFirstUpload,
        order: getVariantAttachments(variantId).length + i,
      };

      console.log(`🚀 Calling createVariantAttachment for file: ${file.name}`, payload);
      const result = await createVariantAttachment(variantId, payload, effectiveServiceId);
      if (result) {
        console.log(`✅ Successfully uploaded file: ${file.name}`, result);
        results.push(result);
      } else {
        console.error(`❌ Failed to upload file: ${file.name}`);
      }
    }

    if (results.length > 0) {
      console.log(`🎉 All files uploaded successfully. Total: ${results.length}`);
      Notify.create({
        type: 'positive',
        message: `Успешно загружено ${results.length} изображений для варианта.`,
      });
    }

    return results;
  }

  /**
   * Очистка кеша attachments для варианта
   */
  function clearVariantAttachments(variantId?: string): void {
    if (variantId) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [variantId]: _removed, ...rest } = variantAttachments.value;
      variantAttachments.value = rest;
    } else {
      variantAttachments.value = {};
    }
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
    checkExistingVariant, // 🆕 Новый метод для проверки существующих вариантов

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

    // 🎯 КРИТИЧЕСКИ ВАЖНЫЙ МЕТОД - был пропущен в оригинальном коде!
    handleTableRequest,

    // Attachments
    variantAttachments: readonly(variantAttachments),
    attachmentsLoading: readonly(attachmentsLoading),
    validateImageFile,
    getVariantAttachments,
    fetchVariantAttachments,
    createVariantAttachment,
    updateVariantAttachment,
    deleteVariantAttachment,
    setVariantPrimaryAttachment,
    uploadMultipleVariantAttachments,
    clearVariantAttachments,
  };
});
