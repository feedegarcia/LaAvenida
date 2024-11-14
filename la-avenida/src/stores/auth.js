// src/stores/auth.js
import { defineStore } from 'pinia'
import { jwtDecode } from 'jwt-decode'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: localStorage.getItem('token'),
        user: null
    }),

    getters: {
        isAuthenticated: (state) => !!state.token,
        userRole: (state) => state.user?.rol || null
    },

    actions: {
        setToken(token) {
            this.token = token
            localStorage.setItem('token', token)
            if (token) {
                this.user = jwtDecode(token)
            }
        },

        logout() {
            this.token = null
            this.user = null
            localStorage.removeItem('token')
        },

        initializeAuth() {
            const token = localStorage.getItem('token')
            if (token) {
                try {
                    this.user = jwtDecode(token)
                    this.token = token
                } catch (error) {
                    this.logout()
                }
            }
        }
    }
})
