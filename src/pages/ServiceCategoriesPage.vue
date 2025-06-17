<template>
  <q-page padding>
    <!-- Адаптивный заголовок -->
    <div class="q-mb-md">
      <!-- Основной заголовок, переключатель вида и кнопка добавления -->
      <div class="row justify-between items-center">
        <div>
          <div class="text-h5">Управление категориями услуг</div>
          <div
            v-if="serviceCategoriesStore.hierarchyMeta.total_count > 0"
            class="text-caption text-grey-6"
          >
            Всего категорий: {{ serviceCategoriesStore.hierarchyMeta.total_count }} • Максимальный
            уровень: {{ serviceCategoriesStore.hierarchyMeta.max_level + 1 }} • Режим отображения:
            {{ viewMode === 'tree' ? 'Древовидный' : 'Табличный' }}
            <!-- 🆕 Индикатор текущего пути -->
            <span v-if="viewMode === 'table' && navigationHistory.length > 1">
              • Путь: {{ getCurrentNavigationPath() }}
            </span>
          </div>
        </div>

        <div class="row q-gutter-sm items-center">
          <!-- Переключатель режима просмотра -->
          <q-btn-toggle
            v-model="viewMode"
            toggle-color="green-5"
            color="grey-4"
            text-color="grey-8"
            toggle-text-color="white"
            :options="[
              { label: $q.screen.gt.sm ? 'Дерево' : '', value: 'tree', icon: 'account_tree' },
              { label: $q.screen.gt.sm ? 'Таблица' : '', value: 'table', icon: 'table_view' },
            ]"
            @update:model-value="toggleViewMode"
            no-caps
            unelevated
            dense
          />

          <!-- Кнопка добавления -->
          <q-btn
            color="primary"
            icon="add"
            @click="openCreateServiceCategoryDialog"
            :label="$q.screen.gt.xs ? 'Добавить категорию' : ''"
            :round="$q.screen.xs"
          />
        </div>
      </div>

      <!-- Компактная панель массовых операций (только для режима таблицы) -->
      <q-slide-transition>
        <div v-if="selectedRows.length > 0 && viewMode === 'table'" class="q-mt-sm">
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

    <!-- Поле поиска (только для режима таблицы) -->
    <div v-if="viewMode === 'table'" class="q-mb-md">
      <q-input
        v-model="searchQuery"
        placeholder="Поиск по названию категории услуг на текущем уровне..."
        clearable
        outlined
        dense
        @update:model-value="onSearchInput"
        @clear="clearSearch"
      >
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
        <!-- 🆕 Индикатор уровня поиска -->
        <template v-slot:append>
          <q-chip
            v-if="navigationHistory.length > 1 && getLastNavigationItem()"
            size="sm"
            color="secondary"
            text-color="white"
          >
            {{ getLastNavigationItem()?.name || 'Не выбрано' }}
          </q-chip>
        </template>
      </q-input>
    </div>

    <!-- 🗂️ Навигационные хлебные крошки (только для режима таблицы) -->
    <div v-if="viewMode === 'table'" class="q-mb-md">
      <q-card flat bordered>
        <q-card-section class="q-pa-sm">
          <div class="row items-center">
            <q-icon name="folder" class="q-mr-sm text-grey-6" />
            <q-breadcrumbs>
              <q-breadcrumbs-el
                v-for="(level, index) in navigationHistory"
                :key="level.id || 'root'"
                :label="level.name"
                :icon="index === 0 ? 'home' : 'folder'"
                @click="navigateToLevel(index)"
                :class="
                  index === navigationHistory.length - 1 ? 'text-weight-bold' : 'cursor-pointer'
                "
              />
            </q-breadcrumbs>
            <q-space />
            <!-- 🆕 Индикатор количества элементов на уровне -->
            <q-chip size="sm" color="info" text-color="white" icon="folder_open" class="q-mr-sm">
              {{ filteredCategories.length }} элементов
            </q-chip>
            <q-btn
              v-if="navigationHistory.length > 1"
              flat
              dense
              icon="arrow_back"
              label="Назад"
              @click="navigateBack"
              color="primary"
              size="sm"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Счетчик и загрузка -->
    <div v-if="serviceCategoriesStore.loading" class="flex flex-center q-pa-md">
      <q-spinner color="primary" size="3em" />
      <div class="q-ml-md text-grey-6">Загружаем данные...</div>
    </div>

    <!-- Древовидный вид -->
    <div v-if="!serviceCategoriesStore.loading && viewMode === 'tree'" class="tree-view">
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6 q-mb-md">
            <q-icon name="account_tree" class="q-mr-sm" />
            Иерархия категорий
            <!-- 🆕 Индикатор полной загрузки -->
            <q-chip size="sm" color="positive" text-color="white" class="q-ml-sm">
              Полная иерархия загружена
            </q-chip>
          </div>

          <q-tree
            :nodes="treeData"
            v-model:expanded="treeExpanded"
            node-key="id"
            label-key="label"
            children-key="children"
            default-expand-all
          >
            <template v-slot:default-header="prop">
              <div class="row items-center full-width">
                <q-icon :name="prop.node.icon" :color="prop.node.iconColor" class="q-mr-sm" />
                <span
                  :class="prop.node.disabled ? 'text-grey-6' : 'text-weight-medium'"
                  class="q-mr-md"
                >
                  {{ prop.node.label }}
                </span>

                <!-- Статус публикации -->
                <q-chip
                  :color="
                    (prop.node.category as ServiceCategoryFile).is_published
                      ? 'positive'
                      : 'negative'
                  "
                  text-color="white"
                  size="sm"
                  :icon="
                    (prop.node.category as ServiceCategoryFile).is_published
                      ? 'visibility'
                      : 'visibility_off'
                  "
                  class="q-mr-sm"
                >
                  {{
                    (prop.node.category as ServiceCategoryFile).is_published
                      ? 'Опубликовано'
                      : 'Скрыто'
                  }}
                </q-chip>

                <!-- Краткое описание -->
                <span
                  v-if="(prop.node.category as ServiceCategoryFile).brief"
                  class="text-caption text-grey-6 q-mr-md"
                >
                  {{ (prop.node.category as ServiceCategoryFile).brief?.substring(0, 50)
                  }}{{
                    ((prop.node.category as ServiceCategoryFile).brief?.length || 0) > 50
                      ? '...'
                      : ''
                  }}
                </span>

                <q-space />

                <!-- Действия -->
                <div class="row q-gutter-xs">
                  <q-btn
                    flat
                    round
                    dense
                    icon="visibility"
                    color="primary"
                    @click.stop="
                      openServiceCategoryDetailFromButton(prop.node.category as ServiceCategoryFile)
                    "
                    size="sm"
                  >
                    <q-tooltip>Просмотр</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    icon="edit"
                    @click.stop="
                      openEditServiceCategoryDialog(prop.node.category as ServiceCategoryFile)
                    "
                    size="sm"
                  >
                    <q-tooltip>Редактировать</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    color="negative"
                    @click.stop="
                      confirmDeleteServiceCategory(prop.node.category as ServiceCategoryFile)
                    "
                    size="sm"
                  >
                    <q-tooltip>Удалить</q-tooltip>
                  </q-btn>
                </div>
              </div>
            </template>
          </q-tree>

          <!-- Пустое состояние для дерева -->
          <div v-if="treeData.length === 0" class="text-center q-pa-lg">
            <q-icon name="account_tree" size="4em" color="grey-4" />
            <div class="text-grey-6 q-mt-sm">Категории услуг не найдены</div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Десктопная таблица -->
    <div
      v-if="!serviceCategoriesStore.loading && viewMode === 'table' && $q.screen.gt.xs"
      class="desktop-view"
    >
      <q-table
        :title="getCurrentTableTitle()"
        :rows="filteredCategories"
        :columns="columns"
        row-key="id"
        :loading="serviceCategoriesStore.loading"
        v-model:selected="selectedRows"
        selection="multiple"
        @row-click="handleTableRowClick"
        :rows-per-page-options="[5, 10, 20, 30, 50]"
        :pagination="{ rowsPerPage: 10 }"
        class="cursor-pointer service-categories-table"
      >
        <template v-slot:body-cell-name="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-icon
                :name="hasChildren(props.row) ? 'folder' : 'description'"
                :color="props.row.is_published ? 'secondary' : 'grey-5'"
                class="q-mr-sm"
                size="md"
              />
              <span :class="['text-weight-medium', props.row.is_published ? '' : 'text-grey-6']">
                {{ props.row.name }}
              </span>
              <q-chip
                v-if="hasChildren(props.row)"
                size="xs"
                color="secondary"
                text-color="white"
                class="q-ml-xs"
              >
                {{ getChildrenCount(props.row.id) }}
              </q-chip>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-brief="props">
          <q-td :props="props">
            <div class="text-truncate" style="max-width: 200px">
              {{ props.row.brief || '-' }}
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-is_published="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.is_published ? 'positive' : 'negative'"
              text-color="white"
              size="sm"
              :icon="props.row.is_published ? 'visibility' : 'visibility_off'"
            >
              {{ props.row.is_published ? 'Опубликовано' : 'Скрыто' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-parent="props">
          <q-td :props="props">
            <q-chip
              v-if="props.row.parent"
              color="secondary"
              text-color="white"
              size="sm"
              icon="folder"
            >
              {{ props.row.parent.name }}
            </q-chip>
            <span v-else class="text-grey-6">Корневая</span>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <div class="row no-wrap q-gutter-xs justify-end">
              <q-btn
                v-if="hasChildren(props.row)"
                flat
                round
                dense
                icon="folder_open"
                color="secondary"
                @click.stop="navigateToCategory(props.row)"
              >
                <q-tooltip>Открыть папку</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="visibility"
                color="primary"
                @click.stop="openServiceCategoryDetailFromButton(props.row)"
              >
                <q-tooltip>Просмотр</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="edit"
                @click.stop="openEditServiceCategoryDialog(props.row)"
              >
                <q-tooltip>Редактировать</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click.stop="confirmDeleteServiceCategory(props.row)"
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
      v-if="!serviceCategoriesStore.loading && viewMode === 'table' && $q.screen.xs"
      class="mobile-view"
    >
      <!-- Информация о количестве -->
      <div class="row items-center justify-between q-mb-md">
        <div class="text-caption text-grey-7">
          Элементов на уровне: {{ filteredCategories.length }}
        </div>
        <q-btn
          v-if="navigationHistory.length > 1"
          flat
          dense
          icon="arrow_back"
          label="Назад"
          @click="navigateBack"
          color="primary"
          size="sm"
        />
      </div>

      <!-- Список карточек -->
      <div class="q-gutter-sm">
        <q-expansion-item
          v-for="category in filteredCategories"
          :key="category.id"
          class="service-category-card"
          :header-class="
            selectedRows.some((row: ServiceCategoryFile) => row.id === category.id)
              ? 'bg-blue-1'
              : ''
          "
        >
          <template v-slot:header>
            <div class="row items-center full-width no-wrap">
              <!-- Чекбокс для выбора -->
              <q-checkbox
                :model-value="
                  selectedRows.some((row: ServiceCategoryFile) => row.id === category.id)
                "
                @update:model-value="(val) => toggleRowSelection(category, val)"
                class="q-mr-sm"
                @click.stop
              />

              <!-- Иконка категории -->
              <div class="q-mr-md">
                <q-avatar size="40px" class="bg-secondary text-white">
                  <q-icon :name="hasChildren(category) ? 'folder' : 'description'" />
                </q-avatar>
              </div>

              <!-- Основная информация -->
              <div class="col-grow q-mr-md">
                <div class="row items-center">
                  <div class="text-weight-medium">{{ category.name }}</div>
                  <q-chip
                    v-if="hasChildren(category)"
                    size="xs"
                    color="secondary"
                    text-color="white"
                    class="q-ml-xs"
                  >
                    {{ getChildrenCount(category.id) }}
                  </q-chip>
                </div>
                <div class="text-caption text-grey-6">
                  {{ category.slug }}
                </div>
              </div>

              <!-- Кнопка навигации для папок -->
              <q-btn
                v-if="hasChildren(category)"
                flat
                round
                dense
                icon="arrow_forward"
                color="secondary"
                @click.stop="navigateToCategory(category)"
                class="q-mr-sm"
              >
                <q-tooltip>Открыть папку</q-tooltip>
              </q-btn>

              <!-- Статус публикации -->
              <q-icon
                :name="category.is_published ? 'visibility' : 'visibility_off'"
                :color="category.is_published ? 'positive' : 'negative'"
                size="sm"
                class="q-mr-sm"
              />
            </div>
          </template>

          <!-- Детальная информация и действия -->
          <q-card flat>
            <q-card-section class="q-pt-none">
              <div class="text-body2 q-mb-md" v-if="category.brief">
                <strong>Описание:</strong><br />
                {{ category.brief }}
              </div>

              <div class="text-body2 q-mb-md" v-if="category.parent">
                <strong>Родительская категория:</strong><br />
                <q-chip color="secondary" text-color="white" size="sm" icon="folder">
                  {{ category.parent.name }}
                </q-chip>
              </div>

              <div class="text-body2 q-mb-md">
                <strong>Статус:</strong><br />
                <q-chip
                  :color="category.is_published ? 'positive' : 'negative'"
                  text-color="white"
                  size="sm"
                  :icon="category.is_published ? 'visibility' : 'visibility_off'"
                >
                  {{ category.is_published ? 'Опубликовано' : 'Скрыто' }}
                </q-chip>
              </div>

              <!-- Действия в мобильной версии -->
              <div class="column q-gutter-sm">
                <q-btn
                  v-if="hasChildren(category)"
                  unelevated
                  color="secondary"
                  icon="folder_open"
                  label="Открыть папку"
                  @click="navigateToCategory(category)"
                  class="full-width"
                />
                <q-btn
                  unelevated
                  color="primary"
                  icon="visibility"
                  label="Просмотреть детали"
                  @click="openServiceCategoryDetailFromButton(category)"
                  class="full-width"
                />
                <div class="row q-gutter-sm">
                  <q-btn
                    outline
                    color="warning"
                    icon="edit"
                    label="Изменить"
                    @click="openEditServiceCategoryDialog(category)"
                    class="col"
                  />
                  <q-btn
                    outline
                    color="negative"
                    icon="delete"
                    label="Удалить"
                    @click="confirmDeleteServiceCategory(category)"
                    class="col"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </div>

      <!-- Пустое состояние для мобильных -->
      <div v-if="filteredCategories.length === 0" class="text-center q-pa-lg">
        <q-icon name="folder_open" size="4em" color="grey-4" />
        <div class="text-grey-6 q-mt-sm">
          {{ navigationHistory.length > 1 ? 'Папка пуста' : 'Категории услуг не найдены' }}
        </div>
      </div>
    </div>

    <!-- Диалог создания/редактирования категории услуг -->
    <q-dialog v-model="serviceCategoryDialogVisible" persistent :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 600px'">
        <q-card-section>
          <div class="text-h6">
            {{ isEditing ? 'Редактировать категорию услуг' : 'Добавить категорию услуг' }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="currentServiceCategory.name"
            label="Название *"
            autofocus
            :rules="[(val) => !!val || 'Название обязательно']"
            lazy-rules
            class="q-mb-md"
          />

          <q-select
            v-model="currentServiceCategory.parent"
            :options="parentCategoryOptions"
            option-label="display_name"
            option-value="id"
            label="Родительская категория"
            emit-value
            map-options
            clearable
            :loading="parentCategoryLoading"
            @filter="filterParentCategories"
            class="q-mb-md"
            use-input
            input-debounce="1000"
          >
            <template v-slot:prepend>
              <q-icon name="folder" />
            </template>

            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey">
                  {{ parentCategoryLoading ? 'Загрузка...' : 'Категории не найдены' }}
                </q-item-section>
              </q-item>
            </template>

            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar>
                  <q-icon
                    :name="scope.opt.has_children ? 'folder' : 'folder_open'"
                    :color="scope.opt.is_published ? 'secondary' : 'grey-5'"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label
                    :class="scope.opt.is_published ? '' : 'text-grey-6'"
                    style="font-family: monospace"
                  >
                    {{ scope.opt.display_name }}
                  </q-item-label>
                  <q-item-label caption v-if="scope.opt.brief">
                    {{ scope.opt.brief }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side v-if="scope.opt.has_children">
                  <q-chip size="xs" color="primary" text-color="white">
                    {{ getChildrenCount(scope.opt.id) }}
                  </q-chip>
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <q-input
            v-model="currentServiceCategory.brief"
            label="Краткое описание"
            type="textarea"
            autogrow
            class="q-mb-md"
          />

          <q-input
            v-model.number="currentServiceCategory.order"
            label="Порядок сортировки"
            type="number"
            min="0"
            class="q-mb-md"
          />

          <q-toggle
            v-model="currentServiceCategory.is_published"
            label="Опубликовано"
            color="positive"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Отмена" v-close-popup />
          <q-btn
            flat
            label="Сохранить"
            color="primary"
            @click="saveServiceCategory"
            :loading="serviceCategoriesStore.loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Диалог детальной информации о категории услуг -->
    <q-dialog v-model="serviceCategoryDetailDialogVisible" :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 500px; max-width: 600px'">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Детали категории услуг</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedServiceCategoryDetail">
          <!-- Информация о категории услуг -->
          <q-list>
            <q-item>
              <q-item-section avatar>
                <q-avatar color="secondary" text-color="white">
                  <q-icon name="category" />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">Название</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedServiceCategoryDetail.name }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-medium">Slug</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedServiceCategoryDetail.slug }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedServiceCategoryDetail.brief">
              <q-item-section>
                <q-item-label class="text-weight-medium">Описание</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedServiceCategoryDetail.brief }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedServiceCategoryDetail.parent">
              <q-item-section>
                <q-item-label class="text-weight-medium">Родительская категория</q-item-label>
                <q-item-label caption>
                  <q-chip color="secondary" text-color="white" size="sm" icon="folder">
                    {{ selectedServiceCategoryDetail.parent.name }}
                  </q-chip>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-medium">Статус публикации</q-item-label>
                <q-item-label caption>
                  <q-chip
                    :color="selectedServiceCategoryDetail.is_published ? 'positive' : 'negative'"
                    text-color="white"
                    size="sm"
                    :icon="
                      selectedServiceCategoryDetail.is_published ? 'visibility' : 'visibility_off'
                    "
                  >
                    {{ selectedServiceCategoryDetail.is_published ? 'Опубликовано' : 'Скрыто' }}
                  </q-chip>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-medium">Порядок сортировки</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedServiceCategoryDetail.order }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedServiceCategoryDetail.creator">
              <q-item-section>
                <q-item-label class="text-weight-medium">Создатель</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedServiceCategoryDetail.creator.email }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedServiceCategoryDetail.created">
              <q-item-section>
                <q-item-label class="text-weight-medium">Дата создания</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ formatDate(selectedServiceCategoryDetail.created) }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedServiceCategoryDetail.updated">
              <q-item-section>
                <q-item-label class="text-weight-medium">Дата обновления</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ formatDate(selectedServiceCategoryDetail.updated) }}
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
import { ref, onMounted, computed } from 'vue';
import {
  useServiceCategoriesStore,
  type ServiceCategoryFile,
  type ServiceCategoryDetail,
  type ServiceCategoryCreatePayload,
  type ServiceCategoryUpdatePayload,
  type ServiceCategoryOption,
} from 'stores/service-categories.store';
import { useQuasar, date, Dialog } from 'quasar';
import type { QTableColumn } from 'quasar';

