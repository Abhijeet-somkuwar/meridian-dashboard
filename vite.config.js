import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Env comes from this folder: .env (committed defaults) then .env.local
// (yours, gitignored and higher priority) - Vite's own precedence, nothing
// custom. Both settings have working defaults, so neither file is required.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const port = Number(env.VITE_PORT) || 3000;
  const apiProxy = env.VITE_API_PROXY || 'http://localhost:8080';

  return {
    plugins: [react()],
    server: {
      // /api is proxied rather than called across origins, so the browser sees
      // one origin in development. vercel.json does the same job in production.
      // That is what lets the app use a relative baseURL and SameSite=Lax
      // session cookies while the API lives on a different host entirely.
      port,
      proxy: {
        '/api': { target: apiProxy, changeOrigin: true },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          // Recharts is the bulk of the bundle and only the rank tracker needs it.
          manualChunks: {
            charts: ['recharts'],
            vendor: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
          },
        },
      },
    },
  };
});
