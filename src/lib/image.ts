import { NO_FIT, type Category, type Item, type Sex, type Slots } from '../types'
import { FIT_ORIGIN, fitKind, fittedUrl } from './fitting'
import { DRAW_ORDER, PAIR_SHOE, placement } from './avatar'

const MAX_SIDE = 900

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

export function toBlob(canvas: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), type, quality))
}

/** Öffnet ein Foto (mit korrekter Drehung) und verkleinert es auf eine handliche Größe. */
export async function loadPhoto(file: Blob, maxSide = MAX_SIDE): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const c = makeCanvas(Math.max(1, Math.round(bmp.width * k)), Math.max(1, Math.round(bmp.height * k)))
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close?.()
  return c
}

/**
 * Einfaches Freistellen: Vom Bildrand aus wird alles entfernt, was farblich zum Hintergrund gehört.
 * Funktioniert gut auf ruhigem, einfarbigem Untergrund. tolerance: 0 (streng) bis 100 (großzügig).
 */
export function removeBackground(src: HTMLCanvasElement, tolerance = 45): HTMLCanvasElement {
  const { width: w, height: h } = src
  const out = makeCanvas(w, h)
  const ctx = out.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(src, 0, 0)
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const n = w * h

  // Hintergrundfarbe: Median der Randpixel
  const rs: number[] = [], gs: number[] = [], bs: number[] = []
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4
    rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2])
  }
  const step = Math.max(1, Math.floor(Math.max(w, h) / 200))
  for (let x = 0; x < w; x += step) { sample(x, 0); sample(x, h - 1) }
  for (let y = 0; y < h; y += step) { sample(0, y); sample(w - 1, y) }
  const med = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1]
  const br = med(rs), bg = med(gs), bb = med(bs)

  const tGlobal = 20 + tolerance * 1.6 // Abstand zur Hintergrundfarbe
  const tLocal = 6 + tolerance * 0.32 // Sprung zum Nachbarpixel (Kante)
  const tG2 = tGlobal * tGlobal, tL2 = tLocal * tLocal

  const mask = new Uint8Array(n) // 1 = Hintergrund
  const queue = new Int32Array(n)
  let head = 0, tail = 0
  const tryPush = (p: number, from: number) => {
    if (mask[p]) return
    const i = p * 4
    const dr = d[i] - br, dg = d[i + 1] - bg, db = d[i + 2] - bb
    if (dr * dr + dg * dg + db * db > tG2) return
    if (from >= 0) {
      const j = from * 4
      const lr = d[i] - d[j], lg = d[i + 1] - d[j + 1], lb = d[i + 2] - d[j + 2]
      if (lr * lr + lg * lg + lb * lb > tL2) return
    }
    mask[p] = 1
    queue[tail++] = p
  }
  for (let x = 0; x < w; x++) { tryPush(x, -1); tryPush((h - 1) * w + x, -1) }
  for (let y = 0; y < h; y++) { tryPush(y * w, -1); tryPush(y * w + w - 1, -1) }
  while (head < tail) {
    const p = queue[head++]
    const x = p % w
    if (x > 0) tryPush(p - 1, p)
    if (x < w - 1) tryPush(p + 1, p)
    if (p >= w) tryPush(p - w, p)
    if (p < n - w) tryPush(p + w, p)
  }

  // Bildreste (Schrift, Etiketten, Krümel neben dem Teil) zählen zum Hintergrund
  for (const p of specks(mask, w, h, 0)) mask[p] = 1

  // Weiche Kante: Deckkraft aus dem Anteil der Vordergrund-Nachbarn (5x5)
  const R = 2
  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x
      let fg = 0, cnt = 0
      for (let yy = Math.max(0, y - R); yy <= Math.min(h - 1, y + R); yy++) {
        for (let xx = Math.max(0, x - R); xx <= Math.min(w - 1, x + R); xx++) {
          cnt++
          if (!mask[yy * w + xx]) fg++
        }
      }
      const a = mask[p] ? 0 : Math.min(1, (fg / cnt) * 1.6)
      d[p * 4 + 3] = Math.round(d[p * 4 + 3] * a)
      if (a > 0.5) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  ctx.putImageData(img, 0, 0)
  if (maxX < 0) return src // nichts übrig: Original behalten
  return crop(out, minX, minY, maxX - minX + 1, maxY - minY + 1)
}

