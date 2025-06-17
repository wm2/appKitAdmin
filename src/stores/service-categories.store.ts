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

// ============================================================================
// ИНТЕРФЕЙСЫ ДЛЯ СТРОГОЙ ТИПИЗАЦИИ
// ============================================================================

/**
 * Интерфейс для элемента иерархии (legacy, для совместимости с tree API)
 */
export interface ServiceCategoryHierarchyItem {
  id: string;
  name: string;
  slug: string;
  brief: string;
  is_published: boolean;
  order: number;
  parent_id: string | null;
  level: number;
  has_children: boolean;
}

/**
 * Ответ от hierarchy API (legacy, может быть убран в будущем)
 */
export interface ServiceCategoryHierarchyResponse {
  categories: ServiceCategoryHierarchyItem[];
  meta: {
    total_count: number;
    max_level: number;
  };
}

/**
 * Интерфейс для родительской категории
 */
export interface ServiceCategoryParentRef {
  id: string;
  name: string;
  slug: string;
  is_published: boolean;
  order: number;
}

/**
 * Основная категория с полями иерархии из API
 */
export interface ServiceCategoryFile {
  id: string;
  name: string;
  slug: string;
  brief: string;
  is_published: boolean;
  site: string;
  parent: ServiceCategoryParentRef | null;
  order: number;
  file: string | null;
  blurhash: string | null;
  // 🎯 Поля для иерархии из основного API
  level: number;
  has_children: boolean;
  // НЕТ parent_id - используем parent?.id
}

/**
 * Детальная информация о категории
 */
export interface ServiceCategoryDetail extends ServiceCategoryFile {
  creator: {
    id: string;
    email: string;
    role: string;
  } | null;
  created: string; // ISO DateTime
  updated: string; // ISO DateTime
}

/**
 * Payload для создания категории
 */
export interface ServiceCategoryCreatePayload {
  name: string;
  brief?: string;
  is_published?: boolean;
  parent?: string | null; // ID родительской категории
  order?: number;
  file?: string | null;
}

/**
 * Payload для обновления категории
 */
export interface ServiceCategoryUpdatePayload {
  name?: string;
  brief?: string;
  is_published?: boolean;
  parent?: string | null; // ID родительской категории
  order?: number;
  file?: string | null;
}

/**
 * Опция для автокомплита
 */
export interface ServiceCategoryOption {
  id: string;
  name: string;
  slug: string;
  brief?: string;
  level: number;
  has_children: boolean;
  display_name: string;
  is_published: boolean;
}

/**
 * Узел дерева для компонента
 */
export interface ServiceCategoryTreeNode {
  id: string;
  label: string;
  children?: ServiceCategoryTreeNode[];
  category: ServiceCategoryFile;
  icon: string;
  iconColor: string;
  disabled: boolean;
}

/**
 * Интерфейс для ошибок от API
 */
interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

// ============================================================================
// STORE ОПРЕДЕЛЕНИЕ
// ============================================================================

