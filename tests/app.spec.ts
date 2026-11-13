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
  await expectAccessible(page, 'Kleidung hinzufügen, Schritt 1')
  await expect(page.locator('#add-camera')).toBeVisible()
  await page.locator('#import-files').setInputFiles('tests/fixtures/shirt.jpg')
  // Die Art ist aus dem Umriss erkannt
  await expect(page.locator('#import-list .chip.is-on')).toHaveText('Oberteil')
  await expectNoOverflow(page, 'Kleidung hinzufügen')
  await expectAccessible(page, 'Kleidung hinzufügen, Schritt 2')
  await page.locator('#import-save').click()
  await expect(page.locator('.toast')).toContainText('1 Teil hängt jetzt im Schrank')
  await expect(page.locator('.sheet')).toHaveCount(0)

  await page.locator('#closet-search').fill('oberteil in')
  await expect(page.locator('.view:not([hidden]) .grid .tile')).toHaveCount(1)
  await page.locator('#closet-search').fill('gibt es nicht')
  await expect(page.locator('.view:not([hidden]) .empty')).toContainText('Kein Teil passt')
  await page.locator('.view:not([hidden]) .empty button').click()
  await page.locator('#closet-sort').selectOption('name')
  await expectNoOverflow(page, 'Schrank')
  await expectAccessible(page, 'Schrank')

  const before = await page.locator('.view:not([hidden]) .grid .tile').count()
  await page.locator('.view:not([hidden]) .grid .tile', { hasText: 'Oberteil in' }).click()
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

test('Sitz anpassen: gilt je Teil, Hose und Oberteil bleiben getrennt', async ({ page }) => {
  const errors = await withSamples(page)
  const shift = (zone: string) => page.locator(`.home .wear[data-zone="${zone}"]`).evaluate((e) => (e as HTMLElement).style.transform)
  await expect(page.locator('.home .wear.is-full')).toHaveCount(2)
  const top0 = await shift('top'), bottom0 = await shift('bottom')
  await go(page, 'Schrank')
  await page.locator('.view:not([hidden]) .grid .tile', { hasText: 'Weißes T-Shirt' }).click()
  await expect(page.locator('#fit-stage .wear')).toBeVisible()
  const y = () => page.locator('#fit-stage .wear').evaluate((e) => (e as HTMLElement).style.transform)
  expect(await y()).toContain('translateY(0%)')
  await page.locator('#fit-down').click()
  await page.locator('#fit-down').click()
  expect(await y()).toContain('translateY(2%)')
  await expectNoOverflow(page, 'Sitz am Avatar')
  await expectAccessible(page, 'Sitz am Avatar')
  await page.locator('#save-edit').click()
  await go(page, 'Anprobe')
  await page.locator('.segment button', { hasText: 'Oberteil' }).click()
  const tee = page.locator('.pick-tile[title="Weißes T-Shirt"]')
  if ((await tee.getAttribute('aria-pressed')) !== 'true') await tee.click() // ein zweiter Tipp würde es wieder ausziehen
  await expect.poll(() => shift('top')).not.toBe(top0)
  expect(await shift('bottom')).toBe(bottom0)
  expect(errors).toEqual([])
})

