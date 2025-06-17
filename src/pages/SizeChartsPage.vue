<template>
  <q-page padding>
    <!-- Адаптивный заголовок -->
    <div class="q-mb-md">
      <!-- Основной заголовок и кнопка добавления -->
      <div class="row justify-between items-center">
        <div class="text-h5">Управление размерными сетками</div>
        <q-btn
          color="primary"
          icon="add"
          @click="openCreateSizeChartDialog"
          :label="$q.screen.gt.xs ? 'Добавить сетку' : ''"
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
        placeholder="Поиск по названию размерной сетки..."
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
    <div v-if="sizeChartsStore.loading" class="flex flex-center q-pa-md">
      <q-spinner color="primary" size="3em" />
    </div>

    <!-- Десктопная таблица -->
    <div v-if="!sizeChartsStore.loading && $q.screen.gt.xs" class="desktop-view">
      <q-table
        title="Размерные сетки"
        :rows="sizeChartsStore.sizeCharts"
        :columns="columns"
        row-key="id"
        :loading="sizeChartsStore.loading"
        v-model:pagination="sizeChartsStore.qTablePagination"
        v-model:selected="selectedRows"
        selection="multiple"
        @request="onRequest"
        @row-click="openSizeChartDetailDialog"
        binary-state-sort
        :rows-per-page-options="[5, 10, 20, 30, 50]"
        class="cursor-pointer size-charts-table"
      >
        <template v-slot:body-cell-description="props">
          <q-td :props="props">
            <div class="text-truncate" style="max-width: 200px">
              {{ props.row.description || '-' }}
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-product_type="props">
          <q-td :props="props">
            <q-chip color="primary" text-color="white" size="sm" icon="category">
              {{ props.row.product_type.name }}
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
                @click.stop="openSizeChartDetailFromButton(props.row)"
              >
                <q-tooltip>Просмотр</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="edit" @click.stop="openEditSizeChartDialog(props.row)">
                <q-tooltip>Редактировать</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click.stop="confirmDeleteSizeChart(props.row)"
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
    <div v-if="!sizeChartsStore.loading && $q.screen.xs" class="mobile-view">
      <!-- Информация о количестве и пагинации -->
      <div class="row items-center justify-between q-mb-md">
        <div class="text-caption text-grey-7">Всего: {{ sizeChartsStore.totalCount }}</div>
        <div class="row q-gutter-xs">
          <q-btn
            flat
            dense
            icon="chevron_left"
            @click="sizeChartsStore.goToPreviousPage"
            :disable="!sizeChartsStore.hasPrevious"
          />
          <span class="text-caption q-px-sm">
            {{ sizeChartsStore.currentPage }} / {{ sizeChartsStore.totalPages }}
          </span>
          <q-btn
            flat
            dense
            icon="chevron_right"
            @click="sizeChartsStore.goToNextPage"
            :disable="!sizeChartsStore.hasNext"
          />
        </div>
      </div>

      <!-- Список карточек -->
      <div class="q-gutter-sm">
        <q-expansion-item
          v-for="chart in sizeChartsStore.sizeCharts"
          :key="chart.id"
          class="size-chart-card"
          :header-class="
            selectedRows.some((row: SizeChartFile) => row.id === chart.id) ? 'bg-blue-1' : ''
          "
        >
          <template v-slot:header>
            <div class="row items-center full-width no-wrap">
              <!-- Чекбокс для выбора -->
              <q-checkbox
                :model-value="selectedRows.some((row: SizeChartFile) => row.id === chart.id)"
                @update:model-value="(val) => toggleRowSelection(chart, val)"
                class="q-mr-sm"
                @click.stop
              />

              <!-- Иконка размерной сетки -->
              <q-avatar size="40px" class="q-mr-md bg-primary text-white">
                <q-icon name="grid_on" />
              </q-avatar>

              <!-- Основная информация -->
              <div class="col-grow q-mr-md">
                <div class="text-weight-medium">{{ chart.name }}</div>
                <div class="text-caption text-grey-6">
                  {{ chart.product_type.name }}
                </div>
              </div>

              <!-- Стрелка аккордеона будет справа автоматически -->
            </div>
          </template>

          <!-- Детальная информация и действия -->
          <q-card flat>
            <q-card-section class="q-pt-none">
              <div class="text-body2 q-mb-md" v-if="chart.description">
                <strong>Описание:</strong><br />
                {{ chart.description }}
              </div>

              <div class="text-body2 q-mb-md">
                <strong>Тип товара:</strong><br />
                <q-chip color="primary" text-color="white" size="sm" icon="category">
                  {{ chart.product_type.name }}
                </q-chip>
              </div>

              <!-- Действия в мобильной версии -->
              <div class="column q-gutter-sm">
                <q-btn
                  unelevated
                  color="primary"
                  icon="visibility"
                  label="Просмотреть детали"
                  @click="openSizeChartDetailFromButton(chart)"
                  class="full-width"
                />
                <div class="row q-gutter-sm">
                  <q-btn
                    outline
                    color="warning"
                    icon="edit"
                    label="Изменить"
                    @click="openEditSizeChartDialog(chart)"
                    class="col"
                  />
                  <q-btn
                    outline
                    color="negative"
                    icon="delete"
                    label="Удалить"
                    @click="confirmDeleteSizeChart(chart)"
                    class="col"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </div>

      <!-- Пустое состояние для мобильных -->
      <div v-if="sizeChartsStore.sizeCharts.length === 0" class="text-center q-pa-lg">
        <q-icon name="grid_on" size="4em" color="grey-4" />
        <div class="text-grey-6 q-mt-sm">Размерные сетки не найдены</div>
      </div>
    </div>

    <!-- Диалог создания/редактирования размерной сетки -->
    <q-dialog v-model="sizeChartDialogVisible" persistent :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 500px'">
        <q-card-section>
          <div class="text-h6">
            {{ isEditing ? 'Редактировать размерную сетку' : 'Добавить размерную сетку' }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="currentSizeChart.name"
            label="Название *"
            autofocus
            :rules="[(val) => !!val || 'Название обязательно']"
            lazy-rules
            class="q-mb-md"
          />

          <q-select
            v-model="currentSizeChart.product_type"
            :options="productTypeOptions"
            option-label="name"
            option-value="id"
            label="Тип товара *"
            emit-value
            map-options
            use-input
            fill-input
            hide-selected
            input-debounce="300"
            :loading="productTypesLoading"
            @filter="filterProductTypes"
            :rules="[(val) => !!val || 'Тип товара обязателен']"
            lazy-rules
            class="q-mb-md"
          >
            <template v-slot:prepend>
              <q-icon name="category" />
            </template>

            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey"> Типы товаров не найдены </q-item-section>
              </q-item>
            </template>

            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar>
                  <q-icon name="category" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ scope.opt.name }}</q-item-label>
                  <q-item-label caption v-if="scope.opt.description">
                    {{ scope.opt.description }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <q-input
            v-model="currentSizeChart.description"
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
            @click="saveSizeChart"
            :loading="sizeChartsStore.loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Диалог детальной информации о размерной сетке -->
    <q-dialog v-model="sizeChartDetailDialogVisible" :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 500px; max-width: 600px'">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Детали размерной сетки</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedSizeChartDetail">
          <!-- Информация о размерной сетке -->
          <q-list>
            <q-item>
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white">
                  <q-icon name="grid_on" />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">Название</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedSizeChartDetail.name }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-medium">Тип товара</q-item-label>
                <q-item-label caption>
                  <q-chip color="primary" text-color="white" size="sm" icon="category">
                    {{ selectedSizeChartDetail.product_type.name }}
                  </q-chip>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedSizeChartDetail.description">
              <q-item-section>
                <q-item-label class="text-weight-medium">Описание</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedSizeChartDetail.description }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedSizeChartDetail.creator">
              <q-item-section>
                <q-item-label class="text-weight-medium">Создатель</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedSizeChartDetail.creator.email }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedSizeChartDetail.created">
              <q-item-section>
                <q-item-label class="text-weight-medium">Дата создания</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ formatDate(selectedSizeChartDetail.created) }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedSizeChartDetail.updated">
              <q-item-section>
                <q-item-label class="text-weight-medium">Дата обновления</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ formatDate(selectedSizeChartDetail.updated) }}
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
  useSizeChartsStore,
  type SizeChartFile,
  type SizeChartDetail,
  type SizeChartCreatePayload,
  type SizeChartUpdatePayload,
} from 'stores/size-charts.store';
import { useProductTypesStore, type ProductTypeFile } from 'stores/product-types.store';
import { useQuasar, date, Dialog } from 'quasar';
import type { QTableProps, QTableColumn } from 'quasar';

