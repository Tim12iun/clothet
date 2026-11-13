import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import pkg from './package.json' with { type: 'json' }

/** Schreibt den Service Worker mit der Liste aller gebauten Dateien, damit die App nach dem ersten Besuch offline startet. */
function serviceWorker(): Plugin {
  return {
    name: 'clothet-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const assets = Object.keys(bundle).filter((f) => !f.endsWith('.html')).map((f) => './' + f)
      const version = pkg.version + '-' + createHash('sha1').update(assets.join()).digest('hex').slice(0, 8)
      const source = readFileSync('scripts/sw.js', 'utf8').replace('self.__ASSETS__', JSON.stringify(assets)).replace('self.__VERSION__', JSON.stringify(version))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// "artifact" mode bundles everything into one HTML file for a shareable preview page.
export default defineConfig(({ mode }) => ({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react(), ...(mode === 'artifact' ? [viteSingleFile()] : [serviceWorker()])],
  build: { outDir: mode === 'artifact' ? 'dist-artifact' : 'dist' },
}))
