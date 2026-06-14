import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Stamped at build time so we can tell which version a device is running.
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
