import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/agents': 'http://localhost:4000',
      '/webhook': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
      '/events': 'http://localhost:4000',
    },
  },
})
