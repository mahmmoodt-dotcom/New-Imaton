import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    // Local dev only: forwards /api to `php -S localhost:8000 -t server router.php`
    // so the admin dashboard and storefront both work without deploying.
    // Production talks to the real PHP host directly — this proxy is never
    // involved there. /uploads forwards the same way, so admin-uploaded
    // photos (served by PHP from the project's /uploads folder) actually
    // load in local dev instead of 404ing against Vite's own origin.
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
});
