<template>
  <q-drawer v-model="uiStore.isLeftDrawerOpen" show-if-above bordered class="bg-grey-1">
    <q-scroll-area class="fit">
      <q-list class="q-pa-sm">
        <!-- Главная -->
        <q-item
          clickable
          v-ripple
          :to="{ name: 'Dashboard' }"
          exact-active-class="bg-primary text-white"
          class="rounded-borders q-mb-xs"
        >
          <q-item-section avatar>
            <q-icon name="dashboard" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Главная</q-item-label>
            <q-item-label caption class="text-grey-6">Обзор системы</q-item-label>
          </q-item-section>
        </q-item>

        <!-- Разделитель -->
        <q-separator class="q-my-md" />

        <!-- Управление каталогом -->
        <q-item-label header class="text-grey-8 text-weight-bold text-uppercase text-spacing-sm">
          <q-icon name="inventory_2" class="q-mr-sm" />
          Каталог
        </q-item-label>

        <!-- Бренды -->
        <q-item
          clickable
          v-ripple
          :to="{ name: 'Brands' }"
          active-class="bg-primary text-white"
          class="rounded-borders q-mb-xs"
        >
          <q-item-section avatar>
            <q-icon name="branding_watermark" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Бренды</q-item-label>
            <q-item-label caption class="text-grey-6">Управление брендами</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge color="blue" text-color="white" :label="brandsCount" v-if="brandsCount > 0" />
          </q-item-section>
        </q-item>

        <!-- Системы измерений -->
        <q-item
          clickable
          v-ripple
          :to="{ name: 'MeasurementSystems' }"
          active-class="bg-primary text-white"
          class="rounded-borders q-mb-xs"
        >
          <q-item-section avatar>
            <q-icon name="straighten" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Системы измерений</q-item-label>
            <q-item-label caption class="text-grey-6">Управление единицами</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge
              color="green"
              text-color="white"
              :label="measurementSystemsCount"
              v-if="measurementSystemsCount > 0"
            />
          </q-item-section>
        </q-item>

        <!-- Типы товаров -->
        <q-item
          clickable
          v-ripple
          :to="{ name: 'ProductTypes' }"
          active-class="bg-primary text-white"
          class="rounded-borders q-mb-xs"
        >
          <q-item-section avatar>
            <q-icon name="category" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Типы товаров</q-item-label>
            <q-item-label caption class="text-grey-6">Управление категориями</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge
              color="purple"
              text-color="white"
              :label="productTypesCount"
              v-if="productTypesCount > 0"
            />
          </q-item-section>
        </q-item>

        <!-- Размерные сетки -->
        <q-item
          clickable
          v-ripple
          :to="{ name: 'SizeCharts' }"
          active-class="bg-primary text-white"
          class="rounded-borders q-mb-xs"
        >
          <q-item-section avatar>
            <q-icon name="grid_on" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Размерные сетки</q-item-label>
            <q-item-label caption class="text-grey-6">Управление сетками размеров</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge
              color="orange"
              text-color="white"
              :label="sizeChartsCount"
              v-if="sizeChartsCount > 0"
            />
          </q-item-section>
        </q-item>

        <!-- Размеры -->
        <q-item
          clickable
          v-ripple
          :to="{ name: 'Sizes' }"
          active-class="bg-primary text-white"
          class="rounded-borders q-mb-xs"
        >
          <q-item-section avatar>
            <q-icon name="photo_size_select_small" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Размеры</q-item-label>
            <q-item-label caption class="text-grey-6">Управление размерами товаров</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge color="teal" text-color="white" :label="sizesCount" v-if="sizesCount > 0" />
          </q-item-section>
        </q-item>

        <!-- Категории услуг -->
        <q-item
          clickable
          v-ripple
          :to="{ name: 'ServiceCategories' }"
          active-class="bg-primary text-white"
          class="rounded-borders q-mb-xs"
        >
          <q-item-section avatar>
            <q-icon name="folder_special" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Категории услуг</q-item-label>
            <q-item-label caption class="text-grey-6">Управление категориями услуг</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge
              color="deep-purple"
              text-color="white"
              :label="serviceCategoriesCount"
              v-if="serviceCategoriesCount > 0"
            />
          </q-item-section>
        </q-item>

        <!-- Разделитель -->
        <q-separator class="q-my-md" />

        <!-- Управление товарами -->
        <q-item-label header class="text-grey-8 text-weight-bold text-uppercase text-spacing-sm">
          <q-icon name="shopping_bag" class="q-mr-sm" />
          Товары и услуги
        </q-item-label>

        <!-- Сервисы -->
        <q-item
          clickable
          v-ripple
          :to="{ name: 'Services' }"
          active-class="bg-primary text-white"
          class="rounded-borders q-mb-xs"
        >
          <q-item-section avatar>
            <q-icon name="inventory" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Товар/Услуги</q-item-label>
            <q-item-label caption class="text-grey-6">Управление сервисами и товарами</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge
              color="cyan"
              text-color="white"
              :label="servicesCount"
              v-if="servicesCount > 0"
            />
          </q-item-section>
        </q-item>

        <!-- Варианты товаров/услуг -->
        <q-item
          clickable
          v-ripple
          :to="{ name: 'ServiceVariants', params: { serviceId: 'all' } }"
          active-class="bg-primary text-white"
          class="rounded-borders q-mb-xs"
        >
          <q-item-section avatar>
            <q-icon name="tune" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Варианты товаров</q-item-label>
            <q-item-label caption class="text-grey-6">Управление вариантами товаров</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge
              color="amber"
              text-color="white"
              :label="serviceVariantsCount"
              v-if="serviceVariantsCount > 0"
            />
          </q-item-section>
        </q-item>

        <!-- Свойства товаров/услуг -->
        <q-item
          clickable
          v-ripple
          :to="{ name: 'ServiceAttributes' }"
          active-class="bg-primary text-white"
          class="rounded-borders q-mb-xs"
        >
          <q-item-section avatar>
            <q-icon name="label" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Свойства Товар/Услуги</q-item-label>
            <q-item-label caption class="text-grey-6"
              >Управление свойствами товаров и услуг</q-item-label
            >
          </q-item-section>
          <q-item-section side>
            <q-badge
              color="pink"
              text-color="white"
              :label="serviceAttributesCount"
              v-if="serviceAttributesCount > 0"
            />
          </q-item-section>
        </q-item>

        <!-- Разделитель -->
        <q-separator class="q-my-md" />
      </q-list>
    </q-scroll-area>
  </q-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from 'stores/ui.store';
