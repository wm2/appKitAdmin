<template>
  <q-page class="q-pa-md">
    <!-- Заголовок страницы -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-ma-none">Управление промо акциями</h1>
        <p class="text-grey-6 q-mt-sm q-mb-none">Создание и редактирование промо акций для сайта</p>
      </div>
      <q-btn
        icon="add"
        label="Добавить промо акцию"
        color="primary"
        @click="openCreateDialog"
        unelevated
        class="q-px-lg"
      />
    </div>

    <!-- Поиск и фильтры -->
    <q-card class="q-mb-lg">
      <q-card-section>
        <div class="row q-gutter-md items-end">
          <div class="col-md-4 col-sm-6 col-xs-12">
            <q-input
              v-model="searchTerm"
              label="Поиск промо акций"
              outlined
              dense
              clearable
              @input="handleSearch"
              placeholder="Введите название, заголовок или slug"
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-md-3 col-sm-6 col-xs-12">
            <q-select
              v-model="publishedFilter"
              :options="publishedFilterOptions"
              label="Статус публикации"
              outlined
              dense
              emit-value
              map-options
              @update:model-value="handleFilterChange"
            />
          </div>
          <div class="col-auto">
            <q-btn
              icon="refresh"
              label="Обновить"
              color="secondary"
              outline
              @click="refreshPages"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Компактная панель массовых операций -->
    <q-slide-transition>
      <div v-if="selectedRows.length > 0" class="q-mb-lg">
        <q-card flat bordered class="bg-blue-1">
          <q-card-section class="q-pa-sm">
            <div class="row items-center justify-between">
              <!-- Информация о выбранных элементах -->
              <div class="row items-center q-gutter-sm">
                <q-icon name="check_circle" color="blue" size="sm" />
                <span class="text-blue-8 text-weight-medium">
                  {{ selectedRows.length }} {{ declensionPages(selectedRows.length) }} выбрано
                </span>
                <q-btn
                  flat
                  dense
                  size="sm"
                  color="blue"
                  icon="clear"
                  label="Снять выделение"
                  @click="clearSelection"
                />
              </div>

              <!-- Кнопки массовых операций -->
              <div class="row q-gutter-xs">
                <q-btn
                  flat
                  dense
                  color="positive"
                  icon="visibility"
                  :label="$q.screen.gt.xs ? 'Опубликовать' : ''"
                  @click="bulkPublish"
                  :loading="bulkOperationLoading"
                  :disable="selectedRows.length === 0"
                >
                  <q-tooltip v-if="$q.screen.xs">Опубликовать выбранные промо акции</q-tooltip>
                </q-btn>

                <q-btn
                  flat
                  dense
                  color="orange"
                  icon="visibility_off"
                  :label="$q.screen.gt.xs ? 'Снять с публикации' : ''"
                  @click="bulkUnpublish"
                  :loading="bulkOperationLoading"
                  :disable="selectedRows.length === 0"
                >
                  <q-tooltip v-if="$q.screen.xs"
                    >Снять с публикации выбранные промо акции</q-tooltip
                  >
                </q-btn>

                <q-separator vertical class="q-mx-xs" />

                <q-btn
                  flat
                  dense
                  color="negative"
                  icon="delete"
                  :label="$q.screen.gt.xs ? 'Удалить' : ''"
                  @click="confirmBulkDelete"
                  :loading="bulkOperationLoading"
                  :disable="selectedRows.length === 0"
                >
                  <q-tooltip v-if="$q.screen.xs">Удалить выбранные промо акции</q-tooltip>
                </q-btn>
              </div>
            </div>

            <!-- Дополнительная информация -->
            <div v-if="selectedRows.length > 0" class="q-mt-xs">
              <div class="text-caption text-grey-7">
                Опубликованных: {{ selectedRows.filter((p) => p.is_published).length }} |
                Черновиков: {{ selectedRows.filter((p) => !p.is_published).length }}
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </q-slide-transition>

    <!-- Таблица страниц -->
    <q-card>
      <q-card-section class="q-pa-none">
        <q-table
          :rows="filteredPages"
          :columns="tableColumns"
          :loading="pagesStore.loading"
          :pagination="tablePagination"
          @request="onTableRequest"
          row-key="id"
          flat
          bordered
          class="pages-table"
          v-model:selected="selectedRows"
          selection="multiple"
          :rows-per-page-options="[5, 10, 20, 50]"
        >
          <!-- Слот для изображения/файла -->
          <template v-slot:body-cell-file="props">
            <q-td :props="props">
              <div class="file-preview">
                <q-avatar
                  v-if="props.value"
                  size="40px"
                  rounded
                  class="cursor-pointer"
                  @click="viewFile(props.value)"
                >
                  <img
                    v-if="
                      isImageFileWithFallback(props.row.file_type, props.value, props.row.file_name)
                    "
                    :src="props.value"
                    :alt="props.row.file_name || 'Изображение'"
                    style="object-fit: cover"
                  />
                  <q-icon v-else name="insert_drive_file" size="24px" color="grey-6" />
                  <q-tooltip>
                    {{ props.row.file_name || 'Файл' }}
                    <div v-if="props.row.file_type" class="text-caption">
                      {{ props.row.file_type }}
                    </div>
                  </q-tooltip>
                </q-avatar>
                <q-icon v-else name="image_not_supported" size="24px" color="grey-4" />
              </div>
            </q-td>
          </template>

          <!-- Слот для статуса публикации -->
          <template v-slot:body-cell-is_published="props">
            <q-td :props="props">
              <q-chip
                :color="props.value ? 'positive' : 'grey'"
                :text-color="props.value ? 'white' : 'black'"
                size="sm"
                :label="props.value ? 'Опубликовано' : 'Черновик'"
              />
            </q-td>
          </template>

          <!-- Слот для типа страницы -->
          <template v-slot:body-cell-page_type="props">
            <q-td :props="props">
              <q-badge color="info" :label="props.row.page_type_display || props.value" />
            </q-td>
          </template>

          <!-- Слот для даты создания -->
          <template v-slot:body-cell-created="props">
            <q-td :props="props">
              {{ formatDate(props.value) }}
            </q-td>
          </template>

          <!-- Слот для действий -->
          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="q-gutter-xs">
              <q-btn
                icon="visibility"
                color="primary"
                size="sm"
                flat
                round
                @click="viewPageDetail(props.row)"
              >
                <q-tooltip>Просмотр промо акции</q-tooltip>
              </q-btn>
              <q-btn
                icon="edit"
                color="warning"
                size="sm"
                flat
                round
                @click="openEditDialog(props.row)"
              >
                <q-tooltip>Редактировать промо акцию</q-tooltip>
              </q-btn>
              <q-btn
                :icon="props.row.is_published ? 'visibility_off' : 'visibility'"
                :color="props.row.is_published ? 'orange' : 'positive'"
                size="sm"
                flat
                round
                @click="togglePublication(props.row)"
                :loading="toggleLoadingIds.includes(props.row.id)"
              >
                <q-tooltip>
                  {{ props.row.is_published ? 'Снять с публикации' : 'Опубликовать' }}
                </q-tooltip>
              </q-btn>
              <q-btn
                icon="delete"
                color="negative"
                size="sm"
                flat
                round
                @click="confirmDelete(props.row)"
              >
                <q-tooltip>Удалить промо акцию</q-tooltip>
              </q-btn>
            </q-td>
          </template>

          <!-- Слот для пустого состояния -->
          <template v-slot:no-data>
            <div class="full-width row flex-center q-gutter-sm text-grey">
              <q-icon size="2em" name="campaign" />
              <span class="text-subtitle1">
                {{ searchTerm ? 'Промо акции не найдены' : 'Нет промо акций для отображения' }}
              </span>
            </div>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Диалог создания/редактирования страницы -->
    <q-dialog v-model="showDialog" persistent :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 700px; max-width: 900px'">
        <q-card-section>
          <div class="text-h6">
            {{ isEditMode ? 'Редактирование промо акции' : 'Создание новой промо акции' }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none" style="max-height: 70vh; overflow-y: auto">
          <!-- Название страницы (обязательное) -->
          <q-input
            v-model="pageForm.name"
            label="Название промо акции *"
            autofocus
            :rules="[(val) => !!val?.trim() || 'Название обязательно для заполнения']"
            lazy-rules
            outlined
            class="q-mb-md"
          />

          <!-- 🆕 Загрузка файла -->
          <div class="q-mb-md">
            <q-file
              v-model="pageForm.file"
              label="Изображение промо акции"
              outlined
              accept="image/*"
              max-file-size="5242880"
              @rejected="onFileRejected"
              @update:model-value="onFileSelected"
            >
              <template v-slot:prepend>
                <q-icon name="attach_file" />
              </template>
            </q-file>

            <!-- Превью загруженного файла -->
            <div v-if="filePreview" class="q-mt-sm">
              <q-img
                :src="filePreview"
                style="max-width: 200px; max-height: 150px"
                class="rounded-borders"
              />
            </div>

            <!-- Текущий файл (при редактировании) -->
            <div v-else-if="isEditMode && currentFileUrl" class="q-mt-sm">
              <div class="text-caption text-grey-6 q-mb-xs">Текущий файл:</div>
              <q-img
                :src="currentFileUrl"
                style="max-width: 200px; max-height: 150px"
                class="rounded-borders"
              />
            </div>
          </div>

          <!-- Переключатель редакторов -->
          <div class="q-mb-md">
            <q-toggle v-model="useHtmlEditor" label="Использовать HTML редактор" left-label />
          </div>

          <!-- Markdown редактор (по умолчанию) -->
          <q-input
            v-if="!useHtmlEditor"
            v-model="pageForm.content"
            label="Контент промо акции (Markdown) *"
            outlined
            type="textarea"
            rows="6"
            autogrow
            :rules="[(val) => !!val?.trim() || 'Контент обязателен для заполнения']"
            class="q-mb-md"
            placeholder="# Заголовок&#10;&#10;**Жирный текст**&#10;&#10;- Список&#10;- Элементов"
          />

          <!-- HTML редактор -->
          <q-editor
            v-else
            v-model="pageForm.content"
            placeholder="Введите содержимое промо акции..."
            min-height="150px"
            :toolbar="[
              ['bold', 'italic', 'underline'],
              ['undo', 'redo'],
              ['unordered', 'ordered'],
              ['link', 'quote', 'hr'],
            ]"
            class="q-mb-md"
          />

          <!-- URL slug -->
          <q-input
            v-model="pageForm.slug"
            label="URL slug"
            outlined
            class="q-mb-md"
            placeholder="Будет сгенерирован автоматически"
          />

          <!-- Микро-кнопка для SEO -->
          <div class="q-mb-md">
            <q-btn
              flat
              dense
              :icon="seoExpanded ? 'expand_less' : 'expand_more'"
              :label="seoExpanded ? 'Скрыть SEO настройки' : 'Показать SEO настройки'"
              color="primary"
              @click="seoExpanded = !seoExpanded"
              size="sm"
            />
          </div>

          <!-- SEO поля -->
          <q-slide-transition>
            <div v-if="seoExpanded" class="q-mb-md">
              <q-input v-model="pageForm.title" label="SEO заголовок" outlined class="q-mb-md" />
              <q-input
                v-model="pageForm.description"
                label="SEO описание"
                type="textarea"
                outlined
                autogrow
                class="q-mb-md"
              />
              <q-input
                v-model="pageForm.keywords"
                label="Ключевые слова"
                outlined
                hint="Разделяйте запятыми"
                class="q-mb-md"
              />
            </div>
          </q-slide-transition>

          <!-- Статус публикации (убрано поле выбора типа страницы) -->
          <div class="row q-gutter-md q-mb-md">
            <q-toggle v-model="pageForm.is_published" label="Опубликована" left-label class="col" />

            <!-- Информация о типе страницы (только для отображения) -->
            <div class="col">
              <div class="text-caption text-grey-6 q-mb-xs">Тип страницы</div>
              <q-badge color="info" label="Промо акция" />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Отмена" @click="closeDialog" />
          <q-btn flat label="Сохранить" color="primary" @click="savePageData" :loading="isSaving" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Диалог подтверждения удаления -->
    <q-dialog v-model="showDeleteDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Подтверждение удаления</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          Вы действительно хотите удалить промо акцию
          <strong>{{ pageToDelete?.name }}</strong
          >?
          <br />
          <span class="text-grey-6">Это действие нельзя отменить.</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Отмена" color="grey" @click="cancelDelete" />
          <q-btn label="Удалить" color="negative" @click="deletePage" :loading="isDeleting" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 🆕 Диалог просмотра страницы -->
    <q-dialog v-model="showDetailDialog" :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 600px; max-width: 800px'">
        <q-card-section>
          <div class="text-h6">{{ selectedPageDetail?.name }}</div>
          <div class="text-caption text-grey-6">
            {{ selectedPageDetail?.page_type_display }} |
            {{ selectedPageDetail?.is_published ? 'Опубликовано' : 'Черновик' }}
          </div>
        </q-card-section>

        <q-card-section v-if="selectedPageDetail" class="q-pt-none">
          <!-- Изображение -->
          <div v-if="selectedPageDetail.file" class="q-mb-md">
            <q-img
              :src="selectedPageDetail.file"
              style="max-width: 100%; max-height: 300px"
              class="rounded-borders"
            />
          </div>

          <!-- Контент с уменьшенным шрифтом -->
          <div class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm">Содержимое промо акции</div>
            <q-card flat bordered class="bg-grey-1">
              <q-card-section>
                <div
                  class="text-caption content-preview"
                  v-html="formatContent(selectedPageDetail.content)"
                ></div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Метаданные -->
          <q-separator class="q-my-md" />

          <div class="row q-gutter-md">
            <div class="col">
              <div class="text-caption text-grey-6">Slug:</div>
              <div>{{ selectedPageDetail.slug || '—' }}</div>
            </div>
            <div class="col">
              <div class="text-caption text-grey-6">Создано:</div>
              <div>{{ formatDate(selectedPageDetail.created) }}</div>
            </div>
          </div>

          <!-- SEO информация -->
          <div v-if="selectedPageDetail.title || selectedPageDetail.description" class="q-mt-md">
            <div class="text-subtitle2 q-mb-sm">SEO информация</div>
            <div v-if="selectedPageDetail.title" class="q-mb-sm">
              <div class="text-caption text-grey-6">Заголовок:</div>
              <div>{{ selectedPageDetail.title }}</div>
            </div>
            <div v-if="selectedPageDetail.description">
              <div class="text-caption text-grey-6">Описание:</div>
              <div>{{ selectedPageDetail.description }}</div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Закрыть" @click="closeDetailDialog" />
          <q-btn
            flat
            label="Редактировать"
            color="primary"
            @click="editFromDetail"
            v-if="selectedPageDetail"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { date, Dialog, Notify } from 'quasar';
