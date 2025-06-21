<template>
  <q-page padding>
    <!-- Адаптивный заголовок -->
    <div class="q-mb-md">
      <!-- Основной заголовок и кнопка добавления -->
      <div class="row justify-between items-center">
        <div class="text-h5">Управление сервисами</div>
        <q-btn
          color="primary"
          icon="add"
          @click="openCreateServiceDialog"
          :label="$q.screen.gt.xs ? 'Добавить сервис' : ''"
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
        placeholder="Поиск по названию сервиса..."
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
    <div v-if="servicesStore.loading" class="flex flex-center q-pa-md">
      <q-spinner color="primary" size="3em" />
    </div>

    <!-- Десктопная таблица -->
    <div v-if="!servicesStore.loading && $q.screen.gt.xs" class="desktop-view">
      <q-table
        title="Сервисы"
        :rows="servicesStore.services"
        :columns="columns"
        row-key="id"
        :loading="servicesStore.loading"
        v-model:pagination="servicesStore.qTablePagination"
        v-model:selected="selectedRows"
        selection="multiple"
        @request="onRequest"
        @row-click="openServiceDetailDialog"
        binary-state-sort
        :rows-per-page-options="[5, 10, 20, 30, 50]"
        class="cursor-pointer services-table"
      >
        <template v-slot:body-cell-attachments="props">
          <q-td :props="props">
            <q-avatar v-if="getPrimaryImageSafe(props.row)" size="50px">
              <img
                :src="getPrimaryImageSafe(props.row) || ''"
                alt="Service image"
                style="max-width: 50px; max-height: 50px; object-fit: contain"
              />
            </q-avatar>
            <span v-else>-</span>
          </q-td>
        </template>

        <template v-slot:body-cell-price="props">
          <q-td :props="props">
            <div v-if="props.row.price">
              <span class="text-weight-medium">{{ props.row.price }} ₽</span>
              <div v-if="props.row.has_discount && props.row.old_price" class="text-caption">
                <span class="text-strike text-grey-6">{{ props.row.old_price }} ₽</span>
              </div>
            </div>
            <span v-else class="text-grey-6">-</span>
          </q-td>
        </template>

        <template v-slot:body-cell-categories="props">
          <q-td :props="props">
            <div v-if="props.row.categories.length > 0">
              <q-chip
                v-for="category in props.row.categories.slice(0, 2)"
                :key="category.id"
                size="sm"
                color="blue"
                text-color="white"
                dense
              >
                {{ category.name }}
              </q-chip>
              <q-chip
                v-if="props.row.categories.length > 2"
                size="sm"
                color="grey"
                text-color="white"
                dense
              >
                +{{ props.row.categories.length - 2 }}
              </q-chip>
            </div>
            <span v-else class="text-grey-6">-</span>
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
                @click.stop="openServiceDetailFromButton(props.row)"
              >
                <q-tooltip>Просмотр</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="edit" @click.stop="openEditServiceDialog(props.row)">
                <q-tooltip>Редактировать</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click.stop="confirmDeleteService(props.row)"
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
    <div v-if="!servicesStore.loading && $q.screen.xs" class="mobile-view">
      <!-- Информация о количестве и пагинации -->
      <div class="row items-center justify-between q-mb-md">
        <div class="text-caption text-grey-7">Всего: {{ servicesStore.totalCount }}</div>
        <div class="row q-gutter-xs">
          <q-btn
            flat
            dense
            icon="chevron_left"
            @click="servicesStore.goToPreviousPage"
            :disable="!servicesStore.hasPrevious"
          />
          <span class="text-caption q-px-sm">
            {{ servicesStore.currentPage }} / {{ servicesStore.totalPages }}
          </span>
          <q-btn
            flat
            dense
            icon="chevron_right"
            @click="servicesStore.goToNextPage"
            :disable="!servicesStore.hasNext"
          />
        </div>
      </div>

      <!-- Список карточек -->
      <div class="q-gutter-sm">
        <q-expansion-item
          v-for="service in servicesStore.services"
          :key="service.id"
          class="service-card"
          :header-class="selectedRows.some((row) => row.id === service.id) ? 'bg-blue-1' : ''"
        >
          <template v-slot:header>
            <div class="row items-center full-width no-wrap">
              <!-- Чекбокс для выбора -->
              <q-checkbox
                :model-value="selectedRows.some((row) => row.id === service.id)"
                @update:model-value="(val) => toggleRowSelection(service, val)"
                class="q-mr-sm"
                @click.stop
              />

              <!-- Аватар -->
              <q-avatar v-if="getPrimaryImageSafe(service)" size="40px" class="q-mr-md">
                <img :src="getPrimaryImageSafe(service) || ''" alt="Service image" />
              </q-avatar>
              <q-avatar v-else size="40px" class="q-mr-md bg-grey-3">
                <q-icon name="image" color="grey-6" />
              </q-avatar>

              <!-- Основная информация -->
              <div class="col-grow q-mr-md">
                <div class="text-weight-medium">{{ service.name }}</div>
                <div class="text-caption text-grey-6">{{ service.slug }}</div>
                <div v-if="service.price" class="text-caption text-primary">
                  {{ service.price }} ₽
                </div>
              </div>

              <!-- Статус публикации -->
              <q-btn
                :color="service.is_published ? 'green' : 'red'"
                text-color="white"
                dense
                size="sm"
                @click.stop="confirmTogglePublishStatus(service)"
                class="q-mr-md"
                :icon="service.is_published ? 'visibility' : 'visibility_off'"
              />
            </div>
          </template>

          <!-- Детальная информация и действия -->
          <q-card flat>
            <q-card-section class="q-pt-none">
              <!-- Категории -->
              <div v-if="service.categories.length > 0" class="q-mb-md">
                <strong>Категории:</strong><br />
                <div class="row q-gutter-xs q-mt-xs">
                  <q-chip
                    v-for="category in service.categories"
                    :key="category.id"
                    size="sm"
                    color="blue"
                    text-color="white"
                    dense
                  >
                    {{ category.name }}
                  </q-chip>
                </div>
              </div>

              <!-- Бренд -->
              <div v-if="service.brand" class="text-body2 q-mb-md">
                <strong>Бренд:</strong> {{ service.brand.name }}
              </div>

              <!-- Действия в мобильной версии -->
              <div class="column q-gutter-sm">
                <q-btn
                  unelevated
                  color="primary"
                  icon="visibility"
                  label="Просмотреть детали"
                  @click="openServiceDetailFromButton(service)"
                  class="full-width"
                />
                <div class="row q-gutter-sm">
                  <q-btn
                    outline
                    color="warning"
                    icon="edit"
                    label="Изменить"
                    @click="openEditServiceDialog(service)"
                    class="col"
                  />
                  <q-btn
                    outline
                    color="negative"
                    icon="delete"
                    label="Удалить"
                    @click="confirmDeleteService(service)"
                    class="col"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </div>

      <!-- Пустое состояние для мобильных -->
      <div v-if="servicesStore.services.length === 0" class="text-center q-pa-lg">
        <q-icon name="inventory_2" size="4em" color="grey-4" />
        <div class="text-grey-6 q-mt-sm">Сервисы не найдены</div>
      </div>
    </div>

    <!-- Диалог создания/редактирования сервиса -->
    <q-dialog v-model="serviceDialogVisible" persistent :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 700px; max-width: 900px'">
        <q-card-section>
          <div class="text-h6">{{ isEditing ? 'Редактировать сервис' : 'Добавить сервис' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none" style="max-height: 70vh; overflow-y: auto">
          <!-- Обязательные поля -->
          <q-input
            v-model="currentService.name"
            label="Название *"
            autofocus
            :rules="[(val) => !!val || 'Название обязательно']"
            lazy-rules
            outlined
            class="q-mb-md"
          />

          <!-- Переключатель редакторов -->
          <div class="q-mb-md">
            <q-toggle v-model="useHtmlEditor" label="Использовать HTML редактор" left-label />
          </div>

          <!-- Markdown редактор (по умолчанию) -->
          <q-input
            v-if="!useHtmlEditor"
            v-model="currentService.content"
            label="Контент (Markdown) *"
            type="textarea"
            outlined
            autogrow
            rows="8"
            placeholder="# Заголовок&#10;&#10;**Жирный текст**&#10;&#10;- Список&#10;- Элементов"
            class="q-mb-md"
            :rules="[(val) => !!val || 'Контент обязателен']"
          />

          <!-- HTML редактор -->
          <q-editor
            v-else
            v-model="currentService.content"
            placeholder="Контент сервиса *"
            min-height="150px"
            :toolbar="[
              ['bold', 'italic', 'underline'],
              ['undo', 'redo'],
              ['unordered', 'ordered'],
              ['link'],
              ['quote', 'hr'],
            ]"
            class="q-mb-md"
          />

          <!-- Видео URL -->
          <q-input
            v-model="currentService.video_url"
            label="URL видео"
            outlined
            placeholder="https://www.youtube.com/watch?v=..."
            class="q-mb-md"
          />

          <!-- Микро-кнопка для SEO -->
          <div class="q-mb-md">
            <q-btn
              flat
              dense
              :icon="seoExpanded ? 'expand_less' : 'expand_more'"
              :label="seoExpanded ? 'Скрыть SEO настройки' : 'Показать SEO настройки'"
              color="primary"
              @click="seoExpanded = !seoExpanded"
              size="sm"
            />
          </div>

          <!-- SEO поля -->
          <q-slide-transition>
            <div v-if="seoExpanded" class="q-mb-md">
              <q-input
                v-model="currentService.title"
                label="SEO заголовок"
                outlined
                class="q-mb-md"
              />
              <q-input
                v-model="currentService.description"
                label="SEO описание"
                type="textarea"
                outlined
                autogrow
                class="q-mb-md"
              />
              <q-input
                v-model="currentService.keywords"
                label="Ключевые слова"
                outlined
                hint="Разделяйте запятыми"
                class="q-mb-md"
              />
            </div>
          </q-slide-transition>

          <!-- Цена и артикул -->
          <div class="row q-gutter-md q-mb-md">
            <q-input
              v-model="currentService.price"
              label="Цена"
              type="number"
              step="0.01"
              outlined
              class="col"
            />
            <q-input
              v-model="currentService.old_price"
              label="Старая цена"
              type="number"
              step="0.01"
              outlined
              class="col"
            />
          </div>

          <q-input v-model="currentService.sku" label="Артикул (SKU)" outlined class="q-mb-md" />

          <!-- Справочники -->
          <div class="row q-gutter-md q-mb-md">
            <!-- Категории -->
            <q-select
              v-model="currentService.category_ids"
              :options="filteredCategories"
              option-label="name"
              option-value="id"
              label="Категории"
              outlined
              multiple
              use-chips
              emit-value
              map-options
              use-input
              input-debounce="300"
              @filter="filterCategories"
              :loading="categoriesLoading"
              class="col"
            >
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey"> Категории не найдены </q-item-section>
                </q-item>
              </template>
            </q-select>

            <!-- Бренд -->
            <q-select
              v-model="currentService.brand_id"
              :options="servicesStore.brands"
              option-label="name"
              option-value="id"
              label="Бренд"
              outlined
              emit-value
              map-options
              clearable
              class="col"
            />
          </div>

          <div class="row q-gutter-md q-mb-md">
            <!-- Тип товара -->
            <q-select
              v-model="currentService.product_type_id"
              :options="servicesStore.productTypes"
              option-label="name"
              option-value="id"
              label="Тип товара"
              outlined
              emit-value
              map-options
              clearable
              class="col"
            />

            <!-- Родительский товар -->
            <q-select
              v-model="currentService.parent_id"
              :options="availableServices"
              option-label="name"
              option-value="id"
              label="Родительский товар"
              outlined
              emit-value
              map-options
              clearable
              use-input
              input-debounce="300"
              @filter="filterServices"
              class="col"
            />
          </div>

          <!-- Варианты товара -->
          <div class="q-mb-md">
            <q-btn
              flat
              dense
              :icon="variantsExpanded ? 'expand_less' : 'expand_more'"
              :label="variantsExpanded ? 'Скрыть варианты товара' : 'Показать варианты товара'"
              color="secondary"
              @click="variantsExpanded = !variantsExpanded"
              size="sm"
            />
          </div>

          <!-- Варианты товара (раскрывающаяся секция) -->
          <q-slide-transition>
            <div v-if="variantsExpanded" class="q-mb-md">
              <div class="text-subtitle2 q-mb-sm">Варианты товара</div>

              <!-- Импорт стора вариантов и доступных размеров -->
              <div
                v-for="(variant, index) in serviceVariants"
                :key="index"
                class="row q-gutter-md q-mb-md items-center"
              >
                <!-- Размер -->
                <q-select
                  v-model="variant.size_id"
                  :options="availableSizes"
                  option-label="value"
                  option-value="id"
                  label="Размер"
                  outlined
                  dense
                  emit-value
                  map-options
                  class="col-3"
                >
                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section>
                        <q-item-label>{{ scope.opt.value }}</q-item-label>
                        <q-item-label caption>{{ scope.opt.measurement_system }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>

                <!-- Артикул -->
                <q-input v-model="variant.sku" label="Артикул" outlined dense class="col-3" />

                <!-- Цена -->
                <q-input
                  v-model="variant.price"
                  label="Цена"
                  type="number"
                  step="0.01"
                  outlined
                  dense
                  class="col-3"
                />

                <!-- Статус активности -->
                <q-toggle v-model="variant.is_active" label="Активен" dense class="col-2" />

                <!-- Удаление -->
                <q-btn
                  flat
                  round
                  dense
                  icon="delete"
                  color="negative"
                  @click="removeServiceVariant(index)"
                  class="col-1"
                />
              </div>

              <q-btn
                flat
                color="secondary"
                icon="add"
                label="Добавить вариант"
                @click="addServiceVariant"
                size="sm"
              />
            </div>
          </q-slide-transition>
          <div class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm">Свойства товара</div>
            <div
              v-for="(attr, index) in selectedServiceAttributes"
              :key="index"
              class="row q-gutter-md q-mb-md items-center"
            >
              <!-- Тип атрибута -->
              <q-select
                v-model="attr.attributeTypeId"
                :options="attributeTypesStore.attributeTypes"
                option-label="name"
                option-value="id"
                label="Тип свойства"
                outlined
                dense
                emit-value
                map-options
                class="col-4"
                @update:model-value="(value) => onAttributeTypeChange(index, value)"
              />

              <!-- Значение атрибута -->
              <q-select
                v-model="attr.attributeValueId"
                :options="getAttributeValues(attr.attributeTypeId)"
                option-label="value"
                option-value="id"
                label="Значение"
                outlined
                dense
                emit-value
                map-options
                class="col-6"
                :disable="!attr.attributeTypeId"
              >
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar v-if="scope.opt.color_code">
                      <q-badge
                        :style="`background-color: ${scope.opt.color_code}`"
                        rounded
                        outline
                        style="width: 16px; height: 16px; min-width: 16px; border: 1px solid #ddd"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ scope.opt.value }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>

                <template v-slot:selected-item="scope">
                  <div class="row items-center q-gutter-sm">
                    <q-badge
                      v-if="scope.opt.color_code"
                      :style="`background-color: ${scope.opt.color_code}`"
                      rounded
                      outline
                      style="width: 16px; height: 16px; min-width: 16px; border: 1px solid #ddd"
                    />
                    <span>{{ scope.opt.value }}</span>
                  </div>
                </template>
              </q-select>

              <!-- Удаление -->
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click="removeServiceAttribute(index)"
                class="col-1"
              />
            </div>
            <q-btn
              flat
              color="primary"
              icon="add"
              label="Добавить свойство"
              @click="addServiceAttribute"
              size="sm"
            />
          </div>

          <!-- JSON атрибуты -->
          <div class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm">Дополнительные свойства (JSON)</div>
            <div
              v-for="(attr, index) in customAttributes"
              :key="index"
              class="row q-gutter-md q-mb-md"
            >
              <q-input v-model="attr.key" label="Название свойства" outlined dense class="col-5" />
              <q-input v-model="attr.value" label="Значение" outlined dense class="col-5" />
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="negative"
                @click="removeCustomAttribute(index)"
                class="col-1"
              />
            </div>
            <q-btn
              flat
              color="primary"
              icon="add"
              label="Добавить свойство"
              @click="addCustomAttribute"
              size="sm"
            />
          </div>

          <!-- Файлы -->
          <q-file
            v-model="currentService.newFiles"
            label="Файлы изображений"
            accept=".jpg, .jpeg, .png, .gif, .svg, .webp"
            multiple
            clearable
            outlined
            @update:model-value="handleFileUpload"
            class="q-mb-md"
          >
            <template v-slot:prepend>
              <q-icon name="attach_file" />
            </template>
          </q-file>

          <!-- Превью файлов -->
          <div v-if="filesPreviews.length > 0" class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm">Выбранные файлы:</div>
            <div class="row q-gutter-md">
              <q-card
                v-for="(preview, index) in filesPreviews"
                :key="index"
                flat
                bordered
                class="preview-card"
              >
                <div class="preview-image-container">
                  <q-img :src="preview.url" fit="cover" class="preview-image" />
                  <q-btn
                    flat
                    round
                    dense
                    icon="close"
                    size="sm"
                    color="negative"
                    @click="removeFile(index)"
                    class="absolute-top-right q-ma-xs"
                  />
                </div>
                <q-card-section class="q-pa-sm">
                  <div class="text-caption text-center ellipsis">{{ preview.name }}</div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <!-- Статус публикации -->
          <q-toggle v-model="currentService.is_published" label="Опубликовать сервис" left-label />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Отмена" v-close-popup />
          <q-btn
            flat
            label="Сохранить"
            color="primary"
            @click="saveService"
            :loading="servicesStore.loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Диалог детальной информации о сервисе -->
    <q-dialog v-model="serviceDetailDialogVisible" :maximized="$q.screen.xs">
      <q-card :style="$q.screen.xs ? '' : 'min-width: 500px; max-width: 700px'">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Детали сервиса</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedServiceDetail">
          <div :class="$q.screen.xs ? 'column q-gutter-md' : 'row q-gutter-md'">
            <!-- Изображение сервиса -->
            <div
              :class="$q.screen.xs ? 'col-12' : 'col-12 col-md-4'"
              v-if="getPrimaryImageSafe(selectedServiceDetail)"
            >
              <q-img
                :src="getPrimaryImageSafe(selectedServiceDetail) || ''"
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

            <!-- Информация о сервисе -->
            <div class="col">
              <q-list>
                <q-item>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Название</q-item-label>
                    <q-item-label caption class="text-body1">
                      {{ selectedServiceDetail.name }}
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item v-if="selectedServiceDetail.slug">
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Slug</q-item-label>
                    <q-item-label caption class="text-body1">
                      {{ selectedServiceDetail.slug }}
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item v-if="selectedServiceDetail.price">
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Цена</q-item-label>
                    <q-item-label caption class="text-body1">
                      {{ selectedServiceDetail.price }} ₽
                      <span
                        v-if="selectedServiceDetail.old_price"
                        class="text-strike text-grey-6 q-ml-sm"
                      >
                        {{ selectedServiceDetail.old_price }} ₽
                      </span>
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item v-if="selectedServiceDetail.video_url">
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Видео</q-item-label>
                    <q-item-label caption class="text-body1">
                      <a
                        :href="selectedServiceDetail.video_url"
                        target="_blank"
                        class="text-primary"
                      >
                        {{ selectedServiceDetail.video_url }}
                      </a>
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item v-if="selectedServiceDetail.categories.length > 0">
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Категории</q-item-label>
                    <q-item-label caption class="text-body1">
                      {{ selectedServiceDetail.categories.map((c) => c.name).join(', ') }}
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <!-- Свойства товара -->
                <q-item v-if="hasServiceAttributes(selectedServiceDetail)">
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Свойства товара</q-item-label>
                    <q-item-label caption class="q-mt-sm">
                      <div class="row q-gutter-xs" style="flex-wrap: wrap">
                        <q-chip
                          v-for="attr in selectedServiceDetail.service_attributes"
                          :key="attr.id"
                          :style="
                            attr.attribute_value.color_code
                              ? `background-color: ${attr.attribute_value.color_code}; color: white;`
                              : ''
                          "
                          :color="!attr.attribute_value.color_code ? 'grey-3' : undefined"
                          :text-color="!attr.attribute_value.color_code ? 'grey-8' : undefined"
                          size="sm"
                          class="shadow-1"
                        >
                          {{ attr.attribute_type_name }}: {{ attr.attribute_value.value }}
                        </q-chip>
                      </div>
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Статус публикации</q-item-label>
                    <q-item-label caption>
                      <q-chip
                        :color="selectedServiceDetail.is_published ? 'green' : 'red'"
                        text-color="white"
                        size="sm"
                      >
                        {{ selectedServiceDetail.is_published ? 'Опубликован' : 'Не опубликован' }}
                      </q-chip>
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item v-if="selectedServiceDetail.created">
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Дата создания</q-item-label>
                    <q-item-label caption class="text-body1">
                      {{ formatDate(selectedServiceDetail.created) }}
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item v-if="selectedServiceDetail.updated">
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Дата обновления</q-item-label>
                    <q-item-label caption class="text-body1">
                      {{ formatDate(selectedServiceDetail.updated) }}
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
import { ref, onMounted, computed } from 'vue';
import {
  useServicesStore,
  type ServiceFile,
  type ServiceDetail,
  type ServiceCreatePayload,
  type ServiceUpdatePayload,
  type ServiceCategory,
  type ServiceAttributeValue,
} from 'stores/services.store';
import { useServiceAttributesStore } from 'stores/service-attributes.store';
import { useQuasar, date, Dialog } from 'quasar';
import type { QTableProps, QTableColumn } from 'quasar';

const $q = useQuasar();
const servicesStore = useServicesStore();
const attributeTypesStore = useServiceAttributesStore();

const serviceDialogVisible = ref(false);
const serviceDetailDialogVisible = ref(false);
const isEditing = ref(false);
const selectedServiceDetail = ref<ServiceDetail | null>(null);
const searchQuery = ref('');
const selectedRows = ref<ServiceFile[]>([]);
const bulkOperationLoading = ref(false);
const seoExpanded = ref(false);
const useHtmlEditor = ref(false);

// Категории
const categoriesLoading = ref(false);
const filteredCategories = ref<ServiceCategory[]>([]);
const availableServices = ref<ServiceFile[]>([]);

// Файлы
const filesPreviews = ref<
  Array<{
    name: string;
    url: string;
  }>
>([]);

interface ServiceFormData {
  id?: string;
  name: string;
  content: string;
  title: string;
  description: string;
  keywords: string;
  is_published: boolean;
  price: string;
  old_price: string;
  sku: string;
  video_url: string;
  category_ids: string[];
  brand_id: string;
  product_type_id: string;
  parent_id: string;
  newFiles?: File[];
}

const currentService = ref<ServiceFormData>({
  name: '',
  content: '',
  title: '',
  description: '',
  keywords: '',
  is_published: true,
  price: '',
  old_price: '',
  sku: '',
  video_url: '',
  category_ids: [],
  brand_id: '',
  product_type_id: '',
  parent_id: '',
});

// Пользовательские атрибуты
interface CustomAttribute {
  key: string;
  value: string;
}

interface ServiceAttributeSelection {
  attributeTypeId: string;
  attributeValueId: string;
}

const customAttributes = ref<CustomAttribute[]>([]);
const variantsExpanded = ref(false);
const availableSizes = ref<Array<{ id: string; value: string; measurement_system: string }>>([]);

// Варианты товара
interface ServiceVariantForm {
  size_id: string;
  sku: string;
  price: string;
  is_active: boolean;
}

const serviceVariants = ref<ServiceVariantForm[]>([]);
const selectedServiceAttributes = ref<ServiceAttributeSelection[]>([]);

const columns: QTableColumn[] = [
  {
    name: 'attachments',
    label: 'Изображение',
    field: 'attachments',
    align: 'center',
    sortable: false,
  },
  { name: 'name', required: true, label: 'Название', align: 'left', field: 'name', sortable: true },
  { name: 'slug', label: 'Slug', field: 'slug', align: 'left', sortable: true },
  { name: 'price', label: 'Цена', field: 'price', align: 'left', sortable: true },
  { name: 'categories', label: 'Категории', field: 'categories', align: 'left', sortable: false },
  { name: 'is_published', label: 'Статус', field: 'is_published', align: 'center', sortable: true },
  { name: 'actions', label: 'Действия', field: 'id', align: 'right' },
];

// Computed для получения значений атрибутов
const getAttributeValues = computed(() => {
  return (attributeTypeId: string): ServiceAttributeValue[] => {
    if (!attributeTypeId) return [];
    const attributeType = attributeTypesStore.attributeTypes.find(
      (at) => at.id === attributeTypeId,
    );
    // Преобразуем значения атрибутов в формат ServiceAttributeValue
    return (attributeType?.values || []).map((value) => ({
      id: value.id,
      value: value.value,
      slug: value.slug,
      order: value.order,
      ...(value.color_code && { color_code: value.color_code }),
    }));
  };
});

// Функции
function getPrimaryImage(service: ServiceFile | ServiceDetail): string | null {
  if (!service.attachments?.length) return null;
  const primary = service.attachments.find((att) => att.is_primary);
  return primary?.file || service.attachments[0]?.file || null;
}

function getPrimaryImageSafe(service: ServiceFile | ServiceDetail): string | null {
  const imageUrl = getPrimaryImage(service);
  return imageUrl || null;
}

function hasServiceAttributes(service: ServiceDetail): boolean {
  return !!(service.service_attributes && service.service_attributes.length > 0);
}

function toggleRowSelection(service: ServiceFile, selected: boolean): void {
  if (selected) {
    if (!selectedRows.value.some((row) => row.id === service.id)) {
      selectedRows.value.push(service);
    }
  } else {
    selectedRows.value = selectedRows.value.filter((row) => row.id !== service.id);
  }
}

async function onRequest(props: { pagination: QTableProps['pagination'] }): Promise<void> {
  if (props.pagination) {
    await servicesStore.handleTableRequest(props);
  }
}

async function onSearchInput(value: string | number | null): Promise<void> {
  const searchValue = value ? String(value).trim() : '';
  if (searchValue.length >= 2) {
    await servicesStore.filterServices({ name: searchValue });
  } else if (searchValue.length === 0) {
    await servicesStore.clearFilters();
  }
}

async function clearSearch(): Promise<void> {
  searchQuery.value = '';
  await servicesStore.clearFilters();
}

async function openServiceDetailFromButton(row: ServiceFile): Promise<void> {
  const fullServiceData = await servicesStore.fetchServiceById(row.id);
  if (fullServiceData) {
    selectedServiceDetail.value = fullServiceData;
    serviceDetailDialogVisible.value = true;
  }
}

function openCreateServiceDialog(): void {
  isEditing.value = false;
  resetForm();
  serviceDialogVisible.value = true;
}

async function openEditServiceDialog(service: ServiceFile): Promise<void> {
  isEditing.value = true;
  const fullServiceData = await servicesStore.fetchServiceById(service.id);
  if (fullServiceData) {
    fillFormFromService(fullServiceData);
  }
  serviceDialogVisible.value = true;
}

function resetForm(): void {
  currentService.value = {
    name: '',
    content: '',
    title: '',
    description: '',
    keywords: '',
    is_published: true,
    price: '',
    old_price: '',
    sku: '',
    video_url: '',
    category_ids: [],
    brand_id: '',
    product_type_id: '',
    parent_id: '',
  };
  customAttributes.value = [];
  selectedServiceAttributes.value = [];
  serviceVariants.value = [];
  seoExpanded.value = false;
  variantsExpanded.value = false;
  useHtmlEditor.value = false;
  filesPreviews.value = [];
}

function fillFormFromService(service: ServiceDetail): void {
  currentService.value = {
    id: service.id,
    name: service.name,
    content: service.content,
    title: service.title || '',
    description: service.description || '',
    keywords: service.keywords || '',
    is_published: service.is_published,
    price: service.price || '',
    old_price: service.old_price || '',
    sku: service.sku || '',
    video_url: service.video_url || '',
    category_ids: service.categories.map((cat) => cat.id),
    brand_id: service.brand?.id || '',
    product_type_id: service.product_type?.id || '',
    parent_id: service.parent?.id || '',
  };

  // Заполняем пользовательские атрибуты
  customAttributes.value = Object.entries(service.attributes || {}).map(([key, value]) => ({
    key,
    value: String(value),
  }));

  // Заполняем service attributes
  selectedServiceAttributes.value = [];
  if (service.service_attributes) {
    service.service_attributes.forEach((attr) => {
      // Находим тип атрибута по названию
      const attributeType = attributeTypesStore.attributeTypes.find(
        (at) => at.name === attr.attribute_type_name,
      );

      if (attributeType) {
        selectedServiceAttributes.value.push({
          attributeTypeId: attributeType.id,
          attributeValueId: attr.attribute_value.id,
        });

        // Загружаем значения для этого типа атрибута
        void attributeTypesStore.fetchAttributeValues(attributeType.id);
      }
    });
  }

  seoExpanded.value = !!(service.title || service.description || service.keywords);
}

// Service Variants функции
function addServiceVariant(): void {
  serviceVariants.value.push({
    size_id: '',
    sku: '',
    price: '',
    is_active: true,
  });
}

function removeServiceVariant(index: number): void {
  serviceVariants.value.splice(index, 1);
}

// Service Attributes функции
function addServiceAttribute(): void {
  selectedServiceAttributes.value.push({
    attributeTypeId: '',
    attributeValueId: '',
  });
}

function removeServiceAttribute(index: number): void {
  selectedServiceAttributes.value.splice(index, 1);
}

async function onAttributeTypeChange(index: number, attributeTypeId: string): Promise<void> {
  const selectedAttribute = selectedServiceAttributes.value[index];
  if (!selectedAttribute) {
    console.warn('Selected service attribute not found at index', index);
    return;
  }

  selectedAttribute.attributeValueId = '';
  if (attributeTypeId) {
    await attributeTypesStore.fetchAttributeValues(attributeTypeId);
  }
}

function addCustomAttribute(): void {
  customAttributes.value.push({ key: '', value: '' });
}

function removeCustomAttribute(index: number): void {
  customAttributes.value.splice(index, 1);
}

function handleFileUpload(files: File[] | File | null): void {
  if (!files) {
    filesPreviews.value = [];
    return;
  }

  const fileArray = Array.isArray(files) ? files : [files];
  filesPreviews.value = fileArray.map((file) => ({
    name: file.name,
    url: URL.createObjectURL(file),
  }));
}

function removeFile(index: number): void {
  const newFiles = [...(currentService.value.newFiles || [])];
  newFiles.splice(index, 1);
  currentService.value.newFiles = newFiles;

  if (filesPreviews.value[index]) {
    URL.revokeObjectURL(filesPreviews.value[index].url);
  }
  filesPreviews.value.splice(index, 1);
}

function filterCategories(val: string, update: (fn: () => void) => void): void {
  update(() => {
    if (val === '') {
      filteredCategories.value = [...servicesStore.categories];
    } else {
      const needle = val.toLowerCase();
      filteredCategories.value = servicesStore.categories.filter((category) =>
        category.name.toLowerCase().includes(needle),
      );
    }
  });
}

function filterServices(val: string, update: (fn: () => void) => void): void {
  update(() => {
    if (val === '') {
      availableServices.value = [...servicesStore.services];
    } else {
      const needle = val.toLowerCase();
      availableServices.value = servicesStore.services.filter((service) =>
        service.name.toLowerCase().includes(needle),
      );
    }
  });
}

async function saveService(): Promise<void> {
  if (!currentService.value.name.trim()) {
    $q.notify({ type: 'negative', message: 'Название сервиса обязательно.' });
    return;
  }

  if (!currentService.value.content.trim()) {
    $q.notify({ type: 'negative', message: 'Контент сервиса обязателен.' });
    return;
  }

  // Подготовка JSON атрибутов
  const attributes: Record<string, string | number | boolean> = {};
  customAttributes.value.forEach((attr) => {
    if (attr.key.trim() && attr.value.trim()) {
      attributes[attr.key.trim()] = attr.value.trim();
    }
  });

  // Подготовка service_attribute_values
  const serviceAttributeValues: string[] = [];
  selectedServiceAttributes.value.forEach((attr) => {
    if (attr.attributeTypeId && attr.attributeValueId) {
      serviceAttributeValues.push(attr.attributeValueId);
    }
  });

  // Создаем базовый payload
  const basePayload = {
    name: currentService.value.name.trim(),
    content: currentService.value.content,
    is_published: currentService.value.is_published,
    ...(currentService.value.title.trim() && { title: currentService.value.title.trim() }),
    ...(currentService.value.description.trim() && {
      description: currentService.value.description.trim(),
    }),
    ...(currentService.value.keywords.trim() && { keywords: currentService.value.keywords.trim() }),
    ...(currentService.value.price && { price: currentService.value.price }),
    ...(currentService.value.old_price && { old_price: currentService.value.old_price }),
    ...(currentService.value.sku.trim() && { sku: currentService.value.sku.trim() }),
    ...(currentService.value.video_url.trim() && {
      video_url: currentService.value.video_url.trim(),
    }),
    ...(currentService.value.brand_id && { brand_id: currentService.value.brand_id }),
    ...(currentService.value.product_type_id && {
      product_type_id: currentService.value.product_type_id,
    }),
    ...(currentService.value.parent_id && { parent_id: currentService.value.parent_id }),
    ...(currentService.value.category_ids.length > 0 && {
      category_ids: currentService.value.category_ids,
    }),
    ...(Object.keys(attributes).length > 0 && { attributes }),
    ...(serviceAttributeValues.length > 0 && { service_attribute_values: serviceAttributeValues }),
    ...(currentService.value.newFiles &&
      currentService.value.newFiles.length > 0 && { attachments: currentService.value.newFiles }),
  };

  let success = false;
  if (isEditing.value && currentService.value.id) {
    const updatedService = await servicesStore.updateService(
      currentService.value.id,
      basePayload as ServiceUpdatePayload,
    );
    if (updatedService) success = true;
  } else {
    const newService = await servicesStore.createService(basePayload as ServiceCreatePayload);
    if (newService) success = true;
  }

  if (success) {
    serviceDialogVisible.value = false;
    resetForm();
  }
}

async function togglePublishStatus(service: ServiceFile): Promise<void> {
  await servicesStore.patchServiceStatus(service.id, !service.is_published);
}

function confirmTogglePublishStatus(service: ServiceFile): void {
  if ($q.screen.xs) {
    const newStatus = !service.is_published;
    const action = newStatus ? 'опубликовать' : 'снять с публикации';

    Dialog.create({
      title: 'Подтвердите действие',
      message: `Вы уверены, что хотите ${action} сервис "${service.name}"?`,
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
      void togglePublishStatus(service);
    });
  } else {
    void togglePublishStatus(service);
  }
}

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
    const success = await servicesStore.bulkDeleteServices(selectedRows.value.map((row) => row.id));
    if (success) {
      selectedRows.value = [];
    }
  } finally {
    bulkOperationLoading.value = false;
  }
}

