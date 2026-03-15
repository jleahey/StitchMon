import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    testTimeout: 15000,
  },
  base: process.env.NODE_ENV === 'production' ? '/StitchMon/' : '/',
})
