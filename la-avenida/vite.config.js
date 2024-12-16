import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    css: {
        preprocessorOptions: {
            css: {
                charset: false
            }
        }
    },
    server: {
        fs: {
            strict: true
        }
    },
    build: {
        charset: 'utf8'
    }
})