// ============================================================================
// ИНТЕРФЕЙСЫ ДЛЯ СТРОГОЙ ТИПИЗАЦИИ
// ============================================================================

/**
 * Интерфейс для формы создания/редактирования категории услуг
 */
interface ServiceCategoryFormData {
  id?: string;
  name: string;
  brief: string;
  is_published: boolean;
  parent: string | null; // ID родительской категории
  order: number;
}

/**
 * Интерфейс для узла дерева с полной типизацией
 */
interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  category: ServiceCategoryFile;
  icon: string;
  iconColor: string;
  disabled: boolean;
}

/**
 * Интерфейс для элемента истории навигации
 */
interface NavigationHistoryItem {
  id: string | null;
  name: string;
}

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ КОМПОНЕНТА
// ============================================================================

const $q = useQuasar();
const serviceCategoriesStore = useServiceCategoriesStore();

// ============================================================================
// РЕАКТИВНЫЕ ПЕРЕМЕННЫЕ
// ============================================================================

// Диалоги
const serviceCategoryDialogVisible = ref(false);
const serviceCategoryDetailDialogVisible = ref(false);
const isEditing = ref(false);
const selectedServiceCategoryDetail = ref<ServiceCategoryDetail | null>(null);

// Поиск и фильтрация
const searchQuery = ref('');
const selectedRows = ref<ServiceCategoryFile[]>([]);
const bulkOperationLoading = ref(false);

