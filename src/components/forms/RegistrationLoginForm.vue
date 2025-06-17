<template>
  <div class="form">
    <div v-if="props.title" class="form__header">
      {{ props.title }}
    </div>

    <q-form class="form__body" @submit="$emit('submit', $event)">
      <slot name="body"/>

      <div class="form__footer">
        <slot name="footer" />
      </div>
    </q-form>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{title?: string }>(), {
  title: ''
})

// Убедитесь, что событие 'submit' объявлено
defineEmits(['submit'])
</script>

<style lang="scss" scoped>
@import "/src/css/colors";
@import "/src/css/typography";

.form {
  display: flex;
  flex-direction: column;
  flex-basis: 400px;
  background: $white;
  padding: 48px 30px;
  border-radius: 8px;
  border: 1px solid #E9E9E9;
  box-shadow: 0 24px 49px rgba(0, 0, 0, 0.04);

  &__header {
    display: flex;
    justify-content: center;
    margin-bottom: 30px;
    @include h3()
  }

  &__body {
    background: $white;
    display: flex;
    flex-direction: column;
  }
  &__footer {
    display: flex;
    justify-content: center;
    margin-top: 20px; /* Добавил небольшой отступ для красоты */
  }
}
</style>