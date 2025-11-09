import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/vite-react/',     // ✅ ĐÚNG tên repository của bạn
  plugins: [react()],
})
