<template>
  <q-page padding>
    <!-- Адаптивный заголовок -->
    <div class="q-mb-md">
      <!-- Основной заголовок и кнопка добавления -->
      <div class="row justify-between items-center">
        <div class="text-h5">Управление типами товаров</div>
        <q-btn
          color="primary"
          icon="add"
          @click="openCreateProductTypeDialog"
          :label="$q.screen.gt.xs ? 'Добавить тип' : ''"
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
        placeholder="Поиск по названию типа товара..."
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
    <div v-if="productTypesStore.loading" class="flex flex-center q-pa-md">
      <q-spinner color="primary" size="3em" />
    </div>

    <!-- Десктопная таблица -->
    <div v-if="!productTypesStore.loading && $q.screen.gt.xs" class="desktop-view">
      <q-table
        title="Типы товаров"
        :rows="productTypesStore.productTypes"
        :columns="columns"
        row-key="id"
        :loading="productTypesStore.loading"
        v-model:pagination="productTypesStore.qTablePagination"
        v-model:selected="selectedRows"
        selection="multiple"
        @request="onRequest"
        @row-click="openProductTypeDetailDialog"
        binary-state-sort
        :rows-per-page-options="[5, 10, 20, 30, 50]"
        class="cursor-pointer product-types-table"
      >
        <template v-slot:body-cell-description="props">
          <q-td :props="props">
            <div class="text-truncate" style="max-width: 200px">
              {{ props.row.description || '-' }}
            </div>
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
                @click.stop="openProductTypeDetailFromButton(props.row)"
              >
                <q-tooltip>Просмотр</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="edit"
                @click.stop="openEditProductTypeDialog(props.row)"
              >
                <q-tooltip>Редактировать</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click.stop="confirmDeleteProductType(props.row)"
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
    <div v-if="!productTypesStore.loading && $q.screen.xs" class="mobile-view">
      <!-- Информация о количестве и пагинации -->
      <div class="row items-center justify-between q-mb-md">
        <div class="text-caption text-grey-7">Всего: {{ productTypesStore.totalCount }}</div>
        <div class="row q-gutter-xs">
          <q-btn
            flat
            dense
            icon="chevron_left"
            @click="productTypesStore.goToPreviousPage"
            :disable="!productTypesStore.hasPrevious"
          />
          <span class="text-caption q-px-sm">
            {{ productTypesStore.currentPage }} / {{ productTypesStore.totalPages }}
          </span>
          <q-btn
            flat
            dense
            icon="chevron_right"
            @click="productTypesStore.goToNextPage"
            :disable="!productTypesStore.hasNext"
          />
        </div>
      </div>

      <!-- Список карточек -->
      <div class="q-gutter-sm">
        <q-expansion-item
          v-for="type in productTypesStore.productTypes"
          :key="type.id"
          class="product-type-card"
          :header-class="
            selectedRows.some((row: ProductTypeFile) => row.id === type.id) ? 'bg-blue-1' : ''
          "
        >
          <template v-slot:header>
            <div class="row items-center full-width no-wrap">
              <!-- Чекбокс для выбора -->
              <q-checkbox
                :model-value="selectedRows.some((row: ProductTypeFile) => row.id === type.id)"
                @update:model-value="(val) => toggleRowSelection(type, val)"
                class="q-mr-sm"
                @click.stop
              />

              <!-- Иконка типа товара -->
              <q-avatar size="40px" class="q-mr-md bg-primary text-white">
                <q-icon name="category" />
              </q-avatar>

              <!-- Основная информация -->
              <div class="col-grow q-mr-md">
                <div class="text-weight-medium">{{ type.name }}</div>
                <div class="text-caption text-grey-6">
                  {{ type.description || 'Без описания' }}
                </div>
              </div>

              <!-- Стрелка аккордеона будет справа автоматически -->
            </div>
          </template>

          <!-- Детальная информация и действия -->
          <q-card flat>
            <q-card-section class="q-pt-none">
              <div class="text-body2 q-mb-md" v-if="type.description">
                <strong>Описание:</strong><br />
                {{ type.description }}
              </div>

              <!-- Действия в мобильной версии -->
              <div class="column q-gutter-sm">
                <q-btn
                  unelevated
                  color="primary"
                  icon="visibility"
                  label="Просмотреть детали"
                  @click="openProductTypeDetailFromButton(type)"
                  class="full-width"
                />
                <div class="row q-gutter-sm">
                  <q-btn
                    outline
                    color="warning"
                    icon="edit"
                    label="Изменить"
                    @click="openEditProductTypeDialog(type)"
                    class="col"
                  />
                  <q-btn
                    outline
                    color="negative"
                    icon="delete"
                    label="Удалить"
                    @click="confirmDeleteProductType(type)"
                    class="col"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </div>

      <!-- Пустое состояние для мобильных -->
      <div v-if="productTypesStore.productTypes.length === 0" class="text-center q-pa-lg">
        <q-icon name="category" size="4em" color="grey-4" />
        <div class="text-grey-6 q-mt-sm">Типы товаров не найдены</div>
      </div>
    </div>

    <!-- Диалог создания/редактирования типа товара -->
    <q-dialog v-model="productTypeDialogVisible" persistent :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 400px'">
        <q-card-section>
          <div class="text-h6">
            {{ isEditing ? 'Редактировать тип товара' : 'Добавить тип товара' }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="currentProductType.name"
            label="Название *"
            autofocus
            :rules="[(val) => !!val || 'Название обязательно']"
            lazy-rules
          />
          <q-input
            v-model="currentProductType.description"
            label="Описание"
            type="textarea"
            autogrow
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Отмена" v-close-popup />
          <q-btn
            flat
            label="Сохранить"
            color="primary"
            @click="saveProductType"
            :loading="productTypesStore.loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Диалог детальной информации о типе товара -->
    <q-dialog v-model="productTypeDetailDialogVisible" :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 500px; max-width: 600px'">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Детали типа товара</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedProductTypeDetail">
          <!-- Информация о типе товара -->
          <q-list>
            <q-item>
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white">
                  <q-icon name="category" />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">Название</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedProductTypeDetail.name }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedProductTypeDetail.description">
              <q-item-section>
                <q-item-label class="text-weight-medium">Описание</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedProductTypeDetail.description }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedProductTypeDetail.creator">
              <q-item-section>
                <q-item-label class="text-weight-medium">Создатель</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedProductTypeDetail.creator.email }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedProductTypeDetail.created">
              <q-item-section>
                <q-item-label class="text-weight-medium">Дата создания</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ formatDate(selectedProductTypeDetail.created) }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedProductTypeDetail.updated">
              <q-item-section>
                <q-item-label class="text-weight-medium">Дата обновления</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ formatDate(selectedProductTypeDetail.updated) }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
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
  useProductTypesStore,
  type ProductTypeFile,
  type ProductTypeDetail,
  type ProductTypeCreatePayload,
  type ProductTypeUpdatePayload,
} from 'stores/product-types.store';
import { useQuasar, date, Dialog } from 'quasar';
import type { QTableProps, QTableColumn } from 'quasar';

