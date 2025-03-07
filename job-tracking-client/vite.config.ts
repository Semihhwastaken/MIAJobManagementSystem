import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()],
<<<<<<< HEAD
=======
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5193',
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
>>>>>>> newdb1
})
