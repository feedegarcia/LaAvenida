/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'avenida': {
                    black: '#1A1A1A',     // Negro principal
                    white: '#FFFFFF',     // Blanco
                    green: '#2D5A27',     // Verde oscuro (como espinaca)
                    'green-light': '#4C9F38', // Verde claro (como albahaca)
                    red: '#9B2335',       // Rojo (como tomate)
                    'red-light': '#E55137' // Rojo claro (como morrón)
                }
            }
        },
    },
    plugins: [],
}
