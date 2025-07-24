<template>
  <q-page class="dashboard-page">
    <!-- Приветствие -->
    <div class="dashboard-header q-pa-lg">
      <div class="container">
        <div class="row items-center justify-between">
          <div class="welcome-section">
            <h1 class="dashboard-title">
              Добро пожаловать в AppKit Admin!
              <span class="wave-emoji">👋</span>
            </h1>
            <p class="dashboard-subtitle">Управляйте каталогом товаров и услуг с легкостью</p>
          </div>
          <div class="time-section">
            <q-card class="time-card">
              <q-card-section class="q-pa-md text-center">
                <q-icon name="schedule" size="1.5rem" class="q-mb-xs" />
                <div class="time-text">{{ currentTime }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>

    <div class="container q-pa-lg">
      <!-- Быстрая статистика - ВСЕГДА 4 колонки -->
      <div class="dashboard-stats q-mb-xl">
        <h2 class="section-title">
          <q-icon name="analytics" class="q-mr-sm" />
          Статистика системы
        </h2>

        <div class="stats-grid">
          <div v-for="stat in dashboardStats" :key="stat.name" class="stat-card-wrapper">
            <q-card
              class="stat-card cursor-pointer"
              @click="navigateToSection(stat.route)"
              :class="stat.color"
            >
              <q-card-section class="q-pa-lg">
                <div class="stat-content">
                  <div class="stat-info">
                    <div class="stat-number">{{ stat.count }}</div>
                    <div class="stat-label">{{ stat.label }}</div>
                    <div class="stat-trend">
                      <q-icon name="trending_up" size="1rem" />
                      <span>+{{ Math.floor(Math.random() * 20) }}%</span>
                    </div>
                  </div>
                  <div class="stat-icon-wrapper">
                    <q-icon :name="stat.icon" size="3rem" class="stat-icon" />
                  </div>
                </div>
              </q-card-section>

              <div class="stat-progress">
                <q-linear-progress
                  :value="stat.progress"
                  color="white"
                  track-color="rgba(255,255,255,0.2)"
                  size="3px"
                />
              </div>
            </q-card>
          </div>
        </div>
      </div>

      <!-- Основные разделы -->
      <div class="dashboard-sections q-mb-xl">
        <h2 class="section-title">
          <q-icon name="widgets" class="q-mr-sm" />
          Основные разделы
        </h2>

        <div class="sections-grid">
          <!-- Управление каталогом -->
          <q-card class="section-card catalog-section">
            <div class="section-background"></div>
            <q-card-section class="q-pa-xl relative-position">
              <div class="section-header q-mb-lg">
                <div class="section-icon-bg">
                  <q-icon name="inventory_2" size="2rem" />
                </div>
                <div class="section-info">
                  <h3 class="section-title-text">Управление каталогом</h3>
                  <p class="section-description">Товары, бренды и категории</p>
                </div>
              </div>

              <div class="section-actions">
                <div class="actions-grid">
                  <q-btn
                    v-for="action in catalogActions"
                    :key="action.name"
                    :icon="action.icon"
                    :label="action.label"
                    color="primary"
                    unelevated
                    no-caps
                    @click="navigateToSection(action.route)"
                    class="action-btn"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Управление сервисами -->
          <q-card class="section-card services-section">
            <div class="section-background"></div>
            <q-card-section class="q-pa-xl relative-position">
              <div class="section-header q-mb-lg">
                <div class="section-icon-bg">
                  <q-icon name="business_center" size="2rem" />
                </div>
                <div class="section-info">
                  <h3 class="section-title-text">Управление сервисами</h3>
                  <p class="section-description">Услуги и их свойства</p>
                </div>
              </div>

              <div class="section-actions">
                <div class="actions-grid">
                  <q-btn
                    v-for="action in servicesActions"
                    :key="action.name"
                    :icon="action.icon"
                    :label="action.label"
                    color="secondary"
                    unelevated
                    no-caps
                    @click="navigateToSection(action.route)"
                    class="action-btn"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Двухколоночный лейаут для быстрого старта и активности -->
      <div class="dashboard-bottom">
        <div class="bottom-grid">
          <!-- Быстрый старт - ПЕРЕДЕЛАННЫЙ -->
          <q-card class="quickstart-card modern-card">
            <q-card-section class="q-pa-xl">
              <div class="quickstart-header q-mb-lg">
                <div class="quickstart-icon">
                  <q-icon name="rocket_launch" size="2rem" />
                </div>
                <div>
                  <h2 class="quickstart-title">Быстрый старт</h2>
                  <p class="quickstart-subtitle">Настройте систему за 4 простых шага</p>
                </div>
              </div>

              <div class="progress-overview q-mb-lg">
                <div class="progress-text">
                  Выполнено: {{ completedSteps }}/{{ quickStartSteps.length }}
                </div>
                <q-linear-progress
                  :value="completedSteps / quickStartSteps.length"
                  color="primary"
                  size="8px"
                  rounded
                  class="q-mt-xs"
                />
              </div>

              <div class="steps-container">
                <div
                  v-for="(step, index) in quickStartSteps"
                  :key="index"
                  class="step-item"
                  :class="{
                    'step-completed': step.completed,
                    'step-active': !step.completed && index === nextStepIndex,
                  }"
                >
                  <div class="step-indicator">
                    <q-icon v-if="step.completed" name="check" size="1.2rem" color="white" />
                    <span v-else class="step-number">{{ index + 1 }}</span>
                  </div>

                  <div class="step-content">
                    <h4 class="step-title">{{ step.title }}</h4>
                    <p class="step-description">{{ step.description }}</p>

                    <q-btn
                      v-if="step.action && !step.completed"
                      :label="step.actionLabel"
                      color="primary"
                      unelevated
                      dense
                      no-caps
                      @click="navigateToSection(step.action)"
                      class="step-action"
                    />
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Последняя активность -->
          <q-card class="activity-card modern-card">
            <q-card-section class="q-pa-xl">
              <div class="activity-header q-mb-lg">
                <div class="activity-icon">
                  <q-icon name="history" size="2rem" />
                </div>
                <div>
                  <h2 class="activity-title">Последняя активность</h2>
                  <p class="activity-subtitle">Ваши недавние действия</p>
                </div>
              </div>

              <div class="activity-list">
                <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
                  <div class="activity-icon-wrapper" :class="activity.type">
                    <q-icon :name="activity.icon" size="1.2rem" />
                  </div>
                  <div class="activity-content">
                    <div class="activity-text">{{ activity.text }}</div>
                    <div class="activity-time">{{ activity.time }}</div>
                  </div>
                </div>
              </div>

              <div class="activity-footer q-mt-lg">
                <q-btn
                  label="Посмотреть все"
                  color="primary"
                  flat
                  dense
                  no-caps
                  class="full-width"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Быстрые ссылки -->
      <div class="quick-links q-mt-xl">
        <h2 class="section-title">
          <q-icon name="link" class="q-mr-sm" />
          Полезные ссылки
        </h2>

        <div class="links-grid">
          <q-card
            v-for="link in quickLinks"
            :key="link.name"
            class="link-card cursor-pointer"
            @click="navigateToSection(link.route)"
          >
            <q-card-section class="q-pa-lg text-center">
              <q-icon :name="link.icon" size="2.5rem" :color="link.color" class="q-mb-md" />
              <div class="link-title">{{ link.title }}</div>
              <div class="link-description">{{ link.description }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBrandsStore } from 'stores/brands.store';
