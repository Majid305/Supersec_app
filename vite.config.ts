import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // base: './' garantit que les chemins vers les JS/CSS dans le HTML final sont relatifs.
  // Indispensable pour GitHub Pages (sous-répertoires) et compatible avec Vercel.
  base: './', 
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'lucide-react', 'recharts'],
          utils: ['xlsx', 'jspdf', 'html2canvas', 'pdf-lib']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
})