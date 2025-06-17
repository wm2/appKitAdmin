<template>
  <q-page padding>
    <!-- Адаптивный заголовок -->
    <div class="q-mb-md">
      <!-- Основной заголовок и кнопка добавления -->
      <div class="row justify-between items-center">
        <div class="text-h5">Управление размерами</div>
        <q-btn
          color="primary"
          icon="add"
          @click="openCreateSizeDialog"
          :label="$q.screen.gt.xs ? 'Добавить размер' : ''"
          :round="$q.screen.xs"
          :disable="!selectedSizeChartId"
        />
      </div>

      <!-- Информация о выбранной размерной сетке -->
      <div v-if="selectedSizeChartInfo" class="q-mt-sm">
        <q-chip color="primary" text-color="white" icon="grid_on" size="md">
          {{ selectedSizeChartInfo.name }}
        </q-chip>
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

    <!-- Выбор размерной сетки -->
    <div class="q-mb-md">
      <q-select
        v-model="selectedSizeChartId"
        :options="sizeChartOptions"
        option-label="name"
        option-value="id"
        label="Размерная сетка *"
        emit-value
        map-options
        use-input
        fill-input
        hide-selected
        input-debounce="300"
        :loading="sizeChartsLoading"
        @filter="filterSizeCharts"
        @update:model-value="onSizeChartChange"
        class="q-mb-md"
      >
        <template v-slot:prepend>
          <q-icon name="grid_on" />
        </template>

        <template v-slot:no-option>
          <q-item>
            <q-item-section class="text-grey"> Размерные сетки не найдены </q-item-section>
          </q-item>
        </template>

        <template v-slot:option="scope">
          <q-item v-bind="scope.itemProps">
            <q-item-section avatar>
              <q-icon name="grid_on" color="primary" />
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
    </div>

    <!-- Поле поиска -->
    <div class="q-mb-md" v-if="selectedSizeChartId">
      <q-input
        v-model="searchQuery"
        placeholder="Поиск по значению размера..."
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

    <!-- Уведомление о необходимости выбора размерной сетки -->
    <div v-if="!selectedSizeChartId" class="text-center q-pa-lg">
      <q-icon name="grid_on" size="4em" color="grey-4" />
      <div class="text-grey-6 q-mt-sm">Выберите размерную сетку для просмотра размеров</div>
    </div>

    <!-- Счетчик и загрузка -->
    <div v-if="sizesStore.loading && selectedSizeChartId" class="flex flex-center q-pa-md">
      <q-spinner color="primary" size="3em" />
    </div>

    <!-- Десктопная таблица -->
    <div v-if="!sizesStore.loading && selectedSizeChartId && $q.screen.gt.xs" class="desktop-view">
      <q-table
        title="Размеры"
        :rows="sizesStore.sizes"
        :columns="columns"
        row-key="id"
        :loading="sizesStore.loading"
        v-model:pagination="sizesStore.qTablePagination"
        v-model:selected="selectedRows"
        selection="multiple"
        @request="onRequest"
        @row-click="openSizeDetailDialog"
        binary-state-sort
        :rows-per-page-options="[5, 10, 20, 30, 50]"
        class="cursor-pointer sizes-table"
      >
        <template v-slot:body-cell-measurement_system="props">
          <q-td :props="props">
            <q-chip color="teal" text-color="white" size="sm" icon="straighten">
              {{ props.row.measurement_system }}
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
                @click.stop="openSizeDetailFromButton(props.row)"
              >
                <q-tooltip>Просмотр</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="edit" @click.stop="openEditSizeDialog(props.row)">
                <q-tooltip>Редактировать</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click.stop="confirmDeleteSize(props.row)"
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
    <div v-if="!sizesStore.loading && selectedSizeChartId && $q.screen.xs" class="mobile-view">
      <!-- Информация о количестве и пагинации -->
      <div class="row items-center justify-between q-mb-md">
        <div class="text-caption text-grey-7">Всего: {{ sizesStore.totalCount }}</div>
        <div class="row q-gutter-xs">
          <q-btn
            flat
            dense
            icon="chevron_left"
            @click="sizesStore.goToPreviousPage"
            :disable="!sizesStore.hasPrevious"
          />
          <span class="text-caption q-px-sm">
            {{ sizesStore.currentPage }} / {{ sizesStore.totalPages }}
          </span>
          <q-btn
            flat
            dense
            icon="chevron_right"
            @click="sizesStore.goToNextPage"
            :disable="!sizesStore.hasNext"
          />
        </div>
      </div>

      <!-- Список карточек -->
      <div class="q-gutter-sm">
        <q-expansion-item
          v-for="size in sizesStore.sizes"
          :key="size.id"
          class="size-card"
          :header-class="
            selectedRows.some((row: SizeFile) => row.id === size.id) ? 'bg-blue-1' : ''
          "
        >
          <template v-slot:header>
            <div class="row items-center full-width no-wrap">
              <!-- Чекбокс для выбора -->
              <q-checkbox
                :model-value="selectedRows.some((row: SizeFile) => row.id === size.id)"
                @update:model-value="(val) => toggleRowSelection(size, val)"
                class="q-mr-sm"
                @click.stop
              />

              <!-- Иконка размера -->
              <q-avatar size="40px" class="q-mr-md bg-teal text-white">
                <q-icon name="photo_size_select_small" />
              </q-avatar>

              <!-- Основная информация -->
              <div class="col-grow q-mr-md">
                <div class="text-weight-medium text-h6">{{ size.value }}</div>
                <div class="text-caption text-grey-6">
                  {{ size.measurement_system }} • Эталон: {{ size.base_value }}
                </div>
              </div>

              <!-- Стрелка аккордеона будет справа автоматически -->
            </div>
          </template>

          <!-- Детальная информация и действия -->
          <q-card flat>
            <q-card-section class="q-pt-none">
              <div class="text-body2 q-mb-md">
                <strong>Эталонное значение:</strong><br />
                <span class="text-h6 text-primary">{{ size.base_value }}</span>
              </div>

              <div class="text-body2 q-mb-md">
                <strong>Система измерений:</strong><br />
                <q-chip color="teal" text-color="white" size="sm" icon="straighten">
                  {{ size.measurement_system }}
                </q-chip>
              </div>

              <!-- Действия в мобильной версии -->
              <div class="column q-gutter-sm">
                <q-btn
                  unelevated
                  color="primary"
                  icon="visibility"
                  label="Просмотреть детали"
                  @click="openSizeDetailFromButton(size)"
                  class="full-width"
                />
                <div class="row q-gutter-sm">
                  <q-btn
                    outline
                    color="warning"
                    icon="edit"
                    label="Изменить"
                    @click="openEditSizeDialog(size)"
                    class="col"
                  />
                  <q-btn
                    outline
                    color="negative"
                    icon="delete"
                    label="Удалить"
                    @click="confirmDeleteSize(size)"
                    class="col"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </div>

      <!-- Пустое состояние для мобильных -->
      <div v-if="sizesStore.sizes.length === 0" class="text-center q-pa-lg">
        <q-icon name="photo_size_select_small" size="4em" color="grey-4" />
        <div class="text-grey-6 q-mt-sm">Размеры не найдены</div>
      </div>
    </div>

    <!-- Диалог создания/редактирования размера -->
    <q-dialog v-model="sizeDialogVisible" persistent :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 500px'">
        <q-card-section>
          <div class="text-h6">
            {{ isEditing ? 'Редактировать размер' : 'Добавить размер' }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="currentSize.value"
            label="Значение размера *"
            autofocus
            :rules="[(val) => !!val || 'Значение размера обязательно']"
            lazy-rules
            class="q-mb-md"
          />

          <q-input
            v-model="currentSize.base_value"
            label="Эталонное значение *"
            type="number"
            step="0.01"
            :rules="[
              (val) => !!val || 'Эталонное значение обязательно',
              (val) => !isNaN(parseFloat(val)) || 'Должно быть числом',
            ]"
            lazy-rules
            class="q-mb-md"
            hint="Значение в эталонной системе (например, в сантиметрах)"
          />

          <q-select
            v-model="currentSize.measurement_system"
            :options="measurementSystemOptions"
            option-label="name"
            option-value="id"
            label="Система измерений *"
            emit-value
            map-options
            use-input
            fill-input
            hide-selected
            input-debounce="300"
            :loading="measurementSystemsLoading"
            @filter="filterMeasurementSystems"
            :rules="[(val) => !!val || 'Система измерений обязательна']"
            lazy-rules
            class="q-mb-md"
          >
            <template v-slot:prepend>
              <q-icon name="straighten" />
            </template>

            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey"> Системы измерений не найдены </q-item-section>
              </q-item>
            </template>

            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar>
                  <q-icon name="straighten" color="teal" />
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
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Отмена" v-close-popup />
          <q-btn
            flat
            label="Сохранить"
            color="primary"
            @click="saveSize"
            :loading="sizesStore.loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Диалог детальной информации о размере -->
    <q-dialog v-model="sizeDetailDialogVisible" :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 500px; max-width: 600px'">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Детали размера</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedSizeDetail">
          <!-- Информация о размере -->
          <q-list>
            <q-item>
              <q-item-section avatar>
                <q-avatar color="teal" text-color="white">
                  <q-icon name="photo_size_select_small" />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">Значение</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedSizeDetail.value }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-medium">Эталонное значение</q-item-label>
                <q-item-label caption class="text-body1 text-primary">
                  {{ selectedSizeDetail.base_value }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-medium">Система измерений</q-item-label>
                <q-item-label caption>
                  <q-chip color="teal" text-color="white" size="sm" icon="straighten">
                    {{ selectedSizeDetail.measurement_system }}
                  </q-chip>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedSizeDetail.creator">
              <q-item-section>
                <q-item-label class="text-weight-medium">Создатель</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedSizeDetail.creator.email }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedSizeDetail.created">
              <q-item-section>
                <q-item-label class="text-weight-medium">Дата создания</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ formatDate(selectedSizeDetail.created) }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedSizeDetail.updated">
              <q-item-section>
                <q-item-label class="text-weight-medium">Дата обновления</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ formatDate(selectedSizeDetail.updated) }}
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
import { ref, onMounted, computed, watch } from 'vue';
import {
  useSizesStore,
  type SizeFile,
  type SizeDetail,
  type SizeCreatePayload,
  type SizeUpdatePayload,
} from 'stores/sizes.store';
import { useSizeChartsStore, type SizeChartFile } from 'stores/size-charts.store';
import {
  useMeasurementSystemsStore,
  type MeasurementSystemFile,
} from 'stores/measurement-systems.store';
import { useQuasar, date, Dialog } from 'quasar';
import type { QTableProps, QTableColumn } from 'quasar';

