import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { VitePWA } from 'vite-plugin-pwa';
import hsPlugin from './vite-plugin-hs';

export default defineConfig(async ({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    plugins: [
      hsPlugin(),
      react(), 
      tailwindcss(), 
      nodePolyfills({
        include: ['buffer', 'process', 'util', 'stream', 'events', 'path'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: false,
        },
        manifest: {
          name: 'Ham AiStudio',
          short_name: 'HamAI',
          description: 'The Ultimate AI-Powered Development Environment',
          theme_color: '#0a0a0a',
          background_color: '#0a0a0a',
          display: 'standalone',
          icons: [
            {
              src: '/icon.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          navigateFallbackDenylist: [/^\/api/, /^\/ham-api/, /^\/socket.io/, /^\/terminal-socket/, /^\/yjs/, /^\/sse/, /^\/ws/],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.headers.get('upgrade') === 'websocket',
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^\/api\/.*|^\/ham-api\/.*|^\/socket.io\/.*|^\/terminal-socket\/.*|^\/yjs\/.*|^\/sse\/.*|^\/ws\/.*$/,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /\.(?:js|css)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-resources',
              },
            },
            {
              urlPattern: /^\/assets\/.*$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'assets-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|webp|svg|woff2)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-fonts-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
              },
            },
            {
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                networkTimeoutSeconds: 3,
                cacheName: 'navigation-cache',
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
      process.env.ANALYZE === 'true' && (await import('rollup-plugin-visualizer')).visualizer({
        filename: 'stats.html',
        open: false,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), './src'),
      },
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    server: {
      warmup: {
        clientFiles: [
          './src/main.tsx',
          './src/App.tsx',
          './index.html',
          './src/components/BrowserTab.tsx',
          './src/components/TerminalTab.tsx',
          './src/components/AIHubTab.tsx',
          './src/components/SettingsTab.tsx',
          './src/components/HamAiStudio/index.tsx',
          './src/components/HamliMemoryTab.tsx',
          './src/components/PrivateSourceTab.tsx',
          './src/components/TasksTab.tsx',
          './src/components/AgentWorker/AgentWorker.tsx',
          './src/components/KeygenTab.tsx',
          './src/sAgent/src/App.tsx',
          './src/components/AeternaGlassTab.tsx',
          './src/features/MediaAgent/index.tsx',
          './src/features/HCamera/index.tsx',
          './src/features/GeneratorStudio/index.tsx',
          './src/features/AgentLogViewer/index.tsx',
          './src/features/AgentResultsViewer/index.tsx',
          './src/features/SocialWorker/index.tsx',
          './src/features/FeatureRulesPanel/index.tsx',
        ],
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: true,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
      fs: {
        // Prevent Vite from scanning nested artifact scaffolds that have their own deps
        deny: [
          '**/src/_archive/**',
          '**/src/Keygen/artifacts/**',
          '**/src/Keygen/lib/**',
          '**/src/sAgent/subagent/**',
          '**/.workspace-template-archive/**',
        ],
      },
      watch: {
        usePolling: false,
        ignored: [
          '**/src/tools/**',
          '**/src/_archive/**',
          '**/src/Keygen/artifacts/**',
          '**/src/Keygen/lib/**',
          '**/src/sAgent/subagent/**',
          '**/.workspace-template-archive/**',
          '**/node_modules/**',
          '**/.local/**',
          '**/.archive/**',
          '**/.git/**',
          '**/dist/**',
          '**/artifacts/**',
          '**/attached_assets/**',
          '**/AeternaGlass/**',
          '**/logs/**',
        ],
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'monaco-editor',
        '@monaco-editor/react',
        'three',
        '@react-three/fiber',
        '@react-three/drei',
        'sql.js',
        'socket.io-client',
        'zustand',
        'dexie',
        '@anthropic-ai/sdk',
        'openai',
        'lucide-react',
        'axios',
        'lodash',
        '@sqlite.org/sqlite-wasm',
        '@xenova/transformers',
      ],
      exclude: ['@webcontainer/api', '@mlc-ai/web-llm', 'framer-motion', 'motion-dom'],
      entries: [
        'index.html',
        'src/**/*.{ts,tsx,js,jsx}',
        '!src/_archive/**',
        '!src/Keygen/artifacts/**',
        '!src/Keygen/lib/**',
        '!src/sAgent/subagent/**',
      ],
    },
    worker: {
      format: 'es',
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 5000,
      sourcemap: false,
      minify: false,
      target: 'esnext',
      rollupOptions: {
        maxParallelFileOps: 2,
        output: {
          manualChunks: {
            monaco: ['monaco-editor', '@monaco-editor/react'],
            react: ['react', 'react-dom'],
            three: ['three', '@react-three/fiber', '@react-three/drei'],
            yjs: ['yjs', 'y-indexeddb', 'y-monaco', 'y-webrtc', 'y-websocket'],
            socket: ['socket.io-client'],
            llm: ['@mlc-ai/web-llm', '@xenova/transformers'],
            sql: ['sql.js', '@sqlite.org/sqlite-wasm'],
          }
        }
      }
    },
  };
});