const $q = useQuasar();
const sizeChartsStore = useSizeChartsStore();
const productTypesStore = useProductTypesStore();

const sizeChartDialogVisible = ref(false);
const sizeChartDetailDialogVisible = ref(false);
const isEditing = ref(false);
const selectedSizeChartDetail = ref<SizeChartDetail | null>(null);
const searchQuery = ref('');
const selectedRows = ref<SizeChartFile[]>([]);
const bulkOperationLoading = ref(false);

// Product Types для autocomplete
const productTypeOptions = ref<ProductTypeFile[]>([]);
const productTypesLoading = ref(false);

interface SizeChartFormData {
  id?: string;
  name: string;
  description: string;
  product_type: string; // ID типа товара
}

const currentSizeChart = ref<SizeChartFormData>({
  name: '',
  description: '',
  product_type: '',
});

const columns: QTableColumn[] = [
  { name: 'name', required: true, label: 'Название', align: 'left', field: 'name', sortable: true },
  { name: 'description', label: 'Описание', field: 'description', align: 'left', sortable: false },
  {
    name: 'product_type',
    label: 'Тип товара',
    field: 'product_type',
    align: 'left',
    sortable: false,
  },
  { name: 'actions', label: 'Действия', field: 'id', align: 'right' },
];

// Функция для загрузки типов товаров
async function loadProductTypes(search = '') {
  productTypesLoading.value = true;
  try {
    if (search) {
      await productTypesStore.filterProductTypes({ name: search });
    } else {
      await productTypesStore.fetchProductTypes();
    }
    productTypeOptions.value = productTypesStore.productTypes;
  } catch (error) {
    console.error('Error loading product types:', error);
  } finally {
    productTypesLoading.value = false;
  }
}

