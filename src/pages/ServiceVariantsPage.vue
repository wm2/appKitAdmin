<template>
  <q-page padding>
    <!-- Адаптивный заголовок -->
    <div class="q-mb-md">
      <!-- Основной заголовок и кнопка добавления -->
      <div class="row justify-between items-center">
        <div class="text-h5">
          <span>Управление вариантами товаров</span>
          <div v-if="currentServiceInfo" class="text-caption text-grey-6 q-mt-xs">
            Сервис: {{ currentServiceInfo.name }}
          </div>
        </div>
        <div class="row q-gutter-sm">
          <!-- Выбор сервиса -->
          <q-select
            v-model="selectedServiceId"
            :options="serviceOptions"
            option-value="id"
            option-label="name"
            label="Выбрать сервис"
            emit-value
            map-options
            outlined
            dense
            style="min-width: 200px"
            :loading="servicesLoading"
            @update:model-value="onServiceChange"
          >
            <template v-slot:prepend>
              <q-icon name="inventory" />
            </template>
          </q-select>
          <q-btn
            color="primary"
            icon="add"
            @click="openCreateVariantDialog"
            :label="$q.screen.gt.xs ? 'Добавить вариант' : ''"
            :round="$q.screen.xs"
            :disable="!serviceVariantsStore.hasServiceContext"
          />
        </div>
      </div>

      <!-- Информация о контексте -->
      <div v-if="!serviceVariantsStore.hasServiceContext" class="q-mt-sm">
        <q-banner class="bg-warning text-dark" rounded>
          <template v-slot:avatar>
            <q-icon name="warning" />
          </template>
          Выберите сервис для работы с вариантами.
        </q-banner>
      </div>

      <!-- Статистика -->
      <div v-if="serviceVariantsStore.hasServiceContext" class="q-mt-sm">
        <div class="row q-gutter-sm">
          <q-chip color="green" text-color="white" size="sm">
            Активных: {{ serviceVariantsStore.activeVariantsCount }}
          </q-chip>
          <q-chip color="red" text-color="white" size="sm">
            Неактивных: {{ serviceVariantsStore.inactiveVariantsCount }}
          </q-chip>
          <q-chip color="blue" text-color="white" size="sm">
            Всего: {{ serviceVariantsStore.totalCount }}
          </q-chip>
        </div>
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
                    icon="check_circle"
                    @click="bulkActivate"
                    :loading="bulkOperationLoading"
                    label="Активировать"
                  />
                  <q-btn
                    :dense="$q.screen.xs"
                    :size="$q.screen.xs ? 'md' : 'md'"
                    flat
                    color="orange"
                    icon="cancel"
                    @click="bulkDeactivate"
                    :loading="bulkOperationLoading"
                    label="Деактивировать"
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
    <div v-if="serviceVariantsStore.hasServiceContext" class="q-mb-md">
      <q-input
        v-model="searchQuery"
        placeholder="Поиск по SKU или цене..."
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
    <div v-if="serviceVariantsStore.loading" class="flex flex-center q-pa-md">
      <q-spinner color="primary" size="3em" />
    </div>

    <!-- Десктопная таблица -->
    <div
      v-if="!serviceVariantsStore.loading && $q.screen.gt.xs && hasValidContext"
      class="desktop-view"
    >
      <q-table
        title="Варианты товара"
        :rows="serviceVariantsStore.variants"
        :columns="columns"
        row-key="id"
        :loading="serviceVariantsStore.loading"
        v-model:pagination="serviceVariantsStore.qTablePagination"
        v-model:selected="selectedRows"
        selection="multiple"
        @request="onRequest"
        @row-click="openVariantDetailDialog"
        binary-state-sort
        :rows-per-page-options="[5, 10, 20, 30, 50]"
        class="cursor-pointer variants-table"
      >
        <template v-slot:body-cell-size="props">
          <q-td :props="props">
            <div class="column">
              <span class="text-weight-medium">{{ props.row.size.value }}</span>
              <span class="text-caption text-grey-6">{{ props.row.size.measurement_system }}</span>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-price="props">
          <q-td :props="props">
            <span v-if="props.row.price" class="text-weight-medium">
              {{ formatPrice(props.row.price) }}
            </span>
            <span v-else class="text-grey-6">-</span>
          </q-td>
        </template>

        <template v-slot:body-cell-is_active="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.is_active ? 'green' : 'red'"
              :icon="props.row.is_active ? 'check_circle' : 'cancel'"
              text-color="white"
              dense
              size="md"
              clickable
              @click.stop="confirmToggleActiveStatus(props.row)"
            >
              {{ props.row.is_active ? 'Активен' : 'Неактивен' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-attributes="props">
          <q-td :props="props">
            <div v-if="props.row.attributes && Object.keys(props.row.attributes).length > 0">
              <q-badge
                color="blue"
                :label="Object.keys(props.row.attributes).length"
                class="cursor-pointer"
                @click.stop="showAttributesDialog(props.row.attributes)"
              />
            </div>
            <span v-else class="text-grey-6">-</span>
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
                @click.stop="openVariantDetailFromButton(props.row)"
              >
                <q-tooltip>Просмотр</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="edit" @click.stop="openEditVariantDialog(props.row)">
                <q-tooltip>Редактировать</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click.stop="confirmDeleteVariant(props.row)"
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
    <div
      v-if="!serviceVariantsStore.loading && $q.screen.xs && hasValidContext"
      class="mobile-view"
    >
      <!-- Информация о количестве и пагинации -->
      <div class="row items-center justify-between q-mb-md">
        <div class="text-caption text-grey-7">Всего: {{ serviceVariantsStore.totalCount }}</div>
        <div class="row q-gutter-xs">
          <q-btn
            flat
            dense
            icon="chevron_left"
            @click="serviceVariantsStore.goToPreviousPage"
            :disable="!serviceVariantsStore.hasPrevious"
          />
          <span class="text-caption q-px-sm">
            {{ serviceVariantsStore.currentPage }} / {{ serviceVariantsStore.totalPages }}
          </span>
          <q-btn
            flat
            dense
            icon="chevron_right"
            @click="serviceVariantsStore.goToNextPage"
            :disable="!serviceVariantsStore.hasNext"
          />
        </div>
      </div>

      <!-- Список карточек -->
      <div class="q-gutter-sm">
        <q-expansion-item
          v-for="variant in serviceVariantsStore.variants"
          :key="variant.id"
          class="variant-card"
          :header-class="selectedRows.some((row) => row.id === variant.id) ? 'bg-blue-1' : ''"
        >
          <template v-slot:header>
            <div class="row items-center full-width no-wrap">
              <!-- Чекбокс для выбора -->
              <q-checkbox
                :model-value="selectedRows.some((row) => row.id === variant.id)"
                @update:model-value="(val) => toggleRowSelection(variant, val)"
                class="q-mr-sm"
                @click.stop
              />

              <!-- Размер -->
              <div class="q-mr-md">
                <div class="text-weight-medium">{{ variant.size.value }}</div>
                <div class="text-caption text-grey-6">{{ variant.size.measurement_system }}</div>
              </div>

              <!-- Основная информация -->
              <div class="col-grow q-mr-md">
                <div class="text-weight-medium">{{ variant.sku || 'Без SKU' }}</div>
                <div class="text-caption text-grey-6">
                  {{ variant.price ? formatPrice(variant.price) : 'Цена не указана' }}
                </div>
              </div>

              <!-- Статус активности -->
              <q-btn
                :color="variant.is_active ? 'green' : 'red'"
                text-color="white"
                dense
                size="sm"
                @click.stop="confirmToggleActiveStatus(variant)"
                class="q-mr-md"
                :icon="variant.is_active ? 'check_circle' : 'cancel'"
              />

              <!-- Стрелка аккордеона будет справа автоматически -->
            </div>
          </template>

          <!-- Детальная информация и действия -->
          <q-card flat>
            <q-card-section class="q-pt-none">
              <!-- Атрибуты -->
              <div
                v-if="variant.attributes && Object.keys(variant.attributes).length > 0"
                class="text-body2 q-mb-md"
              >
                <strong>Атрибуты:</strong><br />
                <q-chip
                  v-for="(value, key) in variant.attributes"
                  :key="key"
                  size="sm"
                  outline
                  :label="`${key}: ${value}`"
                  class="q-mr-xs q-mb-xs"
                />
              </div>

              <!-- Действия в мобильной версии -->
              <div class="column q-gutter-sm">
                <q-btn
                  unelevated
                  color="primary"
                  icon="visibility"
                  label="Просмотреть детали"
                  @click="openVariantDetailFromButton(variant)"
                  class="full-width"
                />
                <div class="row q-gutter-sm">
                  <q-btn
                    outline
                    color="warning"
                    icon="edit"
                    label="Изменить"
                    @click="openEditVariantDialog(variant)"
                    class="col"
                  />
                  <q-btn
                    outline
                    color="negative"
                    icon="delete"
                    label="Удалить"
                    @click="confirmDeleteVariant(variant)"
                    class="col"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </div>

      <!-- Пустое состояние для мобильных -->
      <div v-if="serviceVariantsStore.variants.length === 0" class="text-center q-pa-lg">
        <q-icon name="inventory_2" size="4em" color="grey-4" />
        <div class="text-grey-6 q-mt-sm">Варианты не найдены</div>
      </div>
    </div>

    <!-- Диалог создания/редактирования варианта -->
    <q-dialog v-model="variantDialogVisible" persistent :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 500px'">
        <q-card-section>
          <div class="text-h6">{{ isEditing ? 'Редактировать вариант' : 'Добавить вариант' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <!-- Размер -->
          <q-select
            v-model="currentVariant.size_id"
            :options="sizeOptions"
            option-value="id"
            option-label="displayName"
            label="Размер *"
            emit-value
            map-options
            :rules="[(val) => !!val || 'Размер обязателен']"
            lazy-rules
            :loading="sizesLoading"
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey"> Нет доступных размеров </q-item-section>
              </q-item>
            </template>
          </q-select>

          <!-- SKU -->
          <q-input
            v-model="currentVariant.sku"
            label="SKU (Артикул)"
            hint="Уникальный код товара"
          />

          <!-- Цена -->
          <q-input
            v-model="currentVariant.price"
            label="Цена"
            type="number"
            step="0.01"
            min="0"
            hint="Цена в валюте сайта"
          />

          <!-- Активность -->
          <q-toggle v-model="currentVariant.is_active" label="Активен" left-label />

          <!-- Атрибуты -->
          <div class="q-mt-md">
            <q-input
              v-model="attributesJsonString"
              label="Атрибуты (JSON)"
              type="textarea"
              autogrow
              hint='Дополнительные атрибуты в формате JSON, например: {"color": "red", "material": "cotton"}'
              :error="attributesError"
              :error-message="attributesErrorMessage"
              @update:model-value="validateAttributes"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Отмена" v-close-popup />
          <q-btn
            flat
            label="Сохранить"
            color="primary"
            @click="saveVariant"
            :loading="serviceVariantsStore.loading"
            :disable="!canSaveVariant"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Диалог детальной информации о варианте -->
    <q-dialog v-model="variantDetailDialogVisible" :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 500px; max-width: 600px'">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Детали варианта</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedVariantDetail">
          <q-list>
            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-medium">Размер</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedVariantDetail.size.value }} ({{
                    selectedVariantDetail.size.measurement_system
                  }})
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedVariantDetail.sku">
              <q-item-section>
                <q-item-label class="text-weight-medium">SKU</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedVariantDetail.sku }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-medium">Цена</q-item-label>
                <q-item-label caption class="text-body1">
                  {{
                    selectedVariantDetail.price
                      ? formatPrice(selectedVariantDetail.price)
                      : 'Не указана'
                  }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-medium">Статус</q-item-label>
                <q-item-label caption>
                  <q-chip
                    :color="selectedVariantDetail.is_active ? 'green' : 'red'"
                    text-color="white"
                    size="sm"
                  >
                    {{ selectedVariantDetail.is_active ? 'Активен' : 'Неактивен' }}
                  </q-chip>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              v-if="
                selectedVariantDetail.attributes &&
                Object.keys(selectedVariantDetail.attributes).length > 0
              "
            >
              <q-item-section>
                <q-item-label class="text-weight-medium">Атрибуты</q-item-label>
                <q-item-label caption class="text-body1">
                  <div class="q-gutter-xs">
                    <q-chip
                      v-for="(value, key) in selectedVariantDetail.attributes"
                      :key="key"
                      size="sm"
                      outline
                      :label="`${key}: ${value}`"
                    />
                  </div>
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

    <!-- Диалог просмотра атрибутов -->
    <q-dialog v-model="attributesDialogVisible">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">Атрибуты</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div v-if="currentAttributes && Object.keys(currentAttributes).length > 0">
            <q-list>
              <q-item v-for="(value, key) in currentAttributes" :key="key">
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ key }}</q-item-label>
                  <q-item-label caption>{{ value }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
          <div v-else class="text-grey-6">Атрибуты отсутствуют</div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Закрыть" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  useServiceVariantsStore,
  type ProductVariant,
  type ProductVariantDetail,
  type ProductVariantCreatePayload,
  type ProductVariantUpdatePayload,
} from 'stores/service-variants.store';
import { useSizesStore } from 'stores/sizes.store';
import { useServicesStore, type ServiceFile } from 'stores/services.store';
import { useQuasar, Dialog } from 'quasar';
import type { QTableProps, QTableColumn } from 'quasar';

