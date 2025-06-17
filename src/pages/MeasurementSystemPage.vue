<template>
  <q-page padding>
    <!-- Адаптивный заголовок -->
    <div class="q-mb-md">
      <!-- Основной заголовок и кнопка добавления -->
      <div class="row justify-between items-center">
        <div class="text-h5">Управление системами измерений</div>
        <q-btn
          color="primary"
          icon="add"
          @click="openCreateMeasurementSystemDialog"
          :label="$q.screen.gt.xs ? 'Добавить систему' : ''"
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
                    icon="star"
                    @click="bulkSetBaseSystem"
                    :loading="bulkOperationLoading"
                    label="Сделать базовой"
                  />
                  <q-btn
                    :dense="$q.screen.xs"
                    :size="$q.screen.xs ? 'md' : 'md'"
                    flat
                    color="orange"
                    icon="star_outline"
                    @click="bulkUnsetBaseSystem"
                    :loading="bulkOperationLoading"
                    label="Убрать базовую"
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
        placeholder="Поиск по названию системы измерений..."
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
    <div v-if="measurementSystemsStore.loading" class="flex flex-center q-pa-md">
      <q-spinner color="primary" size="3em" />
    </div>

    <!-- Десктопная таблица -->
    <div v-if="!measurementSystemsStore.loading && $q.screen.gt.xs" class="desktop-view">
      <q-table
        title="Системы измерений"
        :rows="measurementSystemsStore.measurementSystems"
        :columns="columns"
        row-key="id"
        :loading="measurementSystemsStore.loading"
        v-model:pagination="measurementSystemsStore.qTablePagination"
        v-model:selected="selectedRows"
        selection="multiple"
        @request="onRequest"
        @row-click="openMeasurementSystemDetailDialog"
        binary-state-sort
        :rows-per-page-options="[5, 10, 20, 30, 50]"
        class="cursor-pointer measurement-systems-table"
      >
        <template v-slot:body-cell-is_base_system="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.is_base_system ? 'green' : 'grey'"
              :icon="props.row.is_base_system ? 'star' : 'star_outline'"
              text-color="white"
              dense
              size="md"
              clickable
              @click.stop="confirmToggleBaseSystemStatus(props.row)"
            >
              {{ props.row.is_base_system ? 'Эталонная система' : 'Базовая система' }}
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
                @click.stop="openMeasurementSystemDetailFromButton(props.row)"
              >
                <q-tooltip>Просмотр</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="edit"
                @click.stop="openEditMeasurementSystemDialog(props.row)"
              >
                <q-tooltip>Редактировать</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click.stop="confirmDeleteMeasurementSystem(props.row)"
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
    <div v-if="!measurementSystemsStore.loading && $q.screen.xs" class="mobile-view">
      <!-- Информация о количестве и пагинации -->
      <div class="row items-center justify-between q-mb-md">
        <div class="text-caption text-grey-7">Всего: {{ measurementSystemsStore.totalCount }}</div>
        <div class="row q-gutter-xs">
          <q-btn
            flat
            dense
            icon="chevron_left"
            @click="measurementSystemsStore.goToPreviousPage"
            :disable="!measurementSystemsStore.hasPrevious"
          />
          <span class="text-caption q-px-sm">
            {{ measurementSystemsStore.currentPage }} / {{ measurementSystemsStore.totalPages }}
          </span>
          <q-btn
            flat
            dense
            icon="chevron_right"
            @click="measurementSystemsStore.goToNextPage"
            :disable="!measurementSystemsStore.hasNext"
          />
        </div>
      </div>

      <!-- Список карточек -->
      <div class="q-gutter-sm">
        <q-expansion-item
          v-for="system in measurementSystemsStore.measurementSystems"
          :key="system.id"
          class="measurement-system-card"
          :header-class="
            selectedRows.some((row: MeasurementSystemFile) => row.id === system.id)
              ? 'bg-blue-1'
              : ''
          "
        >
          <template v-slot:header>
            <div class="row items-center full-width no-wrap">
              <!-- Чекбокс для выбора -->
              <q-checkbox
                :model-value="
                  selectedRows.some((row: MeasurementSystemFile) => row.id === system.id)
                "
                @update:model-value="(val) => toggleRowSelection(system, val)"
                class="q-mr-sm"
                @click.stop
              />

              <!-- Иконка системы измерений -->
              <q-avatar size="40px" class="q-mr-md bg-primary text-white">
                <q-icon :name="system.is_base_system ? 'star' : 'straighten'" />
              </q-avatar>

              <!-- Основная информация -->
              <div class="col-grow q-mr-md">
                <div class="text-weight-medium">{{ system.name }}</div>
                <div class="text-caption text-grey-6">
                  {{ system.is_base_system ? 'Базовая система' : 'Обычная система' }}
                </div>
              </div>

              <!-- Статус базовой системы -->
              <q-btn
                :color="system.is_base_system ? 'green' : 'grey'"
                text-color="white"
                dense
                size="sm"
                @click.stop="confirmToggleBaseSystemStatus(system)"
                class="q-mr-md"
                :icon="system.is_base_system ? 'star' : 'star_outline'"
              />

              <!-- Стрелка аккордеона будет справа автоматически -->
            </div>
          </template>

          <!-- Детальная информация и действия -->
          <q-card flat>
            <q-card-section class="q-pt-none">
              <!-- Действия в мобильной версии -->
              <div class="column q-gutter-sm">
                <q-btn
                  unelevated
                  color="primary"
                  icon="visibility"
                  label="Просмотреть детали"
                  @click="openMeasurementSystemDetailFromButton(system)"
                  class="full-width"
                />
                <div class="row q-gutter-sm">
                  <q-btn
                    outline
                    color="warning"
                    icon="edit"
                    label="Изменить"
                    @click="openEditMeasurementSystemDialog(system)"
                    class="col"
                  />
                  <q-btn
                    outline
                    color="negative"
                    icon="delete"
                    label="Удалить"
                    @click="confirmDeleteMeasurementSystem(system)"
                    class="col"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </div>

      <!-- Пустое состояние для мобильных -->
      <div
        v-if="measurementSystemsStore.measurementSystems.length === 0"
        class="text-center q-pa-lg"
      >
        <q-icon name="straighten" size="4em" color="grey-4" />
        <div class="text-grey-6 q-mt-sm">Системы измерений не найдены</div>
      </div>
    </div>

    <!-- Диалог создания/редактирования системы измерений -->
    <q-dialog v-model="measurementSystemDialogVisible" persistent :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 400px'">
        <q-card-section>
          <div class="text-h6">
            {{ isEditing ? 'Редактировать систему измерений' : 'Добавить систему измерений' }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="currentMeasurementSystem.name"
            label="Название *"
            autofocus
            :rules="[(val) => !!val || 'Название обязательно']"
            lazy-rules
          />
          <q-toggle
            v-model="currentMeasurementSystem.is_base_system"
            label="Базовая система"
            left-label
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Отмена" v-close-popup />
          <q-btn
            flat
            label="Сохранить"
            color="primary"
            @click="saveMeasurementSystem"
            :loading="measurementSystemsStore.loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Диалог детальной информации о системе измерений -->
    <q-dialog v-model="measurementSystemDetailDialogVisible" :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 500px; max-width: 600px'">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Детали системы измерений</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedMeasurementSystemDetail">
          <!-- Информация о системе измерений -->
          <q-list>
            <q-item>
              <q-item-section avatar>
                <q-avatar
                  :color="selectedMeasurementSystemDetail.is_base_system ? 'green' : 'primary'"
                  text-color="white"
                >
                  <q-icon
                    :name="selectedMeasurementSystemDetail.is_base_system ? 'star' : 'straighten'"
                  />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">Название</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedMeasurementSystemDetail.name }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-medium">Тип системы</q-item-label>
                <q-item-label caption>
                  <q-chip
                    :color="selectedMeasurementSystemDetail.is_base_system ? 'green' : 'grey'"
                    text-color="white"
                    size="sm"
                  >
                    {{
                      selectedMeasurementSystemDetail.is_base_system
                        ? 'Базовая система'
                        : 'Обычная система'
                    }}
                  </q-chip>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedMeasurementSystemDetail.site">
              <q-item-section>
                <q-item-label class="text-weight-medium">Сайт</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedMeasurementSystemDetail.site }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedMeasurementSystemDetail.creator">
              <q-item-section>
                <q-item-label class="text-weight-medium">Создатель</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedMeasurementSystemDetail.creator.email }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedMeasurementSystemDetail.created">
              <q-item-section>
                <q-item-label class="text-weight-medium">Дата создания</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ formatDate(selectedMeasurementSystemDetail.created) }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedMeasurementSystemDetail.updated">
              <q-item-section>
                <q-item-label class="text-weight-medium">Дата обновления</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ formatDate(selectedMeasurementSystemDetail.updated) }}
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
  useMeasurementSystemsStore,
  type MeasurementSystemFile,
  type MeasurementSystemDetail,
  type MeasurementSystemCreatePayload,
  type MeasurementSystemUpdatePayload,
} from 'stores/measurement-systems.store';
import { useQuasar, date, Dialog } from 'quasar';
import type { QTableProps, QTableColumn } from 'quasar';