import { usePagesStore } from 'stores/pages.store';
import type {
  PageFile,
  PageDetail,
  PageCreatePayload,
  PageUpdatePayload,
  PageType,
  PageFormData,
} from 'stores/pages.store';

// ============================================================================
// КОМПОЗИЦИЯ
// ============================================================================

const pagesStore = usePagesStore();

// ============================================================================
// РЕАКТИВНЫЕ ДАННЫЕ
// ============================================================================

// Состояния диалогов
const showDialog = ref(false);
const showDeleteDialog = ref(false);
const showDetailDialog = ref(false);
const isEditMode = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);

// Поиск и фильтрация
const searchTerm = ref('');
const publishedFilter = ref<boolean | null>(null);

// Данные формы
const pageForm = ref<PageFormData>({
  name: '',
  content: '',
  title: '',
  description: '',
  keywords: '',
  slug: '',
  is_published: false,
  page_type: 'promo' as PageType, // Зафиксировано на промо акции
  file: null,
});

// 🆕 Файловые переменные
const filePreview = ref<string | null>(null);
const currentFileUrl = ref<string | null>(null);

// Переключатель редакторов markdown/html
const useHtmlEditor = ref(false);

// SEO поля - сворачиваемая секция
const seoExpanded = ref(false);

// Страница для удаления и просмотра
const pageToDelete = ref<PageFile | null>(null);
const selectedPageDetail = ref<PageDetail | null>(null);