test('Art ändern: ein falsch einsortiertes Teil sitzt danach an der neuen Stelle', async ({ page }) => {
  const errors = await start(page)
  await go(page, 'Schrank')
  await page.locator('#add-item').click()
  await page.locator('#import-files').setInputFiles('tests/fixtures/shirt.jpg')
  await page.locator('#import-list .chip', { hasText: 'Hose' }).click()
  await page.locator('#import-save').click()
  await go(page, 'Anprobe')
  await expect(page.locator('.home .wear[data-zone="bottom"]')).toHaveCount(1)
  await go(page, 'Schrank')
  await page.locator('.view:not([hidden]) .grid .tile').first().click()
  await page.locator('.sheet .chip', { hasText: 'Oberteile' }).click()
  await page.locator('#save-edit').click()
  await go(page, 'Anprobe')
  await expect(page.locator('.home .wear[data-zone="bottom"]')).toHaveCount(0)
  const top = page.locator('.home .wear.is-full[data-zone="top"]')
  await expect(top).toHaveCount(1)
  // Neu gerechnet als Oberteil: Der Drehpunkt liegt an der Schulter, nicht an der Hüfte
  expect(await top.evaluate((e) => (e as HTMLElement).style.transformOrigin)).toContain('22.5%')
  expect(errors).toEqual([])
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

test('Platz am Avatar: Oberteil liegt zwischen Schulter und Hüfte, Hose zwischen Hüfte und Knöchel', async ({ page }) => {
  const errors = await withSamples(page)
  await expect(page.locator('.home .wear.is-full')).toHaveCount(2)
  // Wo liegt der Stoff im Bühnenbild? Oberste und unterste sichtbare Zeile als Anteil der Höhe
  const extent = (zone: string) => page.locator(`.home .wear[data-zone="${zone}"] img`).evaluate(async (el) => {
    const img = el as HTMLImageElement
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth; c.height = img.naturalHeight
    const g = c.getContext('2d')!
    g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height).data
    let top = -1, bottom = -1
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x += 2) if (d[(y * c.width + x) * 4 + 3] > 60) { if (top < 0) top = y; bottom = y; break }
    return [top / c.height, bottom / c.height]
  })
  const [t0, t1] = await extent('top'), [b0, b1] = await extent('bottom')
  expect(t0).toBeGreaterThan(0.17); expect(t0).toBeLessThan(0.26)
  expect(t1).toBeGreaterThan(0.38); expect(t1).toBeLessThan(0.66)
  expect(b0).toBeGreaterThan(0.4); expect(b0).toBeLessThan(0.48)
  expect(b1).toBeGreaterThan(0.75); expect(b1).toBeLessThan(0.96)
  await page.locator('#save-outfit').click()
  await expect(page.locator('.toast')).toContainText('Outfit gespeichert')
  await go(page, 'Schrank')
  await page.locator('.view:not([hidden]) .grid .tile', { hasText: 'Weißes T-Shirt' }).click()
  await expectAccessible(page, 'Teil bearbeiten mit Sitz')
  await expect(page.locator('#fit-stage .wear img')).toBeVisible()
  await expect(page.locator('#fit-sleeves')).toHaveCount(0)
  await page.locator('#save-edit').click()
  await go(page, 'Anprobe')
  await expect(page.locator('.home .wear.is-full')).toHaveCount(2)
  expect(errors).toEqual([])
})

test('Hinzufügen: mehrere Bilder auf einmal, Art korrigieren, Teil markieren', async ({ page }) => {
  const errors = await start(page)
  await go(page, 'Schrank')
  await page.locator('#add-item').click()
  await page.locator('#import-files').setInputFiles(['tests/fixtures/shirt.jpg', 'tests/fixtures/shirt.jpg', 'tests/fixtures/selfie.jpg'])
  await expect(page.locator('#import-list .import-row')).toHaveCount(3)
  await page.locator('#import-list .import-row').nth(1).locator('.chip', { hasText: 'Schuhe' }).click()
  // Schuh: Das Bild von vorne ist Pflicht und lässt sich in der Zeile einfügen, wählen oder aufnehmen
  const front = page.locator('#import-list .import-row').nth(1).locator('.import-front')
  await expect(front).toContainText('Bild von vorne fehlt noch')
  await expect(front.locator('.icon-btn')).toHaveCount(3)
  await expect(page.locator('#import-save')).toBeDisabled()
  await expect(page.locator('#front-missing')).toBeVisible()
  await expectNoOverflow(page, 'Schuh ohne Bild von vorne')
  await expectAccessible(page, 'Schuh ohne Bild von vorne')
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), front.locator('.icon-btn[title="Aus Galerie"]').click()])
  await chooser.setFiles('tests/fixtures/shirt.jpg')
  await expect(front).toContainText('Bild von vorne ist da')
  await expect(front.locator('img')).toBeVisible()
  await expect(page.locator('#import-list .import-row')).toHaveCount(3)
  await expect(page.locator('#import-save')).toBeEnabled()
  await page.locator('#import-list .import-row').nth(1).locator('.chip', { hasText: 'Hose' }).click()
  await expect(page.locator('#import-list .import-ask')).toHaveCount(0)
  await page.locator('#import-list .import-row').nth(2).locator('.icon-btn').click()
  await expect(page.locator('#import-list .import-row')).toHaveCount(2)
  // Teil von Hand markieren: Rahmen ziehen, dann wird nur dort ausgeschnitten
  const before = await page.locator('#import-list .import-thumb img').first().getAttribute('src')
  await page.locator('#import-list .import-thumb').first().click()
  const box = (await page.locator('#mark-photo').boundingBox())!
  // Der Rahmen steht schon da: zwei Ecken nach innen ziehen statt neu zeichnen
  const edge = async () => (await page.locator('.mark-box').boundingBox())!
  const first = await edge()
  for (const [fx, fy, tx, ty] of [[0.1, 0.1, 0.3, 0.3], [0.9, 0.9, 0.7, 0.7]]) {
    await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * tx, box.y + box.height * ty, { steps: 4 })
    await page.mouse.up()
  }
  const dragged = await edge()
  expect(dragged.width).toBeLessThan(first.width * 0.7)
  expect(Math.abs(dragged.x - (box.x + box.width * 0.3))).toBeLessThan(6)
  await expectAccessible(page, 'Teil markieren')
  await page.locator('#mark-done').click()
  await expect(page.locator('#mark-photo')).toHaveCount(0)
  expect(await page.locator('#import-list .import-thumb img').first().getAttribute('src')).not.toBe(before)
  await page.locator('#import-list .import-row').first().locator('.chip', { hasText: 'Oberteil' }).click()
  await expectNoOverflow(page, 'Import')
  await expectAccessible(page, 'Import')
  await page.locator('#import-save').click()
  await expect(page.locator('.toast')).toContainText('2 Teile hängen jetzt im Schrank')
  await expect(page.locator('.view:not([hidden]) .grid .tile')).toHaveCount(2)
  await expect(page.locator('.view:not([hidden]) .grid .tile', { hasText: 'Hose in' })).toHaveCount(1)
  expect(errors).toEqual([])
})

