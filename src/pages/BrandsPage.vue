<template>
  <q-page padding>
    <!-- Адаптивный заголовок -->
    <div class="q-mb-md">
      <!-- Основной заголовок и кнопка добавления -->
      <div class="row justify-between items-center">
        <div class="text-h5">Управление брендами</div>
        <q-btn
          color="primary"
          icon="add"
          @click="openCreateBrandDialog"
          :label="$q.screen.gt.xs ? 'Добавить бренд' : ''"
          :round="$q.screen.xs"
        />
      </div>

      <!-- Компактная панель массовых операций -->
      <q-slide-transition>
        <div v-if="selectedRows.length > 0" class="q-mt-sm">
          <q-card flat bordered class="bg-blue-1">
            <q-card-section class="q-pa-sm">
              <div
                :class="$q.screen.xs ? 'column q-gutter-y-sm' : 'row items-center justify-between'"
              >
                <span class="text-blue-8 text-body2">{{ selectedRows.length }} выбрано</span>
                <div class="row q-gutter-xs">
                  <q-btn
                    :dense="$q.screen.xs"
                    :size="$q.screen.xs ? 'md' : 'md'"
                    flat
                    color="green"
                    icon="visibility"
                    @click="bulkPublish"
                    :loading="bulkOperationLoading"
                    label="Опубликовать"
                  />
                  <q-btn
                    :dense="$q.screen.xs"
                    :size="$q.screen.xs ? 'md' : 'md'"
                    flat
                    color="orange"
                    icon="visibility_off"
                    @click="bulkUnpublish"
                    :loading="bulkOperationLoading"
                    label="Снять с публикации"
                  />
                  <q-btn
                    :dense="$q.screen.xs"
                    :size="$q.screen.xs ? 'md' : 'md'"
                    flat
                    color="negative"
                    icon="delete"
                    @click="confirmBulkDelete"
                    :loading="bulkOperationLoading"
                    label="Удалить"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </q-slide-transition>
    </div>

    <!-- Поле поиска -->
    <div class="q-mb-md">
      <q-input
        v-model="searchQuery"
        placeholder="Поиск по названию бренда..."
        clearable
        outlined
        dense
        @update:model-value="onSearchInput"
        @clear="clearSearch"
      >
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </div>

    <!-- Счетчик и загрузка -->
    <div v-if="brandsStore.loading" class="flex flex-center q-pa-md">
      <q-spinner color="primary" size="3em" />
    </div>

    <!-- Десктопная таблица -->
    <div v-if="!brandsStore.loading && $q.screen.gt.xs" class="desktop-view">
      <q-table
        title="Бренды"
        :rows="brandsStore.brands"
        :columns="columns"
        row-key="id"
        :loading="brandsStore.loading"
        v-model:pagination="brandsStore.qTablePagination"
        v-model:selected="selectedRows"
        selection="multiple"
        @request="onRequest"
        @row-click="openBrandDetailDialog"
        binary-state-sort
        :rows-per-page-options="[5, 10, 20, 30, 50]"
        class="cursor-pointer brands-table"
      >
        <template v-slot:body-cell-file="props">
          <q-td :props="props">
            <q-avatar v-if="props.row.file" size="50px">
              <img
                :src="props.row.file"
                alt="Brand image"
                style="max-width: 50px; max-height: 50px; object-fit: contain"
              />
            </q-avatar>
            <span v-else>-</span>
          </q-td>
        </template>

        <template v-slot:body-cell-is_published="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.is_published ? 'green' : 'red'"
              :icon="props.row.is_published ? 'visibility' : 'visibility_off'"
              text-color="white"
              dense
              size="md"
              clickable
              @click.stop="confirmTogglePublishStatus(props.row)"
            >
              {{ props.row.is_published ? 'Опубликован' : 'Не опубликован' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <div class="row no-wrap q-gutter-xs justify-end">
              <q-btn
                flat
                round
                dense
                icon="visibility"
                color="primary"
                @click.stop="openBrandDetailFromButton(props.row)"
              >
                <q-tooltip>Просмотр</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="edit" @click.stop="openEditBrandDialog(props.row)">
                <q-tooltip>Редактировать</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click.stop="confirmDeleteBrand(props.row)"
              >
                <q-tooltip>Удалить</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>

        <template v-slot:no-data="{ icon, message, filter }">
          <div class="full-width row flex-center text-accent q-gutter-sm">
            <q-icon size="2em" :name="filter ? 'filter_b_and_w' : icon" />
            <span>{{ message }}</span>
          </div>
        </template>
      </q-table>
    </div>

    <!-- Мобильный аккордеон -->
    <div v-if="!brandsStore.loading && $q.screen.xs" class="mobile-view">
      <!-- Информация о количестве и пагинации -->
      <div class="row items-center justify-between q-mb-md">
        <div class="text-caption text-grey-7">Всего: {{ brandsStore.totalCount }}</div>
        <div class="row q-gutter-xs">
          <q-btn
            flat
            dense
            icon="chevron_left"
            @click="brandsStore.goToPreviousPage"
            :disable="!brandsStore.hasPrevious"
          />
          <span class="text-caption q-px-sm">
            {{ brandsStore.currentPage }} / {{ brandsStore.totalPages }}
          </span>
          <q-btn
            flat
            dense
            icon="chevron_right"
            @click="brandsStore.goToNextPage"
            :disable="!brandsStore.hasNext"
          />
        </div>
      </div>

      <!-- Список карточек -->
      <div class="q-gutter-sm">
        <q-expansion-item
          v-for="brand in brandsStore.brands"
          :key="brand.id"
          class="brand-card"
          :header-class="selectedRows.some((row) => row.id === brand.id) ? 'bg-blue-1' : ''"
        >
          <template v-slot:header>
            <div class="row items-center full-width no-wrap">
              <!-- Чекбокс для выбора -->
              <q-checkbox
                :model-value="selectedRows.some((row) => row.id === brand.id)"
                @update:model-value="(val) => toggleRowSelection(brand, val)"
                class="q-mr-sm"
                @click.stop
              />

              <!-- Аватар -->
              <q-avatar v-if="brand.file" size="40px" class="q-mr-md">
                <img :src="brand.file" alt="Brand image" />
              </q-avatar>
              <q-avatar v-else size="40px" class="q-mr-md bg-grey-3">
                <q-icon name="image" color="grey-6" />
              </q-avatar>

              <!-- Основная информация -->
              <div class="col-grow q-mr-md">
                <div class="text-weight-medium">{{ brand.name }}</div>
                <div class="text-caption text-grey-6">{{ brand.slug }}</div>
              </div>

              <!-- Статус публикации в середине с отступами -->
              <q-btn
                :color="brand.is_published ? 'green' : 'red'"
                text-color="white"
                dense
                size="sm"
                @click.stop="confirmTogglePublishStatus(brand)"
                class="q-mr-md"
                :icon="brand.is_published ? 'visibility' : 'visibility_off'"
                :label="brand.is_published ? '' : ''"
              />

              <!-- Стрелка аккордеона будет справа автоматически -->
            </div>
          </template>

          <!-- Детальная информация и действия -->
          <q-card flat>
            <q-card-section class="q-pt-none">
              <div class="text-body2 q-mb-md" v-if="(brand as any).description">
                <strong>Описание:</strong><br />
                {{ (brand as any).description }}
              </div>

              <!-- Действия в мобильной версии -->
              <div class="column q-gutter-sm">
                <q-btn
                  unelevated
                  color="primary"
                  icon="visibility"
                  label="Просмотреть детали"
                  @click="openBrandDetailFromButton(brand)"
                  class="full-width"
                />
                <div class="row q-gutter-sm">
                  <q-btn
                    outline
                    color="warning"
                    icon="edit"
                    label="Изменить"
                    @click="openEditBrandDialog(brand)"
                    class="col"
                  />
                  <q-btn
                    outline
                    color="negative"
                    icon="delete"
                    label="Удалить"
                    @click="confirmDeleteBrand(brand)"
                    class="col"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </div>

      <!-- Пустое состояние для мобильных -->
      <div v-if="brandsStore.brands.length === 0" class="text-center q-pa-lg">
        <q-icon name="inventory_2" size="4em" color="grey-4" />
        <div class="text-grey-6 q-mt-sm">Бренды не найдены</div>
      </div>
    </div>

    <!-- Диалог создания/редактирования бренда -->
    <q-dialog v-model="brandDialogVisible" persistent :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 400px'">
        <q-card-section>
          <div class="text-h6">{{ isEditing ? 'Редактировать бренд' : 'Добавить бренд' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="currentBrand.name"
            label="Название *"
            autofocus
            :rules="[(val) => !!val || 'Название обязательно']"
            lazy-rules
          />
          <q-input v-model="currentBrand.description" label="Описание" type="textarea" autogrow />
          <q-file
            v-model="currentBrand.newFile"
            label="Файл изображения"
            accept=".jpg, .jpeg, .png, .gif, .svg, .webp"
            clearable
            @update:model-value="handleFileUpload"
          >
            <template v-slot:prepend>
              <q-icon name="attach_file" />
            </template>
          </q-file>
          <q-img
            v-if="imagePreviewUrl && !currentBrand.newFile"
            :src="imagePreviewUrl"
            style="max-height: 100px; margin-top: 10px"
            fit="contain"
          />
          <q-toggle v-model="currentBrand.is_published" label="Опубликован" left-label />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Отмена" v-close-popup />
          <q-btn
            flat
            label="Сохранить"
            color="primary"
            @click="saveBrand"
            :loading="brandsStore.loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Диалог детальной информации о бренде -->
    <q-dialog v-model="brandDetailDialogVisible" :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 500px; max-width: 600px'">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Детали бренда</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedBrandDetail">
          <div :class="$q.screen.xs ? 'column q-gutter-md' : 'row q-gutter-md'">
            <!-- Изображение бренда -->
            <div
              :class="$q.screen.xs ? 'col-12' : 'col-12 col-md-4'"
              v-if="selectedBrandDetail.file"
            >
              <q-img
                :src="selectedBrandDetail.file"
                :style="
                  $q.screen.xs
                    ? 'max-height: 150px; border-radius: 8px'
                    : 'max-height: 200px; border-radius: 8px'
                "
                fit="contain"
                class="bg-grey-1"
              >
                <template v-slot:error>
                  <div class="absolute-full flex flex-center bg-grey-3 text-grey-7">
                    <q-icon name="broken_image" size="50px" />
                  </div>
                </template>
              </q-img>
            </div>

            <!-- Информация о бренде -->
            <div class="col">
              <q-list>
                <q-item>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Название</q-item-label>
                    <q-item-label caption class="text-body1">
                      {{ selectedBrandDetail.name }}
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item v-if="selectedBrandDetail.slug">
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Slug</q-item-label>
                    <q-item-label caption class="text-body1">
                      {{ selectedBrandDetail.slug }}
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item v-if="selectedBrandDetail.description">
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Описание</q-item-label>
                    <q-item-label caption class="text-body1">
                      {{ selectedBrandDetail.description }}
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Статус публикации</q-item-label>
                    <q-item-label caption>
                      <q-chip
                        :color="selectedBrandDetail.is_published ? 'green' : 'red'"
                        text-color="white"
                        size="sm"
                      >
                        {{ selectedBrandDetail.is_published ? 'Опубликован' : 'Не опубликован' }}
                      </q-chip>
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item v-if="selectedBrandDetail.created">
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Дата создания</q-item-label>
                    <q-item-label caption class="text-body1">
                      {{ formatDate(selectedBrandDetail.created) }}
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item v-if="selectedBrandDetail.updated">
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Дата обновления</q-item-label>
                    <q-item-label caption class="text-body1">
                      {{ formatDate(selectedBrandDetail.updated) }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            :label="$q.screen.xs ? '' : 'Редактировать'"
            color="primary"
            @click="editFromDetail"
            icon="edit"
            :round="$q.screen.xs"
          />
          <q-btn
            :label="$q.screen.xs ? '' : 'Удалить'"
            color="negative"
            @click="deleteFromDetail"
            icon="delete"
            :round="$q.screen.xs"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  useBrandsStore,
  type BrandFile,
  type BrandDetail,
  type BrandCreatePayload,
  type BrandUpdatePayload,
} from 'stores/brands.store';
import { useQuasar, date, Dialog } from 'quasar';
import type { QTableProps, QTableColumn } from 'quasar';

const $q = useQuasar();
const brandsStore = useBrandsStore();

const brandDialogVisible = ref(false);
const brandDetailDialogVisible = ref(false);
const isEditing = ref(false);
const selectedBrandDetail = ref<BrandDetail | null>(null);
const searchQuery = ref('');
const selectedRows = ref<BrandFile[]>([]);
const bulkOperationLoading = ref(false);

interface BrandFormData {
  id?: string;
  name: string;
  description: string;
  is_published: boolean;
  fileUrl?: string | null;
  newFile?: File | null;
}

const currentBrand = ref<BrandFormData>({
  name: '',
  description: '',
  is_published: true,
});
const imagePreviewUrl = ref<string | null>(null);

const columns: QTableColumn[] = [
  { name: 'file', label: 'Изображение', field: 'file', align: 'center', sortable: false },
  { name: 'name', required: true, label: 'Название', align: 'left', field: 'name', sortable: true },
  { name: 'slug', label: 'Slug', field: 'slug', align: 'left', sortable: true },
  { name: 'is_published', label: 'Статус', field: 'is_published', align: 'center', sortable: true },
  { name: 'actions', label: 'Действия', field: 'id', align: 'right' },
];

// Функция для управления выбором строк в мобильной версии
function toggleRowSelection(brand: BrandFile, selected: boolean) {
  if (selected) {
    if (!selectedRows.value.some((row) => row.id === brand.id)) {
      selectedRows.value.push(brand);
    }
  } else {
    selectedRows.value = selectedRows.value.filter((row) => row.id !== brand.id);
  }
}

async function onRequest(props: { pagination: QTableProps['pagination'] }) {
  if (props.pagination) {
    await brandsStore.handleTableRequest(props);
  }
}

async function onSearchInput(value: string | number | null) {
  const searchValue = value ? String(value).trim() : '';
  if (searchValue.length >= 2) {
    await brandsStore.filterBrands({ name: searchValue });
  } else if (searchValue.length === 0) {
    await brandsStore.clearFilters();
  }
}

async function clearSearch() {
  searchQuery.value = '';
  await brandsStore.clearFilters();
}

async function openBrandDetailFromButton(row: BrandFile) {
  const fullBrandData = await brandsStore.fetchBrandById(row.id);
  if (fullBrandData) {
    selectedBrandDetail.value = fullBrandData;
    brandDetailDialogVisible.value = true;
  }
}

function openCreateBrandDialog() {
  isEditing.value = false;
  currentBrand.value = {
    name: '',
    description: '',
    is_published: true,
    newFile: null,
    fileUrl: null,
  };
  imagePreviewUrl.value = null;
  brandDialogVisible.value = true;
}

async function openEditBrandDialog(brand: BrandFile) {
  isEditing.value = true;
  const fullBrandData = await brandsStore.fetchBrandById(brand.id);
  if (fullBrandData) {
    currentBrand.value = {
      id: fullBrandData.id,
      name: fullBrandData.name,
      description: fullBrandData.description || '',
      is_published: fullBrandData.is_published,
      fileUrl: fullBrandData.file,
      newFile: null,
    };
    imagePreviewUrl.value = fullBrandData.file;
  } else {
    currentBrand.value = {
      id: brand.id,
      name: brand.name,
      description: '',
      is_published: brand.is_published,
      fileUrl: brand.file,
      newFile: null,
    };
    imagePreviewUrl.value = brand.file;
  }
  brandDialogVisible.value = true;
}

function handleFileUpload(file: File | File[] | null) {
  if (file && !Array.isArray(file)) {
    currentBrand.value.newFile = file;
    imagePreviewUrl.value = URL.createObjectURL(file);
  } else {
    currentBrand.value.newFile = null;
    if (isEditing.value && currentBrand.value.fileUrl) {
      imagePreviewUrl.value = currentBrand.value.fileUrl;
    } else {
      imagePreviewUrl.value = null;
    }
  }
}

async function saveBrand() {
  if (!currentBrand.value.name) {
    $q.notify({ type: 'negative', message: 'Название бренда обязательно.' });
    return;
  }

  const isPublished =
    typeof currentBrand.value.is_published === 'boolean' ? currentBrand.value.is_published : false;

  const payload: BrandCreatePayload | BrandUpdatePayload = {
    name: currentBrand.value.name,
    description: currentBrand.value.description || '',
    is_published: isPublished,
  };

  if (currentBrand.value.newFile) {
    payload.file = currentBrand.value.newFile;
  }

  let success = false;
  if (isEditing.value && currentBrand.value.id) {
    const updatedBrand = await brandsStore.updateBrand(
      currentBrand.value.id,
      payload as BrandUpdatePayload,
    );
    if (updatedBrand) success = true;
  } else {
    const newBrand = await brandsStore.createBrand(payload as BrandCreatePayload);
    if (newBrand) success = true;
  }

  if (success) {
    brandDialogVisible.value = false;
  }
}

async function togglePublishStatus(brand: BrandFile) {
  await brandsStore.patchBrandStatus(brand.id, !brand.is_published);
}

// Функция подтверждения для мобильной версии
function confirmTogglePublishStatus(brand: BrandFile) {
  if ($q.screen.xs) {
    const newStatus = !brand.is_published;
    const action = newStatus ? 'опубликовать' : 'снять с публикации';

    Dialog.create({
      title: 'Подтвердите действие',
      message: `Вы уверены, что хотите ${action} бренд "${brand.name}"?`,
      persistent: true,
      ok: {
        label: newStatus ? 'Опубликовать' : 'Снять с публикации',
        color: newStatus ? 'green' : 'orange',
      },
      cancel: {
        label: 'Отмена',
        flat: true,
      },
    }).onOk(() => {
      void togglePublishStatus(brand);
    });
  } else {
    // На десктопе сразу меняем статус без подтверждения
    void togglePublishStatus(brand);
  }
}

function confirmBulkDelete() {
  Dialog.create({
    title: 'Подтвердите удаление',
    message: `Вы уверены, что хотите удалить ${selectedRows.value.length} элементов?`,
    persistent: true,
    ok: {
      label: 'Удалить',
      color: 'negative',
    },
    cancel: {
      label: 'Отмена',
      flat: true,
    },
  }).onOk(() => {
    void bulkDelete();
  });
}

async function bulkDelete() {
  bulkOperationLoading.value = true;
  try {
    const success = await brandsStore.bulkDeleteBrands(selectedRows.value.map((row) => row.id));
    if (success) {
      selectedRows.value = [];
    }
  } finally {
    bulkOperationLoading.value = false;
  }
}

async function bulkPublish() {
  bulkOperationLoading.value = true;
  try {
    const success = await brandsStore.bulkUpdateBrandStatus(
      selectedRows.value.map((row) => row.id),
      true,
    );
    if (success) {
      selectedRows.value = [];
    }
  } finally {
    bulkOperationLoading.value = false;
  }
}

async function bulkUnpublish() {
  bulkOperationLoading.value = true;
  try {
    const success = await brandsStore.bulkUpdateBrandStatus(
      selectedRows.value.map((row) => row.id),
      false,
    );
    if (success) {
      selectedRows.value = [];
    }
  } finally {
    bulkOperationLoading.value = false;
  }
}

function confirmDeleteBrand(brand: BrandFile) {
  Dialog.create({
    title: 'Подтвердите удаление',
    message: `Вы уверены, что хотите удалить бренд "${brand.name}"?`,
    persistent: true,
    ok: {
      label: 'Удалить',
      color: 'negative',
    },
    cancel: {
      label: 'Отмена',
      flat: true,
    },
  }).onOk(() => {
    brandsStore.deleteBrand(brand.id).catch((error) => {
      $q.notify({
        type: 'negative',
        message: 'Ошибка при удалении бренда',
      });
      console.error('Delete brand error:', error);
    });
  });
}

async function openBrandDetailDialog(evt: Event, row: BrandFile) {
  const target = evt.target as HTMLElement;
  if (target.closest('.q-btn') || target.closest('button')) {
    return;
  }

  const fullBrandData = await brandsStore.fetchBrandById(row.id);
  if (fullBrandData) {
    selectedBrandDetail.value = fullBrandData;
    brandDetailDialogVisible.value = true;
  }
}

async function editFromDetail() {
  if (selectedBrandDetail.value) {
    brandDetailDialogVisible.value = false;
    await openEditBrandDialog(selectedBrandDetail.value);
  }
}

function deleteFromDetail() {
  if (selectedBrandDetail.value) {
    brandDetailDialogVisible.value = false;
    confirmDeleteBrand(selectedBrandDetail.value);
  }
}

function formatDate(dateString: string): string {
  return date.formatDate(dateString, 'DD.MM.YYYY HH:mm');
}

onMounted(async () => {
  await brandsStore.fetchBrands();
});
</script>

<style scoped lang="scss">
.q-table th {
  font-weight: bold;
}

.cursor-pointer .q-table tbody tr {
  cursor: pointer;
}

.cursor-pointer .q-table tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.brands-table {
  .q-table th,
  .q-table td {
    &:last-child {
      text-align: right;
    }
  }
}

.brand-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  // Увеличиваем отступы в заголовке для мобильной версии
  .q-expansion-item__header {
    padding: 12px 16px;
    min-height: 64px;
  }
}

.mobile-view {
  .q-expansion-item__content {
    padding: 0;
  }
}

.desktop-view {
  .q-table {
    border-radius: 8px;
    overflow: hidden;
  }
}
</style>