// Загрузка переключения публикации
const toggleLoadingIds = ref<string[]>([]);

// Массовые операции
const selectedRows = ref<PageFile[]>([]);
const bulkOperationLoading = ref(false);

// ============================================================================
// COMPUTED СВОЙСТВА
// ============================================================================

/**
 * Опции для фильтра статуса публикации
 */
const publishedFilterOptions = computed(() => [
  { label: 'Все промо акции', value: null },
  { label: 'Опубликованные', value: true },
  { label: 'Черновики', value: false },
]);

/**
 * Отфильтрованные страницы
 */
const filteredPages = computed(() => {
  let result = pagesStore.pages;

  // Фильтр по поисковому запросу
  if (searchTerm.value?.trim()) {
    const term = searchTerm.value.toLowerCase().trim();
    result = result.filter(
      (page) =>
        page?.name?.toLowerCase().includes(term) ||
        page?.title?.toLowerCase().includes(term) ||
        page?.slug?.toLowerCase().includes(term),
    );
  }

  // Фильтр по статусу публикации
  if (publishedFilter.value !== null) {
    result = result.filter((page) => page?.is_published === publishedFilter.value);
  }

  return result;
});

/**
 * Настройки пагинации таблицы
 */
const tablePagination = computed(() => ({
  page: pagesStore.currentPage,
  rowsPerPage: pagesStore.pageSize,
  rowsNumber: pagesStore.totalCount,
}));