interface VariantFormData {
  id?: string;
  size_id: string;
  sku: string;
  price: string;
  is_active: boolean;
  attributes: Record<string, unknown>;
}

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const serviceVariantsStore = useServiceVariantsStore();
const sizesStore = useSizesStore();
const servicesStore = useServicesStore();

const variantDialogVisible = ref(false);
const variantDetailDialogVisible = ref(false);
const attributesDialogVisible = ref(false);
const isEditing = ref(false);
const selectedVariantDetail = ref<ProductVariantDetail | null>(null);
const searchQuery = ref('');
const selectedRows = ref<ProductVariant[]>([]);
const bulkOperationLoading = ref(false);
const sizesLoading = ref(false);
const servicesLoading = ref(false);
const attributesError = ref(false);
const attributesErrorMessage = ref('');
const attributesJsonString = ref('');
const currentAttributes = ref<Record<string, unknown> | null>(null);
const selectedServiceId = ref<string>('');

const currentVariant = ref<VariantFormData>({
  size_id: '',
  sku: '',
  price: '',
  is_active: true,
  attributes: {},
});

// Получаем serviceId из роута
const routeServiceId = computed(() => (route.params.serviceId as string) || '');
const isAllServicesMode = computed(() => false); // Временно отключаем режим "все сервисы"

