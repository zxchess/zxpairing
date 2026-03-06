/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // High-contrast, professional palette
                background: '#0a0a0a',
                surface: '#18181b', // zinc-900
                primary: '#3b82f6', // blue-500
                secondary: '#64748b', // slate-500
                text: '#f4f4f5', // zinc-100
                border: '#27272a', // zinc-800
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