/**
 * Колонки таблицы
 */
const tableColumns = computed(() => [
  {
    name: 'file',
    label: 'Изображение',
    align: 'center' as const,
    field: (row: PageFile) => row.file,
    sortable: false,
    style: 'width: 80px',
  },
  {
    name: 'name',
    required: true,
    label: 'Название',
    align: 'left' as const,
    field: (row: PageFile) => row.name,
    format: (val: string) => val || '—',
    sortable: true,
    style: 'width: 200px',
  },
  {
    name: 'title',
    label: 'SEO заголовок',
    align: 'left' as const,
    field: (row: PageFile) => row.title,
    format: (val: string | null) => val || '—',
    sortable: false,
    style: 'max-width: 200px; overflow: hidden; text-overflow: ellipsis;',
  },
  {
    name: 'slug',
    label: 'URL slug',
    align: 'left' as const,
    field: (row: PageFile) => row.slug,
    format: (val: string) => val || '—',
    sortable: true,
    style: 'width: 150px',
  },
  {
    name: 'page_type',
    label: 'Тип',
    align: 'center' as const,
    field: (row: PageFile) => row.page_type,
    sortable: false,
    style: 'width: 120px',
  },
  {
    name: 'is_published',
    label: 'Статус',
    align: 'center' as const,
    field: (row: PageFile) => row.is_published,
    sortable: true,
    style: 'width: 130px',
  },
  {
    name: 'created',
    label: 'Создано',
    align: 'center' as const,
    field: (row: PageFile) => row.created,
    sortable: true,
    style: 'width: 120px',
  },
  {
    name: 'actions',
    label: 'Действия',
    align: 'center' as const,
    field: '',
    sortable: false,
    style: 'width: 180px',
  },
]);