// Управление видом
const viewMode = ref<'table' | 'tree'>('table'); // По умолчанию табличный вид
const treeExpanded = ref<string[]>([]); // Развернутые узлы дерева
const treeData = ref<TreeNode[]>([]); // Данные для q-tree с правильными типами

// 🗂️ Навигация по директориям для табличного режима
const currentParentId = ref<string | null>(null); // Текущая директория
const navigationHistory = ref<NavigationHistoryItem[]>([{ id: null, name: 'Корень' }]); // История навигации для хлебных крошек

// Автокомплит родительских категорий
const parentCategoryOptions = ref<ServiceCategoryOption[]>([]);
const parentCategoryLoading = ref(false);
const lastSearchQuery = ref(''); // Кэш последнего поискового запроса

// 🎯 Глобальный кеш для всех данных
const allCategoriesCache = ref<ServiceCategoryFile[]>([]);
const isCacheLoaded = ref(false);

// Форма категории
const currentServiceCategory = ref<ServiceCategoryFormData>({
  name: '',
  brief: '',
  is_published: true,
  parent: null,
  order: 0,
});

// ============================================================================
// КОНФИГУРАЦИЯ ТАБЛИЦЫ
// ============================================================================

const columns: QTableColumn[] = [
  { name: 'name', required: true, label: 'Название', align: 'left', field: 'name', sortable: true },
  { name: 'brief', label: 'Описание', field: 'brief', align: 'left', sortable: false },
  { name: 'parent', label: 'Родительская', field: 'parent', align: 'left', sortable: false },
  { name: 'is_published', label: 'Статус', field: 'is_published', align: 'center', sortable: true },
  { name: 'order', label: 'Порядок', field: 'order', align: 'center', sortable: true },
  { name: 'actions', label: 'Действия', field: 'id', align: 'right' },
];