// Информация о текущем сервисе
const currentServiceInfo = computed(() => {
  if (isAllServicesMode.value) return null;
  return servicesStore.services.find((s) => s.id === routeServiceId.value) || null;
});

// Проверка валидного контекста для отображения данных
const hasValidContext = computed(() => serviceVariantsStore.hasServiceContext);

// Проверка возможности сохранения варианта
const canSaveVariant = computed(() => {
  if (isEditing.value) {
    return !!currentVariant.value.size_id;
  }
  // При создании нужен размер и контекст сервиса должен быть установлен
  return !!(currentVariant.value.size_id && serviceVariantsStore.hasServiceContext);
});

// Опции для выбора сервиса (убираем "Все сервисы" поскольку API не поддерживает)
const serviceOptions = computed(() =>
  servicesStore.services.map((service) => ({
    id: service.id,
    name: service.name,
  })),
);

// Опции для размеров
const sizeOptions = computed(() => {
  if (!sizesStore.sizes) return [];

  return sizesStore.sizes.map((size) => ({
    id: size.id,
    displayName: `${size.value} (${size.measurement_system})`,
    ...size,
  }));
});

// Колонки таблицы
const columns = computed((): QTableColumn[] => {
  return [
    {
      name: 'size',
      required: true,
      label: 'Размер',
      align: 'left',
      field: (row: ProductVariant) => row.size.value,
      sortable: true,
    },
    {
      name: 'sku',
      label: 'SKU',
      field: 'sku',
      align: 'left',
      sortable: true,
    },
    {
      name: 'price',
      label: 'Цена',
      field: 'price',
      align: 'right',
      sortable: true,
    },
    {
      name: 'is_active',
      label: 'Статус',
      field: 'is_active',
      align: 'center',
      sortable: true,
    },
    {
      name: 'attributes',
      label: 'Атрибуты',
      field: 'attributes',
      align: 'center',
      sortable: false,
    },
    {
      name: 'actions',
      label: 'Действия',
      field: 'id',
      align: 'right',
    },
  ];
});