const $q = useQuasar();
const sizesStore = useSizesStore();
const sizeChartsStore = useSizeChartsStore();
const measurementSystemsStore = useMeasurementSystemsStore();

const sizeDialogVisible = ref(false);
const sizeDetailDialogVisible = ref(false);
const isEditing = ref(false);
const selectedSizeDetail = ref<SizeDetail | null>(null);
const searchQuery = ref('');
const selectedRows = ref<SizeFile[]>([]);
const bulkOperationLoading = ref(false);
const selectedSizeChartId = ref<string>('');

// Options для автокомплитов
const sizeChartOptions = ref<SizeChartFile[]>([]);
const sizeChartsLoading = ref(false);
const measurementSystemOptions = ref<MeasurementSystemFile[]>([]);
const measurementSystemsLoading = ref(false);

interface SizeFormData {
  id?: string;
  value: string;
  measurement_system: string; // ID системы измерений
  base_value: string; // Значение в эталонной системе
}

const currentSize = ref<SizeFormData>({
  value: '',
  measurement_system: '',
  base_value: '',
});

// Вычисляемое свойство для информации о выбранной размерной сетке
const selectedSizeChartInfo = computed(() => {
  return sizeChartOptions.value.find((chart) => chart.id === selectedSizeChartId.value);
});

