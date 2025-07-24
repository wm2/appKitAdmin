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
 * Интерфейс для создателя/автора
 */
export interface Creator {
  readonly id: string;
  readonly email: string;
  readonly role: string;
}

/**
 * Интерфейс для мета-тега страницы
 */
export interface PageMetaTag {
  readonly id: string;
  readonly name: string;
  readonly content: string;
}

/**
 * Тип страницы (enum)
 */
export type PageType = 'page' | 'promo';

/**
 * Интерфейс для данных страницы (краткий для списков)
 */
export interface PageFile {
  readonly id: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly keywords: string | null;
  readonly slug: string;
  readonly name: string;
  readonly content: string;
  readonly is_published: boolean;
  readonly page_type: PageType;
  readonly page_type_display: string;
  readonly meta_tags: readonly PageMetaTag[];
  readonly created: string; // ISO DateTime
  readonly updated: string; // ISO DateTime
  readonly file: string | null; // URL файла (может быть null)
  readonly file_name: string | null;
  readonly file_type: string | null;
  readonly blurhash: string | null;
}

/**
 * Интерфейс для детальной информации о странице
 */
export interface PageDetail extends PageFile {
  readonly creator?: Creator | null;
  readonly site?: string | null;
}

/**
 * Payload для создания страницы
 */
export interface PageCreatePayload {
  name: string; // обязательное
  content: string; // обязательное
  title?: string | undefined; // необязательное
  description?: string | undefined; // необязательное
  keywords?: string | undefined; // необязательное
  slug?: string | undefined; // автогенерируется если не указать
  is_published?: boolean | undefined;
  page_type?: PageType | undefined;
  file?: File | undefined; // 🆕 Поддержка загрузки файла
}

/**
 * Payload для обновления страницы
 */
export interface PageUpdatePayload {
  name?: string | undefined;
  content?: string | undefined;
  title?: string | undefined;
  description?: string | undefined;
  keywords?: string | undefined;
  slug?: string | undefined;
  is_published?: boolean | undefined;
  page_type?: PageType | undefined;
  file?: File | undefined; // 🆕 Поддержка загрузки файла
}

/**
 * 🆕 Интерфейс для формы страницы (более гибкий для UI)
 */
export interface PageFormData {
  id?: string | undefined;
  name: string;
  content: string;
  title: string;
  description: string;
  keywords: string;
  slug: string;
  is_published: boolean;
  page_type: PageType;
  file: File | null | undefined;
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
 * Интерфейс для объекта, который может содержать response (для type guard)
 */
interface ErrorWithResponse {
  response?: {
    status?: number;
    data?: ApiError;
  };
}

/**
 * Тип для объекта с неизвестными свойствами (для type guards)
 */
type UnknownObject = Record<string, unknown>;

// ============================================================================
// UTILITY ФУНКЦИИ ДЛЯ РАБОТЫ С READONLY ИНТЕРФЕЙСАМИ
// ============================================================================

/**
 * Безопасное создание PageDetail из PageFile
 * Решает проблему со spread оператором для readonly интерфейсов
 * При exactOptionalPropertyTypes: true не указываем опциональные свойства явно
 */
function createPageDetailFromPageFile(pageFile: PageFile): PageDetail {
  return {
    id: pageFile.id,
    title: pageFile.title,
    description: pageFile.description,
    keywords: pageFile.keywords,
    slug: pageFile.slug,
    name: pageFile.name,
    content: pageFile.content,
    is_published: pageFile.is_published,
    page_type: pageFile.page_type,
    page_type_display: pageFile.page_type_display,
    meta_tags: pageFile.meta_tags,
    created: pageFile.created,
    updated: pageFile.updated,
    file: pageFile.file,
    file_name: pageFile.file_name,
    file_type: pageFile.file_type,
    blurhash: pageFile.blurhash,
    // Не указываем creator и site, так как они опциональные
    // При exactOptionalPropertyTypes: true это правильный подход
  };
}

/**
 * Создание PageDetail с явными значениями для creator и site
 * Используется когда нужно явно указать null для этих полей
 */
function createPageDetailWithDefaults(
  pageFile: PageFile,
  creator: Creator | null = null,
  site: string | null = null,
): PageDetail {
  return {
    id: pageFile.id,
    title: pageFile.title,
    description: pageFile.description,
    keywords: pageFile.keywords,
    slug: pageFile.slug,
    name: pageFile.name,
    content: pageFile.content,
    is_published: pageFile.is_published,
    page_type: pageFile.page_type,
    page_type_display: pageFile.page_type_display,
    meta_tags: pageFile.meta_tags,
    created: pageFile.created,
    updated: pageFile.updated,
    file: pageFile.file,
    file_name: pageFile.file_name,
    file_type: pageFile.file_type,
    blurhash: pageFile.blurhash,
    creator,
    site,
  };
}

// ============================================================================
// TYPE GUARDS ДЛЯ БЕЗОПАСНОЙ ТИПИЗАЦИИ
// ============================================================================

/**
 * Type guard для проверки, что значение является объектом
 */
function isValidObject(item: unknown): item is UnknownObject {
  return typeof item === 'object' && item !== null && !Array.isArray(item);
}

/**
 * Type guard для проверки валидности PageFile
 */
export function isValidPageFile(item: unknown): item is PageFile {
  if (!isValidObject(item)) {
    console.warn('❌ isValidPageFile: не объект или null', item);
    return false;
  }

  // Проверяем обязательные поля
  const requiredFields = [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'content', type: 'string' },
    { name: 'slug', type: 'string' },
    { name: 'is_published', type: 'boolean' },
    { name: 'page_type', type: 'string' },
    { name: 'created', type: 'string' },
    { name: 'updated', type: 'string' },
    { name: 'page_type_display', type: 'string' },
  ];

