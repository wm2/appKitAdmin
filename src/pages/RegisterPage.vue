<template>
  <q-page class="login_page">
    <registration-login-form title="Registration">
      <template #body>
        <q-input v-model="email" class="login_page__input" outlined label="Email"></q-input>
        <q-input v-model="password" class="login_page__input" outlined label="Password">
          <template v-slot:append>
            <q-icon :name="ionEyeOutline" />
          </template>
        </q-input>
      </template>
      <template #footer>
        <q-btn class="login_page__btn" flat outline label="Submit"></q-btn>
      </template>
    </registration-login-form>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ionEyeOutline } from '@quasar/extras/ionicons-v5'
import RegistrationLoginForm from 'components/forms/RegistrationLoginForm.vue'

const email = ref('')
const password = ref('')
</script>

<style lang="scss" scoped>
@import "src/css/colors";
@import "src/css/typography";

.login_page {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: $background-color;

  &__input {
    min-height: 30px;
    &+& {
      margin: 30px 0;
    }
  }

  &__btn {
    display: flex;
    flex-grow: 1;
    background: $button-color;
    border-radius: 4px;
  }
}
</style>
