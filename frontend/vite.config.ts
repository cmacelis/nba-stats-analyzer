import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Vite plugin: copy dist/index.html → dist/404.html after every build.
// Vercel serves 404.html for paths that don't match a static file or API
// function — React Router then handles the route client-side.
// This gives SPA fallback WITHOUT a vercel.json, so Vercel's default routing
// still properly resolves dynamic API segments like /api/players/compare/[id1]/[id2].
const spa404Plugin = {
  name: 'spa-404',
  closeBundle() {
    const src  = path.resolve(__dirname, 'dist/index.html');
    const dest = path.resolve(__dirname, 'dist/404.html');
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
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