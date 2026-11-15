// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: false, // static SPA — deployed to GitHub Pages
  devtools: { enabled: false },
  css: ['~/assets/main.css'],
  app: {
    // Set NUXT_APP_BASE_URL=/<repo-name>/ when building for GitHub Pages (the workflow does this).
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      title: "Nadia's Feedings",
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#f7f4ef' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'Nadia' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap' },
        { rel: 'icon', type: 'image/svg+xml', href: 'icon.svg' },
        { rel: 'apple-touch-icon', href: 'apple-touch-icon.png' },
        { rel: 'manifest', href: 'manifest.webmanifest' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      firebaseApiKey: '',
      firebaseAuthDomain: '',
      firebaseProjectId: '',
      firebaseAppId: '',
    },
  },
})
