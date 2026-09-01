import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://salaria.inkarmattuskur.workers.dev',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});