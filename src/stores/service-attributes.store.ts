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
 * Интерфейс для создателя/автора
 */
export interface Creator {
  readonly id: string;
  readonly email: string;
  readonly role: string;
}

/**
 * Интерфейс для значения атрибута (краткий для списков)
 */
export interface AttributeValue {
  readonly id: string;
  readonly value: string;
  readonly slug: string;
  readonly color_code?: string;
  readonly order: number;
}

/**
 * Интерфейс для детального значения атрибута
 */
export interface AttributeValueDetail extends AttributeValue {
  readonly attribute_type: string;
  readonly creator: Creator;
  readonly created: string;
  readonly updated: string;
}

/**
 * Интерфейс для типа атрибута (краткий для списков)
 */
export interface AttributeType {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly max_values_per_product: number;
  readonly is_required: boolean;
  readonly order: number;
  readonly show_in_filters: boolean;
  readonly site: string;
  readonly creator: Creator;
  readonly values: readonly AttributeValue[];
  readonly created: string;
  readonly updated: string;
}

/**
 * Интерфейс для атрибута товара/сервиса
 */
export interface ServiceAttribute {
  readonly id: string;
  readonly attribute_value: AttributeValue;
  readonly attribute_type_name: string;
}

// === PAYLOAD ИНТЕРФЕЙСЫ ===

/**
 * Payload для создания типа атрибута
 */
export interface AttributeTypeCreatePayload {
  name: string;
  max_values_per_product?: number;
  is_required?: boolean;
  order?: number;
  show_in_filters?: boolean;
}

/**
 * Payload для обновления типа атрибута
 */
export interface AttributeTypeUpdatePayload {
  name?: string;
  max_values_per_product?: number;
  is_required?: boolean;
  order?: number;
  show_in_filters?: boolean;
}

/**
 * Payload для создания значения атрибута
 */
export interface AttributeValueCreatePayload {
  value: string;
  color_code?: string;
  order?: number;
}

/**
 * Payload для обновления значения атрибута
 */
export interface AttributeValueUpdatePayload {
  value?: string;
  color_code?: string;
  order?: number;
}

/**
 * Payload для прикрепления атрибута к товару
 */
export interface ServiceAttributeCreatePayload {
  attribute_value: string; // ID значения атрибута
}

/**
 * Интерфейс для ошибок от API
 */
interface ApiError {
  readonly detail?: string;
  readonly message?: string;
  readonly [key: string]: unknown;
}