// ============================================================================
// COMPUTED СВОЙСТВА
// ============================================================================

/**
 * Фильтрованные категории для текущего уровня навигации
 */
const filteredCategories = computed(() => {
  if (!isCacheLoaded.value || allCategoriesCache.value.length === 0) {
    return [];
  }

  let categories = allCategoriesCache.value.filter((category) => {
    const categoryParentId = category.parent?.id || null;
    return categoryParentId === currentParentId.value;
  });

  // Применяем поиск если есть запрос
  if (searchQuery.value.trim().length >= 1) {
    const query = searchQuery.value.toLowerCase();
    categories = categories.filter(
      (category) =>
        category.name.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query) ||
        (category.brief && category.brief.toLowerCase().includes(query)),
    );
  }

  // Сортируем по order, затем по имени
  return categories.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.name.localeCompare(b.name);
  });
});

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Проверяет, есть ли у категории дочерние элементы
 */
function hasChildren(category: ServiceCategoryFile): boolean {
  if (!category) {
    return false;
  }
  return category.has_children;
}

/**
 * Подсчитывает количество дочерних элементов
 */
function getChildrenCount(categoryId: string): number {
  if (!categoryId || !allCategoriesCache.value) {
    return 0;
  }

  return allCategoriesCache.value.filter((item) => {
    return item.parent?.id === categoryId;
  }).length;
}

