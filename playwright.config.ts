import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

// Vorinstalliertes Chromium nutzen, falls vorhanden (z. B. in der Cloud-Umgebung), sonst das von Playwright.
const local = '/opt/pw-browsers/chromium'
const chromium = { browserName: 'chromium' as const, launchOptions: existsSync(local) ? { executablePath: local } : {} }
const phone = (name: string) => ({ ...devices[name], defaultBrowserType: undefined, ...chromium })

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', trace: 'off', locale: 'de-DE' },
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: 'iphone-se', use: phone('iPhone SE') },
    { name: 'iphone-13', use: phone('iPhone 13') },
    { name: 'iphone-13-quer', use: phone('iPhone 13 landscape') },
    { name: 'pixel-7', use: phone('Pixel 7') },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, ...chromium } },
    { name: 'desktop-dunkel', use: { ...devices['Desktop Chrome'], colorScheme: 'dark', ...chromium } },
  ],
})
