import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Coverage instrumentation slows tests well past the 5s default,
    // which caused flaky "Test timed out in 5000ms" failures in verify-all.
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
  },
})