const $q = useQuasar();
const measurementSystemsStore = useMeasurementSystemsStore();

const measurementSystemDialogVisible = ref(false);
const measurementSystemDetailDialogVisible = ref(false);
const isEditing = ref(false);
const selectedMeasurementSystemDetail = ref<MeasurementSystemDetail | null>(null);
const searchQuery = ref('');
const selectedRows = ref<MeasurementSystemFile[]>([]);
const bulkOperationLoading = ref(false);

interface MeasurementSystemFormData {
  id?: string;
  name: string;
  is_base_system: boolean;
}

const currentMeasurementSystem = ref<MeasurementSystemFormData>({
  name: '',
  is_base_system: false,
});

const columns: QTableColumn[] = [
  { name: 'name', required: true, label: 'Название', align: 'left', field: 'name', sortable: true },
  {
    name: 'is_base_system',
    label: 'Тип системы',
    field: 'is_base_system',
    align: 'center',
    sortable: true,
  },
  { name: 'actions', label: 'Действия', field: 'id', align: 'right' },
];

// Функция для управления выбором строк в мобильной версии
function toggleRowSelection(system: MeasurementSystemFile, selected: boolean) {
  if (selected) {
    if (!selectedRows.value.some((row: MeasurementSystemFile) => row.id === system.id)) {
      selectedRows.value.push(system);
    }
  } else {
    selectedRows.value = selectedRows.value.filter(
      (row: MeasurementSystemFile) => row.id !== system.id,
    );
  }
}