/**
 * Type guard для проверки валидности элемента навигации
 */
function isValidNavigationItem(item: unknown): item is NavigationHistoryItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    'name' in item &&
    (typeof (item as NavigationHistoryItem).id === 'string' ||
      (item as NavigationHistoryItem).id === null) &&
    typeof (item as NavigationHistoryItem).name === 'string'
  );
}

/**
 * Получает текущий путь навигации
 */
function getCurrentNavigationPath(): string {
  if (navigationHistory.value.length === 0) {
    return 'Корень';
  }
  return navigationHistory.value.map((item: NavigationHistoryItem) => item.name).join(' > ');
}

/**
 * Получает текущий заголовок для таблицы
 */
function getCurrentTableTitle(): string {
  const lastItem = getLastNavigationItem();
  return `Категории услуг: ${lastItem?.name || 'Корень'}`;
}

/**
 * Получает последний элемент навигации
 */
function getLastNavigationItem(): NavigationHistoryItem | undefined {
  if (navigationHistory.value.length === 0) {
    return undefined;
  }
  return navigationHistory.value[navigationHistory.value.length - 1];
}

// ============================================================================
// 🎯 ПРОСТАЯ СИСТЕМА ЗАГРУЗКИ И КЕШИРОВАНИЯ
// ============================================================================

/**
 * Загружает все данные и кеширует их
 */
async function loadAllCategories(): Promise<void> {
  if (isCacheLoaded.value) {
    console.log('🎯 Используем кешированные данные:', allCategoriesCache.value.length);
    return;
  }

  console.log('🔄 Загружаем все категории...');

  try {
    const allCategories = await serviceCategoriesStore.loadAllCategoriesIntoCache();
    allCategoriesCache.value = allCategories;
    isCacheLoaded.value = true;

    console.log(`✅ Загружено и кешировано: ${allCategories.length} категорий`);
  } catch (error) {
    console.error('Ошибка при загрузке категорий:', error);
    throw error;
  }
}

/**
 * Сбрасывает кеш после изменений
 */
function resetCache(): void {
  console.log('🗑️ Сбрасываем кеш...');
  isCacheLoaded.value = false;
  allCategoriesCache.value = [];
  serviceCategoriesStore.invalidateCache();
}

// ============================================================================
// ФУНКЦИИ ДЛЯ ДЕРЕВА
// ============================================================================

/**
 * Строит данные для дерева
 */
function buildTreeData(categories: ServiceCategoryFile[]): TreeNode[] {
  if (categories.length === 0) {
    return [];
  }

  const childrenMap = new Map<string | null, ServiceCategoryFile[]>();

  categories.forEach((category) => {
    const parentId = category.parent?.id || null;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    const children = childrenMap.get(parentId);
    if (children) {
      children.push(category);
    }
  });

  function buildNode(category: ServiceCategoryFile): TreeNode {
    const children = childrenMap.get(category.id) || [];
    const sortedChildren = children
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map((child) => buildNode(child));

    const node: TreeNode = {
      id: category.id,
      label: category.name,
      category: category,
      icon: category.has_children ? 'folder' : 'description',
      iconColor: category.is_published ? 'primary' : 'grey-5',
      disabled: !category.is_published,
    };

    if (sortedChildren.length > 0) {
      node.children = sortedChildren;
    }

    return node;
  }

  const rootItems = categories
    .filter((item) => item.parent === null)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  return rootItems.map((root) => buildNode(root));
}