const columns: QTableColumn[] = [
  {
    name: 'value',
    required: true,
    label: 'Значение',
    align: 'left',
    field: 'value',
    sortable: true,
  },
  {
    name: 'base_value',
    label: 'Эталонное значение',
    field: 'base_value',
    align: 'left',
    sortable: true,
  },
  {
    name: 'measurement_system',
    label: 'Система измерений',
    field: 'measurement_system',
    align: 'left',
    sortable: false,
  },
  { name: 'actions', label: 'Действия', field: 'id', align: 'right' },
];

// Функция для загрузки размерных сеток
async function loadSizeCharts(search = '') {
  sizeChartsLoading.value = true;
  try {
    if (search) {
      await sizeChartsStore.filterSizeCharts({ name: search });
    } else {
      await sizeChartsStore.fetchSizeCharts();
    }
    sizeChartOptions.value = sizeChartsStore.sizeCharts;
  } catch (error) {
    console.error('Error loading size charts:', error);
  } finally {
    sizeChartsLoading.value = false;
  }
}

// Функция для загрузки систем измерений
async function loadMeasurementSystems(search = '') {
  measurementSystemsLoading.value = true;
  try {
    if (search) {
      await measurementSystemsStore.filterMeasurementSystems({ name: search });
    } else {
      await measurementSystemsStore.fetchMeasurementSystems();
    }
    measurementSystemOptions.value = measurementSystemsStore.measurementSystems;
  } catch (error) {
    console.error('Error loading measurement systems:', error);
  } finally {
    measurementSystemsLoading.value = false;
  }
}

