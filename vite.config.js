import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    host: '0.0.0.0',
    hmr: {
      host: 'localhost',
      port: 5173,
      protocol: 'ws'
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html-to-image')) {
              return 'pdf-vendor';
            }
            if (id.includes('opensheetmusicdisplay')) {
              return 'music-display-vendor';
            }
            if (id.includes('fabric')) {
              return 'fabric-vendor';
            }
            if (id.includes('slate')) {
              return 'slate-vendor';
            }
            if (id.includes('qrcode')) {
              return 'qrcode-vendor';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  define: {
    __APP_NAME__: JSON.stringify('Ruang Performer'),
    __APP_VERSION__: JSON.stringify('1.0.0')
  }
});