// Функции для получения информации о сервисе из варианта
// API не возвращает информацию о сервисе в ответе, используем контекст
function getServiceName(variant: ProductVariant | ProductVariantDetail): string {
  if (isAllServicesMode.value) {
    // В режиме "все сервисы" ищем сервис по currentServiceId
    const service = servicesStore.services.find(
      (s) => s.id === serviceVariantsStore.currentServiceId,
    );
    return service?.name || 'Неизвестный сервис';
  }
  return currentServiceInfo.value?.name || 'Неизвестный сервис';
}

function getServiceId(variant: ProductVariant | ProductVariantDetail): string {
  return serviceVariantsStore.currentServiceId || 'unknown';
}

// Функция для управления выбором строк в мобильной версии
function toggleRowSelection(variant: ProductVariant, selected: boolean): void {
  if (selected) {
    if (!selectedRows.value.some((row) => row.id === variant.id)) {
      selectedRows.value.push(variant);
    }
  } else {
    selectedRows.value = selectedRows.value.filter((row) => row.id !== variant.id);
  }
}

async function onRequest(props: { pagination: QTableProps['pagination'] }): Promise<void> {
  if (props.pagination) {
    await serviceVariantsStore.handleTableRequest(props);
  }
}

async function onSearchInput(value: string | number | null): Promise<void> {
  const searchValue = value ? String(value).trim() : '';
  if (searchValue.length >= 2) {
    await serviceVariantsStore.filterVariants({ sku: searchValue });
  } else if (searchValue.length === 0) {
    await serviceVariantsStore.clearFilters();
  }
}

