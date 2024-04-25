import {fileURLToPath, URL} from 'node:url';
import {VitePWA} from 'vite-plugin-pwa';
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue(),
        VitePWA({
            workbox: {
                // Runtime caching configuration
                runtimeCaching: [
                    {
                        // Match any request that starts with your API endpoint
                        urlPattern: /^https:\/\/spraypi\.titanium\.ddns\.me\/.*/,
                        handler: 'NetworkFirst', // Use the network first, but cache the response for future use
                        options: {
                            cacheName: 'api-cache',
                            expiration: {
                                maxEntries: 50, // Maximum number of entries to cache
                                maxAgeSeconds: 60 * 60 * 24 * 7, // Cache for a week
                            },
                            cacheableResponse: {
                                statuses: [0, 200], // Cache responses with these HTTP status codes
                            },
                            networkTimeoutSeconds: 10, // Fallback to cache if the network does not respond within 10 seconds
                        },
                    },
                    // ...other runtime caching rules...
                ],
            },
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'robots.txt'], // Include any other assets
            manifest: {
                name: 'Spray Me',
                short_name: 'SprayMe',
                description: 'Spray Me - Own your own spray wall',
                theme_color: '#ffffff',
                icons: [
                    // Android icons
                    {
                        src: '/AppImages/android/android-launchericon-48-48.png',
                        sizes: '48x48',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: '/AppImages/android/android-launchericon-72-72.png',
                        sizes: '72x72',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: '/AppImages/android/android-launchericon-96-96.png',
                        sizes: '96x96',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: '/AppImages/android/android-launchericon-144-144.png',
                        sizes: '144x144',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: '/AppImages/android/android-launchericon-192-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: '/AppImages/android/android-launchericon-512-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    // iOS icons
                    {
                        src: '/AppImages/ios/180.png',
                        sizes: '180x180',
                        type: 'image/png',
                        ios: true
                    },
                    {
                        src: '/AppImages/ios/167.png',
                        sizes: '167x167',
                        type: 'image/png',
                        ios: true
                    },
                    {
                        src: '/AppImages/ios/152.png',
                        sizes: '152x152',
                        type: 'image/png',
                        ios: true
                    },
                    {
                        src: '/AppImages/ios/120.png',
                        sizes: '120x120',
                        type: 'image/png',
                        ios: true
                    },
                    // 256
                    {
                        src: '/AppImages/ios/256.png',
                        sizes: '256x256',
                        type: 'image/png',
                        ios: true
                    },
                    //512
                    {
                        src: '/AppImages/ios/512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        ios: true
                    },
                    //1024
                    {
                        src: '/AppImages/ios/1024.png',
                        sizes: '1024x1024',
                        type: 'image/png',
                        ios: true
                    }

                ]
            }
        })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    }
})
