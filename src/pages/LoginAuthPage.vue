<template>
  <q-page class="login_page">
    <registration-login-form title="Login" @submit.prevent="handleLogin">
      <template #body>
        <q-input
          v-model="email"
          class="login_page__input"
          outlined
          label="Email"
          type="email"
          :rules="[val => !!val || 'Поле Email обязательно']"
        ></q-input>
        <q-input
          v-model="password"
          class="login_page__input"
          outlined
          label="Password"
          :type="isPasswordVisible ? 'text' : 'password'"
          :rules="[val => !!val || 'Поле Password обязательно']"
        >
          <template v-slot:append>
            <q-icon
              :name="isPasswordVisible ? ionEyeOffOutline : ionEyeOutline"
              class="cursor-pointer"
              @click="isPasswordVisible = !isPasswordVisible"
            />
          </template>
        </q-input>
      </template>
      <template #footer>
        <q-btn
          class="login_page__btn"
          flat
          outline
          label="Login"
          :loading="userStore.loading"
          @click="handleLogin"
          ></q-btn>
      </template>
    </registration-login-form>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router' // <--- ИЗМЕНЕНИЕ 1: Импортируем роутер
import { ionEyeOutline, ionEyeOffOutline } from '@quasar/extras/ionicons-v5'
import RegistrationLoginForm from 'components/forms/RegistrationLoginForm.vue'
import { useUserStore } from 'stores/user.store'

const userStore = useUserStore()
const router = useRouter() // <--- ИЗМЕНЕНИЕ 2: Получаем экземпляр роутера

const email = ref('')
const password = ref('')
const isPasswordVisible = ref(false)

const handleLogin = async () => {
  // Вызываем действие `login` из хранилища, передавая и данные, и роутер
  await userStore.login(
    {
      email: email.value,
      password: password.value,
    },
    router // <--- ИЗМЕНЕНИЕ 3: Передаем роутер в функцию
  )
}
</script>

<style lang="scss" scoped>
/* Твои стили остались без изменений */
@import "/src/css/colors";
@import "/src/css/typography";

.login_page {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: $background-color;

  &__input {
    min-height: 30px; // исправлено с mix-height
    & + & {
      margin: 30px 0;
    }
  }

  &__btn {
    display: flex;
    flex-grow: 1;
    background: $button-color;
    border-radius: 4px;
    color: white;
  }
}
</style>