/**
 * Обновляет данные дерева
 */
async function updateTreeData(): Promise<void> {
  try {
    console.log('🌳 Строим дерево...');

    await loadAllCategories();

    if (allCategoriesCache.value.length === 0) {
      treeData.value = [];
      return;
    }

    treeData.value = buildTreeData(allCategoriesCache.value);
    treeExpanded.value = allCategoriesCache.value
      .filter((item) => item.parent === null)
      .map((item) => item.id);

    console.log(`🌳 Дерево построено: ${allCategoriesCache.value.length} элементов`);
  } catch (error) {
    console.error('Ошибка при построении дерева:', error);
    treeData.value = [];
    $q.notify({
      type: 'negative',
      message: 'Ошибка при загрузке дерева категорий',
    });
  }
}

// ============================================================================
// ФУНКЦИИ НАВИГАЦИИ
// ============================================================================

/**
 * Навигация в категорию
 */
function navigateToCategory(category: ServiceCategoryFile): void {
  if (!category || !category.has_children) {
    return;
  }

  // Предотвращаем циклическую навигацию
  const isAlreadyInHistory = navigationHistory.value.some((item) => item.id === category.id);
  if (isAlreadyInHistory) {
    return;
  }

  currentParentId.value = category.id;
  navigationHistory.value.push({
    id: category.id,
    name: category.name,
  });

  selectedRows.value = [];
  searchQuery.value = '';

  console.log(`📁 Навигация в папку: ${category.name}`);
}

/**
 * Возврат назад
 */
function navigateBack(): void {
  if (navigationHistory.value.length <= 1) {
    return;
  }

  navigationHistory.value.pop();
  const previousLevel = navigationHistory.value[navigationHistory.value.length - 1];

  if (!isValidNavigationItem(previousLevel)) {
    resetNavigation();
    return;
  }

  currentParentId.value = previousLevel.id;
  selectedRows.value = [];
  searchQuery.value = '';

  console.log(`🔙 Возврат к: ${previousLevel.name}`);
}

/**
 * Переход к уровню
 */
function navigateToLevel(targetIndex: number): void {
  if (targetIndex < 0 || targetIndex >= navigationHistory.value.length) {
    return;
  }

  const targetLevel = navigationHistory.value[targetIndex];

  if (!isValidNavigationItem(targetLevel)) {
    resetNavigation();
    return;
  }

  navigationHistory.value = navigationHistory.value.slice(0, targetIndex + 1);
  currentParentId.value = targetLevel.id;
  selectedRows.value = [];
  searchQuery.value = '';

  console.log(`🎯 Переход к уровню: ${targetLevel.name}`);
}

/**
 * Сброс к корню
 */
function resetNavigation(): void {
  currentParentId.value = null;
  navigationHistory.value = [{ id: null, name: 'Корень' }];
  selectedRows.value = [];
  searchQuery.value = '';

  console.log('🏠 Сброс к корню');
}

// ============================================================================
// ФУНКЦИИ ПОИСКА
// ============================================================================

/**
 * Простой поиск по кешу
 */
function onSearchInput(value: string | number | null): void {
  const searchValue = value ? String(value).trim() : '';
  searchQuery.value = searchValue;

  console.log(`🔍 Поиск: "${searchValue}" на уровне "${getCurrentNavigationPath()}"`);
}

/**
 * Очистка поиска
 */
function clearSearch(): void {
  searchQuery.value = '';
  console.log('🗑️ Поиск очищен');
}

// ============================================================================
// ФУНКЦИИ УПРАВЛЕНИЯ ВИДОМ
// ============================================================================

/**
 * Переключение режима просмотра
 */
async function toggleViewMode(newMode: 'table' | 'tree'): Promise<void> {
  console.log(`🔄 Переключение в режим: ${newMode}`);

  viewMode.value = newMode;
  selectedRows.value = [];
  searchQuery.value = '';

  // Загружаем данные если еще не загружены
  await loadAllCategories();

  if (viewMode.value === 'tree') {
    await updateTreeData();
  } else {
    resetNavigation();
  }
}

/**
 * Управление выбором строк в мобильной версии
 */
function toggleRowSelection(category: ServiceCategoryFile, selected: boolean): void {
  if (!category) {
    return;
  }

  if (selected) {
    if (!selectedRows.value.some((row: ServiceCategoryFile) => row.id === category.id)) {
      selectedRows.value.push(category);
    }
  } else {
    selectedRows.value = selectedRows.value.filter(
      (row: ServiceCategoryFile) => row.id !== category.id,
    );
  }
}

// ============================================================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================================================

/**
 * Обработка кликов по таблице
 */
async function handleTableRowClick(evt: Event, row: ServiceCategoryFile): Promise<void> {
  if (!row) {
    return;
  }

  const target = evt.target as HTMLElement;

  if (target.closest('.q-btn') || target.closest('button') || target.closest('.q-checkbox')) {
    return;
  }

  // Если это папка - проваливаемся в неё
  if (hasChildren(row)) {
    navigateToCategory(row);
  } else {
    await openServiceCategoryDetailDialog(evt, row);
  }
}

// ============================================================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С АВТОКОМПЛИТОМ
// ============================================================================

/**
 * Загружает опции для автокомплита родительских категорий
 */