async function clearSearch(): Promise<void> {
  searchQuery.value = '';
  await serviceVariantsStore.clearFilters();
}

// Обработчик изменения выбранного сервиса
async function onServiceChange(newServiceId: string): Promise<void> {
  // Обновляем URL
  await router.push({
    name: 'ServiceVariants',
    params: { serviceId: newServiceId },
  });
}

async function openVariantDetailFromButton(row: ProductVariant): Promise<void> {
  const fullVariantData = await serviceVariantsStore.fetchVariantById(row.id);
  if (fullVariantData) {
    selectedVariantDetail.value = fullVariantData;
    variantDetailDialogVisible.value = true;
  }
}

function openCreateVariantDialog(): void {
  if (!hasValidContext.value) {
    $q.notify({ type: 'negative', message: 'Выберите сервис для создания варианта' });
    return;
  }

  isEditing.value = false;
  currentVariant.value = {
    size_id: '',
    sku: '',
    price: '',
    is_active: true,
    attributes: {},
  };
  attributesJsonString.value = '{}';
  attributesError.value = false;
  variantDialogVisible.value = true;
}

async function openEditVariantDialog(variant: ProductVariant): Promise<void> {
  isEditing.value = true;
  const fullVariantData = await serviceVariantsStore.fetchVariantById(variant.id);
  if (fullVariantData) {
    currentVariant.value = {
      id: fullVariantData.id,
      size_id: fullVariantData.size.id,
      sku: fullVariantData.sku || '',
      price: fullVariantData.price || '',
      is_active: fullVariantData.is_active,
      attributes: fullVariantData.attributes || {},
    };
    attributesJsonString.value = fullVariantData.attributes
      ? JSON.stringify(fullVariantData.attributes, null, 2)
      : '{}';
  } else {
    currentVariant.value = {
      id: variant.id,
      size_id: variant.size.id,
      sku: variant.sku || '',
      price: variant.price || '',
      is_active: variant.is_active,
      attributes: variant.attributes || {},
    };
    attributesJsonString.value = variant.attributes
      ? JSON.stringify(variant.attributes, null, 2)
      : '{}';
  }
  attributesError.value = false;
  variantDialogVisible.value = true;
}