// Фильтрация размерных сеток для автокомплита
function filterSizeCharts(val: string, update: (fn: () => void) => void) {
  update(() => {
    if (val === '') {
      void loadSizeCharts();
    } else {
      void loadSizeCharts(val);
    }
  });
}

// Фильтрация систем измерений для автокомплита
function filterMeasurementSystems(val: string, update: (fn: () => void) => void) {
  update(() => {
    if (val === '') {
      void loadMeasurementSystems();
    } else {
      void loadMeasurementSystems(val);
    }
  });
}

// Обработка изменения размерной сетки
async function onSizeChartChange(sizeChartId: string) {
  if (sizeChartId) {
    sizesStore.setSizeChartId(sizeChartId);
    selectedRows.value = [];
    await sizesStore.fetchSizes();
  } else {
    sizesStore.clearState();
  }
}

// Функция для управления выбором строк в мобильной версии
function toggleRowSelection(size: SizeFile, selected: boolean) {
  if (selected) {
    if (!selectedRows.value.some((row: SizeFile) => row.id === size.id)) {
      selectedRows.value.push(size);
    }
  } else {
    selectedRows.value = selectedRows.value.filter((row: SizeFile) => row.id !== size.id);
  }
}

async function onRequest(props: { pagination: QTableProps['pagination'] }) {
  if (props.pagination) {
    await sizesStore.handleTableRequest(props);
  }
}

async function onSearchInput(value: string | number | null) {
  const searchValue = value ? String(value).trim() : '';
  if (searchValue.length >= 1) {
    await sizesStore.filterSizes({ value: searchValue });
  } else if (searchValue.length === 0) {
    await sizesStore.clearFilters();
  }
}

async function clearSearch() {
  searchQuery.value = '';
  await sizesStore.clearFilters();
}

async function openSizeDetailFromButton(row: SizeFile) {
  const fullSizeData = await sizesStore.fetchSizeById(row.id);
  if (fullSizeData) {
    selectedSizeDetail.value = fullSizeData;
    sizeDetailDialogVisible.value = true;
  }
}

