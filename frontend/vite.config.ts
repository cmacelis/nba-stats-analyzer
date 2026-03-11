import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Vite plugin: copy dist/index.html → dist/404.html AND into each SPA route
// directory after every build.
// - 404.html: Vercel fallback for unknown paths (still 404 status, fine for
//   deep links that aren't SEO-critical).
// - Route directories (e.g. dist/edge/index.html): Vercel serves these as
//   200 static files, so Googlebot sees a 200 and can index the page.
//   React Router still handles client-side routing.
// This avoids vercel.json, so Vercel's default routing still properly resolves
// dynamic API segments like /api/players/compare/[id1]/[id2].
const SPA_ROUTES = [
  'edge',
  'compare',
  'predict',
  'performance',
  'pricing',
  'nba-prop-analyzer',
  'wnba-prop-analyzer',
];

const spa404Plugin = {
  name: 'spa-404',
  closeBundle() {
    const src = path.resolve(__dirname, 'dist/index.html');
    if (!fs.existsSync(src)) return;

    // 404 fallback for unknown routes
    fs.copyFileSync(src, path.resolve(__dirname, 'dist/404.html'));

    // Static copies for each SPA route so Vercel serves 200 (not 404)
    for (const route of SPA_ROUTES) {
      const dir = path.resolve(__dirname, 'dist', route);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(src, path.resolve(dir, 'index.html'));
    }
  },
};

export default defineConfig({
  plugins: [react(), spa404Plugin],
  server: {
    port: 5173,
    host: true,
    strictPort: false,
    open: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: ['async-sema'] // Exclude problematic dependency
    }
  }
})