import { useServicesStore } from 'stores/services.store';
import { useServiceCategoriesStore } from 'stores/service-categories.store';
import { useSizesStore } from 'stores/sizes.store';

// ============================================================================
// КОМПОЗИЦИЯ
// ============================================================================

const router = useRouter();

// Stores для получения статистики
const brandsStore = useBrandsStore();
const servicesStore = useServicesStore();
const serviceCategoriesStore = useServiceCategoriesStore();
const sizesStore = useSizesStore();

// ============================================================================
// РЕАКТИВНЫЕ ДАННЫЕ
// ============================================================================

const currentTime = ref('');
const timeInterval = ref<NodeJS.Timeout | null>(null);

// ============================================================================
// COMPUTED СВОЙСТВА
// ============================================================================

/**
 * Статистика для dashboard
 */
const dashboardStats = computed(() => [
  {
    name: 'brands',
    label: 'Бренды',
    count: brandsStore.totalCount || 0,
    icon: 'branding_watermark',
    color: 'stat-card--blue',
    progress: Math.min((brandsStore.totalCount || 0) / 100, 1),
    route: 'Brands',
  },
  {
    name: 'services',
    label: 'Сервисы',
    count: servicesStore.totalCount || 0,
    icon: 'inventory',
    color: 'stat-card--green',
    progress: Math.min((servicesStore.totalCount || 0) / 50, 1),
    route: 'Services',
  },
  {
    name: 'categories',
    label: 'Категории',
    count: serviceCategoriesStore.totalCount || 0,
    icon: 'folder_special',
    color: 'stat-card--orange',
    progress: Math.min((serviceCategoriesStore.totalCount || 0) / 20, 1),
    route: 'ServiceCategories',
  },
  {
    name: 'sizes',
    label: 'Размеры',
    count: sizesStore.totalCount || 0,
    icon: 'photo_size_select_small',
    color: 'stat-card--purple',
    progress: Math.min((sizesStore.totalCount || 0) / 200, 1),
    route: 'Sizes',
  },
]);