async function onRequest(props: { pagination: QTableProps['pagination'] }) {
  if (props.pagination) {
    await measurementSystemsStore.handleTableRequest(props);
  }
}

async function onSearchInput(value: string | number | null) {
  const searchValue = value ? String(value).trim() : '';
  if (searchValue.length >= 2) {
    await measurementSystemsStore.filterMeasurementSystems({ name: searchValue });
  } else if (searchValue.length === 0) {
    await measurementSystemsStore.clearFilters();
  }
}

async function clearSearch() {
  searchQuery.value = '';
  await measurementSystemsStore.clearFilters();
}

async function openMeasurementSystemDetailFromButton(row: MeasurementSystemFile) {
  const fullSystemData = await measurementSystemsStore.fetchMeasurementSystemById(row.id);
  if (fullSystemData) {
    selectedMeasurementSystemDetail.value = fullSystemData;
    measurementSystemDetailDialogVisible.value = true;
  }
}

function openCreateMeasurementSystemDialog() {
  isEditing.value = false;
  currentMeasurementSystem.value = {
    name: '',
    is_base_system: false,
  };
  measurementSystemDialogVisible.value = true;
}

async function openEditMeasurementSystemDialog(system: MeasurementSystemFile) {
  isEditing.value = true;
  const fullSystemData = await measurementSystemsStore.fetchMeasurementSystemById(system.id);
  if (fullSystemData) {
    currentMeasurementSystem.value = {
      id: fullSystemData.id,
      name: fullSystemData.name,
      is_base_system: fullSystemData.is_base_system,
    };
  } else {
    currentMeasurementSystem.value = {
      id: system.id,
      name: system.name,
      is_base_system: system.is_base_system,
    };
  }
  measurementSystemDialogVisible.value = true;
}

async function saveMeasurementSystem() {
  if (!currentMeasurementSystem.value.name) {
    $q.notify({ type: 'negative', message: 'Название системы измерений обязательно.' });
    return;
  }

  const isBaseSystem =
    typeof currentMeasurementSystem.value.is_base_system === 'boolean'
      ? currentMeasurementSystem.value.is_base_system
      : false;

  const payload: MeasurementSystemCreatePayload | MeasurementSystemUpdatePayload = {
    name: currentMeasurementSystem.value.name,
    is_base_system: isBaseSystem,
  };

  let success = false;
  if (isEditing.value && currentMeasurementSystem.value.id) {
    const updatedSystem = await measurementSystemsStore.updateMeasurementSystem(
      currentMeasurementSystem.value.id,
      payload as MeasurementSystemUpdatePayload,
    );
    if (updatedSystem) success = true;
  } else {
    const newSystem = await measurementSystemsStore.createMeasurementSystem(
      payload as MeasurementSystemCreatePayload,
    );
    if (newSystem) success = true;
  }

  if (success) {
    measurementSystemDialogVisible.value = false;
  }
}

