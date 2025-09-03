import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.loca.lt',
      'violet-knives-call.loca.lt',
      'lazy-pillows-grab.loca.lt',
      'curly-olives-drum.loca.lt'
    ],
    host: true
  },
})