// Фильтрация типов товаров для autocomplete
function filterProductTypes(val: string, update: (fn: () => void) => void) {
  update(() => {
    if (val === '') {
      void loadProductTypes();
    } else {
      void loadProductTypes(val);
    }
  });
}

// Функция для управления выбором строк в мобильной версии
function toggleRowSelection(chart: SizeChartFile, selected: boolean) {
  if (selected) {
    if (!selectedRows.value.some((row: SizeChartFile) => row.id === chart.id)) {
      selectedRows.value.push(chart);
    }
  } else {
    selectedRows.value = selectedRows.value.filter((row: SizeChartFile) => row.id !== chart.id);
  }
}

async function onRequest(props: { pagination: QTableProps['pagination'] }) {
  if (props.pagination) {
    await sizeChartsStore.handleTableRequest(props);
  }
}

async function onSearchInput(value: string | number | null) {
  const searchValue = value ? String(value).trim() : '';
  if (searchValue.length >= 2) {
    await sizeChartsStore.filterSizeCharts({ name: searchValue });
  } else if (searchValue.length === 0) {
    await sizeChartsStore.clearFilters();
  }
}

async function clearSearch() {
  searchQuery.value = '';
  await sizeChartsStore.clearFilters();
}

async function openSizeChartDetailFromButton(row: SizeChartFile) {
  const fullChartData = await sizeChartsStore.fetchSizeChartById(row.id);
  if (fullChartData) {
    selectedSizeChartDetail.value = fullChartData;
    sizeChartDetailDialogVisible.value = true;
  }
}

