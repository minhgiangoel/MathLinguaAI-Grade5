import { defineConfig, loadEnv } from 'vite';
import { createApiMiddleware } from './src/server/apiMiddleware.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [
      {
        name: 'mathlingua-api-server',
        configureServer(server) {
          server.middlewares.use(createApiMiddleware());
        },
        configurePreviewServer(server) {
          server.middlewares.use(createApiMiddleware());
        },
      },
    ],
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: 'all',
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: 'all',
    },
  };
});