const $q = useQuasar();
const productTypesStore = useProductTypesStore();

const productTypeDialogVisible = ref(false);
const productTypeDetailDialogVisible = ref(false);
const isEditing = ref(false);
const selectedProductTypeDetail = ref<ProductTypeDetail | null>(null);
const searchQuery = ref('');
const selectedRows = ref<ProductTypeFile[]>([]);
const bulkOperationLoading = ref(false);

interface ProductTypeFormData {
  id?: string;
  name: string;
  description: string;
}

const currentProductType = ref<ProductTypeFormData>({
  name: '',
  description: '',
});

const columns: QTableColumn[] = [
  { name: 'name', required: true, label: 'Название', align: 'left', field: 'name', sortable: true },
  { name: 'description', label: 'Описание', field: 'description', align: 'left', sortable: false },
  { name: 'actions', label: 'Действия', field: 'id', align: 'right' },
];

// Функция для управления выбором строк в мобильной версии
function toggleRowSelection(type: ProductTypeFile, selected: boolean) {
  if (selected) {
    if (!selectedRows.value.some((row: ProductTypeFile) => row.id === type.id)) {
      selectedRows.value.push(type);
    }
  } else {
    selectedRows.value = selectedRows.value.filter((row: ProductTypeFile) => row.id !== type.id);
  }
}

