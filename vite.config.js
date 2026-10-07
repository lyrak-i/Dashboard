import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Recharts + PapaParse are the bulk; split vendor code so the app chunk stays small.
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          csv: ['papaparse'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
})