// ============================================================================
// УТИЛИТЫ ДЛЯ ФАЙЛОВ
// ============================================================================

/**
 * Определение типа файла по URL или имени файла
 */
function getFileTypeFromUrl(fileUrl?: string | null, fileName?: string | null): string | null {
  if (!fileUrl && !fileName) return null;

  // Проверяем расширение файла из URL или имени
  const urlToCheck = fileUrl || fileName || '';
  const extension = urlToCheck.split('.').pop()?.toLowerCase();

  if (!extension) return null;

  // Определяем MIME тип по расширению
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv'];

  if (imageExtensions.includes(extension)) {
    return `image/${extension === 'jpg' ? 'jpeg' : extension}`;
  }
  if (documentExtensions.includes(extension)) {
    return `application/${extension}`;
  }
  if (videoExtensions.includes(extension)) {
    return `video/${extension}`;
  }

  return 'application/octet-stream';
}

/**
 * Проверка, является ли файл изображением (с fallback определением по URL)
 */
function isImageFileWithFallback(
  fileType?: string | null,
  fileUrl?: string | null,
  fileName?: string | null,
): boolean {
  // Сначала проверяем file_type
  if (fileType) {
    return fileType.startsWith('image/');
  }

  // Если file_type отсутствует, определяем по URL или имени файла
  const detectedType = getFileTypeFromUrl(fileUrl, fileName);
  return detectedType?.startsWith('image/') ?? false;
}

/**
 * Обработка выбора файла
 */