test('Schublade: bleibt in ihrem Bereich, auch groß, und lässt sich am Griff antippen und wischen', async ({ page }) => {
  const errors = await withSamples(page)
  const handle = page.locator('.drawer-handle')
  if (!(await handle.isVisible())) return // im Querformat steht die Schublade fest neben der Bühne
  const inside = async () => {
    const [home, drawer, stage] = await Promise.all(['.home', '.drawer', '.stage-wrap'].map((s) => page.locator(s).first().boundingBox()))
    expect(drawer!.y + drawer!.height).toBeLessThanOrEqual(home!.y + home!.height + 1)
    expect(stage!.height).toBeGreaterThanOrEqual(150)
    return drawer!.height
  }
  const home = page.locator('.home')
  const small = await inside()
  await handle.click()
  await expect(home).toHaveClass(/is-open/)
  await page.waitForTimeout(400)
  expect(await inside()).toBeGreaterThanOrEqual(small)
  // Wischen am Griff: nach unten eine Stufe kleiner, nach oben eine größer
  const swipe = async (dy: number) => {
    const b = (await handle.boundingBox())!
    await handle.dispatchEvent('pointerdown', { clientX: b.x + b.width / 2, clientY: b.y + 10, pointerId: 1 })
    await handle.dispatchEvent('pointerup', { clientX: b.x + b.width / 2, clientY: b.y + 10 + dy, pointerId: 1 })
  }
  await swipe(60)
  await expect(home).not.toHaveClass(/is-open|is-min/)
  // Noch einmal nach unten: Nur Griff und Zonen-Leiste bleiben, die Vorschau wird größer, der Zufall bleibt erreichbar
  const stageMid = (await page.locator('.stage-wrap').boundingBox())!.height
  await swipe(60)
  await expect(home).toHaveClass(/is-min/)
  await expect(handle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.drawer-body')).toBeHidden()
  await expect(page.locator('.drawer .segment')).toBeVisible()
  await page.waitForTimeout(400)
  expect(await inside()).toBeLessThan(small)
  expect((await page.locator('.stage-wrap').boundingBox())!.height).toBeGreaterThan(stageMid)
  await page.locator('#roll').click()
  await expectNoOverflow(page, 'Schublade ganz klein')
  await expectAccessible(page, 'Schublade ganz klein')
  // Weiter nach unten geht nicht, sie bleibt greifbar. Die Stufe bleibt beim Wechsel des Bereichs
  await swipe(60)
  await expect(home).toHaveClass(/is-min/)
  await go(page, 'Schrank')
  await go(page, 'Anprobe')
  await expect(home).toHaveClass(/is-min/)
  // Ein Tipp auf eine Zone holt die Teile zurück, Hochwischen ebenso
  await page.locator('.drawer .segment button', { hasText: 'Hose' }).click()
  await expect(home).not.toHaveClass(/is-min/)
  await expect(page.locator('.drawer-body')).toBeVisible()
  await swipe(60)
  await swipe(-60)
  await expect(home).not.toHaveClass(/is-open|is-min/)
  await swipe(-60)
  await expect(home).toHaveClass(/is-open/)
  // Die große Stufe gilt nur für den Moment
  await go(page, 'Schrank')
  await go(page, 'Anprobe')
  await expect(home).not.toHaveClass(/is-open/)
  await page.waitForTimeout(400)
  await inside()
  expect(errors).toEqual([])
})

test('Freistellen: helles Teil auf hellem Grund bleibt ganz, freigestellte Bilder bleiben unverändert, Einfügen übernimmt Kopiertes', async ({ page }) => {
  const errors = await start(page)
  // Bilder im Browser malen: rosa Pullover-Form auf hellgrauem Grund mit Schatten, und dieselbe Form schon freigestellt
  const make = (clear: boolean) => page.evaluate(async (clear) => {
    const c = document.createElement('canvas')
    c.width = 600; c.height = 700
    const g = c.getContext('2d')!
    if (!clear) { g.fillStyle = '#f3f3f5'; g.fillRect(0, 0, 600, 700) }
    const shape = () => { g.beginPath(); g.moveTo(220, 150); g.lineTo(380, 150); g.lineTo(520, 230); g.lineTo(540, 560); g.lineTo(470, 570); g.lineTo(440, 300); g.lineTo(440, 520); g.lineTo(160, 520); g.lineTo(160, 300); g.lineTo(130, 570); g.lineTo(60, 560); g.lineTo(80, 230); g.closePath() }
    if (!clear) { g.save(); g.translate(8, 10); g.filter = 'blur(8px)'; g.fillStyle = '#c9c9cc'; shape(); g.fill(); g.restore() }
    g.fillStyle = '#f6b3d2'; shape(); g.fill()
    const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'))
    return [...new Uint8Array(await blob.arrayBuffer())]
  }, clear)
  const file = async (name: string, clear: boolean) => ({ name, mimeType: 'image/png', buffer: Buffer.from(await make(clear)) })
  await go(page, 'Schrank')
  await page.locator('#add-item').click()
  await page.locator('#import-files').setInputFiles([await file('rosa.png', false), await file('frei.png', true)])
  await expect(page.locator('#import-list .import-row')).toHaveCount(2)
  // Wie viel vom Vorschaubild ist Stoff, und ist er rosa geblieben?
  const read = (n: number) => page.locator('#import-list .import-thumb img').nth(n).evaluate(async (el) => {
    const img = el as HTMLImageElement
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth; c.height = img.naturalHeight
    const g = c.getContext('2d')!
    g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height).data
    let on = 0, pink = 0
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { on++; if (d[i] > 225 && d[i + 1] < 205 && d[i + 2] > 180) pink++ }
    return { share: on / (d.length / 4), pink: pink / Math.max(1, on), ratio: c.width / c.height }
  })
  for (const n of [0, 1]) {
    const r = await read(n)
    expect(r.share).toBeGreaterThan(0.4); expect(r.share).toBeLessThan(0.9)
    expect(r.pink).toBeGreaterThan(0.9) // kein Schatten, kein Grund
    expect(r.ratio).toBeGreaterThan(1); expect(r.ratio).toBeLessThan(1.3)
  }
  await expect(page.locator('#import-list .import-row .chip.is-on')).toHaveText(['Oberteil', 'Oberteil'])
  // Einfügen ohne Bild in der Zwischenablage erklärt, was zu tun ist
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { read: async () => [] } }) })
  await page.locator('#add-paste').click()
  await expect(page.locator('.sheet .note')).toContainText('kein Bild')
  // Mit einem kopierten, freigestellten Bild kommt eine dritte Zeile dazu
  const bytes = await make(true)
  await page.evaluate((bytes) => {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { read: async () => [{ types: ['image/png'], getType: async () => blob }] } })
  }, bytes)
  await page.locator('#add-paste').click()
  await expect(page.locator('#import-list .import-row')).toHaveCount(3)
  expect((await read(2)).pink).toBeGreaterThan(0.9)
  await expectNoOverflow(page, 'Hinzufügen mit drei Wegen')
  await expectAccessible(page, 'Hinzufügen mit drei Wegen')
  expect(errors).toEqual([])
})

