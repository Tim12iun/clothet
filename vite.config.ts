import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// "artifact" mode bundles everything into one HTML file for a shareable preview page.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'artifact' ? [viteSingleFile()] : [])],
  build: { outDir: mode === 'artifact' ? 'dist-artifact' : 'dist' },
}))
