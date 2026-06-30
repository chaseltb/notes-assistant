import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ask':        'http://localhost:8000',
      '/sync':       'http://localhost:8000',
      '/quiz':       'http://localhost:8000',
      '/flashcards': 'http://localhost:8000',
      '/upload':     'http://localhost:8000',
      '/documents':  'http://localhost:8000',
      '/health':     'http://localhost:8000',
    }
  }
})
