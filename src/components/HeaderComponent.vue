<template>
  <q-header elevated>
    <q-toolbar>
      <q-btn flat dense round icon="menu" aria-label="Menu" @click="uiStore.toggleLeftDrawer" />

      <q-toolbar-title> Админ панель </q-toolbar-title>

      <div v-if="userStore.isLoggedIn" class="q-gutter-sm row items-center no-wrap">
        <span v-if="userStore.profile" class="text-subtitle2">
          {{ userStore.profile.email }}
        </span>

        <q-btn round dense flat icon="logout" aria-label="Выход" @click="handleLogout">
          <q-tooltip>Выход</q-tooltip>
        </q-btn>
      </div>
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import { useUiStore } from 'stores/ui.store';
import { useUserStore } from 'stores/user.store';
import { useRouter } from 'vue-router';

const uiStore = useUiStore();

// 1. Получаем доступ к хранилищу пользователя и роутеру
const userStore = useUserStore();
const router = useRouter();

// 2. Создаем функцию для выхода
const handleLogout = async () => {
  // Вызываем действие logout из хранилища, передавая ему роутер
  await userStore.logout(router);
};
</script>

<style scoped lang="scss">
/* Сюда можно добавить стили при необходимости */
</style>
