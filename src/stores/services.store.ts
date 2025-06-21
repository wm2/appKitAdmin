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
 * Интерфейс для значения атрибута в service_attributes
 */
export interface ServiceAttributeValue {
  readonly id: string;
  readonly value: string;
  readonly slug: string;
  readonly color_code?: string;
  readonly order: number;
}

/**
 * Интерфейс для service_attribute
 */
export interface ServiceAttribute {
  readonly id: string;
  readonly attribute_value: ServiceAttributeValue;
  readonly attribute_type_name: string;
}

/**
 * Интерфейс для категории сервиса
 */
export interface ServiceFileCategory {
  readonly id: string;
  readonly name: string;
}

/**
 * Интерфейс для бренда сервиса
 */
export interface ServiceFileBrand {
  readonly id: string;
  readonly name: string;
}

/**
 * Интерфейс для вложения сервиса
 */
export interface ServiceFileAttachment {
  readonly id: string;
  readonly file: string;
  readonly is_primary: boolean;
}

/**
 * Интерфейс для данных сервиса (краткий для списков)
 */
export interface ServiceFile {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly is_published: boolean;
  readonly price?: string;
  readonly old_price?: string;
  readonly has_discount: boolean;
  readonly categories: ServiceFileCategory[];
  readonly brand?: ServiceFileBrand;
  readonly attachments: ServiceFileAttachment[];
}

/**
 * Интерфейс для детального сервиса
 */
export interface ServiceDetail extends ServiceFile {
  readonly title?: string;
  readonly description?: string;
  readonly keywords?: string;
  readonly content: string;
  readonly sku?: string;
  readonly video_url?: string;
  readonly discount_percentage?: number;
  readonly order: number;
  readonly attributes: Record<string, string | number | boolean>; // JSON поле
  readonly site: string;
  readonly creator: Creator;
  readonly product_type?: {
    readonly id: string;
    readonly name: string;
    readonly description: string;
  };
  readonly parent?: ServiceFile;
  readonly executor?: Creator;
  readonly manager?: Creator;
  readonly service_attributes?: ServiceAttribute[];
  readonly created: string;
  readonly updated: string;
}

/**
 * Payload для создания сервиса
 */
export interface ServiceCreatePayload {
  name: string;
  content: string;
  title?: string;
  description?: string;
  keywords?: string;
  is_published?: boolean;
  price?: string;
  old_price?: string;
  sku?: string;
  video_url?: string;
  attributes?: Record<string, string | number | boolean>;
  category_ids?: string[];
  brand_id?: string;
  product_type_id?: string;
  parent_id?: string;
  executor_id?: string;
  manager_id?: string;
  attachments?: File[];
  service_attribute_values?: string[]; // Массив ID значений атрибутов
}

/**
 * Payload для обновления сервиса
 */
export interface ServiceUpdatePayload {
  name?: string;
  content?: string;
  title?: string;
  description?: string;
  keywords?: string;
  is_published?: boolean;
  price?: string;
  old_price?: string;
  sku?: string;
  video_url?: string;
  attributes?: Record<string, string | number | boolean>;
  category_ids?: string[];
  brand_id?: string;
  product_type_id?: string;
  parent_id?: string;
  executor_id?: string;
  manager_id?: string;
  attachments?: File[];
  service_attribute_values?: string[]; // Массив ID значений атрибутов
}

// === СПРАВОЧНИКИ ===
export interface ServiceCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly is_published: boolean;
  readonly order: number;
}

export interface ServiceBrand {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly is_published: boolean;
  readonly file?: string;
}