test('Anprobe: ein zweiter Tipp zieht ein Teil wieder aus, ein gespeichertes Outfit lässt sich laden und abwandeln', async ({ page }) => {
  const errors = await withSamples(page)
  await page.locator('.segment button', { hasText: 'Hose' }).click()
  const on = page.locator('.pick-tile.is-on')
  await expect(on).toHaveCount(1)
  await expect(page.locator('.home .wear[data-zone="bottom"]')).toHaveCount(1)
  await on.click()
  await expect(page.locator('.pick-tile.is-on')).toHaveCount(0)
  await expect(page.locator('.home .wear[data-zone="bottom"]')).toHaveCount(0)
  await page.locator('.pick-tile:has(img)').first().click()
  await expect(page.locator('.home .wear[data-zone="bottom"]')).toHaveCount(1)
  // Outfit speichern, in der Anprobe öffnen und ein Teil tauschen: Das gespeicherte bleibt eins
  await page.locator('#save-outfit').click()
  await expect(page.locator('.toast')).toContainText('Outfit gespeichert')
  await go(page, 'Outfits')
  await page.locator('.view:not([hidden]) .tile').first().click()
  await page.locator('#wear-outfit').click()
  await expect(page.locator('.toast')).toContainText('ist geladen')
  await expect(page.locator('.home')).toBeVisible()
  await page.locator('.segment button', { hasText: 'Oberteil' }).click()
  await page.locator('.pick-tile:has(img):not(.is-on)').first().click()
  await go(page, 'Outfits')
  await expect(page.locator('.view:not([hidden]) .grid .tile')).toHaveCount(1)
  expect(errors).toEqual([])
})

