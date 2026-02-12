import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {}, 
  },
  server: {
    port: 3000, // Frontend channel
    proxy: {
      // This is the bridge: any call to /api goes to the backend
      '/api': {
        target: 'http://localhost:3001', 
        changeOrigin: true,
        secure: false,
      },
    }
  }
});