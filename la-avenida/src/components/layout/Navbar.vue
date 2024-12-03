<template>
    <div class="fixed top-0 left-0 right-0 z-50">
        <!-- Navbar principal -->
        <nav class="bg-avenida-black/95 backdrop-blur-sm border-b border-white/10">
            <div class="container mx-auto px-4 lg:px-8">
                <div class="flex justify-between items-center h-20">
                    <!-- Menu hamburguesa para movil -->
                    <button @click="mobileMenuOpen = !mobileMenuOpen"
                            class="lg:hidden text-white/90 hover:text-avenida-green">
                        <Menu v-if="!mobileMenuOpen" class="w-6 h-6" />
                        <X v-else class="w-6 h-6" />
                    </button>

                    <!-- Links de navegacion -->
                    <div class="hidden lg:flex items-center space-x-1 flex-1">
                        <router-link v-for="link in navigationLinks"
                                     :key="link.to"
                                     :to="link.to"
                                     class="nav-button group">
                            <span class="relative z-10">{{ link.text }}</span>
                        </router-link>
                        <button @click="logout"
                                class="nav-button group">
                            <span class="relative z-10 text-red-400 hover:text-red-300">CERRAR SESIoN</span>
                        </button>
                    </div>

                    <!-- Logo y nombre -->
                    <div class="flex items-center gap-4">
                        <div class="hidden lg:block text-right">
                            <p class="text-white/90 text-sm font-semibold tracking-wider">LA AVENIDA</p>
                            <p class="text-white/90 text-xs">Domingos Siempre</p>
                        </div>
                        <img src="/logo-la-avenida.png"
                             alt="La Avenida"
                             class="w-16 h-16 object-contain">
                    </div>
                </div>
            </div>
        </nav>

        <!-- Menu movil -->
        <transition enter-active-class="transition duration-200 ease-out"
                    enter-from-class="opacity-0 -translate-y-1"
                    enter-to-class="opacity-100 translate-y-0"
                    leave-active-class="transition duration-150 ease-in"
                    leave-from-class="opacity-100 translate-y-0"
                    leave-to-class="opacity-0 -translate-y-1">
            <div v-if="mobileMenuOpen"
                 class="lg:hidden bg-avenida-black/95 backdrop-blur-sm border-b border-white/10">
                <div class="container mx-auto px-4 py-4 space-y-2">
                    <router-link v-for="link in navigationLinks"
                                 :key="link.to"
                                 :to="link.to"
                                 class="mobile-nav-button"
                                 @click="mobileMenuOpen = false">
                        {{ link.text }}
                    </router-link>
                    <button @click="logout"
                            class="mobile-nav-button text-red-400 hover:text-red-300 text-left w-full">
                        CERRAR SESIoN
                    </button>
                </div>
            </div>
        </transition>
    </div>

    <!-- Espaciador para el contenido -->
    <div class="h-20"></div>

    <!-- Contenido principal -->
    <main class="container mx-auto px-4 py-8">
        <slot></slot>
    </main>
</template>

<script setup>
    import { ref, computed, onMounted } from 'vue';
    import { useRouter } from 'vue-router';
    import { jwtDecode } from 'jwt-decode';
    import { Menu, X } from 'lucide-vue-next';

    const router = useRouter();
    const userRole = ref('');
    const mobileMenuOpen = ref(false);

    const navigationLinks = computed(() => {
        const links = [
            { to: '/pedidos', text: 'PEDIDOS' },
            { to: '/stock', text: 'STOCK' },
            { to: '/cierre-caja', text: 'CIERRE DE CAJA' }
        ];

        if (userRole.value === 'ADMIN') {
            links.push(
                { to: '/', text: 'DASHBOARD' },
                { to: '/admin/users', text: 'USUARIOS' },
                { to: '/admin/sucursales', text: 'SUCURSALES' },
            { to: '/calendario', text: 'CALENDARIO' }
            );
        }

        return links;
    });

    const logout = async () => {
        localStorage.removeItem('token');
        await router.push('/login');
        window.location.reload();
    };

    onMounted(() => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const decoded = jwtDecode(token);
                userRole.value = decoded.rol;
            }
        } catch (error) {
            console.error('Error decodificando token:', error);
        }
    });
</script>

<style scoped>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600&display=swap');

    .nav-button {
        @apply relative px-4 py-2 text-sm font-['Montserrat'] font-semibold tracking-wider text-white/80 transition-all duration-300 rounded-lg overflow-hidden;
    }

        .nav-button::before {
            content: '';
            @apply absolute inset-0 bg-white/5 transform scale-x-0 origin-left transition-transform duration-300;
        }

        .nav-button:hover::before,
        .nav-button.router-link-active::before {
            @apply scale-x-100;
        }

        .nav-button::after {
            content: '';
            @apply absolute bottom-1 left-4 right-4 h-0.5 bg-avenida-green transform scale-x-0 transition-transform duration-300;
        }

        .nav-button:hover::after,
        .nav-button.router-link-active::after {
            @apply scale-x-100;
        }

        .nav-button.router-link-active {
            @apply text-white;
        }

    .mobile-nav-button {
        @apply block w-full px-4 py-3 text-sm font-['Montserrat'] font-medium tracking-wider text-white/80 transition-colors duration-200 rounded-lg hover:bg-white/5;
    }

        .mobile-nav-button.router-link-active {
            @apply text-white bg-white/5 font-semibold;
        }
</style>