/**
 * Lose Flächen neben dem eigentlichen Teil (Schrift, Knöpfe einer Shop-Seite, Krümel): alle zusammenhängenden Flächen, die
 * deutlich kleiner sind als die größte.
 * cells[p] === fg markiert Vordergrund. Zwei ähnlich große Flächen (ein Paar Schuhe) bleiben beide.
 */
export function specks(cells: Uint8Array, w: number, h: number, fg: number): number[] {
  const n = w * h, label = new Int32Array(n), stack = new Int32Array(n), sizes: number[] = [0]
  for (let p0 = 0; p0 < n; p0++) {
    if (cells[p0] !== fg || label[p0]) continue
    const id = sizes.length
    let top = 0, size = 0
    stack[top++] = p0
    label[p0] = id
    while (top) {
      const p = stack[--top], x = p % w
      size++
      if (x > 0 && cells[p - 1] === fg && !label[p - 1]) { label[p - 1] = id; stack[top++] = p - 1 }
      if (x < w - 1 && cells[p + 1] === fg && !label[p + 1]) { label[p + 1] = id; stack[top++] = p + 1 }
      if (p >= w && cells[p - w] === fg && !label[p - w]) { label[p - w] = id; stack[top++] = p - w }
      if (p < n - w && cells[p + w] === fg && !label[p + w]) { label[p + w] = id; stack[top++] = p + w }
    }
    sizes.push(size)
  }
  const limit = Math.max(...sizes) * 0.3
  const out: number[] = []
  for (let p = 0; p < n; p++) if (label[p] && sizes[label[p]] < limit) out.push(p)
  return out
}

export interface Area { x: number; y: number; w: number; h: number } // Anteile des Bildes, 0 bis 1
/**
 * Freistellen nur im markierten Bereich: Was außerhalb liegt, fällt weg, die Hintergrundfarbe wird am Rand des Bereichs
 * gelesen. Lässt sich auch dort nichts trennen, bleibt der Ausschnitt, wie er ist.
 */
export function cutArea(src: HTMLCanvasElement, a: Area, tolerance = 45): HTMLCanvasElement {
  const x = Math.round(a.x * src.width), y = Math.round(a.y * src.height)
  const w = Math.max(8, Math.min(src.width - x, Math.round(a.w * src.width))), h = Math.max(8, Math.min(src.height - y, Math.round(a.h * src.height)))
  const part = makeCanvas(w, h)
  part.getContext('2d')!.drawImage(src, x, y, w, h, 0, 0, w, h)
  return removeBackground(part, tolerance)
}

function crop(src: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
  const pad = Math.round(Math.max(w, h) * 0.03)
  const c = makeCanvas(w + pad * 2, h + pad * 2)
  c.getContext('2d')!.drawImage(src, x, y, w, h, pad, pad, w, h)
  return c
}

/** Anteil der sichtbaren Pixel, um ein misslungenes Freistellen zu erkennen. */
export function coverage(c: HTMLCanvasElement): number {
  const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data
  let on = 0
  for (let i = 3; i < d.length; i += 16) if (d[i] > 128) on++
  return on / (d.length / 16)
}

function nameColor(r: number, g: number, b: number): string {
  const R = r / 255, G = g / 255, B = b / 255
  const max = Math.max(R, G, B), min = Math.min(R, G, B)
  const l = (max + min) / 2
  const dlt = max - min
  const s = dlt === 0 ? 0 : dlt / (1 - Math.abs(2 * l - 1))
  let hue = 0
  if (dlt) {
    if (max === R) hue = ((G - B) / dlt) % 6
    else if (max === G) hue = (B - R) / dlt + 2
    else hue = (R - G) / dlt + 4
    hue = (hue * 60 + 360) % 360
  }
  if (l < 0.14) return 'Schwarz'
  if (s < 0.12) return l > 0.82 ? 'Weiß' : l < 0.22 ? 'Schwarz' : 'Grau'
  if (hue < 15 || hue >= 345) return l > 0.7 ? 'Rosa' : 'Rot'
  if (hue < 65) {
    if (s < 0.45 && l > 0.55) return 'Beige'
    if (l < 0.42) return 'Braun'
    return hue < 42 ? 'Orange' : 'Gelb'
  }
  if (hue < 165) return 'Grün'
  if (hue < 195) return 'Türkis'
  if (hue < 255) return l < 0.3 ? 'Marine' : 'Blau'
  if (hue < 290) return 'Lila'
  return l > 0.55 ? 'Rosa' : 'Lila'
}

