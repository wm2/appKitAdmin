<template>
  <q-page padding>
    <!-- Адаптивный заголовок -->
    <div class="q-mb-md">
      <!-- Основной заголовок и кнопка добавления -->
      <div class="row justify-between items-center">
        <div class="text-h5">Управление свойствами товаров/услуг</div>
        <q-btn
          color="primary"
          icon="add"
          @click="openCreateAttributeTypeDialog"
          :label="$q.screen.gt.xs ? 'Добавить свойство' : ''"
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
                    @click="bulkShowInFilters"
                    :loading="bulkOperationLoading"
                    label="Показать в фильтрах"
                  />
                  <q-btn
                    :dense="$q.screen.xs"
                    :size="$q.screen.xs ? 'md' : 'md'"
                    flat
                    color="orange"
                    icon="visibility_off"
                    @click="bulkHideFromFilters"
                    :loading="bulkOperationLoading"
                    label="Скрыть из фильтров"
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
        placeholder="Поиск по названию свойства..."
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
    <div v-if="attributesStore.loading" class="flex flex-center q-pa-md">
      <q-spinner color="primary" size="3em" />
    </div>

    <!-- Десктопная таблица -->
    <div v-if="!attributesStore.loading && $q.screen.gt.xs" class="desktop-view">
      <q-table
        title="Свойства товаров/услуг"
        :rows="attributesStore.attributeTypes"
        :columns="columns"
        row-key="id"
        :loading="attributesStore.loading"
        v-model:pagination="attributesStore.qTablePagination"
        v-model:selected="selectedRows"
        selection="multiple"
        @request="onRequest"
        @row-click="openAttributeTypeDetailDialog"
        binary-state-sort
        :rows-per-page-options="[5, 10, 20, 30, 50]"
        class="cursor-pointer attributes-table"
      >
        <template v-slot:body-cell-is_required="props">
          <q-td :props="props">
            <q-icon
              :name="props.row.is_required ? 'check_circle' : 'cancel'"
              :color="props.row.is_required ? 'green' : 'red'"
              size="sm"
            />
            <span class="q-ml-sm">{{
              props.row.is_required ? 'Обязательный' : 'Необязательный'
            }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-show_in_filters="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.show_in_filters ? 'green' : 'grey'"
              :icon="props.row.show_in_filters ? 'filter_list' : 'filter_list_off'"
              text-color="white"
              dense
              size="md"
              clickable
              @click.stop="confirmToggleFilterStatus(props.row)"
            >
              {{ props.row.show_in_filters ? 'Показан в фильтрах' : 'Скрыт из фильтров' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-values_count="props">
          <q-td :props="props">
            <q-btn
              flat
              dense
              :label="props.row.values.length"
              color="primary"
              @click.stop="openValuesDialog(props.row)"
            >
              <q-tooltip>Управление значениями</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <div class="row no-wrap q-gutter-xs justify-end">
              <q-btn
                flat
                round
                dense
                icon="list"
                color="primary"
                @click.stop="openValuesDialog(props.row)"
              >
                <q-tooltip>Управление значениями</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="visibility"
                color="primary"
                @click.stop="openAttributeTypeDetailFromButton(props.row)"
              >
                <q-tooltip>Просмотр</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="edit"
                @click.stop="openEditAttributeTypeDialog(props.row)"
              >
                <q-tooltip>Редактировать</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click.stop="confirmDeleteAttributeType(props.row)"
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
    <div v-if="!attributesStore.loading && $q.screen.xs" class="mobile-view">
      <!-- Информация о количестве и пагинации -->
      <div class="row items-center justify-between q-mb-md">
        <div class="text-caption text-grey-7">Всего: {{ attributesStore.totalCount }}</div>
        <div class="row q-gutter-xs">
          <q-btn
            flat
            dense
            icon="chevron_left"
            @click="attributesStore.goToPreviousPage"
            :disable="!attributesStore.hasPrevious"
          />
          <span class="text-caption q-px-sm">
            {{ attributesStore.currentPage }} / {{ attributesStore.totalPages }}
          </span>
          <q-btn
            flat
            dense
            icon="chevron_right"
            @click="attributesStore.goToNextPage"
            :disable="!attributesStore.hasNext"
          />
        </div>
      </div>

      <!-- Список карточек -->
      <div class="q-gutter-sm">
        <q-expansion-item
          v-for="attributeType in attributesStore.attributeTypes"
          :key="attributeType.id"
          class="attribute-card"
          :header-class="selectedRows.some((row) => row.id === attributeType.id) ? 'bg-blue-1' : ''"
        >
          <template v-slot:header>
            <div class="row items-center full-width no-wrap">
              <!-- Чекбокс для выбора -->
              <q-checkbox
                :model-value="selectedRows.some((row) => row.id === attributeType.id)"
                @update:model-value="(val) => toggleRowSelection(attributeType, val)"
                class="q-mr-sm"
                @click.stop
              />

              <!-- Основная информация -->
              <div class="col-grow q-mr-md">
                <div class="text-weight-medium">{{ attributeType.name }}</div>
                <div class="text-caption text-grey-6">
                  Значений: {{ attributeType.values.length }} | Порядок: {{ attributeType.order }}
                </div>
                <div class="row q-gutter-xs q-mt-xs items-center">
                  <q-chip
                    v-if="attributeType.is_required"
                    size="xs"
                    color="orange"
                    text-color="white"
                    label="Обязательный"
                  />
                  <q-chip
                    v-if="attributeType.show_in_filters"
                    size="xs"
                    color="green"
                    text-color="white"
                    label="В фильтрах"
                  />
                  <!-- Показываем первые несколько цветовых маркеров -->
                  <div
                    v-if="attributeType.values.some((v) => v.color_code)"
                    class="row q-gutter-xs items-center"
                  >
                    <q-badge
                      v-for="(value, index) in attributeType.values
                        .filter((v) => v.color_code)
                        .slice(0, 4)"
                      :key="value.id"
                      :style="`background-color: ${value.color_code}`"
                      rounded
                      outline
                      style="width: 12px; height: 12px; min-width: 12px; border: 1px solid #ddd"
                    />
                    <span
                      v-if="attributeType.values.filter((v) => v.color_code).length > 4"
                      class="text-caption text-grey-6"
                    >
                      +{{ attributeType.values.filter((v) => v.color_code).length - 4 }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Статус в фильтрах -->
              <q-btn
                :color="attributeType.show_in_filters ? 'green' : 'grey'"
                text-color="white"
                dense
                size="sm"
                @click.stop="confirmToggleFilterStatus(attributeType)"
                class="q-mr-md"
                :icon="attributeType.show_in_filters ? 'filter_list' : 'filter_list_off'"
              />
            </div>
          </template>

          <!-- Детальная информация и действия -->
          <q-card flat>
            <q-card-section class="q-pt-none">
              <div class="text-body2 q-mb-md">
                <div>
                  <strong>Максимум значений на товар:</strong>
                  {{ attributeType.max_values_per_product }}
                </div>
                <div>
                  <strong>Обязательный:</strong> {{ attributeType.is_required ? 'Да' : 'Нет' }}
                </div>
                <div>
                  <strong>Показан в фильтрах:</strong>
                  {{ attributeType.show_in_filters ? 'Да' : 'Нет' }}
                </div>
              </div>

              <!-- Действия в мобильной версии -->
              <div class="column q-gutter-sm">
                <q-btn
                  unelevated
                  color="primary"
                  icon="list"
                  label="Управление значениями"
                  @click="openValuesDialog(attributeType)"
                  class="full-width"
                />
                <q-btn
                  unelevated
                  color="secondary"
                  icon="visibility"
                  label="Просмотреть детали"
                  @click="openAttributeTypeDetailFromButton(attributeType)"
                  class="full-width"
                />
                <div class="row q-gutter-sm">
                  <q-btn
                    outline
                    color="warning"
                    icon="edit"
                    label="Изменить"
                    @click="openEditAttributeTypeDialog(attributeType)"
                    class="col"
                  />
                  <q-btn
                    outline
                    color="negative"
                    icon="delete"
                    label="Удалить"
                    @click="confirmDeleteAttributeType(attributeType)"
                    class="col"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </div>

      <!-- Пустое состояние для мобильных -->
      <div v-if="attributesStore.attributeTypes.length === 0" class="text-center q-pa-lg">
        <q-icon name="category" size="4em" color="grey-4" />
        <div class="text-grey-6 q-mt-sm">Свойства не найдены</div>
      </div>
    </div>

    <!-- Диалог создания/редактирования типа атрибута -->
    <q-dialog v-model="attributeTypeDialogVisible" persistent :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 500px'">
        <q-card-section>
          <div class="text-h6">
            {{ isEditing ? 'Редактировать свойство' : 'Добавить свойство' }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="currentAttributeType.name"
            label="Название *"
            autofocus
            :rules="[(val) => !!val || 'Название обязательно']"
            lazy-rules
          />

          <q-input
            v-model.number="currentAttributeType.max_values_per_product"
            label="Максимум значений на товар *"
            type="number"
            min="1"
            :rules="[(val) => val > 0 || 'Значение должно быть больше 0']"
            lazy-rules
          />

          <q-input
            v-model.number="currentAttributeType.order"
            label="Порядок сортировки"
            type="number"
            min="0"
          />

          <q-toggle
            v-model="currentAttributeType.is_required"
            label="Обязательный атрибут"
            left-label
          />

          <q-toggle
            v-model="currentAttributeType.show_in_filters"
            label="Показывать в фильтрах"
            left-label
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Отмена" v-close-popup />
          <q-btn
            flat
            label="Сохранить"
            color="primary"
            @click="saveAttributeType"
            :loading="attributesStore.loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Диалог детальной информации о типе атрибута -->
    <q-dialog v-model="attributeTypeDetailDialogVisible" :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 600px; max-width: 800px'">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Детали свойства</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedAttributeTypeDetail">
          <q-list>
            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-medium">Название</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedAttributeTypeDetail.name }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedAttributeTypeDetail.slug">
              <q-item-section>
                <q-item-label class="text-weight-medium">Slug</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedAttributeTypeDetail.slug }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-medium">Максимум значений на товар</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedAttributeTypeDetail.max_values_per_product }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-medium">Порядок сортировки</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ selectedAttributeTypeDetail.order }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-medium">Обязательный</q-item-label>
                <q-item-label caption>
                  <q-chip
                    :color="selectedAttributeTypeDetail.is_required ? 'green' : 'grey'"
                    text-color="white"
                    size="sm"
                  >
                    {{ selectedAttributeTypeDetail.is_required ? 'Да' : 'Нет' }}
                  </q-chip>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-medium">Показан в фильтрах</q-item-label>
                <q-item-label caption>
                  <q-chip
                    :color="selectedAttributeTypeDetail.show_in_filters ? 'green' : 'grey'"
                    text-color="white"
                    size="sm"
                  >
                    {{ selectedAttributeTypeDetail.show_in_filters ? 'Да' : 'Нет' }}
                  </q-chip>
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label class="text-weight-medium">Значения свойства</q-item-label>
                <q-item-label caption class="text-body1 q-mb-sm">
                  Всего: {{ selectedAttributeTypeDetail.values.length }}
                </q-item-label>
                <!-- Показываем все значения чипсами -->
                <div class="row q-gutter-sm" style="max-width: 100%; flex-wrap: wrap">
                  <q-chip
                    v-for="value in selectedAttributeTypeDetail.values"
                    :key="value.id"
                    :style="
                      value.color_code ? `background-color: ${value.color_code}; color: white;` : ''
                    "
                    :color="!value.color_code ? 'grey-3' : undefined"
                    :text-color="!value.color_code ? 'grey-8' : undefined"
                    size="md"
                    class="shadow-1"
                  >
                    {{ value.value }}
                  </q-chip>
                </div>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedAttributeTypeDetail.created">
              <q-item-section>
                <q-item-label class="text-weight-medium">Дата создания</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ formatDate(selectedAttributeTypeDetail.created) }}
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedAttributeTypeDetail.updated">
              <q-item-section>
                <q-item-label class="text-weight-medium">Дата обновления</q-item-label>
                <q-item-label caption class="text-body1">
                  {{ formatDate(selectedAttributeTypeDetail.updated) }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            :label="$q.screen.xs ? '' : 'Управление значениями'"
            color="secondary"
            @click="openValuesFromDetail"
            icon="list"
            :round="$q.screen.xs"
          />
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

    <!-- Диалог управления значениями атрибута -->
    <q-dialog
      v-model="valuesDialogVisible"
      persistent
      :maximized="$q.screen.xs"
      @hide="onValuesDialogClose"
    >
      <q-card :style="$q.screen.xs ? '' : 'min-width: 700px; max-width: 900px'">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Значения свойства: {{ selectedAttributeTypeForValues?.name }}</div>
          <q-space />
          <q-btn
            color="primary"
            icon="add"
            @click="openCreateValueDialog"
            :label="$q.screen.gt.xs ? 'Добавить значение' : ''"
            :round="$q.screen.xs"
            class="q-mr-sm"
          />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <!-- Список значений -->
          <q-list bordered separator>
            <q-item
              v-for="value in attributesStore.attributeValues"
              :key="value.id"
              clickable
              @click="openEditValueDialog(value)"
            >
              <q-item-section>
                <q-item-label>{{ value.value }}</q-item-label>
                <q-item-label caption>
                  Порядок: {{ value.order }}
                  <span v-if="value.color_code"> | Цвет: {{ value.color_code }}</span>
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <div class="row q-gutter-xs items-center">
                  <!-- Цветовой маркер -->
                  <q-badge
                    v-if="value.color_code"
                    :style="`background-color: ${value.color_code}`"
                    rounded
                    outline
                    class="q-mr-xs"
                    style="width: 16px; height: 16px; min-width: 16px; border: 1px solid #ddd"
                  />

                  <!-- Кнопки действий -->
                  <q-btn flat round dense icon="edit" @click.stop="openEditValueDialog(value)" />
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    color="negative"
                    @click.stop="confirmDeleteValue(value)"
                  />
                </div>
              </q-item-section>
            </q-item>

            <q-item v-if="attributesStore.attributeValues.length === 0">
              <q-item-section class="text-center text-grey-6">
                <div>Значения не найдены</div>
                <q-btn
                  flat
                  color="primary"
                  @click="openCreateValueDialog"
                  label="Добавить первое значение"
                  class="q-mt-sm"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Диалог создания/редактирования значения атрибута -->
    <q-dialog v-model="valueDialogVisible" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">
            {{ isEditingValue ? 'Редактировать значение' : 'Добавить значение' }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="currentAttributeValue.value"
            label="Значение *"
            autofocus
            :rules="[(val) => !!val || 'Значение обязательно']"
            lazy-rules
          />

          <q-input
            v-model.number="currentAttributeValue.order"
            label="Порядок сортировки"
            type="number"
            min="0"
          />

          <!-- Переключатель цвета -->
          <q-toggle
            v-model="currentAttributeValue.hasColor"
            label="Использовать цвет"
            left-label
            class="q-mt-md"
          />

          <!-- Color picker - показываем только если включен переключатель -->
          <div v-if="currentAttributeValue.hasColor" class="q-mt-md">
            <q-field label="Выберите цвет" stack-label outlined>
              <template v-slot:control>
                <div class="column q-gutter-md full-width q-pa-md">
                  <!-- Текущий цвет и кнопки -->
                  <div class="row items-center q-gutter-md">
                    <q-avatar
                      :style="`background-color: ${currentAttributeValue.color_code}`"
                      size="48px"
                      class="shadow-2"
                    >
                      <q-icon name="palette" color="white" size="24px" />
                    </q-avatar>

                    <div class="column q-gutter-sm">
                      <q-btn
                        unelevated
                        color="primary"
                        label="Открыть палитру цветов"
                        icon="colorize"
                        @click="colorPickerVisible = true"
                      />
                      <div class="text-caption text-grey-6">
                        Текущий цвет: {{ currentAttributeValue.color_code }}
                      </div>
                    </div>
                  </div>

                  <!-- Быстрые цвета -->
                  <div>
                    <div class="text-caption text-grey-7 q-mb-sm">Быстрый выбор:</div>
                    <div class="row q-gutter-xs">
                      <q-btn
                        v-for="quickColor in quickColors"
                        :key="quickColor"
                        :style="`background-color: ${quickColor}`"
                        size="sm"
                        round
                        @click="currentAttributeValue.color_code = quickColor"
                        class="shadow-1"
                        style="width: 32px; height: 32px"
                      >
                        <q-icon
                          v-if="currentAttributeValue.color_code === quickColor"
                          name="check"
                          color="white"
                          size="16px"
                        />
                      </q-btn>
                    </div>
                  </div>
                </div>
              </template>
            </q-field>

            <!-- Color picker dialog -->
            <q-dialog v-model="colorPickerVisible" position="standard">
              <q-card style="min-width: 300px">
                <q-card-section class="row items-center q-pb-none">
                  <div class="text-h6">Выбор цвета</div>
                  <q-space />
                  <q-btn icon="close" flat round dense @click="colorPickerVisible = false" />
                </q-card-section>

                <q-card-section>
                  <q-color
                    v-model="currentAttributeValue.color_code"
                    default-view="palette"
                    format-model="hex"
                    class="full-width"
                  />
                </q-card-section>

                <q-card-actions align="right">
                  <q-btn flat label="Отмена" @click="colorPickerVisible = false" />
                  <q-btn flat label="Выбрать" color="primary" @click="colorPickerVisible = false" />
                </q-card-actions>
              </q-card>
            </q-dialog>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Отмена" v-close-popup />
          <q-btn
            flat
            label="Сохранить"
            color="primary"
            @click="saveAttributeValue"
            :loading="attributesStore.loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  useServiceAttributesStore,
  type AttributeType,
  type AttributeValue,
  type AttributeValueDetail,
  type AttributeTypeCreatePayload,
  type AttributeTypeUpdatePayload,
  type AttributeValueCreatePayload,
  type AttributeValueUpdatePayload,
} from 'stores/service-attributes.store';
import { useQuasar, date, Dialog } from 'quasar';
import type { QTableProps, QTableColumn } from 'quasar';

const $q = useQuasar();
const attributesStore = useServiceAttributesStore();

// === DIALOGS STATE ===
const attributeTypeDialogVisible = ref(false);
const attributeTypeDetailDialogVisible = ref(false);
const valuesDialogVisible = ref(false);
const valueDialogVisible = ref(false);
const colorPickerVisible = ref(false);
const returnToDetailAfterValuesClose = ref(false); // Флаг для возврата к детальной форме

// === EDITING STATE ===
const isEditing = ref(false);
const isEditingValue = ref(false);
const selectedAttributeTypeDetail = ref<AttributeType | null>(null);
const selectedAttributeTypeForValues = ref<AttributeType | null>(null);

// === SEARCH AND SELECTION ===
const searchQuery = ref('');
const selectedRows = ref<AttributeType[]>([]);
const bulkOperationLoading = ref(false);

// === QUICK COLORS ===
const quickColors = ref([
  '#F44336',
  '#E91E63',
  '#9C27B0',
  '#673AB7',
  '#3F51B5',
  '#2196F3',
  '#00BCD4',
  '#009688',
  '#4CAF50',
  '#FF9800',
  '#FF5722',
  '#795548',
]);

// === FORM DATA INTERFACES ===
interface AttributeTypeFormData {
  id?: string;
  name: string;
  max_values_per_product: number;
  is_required: boolean;
  order: number;
  show_in_filters: boolean;
}

interface AttributeValueFormData {
  id?: string;
  value: string;
  color_code?: string;
  order: number;
  hasColor: boolean; // Добавляем флаг для переключателя цвета
}

// === FORM DATA ===
const currentAttributeType = ref<AttributeTypeFormData>({
  name: '',
  max_values_per_product: 1,
  is_required: false,
  order: 0,
  show_in_filters: true,
});

const currentAttributeValue = ref<AttributeValueFormData>({
  value: '',
  color_code: '',
  order: 0,
  hasColor: false,
});

// === TABLE COLUMNS ===
const columns: QTableColumn[] = [
  { name: 'name', required: true, label: 'Название', align: 'left', field: 'name', sortable: true },
  { name: 'values_count', label: 'Значений', field: 'values', align: 'center', sortable: false },
  {
    name: 'max_values_per_product',
    label: 'Макс. значений',
    field: 'max_values_per_product',
    align: 'center',
    sortable: true,
  },
  {
    name: 'is_required',
    label: 'Обязательный',
    field: 'is_required',
    align: 'center',
    sortable: true,
  },
  {
    name: 'show_in_filters',
    label: 'В фильтрах',
    field: 'show_in_filters',
    align: 'center',
    sortable: true,
  },
  { name: 'order', label: 'Порядок', field: 'order', align: 'center', sortable: true },
  { name: 'actions', label: 'Действия', field: 'id', align: 'right' },
];

// === ROW SELECTION ===
function toggleRowSelection(attributeType: AttributeType, selected: boolean): void {
  if (selected) {
    if (!selectedRows.value.some((row) => row.id === attributeType.id)) {
      selectedRows.value.push(attributeType);
    }
  } else {
    selectedRows.value = selectedRows.value.filter((row) => row.id !== attributeType.id);
  }
}

// === TABLE ACTIONS ===
async function onRequest(props: { pagination: QTableProps['pagination'] }): Promise<void> {
  if (props.pagination) {
    await attributesStore.handleTableRequest(props);
  }
}

// === SEARCH ACTIONS ===
async function onSearchInput(value: string | number | null): Promise<void> {
  const searchValue = value ? String(value).trim() : '';
  if (searchValue.length >= 2) {
    await attributesStore.filterAttributeTypes({ name: searchValue });
  } else if (searchValue.length === 0) {
    await attributesStore.clearAttributeTypesFilters();
  }
}

async function clearSearch(): Promise<void> {
  searchQuery.value = '';
  await attributesStore.clearAttributeTypesFilters();
}

// === ATTRIBUTE TYPE DIALOG ACTIONS ===
function openCreateAttributeTypeDialog(): void {
  isEditing.value = false;
  currentAttributeType.value = {
    name: '',
    max_values_per_product: 1,
    is_required: false,
    order: 0,
    show_in_filters: true,
  };
  attributeTypeDialogVisible.value = true;
}

async function openEditAttributeTypeDialog(attributeType: AttributeType): Promise<void> {
  isEditing.value = true;

  const fullAttributeTypeData = await attributesStore.fetchAttributeTypeById(attributeType.id);
  if (fullAttributeTypeData) {
    currentAttributeType.value = {
      id: fullAttributeTypeData.id,
      name: fullAttributeTypeData.name,
      max_values_per_product: fullAttributeTypeData.max_values_per_product,
      is_required: fullAttributeTypeData.is_required,
      order: fullAttributeTypeData.order,
      show_in_filters: fullAttributeTypeData.show_in_filters,
    };
  } else {
    currentAttributeType.value = {
      id: attributeType.id,
      name: attributeType.name,
      max_values_per_product: attributeType.max_values_per_product,
      is_required: attributeType.is_required,
      order: attributeType.order,
      show_in_filters: attributeType.show_in_filters,
    };
  }
  attributeTypeDialogVisible.value = true;
}

async function saveAttributeType(): Promise<void> {
  if (!currentAttributeType.value.name) {
    $q.notify({ type: 'negative', message: 'Название свойства обязательно.' });
    return;
  }

  if (currentAttributeType.value.max_values_per_product <= 0) {
    $q.notify({ type: 'negative', message: 'Максимум значений должен быть больше 0.' });
    return;
  }

  const payload: AttributeTypeCreatePayload | AttributeTypeUpdatePayload = {
    name: currentAttributeType.value.name,
    max_values_per_product: currentAttributeType.value.max_values_per_product,
    is_required: currentAttributeType.value.is_required,
    order: currentAttributeType.value.order,
    show_in_filters: currentAttributeType.value.show_in_filters,
  };

  let success = false;
  if (isEditing.value && currentAttributeType.value.id) {
    const updatedAttributeType = await attributesStore.updateAttributeType(
      currentAttributeType.value.id,
      payload as AttributeTypeUpdatePayload,
    );
    if (updatedAttributeType) success = true;
  } else {
    const newAttributeType = await attributesStore.createAttributeType(
      payload as AttributeTypeCreatePayload,
    );
    if (newAttributeType) success = true;
  }

  if (success) {
    attributeTypeDialogVisible.value = false;
  }
}

// === DETAIL DIALOG ACTIONS ===
async function openAttributeTypeDetailFromButton(row: AttributeType): Promise<void> {
  const fullAttributeTypeData = await attributesStore.fetchAttributeTypeById(row.id);
  if (fullAttributeTypeData) {
    selectedAttributeTypeDetail.value = fullAttributeTypeData;
    attributeTypeDetailDialogVisible.value = true;
  }
}

async function openAttributeTypeDetailDialog(evt: Event, row: AttributeType): Promise<void> {
  const target = evt.target as HTMLElement;
  if (target.closest('.q-btn') || target.closest('button')) {
    return;
  }

  const fullAttributeTypeData = await attributesStore.fetchAttributeTypeById(row.id);
  if (fullAttributeTypeData) {
    selectedAttributeTypeDetail.value = fullAttributeTypeData;
    attributeTypeDetailDialogVisible.value = true;
  }
}

async function editFromDetail(): Promise<void> {
  if (selectedAttributeTypeDetail.value) {
    attributeTypeDetailDialogVisible.value = false;
    await openEditAttributeTypeDialog(selectedAttributeTypeDetail.value);
  }
}

function deleteFromDetail(): void {
  if (selectedAttributeTypeDetail.value) {
    attributeTypeDetailDialogVisible.value = false;
    confirmDeleteAttributeType(selectedAttributeTypeDetail.value);
  }
}

// === VALUES DIALOG ACTIONS ===
async function openValuesDialog(attributeType: AttributeType): Promise<void> {
  selectedAttributeTypeForValues.value = attributeType;
  await attributesStore.fetchAttributeValues(attributeType.id);
  valuesDialogVisible.value = true;
}

async function openValuesFromDetail(): Promise<void> {
  if (selectedAttributeTypeDetail.value) {
    returnToDetailAfterValuesClose.value = true; // Устанавливаем флаг возврата
    attributeTypeDetailDialogVisible.value = false;
    await openValuesDialog(selectedAttributeTypeDetail.value);
  }
}

// === VALUE DIALOG ACTIONS ===
function openCreateValueDialog(): void {
  isEditingValue.value = false;
  currentAttributeValue.value = {
    value: '',
    color_code: '#1976D2',
    order: 0,
    hasColor: false,
  };
  valueDialogVisible.value = true;
}

function openEditValueDialog(value: AttributeValueDetail): void {
  isEditingValue.value = true;
  currentAttributeValue.value = {
    id: value.id,
    value: value.value,
    color_code: value.color_code || '#1976D2',
    order: value.order,
    hasColor: !!value.color_code,
  };
  valueDialogVisible.value = true;
}

async function saveAttributeValue(): Promise<void> {
  if (!currentAttributeValue.value.value) {
    $q.notify({ type: 'negative', message: 'Значение атрибута обязательно.' });
    return;
  }

  if (!selectedAttributeTypeForValues.value) {
    $q.notify({ type: 'negative', message: 'Свойство не выбрано.' });
    return;
  }

  const payload: AttributeValueCreatePayload | AttributeValueUpdatePayload = {
    value: currentAttributeValue.value.value,
    color_code: currentAttributeValue.value.hasColor
      ? currentAttributeValue.value.color_code
      : undefined,
    order: currentAttributeValue.value.order,
  };

  let success = false;
  if (isEditingValue.value && currentAttributeValue.value.id) {
    const updatedValue = await attributesStore.updateAttributeValue(
      selectedAttributeTypeForValues.value.id,
      currentAttributeValue.value.id,
      payload as AttributeValueUpdatePayload,
    );
    if (updatedValue) success = true;
  } else {
    const newValue = await attributesStore.createAttributeValue(
      selectedAttributeTypeForValues.value.id,
      payload as AttributeValueCreatePayload,
    );
    if (newValue) success = true;
  }

  if (success) {
    valueDialogVisible.value = false;
  }
}

// === FILTER STATUS TOGGLE ===
async function toggleFilterStatus(attributeType: AttributeType): Promise<void> {
  await attributesStore.patchAttributeTypeFilterStatus(
    attributeType.id,
    !attributeType.show_in_filters,
  );
}

function confirmToggleFilterStatus(attributeType: AttributeType): void {
  if ($q.screen.xs) {
    const newStatus = !attributeType.show_in_filters;
    const action = newStatus ? 'показать в фильтрах' : 'скрыть из фильтров';

    Dialog.create({
      title: 'Подтвердите действие',
      message: `Вы уверены, что хотите ${action} свойство "${attributeType.name}"?`,
      persistent: true,
      ok: {
        label: newStatus ? 'Показать' : 'Скрыть',
        color: newStatus ? 'green' : 'orange',
      },
      cancel: {
        label: 'Отмена',
        flat: true,
      },
    }).onOk(() => {
      void toggleFilterStatus(attributeType);
    });
  } else {
    void toggleFilterStatus(attributeType);
  }
}

// === DELETE ACTIONS ===
function confirmDeleteAttributeType(attributeType: AttributeType): void {
  Dialog.create({
    title: 'Подтвердите удаление',
    message: `Вы уверены, что хотите удалить свойство "${attributeType.name}"? Это также удалит все его значения.`,
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
    void attributesStore.deleteAttributeType(attributeType.id);
  });
}

function confirmDeleteValue(value: AttributeValueDetail): void {
  if (!selectedAttributeTypeForValues.value) return;

  Dialog.create({
    title: 'Подтвердите удаление',
    message: `Вы уверены, что хотите удалить значение "${value.value}"?`,
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
    if (selectedAttributeTypeForValues.value) {
      void attributesStore.deleteAttributeValue(selectedAttributeTypeForValues.value.id, value.id);
    }
  });
}

// === BULK ACTIONS ===
function confirmBulkDelete(): void {
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

async function bulkDelete(): Promise<void> {
  bulkOperationLoading.value = true;
  try {
    const success = await attributesStore.bulkDeleteAttributeTypes(
      selectedRows.value.map((row) => row.id),
    );
    if (success) {
      selectedRows.value = [];
    }
  } finally {
    bulkOperationLoading.value = false;
  }
}

async function bulkShowInFilters(): Promise<void> {
  bulkOperationLoading.value = true;
  try {
    await Promise.all(
      selectedRows.value.map((row) => attributesStore.patchAttributeTypeFilterStatus(row.id, true)),
    );
    selectedRows.value = [];
  } finally {
    bulkOperationLoading.value = false;
  }
}

async function bulkHideFromFilters(): Promise<void> {
  bulkOperationLoading.value = true;
  try {
    await Promise.all(
      selectedRows.value.map((row) =>
        attributesStore.patchAttributeTypeFilterStatus(row.id, false),
      ),
    );
    selectedRows.value = [];
  } finally {
    bulkOperationLoading.value = false;
  }
}

// === UTILITY FUNCTIONS ===
function formatDate(dateString: string): string {
  return date.formatDate(dateString, 'DD.MM.YYYY HH:mm');
}

/**
 * Обработчик закрытия диалога управления значениями
 */
function onValuesDialogClose(): void {
  if (returnToDetailAfterValuesClose.value) {
    returnToDetailAfterValuesClose.value = false;
    // Возвращаемся к детальной форме
    setTimeout(() => {
      attributeTypeDetailDialogVisible.value = true;
    }, 100);
  }
}

// === LIFECYCLE ===
onMounted(async () => {
  await attributesStore.fetchAttributeTypes();
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

.attributes-table {
  .q-table th,
  .q-table td {
    &:last-child {
      text-align: right;
    }
  }
}

.attribute-card {
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
</style>
