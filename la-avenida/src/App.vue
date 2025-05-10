<template>
    <router-view v-if="isLoginPage"></router-view>
    <Navbar v-else>
        <router-view></router-view>
    </Navbar>
</template>

<script setup>
    import { computed } from 'vue';
    import { useRoute } from 'vue-router';
    import Navbar from './components/layout/Navbar.vue';

    const route = useRoute();
    const isLoginPage = computed(() => route.path === '/login');
</script>