test('Zufall: Normal bleibt ruhig, Speziell bringt ein spannendes Farbpaar', async ({ page }) => {
  const errors = await withSamples(page)
  await expect(page.locator('.match')).toHaveCount(0) // keine Bewertung mehr auf der Bühne
  const NEUTRAL = ['Schwarz', 'Weiß', 'Grau', 'Beige', 'Marine', 'Braun']
  // Farben der getragenen Teile aus den Namen der angezogenen Kacheln je Zone
  const colors = async () => {
    const all: string[] = []
    for (const z of ['Jacke', 'Oberteil', 'Hose', 'Schuhe']) {
      await page.locator('.drawer .segment button', { hasText: z }).click()
      const on = page.locator('.pick-tile.is-on[title]')
      if (await on.count()) all.push((await on.getAttribute('title'))!)
    }
    return all
  }
  await page.locator('#roll').click()
  expect((await colors()).length).toBeGreaterThan(1)
  // Die Einstellungen des Zufalls liegen in einem eigenen Sheet, ohne Filter für den Schrank
  await page.locator('#open-prefs').click()
  await expect(page.locator('.sheet h2')).toHaveText('Zufall')
  await expect(page.locator('#roll-mode button', { hasText: 'Normal' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.sheet')).not.toContainText(/Jahreszeit|Stil|Filter/)
  await expectNoOverflow(page, 'Sheet Zufall')
  await expectAccessible(page, 'Sheet Zufall')
  await page.locator('#roll-mode button', { hasText: 'Speziell' }).click()
  await expect(page.locator('#roll-mode button', { hasText: 'Speziell' })).toHaveAttribute('aria-pressed', 'true')
  await page.locator('#roll-prefs').click()
  await expect(page.locator('.sheet')).toHaveCount(0)
  await expect(page.locator('#open-prefs')).toHaveClass(/is-on/)
  expect((await colors()).length).toBeGreaterThan(1)
  expect(NEUTRAL.length).toBe(6)
  await expectNoOverflow(page, 'Zufall mit Art')
  await expectAccessible(page, 'Zufall mit Art')
  expect(errors).toEqual([])
})

test('Jacke: verdeckt das Oberteil, ohne Jacke ist es wieder da, der Zufall ist ein einziger Knopf', async ({ page }) => {
  const errors = await withSamples(page)
  const top = page.locator('.home .stage .wear[data-zone="top"]')
  await expect(top).toHaveCount(1)
  await page.locator('.drawer .segment button', { hasText: 'Jacke' }).click()
  await page.locator('.pick-tile[title]').first().click()
  await expect(page.locator('.home .stage .wear[data-zone="jacket"]')).toHaveCount(1)
  await expect(top).toHaveCount(0)
  // Das Oberteil bleibt gewählt, die Schublade sagt, warum es nicht zu sehen ist
  await page.locator('.drawer .segment button', { hasText: 'Oberteil' }).click()
  await expect(page.locator('.pick-tile.is-on')).toHaveCount(1)
  await expect(page.locator('.drawer-note')).toContainText('Unter der Jacke')
  await expectNoOverflow(page, 'Jacke an')
  await expectAccessible(page, 'Jacke an')
  await page.locator('.drawer .segment button', { hasText: 'Jacke' }).click()
  await page.locator('.pick-tile', { hasText: 'Ohne' }).click()
  await expect(top).toHaveCount(1)
  // Würfeln und Vorgaben teilen sich einen Knopf am Rand der Bühne
  const [roll, more] = await Promise.all(['#roll', '#open-prefs'].map((s) => page.locator(s).boundingBox()))
  expect(Math.abs(roll!.x + roll!.width - more!.x)).toBeLessThan(2)
  expect(errors).toEqual([])
})
