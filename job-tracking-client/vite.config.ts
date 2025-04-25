import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@mui/material', '@emotion/react', '@emotion/styled'],
          charts: ['chart.js', 'react-chartjs-2', 'recharts']
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://miajobmanagementsystem.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/chatHub': {
        target: 'http://localhost:5193',
        changeOrigin: true,
        secure: false,
        ws: true
      },
      '/notificationHub': {
        target: 'http://localhost:5193',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
})
