
<template>
    <router-view v-if="isLoginPage"></router-view>
    <div v-else class="min-h-screen bg-gray-100 flex">
        <Sidebar />
        <div class="flex-1 ml-64 p-8">
            <div class="bg-white rounded-lg shadow-lg p-6">
                <router-view></router-view>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed } from 'vue'
    import { useRoute } from 'vue-router'
    import Sidebar from './components/layout/Sidebar.vue'

    const route = useRoute()
    const isLoginPage = computed(() => route.path === '/login')
</script>
