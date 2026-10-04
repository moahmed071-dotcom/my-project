import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// The API server (server/index.ts) holds the Anthropic key; the browser only talks to /api.
const apiTarget = `http://127.0.0.1:${process.env.PORT || 8787}`;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: { '/api': { target: apiTarget, changeOrigin: false } },
  },
});