/**
 * Действия для каталога
 */
const catalogActions = computed(() => [
  {
    name: 'brands',
    label: 'Бренды',
    icon: 'branding_watermark',
    route: 'Brands',
  },
  {
    name: 'product-types',
    label: 'Типы товаров',
    icon: 'category',
    route: 'ProductTypes',
  },
  {
    name: 'sizes',
    label: 'Размеры',
    icon: 'photo_size_select_small',
    route: 'Sizes',
  },
]);

/**
 * Действия для сервисов
 */
const servicesActions = computed(() => [
  {
    name: 'services',
    label: 'Сервисы',
    icon: 'inventory',
    route: 'Services',
  },
  {
    name: 'categories',
    label: 'Категории',
    icon: 'folder_special',
    route: 'ServiceCategories',
  },
  {
    name: 'attributes',
    label: 'Свойства',
    icon: 'label',
    route: 'ServiceAttributes',
  },
]);

/**
 * Шаги быстрого старта
 */
const quickStartSteps = computed(() => [
  {
    title: 'Настройте бренды',
    description: 'Добавьте бренды товаров для правильной категоризации',
    completed: (brandsStore.totalCount || 0) > 0,
    action: 'Brands',
    actionLabel: 'Перейти к брендам',
  },
  {
    title: 'Создайте категории услуг',
    description: 'Определите основные категории для организации сервисов',
    completed: (serviceCategoriesStore.totalCount || 0) > 0,
    action: 'ServiceCategories',
    actionLabel: 'Настроить категории',
  },
  {
    title: 'Добавьте размеры',
    description: 'Создайте размерную сетку для товаров',
    completed: (sizesStore.totalCount || 0) > 0,
    action: 'Sizes',
    actionLabel: 'Управление размерами',
  },
  {
    title: 'Создайте первый сервис',
    description: 'Добавьте товар или услугу в каталог',
    completed: (servicesStore.totalCount || 0) > 0,
    action: 'Services',
    actionLabel: 'Создать сервис',
  },
]);

/**
 * Количество выполненных шагов
 */
const completedSteps = computed(() => {
  return quickStartSteps.value.filter((step) => step.completed).length;
});

/**
 * Индекс следующего шага
 */
const nextStepIndex = computed(() => {
  return quickStartSteps.value.findIndex((step) => !step.completed);
});

/**
 * Последняя активность (моковые данные)
 */
const recentActivities = computed(() => [
  {
    id: 1,
    text: 'Создан новый бренд "Nike"',
    time: '2 минуты назад',
    icon: 'add_circle',
    type: 'success',
  },
  {
    id: 2,
    text: 'Обновлена категория "Обувь"',
    time: '15 минут назад',
    icon: 'edit',
    type: 'info',
  },
  {
    id: 3,
    text: 'Добавлен размер "XL"',
    time: '1 час назад',
    icon: 'add',
    type: 'success',
  },
  {
    id: 4,
    text: 'Создан сервис "Кроссовки Air Max"',
    time: '2 часа назад',
    icon: 'inventory_2',
    type: 'primary',
  },
]);

