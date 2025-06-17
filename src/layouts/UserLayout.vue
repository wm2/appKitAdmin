<template>
  <q-layout view="hHh lpR fFf">
    <header-component />
    <left-side-bar />
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import HeaderComponent from 'components/HeaderComponent.vue';
import LeftSideBar from 'components/LeftSidebar/LeftSideBarMenu.vue';
</script>

<style scoped lang="scss"></style>
