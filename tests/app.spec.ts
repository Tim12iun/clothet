import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const TABS = ['Anprobe', 'Schrank', 'Outfits'] as const
const go = (page: Page, tab: (typeof TABS)[number]) => page.locator('.nav button', { hasText: tab }).click()

/** Öffnet die App mit leerem Speicher und sammelt Fehler aus der Konsole. */
async function start(page: Page, query = '') {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto('/' + query)
  await page.locator('.home-head').waitFor()
  return errors
}
async function withSamples(page: Page) {
  const errors = await start(page)
  await page.locator('#load-samples').click()
  await expect(page.locator('.pick-tile img').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.grid .tile')).toHaveCount(9, { timeout: 30_000 }) // der Schrank ist im Hintergrund schon aufgebaut
  return errors
}
/** Das Dokument scrollt nie und nichts ragt seitlich heraus. */
async function expectNoOverflow(page: Page, where: string) {
  const r = await page.evaluate(() => {
    const d = document.documentElement
    const wide = [...document.querySelectorAll<HTMLElement>('.view:not([hidden]), .sheet-body, .drawer-body, .editor-panel')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className)
    return { docX: d.scrollWidth - d.clientWidth, docY: d.scrollHeight - d.clientHeight, wide }
  })
  expect(r, where).toEqual({ docX: 0, docY: 0, wide: [] })
}
async function expectAccessible(page: Page, where: string) {
  // Einblenden abwarten: halb durchsichtige Flächen verfälschen die Kontrastmessung
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))))
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), where).toEqual([])
}

test('leerer Schrank: klare nächste Handlung auf jedem Bereich, nichts läuft über', async ({ page }) => {
  const errors = await start(page)
  await expect(page.locator('.stage-empty')).toContainText('Dein Schrank ist noch leer')
  for (const tab of TABS) {
    await go(page, tab)
    await expectNoOverflow(page, tab + ' leer')
    await expectAccessible(page, tab + ' leer')
  }
  await page.locator('#mode-statistik').click()
  await expect(page.locator('.view:not([hidden]) .empty')).toBeVisible()
  expect(errors).toEqual([])
})

test('Anprobe: Teil anziehen, würfeln, als heute getragen eintragen und rückgängig machen', async ({ page }) => {
  const errors = await withSamples(page)
  await page.locator('.segment button', { hasText: 'Hose' }).click()
  await page.locator('.pick-tile:has(img)').nth(1).click()
  await expect(page.locator('.pick-tile.is-on')).toHaveCount(1)
  await page.locator('#roll').click()
  await expectNoOverflow(page, 'Anprobe')
  await expectAccessible(page, 'Anprobe')

  await page.locator('#worn-today').click()
  await expect(page.locator('.toast')).toContainText('Für heute eingetragen')
  await expect(page.locator('#worn-today')).toHaveAttribute('aria-pressed', 'true')
  await go(page, 'Outfits')
  await expect(page.locator('#today-card')).toContainText('Getragen: Outfit 1')
  await go(page, 'Anprobe')
  await page.locator('#worn-today').click()
  await expect(page.locator('#worn-today')).toHaveAttribute('aria-pressed', 'false')
  await page.locator('.toast button', { hasText: 'Rückgängig' }).click()
  await expect(page.locator('#worn-today')).toHaveAttribute('aria-pressed', 'true')
  expect(errors).toEqual([])
})