function onFileSelected(file: File | null): void {
  if (file) {
    // Устанавливаем файл в форму
    pageForm.value.file = file;

    // Создаем превью
    const reader = new FileReader();
    reader.onload = (e) => {
      filePreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  } else {
    pageForm.value.file = null;
    filePreview.value = null;
  }
}

/**
 * Обработка отклонения файла
 */
function onFileRejected(rejectedEntries: readonly unknown[]): void {
  console.warn('Файл отклонен:', rejectedEntries);
  Notify.create({
    type: 'negative',
    message: 'Файл слишком большой или имеет неподдерживаемый формат',
  });
}

/**
 * Просмотр файла
 */
function viewFile(fileUrl: string): void {
  if (!fileUrl) return;
  window.open(fileUrl, '_blank');
}

// ============================================================================
// МЕТОДЫ
// ============================================================================

/**
 * Форматирование даты
 */
function formatDate(dateString: string): string {
  if (!dateString) return '—';
  try {
    return date.formatDate(dateString, 'DD.MM.YYYY');
  } catch (error) {
    console.warn('Ошибка форматирования даты:', error);
    return '—';
  }
}

/**
 * Простое форматирование контента (для превью)
 * Обрабатывает базовый Markdown в HTML
 */
function formatContent(content: string): string {
  if (!content) return '';

  // Простая обработка markdown для превью
  return (
    content
      // Горизонтальные разделители (должны идти первыми)
      .replace(/^---$/gm, '<hr>')
      // Заголовки
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      // Жирный и курсивный текст
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Простые списки (базовая обработка)
      .replace(/^- (.*$)/gm, '• $1')
      // Переносы строк
      .replace(/\n/g, '<br>')
  );
}
/**
 * Загрузка страниц
 */
async function loadPages(): Promise<void> {
  try {
    await pagesStore.fetchPages();
  } catch (error) {
    console.error('Ошибка загрузки страниц:', error);
  }
}

/**
 * Обновление списка страниц
 */
async function refreshPages(): Promise<void> {
  await loadPages();
}

/**
 * Обработка поиска
 */
function handleSearch(): void {
  // Поиск происходит автоматически через computed свойство filteredPages
}

/**
 * Обработка изменения фильтра
 */
function handleFilterChange(): void {
  // Фильтрация происходит автоматически через computed свойство filteredPages
}

/**
 * Интерфейс для props таблицы
 */
interface TableRequestProps {
  pagination: {
    page: number;
    rowsPerPage: number;
  };
}

/**
 * Обработка запроса таблицы (пагинация)
 */
async function onTableRequest(props: TableRequestProps): Promise<void> {
  try {
    // Используем параметры из пагинации для будущего расширения
    const { page, rowsPerPage } = props.pagination;
    console.log(`Запрос страницы ${page} с ${rowsPerPage} элементами`);
    await pagesStore.fetchPages(undefined);
  } catch (error) {
    console.error('Ошибка пагинации:', error);
  }
}

/**
 * Открытие диалога создания
 */
function openCreateDialog(): void {
  isEditMode.value = false;
  resetForm();
  showDialog.value = true;
}

/**
 * Открытие диалога редактирования
 */
async function openEditDialog(page: PageFile | PageDetail | null): Promise<void> {
  if (!page) {
    console.warn('page is null, cannot edit');
    return;
  }

  isEditMode.value = true;

  try {
    let pageDetail: PageDetail | null = null;

    // Проверяем, что page не null, и только потом используем 'in'
    if (typeof page === 'object' && page !== null && ('creator' in page || 'site' in page)) {
      // Это PageDetail
      pageDetail = page;
    } else {
      // Это PageFile, нужно загрузить детальную информацию
      pageDetail = await pagesStore.fetchPageById(page.id);
    }

    if (pageDetail) {
      // Заполняем форму данными страницы
      pageForm.value = {
        id: pageDetail.id,
        name: pageDetail.name,
        content: pageDetail.content,
        title: pageDetail.title || '',
        description: pageDetail.description || '',
        keywords: pageDetail.keywords || '',
        slug: pageDetail.slug || '',
        is_published: pageDetail.is_published,
        page_type: pageDetail.page_type,
        file: null, // Файл не заполняем при редактировании
      };

      // Сохраняем текущий URL файла для превью
      currentFileUrl.value = pageDetail.file || null;

      showDialog.value = true;
    }
  } catch (error) {
    console.error('Ошибка загрузки данных страницы:', error);
  }
}

/**
 * Просмотр детальной информации о странице
 */
async function viewPageDetail(page: PageFile): Promise<void> {
  try {
    const pageDetail = await pagesStore.fetchPageById(page.id);
    if (pageDetail) {
      selectedPageDetail.value = pageDetail;
      showDetailDialog.value = true;
    }
  } catch (error) {
    console.error('Ошибка загрузки детальной информации:', error);
  }
}

/**
 * Закрытие диалога просмотра
 */
function closeDetailDialog(): void {
  showDetailDialog.value = false;
  selectedPageDetail.value = null;
}

/**
 * Редактирование из диалога просмотра
 */
function editFromDetail(): void {
  if (!selectedPageDetail.value) {
    console.warn('selectedPageDetail.value is null, cannot edit');
    Notify.create({
      type: 'negative',
      message: 'Данные промо акции не загружены',
    });
    return;
  }

  // ВАЖНО: Сохраняем ссылку ПЕРЕД закрытием диалога!
  const pageToEdit = selectedPageDetail.value;
  closeDetailDialog();
  void openEditDialog(pageToEdit);
}

/**
 * Закрытие диалога
 */
function closeDialog(): void {
  showDialog.value = false;
  setTimeout(() => {
    resetForm();
  }, 300);
}

/**
 * Сброс формы
 */
function resetForm(): void {
  pageForm.value = {
    name: '',
    content: '',
    title: '',
    description: '',
    keywords: '',
    slug: '',
    is_published: false,
    page_type: 'promo' as PageType, // Зафиксировано на промо акции
    file: null,
  };

  // Сброс файловых переменных
  filePreview.value = null;
  currentFileUrl.value = null;

  // Сброс переключателей
  useHtmlEditor.value = false;
  seoExpanded.value = false;
}

/**
 * Сохранение данных страницы
 */
async function savePageData(): Promise<void> {
  if (!pageForm.value) return;

  isSaving.value = true;

  try {
    let result: PageDetail | null = null;

    console.log('💾 Сохраняем данные формы:', pageForm.value);

    if (isEditMode.value && pageForm.value.id) {
      // Обновление существующей страницы
      const updatePayload: PageUpdatePayload = {
        name: pageForm.value.name,
        content: pageForm.value.content,
        is_published: pageForm.value.is_published,
        page_type: pageForm.value.page_type,
      };

      // Добавляем опциональные поля только если они не пустые
      if (pageForm.value.title?.trim()) {
        updatePayload.title = pageForm.value.title.trim();
      }
      if (pageForm.value.description?.trim()) {
        updatePayload.description = pageForm.value.description.trim();
      }
      if (pageForm.value.keywords?.trim()) {
        updatePayload.keywords = pageForm.value.keywords.trim();
      }
      if (pageForm.value.slug?.trim()) {
        updatePayload.slug = pageForm.value.slug.trim();
      }

      // 🆕 Добавляем файл если выбран новый
      if (pageForm.value.file instanceof File) {
        updatePayload.file = pageForm.value.file;
      }

      console.log('🔄 Payload для обновления:', updatePayload);
      result = await pagesStore.updatePage(pageForm.value.id, updatePayload);
    } else {
      // Создание новой страницы
      const createPayload: PageCreatePayload = {
        name: pageForm.value.name,
        content: pageForm.value.content,
        is_published: pageForm.value.is_published,
        page_type: pageForm.value.page_type,
      };

      // Добавляем опциональные поля только если они не пустые
      if (pageForm.value.title?.trim()) {
        createPayload.title = pageForm.value.title.trim();
      }
      if (pageForm.value.description?.trim()) {
        createPayload.description = pageForm.value.description.trim();
      }
      if (pageForm.value.keywords?.trim()) {
        createPayload.keywords = pageForm.value.keywords.trim();
      }
      if (pageForm.value.slug?.trim()) {
        createPayload.slug = pageForm.value.slug.trim();
      }

      // 🆕 Добавляем файл если выбран
      if (pageForm.value.file instanceof File) {
        createPayload.file = pageForm.value.file;
      }

      console.log('🆕 Payload для создания:', createPayload);
      result = await pagesStore.createPage(createPayload);
    }

    if (result) {
      console.log('✅ Страница успешно сохранена:', result);
      closeDialog();
    }
  } catch (error) {
    console.error('❌ Ошибка сохранения страницы:', error);
  } finally {
    isSaving.value = false;
  }
}

/**
 * Подтверждение удаления
 */
function confirmDelete(page: PageFile): void {
  pageToDelete.value = page;
  showDeleteDialog.value = true;
}

/**
 * Отмена удаления
 */
function cancelDelete(): void {
  pageToDelete.value = null;
  showDeleteDialog.value = false;
}

/**
 * Удаление страницы
 */
async function deletePage(): Promise<void> {
  if (!pageToDelete.value) return;

  isDeleting.value = true;

  try {
    const success = await pagesStore.deletePage(pageToDelete.value.id);

    if (success) {
      showDeleteDialog.value = false;
      pageToDelete.value = null;
    }
  } catch (error) {
    console.error('Ошибка удаления страницы:', error);
  } finally {
    isDeleting.value = false;
  }
}

/**
 * Переключение статуса публикации
 */
async function togglePublication(page: PageFile): Promise<void> {
  if (!page?.id) return;

  // Добавляем ID в массив загружающихся элементов
  toggleLoadingIds.value.push(page.id);

  try {
    await pagesStore.togglePagePublication(page.id);
  } catch (error) {
    console.error('Ошибка переключения статуса публикации:', error);
  } finally {
    // Убираем ID из массива загружающихся элементов
    const index = toggleLoadingIds.value.indexOf(page.id);
    if (index > -1) {
      toggleLoadingIds.value.splice(index, 1);
    }
  }
}

// ============================================================================
// МАССОВЫЕ ОПЕРАЦИИ
// ============================================================================

/**
 * Склонение слова "промо акция"
 */
function declensionPages(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 10 && lastTwoDigits <= 20) {
    return 'промо акций';
  }

  if (lastDigit === 1) {
    return 'промо акция';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'промо акции';
  }

  return 'промо акций';
}

