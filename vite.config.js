import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { createApiMiddleware } from './src/server/apiMiddleware.js';

function apiPlugin() {
  const middleware = createApiMiddleware();
  return {
    name: 'api-middleware',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    }
  };
}

export default defineConfig({
  plugins: [tailwindcss(), apiPlugin()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {}
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true
  }
});