test('Planer: Outfit speichern, in der Woche bestätigen, im Monat sehen, löschen und wiederherstellen', async ({ page }) => {
  const errors = await withSamples(page)
  await page.locator('#save-outfit').click()
  await expect(page.locator('.toast')).toContainText('Outfit gespeichert')
  await go(page, 'Outfits')
  await expect(page.locator('.view:not([hidden]) .grid .tile')).toHaveCount(1)
  await expectAccessible(page, 'Outfits Liste')

  await page.locator('#pick-today').click()
  await page.locator('.sheet .tile').first().click()
  await expect(page.locator('#today-card')).toContainText('Getragen: Outfit 1')

  await page.locator('#mode-woche').click()
  await expect(page.locator('.day-row.is-today .day-check')).toHaveAttribute('aria-pressed', 'true')
  await page.locator('.day-row.is-today .day-check').click()
  await expect(page.locator('.day-row.is-today')).toContainText('Nichts eingetragen')
  await page.locator('.toast button', { hasText: 'Rückgängig' }).click()
  await expect(page.locator('.day-row.is-today')).toContainText('Getragen')
  await expectNoOverflow(page, 'Woche')
  await expectAccessible(page, 'Woche')

  await page.locator('#mode-monat').click()
  await expect(page.locator('.cal-day.is-today.is-worn')).toBeVisible()
  await expectNoOverflow(page, 'Monat')
  await expectAccessible(page, 'Monat')
  await page.locator('#mode-statistik').click()
  await expect(page.locator('.facts')).toContainText('Outfits')
  await expectNoOverflow(page, 'Statistik')
  await expectAccessible(page, 'Statistik')

  await page.locator('#mode-liste').click()
  await page.locator('.view:not([hidden]) .grid .tile').first().click()
  await expectAccessible(page, 'Outfit-Sheet')
  await page.locator('#delete-outfit').click()
  await expect(page.locator('.view:not([hidden]) .grid .tile')).toHaveCount(0)
  await page.locator('.toast button', { hasText: 'Rückgängig' }).click()
  await expect(page.locator('.view:not([hidden]) .grid .tile')).toHaveCount(1)
  await expect(page.locator('#today-card')).toContainText('Getragen: Outfit 1')
  expect(errors).toEqual([])
})

test('Schrank: Teil aus einem Foto anlegen, suchen, sortieren, bearbeiten, löschen mit Rückgängig', async ({ page }) => {
  const errors = await withSamples(page)
  await go(page, 'Schrank')
  await page.locator('#add-item').click()
  await expectAccessible(page, 'Teil hinzufügen, Schritt 1')
  await page.locator('#main-file').setInputFiles('tests/fixtures/shirt.jpg')
  await page.locator('#item-name').fill('Testhemd')
  await expectNoOverflow(page, 'Teil hinzufügen')
  await expectAccessible(page, 'Teil hinzufügen, Schritt 2')
  await page.locator('#save-item').click()
  await expect(page.locator('.toast')).toContainText('Testhemd')
  await expect(page.locator('.sheet')).toHaveCount(0)

  await page.locator('#closet-search').fill('testhemd')
  await expect(page.locator('.view:not([hidden]) .grid .tile')).toHaveCount(1)
  await page.locator('#closet-search').fill('gibt es nicht')
  await expect(page.locator('.view:not([hidden]) .empty')).toContainText('Kein Teil passt')
  await page.locator('.view:not([hidden]) .empty button').click()
  await page.locator('#closet-sort').selectOption('name')
  await expectNoOverflow(page, 'Schrank')
  await expectAccessible(page, 'Schrank')

  const before = await page.locator('.view:not([hidden]) .grid .tile').count()
  await page.locator('.view:not([hidden]) .grid .tile', { hasText: 'Testhemd' }).click()
  await expectAccessible(page, 'Teil bearbeiten')
  await page.locator('#delete-item').click()
  await expect(page.locator('.view:not([hidden]) .grid .tile')).toHaveCount(before - 1)
  await page.locator('.toast button', { hasText: 'Rückgängig' }).click()
  await expect(page.locator('.view:not([hidden]) .grid .tile')).toHaveCount(before)
  expect(errors).toEqual([])
})