  for (const field of requiredFields) {
    if (typeof item[field.name] !== field.type) {
      console.warn(
        `❌ isValidPageFile: поле ${field.name} должно быть ${field.type}, получено:`,
        typeof item[field.name],
        item[field.name],
      );
      return false;
    }
  }

  // Проверяем опциональные поля (могут быть null, undefined или string)
  const optionalStringFields = [
    'title',
    'description',
    'keywords',
    'file',
    'file_name',
    'file_type',
    'blurhash',
  ];

  for (const field of optionalStringFields) {
    const value = item[field];
    if (value !== null && value !== undefined && typeof value !== 'string') {
      console.warn(
        `❌ isValidPageFile: опциональное поле ${field} должно быть string, null или undefined, получено:`,
        typeof value,
        value,
      );
      return false;
    }
  }

  // Проверяем meta_tags (должен быть массивом)
  if (!Array.isArray(item.meta_tags)) {
    console.warn(
      '❌ isValidPageFile: meta_tags должен быть массивом, получено:',
      typeof item.meta_tags,
      item.meta_tags,
    );
    return false;
  }

  console.log('✅ isValidPageFile: данные валидны');
  return true;
}

/**
 * Type guard для проверки валидности PageDetail
 */
export function isValidPageDetail(item: unknown): item is PageDetail {
  // Сначала проверяем, что это валидный PageFile
  if (!isValidPageFile(item)) {
    console.warn('❌ isValidPageDetail: не прошел проверку isValidPageFile', item);
    return false;
  }

  if (!isValidObject(item)) {
    return false;
  }

  // Проверяем опциональные поля для PageDetail
  // creator может быть undefined, null или объектом с нужными полями
  if (item.creator !== undefined && item.creator !== null) {
    if (!isValidObject(item.creator)) {
      console.warn('❌ isValidPageDetail: creator должен быть объектом', item.creator);
      return false;
    }

    if (
      typeof item.creator.id !== 'string' ||
      typeof item.creator.email !== 'string' ||
      typeof item.creator.role !== 'string'
    ) {
      console.warn('❌ isValidPageDetail: некорректная структура creator', item.creator);
      return false;
    }
  }

  // site может быть undefined, null или string
  if (item.site !== undefined && item.site !== null && typeof item.site !== 'string') {
    console.warn('❌ isValidPageDetail: site должен быть string, null или undefined', item.site);
    return false;
  }

  console.log('✅ isValidPageDetail: данные валидны', item);
  return true;
}

/**
 * Type guard для проверки валидности массива страниц
 */
export function isValidPagesArray(items: unknown): items is readonly PageFile[] {
  return Array.isArray(items) && items.every(isValidPageFile);
}

/**
 * Type guard для проверки ошибки с response
 */
