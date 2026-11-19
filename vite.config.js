import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Mechanical Design ERP — frontend only (no API, no backend).
// The existing ERP keeps its own dev server on 5174; this app owns 5173 and
// fails fast instead of silently moving to another port.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})