test('Avatar: Selfie hinterlegen, Gesicht am großen Avatar verschieben, Körper weiblich wählen', async ({ page }) => {
  const errors = await withSamples(page)
  await page.locator('#open-settings').click()
  await expectNoOverflow(page, 'Einstellungen')
  await expectAccessible(page, 'Einstellungen')
  await page.locator('#open-editor').click()
  await expect(page.locator('.editor')).toBeVisible()
  await expectAccessible(page, 'Avatar einrichten, ohne Selfie')
  await page.locator('#selfie-file').setInputFiles('tests/fixtures/selfie.jpg')
  const stage = page.locator('#editor-stage.is-editing')
  await expect(stage).toBeVisible()
  const crop = () => page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('clothet')
    r.onsuccess = () => { const q = r.result.transaction('data').objectStore('data').get('figure'); q.onsuccess = () => res(q.result?.crop) }
  }))
  await expect.poll(crop).toEqual({ zoom: 1, dx: 0, dy: 0 })
  const box = (await stage.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 3 + 20, { steps: 4 })
  await page.mouse.up()
  await page.locator('#face-bigger').click()
  await expect.poll(async () => ((await crop()) as { zoom: number }).zoom).toBeGreaterThan(1)
  const moved = (await crop()) as { dx: number; dy: number }
  expect(moved.dx).toBeLessThan(0)
  expect(moved.dy).toBeLessThan(0)
  await expectAccessible(page, 'Avatar einrichten, Gesicht')

  await page.locator('#editor-tab-body').click()
  await page.locator('.editor-panel button', { hasText: 'Weiblich' }).click()
  await page.locator('.editor-panel button', { hasText: 'Kräftig' }).click()
  await expectNoOverflow(page, 'Avatar einrichten, Körper')
  await expectAccessible(page, 'Avatar einrichten, Körper')
  await page.locator('#editor-done').click()
  await expect(page.locator('.editor')).toHaveCount(0)
  await expect(page.locator('.sheet')).toBeVisible()
  expect(errors).toEqual([])
})

test('Sitz anpassen: Teil am Avatar ziehen und mit den Knöpfen verschieben', async ({ page }) => {
  await withSamples(page)
  await page.locator('#open-settings').click()
  await page.locator('#open-fit').click()
  await expect(page.locator('.wear.is-fitting')).toBeVisible()
  const top = () => page.locator('.wear.is-fitting').evaluate((e) => e.getBoundingClientRect().top)
  const y0 = await top()
  await page.locator('#fit-down').click()
  await page.locator('#fit-down').click()
  expect(await top()).toBeGreaterThan(y0)
  const stage = (await page.locator('.stage').boundingBox())!
  const y1 = await top()
  await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height * 0.35)
  await page.mouse.down()
  await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height * 0.35 - 24, { steps: 4 })
  await page.mouse.up()
  expect(await top()).toBeLessThan(y1)
  await expectNoOverflow(page, 'Sitz anpassen')
  await expectAccessible(page, 'Sitz anpassen')
  await page.locator('.drawer .btn-primary', { hasText: 'Fertig' }).click()
  await expect(page.locator('.wear.is-fitting')).toHaveCount(0)
})

test('Navigation: Adresse je Bereich, Neuladen bleibt, Zurück schließt zuerst das Sheet', async ({ page }) => {
  await withSamples(page)
  await go(page, 'Schrank')
  await expect(page).toHaveURL(/#\/schrank$/)
  await page.reload()
  await expect(page.locator('.view:not([hidden]) h1')).toHaveText('Schrank')
  await page.locator('#add-item').click()
  await expect(page.locator('.sheet')).toBeVisible()
  await page.goBack()
  await expect(page.locator('.sheet')).toHaveCount(0)
  await expect(page.locator('.view:not([hidden]) h1')).toHaveText('Schrank')
  await page.locator('#add-item').click()
  await page.keyboard.press('Escape')
  await expect(page.locator('.sheet')).toHaveCount(0)
  await expect(page.locator('#add-item')).toBeFocused()
})

test('Tastatur: Hauptablauf ohne Zeiger', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'Tastaturbedienung wird am Desktop geprüft')
  await withSamples(page)
  await page.locator('#worn-today').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#worn-today')).toHaveAttribute('aria-pressed', 'true')
  await page.locator('#open-settings').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.sheet')).toBeFocused()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('.sheet'))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.locator('#open-settings')).toBeFocused()
})

