// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base public path
  base: '/',

  // Build configuration
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'esbuild',

    // Rollup options
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/database'],
          'vendor': ['dompurify']
        }
      }
    },

    // Performance optimizations
    chunkSizeWarningLimit: 1000,

    // Module preload
    modulePreload: {
      polyfill: true
    }
  },

  // Server configuration for development
  server: {
    port: 3000,
    host: true,
    open: true,
    cors: true,

    // HMR configuration
    hmr: {
      overlay: true
    }
  },

  // Preview server configuration
  preview: {
    port: 4173,
    host: true,
    open: true
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@modules': resolve(__dirname, 'src/modules'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@handlers': resolve(__dirname, 'src/handlers')
    }
  },

  // Optimizations
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/database', 'dompurify']
  },

  // Environment variables
  envPrefix: 'VITE_',

  // CSS configuration
  css: {
    devSourcemap: true
  },

  // ESBuild configuration
  esbuild: {
    legalComments: 'none',
    target: 'es2020'
  },

  // Security headers (for production)
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  }
});
