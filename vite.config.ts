import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            if (id.includes('konva') || id.includes('use-image')) {
              return 'vendor-konva'
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase'
            }
            if (id.includes('@base-ui') || id.includes('sonner') || id.includes('lucide')) {
              return 'vendor-ui'
            }
          }
        },
      },
    },
  },
})
