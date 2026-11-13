// Turns the single-file build into a body-only page for publishing as a preview.
import { readFileSync, writeFileSync } from 'node:fs'
let html = readFileSync('dist-artifact/index.html', 'utf8')
html = html
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?(html|head|body)[^>]*>/gi, '')
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .replace(/<meta name="(theme-color|apple-[a-z-]+|mobile-web-app-capable)"[^>]*>/gi, '')
  .replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>/gi, '')
writeFileSync('dist-artifact/clothet.html', html.trim() + '\n')
console.log('dist-artifact/clothet.html', (html.length / 1024).toFixed(0) + ' KB')