/**
 * Быстрые ссылки
 */
const quickLinks = computed(() => [
  {
    name: 'size-charts',
    title: 'Размерные сетки',
    description: 'Управление таблицами размеров',
    icon: 'grid_on',
    color: 'primary',
    route: 'SizeCharts',
  },
  {
    name: 'measurement-systems',
    title: 'Системы измерений',
    description: 'Единицы измерения товаров',
    icon: 'straighten',
    color: 'secondary',
    route: 'MeasurementSystems',
  },
  {
    name: 'service-variants',
    title: 'Варианты товаров',
    description: 'Размеры, артикулы, цены',
    icon: 'tune',
    color: 'accent',
    route: 'ServiceVariants',
  },
  {
    name: 'pages',
    title: 'Промо акции',
    description: 'Контентные страницы',
    icon: 'campaign',
    color: 'positive',
    route: 'Pages',
  },
]);

// ============================================================================
// МЕТОДЫ
// ============================================================================

/**
 * Обновление текущего времени
 */
function updateTime(): void {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  currentTime.value = now.toLocaleDateString('ru-RU', options);
}

/**
 * Навигация к разделу
 */
function navigateToSection(routeName: string): void {
  if (!routeName) return;

  try {
    void router.push({ name: routeName });
  } catch (error) {
    console.error('Ошибка навигации:', error);
  }
}

/**
 * Загрузка начальных данных
 */
async function loadInitialData(): Promise<void> {
  try {
    // Загружаем данные для статистики в фоновом режиме
    const promises = [
      brandsStore.fetchBrands?.(),
      servicesStore.fetchServices?.(),
      serviceCategoriesStore.fetchServiceCategories?.(),
      sizesStore.fetchSizes?.(),
    ].filter(Boolean);

    // Выполняем запросы параллельно, но не блокируем интерфейс
    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Ошибка загрузки данных dashboard:', error);
  }
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

onMounted(async () => {
  // Обновляем время
  updateTime();
  timeInterval.value = setInterval(updateTime, 60000); // Обновляем каждую минуту

  // Загружаем данные
  await loadInitialData();
});

onUnmounted(() => {
  if (timeInterval.value) {
    clearInterval(timeInterval.value);
  }
});
</script>

<style lang="scss" scoped>
.dashboard-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.container {
  max-width: 1400px;
  margin: 0 auto;
}

// ============================================================================
// HEADER
// ============================================================================
.dashboard-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
    opacity: 0.1;
  }

  .welcome-section {
    position: relative;
    z-index: 1;
  }

  .dashboard-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0;
    line-height: 1.2;

    @media (max-width: 768px) {
      font-size: 2rem;
    }
  }

  .wave-emoji {
    display: inline-block;
    animation: wave 2s infinite;
  }

  .dashboard-subtitle {
    font-size: 1.2rem;
    opacity: 0.9;
    margin: 0.5rem 0 0 0;
  }

  .time-card {
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 16px;

    .time-text {
      font-weight: 600;
      font-size: 0.9rem;
    }
  }
}

@keyframes wave {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-10deg);
  }
  75% {
    transform: rotate(10deg);
  }
}

// ============================================================================
// SECTION TITLES
// ============================================================================
.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
}

// ============================================================================
// STATS GRID - ВСЕГДА 4 КОЛОНКИ
// ============================================================================
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  }

  &--blue {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  &--green {
    background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);
    color: white;
  }

  &--orange {
    background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
    color: white;
  }

  &--purple {
    background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
    color: white;
  }

  .stat-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .stat-number {
    font-size: 2.5rem;
    font-weight: 800;
    line-height: 1;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    font-size: 1rem;
    opacity: 0.9;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .stat-trend {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    opacity: 0.8;
  }

  .stat-icon {
    opacity: 0.3;
  }

  .stat-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
  }
}