async function bulkPublish(): Promise<void> {
  bulkOperationLoading.value = true;
  try {
    const success = await servicesStore.bulkUpdateServiceStatus(
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

async function bulkUnpublish(): Promise<void> {
  bulkOperationLoading.value = true;
  try {
    const success = await servicesStore.bulkUpdateServiceStatus(
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

function confirmDeleteService(service: ServiceFile): void {
  Dialog.create({
    title: 'Подтвердите удаление',
    message: `Вы уверены, что хотите удалить сервис "${service.name}"?`,
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
    servicesStore.deleteService(service.id).catch((error) => {
      $q.notify({
        type: 'negative',
        message: 'Ошибка при удалении сервиса',
      });
      console.error('Delete service error:', error);
    });
  });
}

async function openServiceDetailDialog(evt: Event, row: ServiceFile): Promise<void> {
  const target = evt.target as HTMLElement;
  if (target.closest('.q-btn') || target.closest('button')) {
    return;
  }

  const fullServiceData = await servicesStore.fetchServiceById(row.id);
  if (fullServiceData) {
    selectedServiceDetail.value = fullServiceData;
    serviceDetailDialogVisible.value = true;
  }
}

async function editFromDetail(): Promise<void> {
  if (selectedServiceDetail.value) {
    serviceDetailDialogVisible.value = false;
    await openEditServiceDialog(selectedServiceDetail.value);
  }
}

function deleteFromDetail(): void {
  if (selectedServiceDetail.value) {
    serviceDetailDialogVisible.value = false;
    confirmDeleteService(selectedServiceDetail.value);
  }
}

function formatDate(dateString: string): string {
  return date.formatDate(dateString, 'DD.MM.YYYY HH:mm');
}

// Загрузка доступных размеров
function loadAvailableSizes(): void {
  try {
    // Здесь должен быть вызов к API для получения размеров
    // Временно используем пустой массив
    availableSizes.value = [];
  } catch (error) {
    console.error('Ошибка загрузки размеров:', error);
  }
}

onMounted(async () => {
  await Promise.all([
    servicesStore.fetchServices(),
    servicesStore.fetchCategories(),
    servicesStore.fetchBrands(),
    servicesStore.fetchProductTypes(),
    attributeTypesStore.fetchAttributeTypes(),
  ]);
  loadAvailableSizes();
  filteredCategories.value = [...servicesStore.categories];
  availableServices.value = [...servicesStore.services];
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

.services-table {
  .q-table th,
  .q-table td {
    &:last-child {
      text-align: right;
    }
  }
}

.service-card {
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

.preview-card {
  position: relative;
  width: 140px;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
}

.preview-image-container {
  position: relative;
  width: 100%;
  height: 120px;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 100%;
  border-radius: 12px 12px 0 0;
}

.absolute-top-right {
  position: absolute;
  top: 4px;
  right: 4px;
}
</style>