async function loadParentCategoryOptions(searchQuery = ''): Promise<void> {
  if (searchQuery === lastSearchQuery.value && parentCategoryOptions.value.length > 0) {
    return;
  }

  if (parentCategoryLoading.value) {
    return;
  }

  parentCategoryLoading.value = true;
  try {
    const options = await serviceCategoriesStore.searchCategoriesForAutocomplete(searchQuery);

    if (options) {
      parentCategoryOptions.value = options.filter(
        (option) => !isEditing.value || option.id !== currentServiceCategory.value.id,
      );
    } else {
      parentCategoryOptions.value = [];
    }

    lastSearchQuery.value = searchQuery;
  } catch (error) {
    console.error('Error loading parent category options:', error);
    parentCategoryOptions.value = [];
  } finally {
    parentCategoryLoading.value = false;
  }
}

let isFilteringInProgress = false;

/**
 * Функция для фильтрации родительских категорий в автокомплите
 */
function filterParentCategories(val: string, update: (fn: () => void) => void): void {
  if (isFilteringInProgress) {
    return;
  }

  if (val.length > 0 && val.length < 2) {
    update(() => {
      parentCategoryOptions.value = [];
    });
    return;
  }

  isFilteringInProgress = true;

  update(() => {
    void loadParentCategoryOptions(val).finally(() => {
      isFilteringInProgress = false;
    });
  });
}

// ============================================================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С ДИАЛОГАМИ
// ============================================================================

/**
 * Открытие детального просмотра категории
 */
async function openServiceCategoryDetailFromButton(row: ServiceCategoryFile): Promise<void> {
  if (!row || !row.id) {
    console.error('Ошибка: row или row.id is undefined');
    return;
  }

  try {
    const fullCategoryData = await serviceCategoriesStore.fetchServiceCategoryById(row.id);
    if (fullCategoryData) {
      selectedServiceCategoryDetail.value = fullCategoryData;
      serviceCategoryDetailDialogVisible.value = true;
    } else {
      throw new Error('Не удалось получить данные категории');
    }
  } catch (error) {
    console.error('Ошибка при загрузке данных категории:', error);
    $q.notify({
      type: 'negative',
      message: 'Ошибка при загрузке данных категории',
    });
  }
}

/**
 * Открытие диалога создания категории
 */
async function openCreateServiceCategoryDialog(): Promise<void> {
  isEditing.value = false;
  currentServiceCategory.value = {
    name: '',
    brief: '',
    is_published: true,
    parent: currentParentId.value, // Устанавливаем текущий уровень как родительский
    order: 0,
  };
  await loadParentCategoryOptions();
  serviceCategoryDialogVisible.value = true;
}

/**
 * Открытие диалога редактирования категории
 */
async function openEditServiceCategoryDialog(category: ServiceCategoryFile): Promise<void> {
  if (!category || !category.id) {
    console.error('Ошибка: category или category.id is undefined');
    return;
  }

  isEditing.value = true;

  try {
    const fullCategoryData = await serviceCategoriesStore.fetchServiceCategoryById(category.id);

    if (fullCategoryData) {
      currentServiceCategory.value = {
        id: fullCategoryData.id,
        name: fullCategoryData.name,
        brief: fullCategoryData.brief || '',
        is_published: fullCategoryData.is_published,
        parent: fullCategoryData.parent?.id || null,
        order: fullCategoryData.order,
      };
    } else {
      // Запасной вариант, если не удалось получить полные данные
      currentServiceCategory.value = {
        id: category.id,
        name: category.name,
        brief: category.brief || '',
        is_published: category.is_published,
        parent: category.parent?.id || null,
        order: category.order,
      };
    }

    await loadParentCategoryOptions();
    serviceCategoryDialogVisible.value = true;
  } catch (error) {
    console.error('Ошибка при загрузке данных для редактирования:', error);
    $q.notify({
      type: 'negative',
      message: 'Ошибка при загрузке данных категории',
    });
  }
}

/**
 * Открытие детального диалога через клик по строке таблицы
 */
async function openServiceCategoryDetailDialog(
  evt: Event,
  row: ServiceCategoryFile,
): Promise<void> {
  if (!row || !row.id) {
    return;
  }

  const target = evt.target as HTMLElement;
  if (target.closest('.q-btn') || target.closest('button')) {
    return;
  }

  try {
    const fullCategoryData = await serviceCategoriesStore.fetchServiceCategoryById(row.id);
    if (fullCategoryData) {
      selectedServiceCategoryDetail.value = fullCategoryData;
      serviceCategoryDetailDialogVisible.value = true;
    } else {
      throw new Error('Не удалось получить данные категории');
    }
  } catch (error) {
    console.error('Ошибка при загрузке данных категории:', error);
    $q.notify({
      type: 'negative',
      message: 'Ошибка при загрузке данных категории',
    });
  }
}

// ============================================================================
// CRUD ОПЕРАЦИИ
// ============================================================================

/**
 * Сохранение категории
 */