// ============================================================================
// SECTIONS GRID
// ============================================================================
.sections-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.section-card {
  border-radius: 24px;
  overflow: hidden;
  border: none;
  position: relative;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
  }

  .section-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0.05;
  }

  &.catalog-section .section-background {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  &.services-section .section-background {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .section-icon-bg {
    width: 60px;
    height: 60px;
    border-radius: 16px;
    background: rgba(102, 126, 234, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #667eea;
  }

  .section-title-text {
    font-size: 1.3rem;
    font-weight: 700;
    margin: 0;
    color: #2c3e50;
  }

  .section-description {
    color: #7f8c8d;
    margin: 0.25rem 0 0 0;
    font-size: 0.9rem;
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem;
  }

  .action-btn {
    border-radius: 12px;
    padding: 0.75rem 1rem;
    font-weight: 600;
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    }
  }
}

// ============================================================================
// BOTTOM GRID
// ============================================================================
.bottom-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 2rem;

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
}

.modern-card {
  border-radius: 24px;
  border: none;
  background: white;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
  }
}

// ============================================================================
// QUICKSTART - ПЕРЕДЕЛАННЫЙ
// ============================================================================
.quickstart-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.quickstart-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quickstart-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
  color: #2c3e50;
}

.quickstart-subtitle {
  color: #7f8c8d;
  margin: 0.25rem 0 0 0;
  font-size: 0.9rem;
}

.progress-overview {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 12px;

  .progress-text {
    font-weight: 600;
    color: #2c3e50;
    font-size: 0.9rem;
  }
}

.steps-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 16px;
  background: #f8f9fa;
  transition: all 0.3s ease;
  border: 2px solid transparent;

  &.step-completed {
    background: linear-gradient(135deg, #d4edda, #c3e6cb);
    border-color: #28a745;

    .step-indicator {
      background: #28a745;
      color: white;
    }
  }

  &.step-active {
    background: linear-gradient(135deg, #fff3cd, #ffeaa7);
    border-color: #ffc107;
    transform: scale(1.02);

    .step-indicator {
      background: #ffc107;
      color: white;
    }
  }

  &:hover:not(.step-completed) {
    background: #e9ecef;
  }
}

.step-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #6c757d;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.step-description {
  color: #6c757d;
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

.step-action {
  border-radius: 8px;
  font-weight: 600;
}

// ============================================================================
// ACTIVITY CARD
// ============================================================================
.activity-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.activity-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
  color: #2c3e50;
}

.activity-subtitle {
  color: #7f8c8d;
  margin: 0.25rem 0 0 0;
  font-size: 0.9rem;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 12px;
  background: #f8f9fa;
  transition: all 0.2s ease;

  &:hover {
    background: #e9ecef;
  }
}

.activity-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;

  &.success {
    background: #28a745;
  }
  &.info {
    background: #17a2b8;
  }
  &.primary {
    background: #007bff;
  }
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.9rem;
}

.activity-time {
  color: #6c757d;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

// ============================================================================
// QUICK LINKS
// ============================================================================
.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.link-card {
  border-radius: 16px;
  border: 2px solid #f1f3f4;
  transition: all 0.3s ease;

  &:hover {
    border-color: #667eea;
    transform: translateY(-4px);
    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.15);
  }

  .link-title {
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 0.5rem;
  }

  .link-description {
    color: #6c757d;
    font-size: 0.85rem;
  }
}

// ============================================================================
// RESPONSIVE
// ============================================================================
@media (max-width: 768px) {
  .dashboard-header {
    .row {
      flex-direction: column;
      align-items: flex-start;
      gap: 1.5rem;
    }
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .quickstart-header,
  .activity-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .step-item {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .activity-item {
    flex-direction: column;
    text-align: center;
  }
}

// ============================================================================
// ANIMATIONS
// ============================================================================
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dashboard-stats {
  animation: fadeInUp 0.6s ease-out 0.1s both;
}
.dashboard-sections {
  animation: fadeInUp 0.6s ease-out 0.2s both;
}
.dashboard-bottom {
  animation: fadeInUp 0.6s ease-out 0.3s both;
}
.quick-links {
  animation: fadeInUp 0.6s ease-out 0.4s both;
}
</style>