test('Sicherung: speichern und wieder laden', async ({ page }) => {
  await withSamples(page)
  await page.locator('#save-outfit').click()
  await page.locator('#open-settings').click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export-data').click()])
  const file = await download.path()
  await page.locator('.sheet .icon-btn[aria-label="Schließen"]').click()
  await go(page, 'Schrank')
  await page.locator('.note .link', { hasText: 'Beispiele entfernen' }).click()
  await expect(page.locator('.view:not([hidden]) .empty')).toBeVisible()
  await go(page, 'Anprobe')
  await page.locator('#open-settings').click()
  await page.locator('#import-data').setInputFiles(file)
  await page.locator('#confirm-import').click()
  await expect(page.locator('.toast')).toContainText('Sicherung geladen: 9 Teile und 1 Outfits')
})

test('Härtetest: 1000 Teile mit sehr langen Namen', async ({ page }) => {
  test.setTimeout(120_000)
  const errors = await start(page, '?stress=1000')
  await go(page, 'Schrank')
  await expect(page.locator('.view:not([hidden]) .view-head .muted')).toHaveText('1000 Teile', { timeout: 90_000 })
  await expect(page.locator('.view:not([hidden]) .grid .tile')).toHaveCount(120)
  await expectNoOverflow(page, 'Schrank mit 1000 Teilen')
  await page.locator('#closet-search').fill('Donaudampf')
  await expect(page.locator('.view:not([hidden]) .view-head .muted')).toContainText('von 1000 Teilen')
  await expectNoOverflow(page, 'Suche in 1000 Teilen')
  await go(page, 'Anprobe')
  await expect(page.locator('.pick-tile img').first()).toBeVisible()
  await expectNoOverflow(page, 'Anprobe mit 1000 Teilen')
  expect(errors).toEqual([])
})

test('Breiten und Querformate: nichts läuft über, das Dokument scrollt nie', async ({ page, isMobile }) => {
  test.setTimeout(240_000)
  test.skip(!!isMobile, 'Die Breiten-Reihe läuft einmal im Desktop-Projekt')
  await withSamples(page)
  await page.locator('#save-outfit').click()
  const sizes = [[320, 568], [360, 740], [375, 667], [390, 844], [430, 932], [768, 1024], [1024, 768], [1440, 900], [568, 320], [667, 375], [844, 390], [932, 430]]
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height })
    for (const tab of TABS) {
      await go(page, tab)
      await expectNoOverflow(page, `${tab} bei ${width}x${height}`)
    }
    for (const m of ['woche', 'monat', 'statistik', 'liste']) {
      await page.locator('#mode-' + m).click()
      await expectNoOverflow(page, `Outfits ${m} bei ${width}x${height}`)
    }
    await go(page, 'Anprobe')
    await page.locator('#open-settings').click()
    await expectNoOverflow(page, `Einstellungen bei ${width}x${height}`)
    await page.locator('#open-editor').click()
    await expectNoOverflow(page, `Avatar einrichten bei ${width}x${height}`)
    const done = (await page.locator('#editor-done').boundingBox())!
    expect(done.y >= 0 && done.x + done.width <= width, `Fertig-Knopf sichtbar bei ${width}x${height}`).toBe(true)
    await page.locator('#editor-done').click()
    await page.keyboard.press('Escape')
    const fab = (await page.locator('#roll').boundingBox())!
    expect(fab.x >= 0 && fab.x + fab.width <= width && fab.y + fab.height <= height, `Zufall sichtbar bei ${width}x${height}`).toBe(true)
  }
})