async function onRequest(props: { pagination: QTableProps['pagination'] }) {
  if (props.pagination) {
    await productTypesStore.handleTableRequest(props);
  }
}

async function onSearchInput(value: string | number | null) {
  const searchValue = value ? String(value).trim() : '';
  if (searchValue.length >= 2) {
    await productTypesStore.filterProductTypes({ name: searchValue });
  } else if (searchValue.length === 0) {
    await productTypesStore.clearFilters();
  }
}

async function clearSearch() {
  searchQuery.value = '';
  await productTypesStore.clearFilters();
}

async function openProductTypeDetailFromButton(row: ProductTypeFile) {
  const fullTypeData = await productTypesStore.fetchProductTypeById(row.id);
  if (fullTypeData) {
    selectedProductTypeDetail.value = fullTypeData;
    productTypeDetailDialogVisible.value = true;
  }
}

function openCreateProductTypeDialog() {
  isEditing.value = false;
  currentProductType.value = {
    name: '',
    description: '',
  };
  productTypeDialogVisible.value = true;
}

async function openEditProductTypeDialog(type: ProductTypeFile) {
  isEditing.value = true;
  const fullTypeData = await productTypesStore.fetchProductTypeById(type.id);
  if (fullTypeData) {
    currentProductType.value = {
      id: fullTypeData.id,
      name: fullTypeData.name,
      description: fullTypeData.description || '',
    };
  } else {
    currentProductType.value = {
      id: type.id,
      name: type.name,
      description: type.description || '',
    };
  }
  productTypeDialogVisible.value = true;
}

async function saveProductType() {
  if (!currentProductType.value.name) {
    $q.notify({ type: 'negative', message: 'Название типа товара обязательно.' });
    return;
  }

  const payload: ProductTypeCreatePayload | ProductTypeUpdatePayload = {
    name: currentProductType.value.name,
    description: currentProductType.value.description || '',
  };

  let success = false;
  if (isEditing.value && currentProductType.value.id) {
    const updatedType = await productTypesStore.updateProductType(
      currentProductType.value.id,
      payload as ProductTypeUpdatePayload,
    );
    if (updatedType) success = true;
  } else {
    const newType = await productTypesStore.createProductType(payload as ProductTypeCreatePayload);
    if (newType) success = true;
  }

  if (success) {
    productTypeDialogVisible.value = false;
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
    const success = await productTypesStore.bulkDeleteProductTypes(
      selectedRows.value.map((row: ProductTypeFile) => row.id),
    );
    if (success) {
      selectedRows.value = [];
    }
  } finally {
    bulkOperationLoading.value = false;
  }
}

function confirmDeleteProductType(type: ProductTypeFile) {
  Dialog.create({
    title: 'Подтвердите удаление',
    message: `Вы уверены, что хотите удалить тип товара "${type.name}"?`,
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
    productTypesStore.deleteProductType(type.id).catch((error: unknown) => {
      $q.notify({
        type: 'negative',
        message: 'Ошибка при удалении типа товара',
      });
      console.error('Delete product type error:', error);
    });
  });
}

async function openProductTypeDetailDialog(evt: Event, row: ProductTypeFile) {
  const target = evt.target as HTMLElement;
  if (target.closest('.q-btn') || target.closest('button')) {
    return;
  }

  const fullTypeData = await productTypesStore.fetchProductTypeById(row.id);
  if (fullTypeData) {
    selectedProductTypeDetail.value = fullTypeData;
    productTypeDetailDialogVisible.value = true;
  }
}

async function editFromDetail() {
  if (selectedProductTypeDetail.value) {
    productTypeDetailDialogVisible.value = false;
    await openEditProductTypeDialog(selectedProductTypeDetail.value);
  }
}

function deleteFromDetail() {
  if (selectedProductTypeDetail.value) {
    productTypeDetailDialogVisible.value = false;
    confirmDeleteProductType(selectedProductTypeDetail.value);
  }
}

function formatDate(dateString: string): string {
  return date.formatDate(dateString, 'DD.MM.YYYY HH:mm');
}

onMounted(async () => {
  await productTypesStore.fetchProductTypes();
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

.product-types-table {
  .q-table th,
  .q-table td {
    &:last-child {
      text-align: right;
    }
  }
}

.product-type-card {
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