export interface ServiceProductType {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

/**
 * Интерфейс для ошибок от API
 */
interface ApiError {
  readonly detail?: string;
  readonly message?: string;
  readonly [key: string]: unknown;
}

export const useServicesStore = defineStore('services', () => {
  // === STATE ===
  const services = ref<readonly ServiceFile[]>([]);
  const selectedService = ref<ServiceDetail | null>(null);
  const categories = ref<readonly ServiceCategory[]>([]);
  const brands = ref<readonly ServiceBrand[]>([]);
  const productTypes = ref<readonly ServiceProductType[]>([]);

  // === GETTERS ===
  const siteId = computed(() => VITE_SITE_ID);

  // === PAGINATION ===
  const fetchServicesWithPagination = async (
    url?: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<ServiceFile>> => {
    if (!siteId.value) {
      throw new Error('VITE_SITE_ID не определен.');
    }

    try {
      let requestUrl: string;
      let requestParams: Record<string, string | number | boolean> = {};

      if (url) {
        requestUrl = url;
      } else {
        requestUrl = `/sites/${siteId.value}/services/`;
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

      const { data } = await api.get<PaginationResponse<ServiceFile>>(requestUrl, {
        params: url ? {} : requestParams,
      });

      services.value = data.results;
      return data;
    } catch (error) {
      handleApiError(error as AxiosError<ApiError>, 'Не удалось загрузить список сервисов.');
      throw error;
    }
  };

  // Создаем экземпляр пагинации
  const pagination = usePagination<ServiceFile>(fetchServicesWithPagination, {
    defaultPageSize: 10,
    defaultSortBy: 'name',
    defaultDescending: false,
  });

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

  // === СПРАВОЧНИКИ ===

  /**
   * Загрузка категорий
   */
  async function fetchCategories(): Promise<readonly ServiceCategory[]> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return [];
    }
    try {
      const { data } = await api.get<PaginationResponse<ServiceCategory>>(
        `/sites/${siteId.value}/service-categories/`,
      );
      categories.value = data.results;
      return data.results;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Не удалось загрузить категории.');
      return [];
    }
  }

  /**
   * Загрузка брендов
   */
  async function fetchBrands(): Promise<readonly ServiceBrand[]> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return [];
    }
    try {
      const { data } = await api.get<PaginationResponse<ServiceBrand>>(
        `/sites/${siteId.value}/brands/`,
      );
      brands.value = data.results;
      return data.results;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Не удалось загрузить бренды.');
      return [];
    }
  }