test('Offline: Hinweis erscheint, der Schrank bleibt bedienbar', async ({ page, context }) => {
  await withSamples(page)
  await context.setOffline(true)
  await expect(page.locator('.toast')).toContainText('Du bist offline')
  await go(page, 'Schrank')
  await expect(page.locator('.view:not([hidden]) .grid .tile').first()).toBeVisible()
  await context.setOffline(false)
  await expect(page.locator('.toast')).toContainText('wieder online')
})

test('200 Prozent Schrift: Inhalte bleiben erreichbar', async ({ page }) => {
  await withSamples(page)
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  for (const tab of TABS) {
    await go(page, tab)
    await expectNoOverflow(page, tab + ' bei 200 Prozent')
  }
  await page.locator('#mode-woche').click()
  await expectNoOverflow(page, 'Woche bei 200 Prozent')
})

test('Offline-Start: nach dem ersten Besuch lädt die App ohne Netz und zeigt die gespeicherten Teile', async ({ page, context }) => {
  await withSamples(page)
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).length)).toBeGreaterThan(0)
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('.pick-tile img').first()).toBeVisible()
  await go(page, 'Schrank')
  await expect(page.locator('.view:not([hidden]) .grid .tile')).toHaveCount(9)
  const font = await page.evaluate(() => document.fonts.check('16px Inter'))
  expect(font).toBe(true)
})

test('Passform: Oberteil und Hose werden an die Figur angepasst, „Flach aufgelegt“ schaltet es je Teil ab', async ({ page }) => {
  const errors = await withSamples(page)
  await expect(page.locator('.wear.is-full')).toHaveCount(2)
  await page.locator('#save-outfit').click()
  await expect(page.locator('.toast')).toContainText('Outfit gespeichert')
  await go(page, 'Schrank')
  await page.locator('.view:not([hidden]) .grid .tile', { hasText: 'Weißes T-Shirt' }).click()
  await expectAccessible(page, 'Teil bearbeiten mit Passform')
  await page.locator('#fit-flat').click()
  await page.locator('#save-edit').click()
  await go(page, 'Anprobe')
  await expect(page.locator('.wear.is-full')).toHaveCount(1)
  expect(errors).toEqual([])
})

test('Import: mehrere Bilder auf einmal, je Bild die Art wählen', async ({ page }) => {
  const errors = await start(page)
  await go(page, 'Schrank')
  await page.locator('.view:not([hidden]) .empty button', { hasText: 'Mehrere Bilder importieren' }).click()
  await page.locator('#import-files').setInputFiles(['tests/fixtures/shirt.jpg', 'tests/fixtures/shirt.jpg', 'tests/fixtures/selfie.jpg'])
  await expect(page.locator('#import-list .import-row')).toHaveCount(3)
  await page.locator('#import-list .import-row').nth(1).locator('.chip', { hasText: 'Hose' }).click()
  await page.locator('#import-list .import-row').nth(2).locator('.icon-btn').click()
  await expect(page.locator('#import-list .import-row')).toHaveCount(2)
  // Teil von Hand markieren: Rahmen ziehen, dann wird nur dort ausgeschnitten
  const before = await page.locator('#import-list .import-thumb img').first().getAttribute('src')
  await page.locator('#import-list .import-thumb').first().click()
  const box = (await page.locator('#mark-photo').boundingBox())!
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7, { steps: 4 })
  await page.mouse.up()
  await expectAccessible(page, 'Teil markieren')
  await page.locator('#mark-done').click()
  await expect(page.locator('#mark-photo')).toHaveCount(0)
  expect(await page.locator('#import-list .import-thumb img').first().getAttribute('src')).not.toBe(before)
  await expectNoOverflow(page, 'Import')
  await expectAccessible(page, 'Import')
  await page.locator('#import-save').click()
  await expect(page.locator('.toast')).toContainText('2 Teile hängen jetzt im Schrank')
  await expect(page.locator('.view:not([hidden]) .grid .tile')).toHaveCount(2)
  await expect(page.locator('.view:not([hidden]) .grid .tile', { hasText: 'Hose in' })).toHaveCount(1)
  expect(errors).toEqual([])
})
