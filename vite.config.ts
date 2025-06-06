import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  base: './', // Required for Electron compatibility with relative paths
  build: {
    outDir: 'build', // To maintain backward compatibility if your project uses 'build' directory
    sourcemap: true,
  },
  server: {
    port: 3000, // To maintain the same port as react-scripts
  },
})