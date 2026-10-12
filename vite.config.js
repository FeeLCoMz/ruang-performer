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
    // Jangan preload lib berat yang hanya dipakai lewat dynamic import.
    // Tanpa ini, Vite menambahkan <link rel="modulepreload"> untuk
    // pdf-vendor (jspdf/html2canvas) & music-display-vendor (OSMD) ke
    // index.html sehingga tetap diunduh saat startup -> merusak
    // tujuan code-splitting, terutama di jaringan mobile.
    modulePreload: {
      resolveDependencies(filename, deps) {
        const skip = ['pdf-vendor', 'music-display-vendor', 'fabric-vendor'];
        return deps.filter(
          (dep) => !skip.some((name) => dep.includes(name))
        );
      }
    },
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