/**
 * Очистка выделения
 */
function clearSelection(): void {
  selectedRows.value = [];
}

/**
 * Массовая публикация страниц
 */
async function bulkPublish(): Promise<void> {
  if (selectedRows.value.length === 0) return;

  bulkOperationLoading.value = true;
  try {
    const pageIds = selectedRows.value.filter((page) => !page.is_published).map((page) => page.id);

    if (pageIds.length > 0) {
      const success = await pagesStore.bulkUpdatePageStatus(pageIds, true);
      if (success) {
        clearSelection();
      }
    } else {
      Notify.create({
        type: 'info',
        message: 'Все выбранные промо акции уже опубликованы',
      });
    }
  } catch (error) {
    console.error('Ошибка массовой публикации:', error);
  } finally {
    bulkOperationLoading.value = false;
  }
}

/**
 * Массовое снятие с публикации
 */
async function bulkUnpublish(): Promise<void> {
  if (selectedRows.value.length === 0) return;

  bulkOperationLoading.value = true;
  try {
    const pageIds = selectedRows.value.filter((page) => page.is_published).map((page) => page.id);

    if (pageIds.length > 0) {
      const success = await pagesStore.bulkUpdatePageStatus(pageIds, false);
      if (success) {
        clearSelection();
      }
    } else {
      Notify.create({
        type: 'info',
        message: 'Все выбранные промо акции уже сняты с публикации',
      });
    }
  } catch (error) {
    console.error('Ошибка массового снятия с публикации:', error);
  } finally {
    bulkOperationLoading.value = false;
  }
}