async function toggleBaseSystemStatus(system: MeasurementSystemFile) {
  await measurementSystemsStore.patchMeasurementSystemStatus(system.id, !system.is_base_system);
}

// Функция подтверждения для мобильной версии
function confirmToggleBaseSystemStatus(system: MeasurementSystemFile) {
  if ($q.screen.xs) {
    const newStatus = !system.is_base_system;
    const action = newStatus ? 'сделать базовой' : 'убрать из базовых';

    Dialog.create({
      title: 'Подтвердите действие',
      message: `Вы уверены, что хотите ${action} систему "${system.name}"?`,
      persistent: true,
      ok: {
        label: newStatus ? 'Сделать базовой' : 'Убрать из базовых',
        color: newStatus ? 'green' : 'orange',
      },
      cancel: {
        label: 'Отмена',
        flat: true,
      },
    }).onOk(() => {
      void toggleBaseSystemStatus(system);
    });
  } else {
    // На десктопе сразу меняем статус без подтверждения
    void toggleBaseSystemStatus(system);
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
    const success = await measurementSystemsStore.bulkDeleteMeasurementSystems(
      selectedRows.value.map((row) => row.id),
    );
    if (success) {
      selectedRows.value = [];
    }
  } finally {
    bulkOperationLoading.value = false;
  }
}

async function bulkSetBaseSystem() {
  bulkOperationLoading.value = true;
  try {
    const success = await measurementSystemsStore.bulkUpdateMeasurementSystemStatus(
      selectedRows.value.map((row: MeasurementSystemFile) => row.id),
      true,
    );
    if (success) {
      selectedRows.value = [];
    }
  } finally {
    bulkOperationLoading.value = false;
  }
}

async function bulkUnsetBaseSystem() {
  bulkOperationLoading.value = true;
  try {
    const success = await measurementSystemsStore.bulkUpdateMeasurementSystemStatus(
      selectedRows.value.map((row: MeasurementSystemFile) => row.id),
      false,
    );
    if (success) {
      selectedRows.value = [];
    }
  } finally {
    bulkOperationLoading.value = false;
  }
}

function confirmDeleteMeasurementSystem(system: MeasurementSystemFile) {
  Dialog.create({
    title: 'Подтвердите удаление',
    message: `Вы уверены, что хотите удалить систему "${system.name}"?`,
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
    measurementSystemsStore.deleteMeasurementSystem(system.id).catch((error: unknown) => {
      $q.notify({
        type: 'negative',
        message: 'Ошибка при удалении системы измерений',
      });
      console.error('Delete measurement system error:', error);
    });
  });
}

async function openMeasurementSystemDetailDialog(evt: Event, row: MeasurementSystemFile) {
  const target = evt.target as HTMLElement;
  if (target.closest('.q-btn') || target.closest('button')) {
    return;
  }

  const fullSystemData = await measurementSystemsStore.fetchMeasurementSystemById(row.id);
  if (fullSystemData) {
    selectedMeasurementSystemDetail.value = fullSystemData;
    measurementSystemDetailDialogVisible.value = true;
  }
}

async function editFromDetail() {
  if (selectedMeasurementSystemDetail.value) {
    measurementSystemDetailDialogVisible.value = false;
    await openEditMeasurementSystemDialog(selectedMeasurementSystemDetail.value);
  }
}

function deleteFromDetail() {
  if (selectedMeasurementSystemDetail.value) {
    measurementSystemDetailDialogVisible.value = false;
    confirmDeleteMeasurementSystem(selectedMeasurementSystemDetail.value);
  }
}

function formatDate(dateString: string): string {
  return date.formatDate(dateString, 'DD.MM.YYYY HH:mm');
}

onMounted(async () => {
  await measurementSystemsStore.fetchMeasurementSystems();
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

.measurement-systems-table {
  .q-table th,
  .q-table td {
    &:last-child {
      text-align: right;
    }
  }
}

.measurement-system-card {
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