export const useServiceAttributesStore = defineStore('serviceAttributes', () => {
  // === STATE ===
  const attributeTypes = ref<readonly AttributeType[]>([]);
  const selectedAttributeType = ref<AttributeType | null>(null);
  const attributeValues = ref<readonly AttributeValueDetail[]>([]);
  const selectedAttributeValue = ref<AttributeValueDetail | null>(null);
  const serviceAttributes = ref<readonly ServiceAttribute[]>([]);

  // === GETTERS ===
  const siteId = computed(() => VITE_SITE_ID);

  // === PAGINATION FOR ATTRIBUTE TYPES ===
  const fetchAttributeTypesWithPagination = async (
    url?: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<AttributeType>> => {
    if (!siteId.value) {
      throw new Error('VITE_SITE_ID не определен.');
    }

    try {
      let requestUrl: string;
      let requestParams: Record<string, string | number | boolean> = {};

      if (url) {
        requestUrl = url;
      } else {
        requestUrl = `/sites/${siteId.value}/attribute-types/`;
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

      const { data } = await api.get<PaginationResponse<AttributeType>>(requestUrl, {
        params: url ? {} : requestParams,
      });

      attributeTypes.value = Object.freeze(data.results);
      return data;
    } catch (error) {
      handleApiError(error as AxiosError<ApiError>, 'Не удалось загрузить список типов атрибутов.');
      throw error;
    }
  };

  const attributeTypesPagination = usePagination<AttributeType>(fetchAttributeTypesWithPagination, {
    defaultPageSize: 10,
    defaultSortBy: 'order',
    defaultDescending: false,
  });

  // === PAGINATION FOR ATTRIBUTE VALUES ===
  const fetchAttributeValuesWithPagination = async (
    attributeTypeId: string,
    url?: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<AttributeValueDetail>> => {
    if (!siteId.value) {
      throw new Error('VITE_SITE_ID не определен.');
    }

    try {
      let requestUrl: string;
      let requestParams: Record<string, string | number | boolean> = {};

      if (url) {
        requestUrl = url;
      } else {
        requestUrl = `/sites/${siteId.value}/attribute-types/${attributeTypeId}/values/`;
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

      const { data } = await api.get<PaginationResponse<AttributeValueDetail>>(requestUrl, {
        params: url ? {} : requestParams,
      });

      attributeValues.value = Object.freeze(data.results);
      return data;
    } catch (error) {
      handleApiError(
        error as AxiosError<ApiError>,
        'Не удалось загрузить список значений атрибутов.',
      );
      throw error;
    }
  };

  // === UTILS ===
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

  // === ATTRIBUTE TYPES ACTIONS ===

  /**
   * Получение списка типов атрибутов
   */
  async function fetchAttributeTypes(url?: string): Promise<readonly AttributeType[]> {
    return attributeTypesPagination.fetchData(url);
  }

  /**
   * Получение конкретного типа атрибута по ID
   */
  async function fetchAttributeTypeById(attributeTypeId: string): Promise<AttributeType | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    if (!attributeTypeId) {
      console.warn('attributeTypeId is required');
      return null;
    }

    try {
      const { data } = await api.get<AttributeType>(
        `/sites/${siteId.value}/attribute-types/${attributeTypeId}/`,
      );
      selectedAttributeType.value = Object.freeze(data);
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Не удалось загрузить данные типа атрибута.');
      selectedAttributeType.value = null;
      return null;
    }
  }

  /**
   * Создание нового типа атрибута
   */
  async function createAttributeType(
    payload: AttributeTypeCreatePayload,
  ): Promise<AttributeType | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    if (!payload.name) {
      console.warn('payload.name is required');
      return null;
    }

    try {
      const { data } = await api.post<AttributeType>(
        `/sites/${siteId.value}/attribute-types/`,
        payload,
      );

      Notify.create({
        type: 'positive',
        message: `Тип атрибута "${data.name}" успешно создан.`,
      });

      await fetchAttributeTypes();
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при создании типа атрибута.');
      return null;
    }
  }

  /**
   * Обновление типа атрибута
   */
  async function updateAttributeType(
    attributeTypeId: string,
    payload: AttributeTypeUpdatePayload,
  ): Promise<AttributeType | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    if (!attributeTypeId) {
      console.warn('attributeTypeId is required');
      return null;
    }

    try {
      const { data } = await api.put<AttributeType>(
        `/sites/${siteId.value}/attribute-types/${attributeTypeId}/`,
        payload,
      );

      Notify.create({
        type: 'positive',
        message: `Тип атрибута "${data.name}" успешно обновлен.`,
      });

      await fetchAttributeTypes();
      if (selectedAttributeType.value?.id === attributeTypeId) {
        await fetchAttributeTypeById(attributeTypeId);
      }
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при обновлении типа атрибута.');
      return null;
    }
  }

  /**
   * Удаление типа атрибута
   */
  async function deleteAttributeType(attributeTypeId: string): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    if (!attributeTypeId) {
      console.warn('attributeTypeId is required');
      return false;
    }

    try {
      await api.delete(`/sites/${siteId.value}/attribute-types/${attributeTypeId}/`);

      Notify.create({
        type: 'positive',
        message: 'Тип атрибута успешно удален.',
      });

      await fetchAttributeTypes();
      if (selectedAttributeType.value?.id === attributeTypeId) {
        selectedAttributeType.value = null;
      }
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при удалении типа атрибута.');
      return false;
    }
  }

  // === ATTRIBUTE VALUES ACTIONS ===

  /**
   * Получение значений для конкретного типа атрибута
   */
  async function fetchAttributeValues(
    attributeTypeId: string,
    url?: string,
  ): Promise<readonly AttributeValueDetail[]> {
    if (!attributeTypeId) {
      console.warn('attributeTypeId is required');
      return [];
    }

    return fetchAttributeValuesWithPagination(attributeTypeId, url);
  }

  /**
   * Получение конкретного значения атрибута
   */
  async function fetchAttributeValueById(
    attributeTypeId: string,
    attributeValueId: string,
  ): Promise<AttributeValueDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    if (!attributeTypeId || !attributeValueId) {
      console.warn('attributeTypeId and attributeValueId are required');
      return null;
    }

    try {
      const { data } = await api.get<AttributeValueDetail>(
        `/sites/${siteId.value}/attribute-types/${attributeTypeId}/values/${attributeValueId}/`,
      );
      selectedAttributeValue.value = Object.freeze(data);
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Не удалось загрузить данные значения атрибута.');
      selectedAttributeValue.value = null;
      return null;
    }
  }

  /**
   * Создание нового значения атрибута
   */
  async function createAttributeValue(
    attributeTypeId: string,
    payload: AttributeValueCreatePayload,
  ): Promise<AttributeValueDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    if (!attributeTypeId || !payload.value) {
      console.warn('attributeTypeId and payload.value are required');
      return null;
    }

    try {
      const { data } = await api.post<AttributeValueDetail>(
        `/sites/${siteId.value}/attribute-types/${attributeTypeId}/values/`,
        payload,
      );

      Notify.create({
        type: 'positive',
        message: `Значение атрибута "${data.value}" успешно создано.`,
      });

      await fetchAttributeValues(attributeTypeId);
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при создании значения атрибута.');
      return null;
    }
  }

  /**
   * Обновление значения атрибута
   */
  async function updateAttributeValue(
    attributeTypeId: string,
    attributeValueId: string,
    payload: AttributeValueUpdatePayload,
  ): Promise<AttributeValueDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    if (!attributeTypeId || !attributeValueId) {
      console.warn('attributeTypeId and attributeValueId are required');
      return null;
    }

    try {
      const { data } = await api.put<AttributeValueDetail>(
        `/sites/${siteId.value}/attribute-types/${attributeTypeId}/values/${attributeValueId}/`,
        payload,
      );

      Notify.create({
        type: 'positive',
        message: `Значение атрибута "${data.value}" успешно обновлено.`,
      });

      await fetchAttributeValues(attributeTypeId);
      if (selectedAttributeValue.value?.id === attributeValueId) {
        await fetchAttributeValueById(attributeTypeId, attributeValueId);
      }
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при обновлении значения атрибута.');
      return null;
    }
  }

  /**
   * Удаление значения атрибута
   */
  async function deleteAttributeValue(
    attributeTypeId: string,
    attributeValueId: string,
  ): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    if (!attributeTypeId || !attributeValueId) {
      console.warn('attributeTypeId and attributeValueId are required');
      return false;
    }

    try {
      await api.delete(
        `/sites/${siteId.value}/attribute-types/${attributeTypeId}/values/${attributeValueId}/`,
      );

      Notify.create({
        type: 'positive',
        message: 'Значение атрибута успешно удалено.',
      });

      await fetchAttributeValues(attributeTypeId);
      if (selectedAttributeValue.value?.id === attributeValueId) {
        selectedAttributeValue.value = null;
      }
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при удалении значения атрибута.');
      return false;
    }
  }

  // === SERVICE ATTRIBUTES ACTIONS ===

  /**
   * Получение атрибутов товара/сервиса
   */
  async function fetchServiceAttributes(serviceId: string): Promise<readonly ServiceAttribute[]> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return [];
    }

    if (!serviceId) {
      console.warn('serviceId is required');
      return [];
    }

    try {
      const { data } = await api.get<PaginationResponse<ServiceAttribute>>(
        `/sites/${siteId.value}/services/${serviceId}/attributes/`,
      );
      serviceAttributes.value = Object.freeze(data.results);
      return data.results;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Не удалось загрузить атрибуты товара.');
      return [];
    }
  }

  /**
   * Прикрепление атрибута к товару
   */
  async function createServiceAttribute(
    serviceId: string,
    payload: ServiceAttributeCreatePayload,
  ): Promise<ServiceAttribute | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    if (!serviceId || !payload.attribute_value) {
      console.warn('serviceId and payload.attribute_value are required');
      return null;
    }

    try {
      const { data } = await api.post<ServiceAttribute>(
        `/sites/${siteId.value}/services/${serviceId}/attributes/`,
        payload,
      );

      Notify.create({
        type: 'positive',
        message: 'Атрибут успешно прикреплен к товару.',
      });

      await fetchServiceAttributes(serviceId);
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при прикреплении атрибута к товару.');
      return null;
    }
  }

  /**
   * Удаление атрибута товара
   */
  async function deleteServiceAttribute(
    serviceId: string,
    serviceAttributeId: string,
  ): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    if (!serviceId || !serviceAttributeId) {
      console.warn('serviceId and serviceAttributeId are required');
      return false;
    }

    try {
      await api.delete(
        `/sites/${siteId.value}/services/${serviceId}/attributes/${serviceAttributeId}/`,
      );

      Notify.create({
        type: 'positive',
        message: 'Атрибут товара успешно удален.',
      });

      await fetchServiceAttributes(serviceId);
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при удалении атрибута товара.');
      return false;
    }
  }

  // Быстрое обновление статуса "показан в фильтрах" через PATCH
  async function patchAttributeTypeFilterStatus(
    attributeTypeId: string,
    show_in_filters: boolean,
  ): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    if (!attributeTypeId) {
      console.warn('attributeTypeId is required');
      return false;
    }

    try {
      // Обновляем локальный массив без полной перезагрузки
      const attributeTypeIndex = attributeTypes.value.findIndex(
        (type) => type.id === attributeTypeId,
      );

      if (attributeTypeIndex !== -1 && attributeTypes.value[attributeTypeIndex]) {
        const updatedTypes = [...attributeTypes.value];
        updatedTypes[attributeTypeIndex] = {
          ...updatedTypes[attributeTypeIndex],
          show_in_filters: show_in_filters,
        };
        attributeTypes.value = Object.freeze(updatedTypes);
      }

      return true;
    } catch (err) {
      console.error('Error in patchAttributeTypeFilterStatus:', err);
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при изменении статуса фильтра.');
      return false;
    }
  }

  // === SEARCH AND FILTERS ===

  /**
   * Поиск типов атрибутов
   */
  async function searchAttributeTypes(query: string): Promise<readonly AttributeType[]> {
    attributeTypesPagination.setSearch(query);
    return await attributeTypesPagination.fetchData();
  }

  /**
   * Фильтрация типов атрибутов
   */
  async function filterAttributeTypes(
    filters: Record<string, string | number | boolean>,
  ): Promise<readonly AttributeType[]> {
    Object.entries(filters).forEach(([key, value]) => {
      attributeTypesPagination.setFilter(key, value);
    });
    return await attributeTypesPagination.fetchData();
  }

  /**
   * Очистка фильтров типов атрибутов
   */
  async function clearAttributeTypesFilters(): Promise<readonly AttributeType[]> {
    attributeTypesPagination.clearFilters();
    return await attributeTypesPagination.fetchData();
  }

  /**
   * Массовое удаление типов атрибутов
   */
  async function bulkDeleteAttributeTypes(attributeTypeIds: readonly string[]): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    if (!attributeTypeIds.length) {
      console.warn('attributeTypeIds array is empty');
      return false;
    }

    try {
      await Promise.all(
        attributeTypeIds.map((id) => api.delete(`/sites/${siteId.value}/attribute-types/${id}/`)),
      );

      Notify.create({
        type: 'positive',
        message: `Успешно удалено ${attributeTypeIds.length} типов атрибутов.`,
      });

      await fetchAttributeTypes();
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при массовом удалении типов атрибутов.');
      return false;
    }
  }

  /**
   * Очистка выбранных элементов
   */
  function clearSelection(): void {
    selectedAttributeType.value = null;
    selectedAttributeValue.value = null;
  }

  return {
    // State
    attributeTypes,
    selectedAttributeType,
    attributeValues,
    selectedAttributeValue,
    serviceAttributes,
    loading: attributeTypesPagination.loading,

    // Pagination state for attribute types
    currentPage: computed(() => attributeTypesPagination.currentPage.value),
    pageSize: computed(() => attributeTypesPagination.pageSize.value),
    totalCount: computed(() => attributeTypesPagination.totalCount.value),
    totalPages: computed(() => attributeTypesPagination.totalPages.value),
    hasNext: computed(() => attributeTypesPagination.hasNext.value),
    hasPrevious: computed(() => attributeTypesPagination.hasPrevious.value),
    qTablePagination: attributeTypesPagination.qTablePagination,

    // Attribute Types Methods
    fetchAttributeTypes,
    fetchAttributeTypeById,
    createAttributeType,
    updateAttributeType,
    deleteAttributeType,
    searchAttributeTypes,
    filterAttributeTypes,
    clearAttributeTypesFilters,
    bulkDeleteAttributeTypes,
    patchAttributeTypeFilterStatus,

    // Attribute Values Methods
    fetchAttributeValues,
    fetchAttributeValueById,
    createAttributeValue,
    updateAttributeValue,
    deleteAttributeValue,

    // Service Attributes Methods
    fetchServiceAttributes,
    createServiceAttribute,
    deleteServiceAttribute,

    // Utility Methods
    clearSelection,

    // Pagination methods
    goToPage: attributeTypesPagination.goToPage,
    goToNextPage: attributeTypesPagination.goToNextPage,
    goToPreviousPage: attributeTypesPagination.goToPreviousPage,
    handleTableRequest: attributeTypesPagination.handleTableRequest,
  };
});