/**
 * Подтверждение массового удаления
 */
function confirmBulkDelete(): void {
  if (selectedRows.value.length === 0) return;

  Dialog.create({
    title: 'Подтверждение удаления',
    message: `Вы действительно хотите удалить ${selectedRows.value.length} ${declensionPages(selectedRows.value.length)}? Это действие нельзя отменить.`,
    cancel: true,
    persistent: true,
    ok: {
      label: 'Удалить',
      color: 'negative',
      icon: 'delete',
    },
  }).onOk(() => {
    void bulkDelete();
  });
}

/**
 * Массовое удаление страниц
 */
async function bulkDelete(): Promise<void> {
  if (selectedRows.value.length === 0) return;

  bulkOperationLoading.value = true;
  try {
    const pageIds = selectedRows.value.map((page) => page.id);
    const success = await pagesStore.bulkDeletePages(pageIds);

    if (success) {
      clearSelection();
    }
  } catch (error) {
    console.error('Ошибка массового удаления:', error);
  } finally {
    bulkOperationLoading.value = false;
  }
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

/**
 * Инициализация компонента
 */
onMounted(async () => {
  await loadPages();
});

/**
 * Watchers для автоматического обновления при изменении фильтров
 */
watch([searchTerm, publishedFilter], () => {
  // Фильтрация происходит автоматически через computed свойство
});
</script>

<style lang="scss" scoped>
.pages-table {
  .q-table__bottom {
    border-top: 1px solid $grey-4;
  }

  // Стили для выделенных строк в таблице
  :deep(.q-table__body) {
    .q-tr--selected {
      background-color: rgba(25, 118, 210, 0.08);

      .q-td {
        background-color: transparent;
      }
    }
  }
}

// 🆕 Стили для превью файла
.file-preview {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.q-expansion-item__content) {
  padding: 0;
}

:deep(.q-card-section) {
  &:last-child {
    border-bottom-left-radius: inherit;
    border-bottom-right-radius: inherit;
  }
}

// Стили для HTML редактора
:deep(.q-editor-custom) {
  .q-editor__content {
    min-height: 200px;
  }

  .q-editor__toolbar {
    border-bottom: 1px solid $grey-4;
  }
}

// Стили для контента в диалоге просмотра (уменьшенный шрифт)
.content-preview {
  font-size: 0.75rem !important; // Уменьшенный размер шрифта
  line-height: 1.4;

  // Стили для отформатированного контента
  :deep(h1) {
    font-size: 1.1rem;
    margin: 0.8rem 0 0.4rem 0;
    font-weight: 600;
  }

  :deep(h2) {
    font-size: 1rem;
    margin: 0.6rem 0 0.3rem 0;
    font-weight: 600;
  }

  :deep(h3) {
    font-size: 0.9rem;
    margin: 0.4rem 0 0.2rem 0;
    font-weight: 600;
  }

  :deep(p) {
    margin: 0.3rem 0;
  }

  :deep(strong) {
    font-weight: 600;
  }

  :deep(em) {
    font-style: italic;
  }
}

// Анимация для bulk панели
.q-slide-transition-enter-active,
.q-slide-transition-leave-active {
  transition: all 0.3s ease;
}

.q-slide-transition-enter-from,
.q-slide-transition-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

// Адаптивность для мобильных устройств
@media (max-width: 600px) {
  .pages-table {
    :deep(.q-table__container) {
      overflow-x: auto;
    }

    :deep(.q-table) {
      min-width: 800px;
    }
  }

  // Упрощенная панель инструментов для мобильных
  :deep(.q-editor-custom .q-editor__toolbar) {
    flex-wrap: wrap;

    .q-editor__toolbar-group {
      margin-bottom: 4px;
    }
  }
}
// Стили для контента в диалоге просмотра (уменьшенный шрифт)
.content-preview {
  font-size: 0.75rem !important; // Уменьшенный размер шрифта
  line-height: 1.4;

  // Стили для отформатированного контента
  :deep(h1) {
    font-size: 1.1rem;
    margin: 0.8rem 0 0.4rem 0;
    font-weight: 600;
  }

  :deep(h2) {
    font-size: 1rem;
    margin: 0.6rem 0 0.3rem 0;
    font-weight: 600;
  }

  :deep(h3) {
    font-size: 0.9rem;
    margin: 0.4rem 0 0.2rem 0;
    font-weight: 600;
  }

  :deep(p) {
    margin: 0.3rem 0;
  }

  :deep(strong) {
    font-weight: 600;
  }

  :deep(em) {
    font-style: italic;
  }

  // Стили для горизонтальных разделителей
  :deep(hr) {
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 0.8rem 0;
    width: 100%;
  }
}
</style>