import { useBrandsStore } from 'stores/brands.store';
import { useMeasurementSystemsStore } from 'stores/measurement-systems.store';
import { useProductTypesStore } from 'stores/product-types.store';
import { useSizeChartsStore } from 'stores/size-charts.store';
import { useServiceCategoriesStore } from 'stores/service-categories.store';
import { useServicesStore } from 'stores/services.store';
import { useServiceAttributesStore } from 'stores/service-attributes.store';
// import { useServiceVariantsStore } from 'stores/service-variants.store'; // Раскомментировать когда создан store

const uiStore = useUiStore();
const brandsStore = useBrandsStore();
const measurementSystemsStore = useMeasurementSystemsStore();
const productTypesStore = useProductTypesStore();
const sizeChartsStore = useSizeChartsStore();
const serviceCategoriesStore = useServiceCategoriesStore();
const servicesStore = useServicesStore();
const serviceAttributesStore = useServiceAttributesStore();
// const serviceVariantsStore = useServiceVariantsStore(); // Раскомментировать когда создан store

/**
 * Computed свойства для подсчета количества элементов в бейджах
 * Все computed свойства используют optional chaining для безопасного доступа к данным
 */
const serviceCategoriesCount = computed(() => serviceCategoriesStore?.totalCount ?? 0);
const brandsCount = computed(() => brandsStore?.totalCount ?? 0);
const measurementSystemsCount = computed(() => measurementSystemsStore?.totalCount ?? 0);
const productTypesCount = computed(() => productTypesStore?.totalCount ?? 0);
const sizeChartsCount = computed(() => sizeChartsStore?.totalCount ?? 0);
const servicesCount = computed(() => servicesStore?.totalCount ?? 0);
const serviceAttributesCount = computed(() => serviceAttributesStore?.totalCount ?? 0);

// Временно устанавливаем в 0 до создания stores
const sizesCount = computed(() => 0); // Заменить на sizesStore.totalCount когда создан store
const serviceVariantsCount = computed(() => 0); // Заменить на serviceVariantsStore.totalCount когда создан store
</script>

<style scoped lang="scss">
.q-item {
  border-radius: 8px;
  margin-bottom: 2px;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }

  &.q-router-link--active {
    background-color: var(--q-primary);
    color: white;

    .q-item__label--caption {
      color: rgba(255, 255, 255, 0.7);
    }
  }
}

.q-item-label--header {
  font-size: 11px;
  letter-spacing: 0.5px;
  margin-top: 16px;
  margin-bottom: 8px;
}

.text-spacing-sm {
  letter-spacing: 0.5px;
}

.q-scroll-area {
  height: calc(100vh - 120px - 60px); // Вычитаем высоту заголовка и футера
}

// Анимация для бейджей
.q-badge {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}
</style>