function validateAttributes(): void {
  if (!attributesJsonString.value.trim()) {
    attributesError.value = false;
    attributesErrorMessage.value = '';
    currentVariant.value.attributes = {};
    return;
  }

  try {
    const parsed = JSON.parse(attributesJsonString.value);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      currentVariant.value.attributes = parsed;
      attributesError.value = false;
      attributesErrorMessage.value = '';
    } else {
      attributesError.value = true;
      attributesErrorMessage.value = 'Атрибуты должны быть JSON объектом';
    }
  } catch {
    attributesError.value = true;
    attributesErrorMessage.value = 'Некорректный JSON формат';
  }
}

async function saveVariant(): Promise<void> {
  if (!canSaveVariant.value) {
    $q.notify({ type: 'negative', message: 'Заполните все обязательные поля.' });
    return;
  }

  if (attributesError.value) {
    $q.notify({ type: 'negative', message: 'Исправьте ошибки в атрибутах.' });
    return;
  }

  const payload: ProductVariantCreatePayload | ProductVariantUpdatePayload = {
    size: currentVariant.value.size_id,
    sku: currentVariant.value.sku,
    price: currentVariant.value.price,
    is_active: currentVariant.value.is_active,
    attributes: currentVariant.value.attributes,
  };

  let success = false;
  if (isEditing.value && currentVariant.value.id) {
    const updatedVariant = await serviceVariantsStore.updateVariant(
      currentVariant.value.id,
      payload as ProductVariantUpdatePayload,
    );
    if (updatedVariant) success = true;
  } else {
    // Определяем serviceId для создания - используем текущий контекст
    const targetServiceId = serviceVariantsStore.currentServiceId;
    if (!targetServiceId) {
      $q.notify({ type: 'negative', message: 'Не определен сервис для создания варианта.' });
      return;
    }
    const newVariant = await serviceVariantsStore.createVariant(
      payload as ProductVariantCreatePayload,
      targetServiceId,
    );
    if (newVariant) success = true;
  }

  if (success) {
    variantDialogVisible.value = false;
  }
}

async function toggleActiveStatus(variant: ProductVariant): Promise<void> {
  await serviceVariantsStore.patchVariantStatus(variant.id, !variant.is_active);
}

// Функция подтверждения для мобильной версии
function confirmToggleActiveStatus(variant: ProductVariant): void {
  if ($q.screen.xs) {
    const newStatus = !variant.is_active;
    const action = newStatus ? 'активировать' : 'деактивировать';

    Dialog.create({
      title: 'Подтвердите действие',
      message: `Вы уверены, что хотите ${action} вариант "${variant.sku || variant.size.value}"?`,
      persistent: true,
      ok: {
        label: newStatus ? 'Активировать' : 'Деактивировать',
        color: newStatus ? 'green' : 'orange',
      },
      cancel: {
        label: 'Отмена',
        flat: true,
      },
    }).onOk(() => {
      void toggleActiveStatus(variant);
    });
  } else {
    // На десктопе сразу меняем статус без подтверждения
    void toggleActiveStatus(variant);
  }
}