function isErrorWithResponse(error: unknown): error is ErrorWithResponse {
  return typeof error === 'object' && error !== null && 'response' in error;
}

// ============================================================================
// PINIA STORE
// ============================================================================

export const usePagesStore = defineStore('pages', () => {
  // === STATE ===
  const pages = ref<readonly PageFile[]>([]);
  const selectedPage = ref<PageDetail | null>(null);

  // === GETTERS ===
  const siteId = computed(() => VITE_SITE_ID);

  /**
   * Получить опубликованные страницы
   */
  const publishedPages = computed(() => {
    if (!pages.value) return [];
    return pages.value.filter((page) => page?.is_published === true);
  });

  /**
   * Получить неопубликованные страницы
   */
  const unpublishedPages = computed(() => {
    if (!pages.value) return [];
    return pages.value.filter((page) => page?.is_published === false);
  });

  // === УТИЛИТЫ ===

  /**
   * Обработка ошибок API с детальным логированием и строгой типизацией
   */
  function handleApiError(error: AxiosError<ApiError> | Error, defaultMessage: string): void {
    let errorMessage = defaultMessage;

    // Проверяем, что это именно ошибка сети, а не наша ошибка валидации
    if (error instanceof Error && !isErrorWithResponse(error)) {
      // Это наша ошибка (например, валидации)
      if (error.message.includes('Получены некорректные данные')) {
        errorMessage = 'Ошибка обработки данных от сервера';
      } else {
        errorMessage = error.message;
      }
    } else if (isErrorWithResponse(error) && error.response?.data) {
      // Это ошибка от API
      const apiError = error.response.data;
      errorMessage = apiError?.detail ?? apiError?.message ?? defaultMessage;
    } else if (error.message) {
      errorMessage = `Ошибка сети: ${error.message}`;
    }

    console.error('API Error:', {
      message: errorMessage,
      status: isErrorWithResponse(error) ? error.response?.status : undefined,
      data: isErrorWithResponse(error) ? error.response?.data : undefined,
      url: (error as AxiosError).config?.url,
      originalError: error,
    });

    Notify.create({
      type: 'negative',
      message: errorMessage,
      position: 'top',
      timeout: 5000,
    });
  }

  /**
   * Валидация payload для создания страницы
   */
  function validateCreatePayload(payload: PageCreatePayload): boolean {
    if (!payload.name?.trim()) {
      Notify.create({
        type: 'negative',
        message: 'Название страницы обязательно для заполнения',
      });
      return false;
    }

    if (!payload.content?.trim()) {
      Notify.create({
        type: 'negative',
        message: 'Контент страницы обязателен для заполнения',
      });
      return false;
    }

    return true;
  }

  /**
   * Валидация payload для обновления страницы
   */
  function validateUpdatePayload(payload: PageUpdatePayload): boolean {
    if (payload.name !== undefined && !payload.name?.trim()) {
      Notify.create({
        type: 'negative',
        message: 'Название страницы не может быть пустым',
      });
      return false;
    }

    if (payload.content !== undefined && !payload.content?.trim()) {
      Notify.create({
        type: 'negative',
        message: 'Контент страницы не может быть пустым',
      });
      return false;
    }

    return true;
  }

  // === ПАГИНАЦИЯ ===

  /**
   * Функция для загрузки страниц с пагинацией
   */
  const fetchPagesApiCall = async (
    url?: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<PageFile>> => {
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
        requestUrl = `/sites/${siteId.value}/pages/?page_type=promo`;
        // Фильтруем undefined значения и конвертируем в правильный тип
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

      const { data } = await api.get<PaginationResponse<PageFile>>(requestUrl, {
        params: url ? {} : requestParams,
      });

      // Валидируем полученные данные
      if (!isValidPagesArray(data.results)) {
        throw new Error('Получены некорректные данные страниц от API');
      }

      // Обновляем локальный массив страниц (иммутабельно)
      pages.value = Object.freeze(data.results);

      return data;
    } catch (error) {
      handleApiError(error as AxiosError<ApiError> | Error, 'Не удалось загрузить список страниц.');
      throw error;
    }
  };

  /**
   * Инициализация пагинации
   */
  const pagination = usePagination<PageFile>(fetchPagesApiCall, {
    defaultPageSize: 10,
    defaultSortBy: 'created',
    defaultDescending: true,
  });

  // === ОСНОВНЫЕ ОПЕРАЦИИ ===

  /**
   * Загрузка страниц с пагинацией
   */
  async function fetchPages(url?: string): Promise<readonly PageFile[]> {
    try {
      return await pagination.fetchData(url);
    } catch (error) {
      console.error('Ошибка при загрузке страниц:', error);
      return [];
    }
  }

  /**
   * Получение конкретной страницы по ID
   */
  async function fetchPageById(pageId: string): Promise<PageDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    if (!pageId?.trim()) {
      console.warn('pageId обязателен для получения страницы');
      return null;
    }

    try {
      console.log('🔍 Загружаем страницу с ID:', pageId);

      const { data } = await api.get<PageDetail>(`/sites/${siteId.value}/pages/${pageId}/`);

      console.log('📄 Получены данные страницы от API:', data);

      // Валидируем полученные данные
      if (!isValidPageDetail(data)) {
        console.warn(
          '⚠️ Данные не прошли валидацию PageDetail, пытаемся использовать как PageFile:',
          data,
        );

        // Пытаемся использовать как PageFile, если это возможно
        if (isValidPageFile(data)) {
          console.log('✅ Данные валидны как PageFile, используем их');
          const pageDetail = createPageDetailFromPageFile(data);
          selectedPage.value = Object.freeze(pageDetail);
          return pageDetail;
        }

        console.error('❌ Данные не валидны ни как PageDetail, ни как PageFile');
        throw new Error('Получены некорректные данные страницы от API');
      }

      console.log('✅ Данные успешно валидированы как PageDetail');
      selectedPage.value = Object.freeze(data);
      return data;
    } catch (error) {
      console.error('❌ Ошибка при получении страницы:', error);
      handleApiError(
        error as AxiosError<ApiError> | Error,
        'Не удалось загрузить данные страницы.',
      );
      selectedPage.value = null;
      return null;
    }
  }

  /**
   * 🆕 Создание новой страницы с поддержкой файлов
   */
  async function createPage(payload: PageCreatePayload): Promise<PageDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    // Валидация payload
    if (!validateCreatePayload(payload)) {
      return null;
    }

    try {
      // 🆕 Используем FormData для поддержки файлов
      const formData = new FormData();

      // Обязательные поля
      formData.append('name', payload.name);
      formData.append('content', payload.content);

      // Опциональные поля - добавляем только если они НЕ пустые
      if (payload.title && payload.title.trim()) {
        formData.append('title', payload.title.trim());
      }
      if (payload.description && payload.description.trim()) {
        formData.append('description', payload.description.trim());
      }
      if (payload.keywords && payload.keywords.trim()) {
        formData.append('keywords', payload.keywords.trim());
      }
      if (payload.slug && payload.slug.trim()) {
        formData.append('slug', payload.slug.trim());
      }

      // Boolean поля - всегда добавляем с явным значением
      formData.append('is_published', String(payload.is_published ?? false));
      formData.append('page_type', payload.page_type ?? 'page');

      // 🆕 Файл (если есть)
      if (payload.file instanceof File) {
        formData.append('file', payload.file);
      }

      console.log('🚀 Отправляем FormData:', {
        name: payload.name,
        content: payload.content,
        title: payload.title,
        description: payload.description,
        keywords: payload.keywords,
        slug: payload.slug,
        is_published: payload.is_published,
        page_type: payload.page_type,
        hasFile: payload.file instanceof File,
        fileName: payload.file?.name,
      });

      const { data } = await api.post<PageDetail>(
        `/sites/${siteId.value}/pages/?page_type=promo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      console.log('✅ Получен ответ от API:', data);

      // Валидируем полученные данные
      if (!isValidPageDetail(data)) {
        console.warn(
          '⚠️ Данные не прошли валидацию PageDetail, пытаемся использовать как PageFile:',
          data,
        );

        // Пытаемся использовать как PageFile, если это возможно
        if (isValidPageFile(data)) {
          console.log('✅ Данные валидны как PageFile, преобразуем в PageDetail');
          const pageDetail = createPageDetailFromPageFile(data);

          Notify.create({
            type: 'positive',
            message: `Страница "${pageDetail.name}" успешно создана`,
          });

          // Перезагружаем список страниц
          await fetchPages();
          return Object.freeze(pageDetail);
        }

        console.error('❌ Данные не валидны ни как PageDetail, ни как PageFile');
        throw new Error('Получены некорректные данные созданной страницы от API');
      }

      Notify.create({
        type: 'positive',
        message: `Страница "${data.name}" успешно создана`,
      });

      // Перезагружаем список страниц
      await fetchPages();

      return Object.freeze(data);
    } catch (error) {
      console.error('❌ Ошибка создания страницы:', error);
      handleApiError(error as AxiosError<ApiError> | Error, 'Не удалось создать страницу.');
      return null;
    }
  }

  /**
   * 🆕 Обновление страницы с поддержкой файлов (PUT - полное обновление)
   */
  async function updatePage(
    pageId: string,
    payload: PageUpdatePayload,
  ): Promise<PageDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    if (!pageId?.trim()) {
      console.warn('pageId обязателен для обновления страницы');
      return null;
    }

    // Валидация payload
    if (!validateUpdatePayload(payload)) {
      return null;
    }

    try {
      // 🆕 Используем FormData для поддержки файлов
      const formData = new FormData();

      // Добавляем только определенные поля
      if (payload.name !== undefined) {
        formData.append('name', payload.name);
      }
      if (payload.content !== undefined) {
        formData.append('content', payload.content);
      }

      // Опциональные поля - добавляем только если они НЕ пустые
      if (payload.title !== undefined && payload.title.trim()) {
        formData.append('title', payload.title.trim());
      }
      if (payload.description !== undefined && payload.description.trim()) {
        formData.append('description', payload.description.trim());
      }
      if (payload.keywords !== undefined && payload.keywords.trim()) {
        formData.append('keywords', payload.keywords.trim());
      }
      if (payload.slug !== undefined && payload.slug.trim()) {
        formData.append('slug', payload.slug.trim());
      }

      // Boolean и enum поля
      if (payload.is_published !== undefined) {
        formData.append('is_published', String(payload.is_published));
      }
      if (payload.page_type !== undefined) {
        formData.append('page_type', payload.page_type);
      }

      // 🆕 Файл (если есть)
      if (payload.file instanceof File) {
        formData.append('file', payload.file);
      }

      console.log('🔄 Обновляем страницу:', {
        pageId,
        name: payload.name,
        content: payload.content?.substring(0, 50) + '...',
        title: payload.title,
        description: payload.description,
        keywords: payload.keywords,
        slug: payload.slug,
        is_published: payload.is_published,
        page_type: payload.page_type,
        hasFile: payload.file instanceof File,
        fileName: payload.file?.name,
      });

      const { data } = await api.put<PageDetail>(
        `/sites/${siteId.value}/pages/${pageId}/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      console.log('✅ Страница обновлена:', data);

      // Валидируем полученные данные
      if (!isValidPageDetail(data)) {
        console.warn(
          '⚠️ Данные не прошли валидацию PageDetail, пытаемся использовать как PageFile:',
          data,
        );

        // Пытаемся использовать как PageFile, если это возможно
        if (isValidPageFile(data)) {
          console.log('✅ Данные валидны как PageFile, преобразуем в PageDetail');
          const pageDetail = createPageDetailFromPageFile(data);

          Notify.create({
            type: 'positive',
            message: `Страница "${pageDetail.name}" успешно обновлена`,
          });

          // Обновляем выбранную страницу если это она
          if (selectedPage.value?.id === pageId) {
            selectedPage.value = Object.freeze(pageDetail);
          }

          // Перезагружаем список страниц
          await fetchPages();
          return Object.freeze(pageDetail);
        }

        console.error('❌ Данные не валидны ни как PageDetail, ни как PageFile');
        throw new Error('Получены некорректные данные обновленной страницы от API');
      }

      Notify.create({
        type: 'positive',
        message: `Страница "${data.name}" успешно обновлена`,
      });

      // Обновляем выбранную страницу если это она
      if (selectedPage.value?.id === pageId) {
        selectedPage.value = Object.freeze(data);
      }

      // Перезагружаем список страниц
      await fetchPages();

      return Object.freeze(data);
    } catch (error) {
      console.error('❌ Ошибка обновления страницы:', error);
      handleApiError(error as AxiosError<ApiError> | Error, 'Не удалось обновить страницу.');
      return null;
    }
  }

  /**
   * Частичное обновление страницы (PATCH)
   */
  async function patchPage(pageId: string, payload: PageUpdatePayload): Promise<PageDetail | null> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return null;
    }

    if (!pageId?.trim()) {
      console.warn('pageId обязателен для частичного обновления страницы');
      return null;
    }

    // Валидация payload
    if (!validateUpdatePayload(payload)) {
      return null;
    }

    try {
      // Если есть файл, используем FormData, иначе обычный JSON
      let requestData: FormData | PageUpdatePayload;
      const headers: Record<string, string> = {};

      if (payload.file) {
        // 🆕 Используем FormData если есть файл
        const formData = new FormData();

        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined) {
            if (key === 'file' && value instanceof File) {
              formData.append(key, value);
            } else if (typeof value === 'boolean') {
              formData.append(key, String(value));
            } else if (typeof value === 'string') {
              formData.append(key, value);
            }
          }
        });

        requestData = formData;
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        // Обычный JSON без файла
        requestData = payload;
        headers['Content-Type'] = 'application/json';
      }

      const { data } = await api.patch<PageDetail>(
        `/sites/${siteId.value}/pages/${pageId}/`,
        requestData,
        { headers },
      );

      // Валидируем полученные данные
      if (!isValidPageDetail(data)) {
        console.warn(
          '⚠️ Данные не прошли валидацию PageDetail, пытаемся использовать как PageFile:',
          data,
        );

        // Пытаемся использовать как PageFile, если это возможно
        if (isValidPageFile(data)) {
          console.log('✅ Данные валидны как PageFile, преобразуем в PageDetail');
          const pageDetail = createPageDetailFromPageFile(data);

          Notify.create({
            type: 'positive',
            message: `Страница "${pageDetail.name}" успешно обновлена`,
          });

          // Обновляем выбранную страницу если это она
          if (selectedPage.value?.id === pageId) {
            selectedPage.value = Object.freeze(pageDetail);
          }

          // Перезагружаем список страниц
          await fetchPages();
          return Object.freeze(pageDetail);
        }

        console.error('❌ Данные не валидны ни как PageDetail, ни как PageFile');
        throw new Error('Получены некорректные данные частично обновленной страницы от API');
      }

      Notify.create({
        type: 'positive',
        message: `Страница "${data.name}" успешно обновлена`,
      });

      // Обновляем выбранную страницу если это она
      if (selectedPage.value?.id === pageId) {
        selectedPage.value = Object.freeze(data);
      }

      // Перезагружаем список страниц
      await fetchPages();

      return Object.freeze(data);
    } catch (error) {
      handleApiError(
        error as AxiosError<ApiError> | Error,
        'Не удалось частично обновить страницу.',
      );
      return null;
    }
  }

  /**
   * Удаление страницы
   */
  async function deletePage(pageId: string): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    if (!pageId?.trim()) {
      console.warn('pageId обязателен для удаления страницы');
      return false;
    }

    try {
      await api.delete(`/sites/${siteId.value}/pages/${pageId}/`);

      Notify.create({
        type: 'positive',
        message: 'Страница успешно удалена',
      });

      // Очищаем выбранную страницу если это была она
      if (selectedPage.value?.id === pageId) {
        selectedPage.value = null;
      }

      // Перезагружаем список страниц
      await fetchPages();

      return true;
    } catch (error) {
      handleApiError(error as AxiosError<ApiError> | Error, 'Не удалось удалить страницу.');
      return false;
    }
  }

  /**
   * Переключение статуса публикации страницы
   */
  async function togglePagePublication(pageId: string): Promise<boolean> {
    if (!pageId?.trim()) {
      console.warn('pageId обязателен для переключения статуса публикации');
      return false;
    }

    // Находим страницу в локальном списке
    const page = pages.value.find((p) => p.id === pageId);
    if (!page) {
      Notify.create({
        type: 'negative',
        message: 'Страница не найдена в локальном списке',
      });
      return false;
    }

    // Переключаем статус
    const newStatus = !page.is_published;

    const result = await patchPage(pageId, {
      is_published: newStatus,
    });

    return result !== null;
  }

  // === МАССОВЫЕ ОПЕРАЦИИ ===

  /**
   * 🆕 Массовое удаление страниц
   */
  async function bulkDeletePages(pageIds: readonly string[]): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    if (!pageIds.length) {
      console.warn('Массив pageIds не может быть пустым');
      return false;
    }

    try {
      // Выполняем все DELETE запросы параллельно
      await Promise.all(pageIds.map((id) => api.delete(`/sites/${siteId.value}/pages/${id}/`)));

      Notify.create({
        type: 'positive',
        message: `Успешно удалено ${pageIds.length} страниц`,
      });

      // Очищаем выбранную страницу если она была удалена
      if (selectedPage.value && pageIds.includes(selectedPage.value.id)) {
        selectedPage.value = null;
      }

      // Перезагружаем список страниц
      await fetchPages();

      return true;
    } catch (error) {
      handleApiError(
        error as AxiosError<ApiError> | Error,
        'Ошибка при массовом удалении страниц.',
      );
      return false;
    }
  }

  /**
   * 🆕 Массовое обновление статуса публикации
   */
  async function bulkUpdatePageStatus(
    pageIds: readonly string[],
    isPublished: boolean,
  ): Promise<boolean> {
    if (!siteId.value) {
      Notify.create({ type: 'negative', message: 'VITE_SITE_ID не определен.' });
      return false;
    }

    if (!pageIds.length) {
      console.warn('Массив pageIds не может быть пустым');
      return false;
    }

    try {
      // Выполняем все PATCH запросы параллельно
      await Promise.all(
        pageIds.map((id) =>
          api.patch(`/sites/${siteId.value}/pages/${id}/`, { is_published: isPublished }),
        ),
      );

      Notify.create({
        type: 'positive',
        message: `Успешно обновлено ${pageIds.length} страниц`,
      });

      // Перезагружаем список страниц
      await fetchPages();

      return true;
    } catch (error) {
      handleApiError(
        error as AxiosError<ApiError> | Error,
        'Ошибка при массовом обновлении статуса публикации.',
      );
      return false;
    }
  }

  /**
   * Поиск страниц по названию
   */
  function searchPagesByName(searchTerm: string): readonly PageFile[] {
    if (!searchTerm?.trim()) {
      return pages.value;
    }

    const term = searchTerm.toLowerCase().trim();
    return pages.value.filter(
      (page) =>
        page?.name?.toLowerCase().includes(term) ||
        page?.title?.toLowerCase().includes(term) ||
        page?.slug?.toLowerCase().includes(term),
    );
  }

  /**
   * Очистка состояния
   */
  function clearState(): void {
    pages.value = [];
    selectedPage.value = null;
    pagination.reset();
  }

  /**
   * Очистка выбранной страницы
   */
  function clearSelectedPage(): void {
    selectedPage.value = null;
  }

  // === ВОЗВРАЩАЕМ ПУБЛИЧНЫЙ API ===
  return {
    // State
    pages: computed(() => pages.value),
    selectedPage: computed(() => selectedPage.value),
    loading: pagination.loading,

    // Getters
    publishedPages,
    unpublishedPages,

    // Пагинация
    currentPage: computed(() => pagination.currentPage.value),
    pageSize: computed(() => pagination.pageSize.value),
    totalCount: computed(() => pagination.totalCount.value),
    totalPages: computed(() => pagination.totalPages.value),
    hasNext: computed(() => pagination.hasNext.value),
    hasPrevious: computed(() => pagination.hasPrevious.value),
    qTablePagination: pagination.qTablePagination,

    // Операции
    fetchPages,
    fetchPageById,
    createPage,
    updatePage,
    patchPage,
    deletePage,
    togglePagePublication,
    bulkDeletePages,
    bulkUpdatePageStatus,
    searchPagesByName,
    clearState,
    clearSelectedPage,

    // Пагинация методы
    goToPage: pagination.goToPage,
    goToNextPage: pagination.goToNextPage,
    goToPreviousPage: pagination.goToPreviousPage,
    handleTableRequest: pagination.handleTableRequest,

    // Утилиты
    isValidPageFile,
    isValidPageDetail,
    isValidPagesArray,
    createPageDetailFromPageFile,
    createPageDetailWithDefaults,
  };
});