async function openCreateSizeChartDialog() {
  isEditing.value = false;
  currentSizeChart.value = {
    name: '',
    description: '',
    product_type: '',
  };
  await loadProductTypes(); // Загружаем типы товаров
  sizeChartDialogVisible.value = true;
}

async function openEditSizeChartDialog(chart: SizeChartFile) {
  isEditing.value = true;
  const fullChartData = await sizeChartsStore.fetchSizeChartById(chart.id);
  if (fullChartData) {
    currentSizeChart.value = {
      id: fullChartData.id,
      name: fullChartData.name,
      description: fullChartData.description || '',
      product_type: fullChartData.product_type.id,
    };
  } else {
    currentSizeChart.value = {
      id: chart.id,
      name: chart.name,
      description: chart.description || '',
      product_type: chart.product_type.id,
    };
  }
  await loadProductTypes(); // Загружаем типы товаров
  sizeChartDialogVisible.value = true;
}

async function saveSizeChart() {
  if (!currentSizeChart.value.name) {
    $q.notify({ type: 'negative', message: 'Название размерной сетки обязательно.' });
    return;
  }

  if (!currentSizeChart.value.product_type) {
    $q.notify({ type: 'negative', message: 'Тип товара обязателен.' });
    return;
  }

  const payload: SizeChartCreatePayload | SizeChartUpdatePayload = {
    name: currentSizeChart.value.name,
    description: currentSizeChart.value.description || '',
    product_type: currentSizeChart.value.product_type,
  };

  let success = false;
  if (isEditing.value && currentSizeChart.value.id) {
    const updatedChart = await sizeChartsStore.updateSizeChart(
      currentSizeChart.value.id,
      payload as SizeChartUpdatePayload,
    );
    if (updatedChart) success = true;
  } else {
    const newChart = await sizeChartsStore.createSizeChart(payload as SizeChartCreatePayload);
    if (newChart) success = true;
  }

  if (success) {
    sizeChartDialogVisible.value = false;
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
    const success = await sizeChartsStore.bulkDeleteSizeCharts(
      selectedRows.value.map((row: SizeChartFile) => row.id),
    );
    if (success) {
      selectedRows.value = [];
    }
  } finally {
    bulkOperationLoading.value = false;
  }
}

function confirmDeleteSizeChart(chart: SizeChartFile) {
  Dialog.create({
    title: 'Подтвердите удаление',
    message: `Вы уверены, что хотите удалить размерную сетку "${chart.name}"?`,
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
    sizeChartsStore.deleteSizeChart(chart.id).catch((error: unknown) => {
      $q.notify({
        type: 'negative',
        message: 'Ошибка при удалении размерной сетки',
      });
      console.error('Delete size chart error:', error);
    });
  });
}

async function openSizeChartDetailDialog(evt: Event, row: SizeChartFile) {
  const target = evt.target as HTMLElement;
  if (target.closest('.q-btn') || target.closest('button')) {
    return;
  }

  const fullChartData = await sizeChartsStore.fetchSizeChartById(row.id);
  if (fullChartData) {
    selectedSizeChartDetail.value = fullChartData;
    sizeChartDetailDialogVisible.value = true;
  }
}

async function editFromDetail() {
  if (selectedSizeChartDetail.value) {
    sizeChartDetailDialogVisible.value = false;
    await openEditSizeChartDialog(selectedSizeChartDetail.value);
  }
}

function deleteFromDetail() {
  if (selectedSizeChartDetail.value) {
    sizeChartDetailDialogVisible.value = false;
    confirmDeleteSizeChart(selectedSizeChartDetail.value);
  }
}

function formatDate(dateString: string): string {
  return date.formatDate(dateString, 'DD.MM.YYYY HH:mm');
}

onMounted(async () => {
  await sizeChartsStore.fetchSizeCharts();
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

.size-charts-table {
  .q-table th,
  .q-table td {
    &:last-child {
      text-align: right;
    }
  }
}

.size-chart-card {
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