function confirmBulkDelete(): void {
  Dialog.create({
    title: 'Подтвердите удаление',
    message: `Вы уверены, что хотите удалить ${selectedRows.value.length} вариантов?`,
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

async function bulkDelete(): Promise<void> {
  bulkOperationLoading.value = true;
  try {
    const success = await serviceVariantsStore.bulkDeleteVariants(
      selectedRows.value.map((row) => row.id),
    );
    if (success) {
      selectedRows.value = [];
    }
  } finally {
    bulkOperationLoading.value = false;
  }
}

async function bulkActivate(): Promise<void> {
  bulkOperationLoading.value = true;
  try {
    const success = await serviceVariantsStore.bulkUpdateVariantStatus(
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

async function bulkDeactivate(): Promise<void> {
  bulkOperationLoading.value = true;
  try {
    const success = await serviceVariantsStore.bulkUpdateVariantStatus(
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

function confirmDeleteVariant(variant: ProductVariant): void {
  Dialog.create({
    title: 'Подтвердите удаление',
    message: `Вы уверены, что хотите удалить вариант "${variant.sku || variant.size.value}"?`,
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
    serviceVariantsStore.deleteVariant(variant.id).catch((error: unknown) => {
      $q.notify({
        type: 'negative',
        message: 'Ошибка при удалении варианта',
      });
      console.error('Delete variant error:', error);
    });
  });
}

async function openVariantDetailDialog(evt: Event, row: ProductVariant): Promise<void> {
  const target = evt.target as HTMLElement;
  if (target.closest('.q-btn') || target.closest('button')) {
    return;
  }

  const fullVariantData = await serviceVariantsStore.fetchVariantById(row.id);
  if (fullVariantData) {
    selectedVariantDetail.value = fullVariantData;
    variantDetailDialogVisible.value = true;
  }
}

async function editFromDetail(): Promise<void> {
  if (selectedVariantDetail.value) {
    variantDetailDialogVisible.value = false;
    await openEditVariantDialog(selectedVariantDetail.value);
  }
}

function deleteFromDetail(): void {
  if (selectedVariantDetail.value) {
    variantDetailDialogVisible.value = false;
    confirmDeleteVariant(selectedVariantDetail.value);
  }
}

function showAttributesDialog(attributes: Record<string, unknown> | null): void {
  currentAttributes.value = attributes;
  attributesDialogVisible.value = true;
}

function formatPrice(price: string): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
  }).format(parseFloat(price));
}

// Загрузка размеров при наличии sizeChartId
async function loadSizes(): Promise<void> {
  // TODO: Нужно определить, откуда брать sizeChartId
  // Возможно, из настроек сервиса или глобальных настроек
  sizesLoading.value = true;
  try {
    // Временно загружаем все размеры без установки конкретной размерной сетки
    await sizesStore.fetchSizes();
  } catch (error) {
    console.error('Failed to load sizes:', error);
    $q.notify({ type: 'negative', message: 'Не удалось загрузить размеры' });
  } finally {
    sizesLoading.value = false;
  }
}

// Загрузка сервисов
async function loadServices(): Promise<void> {
  servicesLoading.value = true;
  try {
    await servicesStore.fetchServices();
  } catch (error) {
    console.error('Failed to load services:', error);
    $q.notify({ type: 'negative', message: 'Не удалось загрузить сервисы' });
  } finally {
    servicesLoading.value = false;
  }
}

// Инициализация данных для выбранного сервиса
async function initializeServiceData(serviceId: string): Promise<void> {
  if (!serviceId) {
    // Нет выбранного сервиса - сброс контекста
    serviceVariantsStore.clearServiceContext();
    selectedServiceId.value = '';
    return;
  }

  // Конкретный сервис
  serviceVariantsStore.setServiceContext(serviceId);
  selectedServiceId.value = serviceId;
  await serviceVariantsStore.fetchVariants();
}

// Watcher для отслеживания изменений serviceId в роуте
watch(
  () => routeServiceId.value,
  async (newServiceId) => {
    if (newServiceId) {
      await initializeServiceData(newServiceId);
    }
  },
  { immediate: true },
);

onMounted(async () => {
  // Загружаем справочники
  await Promise.all([loadServices(), loadSizes()]);

  // Инициализируем данные для текущего сервиса
  if (routeServiceId.value) {
    await initializeServiceData(routeServiceId.value);
  }
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

.variants-table {
  .q-table th,
  .q-table td {
    &:last-child {
      text-align: right;
    }
  }
}

.variant-card {
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
