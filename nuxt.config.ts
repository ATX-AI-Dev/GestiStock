export default defineNuxtConfig({
  ssr: false, 
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'], // <-- C'est ici qu'on charge ton CSS
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: ''
  },
  compatibilityDate: '2024-04-03'
})