/** Die häufigste und, falls deutlich vorhanden, zweithäufigste Farbe der sichtbaren Pixel. */
export function detectColors(c: HTMLCanvasElement): { color: string; color2?: string } {
  const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data
  const counts: Record<string, number> = {}
  let total = 0
  for (let i = 0; i < d.length; i += 4 * 7) {
    if (d[i + 3] < 200) continue
    const name = nameColor(d[i], d[i + 1], d[i + 2])
    counts[name] = (counts[name] || 0) + 1
    total++
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (!sorted.length) return { color: 'Grau' }
  const second = sorted[1] && sorted[1][1] / total >= 0.2 ? sorted[1][0] : undefined
  return { color: sorted[0][0], color2: second }
}

/**
 * Vermutung der Art aus dem Umriss des freigestellten Teils: Seitenverhältnis, Lücke zwischen zwei Beinen, Ärmel, die
 * breiter sind als der Saum, und ob das Teil nach unten breiter wird. Es bleibt eine Vermutung, der Nutzer korrigiert sie.
 */
export function guessCategory(src: HTMLCanvasElement): Category {
  const c = trim(src), r = c.height / c.width
  if (r < 0.72) return 'Schuhe'
  const w = 96, h = Math.max(24, Math.round(w * r))
  const small = makeCanvas(w, h)
  small.getContext('2d', { willReadFrequently: true })!.drawImage(c, 0, 0, w, h)
  const d = small.getContext('2d')!.getImageData(0, 0, w, h).data
  const on = (x: number, y: number) => d[(y * w + x) * 4 + 3] > 60
  /** Breite (Anteil), Zahl der Lücken zwischen Stoffstücken und ob eine davon in der Mitte liegt. */
  const row = (f: number) => {
    const y = Math.min(h - 1, Math.round(f * (h - 1)))
    let l = 0, e = w - 1, gaps = 0, mid = false, run = 0
    while (l < w && !on(l, y)) l++
    while (e > l && !on(e, y)) e--
    for (let x = l; x <= e; x++) {
      if (on(x, y)) { run = 0; continue }
      if (++run === 2) { gaps++; if (Math.abs(x - (l + e) / 2) < (e - l) * 0.2) mid = true }
    }
    return { width: l >= w ? 0 : (e - l + 1) / w, gaps, gap: gaps === 1 && mid }
  }
  const band = (from: number, to: number) => { const out = []; for (let f = from; f <= to + 0.001; f += 0.03) out.push(row(f)); return out }
  const top = Math.max(...band(0.02, 0.06).map((x) => x.width)), upper = Math.max(...band(0.12, 0.36).map((x) => x.width))
  const lower = Math.max(...band(0.72, 0.86).map((x) => x.width))
  // Ärmel, die neben dem Rumpf herabhängen: links und rechts je eine Lücke
  if (band(0.45, 0.9).filter((x) => x.gaps >= 2).length >= 2) return r > 1.7 ? 'Kleider' : 'Oberteile'
  // Oben schmal (Kragen), gleich darunter schon die volle Breite (Schultern und Ärmel): ein Oberteil, auch ohne Lücken
  if (top < upper * 0.6 && upper > 0.9 && upper >= lower * 0.9) return r > 1.7 ? 'Kleider' : 'Oberteile'
  // Zwei Beine: unten genau eine Lücke in der Mitte, oben ein gerader Bund, der fast so breit ist wie die Hüfte
  const waist = top > row(0.3).width * 0.6
  const legs = band(0.8, 0.97).filter((x) => x.gap).length >= 2 && !band(0.03, 0.2).some((x) => x.gaps)
  if (legs && waist) return 'Hosen'
  if (upper > lower * 1.2 && upper > 0.9) return r > 1.7 ? 'Kleider' : 'Oberteile' // Ärmel stehen über den Saum hinaus
  if (lower > top * 1.3 && !waist) return r > 1.5 ? 'Kleider' : r > 0.75 ? 'Röcke' : 'Oberteile'
  // Weite Hosen, deren Beine aneinander liegen: oben ein gerader, breiter Bund ohne Ausschnitt
  if (r > 1.45 || (r > 1.15 && waist && !band(0.03, 0.2).some((x) => x.gaps))) return 'Hosen'
  return 'Oberteile'
}

/** Schneidet durchsichtigen Rand ab. */
export function trim(src: HTMLCanvasElement): HTMLCanvasElement {
  const { width: w, height: h } = src
  const d = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data
  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 20) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  if (maxX < 0) return src
  const c = makeCanvas(maxX - minX + 1, maxY - minY + 1)
  c.getContext('2d')!.drawImage(src, minX, minY, c.width, c.height, 0, 0, c.width, c.height)
  return c
}