async function openCreateSizeDialog() {
  isEditing.value = false;
  currentSize.value = {
    value: '',
    measurement_system: '',
    base_value: '',
  };
  await loadMeasurementSystems(); // Загружаем системы измерений
  sizeDialogVisible.value = true;
}

async function openEditSizeDialog(size: SizeFile) {
  isEditing.value = true;
  const fullSizeData = await sizesStore.fetchSizeById(size.id);
  if (fullSizeData) {
    currentSize.value = {
      id: fullSizeData.id,
      value: fullSizeData.value,
      measurement_system: fullSizeData.measurement_system,
      base_value: fullSizeData.base_value,
    };
  } else {
    currentSize.value = {
      id: size.id,
      value: size.value,
      measurement_system: size.measurement_system,
      base_value: size.base_value,
    };
  }
  await loadMeasurementSystems(); // Загружаем системы измерений
  sizeDialogVisible.value = true;
}

async function saveSize() {
  if (!currentSize.value.value) {
    $q.notify({ type: 'negative', message: 'Значение размера обязательно.' });
    return;
  }

  if (!currentSize.value.base_value) {
    $q.notify({ type: 'negative', message: 'Эталонное значение обязательно.' });
    return;
  }

  if (!currentSize.value.measurement_system) {
    $q.notify({ type: 'negative', message: 'Система измерений обязательна.' });
    return;
  }

  const payload: SizeCreatePayload | SizeUpdatePayload = {
    value: currentSize.value.value,
    measurement_system: currentSize.value.measurement_system,
    base_value: currentSize.value.base_value,
  };

  let success = false;
  if (isEditing.value && currentSize.value.id) {
    const updatedSize = await sizesStore.updateSize(
      currentSize.value.id,
      payload as SizeUpdatePayload,
    );
    if (updatedSize) success = true;
  } else {
    const newSize = await sizesStore.createSize(payload as SizeCreatePayload);
    if (newSize) success = true;
  }

  if (success) {
    sizeDialogVisible.value = false;
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
    const success = await sizesStore.bulkDeleteSizes(
      selectedRows.value.map((row: SizeFile) => row.id),
    );
    if (success) {
      selectedRows.value = [];
    }
  } finally {
    bulkOperationLoading.value = false;
  }
}

function confirmDeleteSize(size: SizeFile) {
  Dialog.create({
    title: 'Подтвердите удаление',
    message: `Вы уверены, что хотите удалить размер "${size.value}"?`,
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
    sizesStore.deleteSize(size.id).catch((error: unknown) => {
      $q.notify({
        type: 'negative',
        message: 'Ошибка при удалении размера',
      });
      console.error('Delete size error:', error);
    });
  });
}

async function openSizeDetailDialog(evt: Event, row: SizeFile) {
  const target = evt.target as HTMLElement;
  if (target.closest('.q-btn') || target.closest('button')) {
    return;
  }

  const fullSizeData = await sizesStore.fetchSizeById(row.id);
  if (fullSizeData) {
    selectedSizeDetail.value = fullSizeData;
    sizeDetailDialogVisible.value = true;
  }
}

async function editFromDetail() {
  if (selectedSizeDetail.value) {
    sizeDetailDialogVisible.value = false;
    await openEditSizeDialog(selectedSizeDetail.value);
  }
}

function deleteFromDetail() {
  if (selectedSizeDetail.value) {
    sizeDetailDialogVisible.value = false;
    confirmDeleteSize(selectedSizeDetail.value);
  }
}

function formatDate(dateString: string): string {
  return date.formatDate(dateString, 'DD.MM.YYYY HH:mm');
}

onMounted(async () => {
  await loadSizeCharts();
});

// Очистка состояния при размонтировании компонента
watch(
  () => selectedSizeChartId.value,
  (newValue) => {
    if (!newValue) {
      sizesStore.clearState();
    }
  },
);
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

.sizes-table {
  .q-table th,
  .q-table td {
    &:last-child {
      text-align: right;
    }
  }
}

.size-card {
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
