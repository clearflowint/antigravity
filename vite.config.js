import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, '.'),
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ClearFlow Small Chits',
        short_name: 'ClearFlow',
        description: 'Chit Fund 20-Month Workflow Automation',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone'
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true
  }
});
