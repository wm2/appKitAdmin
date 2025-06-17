// composables/usePagination.ts
import { ref, computed, reactive } from 'vue';
import type { QTableProps } from 'quasar';

export interface PaginationResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  ordering?: string;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface UsePaginationOptions {
  defaultPageSize?: number;
  defaultSortBy?: string;
  defaultDescending?: boolean;
}

export function usePagination<T>(
  fetchFunction: (url?: string, params?: PaginationParams) => Promise<PaginationResponse<T>>,
  options: UsePaginationOptions = {},
) {
  const { defaultPageSize = 10, defaultSortBy = 'id', defaultDescending = false } = options;

  // Состояние пагинации
  const currentPage = ref(1);
  const pageSize = ref(defaultPageSize);
  const totalCount = ref(0);
  const sortBy = ref(defaultSortBy);
  const descending = ref(defaultDescending);
  const searchQuery = ref('');
  const loading = ref(false);

  // Ссылки на следующую и предыдущую страницы от API
  const nextPageUrl = ref<string | null>(null);
  const prevPageUrl = ref<string | null>(null);

  // Дополнительные параметры фильтрации
  const filters = reactive<Record<string, string | number | boolean | undefined>>({});

  // Computed для Quasar Table pagination
  const qTablePagination = computed<QTableProps['pagination']>({
    get: () => ({
      sortBy: sortBy.value,
      descending: descending.value,
      page: currentPage.value,
      rowsPerPage: pageSize.value,
      rowsNumber: totalCount.value,
    }),
    set: (val) => {
      if (val) {
        sortBy.value = val.sortBy || defaultSortBy;
        descending.value = val.descending || false;
        currentPage.value = val.page || 1;
        pageSize.value = val.rowsPerPage || defaultPageSize;
      }
    },
  });

  // Computed для общего количества страниц
  const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value));

  // Computed для проверки наличия следующей/предыдущей страницы
  const hasNext = computed(() => Boolean(nextPageUrl.value));
  const hasPrevious = computed(() => Boolean(prevPageUrl.value));

  // Функция для построения параметров запроса
  const buildParams = (): PaginationParams => {
    const params: PaginationParams = {
      page: currentPage.value,
      page_size: pageSize.value,
    };

    // Добавляем сортировку
    if (sortBy.value) {
      const orderingField = descending.value ? `-${sortBy.value}` : sortBy.value;
      params.ordering = orderingField;
    }

    // Добавляем поиск
    if (searchQuery.value) {
      params.search = searchQuery.value;
    }

    // Добавляем дополнительные фильтры
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params[key] = filters[key];
      }
    });

    return params;
  };

  // Основная функция для загрузки данных
  const fetchData = async (url?: string): Promise<T[]> => {
    loading.value = true;
    try {
      let response: PaginationResponse<T>;

      if (url) {
        // Используем прямую ссылку (для next/previous)
        response = await fetchFunction(url);
      } else {
        // Используем параметры для построения запроса
        response = await fetchFunction(undefined, buildParams());
      }

      // Обновляем состояние
      totalCount.value = response.count;
      nextPageUrl.value = response.next;
      prevPageUrl.value = response.previous;

      return response.results;
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // Функция для обработки запросов от QTable
  const handleTableRequest = async (props: {
    pagination: QTableProps['pagination'];
  }): Promise<T[]> => {
    if (props.pagination) {
      // Обновляем параметры пагинации из QTable
      qTablePagination.value = props.pagination;
    }
    return await fetchData();
  };

  // Функции навигации
  const goToNextPage = async (): Promise<T[]> => {
    if (hasNext.value && nextPageUrl.value) {
      currentPage.value++;
      return await fetchData(nextPageUrl.value);
    }
    return [];
  };

  const goToPreviousPage = async (): Promise<T[]> => {
    if (hasPrevious.value && prevPageUrl.value) {
      currentPage.value--;
      return await fetchData(prevPageUrl.value);
    }
    return [];
  };

  const goToFirstPage = async (): Promise<T[]> => {
    currentPage.value = 1;
    return await fetchData();
  };

  const goToLastPage = async (): Promise<T[]> => {
    currentPage.value = totalPages.value;
    return await fetchData();
  };

  const goToPage = async (page: number): Promise<T[]> => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
      return await fetchData();
    }
    return [];
  };

  // Функции для работы с поиском и фильтрами
  const setSearch = (query: string) => {
    searchQuery.value = query;
    currentPage.value = 1; // Сбрасываем на первую страницу при поиске
  };

  const setFilter = (key: string, value: string | number | boolean | undefined) => {
    filters[key] = value;
    currentPage.value = 1; // Сбрасываем на первую страницу при фильтрации
  };

  const clearFilters = () => {
    Object.keys(filters).forEach((key) => {
      delete filters[key];
    });
    searchQuery.value = '';
    currentPage.value = 1;
  };

  // Функция для сброса пагинации
  const reset = () => {
    currentPage.value = 1;
    pageSize.value = defaultPageSize;
    sortBy.value = defaultSortBy;
    descending.value = defaultDescending;
    searchQuery.value = '';
    totalCount.value = 0;
    nextPageUrl.value = null;
    prevPageUrl.value = null;
    clearFilters();
  };

  return {
    // Состояние
    currentPage,
    pageSize,
    totalCount,
    sortBy,
    descending,
    searchQuery,
    loading,
    nextPageUrl,
    prevPageUrl,
    filters,

    // Computed
    qTablePagination,
    totalPages,
    hasNext,
    hasPrevious,

    // Методы
    fetchData,
    handleTableRequest,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    goToPage,
    setSearch,
    setFilter,
    clearFilters,
    reset,
  };
}