/** Zeichnet den Avatar mit dem angezogenen Outfit im Format 3:4 als Vorschaubild. */
export async function renderOutfit(slots: Slots, items: Item[], avatar: Blob | string, isPhoto: boolean, tile: string, wide = 1, sex?: Sex): Promise<Blob> {
  const W = 600, H = 800
  const c = makeCanvas(W, H)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = tile
  ctx.fillRect(0, 0, W, H)
  if (typeof avatar === 'string') {
    const img = new Image()
    img.src = avatar
    await img.decode()
    ctx.drawImage(img, 0, 0, W, H)
  } else {
    const bmp = await createImageBitmap(avatar)
    const k = isPhoto ? Math.max(W / bmp.width, H / bmp.height) : Math.min(W / bmp.width, H / bmp.height)
    ctx.drawImage(bmp, (W - bmp.width * k) / 2, (H - bmp.height * k) / 2, bmp.width * k, bmp.height * k)
  }
  const top = items.find((i) => i.id === slots.top)
  const isDress = top?.category === 'Kleider'
  for (const zone of DRAW_ORDER) {
    if (zone === 'bottom' && isDress) continue
    const item = items.find((i) => i.id === slots[zone])
    if (!item) continue
    const f = item.fit ?? NO_FIT
    const p = placement(zone, isDress, f, wide)
    if (zone === 'shoes' && item.wearImage) {
      // Ein Schuh von vorne: links normal, rechts gespiegelt
      const one = await createImageBitmap(item.wearImage)
      const pw = p.w * W, sw = pw * PAIR_SHOE, sh = (sw * one.height) / one.width
      const x0 = (W - pw) / 2, y0 = p.y * H - sh
      ctx.drawImage(one, x0, y0, sw, sh)
      ctx.save()
      ctx.translate(x0 + pw, y0)
      ctx.scale(-1, 1)
      ctx.drawImage(one, 0, 0, sw, sh)
      ctx.restore()
      continue
    }
    const kind = fitKind(item.category), full = !isPhoto && kind ? await fittedUrl(item, sex) : null
    if (full && kind) {
      // An die Figur angepasstes Bild in Bühnengröße, mit derselben Feineinstellung wie auf der Bühne
      const img = new Image()
      img.src = full
      await img.decode()
      const oy = FIT_ORIGIN[kind] * H
      ctx.save()
      ctx.translate(W / 2, oy + f.dy * H)
      ctx.scale(wide * f.scale, f.scale)
      ctx.drawImage(img, -W / 2, -oy, W, H)
      ctx.restore()
      continue
    }
    const bmp = await createImageBitmap(item.image)
    const w = p.w * W
    const h = (w * bmp.height) / bmp.width
    const y = p.anchor === 'top' ? p.y * H : p.y * H - h
    ctx.drawImage(bmp, (W - w) / 2, y, w, h)
  }
  return toBlob(c, 'image/jpeg', 0.88)
}