async function saveServiceCategory(): Promise<void> {
  if (!currentServiceCategory.value.name) {
    $q.notify({ type: 'negative', message: 'Название категории услуг обязательно.' });
    return;
  }

  const basePayload = {
    name: currentServiceCategory.value.name,
    is_published: currentServiceCategory.value.is_published,
    parent: currentServiceCategory.value.parent,
    order: currentServiceCategory.value.order,
  };

  const payload: ServiceCategoryCreatePayload | ServiceCategoryUpdatePayload = {
    ...basePayload,
    ...(currentServiceCategory.value.brief && { brief: currentServiceCategory.value.brief }),
  };

  let success = false;

  try {
    if (isEditing.value && currentServiceCategory.value.id) {
      const updatedCategory = await serviceCategoriesStore.updateServiceCategory(
        currentServiceCategory.value.id,
        payload as ServiceCategoryUpdatePayload,
      );
      if (updatedCategory) success = true;
    } else {
      const newCategory = await serviceCategoriesStore.createServiceCategory(
        payload as ServiceCategoryCreatePayload,
      );
      if (newCategory) success = true;
    }
  } catch (error) {
    console.error('Ошибка при сохранении категории:', error);
    $q.notify({
      type: 'negative',
      message: 'Ошибка при сохранении категории',
    });
    return;
  }

  if (success) {
    serviceCategoryDialogVisible.value = false;

    // Сбрасываем кеш и перезагружаем данные
    resetCache();
    await loadAllCategories();

    if (viewMode.value === 'tree') {
      await updateTreeData();
    }

    $q.notify({
      type: 'positive',
      message: isEditing.value ? 'Категория успешно обновлена' : 'Категория успешно создана',
    });
  }
}

/**
 * Подтверждение массового удаления
 */
function confirmBulkDelete(): void {
  if (selectedRows.value.length === 0) {
    $q.notify({
      type: 'warning',
      message: 'Не выбрано ни одной категории для удаления',
    });
    return;
  }

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

/**
 * Массовое удаление
 */
async function bulkDelete(): Promise<void> {
  if (selectedRows.value.length === 0) {
    return;
  }

  bulkOperationLoading.value = true;
  try {
    const idsToDelete = selectedRows.value.map((row: ServiceCategoryFile) => row.id);

    if (idsToDelete.length === 0) {
      throw new Error('Не выбрано ни одной категории для удаления');
    }

    const success = await serviceCategoriesStore.bulkDeleteServiceCategories(idsToDelete);

    if (success) {
      selectedRows.value = [];

      // Сбрасываем кеш и перезагружаем данные
      resetCache();
      await loadAllCategories();

      if (viewMode.value === 'tree') {
        await updateTreeData();
      }

      $q.notify({
        type: 'positive',
        message: 'Выбранные категории успешно удалены',
      });
    }
  } catch (error) {
    console.error('Ошибка при массовом удалении:', error);
    $q.notify({
      type: 'negative',
      message: 'Ошибка при удалении категорий',
    });
  } finally {
    bulkOperationLoading.value = false;
  }
}

/**
 * Подтверждение удаления одной категории
 */
function confirmDeleteServiceCategory(category: ServiceCategoryFile): void {
  if (!category || !category.id) {
    console.error('Ошибка: category или category.id is undefined');
    return;
  }

  Dialog.create({
    title: 'Подтвердите удаление',
    message: `Вы уверены, что хотите удалить категорию услуг "${category.name}"?`,
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
    void handleDeleteServiceCategory(category.id);
  });
}

/**
 * Удаление одной категории
 */
async function handleDeleteServiceCategory(categoryId: string): Promise<void> {
  if (!categoryId) {
    console.error('Ошибка: categoryId is undefined');
    return;
  }

  try {
    const success = await serviceCategoriesStore.deleteServiceCategory(categoryId);
    if (success) {
      // Сбрасываем кеш и перезагружаем данные
      resetCache();
      await loadAllCategories();

      if (viewMode.value === 'tree') {
        await updateTreeData();
      }

      $q.notify({
        type: 'positive',
        message: 'Категория успешно удалена',
      });
    }
  } catch (error: unknown) {
    $q.notify({
      type: 'negative',
      message: 'Ошибка при удалении категории услуг',
    });
    console.error('Delete service category error:', error);
  }
}

/**
 * Редактирование из детального просмотра
 */
async function editFromDetail(): Promise<void> {
  if (selectedServiceCategoryDetail.value) {
    serviceCategoryDetailDialogVisible.value = false;
    await openEditServiceCategoryDialog(selectedServiceCategoryDetail.value);
  }
}

/**
 * Удаление из детального просмотра
 */
function deleteFromDetail(): void {
  if (selectedServiceCategoryDetail.value) {
    serviceCategoryDetailDialogVisible.value = false;
    confirmDeleteServiceCategory(selectedServiceCategoryDetail.value);
  }
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Форматирование даты
 */
function formatDate(dateString: string): string {
  if (!dateString) {
    return '';
  }
  return date.formatDate(dateString, 'DD.MM.YYYY HH:mm');
}

/**
 * Инициализация приложения
 */
async function initializeApp(): Promise<void> {
  try {
    console.log('🚀 Инициализация приложения...');

    await loadAllCategories();

    if (viewMode.value === 'tree') {
      await updateTreeData();
    } else {
      resetNavigation();
    }

    console.log('✅ Приложение инициализировано');
  } catch (error) {
    console.error('❌ Ошибка инициализации:', error);
    $q.notify({
      type: 'negative',
      message: 'Ошибка при загрузке данных',
    });
  }
}

// ============================================================================
// ЖИЗНЕННЫЙ ЦИКЛ
// ============================================================================

/**
 * Инициализация компонента
 */
onMounted(async () => {
  await initializeApp();
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

.service-categories-table {
  .q-table th,
  .q-table td {
    &:last-child {
      text-align: right;
    }
  }
}

.service-category-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

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

.tree-view {
  .q-tree {
    .q-tree__node-header {
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 2px;

      &:hover {
        background-color: rgba(0, 0, 0, 0.04);
      }
    }

    .q-tree__node-header-content {
      flex: 1;
    }

    .q-tree__arrow {
      color: var(--q-primary);
    }
  }

  .q-card {
    border-radius: 8px;
    overflow: hidden;
  }
}
</style>