  /**
   * Загрузка типов товаров
   */
  async function fetchProductTypes(): Promise<readonly ServiceProductType[]> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return [];
    }
    try {
      const { data } = await api.get<PaginationResponse<ServiceProductType>>(
        `/sites/${siteId.value}/product-types/`,
      );
      productTypes.value = data.results;
      return data.results;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Не удалось загрузить типы товаров.');
      return [];
    }
  }

  // === ОСНОВНЫЕ ОПЕРАЦИИ ===

  /**
   * Загрузка сервисов
   */
  async function fetchServices(url?: string): Promise<readonly ServiceFile[]> {
    return pagination.fetchData(url);
  }

  /**
   * Получение конкретного сервиса по ID
   */
  async function fetchServiceById(serviceId: string): Promise<ServiceDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    if (!serviceId) {
      console.warn('serviceId is required');
      return null;
    }

    try {
      const { data } = await api.get<ServiceDetail>(
        `/sites/${siteId.value}/services/${serviceId}/`,
      );
      selectedService.value = data;
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Не удалось загрузить данные сервиса.');
      selectedService.value = null;
      return null;
    }
  }

  /**
   * Создание нового сервиса
   */
  async function createService(payload: ServiceCreatePayload): Promise<ServiceDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    if (!payload.name || !payload.content) {
      console.warn('payload.name and payload.content are required');
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('name', payload.name);
      formData.append('content', payload.content);
      if (payload.title) formData.append('title', payload.title);
      if (payload.description) formData.append('description', payload.description);
      if (payload.keywords) formData.append('keywords', payload.keywords);
      if (payload.is_published !== undefined) {
        formData.append('is_published', String(payload.is_published));
      }
      if (payload.price) formData.append('price', payload.price);
      if (payload.old_price) formData.append('old_price', payload.old_price);
      if (payload.sku) formData.append('sku', payload.sku);
      if (payload.video_url) formData.append('video_url', payload.video_url);
      if (payload.brand_id) formData.append('brand_id', payload.brand_id);
      if (payload.product_type_id) formData.append('product_type_id', payload.product_type_id);
      if (payload.parent_id) formData.append('parent_id', payload.parent_id);
      if (payload.executor_id) formData.append('executor_id', payload.executor_id);
      if (payload.manager_id) formData.append('manager_id', payload.manager_id);

      // JSON поле атрибутов
      if (payload.attributes) {
        formData.append('attributes', JSON.stringify(payload.attributes));
      }

      // Категории (множественный выбор)
      if (payload.category_ids && payload.category_ids.length > 0) {
        payload.category_ids.forEach((id) => formData.append('category_ids', id));
      }

      // Service attribute values
      if (payload.service_attribute_values && payload.service_attribute_values.length > 0) {
        payload.service_attribute_values.forEach((id) =>
          formData.append('service_attribute_values', id),
        );
      }

      // Файлы
      if (payload.attachments && payload.attachments.length > 0) {
        payload.attachments.forEach((file, index) => {
          formData.append(`attachments[${index}]`, file);
        });
      }

      const { data } = await api.post<ServiceDetail>(`/sites/${siteId.value}/services/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Notify.create({
        type: 'positive',
        message: `Сервис "${data.name}" успешно создан.`,
      });

      await fetchServices();
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при создании сервиса.');
      return null;
    }
  }

  /**
   * Обновление сервиса
   */
  async function updateService(
    serviceId: string,
    payload: ServiceUpdatePayload,
  ): Promise<ServiceDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    if (!serviceId) {
      console.warn('serviceId is required');
      return null;
    }

    try {
      const formData = new FormData();
      if (payload.name) formData.append('name', payload.name);
      if (payload.content) formData.append('content', payload.content);
      if (payload.title) formData.append('title', payload.title);
      if (payload.description) formData.append('description', payload.description);
      if (payload.keywords) formData.append('keywords', payload.keywords);
      if (payload.is_published !== undefined) {
        formData.append('is_published', String(payload.is_published));
      }
      if (payload.price) formData.append('price', payload.price);
      if (payload.old_price) formData.append('old_price', payload.old_price);
      if (payload.sku) formData.append('sku', payload.sku);
      if (payload.video_url) formData.append('video_url', payload.video_url);
      if (payload.brand_id) formData.append('brand_id', payload.brand_id);
      if (payload.product_type_id) formData.append('product_type_id', payload.product_type_id);
      if (payload.parent_id) formData.append('parent_id', payload.parent_id);
      if (payload.executor_id) formData.append('executor_id', payload.executor_id);
      if (payload.manager_id) formData.append('manager_id', payload.manager_id);

      if (payload.attributes) {
        formData.append('attributes', JSON.stringify(payload.attributes));
      }

      if (payload.category_ids && payload.category_ids.length > 0) {
        payload.category_ids.forEach((id) => formData.append('category_ids', id));
      }

      if (payload.service_attribute_values && payload.service_attribute_values.length > 0) {
        payload.service_attribute_values.forEach((id) =>
          formData.append('service_attribute_values', id),
        );
      }

      if (payload.attachments && payload.attachments.length > 0) {
        payload.attachments.forEach((file, index) => {
          formData.append(`attachments[${index}]`, file);
        });
      }

      const { data } = await api.put<ServiceDetail>(
        `/sites/${siteId.value}/services/${serviceId}/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      Notify.create({
        type: 'positive',
        message: `Сервис "${data.name}" успешно обновлен.`,
      });

      await fetchServices();
      if (selectedService.value?.id === serviceId) {
        await fetchServiceById(serviceId);
      }
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при обновлении сервиса.');
      return null;
    }
  }

  /**
   * Удаление сервиса
   */
  async function deleteService(serviceId: string): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    if (!serviceId) {
      console.warn('serviceId is required');
      return false;
    }

    try {
      await api.delete(`/sites/${siteId.value}/services/${serviceId}/`);

      Notify.create({
        type: 'positive',
        message: 'Сервис успешно удален.',
      });

      await fetchServices();
      if (selectedService.value?.id === serviceId) {
        selectedService.value = null;
      }
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при удалении сервиса.');
      return false;
    }
  }

  /**
   * Очистка выбранного сервиса
   */
  function clearSelectedService(): void {
    selectedService.value = null;
  }

  // === БЫСТРЫЕ ОПЕРАЦИИ ===

  /**
   * Быстрое обновление статуса публикации через PATCH
   */
  async function patchServiceStatus(serviceId: string, is_published: boolean): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    if (!serviceId) {
      console.warn('serviceId is required');
      return false;
    }

    try {
      await api.patch(`/sites/${siteId.value}/services/${serviceId}/`, {
        is_published: is_published,
      });

      // Обновляем локальный массив без полной перезагрузки
      const serviceIndex = services.value.findIndex((service) => service.id === serviceId);
      if (serviceIndex !== -1 && services.value[serviceIndex]) {
        const updatedServices = [...services.value];
        const currentService = updatedServices[serviceIndex];
        if (currentService) {
          updatedServices[serviceIndex] = {
            ...currentService,
            is_published: is_published,
          };
          services.value = updatedServices;
        }
      }

      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при изменении статуса публикации.');
      return false;
    }
  }

  // === МАССОВЫЕ ОПЕРАЦИИ ===

  /**
   * Массовое удаление сервисов
   */
  async function bulkDeleteServices(serviceIds: readonly string[]): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    if (!serviceIds.length) {
      console.warn('serviceIds array is empty');
      return false;
    }

    try {
      await Promise.all(
        serviceIds.map((id) => api.delete(`/sites/${siteId.value}/services/${id}/`)),
      );

      Notify.create({
        type: 'positive',
        message: `Успешно удалено ${serviceIds.length} сервисов.`,
      });

      await fetchServices();
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при массовом удалении сервисов.');
      return false;
    }
  }

  /**
   * Массовое обновление статуса публикации
   */
  async function bulkUpdateServiceStatus(
    serviceIds: readonly string[],
    is_published: boolean,
  ): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    if (!serviceIds.length) {
      console.warn('serviceIds array is empty');
      return false;
    }

    try {
      await Promise.all(
        serviceIds.map((id) =>
          api.patch(`/sites/${siteId.value}/services/${id}/`, { is_published }),
        ),
      );

      // Обновляем локальный массив
      const updatedServices = [...services.value];
      serviceIds.forEach((id) => {
        const serviceIndex = updatedServices.findIndex((service) => service.id === id);
        if (serviceIndex !== -1 && updatedServices[serviceIndex]) {
          const currentService = updatedServices[serviceIndex];
          if (currentService) {
            updatedServices[serviceIndex] = {
              ...currentService,
              is_published: is_published,
            };
          }
        }
      });
      services.value = updatedServices;

      Notify.create({
        type: 'positive',
        message: `Успешно обновлено ${serviceIds.length} сервисов.`,
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

  // === ПОИСК И ФИЛЬТРАЦИЯ ===

  /**
   * Поиск сервисов
   */
  async function searchServices(query: string): Promise<readonly ServiceFile[]> {
    pagination.setSearch(query);
    return await pagination.fetchData();
  }

  /**
   * Фильтрация сервисов
   */
  async function filterServices(
    filters: Record<string, string | number | boolean>,
  ): Promise<readonly ServiceFile[]> {
    Object.entries(filters).forEach(([key, value]) => {
      pagination.setFilter(key, value);
    });
    return await pagination.fetchData();
  }

  /**
   * Очистка фильтров
   */
  async function clearFilters(): Promise<readonly ServiceFile[]> {
    pagination.clearFilters();
    return await pagination.fetchData();
  }

  return {
    // State
    services,
    selectedService,
    categories,
    brands,
    productTypes,
    loading: pagination.loading,

    // Pagination state
    currentPage: computed(() => pagination.currentPage.value),
    pageSize: computed(() => pagination.pageSize.value),
    totalCount: computed(() => pagination.totalCount.value),
    totalPages: computed(() => pagination.totalPages.value),
    hasNext: computed(() => pagination.hasNext.value),
    hasPrevious: computed(() => pagination.hasPrevious.value),
    qTablePagination: pagination.qTablePagination,

    // Справочники
    fetchCategories,
    fetchBrands,
    fetchProductTypes,

    // Основные методы
    fetchServices,
    fetchServiceById,
    createService,
    updateService,
    deleteService,
    clearSelectedService,

    // Поиск и фильтрация
    searchServices,
    filterServices,
    clearFilters,

    // Быстрые операции
    patchServiceStatus,

    // Массовые операции
    bulkDeleteServices,
    bulkUpdateServiceStatus,

    // Pagination methods
    goToPage: pagination.goToPage,
    goToNextPage: pagination.goToNextPage,
    goToPreviousPage: pagination.goToPreviousPage,
    handleTableRequest: pagination.handleTableRequest,
  };
});