export const useServiceCategoriesStore = defineStore('serviceCategories', () => {
  // === STATE ===
  const serviceCategories = ref<ServiceCategoryFile[]>([]);
  const selectedServiceCategory = ref<ServiceCategoryDetail | null>(null);

  // 🎯 НОВОЕ: Глобальный кеш всех категорий для корректной мета-информации
  const allCategoriesCache = ref<ServiceCategoryFile[]>([]);
  const isAllCategoriesCacheLoaded = ref(false);

  // Legacy поля для совместимости (могут быть убраны в будущем)
  const hierarchyData = ref<ServiceCategoryHierarchyItem[]>([]);
  const hierarchyMeta = ref<{ total_count: number; max_level: number }>({
    total_count: 0,
    max_level: 0,
  });
  const hierarchyLoading = ref(false);

  // === GETTERS ===
  const siteId = computed(() => VITE_SITE_ID);

  // === PAGINATION ===

  /**
   * Основная функция загрузки категорий
   */
  const fetchServiceCategoriesWithPagination = async (
    url?: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<ServiceCategoryFile>> => {
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
        requestUrl = `/sites/${siteId.value}/service-categories/`;
        // Фильтруем undefined значения
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

      const { data } = await api.get<PaginationResponse<ServiceCategoryFile>>(requestUrl, {
        params: url ? {} : requestParams,
      });

      // Сохраняем результаты как есть - сортировка будет применена в fetchServiceCategories
      serviceCategories.value = data.results;

      return data;
    } catch (error) {
      handleApiError(error as AxiosError<ApiError>, 'Не удалось загрузить список категорий услуг.');
      throw error;
    }
  };

  // Создаем экземпляр пагинации
  const pagination = usePagination<ServiceCategoryFile>(fetchServiceCategoriesWithPagination, {
    defaultPageSize: 10,
    defaultSortBy: 'order',
    defaultDescending: false,
  });

  // === HELPER FUNCTIONS ===

  /**
   * Обработка ошибок API
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

    // Обработка ошибок по конкретным полям
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
   * 🎯 Иерархическая сортировка - используем parent?.id
   */
  function sortByHierarchy(categories: ServiceCategoryFile[]): ServiceCategoryFile[] {
    if (categories.length === 0) {
      return categories;
    }

    // Создаем карту для быстрого поиска детей
    const childrenMap = new Map<string | null, ServiceCategoryFile[]>();

    // Группируем по parent?.id
    categories.forEach((category) => {
      const parentId = category.parent?.id || null;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(category);
    });

    // Рекурсивная функция для построения иерархического списка
    function buildHierarchicalList(parentId: string | null): ServiceCategoryFile[] {
      const children = childrenMap.get(parentId) || [];
      const result: ServiceCategoryFile[] = [];

      // Сортируем детей по order, затем по имени
      children.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name);
      });

      // Добавляем каждого ребенка и рекурсивно его детей
      children.forEach((child) => {
        result.push(child);
        result.push(...buildHierarchicalList(child.id));
      });

      return result;
    }

    // Начинаем с корневых элементов (parent = null)
    return buildHierarchicalList(null);
  }

  /**
   * 🎯 НОВОЕ: Загружает ВСЕ категории и обновляет глобальный кеш
   */
  async function loadAllCategoriesIntoCache(): Promise<ServiceCategoryFile[]> {
    if (isAllCategoriesCacheLoaded.value && allCategoriesCache.value.length > 0) {
      return allCategoriesCache.value;
    }

    console.log('🔄 Загружаем все категории в кеш...');

    const allCategories: ServiceCategoryFile[] = [];

    try {
      // Очищаем фильтры и сбрасываем пагинацию
      pagination.clearFilters();

      // Загружаем первую страницу
      let response = await fetchServiceCategoriesWithPagination();
      allCategories.push(...response.results);

      // Загружаем все остальные страницы
      while (response.next) {
        response = await fetchServiceCategoriesWithPagination(response.next);
        allCategories.push(...response.results);
      }

      // Удаляем дубликаты
      const uniqueCategories = Array.from(
        new Map(allCategories.map((cat) => [cat.id, cat])).values(),
      );

      // Обновляем кеш
      allCategoriesCache.value = uniqueCategories;
      isAllCategoriesCacheLoaded.value = true;

      // 🎯 ВАЖНО: Обновляем мета-информацию на основе ВСЕХ категорий
      updateHierarchyMetaFromAllCategories(uniqueCategories);

      console.log(`✅ Все категории загружены в кеш: ${uniqueCategories.length}`);
      return uniqueCategories;
    } catch (error) {
      console.error('Ошибка при загрузке всех категорий:', error);
      throw error;
    }
  }

  /**
   * 🎯 НОВОЕ: Правильно обновляет мета-информацию на основе ВСЕХ категорий
   */
  function updateHierarchyMetaFromAllCategories(allCategories: ServiceCategoryFile[]): void {
    if (!allCategories || allCategories.length === 0) {
      hierarchyMeta.value = {
        total_count: 0,
        max_level: 0,
      };
      return;
    }

    // Подсчитываем максимальный уровень среди ВСЕХ категорий
    const maxLevel = allCategories.reduce((max, cat) => Math.max(max, cat.level), 0);

    hierarchyMeta.value = {
      total_count: allCategories.length, // Общее количество ВСЕХ категорий
      max_level: maxLevel,
    };

    console.log(
      `📊 Обновлена мета-информация: всего=${allCategories.length}, макс_уровень=${maxLevel}`,
    );
  }

  /**
   * Получение опций для автокомплита из кешированных данных
   */
  function getServiceCategoryOptionsFromCache(searchQuery = ''): ServiceCategoryOption[] {
    const categories = isAllCategoriesCacheLoaded.value
      ? allCategoriesCache.value
      : serviceCategories.value;

    const filteredCategories = categories.filter((category) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        category.name.toLowerCase().includes(query) ||
        (category.brief && category.brief.toLowerCase().includes(query))
      );
    });

    return filteredCategories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      brief: category.brief,
      level: category.level,
      has_children: category.has_children,
      is_published: category.is_published,
      display_name:
        '—'.repeat(category.level) +
        ' ' +
        category.name +
        (category.has_children ? ' 📁' : '') +
        (!category.is_published ? ' (скрыто)' : ''),
    }));
  }

  /**
   * 🎯 НОВОЕ: Сбрасывает кеш после изменений данных
   */
  function invalidateCache(): void {
    console.log('🗑️ Сбрасываем кеш...');
    isAllCategoriesCacheLoaded.value = false;
    allCategoriesCache.value = [];
  }

  // === LEGACY HIERARCHY API (для совместимости) ===

  /**
   * Legacy метод для загрузки иерархии (может быть убран)
   */
  async function fetchServiceCategoriesHierarchy(): Promise<ServiceCategoryHierarchyItem[]> {
    if (!siteId.value) {
      throw new Error('VITE_SITE_ID не определен.');
    }

    hierarchyLoading.value = true;
    try {
      const { data } = await api.get<ServiceCategoryHierarchyResponse>(
        `/sites/${siteId.value}/service-categories/hierarchy/`,
      );

      hierarchyData.value = data.categories;
      hierarchyMeta.value = data.meta;

      return data.categories;
    } catch (error) {
      handleApiError(
        error as AxiosError<ApiError>,
        'Не удалось загрузить иерархию категорий услуг.',
      );
      throw error;
    } finally {
      hierarchyLoading.value = false;
    }
  }

  // === CRUD OPERATIONS ===

  /**
   * Получение категории по ID
   */
  async function fetchServiceCategoryById(
    categoryId: string,
  ): Promise<ServiceCategoryDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }
    try {
      const { data } = await api.get<ServiceCategoryDetail>(
        `/sites/${siteId.value}/service-categories/${categoryId}/`,
      );
      selectedServiceCategory.value = data;
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Не удалось загрузить данные категории услуг.');
      selectedServiceCategory.value = null;
      return null;
    }
  }

  /**
   * Создание новой категории
   */
  async function createServiceCategory(
    payload: ServiceCategoryCreatePayload,
  ): Promise<ServiceCategoryDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }
    try {
      const { data } = await api.post<ServiceCategoryDetail>(
        `/sites/${siteId.value}/service-categories/`,
        payload,
      );
      Notify.create({
        type: 'positive',
        message: `Категория услуг "${data.name}" успешно создана.`,
      });

      // 🎯 ВАЖНО: Сбрасываем кеш после создания
      invalidateCache();

      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при создании категории услуг.');
      return null;
    }
  }

  /**
   * Обновление категории
   */
  async function updateServiceCategory(
    categoryId: string,
    payload: ServiceCategoryUpdatePayload,
  ): Promise<ServiceCategoryDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }
    try {
      const { data } = await api.put<ServiceCategoryDetail>(
        `/sites/${siteId.value}/service-categories/${categoryId}/`,
        payload,
      );
      Notify.create({
        type: 'positive',
        message: `Категория услуг "${data.name}" успешно обновлена.`,
      });

      // 🎯 ВАЖНО: Сбрасываем кеш после обновления
      invalidateCache();

      if (selectedServiceCategory.value?.id === categoryId) {
        await fetchServiceCategoryById(categoryId);
      }
      return data;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при обновлении категории услуг.');
      return null;
    }
  }

  /**
   * Удаление категории
   */
  async function deleteServiceCategory(categoryId: string): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }
    try {
      await api.delete(`/sites/${siteId.value}/service-categories/${categoryId}/`);
      Notify.create({
        type: 'positive',
        message: 'Категория услуг успешно удалена.',
      });

      // 🎯 ВАЖНО: Сбрасываем кеш после удаления
      invalidateCache();

      if (selectedServiceCategory.value?.id === categoryId) {
        selectedServiceCategory.value = null;
      }
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при удалении категории услуг.');
      return false;
    }
  }

  /**
   * Массовое удаление категорий
   */
  async function bulkDeleteServiceCategories(categoryIds: string[]): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    try {
      // Выполняем все DELETE запросы параллельно
      await Promise.all(
        categoryIds.map((id) => api.delete(`/sites/${siteId.value}/service-categories/${id}/`)),
      );

      Notify.create({
        type: 'positive',
        message: `Успешно удалено ${categoryIds.length} категорий услуг.`,
      });

      // 🎯 ВАЖНО: Сбрасываем кеш после массового удаления
      invalidateCache();

      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiError>, 'Ошибка при массовом удалении категорий услуг.');
      return false;
    }
  }

  // === SEARCH AND FILTER OPERATIONS ===

  /**
   * Поиск категорий с использованием tree API (legacy)
   */
  async function searchServiceCategoriesTree(query: string): Promise<ServiceCategoryFile[]> {
    if (!siteId.value) {
      throw new Error('VITE_SITE_ID не определен.');
    }

    try {
      const { data } = await api.get<PaginationResponse<ServiceCategoryFile>>(
        `/sites/${siteId.value}/service-categories/tree/`,
        {
          params: { search: query },
        },
      );

      return data.results;
    } catch (error) {
      handleApiError(error as AxiosError<ApiError>, 'Не удалось выполнить поиск категорий услуг.');
      throw error;
    }
  }

  /**
   * Поиск категорий
   */
  async function searchServiceCategories(query: string): Promise<ServiceCategoryFile[]> {
    pagination.setSearch(query);
    return await pagination.fetchData();
  }

  /**
   * Применение фильтров
   */
  async function filterServiceCategories(
    filters: Record<string, string | number | boolean>,
  ): Promise<ServiceCategoryFile[]> {
    Object.entries(filters).forEach(([key, value]) => {
      pagination.setFilter(key, value);
    });
    return await pagination.fetchData();
  }

  /**
   * Очистка фильтров
   */
  async function clearFilters(): Promise<ServiceCategoryFile[]> {
    pagination.clearFilters();
    return await pagination.fetchData();
  }

  /**
   * Основная функция загрузки категорий с иерархической сортировкой
   */
  async function fetchServiceCategories(url?: string): Promise<ServiceCategoryFile[]> {
    const data = await pagination.fetchData(url);
    // 🎯 Применяем иерархическую сортировку после загрузки
    const sortedData = sortByHierarchy(data);
    serviceCategories.value = sortedData;
    return sortedData;
  }

  /**
   * 🎯 ОПТИМИЗИРОВАННАЯ ФУНКЦИЯ: Поиск категорий для автокомплита с кешированием
   */
  async function searchCategoriesForAutocomplete(query: string): Promise<ServiceCategoryOption[]> {
    // Сначала загружаем все данные в кеш (если еще не загружены)
    await loadAllCategoriesIntoCache();

    // Используем кешированные данные для автокомплита
    return getServiceCategoryOptionsFromCache(query);
  }

  /**
   * Очистка выбранной категории
   */
  function clearSelectedServiceCategory(): void {
    selectedServiceCategory.value = null;
  }

  // === RETURN STORE INTERFACE ===
  return {
    // State
    serviceCategories,
    selectedServiceCategory,
    hierarchyData, // Legacy
    hierarchyMeta,
    hierarchyLoading, // Legacy
    loading: pagination.loading,
    allCategoriesCache: computed(() => allCategoriesCache.value), // 🎯 НОВОЕ: для доступа к кешу

    // Pagination state
    currentPage: computed(() => pagination.currentPage.value),
    pageSize: computed(() => pagination.pageSize.value),
    totalCount: computed(() => pagination.totalCount.value),
    totalPages: computed(() => pagination.totalPages.value),
    hasNext: computed(() => pagination.hasNext.value),
    hasPrevious: computed(() => pagination.hasPrevious.value),
    qTablePagination: pagination.qTablePagination,

    // Computed
    serviceCategoryOptions: computed(() => getServiceCategoryOptionsFromCache()),

    // Methods
    fetchServiceCategories,
    fetchServiceCategoriesHierarchy, // Legacy - может быть убран
    searchServiceCategoriesTree, // Legacy - может быть убран
    fetchServiceCategoryById,
    createServiceCategory,
    updateServiceCategory,
    deleteServiceCategory,
    clearSelectedServiceCategory,
    searchServiceCategories,
    filterServiceCategories,
    clearFilters,
    bulkDeleteServiceCategories,
    searchCategoriesForAutocomplete,
    loadAllCategoriesIntoCache, // 🎯 НОВОЕ: для принудительной загрузки кеша
    invalidateCache, // 🎯 НОВОЕ: для сброса кеша

    // Pagination methods
    goToPage: pagination.goToPage,
    goToNextPage: pagination.goToNextPage,
    goToPreviousPage: pagination.goToPreviousPage,
    handleTableRequest: pagination.handleTableRequest,
  };
});
