<template>
  <q-page padding>
    <div class="column q-gutter-md">
      <!-- Заголовок и элементы управления -->
      <div class="row items-center justify-between">
        <div>
          <h4 class="q-my-none">Варианты товаров</h4>
          <p class="text-grey-6 q-mb-none">Управление вариантами товаров по размерам</p>
        </div>

        <div class="row q-gutter-md items-center">
          <!-- Выбор сервиса -->
          <q-select
            v-model="selectedServiceId"
            :options="serviceOptions"
            option-label="name"
            option-value="id"
            emit-value
            map-options
            label="Выберите сервис"
            outlined
            dense
            style="min-width: 250px"
            :loading="servicesLoading"
            @update:model-value="onServiceChange"
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey"> Сервисы не найдены </q-item-section>
              </q-item>
            </template>
          </q-select>

          <!-- Кнопка создания варианта -->
          <q-btn
            label="Добавить вариант"
            color="primary"
            icon="add"
            @click="openCreateVariantDialog"
            :disable="!hasValidContext"
          />

          <!-- 🆕 Кнопка диагностики -->
          <q-btn
            v-if="hasValidContext"
            label="Проверить все варианты"
            color="orange"
            icon="refresh"
            outline
            size="sm"
            @click="diagnoseAllVariants"
            :loading="diagnosisLoading"
          />
        </div>
      </div>

      <!-- Информация о выбранном сервисе -->
      <q-card v-if="currentServiceInfo" flat bordered>
        <q-card-section>
          <div class="row items-center q-gutter-md">
            <q-icon name="info" color="primary" size="md" />
            <div>
              <div class="text-h6">{{ currentServiceInfo.name }}</div>
              <div class="text-grey-6">
                Активных вариантов: {{ serviceVariantsStore.activeVariantsCount }} | Неактивных:
                {{ serviceVariantsStore.inactiveVariantsCount }}
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Поиск и фильтры -->
      <div v-if="hasValidContext" class="row q-gutter-md items-center">
        <q-input
          v-model="searchQuery"
          placeholder="Поиск по SKU..."
          outlined
          dense
          clearable
          @update:model-value="onSearchInput"
          @clear="clearSearch"
          style="min-width: 250px"
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
        </q-input>

        <!-- Массовые операции (только для выбранных строк) -->
        <div v-if="selectedRows.length > 0" class="row q-gutter-sm">
          <q-btn
            label="Активировать"
            color="positive"
            size="sm"
            :loading="bulkOperationLoading"
            @click="bulkActivate"
          />
          <q-btn
            label="Деактивировать"
            color="warning"
            size="sm"
            :loading="bulkOperationLoading"
            @click="bulkDeactivate"
          />
          <q-btn
            label="Удалить"
            color="negative"
            size="sm"
            :loading="bulkOperationLoading"
            @click="bulkDelete"
          />
        </div>
      </div>

      <!-- Контент -->
      <div v-if="!hasValidContext" class="text-center q-pa-xl">
        <q-icon name="info_outline" size="64px" color="grey-5" />
        <div class="text-h6 q-mt-md text-grey-6">Выберите сервис для просмотра вариантов</div>
        <div class="text-body2 text-grey-5 q-mt-sm">
          Используйте селектор сервиса выше для начала работы
        </div>
      </div>

      <!-- Desktop Table -->
      <q-table
        v-else-if="!$q.screen.xs"
        :rows="serviceVariantsStore.variants"
        :columns="columns"
        :loading="serviceVariantsStore.loading"
        :pagination="serviceVariantsStore.qTablePagination"
        @request="onRequest"
        row-key="id"
        selection="multiple"
        v-model:selected="selectedRows"
        class="variants-table desktop-view"
        :rows-per-page-options="[10, 25, 50]"
      >
        <template v-slot:body-cell-attachments="props">
          <q-td :props="props">
            <div class="service-img-wrapper" style="width: 60px; height: 60px;">
              <q-img
                v-if="getPrimaryVariantImageSafe(props.row)"
                :src="getPrimaryVariantImageSafe(props.row) || undefined"
                fit="cover"
                class="service-image"
                :style="{ aspectRatio: '1/1' }"
              >
                <template v-slot:loading>
                  <div class="absolute-full flex flex-center">
                    <q-spinner color="primary" size="1em" />
                  </div>
                </template>
                <template v-slot:error>
                  <div class="absolute-full flex flex-center bg-grey-3">
                    <q-icon name="broken_image" size="1.5em" color="grey-6" />
                  </div>
                </template>
              </q-img>
              <div v-else class="absolute-full flex flex-center bg-grey-2">
                <q-icon name="photo" size="1.5em" color="grey-5" />
              </div>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-size="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.size.value }}</div>
            <div class="text-caption text-grey-6">
              {{ props.row.size.measurement_system }}
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-price="props">
          <q-td :props="props">
            {{ formatPrice(props.row.price) }}
          </q-td>
        </template>

        <template v-slot:body-cell-is_active="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.is_active ? 'positive' : 'negative'"
              text-color="white"
              size="sm"
            >
              {{ props.row.is_active ? 'Активен' : 'Неактивен' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-attributes="props">
          <q-td :props="props">
            <q-btn
              v-if="props.row.attributes && Object.keys(props.row.attributes).length > 0"
              flat
              dense
              round
              icon="visibility"
              size="sm"
              @click="showAttributesDialog(props.row.attributes)"
            />
            <span v-else class="text-grey-5">—</span>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <div class="row q-gutter-xs no-wrap">
              <q-btn
                flat
                round
                dense
                icon="visibility"
                size="sm"
                @click="openVariantDetailFromButton(props.row)"
              />
              <q-btn
                flat
                round
                dense
                icon="edit"
                size="sm"
                @click="openEditVariantDialog(props.row)"
              />
              <q-btn
                flat
                round
                dense
                icon="delete"
                size="sm"
                color="negative"
                @click="confirmDeleteVariant(props.row)"
              />
            </div>
          </q-td>
        </template>

        <template v-slot:no-data>
          <div class="full-width row flex-center q-gutter-sm">
            <q-icon size="2em" name="warning" />
            <span> Варианты товаров не найдены </span>
          </div>
        </template>
      </q-table>

      <!-- Mobile Cards -->
      <div v-else-if="hasValidContext" class="mobile-view">
        <div v-if="serviceVariantsStore.variants.length === 0" class="text-center q-pa-xl">
          <q-icon name="warning" size="64px" color="grey-5" />
          <div class="text-h6 q-mt-md text-grey-6">Варианты товаров не найдены</div>
        </div>

        <div v-else class="column q-gutter-md">
          <q-expansion-item
            v-for="variant in serviceVariantsStore.variants"
            :key="variant.id"
            class="variant-card"
            :label="`${variant.size.value} (${variant.size.measurement_system})`"
            :caption="`SKU: ${variant.sku} | ${formatPrice(variant.price)}`"
          >
            <template v-slot:header>
              <q-item-section>
                <div class="row items-center justify-between full-width">
                  <div class="row items-center q-gutter-md">
                    <!-- Главное изображение варианта -->
                    <div class="service-img-wrapper" style="width: 50px; height: 50px;">
                      <q-img
                        v-if="getPrimaryVariantImageSafe(variant)"
                        :src="getPrimaryVariantImageSafe(variant) || undefined"
                        fit="cover"
                        class="service-image"
                        :style="{ aspectRatio: '1/1' }"
                      >
                        <template v-slot:loading>
                          <div class="absolute-full flex flex-center">
                            <q-spinner color="primary" size="1em" />
                          </div>
                        </template>
                        <template v-slot:error>
                          <div class="absolute-full flex flex-center bg-grey-3">
                            <q-icon name="broken_image" size="1.2em" color="grey-6" />
                          </div>
                        </template>
                      </q-img>
                      <div v-else class="absolute-full flex flex-center bg-grey-2">
                        <q-icon name="photo" size="1.2em" color="grey-5" />
                      </div>
                    </div>
                    
                    <div>
                      <q-item-label class="text-weight-medium">
                        {{ variant.size.value }} ({{ variant.size.measurement_system }})
                      </q-item-label>
                      <q-item-label caption>
                        SKU: {{ variant.sku }} | {{ formatPrice(variant.price) }}
                      </q-item-label>
                    </div>
                  </div>
                  <div class="row items-center q-gutter-sm">
                    <q-chip
                      :color="variant.is_active ? 'positive' : 'negative'"
                      text-color="white"
                      size="sm"
                    >
                      {{ variant.is_active ? 'Активен' : 'Неактивен' }}
                    </q-chip>
                    <q-checkbox
                      :model-value="selectedRows.some((row) => row.id === variant.id)"
                      @update:model-value="
                        (selected: boolean) => toggleRowSelection(variant, selected)
                      "
                    />
                  </div>
                </div>
              </q-item-section>
            </template>

            <q-card-section>
              <div class="row q-gutter-md justify-between">
                <div class="col">
                  <div class="text-caption text-grey-6">Атрибуты:</div>
                  <div v-if="variant.attributes && Object.keys(variant.attributes).length > 0">
                    <q-btn
                      flat
                      dense
                      label="Просмотреть"
                      icon="visibility"
                      size="sm"
                      @click="showAttributesDialog(variant.attributes)"
                    />
                  </div>
                  <div v-else class="text-grey-5">Отсутствуют</div>
                </div>

                <div class="row q-gutter-xs">
                  <q-btn
                    round
                    dense
                    icon="visibility"
                    size="sm"
                    @click="openVariantDetailFromButton(variant)"
                  />
                  <q-btn
                    round
                    dense
                    icon="edit"
                    size="sm"
                    @click="openEditVariantDialog(variant)"
                  />
                  <q-btn
                    round
                    dense
                    icon="delete"
                    size="sm"
                    color="negative"
                    @click="confirmDeleteVariant(variant)"
                  />
                </div>
              </div>
            </q-card-section>
          </q-expansion-item>
        </div>
      </div>
    </div>

    <!-- Диалог создания/редактирования варианта -->
    <q-dialog v-model="variantDialogVisible" persistent>
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">
            {{ isEditing ? 'Редактировать вариант' : 'Создать новый вариант' }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="column q-gutter-md">
            <!-- Размер -->
            <q-select
              v-model="currentVariant.size_id"
              :options="sizeOptions"
              option-label="displayName"
              option-value="id"
              emit-value
              map-options
              label="Размер *"
              outlined
              :loading="sizesLoading"
              :rules="[(val) => !!val || 'Размер обязателен']"
              :option-disable="(opt) => opt.isDisabled"
            >
              <template #append>
                <q-btn
                  flat
                  round
                  dense
                  icon="refresh"
                  :loading="sizesLoading"
                  @click="refreshSizes"
                  class="q-mr-xs"
                >
                  <q-tooltip>Обновить список размеров</q-tooltip>
                </q-btn>
              </template>
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey"> Размеры не найдены </q-item-section>
                </q-item>
              </template>

              <!-- 🆕 Кастомный рендер опций с цветовой индикацией -->
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps" :class="scope.opt.isDisabled ? 'text-grey-5' : ''">
                  <q-item-section>
                    <q-item-label :class="scope.opt.isDisabled ? 'text-strike' : ''">
                      {{ scope.opt.value }} ({{ scope.opt.measurement_system }})
                    </q-item-label>
                    <q-item-label v-if="scope.opt.isDisabled" caption class="text-orange">
                      Уже используется в другом варианте
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side v-if="scope.opt.isDisabled">
                    <q-icon name="block" color="orange" />
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

            <!-- SKU -->
            <q-input
              v-model="currentVariant.sku"
              label="SKU"
              outlined
              placeholder="Введите SKU варианта"
            />

            <!-- Цена -->
            <q-input
              v-model="currentVariant.price"
              label="Цена"
              outlined
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              suffix="₽"
            />

            <!-- Статус активности -->
            <q-toggle v-model="currentVariant.is_active" label="Активен" color="positive" />

            <!-- Изображения варианта -->
            <div class="q-mb-md">
              <div class="text-subtitle1 q-mb-md">Изображения варианта</div>

              <!-- Список новых файлов -->
              <div v-if="filesPreviews.length > 0" class="q-mb-lg">
                <div class="text-subtitle2 q-mb-sm">
                  Новые изображения ({{ filesPreviews.length }})
                </div>

                <div class="column q-gutter-md">
                  <div
                    v-for="(preview, index) in filesPreviews"
                    :key="index"
                    class="service-image-card"
                  >
                    <div class="row q-gutter-md items-start">
                      <!-- Изображение -->
                      <div class="service-img-wrapper">
                        <q-img
                          :src="preview.url"
                          fit="cover"
                          class="service-image"
                          :style="{ aspectRatio: '1/1' }"
                        >
                          <template v-slot:loading>
                            <div class="absolute-full flex flex-center">
                              <q-spinner color="primary" size="2em" />
                            </div>
                          </template>
                        </q-img>

                        <!-- Кнопка удаления -->
                        <q-btn
                          flat
                          round
                          dense
                          icon="close"
                          size="sm"
                          color="negative"
                          @click="removeFile(index)"
                          class="remove-img-btn"
                        />

                        <!-- Порядковый номер -->
                        <q-badge :label="index + 1" color="primary" class="img-number-badge" />
                      </div>

                      <!-- Поля управления -->
                      <div class="flex-grow column q-gutter-md">
                        <!-- Название файла и плашка главного изображения -->
                        <div class="row items-center q-gutter-sm">
                          <div class="text-weight-medium">{{ preview.name }}</div>
                          <q-chip
                            v-if="preview.is_primary"
                            color="positive"
                            text-color="white"
                            size="sm"
                            dense
                            icon="star"
                          >
                            Главное изображение
                          </q-chip>
                        </div>

                        <!-- Описание -->
                        <q-input
                          v-model="preview.alt_text"
                          label="Описание изображения"
                          outlined
                          dense
                          placeholder="Краткое описание для SEO и доступности"
                        />

                        <!-- Главное изображение -->
                        <q-checkbox
                          v-model="preview.is_primary"
                          color="positive"
                          @update:model-value="(val) => updatePrimaryImage(index, val)"
                        >
                          <template v-slot:default>
                            <span class="q-ml-sm">
                              <q-icon
                                v-if="preview.is_primary"
                                name="star"
                                color="amber"
                                class="q-mr-xs"
                              />
                              Использовать как главное изображение
                            </span>
                          </template>
                        </q-checkbox>
                      </div>

                      <!-- Кнопки перемещения -->
                      <div class="column q-gutter-xs">
                        <q-btn
                          v-if="index > 0"
                          flat
                          round
                          dense
                          icon="keyboard_arrow_up"
                          size="sm"
                          color="primary"
                          @click="moveFileUp(index)"
                          title="Переместить вверх"
                        />
                        <q-btn
                          v-if="index < filesPreviews.length - 1"
                          flat
                          round
                          dense
                          icon="keyboard_arrow_down"
                          size="sm"
                          color="primary"
                          @click="moveFileDown(index)"
                          title="Переместить вниз"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Кнопка добавления изображений -->
              <q-file
                ref="fileInput"
                v-model="currentVariant.newFiles"
                label="Добавить изображения"
                accept=".jpg, .jpeg, .png, .gif, .svg, .webp"
                multiple
                clearable
                outlined
                @update:model-value="handleFileUpload"
                class="q-mb-md"
              >
                <template v-slot:prepend>
                  <q-icon name="add_photo_alternate" />
                </template>
              </q-file>

              <!-- Существующие изображения (только при редактировании) -->
              <div v-if="isEditing && currentVariant.id" class="existing-images-section">
                <q-separator class="q-mb-md" />
                <div class="text-subtitle2 q-mb-md">
                  Загруженные изображения
                  <q-chip
                    v-if="getVariantImagesDetailed({ id: currentVariant.id } as ProductVariantDetail).length > 0"
                    color="grey-3"
                    text-color="grey-8"
                    size="sm"
                    :label="getVariantImagesDetailed({ id: currentVariant.id } as ProductVariantDetail).length"
                  />
                </div>

                <div
                  v-if="getVariantImagesDetailed({ id: currentVariant.id } as ProductVariantDetail).length > 0"
                  class="column q-gutter-md"
                >
                  <div
                    v-for="image in getVariantImagesDetailed({ id: currentVariant.id } as ProductVariantDetail)"
                    :key="image.id"
                    class="uploaded-image-card"
                  >
                    <div class="row q-gutter-md items-start">
                      <!-- Изображение -->
                      <div class="service-img-wrapper">
                        <q-img
                          :src="image.file"
                          fit="cover"
                          class="service-image"
                          :style="{ aspectRatio: '1/1' }"
                        >
                          <template v-slot:loading>
                            <div class="absolute-full flex flex-center">
                              <q-spinner color="primary" size="2em" />
                            </div>
                          </template>
                        </q-img>

                        <!-- Порядковый номер -->
                        <q-badge :label="image.order + 1" color="primary" class="img-number-badge" />
                      </div>

                      <!-- Поля управления -->
                      <div class="flex-grow column q-gutter-md">
                        <!-- Описание -->
                        <q-input
                          :model-value="image.alt_text || ''"
                          label="Описание изображения"
                          outlined
                          dense
                          placeholder="Краткое описание для SEO и доступности"
                          @update:model-value="
                            (val) => updateExistingImageAlt(image, String(val || ''))
                          "
                        />

                        <!-- Главное изображение -->
                        <q-checkbox
                          :model-value="image.is_primary"
                          color="positive"
                          @update:model-value="(val) => updateExistingImagePrimary(image, val)"
                        >
                          <template v-slot:default>
                            <span class="q-ml-sm">
                              <q-icon
                                v-if="image.is_primary"
                                name="star"
                                color="amber"
                                class="q-mr-xs"
                              />
                              Использовать как главное изображение
                            </span>
                          </template>
                        </q-checkbox>
                      </div>

                      <!-- Действия -->
                      <div class="column q-gutter-xs">
                        <q-btn
                          flat
                          round
                          dense
                          icon="delete"
                          size="sm"
                          color="negative"
                          @click="deleteExistingImageConfirm(image)"
                          title="Удалить изображение"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else class="text-center q-py-lg text-grey-6">
                  <q-icon name="photo_library" size="3em" />
                  <div class="q-mt-sm">У варианта пока нет загруженных изображений</div>
                </div>
              </div>
            </div>

            <!-- Атрибуты (JSON) -->
            <div>
              <q-input
                v-model="attributesJsonString"
                label="Атрибуты (JSON)"
                outlined
                type="textarea"
                rows="4"
                placeholder='{"color": "red", "material": "cotton"}'
                :error="attributesError"
                :error-message="attributesErrorMessage"
                @update:model-value="validateAttributes"
              />
              <div class="text-caption text-grey-6 q-mt-xs">
                Введите атрибуты в формате JSON. Оставьте пустым, если атрибуты не нужны.
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Отмена" v-close-popup />
          <q-btn
            label="Сохранить"
            color="primary"
            @click="saveVariant"
            :loading="serviceVariantsStore.loading"
            :disable="!canSaveVariant"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Диалог детального просмотра варианта -->
    <q-dialog v-model="variantDetailDialogVisible">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Детали варианта</div>
        </q-card-section>

        <q-card-section v-if="selectedVariantDetail" class="q-pt-none">
          <div class="column q-gutter-md">
            <!-- Изображения варианта -->
            <div v-if="getVariantImagesDetailed(selectedVariantDetail).length > 0">
              <div class="text-weight-medium q-mb-sm">Изображения:</div>
              
              <!-- Карусель для нескольких изображений -->
              <div v-if="getVariantImagesDetailed(selectedVariantDetail).length > 1">
                <q-carousel
                  v-model="detailCarouselSlide"
                  swipeable
                  animated
                  arrows
                  navigation
                  infinite
                  height="300px"
                  class="bg-grey-1 rounded-borders"
                >
                  <q-carousel-slide
                     v-for="image in getVariantImagesDetailed(selectedVariantDetail)"
                     :key="image.id"
                     :name="image.id"
                     class="column no-wrap flex-center"
                   >
                    <q-img
                      :src="image.file"
                      :alt="image.alt_text || 'Изображение варианта'"
                      fit="contain"
                      style="height: 280px; max-width: 100%"
                      class="rounded-borders"
                    >
                      <template v-slot:error>
                        <div class="absolute-full flex flex-center bg-grey-3">
                          <div class="text-center">
                            <q-icon name="broken_image" size="2em" color="grey-6" />
                            <div class="text-grey-6 q-mt-sm">Ошибка загрузки</div>
                          </div>
                        </div>
                      </template>
                    </q-img>
                    
                    <!-- Описание изображения -->
                    <div v-if="image.alt_text" class="text-caption text-center q-mt-xs text-grey-7">
                      {{ image.alt_text }}
                    </div>
                  </q-carousel-slide>
                </q-carousel>
                
                <!-- Счетчик изображений -->
                 <div class="text-center q-mt-xs text-caption text-grey-6">
                   {{ (getVariantImagesDetailed(selectedVariantDetail) || []).findIndex(img => img.id === detailCarouselSlide) + 1 }} / {{ (getVariantImagesDetailed(selectedVariantDetail) || []).length }}
                 </div>
              </div>
              
              <!-- Одиночное изображение -->
               <div v-else>
                 <q-img
                   :src="(getVariantImagesDetailed(selectedVariantDetail) || [])[0]?.file || ''"
                   :alt="(getVariantImagesDetailed(selectedVariantDetail) || [])[0]?.alt_text || 'Изображение варианта'"
                   fit="contain"
                   style="height: 300px; max-width: 100%"
                   class="rounded-borders bg-grey-1"
                 >
                   <template v-slot:error>
                     <div class="absolute-full flex flex-center bg-grey-3">
                       <div class="text-center">
                         <q-icon name="broken_image" size="2em" color="grey-6" />
                         <div class="text-grey-6 q-mt-sm">Ошибка загрузки</div>
                       </div>
                     </div>
                   </template>
                 </q-img>
                 
                 <!-- Описание изображения -->
                 <div v-if="(getVariantImages(selectedVariantDetail) || [])[0]?.alt_text" class="text-caption text-center q-mt-xs text-grey-7">
                   {{ (getVariantImages(selectedVariantDetail) || [])[0]?.alt_text }}
                 </div>
               </div>
            </div>
            
            <div>
              <div class="text-weight-medium">Размер:</div>
              <div>
                {{ selectedVariantDetail.size.value }} ({{
                  selectedVariantDetail.size.measurement_system
                }})
              </div>
            </div>

            <div>
              <div class="text-weight-medium">SKU:</div>
              <div>{{ selectedVariantDetail.sku || '—' }}</div>
            </div>

            <div>
              <div class="text-weight-medium">Цена:</div>
              <div>{{ formatPrice(selectedVariantDetail.price) }}</div>
            </div>

            <div>
              <div class="text-weight-medium">Статус:</div>
              <q-chip
                :color="selectedVariantDetail.is_active ? 'positive' : 'negative'"
                text-color="white"
                size="sm"
              >
                {{ selectedVariantDetail.is_active ? 'Активен' : 'Неактивен' }}
              </q-chip>
            </div>

            <div>
              <div class="text-weight-medium">Атрибуты:</div>
              <div
                v-if="
                  selectedVariantDetail.attributes &&
                  Object.keys(selectedVariantDetail.attributes).length > 0
                "
              >
                <q-btn
                  flat
                  dense
                  label="Просмотреть"
                  icon="visibility"
                  size="sm"
                  @click="showAttributesDialog(selectedVariantDetail.attributes)"
                />
              </div>
              <div v-else class="text-grey-5">Отсутствуют</div>
            </div>

            <div>
              <div class="text-weight-medium">Сервис:</div>
              <div>{{ getServiceName() }}</div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Закрыть" v-close-popup />
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
                  <q-item-label caption>{{ String(value) }}</q-item-label>
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
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import {
  useServiceVariantsStore,
  type ProductVariant,
  type ProductVariantDetail,
  type ProductVariantCreatePayload,
  type ProductVariantUpdatePayload,
  type VariantAttachment,
} from 'stores/service-variants.store';
import { useSizesStore } from 'stores/sizes.store';
import { useSizeChartsStore } from 'stores/size-charts.store'; // 🆕 Добавляем стор размерных сеток
import { useServicesStore } from 'stores/services.store';
import { useQuasar, Dialog } from 'quasar';
import type { QTableProps, QTableColumn } from 'quasar';

// === ТИПЫ ===
// ✅ ИСПРАВЛЕНИЕ: Делаем поле id опциональным
interface VariantFormData {
  id?: string; // Опциональное поле
  size_id: string;
  sku: string;
  price: string;
  is_active: boolean;
  attributes: Record<string, unknown>;
  newFiles?: File[] | null; // Новые файлы для загрузки
}

// Интерфейс для превью файлов
interface FilePreview {
  file: File;
  url: string;
  name: string;
  alt_text: string;
  is_primary: boolean;
  order: number;
}



// === КОМПОЗАБЛЫ ===
const $q = useQuasar();
const serviceVariantsStore = useServiceVariantsStore();
const sizesStore = useSizesStore();
const sizeChartsStore = useSizeChartsStore(); // 🆕 Добавляем стор размерных сеток
const servicesStore = useServicesStore();

// === СОСТОЯНИЕ ===
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
const diagnosisLoading = ref(false); // 🆕 Состояние для диагностики
const attributesError = ref(false);
const attributesErrorMessage = ref('');
const attributesJsonString = ref('');
const currentAttributes = ref<Record<string, unknown> | null>(null);
const selectedServiceId = ref<string>('');

// Состояние для диалога просмотра изображений
const detailCarouselSlide = ref<string>('');

const currentVariant = ref<VariantFormData>({
  size_id: '',
  sku: '',
  price: '',
  is_active: true,
  attributes: {},
  newFiles: null,
});

// === СОСТОЯНИЕ ДЛЯ РАБОТЫ С ФАЙЛАМИ ===
const filesPreviews = ref<FilePreview[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);

// === COMPUTED ===

// Информация о текущем сервисе
const currentServiceInfo = computed(() => {
  if (!selectedServiceId.value) return null;
  return servicesStore.services.find((s) => s.id === selectedServiceId.value) || null;
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

// Опции для выбора сервиса
const serviceOptions = computed(() =>
  servicesStore.services.map((service) => ({
    id: service.id,
    name: service.name,
  })),
);

// Опции для размеров с проверкой доступности
const sizeOptions = computed(() => {
  const sizes = sizesStore.sizes;
  if (!sizes || sizes.length === 0) return [];

  // Получаем ID размеров, которые уже используются в вариантах
  const usedSizeIds = new Set(serviceVariantsStore.variants.map((variant) => variant.size.id));

  return sizes.map((size) => {
    const isUsed = usedSizeIds.has(size.id);
    const isCurrentEditing = isEditing.value && currentVariant.value.size_id === size.id;

    return {
      // ✅ ИСПРАВЛЕНИЕ: Убираем дублирование свойства id
      id: size.id,
      value: size.value,
      measurement_system: size.measurement_system,
      base_value: size.base_value,
      displayName:
        isUsed && !isCurrentEditing
          ? `${size.value} (${size.measurement_system}) - УЖЕ ИСПОЛЬЗУЕТСЯ`
          : `${size.value} (${size.measurement_system})`,
      isDisabled: isUsed && !isCurrentEditing, // Не блокируем текущий редактируемый размер
    };
  });
});

// Колонки таблицы
const columns = computed((): QTableColumn[] => {
  return [
    {
      name: 'attachments',
      label: 'Изображение',
      field: 'id',
      align: 'center',
      sortable: false,
    },
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

// === МЕТОДЫ ===

// Функции для работы с изображениями вариантов
function getPrimaryVariantImage(variant: ProductVariant): string | null {
  const attachments = serviceVariantsStore.getVariantAttachments(variant.id);
  if (!attachments?.length) return null;
  const primary = attachments.find((att) => att.is_primary);
  return primary?.file || attachments[0]?.file || null;
}

function getPrimaryVariantImageSafe(variant: ProductVariant): string | null {
  const imageUrl = getPrimaryVariantImage(variant);
  return imageUrl || null;
}

function getVariantImages(variant: ProductVariantDetail): VariantAttachment[] {
  // Возвращаем attachments из кеша store
  return serviceVariantsStore.getVariantAttachments(variant.id) || [];
}

function getServiceName(): string {
  const service = servicesStore.services.find(
    (s) => s.id === serviceVariantsStore.currentServiceId,
  );
  return service?.name || 'Неизвестный сервис';
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

  // 🔧 ИСПРАВЛЕНИЕ: используем правильные методы стора
  if (searchValue.length >= 2) {
    console.log('🔍 Searching variants with query:', searchValue);
    await serviceVariantsStore.searchVariants(searchValue);
  } else if (searchValue.length === 0) {
    console.log('🔄 Clearing search filters');
    await serviceVariantsStore.clearFilters();
  }
}

async function clearSearch(): Promise<void> {
  searchQuery.value = '';
  console.log('🧹 Clearing search completely');
  await serviceVariantsStore.clearFilters();
}

// Обработчик изменения выбранного сервиса
async function onServiceChange(newServiceId: string): Promise<void> {
  if (!newServiceId) {
    // Сброс контекста
    serviceVariantsStore.clearServiceContext();
    selectedServiceId.value = '';
    return;
  }

  // Устанавливаем контекст и загружаем данные
  serviceVariantsStore.setServiceContext(newServiceId);
  selectedServiceId.value = newServiceId;
  const variants = await serviceVariantsStore.fetchVariants();
  
  // Загружаем изображения для всех вариантов
  if (variants && variants.length > 0) {
    console.log('🖼️ Loading images for', variants.length, 'variants');
    await Promise.all(
      variants.map(variant => 
        serviceVariantsStore.fetchVariantAttachments(variant.id)
      )
    );
    console.log('✅ Images loaded for all variants');
  }
}

async function openVariantDetailFromButton(row: ProductVariant): Promise<void> {
  const fullVariantData = await serviceVariantsStore.fetchVariantById(row.id);
  if (fullVariantData) {
    selectedVariantDetail.value = fullVariantData;
    
    // Инициализируем слайд карусели первым изображением
    const images = getVariantImagesDetailed(fullVariantData);
    if (images && images.length > 0) {
      detailCarouselSlide.value = images[0]?.id || '';
    }
    
    variantDetailDialogVisible.value = true;
  }
}

// ✅ ИСПРАВЛЕНИЕ: Полная очистка формы при создании
function openCreateVariantDialog(): void {
  if (!hasValidContext.value) {
    $q.notify({ type: 'negative', message: 'Выберите сервис для создания варианта' });
    return;
  }

  // ✅ ДОБАВЛЯЕМ ПРОВЕРКУ ЗАГРУЖЕННЫХ РАЗМЕРОВ
  if (sizesStore.sizes.length === 0) {
    $q.notify({ 
      type: 'warning', 
      message: 'Размеры не загружены. Попробуйте обновить список размеров.' 
    });
    return;
  }

  console.log('🆕 Opening CREATE variant dialog');
  isEditing.value = false;

  // Очищаем превью файлов при открытии создания
  filesPreviews.value.forEach((preview) => {
    if (preview.url) {
      URL.revokeObjectURL(preview.url);
    }
  });
  filesPreviews.value = [];

  // Создаем новый объект без поля id
  currentVariant.value = {
    size_id: '',
    sku: '',
    price: '',
    is_active: true,
    attributes: {},
    newFiles: null,
  };

  // ✅ ИСПРАВЛЕНИЕ: Явно удаляем id, если оно есть - используем правильный тип
  if ('id' in currentVariant.value) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = currentVariant.value;
    currentVariant.value = rest;
  }

  attributesJsonString.value = '{}';
  attributesError.value = false;
  attributesErrorMessage.value = '';
  variantDialogVisible.value = true;

  console.log('✅ CREATE form initialized:', {
    isEditing: isEditing.value,
    hasId: 'id' in currentVariant.value,
    formData: currentVariant.value,
  });
}

async function openEditVariantDialog(variant: ProductVariant): Promise<void> {
  console.log('✏️ Opening EDIT variant dialog for:', variant.id);
  isEditing.value = true;

  // Очищаем превью файлов при открытии редактирования
  filesPreviews.value.forEach((preview) => {
    if (preview.url) {
      URL.revokeObjectURL(preview.url);
    }
  });
  filesPreviews.value = [];

  const fullVariantData = await serviceVariantsStore.fetchVariantById(variant.id);
  if (fullVariantData) {
    currentVariant.value = {
      id: fullVariantData.id,
      size_id: fullVariantData.size.id,
      sku: fullVariantData.sku || '',
      price: fullVariantData.price || '',
      is_active: fullVariantData.is_active,
      attributes: fullVariantData.attributes || {},
      newFiles: null,
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
      newFiles: null,
    };
    attributesJsonString.value = variant.attributes
      ? JSON.stringify(variant.attributes, null, 2)
      : '{}';
  }
  attributesError.value = false;
  attributesErrorMessage.value = '';
  variantDialogVisible.value = true;

  console.log('✅ EDIT form initialized:', {
    isEditing: isEditing.value,
    hasId: !!currentVariant.value.id,
    variantId: currentVariant.value.id,
    formData: currentVariant.value,
  });
}

// ✅ ИСПРАВЛЕНИЕ: Убираем async, так как нет await
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
    // ✅ ИСПРАВЛЕНИЕ: Используем void operator для Promise
    void serviceVariantsStore.deleteVariant(variant.id);
  });
}

function editFromDetail(): void {
  if (selectedVariantDetail.value) {
    variantDetailDialogVisible.value = false;
    // ✅ ИСПРАВЛЕНИЕ: Используем void operator для Promise
    void openEditVariantDialog(selectedVariantDetail.value);
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
  if (!price) return '—';
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return price;

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
  }).format(numPrice);
}

// Загрузка размеров через размерную сетку по умолчанию
async function loadSizes(): Promise<void> {
  sizesLoading.value = true;
  try {
    // 🔧 ИСПРАВЛЕНИЕ: Используем размерную сетку по умолчанию

    // 1. Сначала загружаем размерные сетки
    const sizeCharts = await sizeChartsStore.fetchSizeCharts();

    if (!sizeCharts || sizeCharts.length === 0) {
      console.warn('Размерные сетки не найдены');
      $q.notify({
        type: 'warning',
        message: 'Размерные сетки не найдены. Создайте размерную сетку для работы с размерами.',
      });
      return;
    }

    // 2. Используем первую доступную размерную сетку
    const firstSizeChart = sizeCharts[0];
    if (!firstSizeChart) {
      throw new Error('Размерная сетка не найдена');
    }

    console.info(
      `Используем размерную сетку по умолчанию: ${firstSizeChart.name || firstSizeChart.id}`,
    );

    // 3. Устанавливаем размерную сетку и загружаем размеры
    sizesStore.setSizeChartId(firstSizeChart.id);
    await sizesStore.fetchSizes();
    
    // ✅ ДОБАВЛЯЕМ ОТЛАДОЧНУЮ ИНФОРМАЦИЮ
    console.log('📏 Sizes loaded:', {
      sizeChartId: firstSizeChart.id,
      sizeChartName: firstSizeChart.name,
      sizesCount: sizesStore.sizes.length,
      sizes: sizesStore.sizes.map(s => ({ id: s.id, value: s.value })),
    });
  } catch (error) {
    console.error('Failed to load sizes:', error);
    $q.notify({
      type: 'negative',
      message: 'Не удалось загрузить размеры. Проверьте настройки размерных сеток.',
    });
  } finally {
    sizesLoading.value = false;
  }
}

// ✅ ДОБАВЛЯЕМ ФУНКЦИЮ ДЛЯ ОБНОВЛЕНИЯ РАЗМЕРОВ
async function refreshSizes(): Promise<void> {
  console.log('🔄 Refreshing sizes...');
  await loadSizes();
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

// ✅ ИСПРАВЛЕНИЕ: Улучшенная логика сохранения с поддержкой изображений
async function saveVariant(): Promise<void> {
  console.log('💾 === SAVE VARIANT CALLED ===');
  console.log('📁 currentVariant.newFiles:', currentVariant.value.newFiles);
  console.log('🖼️ filesPreviews count:', filesPreviews.value.length);
  console.log('🔧 canSaveVariant:', canSaveVariant.value);
  
  if (!canSaveVariant.value) {
    $q.notify({ type: 'negative', message: 'Заполните все обязательные поля.' });
    return;
  }

  if (attributesError.value) {
    $q.notify({ type: 'negative', message: 'Исправьте ошибки в атрибутах.' });
    return;
  }

  // ✅ ДОБАВЛЯЕМ ВАЛИДАЦИЮ РАЗМЕРА
  const selectedSizeId = currentVariant.value.size_id;
  const availableSizes = sizesStore.sizes;
  const sizeExists = availableSizes.some(size => size.id === selectedSizeId);
  
  if (!sizeExists) {
    console.error('❌ Size validation failed:', {
      selectedSizeId,
      availableSizes: availableSizes.map(s => ({ id: s.id, value: s.value })),
    });
    $q.notify({ 
      type: 'negative', 
      message: 'Выбранный размер не найден. Обновите список размеров и выберите размер заново.',
      actions: [
        {
          label: 'Обновить размеры',
          color: 'white',
          handler: () => {
            void refreshSizes();
          }
        }
      ]
    });
    return;
  }

  const payload: ProductVariantCreatePayload | ProductVariantUpdatePayload = {
    size: currentVariant.value.size_id,
    sku: currentVariant.value.sku,
    price: currentVariant.value.price,
    is_active: currentVariant.value.is_active,
    attributes: currentVariant.value.attributes,
  };

  // ✅ ДОБАВЛЯЕМ ОТЛАДОЧНУЮ ИНФОРМАЦИЮ
  console.log('🔍 SaveVariant DEBUG:', {
    isEditing: isEditing.value,
    hasId: !!currentVariant.value.id,
    variantId: currentVariant.value.id,
    willUpdate: isEditing.value && !!currentVariant.value.id,
    willCreate: !isEditing.value || !currentVariant.value.id,
    payload,
    hasNewFiles: !!currentVariant.value.newFiles?.length,
  });

  let success = false;
  let variantId: string | null = null;

  if (isEditing.value && currentVariant.value.id) {
    console.log('🔄 UPDATING variant:', currentVariant.value.id);
    const updatedVariant = await serviceVariantsStore.updateVariant(
      currentVariant.value.id,
      payload as ProductVariantUpdatePayload,
    );
    if (updatedVariant) {
       success = true;
       variantId = currentVariant.value.id;
     }
  } else {
    console.log('🆕 CREATING new variant');
    const newVariant = await serviceVariantsStore.createVariant(
      payload as ProductVariantCreatePayload,
    );
    if (newVariant) {
       success = true;
       variantId = newVariant.id;
     }
  }

  // Загружаем изображения, если вариант успешно сохранен
  console.log('🔍 Checking file upload conditions:', {
    success,
    variantId,
    hasNewFiles: !!currentVariant.value.newFiles,
    newFilesLength: currentVariant.value.newFiles?.length || 0,
    willUpload: success && variantId && currentVariant.value.newFiles && currentVariant.value.newFiles.length > 0
  });
  
  if (success && variantId && currentVariant.value.newFiles && currentVariant.value.newFiles.length > 0) {
    try {
      console.log('📸 Uploading images for variant:', variantId);
      console.log('📁 Files to upload:', currentVariant.value.newFiles.length);
      console.log('🏷️ Alt texts:', filesPreviews.value.map(p => p.alt_text));
      
      // Подготавливаем файлы и alt_text для загрузки
      const files = Array.from(currentVariant.value.newFiles);
      const altTexts = filesPreviews.value.map(preview => preview.alt_text || '');
      
      console.log('🚀 Calling uploadMultipleVariantAttachments with:', {
        variantId: variantId,
        filesCount: files.length,
        altTextsCount: altTexts.length
      });
      
      // Используем метод из store для загрузки изображений
      const uploadedAttachments = await serviceVariantsStore.uploadMultipleVariantAttachments(
        variantId,
        files,
        altTexts
      );
      
      if (uploadedAttachments.length > 0) {
        console.log('✅ Images uploaded successfully:', uploadedAttachments.length);
        $q.notify({
          type: 'positive',
          message: `Загружено ${uploadedAttachments.length} изображений`,
        });
      }
    } catch (error) {
      console.error('❌ Failed to upload images:', error);
      $q.notify({
        type: 'warning',
        message: 'Вариант сохранен, но не удалось загрузить изображения',
      });
    }
  }

  if (success) {
    variantDialogVisible.value = false;
    resetForm();
  }
}

// ✅ ИСПРАВЛЕНИЕ: Полная очистка формы
function resetForm(): void {
  console.log('🧹 Resetting form');
  isEditing.value = false;
  
  // Очищаем файлы и освобождаем URL объекты
  filesPreviews.value.forEach((preview) => {
    if (preview.url) {
      URL.revokeObjectURL(preview.url);
    }
  });
  filesPreviews.value = [];
  currentVariant.value.newFiles = null;

  // Создаем новый объект без поля id
  currentVariant.value = {
    size_id: '',
    sku: '',
    price: '',
    is_active: true,
    attributes: {},
  };

  // ✅ ИСПРАВЛЕНИЕ: Явно удаляем id, если оно есть - используем правильный тип
  if ('id' in currentVariant.value) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = currentVariant.value;
    currentVariant.value = rest;
  }

  attributesJsonString.value = '{}';
  attributesError.value = false;
  attributesErrorMessage.value = '';

  console.log('✅ Form reset complete:', {
    isEditing: isEditing.value,
    hasId: 'id' in currentVariant.value,
    formData: currentVariant.value,
  });
}

// Массовые операции
async function bulkActivate(): Promise<void> {
  if (selectedRows.value.length === 0) return;

  bulkOperationLoading.value = true;
  try {
    const ids = selectedRows.value.map((row) => row.id);
    await serviceVariantsStore.bulkUpdateVariantStatus(ids, true);
    selectedRows.value = [];
  } finally {
    bulkOperationLoading.value = false;
  }
}

async function bulkDeactivate(): Promise<void> {
  if (selectedRows.value.length === 0) return;

  bulkOperationLoading.value = true;
  try {
    const ids = selectedRows.value.map((row) => row.id);
    await serviceVariantsStore.bulkUpdateVariantStatus(ids, false);
    selectedRows.value = [];
  } finally {
    bulkOperationLoading.value = false;
  }
}

// ✅ ИСПРАВЛЕНИЕ: Убираем async, используем правильный тип для onOk
function bulkDelete(): void {
  if (selectedRows.value.length === 0) return;

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
    // ✅ ИСПРАВЛЕНИЕ: Используем void operator и создаем async функцию внутри
    void (async (): Promise<void> => {
      bulkOperationLoading.value = true;
      try {
        const ids = selectedRows.value.map((row) => row.id);
        await serviceVariantsStore.bulkDeleteVariants(ids);
        selectedRows.value = [];
      } finally {
        bulkOperationLoading.value = false;
      }
    })();
  });
}

// 🆕 Диагностика всех вариантов (включая скрытые)
async function diagnoseAllVariants(): Promise<void> {
  if (!serviceVariantsStore.currentServiceId) {
    $q.notify({ type: 'negative', message: 'Выберите сервис для диагностики' });
    return;
  }

  diagnosisLoading.value = true;
  try {
    console.log('🔍 === ДИАГНОСТИКА ВСЕХ ВАРИАНТОВ ===');

    // Используем метод проверки из стора для получения всех вариантов
    await serviceVariantsStore.checkExistingVariant(
      'dummy-size-id',
      serviceVariantsStore.currentServiceId,
    );

    // Принудительно перезагружаем варианты
    await serviceVariantsStore.fetchVariants();

    $q.notify({
      type: 'positive',
      message: 'Диагностика завершена. Проверьте консоль браузера для подробностей.',
      timeout: 5000,
    });
  } catch (error) {
    console.error('Error during diagnosis:', error);
    $q.notify({
      type: 'negative',
      message: 'Ошибка при диагностике. Проверьте консоль браузера.',
    });
  } finally {
    diagnosisLoading.value = false;
  }
}

// === ФУНКЦИИ ДЛЯ РАБОТЫ С ФАЙЛАМИ ===

// Получение изображений варианта из стора (обновленная версия)
function getVariantImagesDetailed(variant: ProductVariantDetail): VariantAttachment[] {
  if (!variant?.id) return [];
  const attachments = serviceVariantsStore.getVariantAttachments(variant.id) || [];
  return attachments.map(att => ({
    ...att,
    alt_text: att.alt_text || ''
  }));
}

// Обработка загрузки файлов
function handleFileUpload(files: File[] | null): void {
  if (!files || files.length === 0) {
    filesPreviews.value = [];
    currentVariant.value.newFiles = null;
    return;
  }

  // Сохраняем файлы в currentVariant для последующей загрузки
  currentVariant.value.newFiles = files;

  filesPreviews.value = files.map((file, index) => {
    const url = URL.createObjectURL(file);
    return {
      file,
      url,
      name: file.name,
      alt_text: '',
      is_primary: index === 0 && filesPreviews.value.length === 0, // Первый файл - главный
      order: index,
    };
  });
}

// Удаление файла из превью
function removeFile(index: number): void {
  const preview = filesPreviews.value[index];
  if (preview?.url) {
    URL.revokeObjectURL(preview.url);
  }
  filesPreviews.value.splice(index, 1);
  
  // Обновляем массив файлов в currentVariant
  if (currentVariant.value.newFiles) {
    const newFilesArray = Array.from(currentVariant.value.newFiles);
    newFilesArray.splice(index, 1);
    currentVariant.value.newFiles = newFilesArray.length > 0 ? newFilesArray : null;
  }
  
  // Обновляем порядок
  filesPreviews.value.forEach((preview, idx) => {
    preview.order = idx;
  });
  
  // Если удалили главное изображение, делаем главным первое
  if (preview?.is_primary && filesPreviews.value.length > 0 && filesPreviews.value[0]) {
    filesPreviews.value[0].is_primary = true;
  }
}

// Обновление главного изображения
function updatePrimaryImage(index: number, isPrimary: boolean): void {
  if (index < 0 || index >= filesPreviews.value.length) return;
  
  if (isPrimary) {
    // Убираем флаг главного у всех остальных
    filesPreviews.value.forEach((preview, idx) => {
      preview.is_primary = idx === index;
    });
  } else {
    const preview = filesPreviews.value[index];
    if (preview) {
      preview.is_primary = false;
    }
    // Если убрали главное, делаем главным первое изображение
    if (filesPreviews.value.length > 0 && filesPreviews.value[0]) {
      filesPreviews.value[0].is_primary = true;
    }
  }
}

// Перемещение файла вверх
function moveFileUp(index: number): void {
  if (index > 0 && index < filesPreviews.value.length && filesPreviews.value[index] && filesPreviews.value[index - 1]) {
    const temp = filesPreviews.value[index];
    filesPreviews.value[index] = filesPreviews.value[index - 1]!;
    filesPreviews.value[index - 1] = temp;
    
    // Обновляем порядок
    filesPreviews.value.forEach((preview, idx) => {
      preview.order = idx;
    });
  }
}

// Перемещение файла вниз
function moveFileDown(index: number): void {
  if (index >= 0 && index < filesPreviews.value.length - 1 && filesPreviews.value[index] && filesPreviews.value[index + 1]) {
    const temp = filesPreviews.value[index];
    filesPreviews.value[index] = filesPreviews.value[index + 1]!;
    filesPreviews.value[index + 1] = temp;
    
    // Обновляем порядок
    filesPreviews.value.forEach((preview, idx) => {
      preview.order = idx;
    });
  }
}

// Обновление описания существующего изображения
function updateExistingImageAlt(image: VariantAttachment, altText: string): void {
  if (!currentVariant.value.id) return;
  
  // Обновляем через стор
  void serviceVariantsStore.updateVariantAttachment(currentVariant.value.id, image.id, {
    alt_text: altText,
    is_primary: image.is_primary,
    order: image.order,
  }).catch(error => {
    console.error('Failed to update image alt:', error);
    $q.notify({ type: 'negative', message: 'Не удалось обновить описание изображения' });
  });
}

// Обновление статуса главного изображения для существующего
function updateExistingImagePrimary(image: VariantAttachment, isPrimary: boolean): void {
  if (!currentVariant.value.id) return;
  
  // Если делаем изображение главным, убираем флаг у остальных
  if (isPrimary) {
    const allImages = getVariantImagesDetailed({ id: currentVariant.value.id } as ProductVariantDetail);
    allImages.forEach((img) => {
      if (img.id !== image.id && img.is_primary) {
        void serviceVariantsStore.updateVariantAttachment(currentVariant.value.id!, img.id, {
          alt_text: img.alt_text || '',
          is_primary: false,
          order: img.order,
        }).catch(error => {
          console.error('Failed to update image primary status:', error);
        });
      }
    });
  }
  
  // Обновляем текущее изображение
  void serviceVariantsStore.updateVariantAttachment(currentVariant.value.id, image.id, {
    alt_text: image.alt_text || '',
    is_primary: isPrimary,
    order: image.order,
  }).catch(error => {
    console.error('Failed to set primary image:', error);
    $q.notify({ type: 'negative', message: 'Не удалось установить главное изображение' });
  });
}

// Подтверждение удаления существующего изображения
function deleteExistingImageConfirm(image: VariantAttachment): void {
  Dialog.create({
    title: 'Подтвердите удаление',
    message: 'Вы уверены, что хотите удалить это изображение?',
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
    if (currentVariant.value.id) {
      void serviceVariantsStore.deleteVariantAttachment(currentVariant.value.id, image.id).catch(error => {
        console.error('Failed to delete image:', error);
        $q.notify({ type: 'negative', message: 'Не удалось удалить изображение' });
      });
    }
  });
}

// === LIFECYCLE ===
onMounted(async () => {
  // Загружаем справочники параллельно
  await Promise.all([
    loadServices(),
    loadSizes(), // Это уже включает загрузку размерных сеток
  ]);
});

// Очистка URL объектов при размонтировании
onBeforeUnmount(() => {
  filesPreviews.value.forEach((preview) => {
    if (preview.url) {
      URL.revokeObjectURL(preview.url);
    }
  });
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

// 🆕 Стили для зачеркнутого текста и индикации использованных размеров
.text-strike {
  text-decoration: line-through;
}

// === СТИЛИ ДЛЯ ИЗОБРАЖЕНИЙ ===
.service-image-card,
.uploaded-image-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background: white;
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.service-img-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  flex-shrink: 0;

  .service-image {
    width: 100%;
    height: 100%;
    border-radius: 8px;
  }

  .remove-img-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(4px);
    border-radius: 50%;
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;

    &:hover {
      background: rgba(255, 255, 255, 1);
    }
  }

  .img-number-badge {
    position: absolute;
    top: 4px;
    left: 4px;
    font-weight: bold;
  }
}

.existing-images-section {
  .uploaded-image-card {
    border-color: #c8e6c9;
    background: #f1f8e9;
  }
}
</style>
