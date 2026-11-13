import type { Category, Item, Sex } from '../types'
import { bodyTargets } from './avatar'
import { specks } from './image'

/**
 * Sitz am Avatar ohne KI. Standard: Jede Art hat eine feste Zone an der Figur (Oberteil und Jacke von der Schulter
 * bis zur Hüfte, Hose von der Hüfte bis zum Knöchel). Das freigestellte Bild wird über seinen wirklichen Umriss (ohne
 * Rand und lose Bildreste) unverformt in diese Zone gelegt: oben angelegt, mittig, proportional so groß, dass es in
 * Breite und Höhe der Zone passt. Zusatz auf Wunsch (item.sleeves): Bei Oberteilen fallen die Ärmel zu den Armen hin.
 * Das greift nur, wenn beide Ärmel sicher erkannt sind, sonst bleibt es beim Standard.
 * Ergebnis ist ein Bild in Bühnengröße (3:4) für die Figur in Normalbreite.
 */
const U = 2, W = 300 * U, H = 400 * U, CX = W / 2
export type FitKind = 'top' | 'bottom'
export const fitKind = (c: Category): FitKind | null => (c === 'Oberteile' || c === 'Jacken' ? 'top' : c === 'Hosen' ? 'bottom' : null)
/** Um diesen Punkt der Bühne (Anteil der Höhe) wird die Feineinstellung des Sitzes angewendet. */
export const FIT_ORIGIN: Record<FitKind, number> = { top: 0.225, bottom: 0.44 }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const median = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1]

interface Mask { w: number; h: number; on: (x: number, y: number) => boolean; top: number; bottom: number; left: number; right: number }
export function maskOf(src: HTMLCanvasElement): Mask | null {
  const { width: w, height: h } = src
  const d = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[((y | 0) * w + (x | 0)) * 4 + 3] > 60
  let top = h, bottom = -1, left = w, right = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 60) {
    if (y < top) top = y
    if (y > bottom) bottom = y
    if (x < left) left = x
    if (x > right) right = x
  }
  return bottom < 0 || right - left < 20 || bottom - top < 20 ? null : { w, h, on, top, bottom, left, right }
}
/** Zusammenhängender Abschnitt einer Zeile, der die Mitte enthält (der Rumpf, ohne daneben liegende Ärmel). */
function centerRun(m: Mask, y: number, cx: number): [number, number] | null {
  let x = Math.round(cx)
  if (!m.on(x, y)) {
    const reach = (m.right - m.left) * 0.08
    let found = -1
    for (let d = 1; d < reach && found < 0; d++) found = m.on(x + d, y) ? x + d : m.on(x - d, y) ? x - d : -1
    if (found < 0) return null
    x = found
  }
  let l = x, r = x
  while (m.on(l - 1, y)) l--
  while (m.on(r + 1, y)) r++
  return [l, r]
}

interface Sleeve { ax: number; ay: number; ex: number; ey: number; armpit: number; top: number }
interface TopShape { cx: number; bh: number; seamY: number; hem: number; sleeves: Partial<Record<1 | -1, Sleeve>> }

export function readTop(m: Mask): TopShape | null {
  const hgt = m.bottom - m.top
  let cx = (m.left + m.right) / 2
  // Saum: die unterste Zeile, in der der Rumpf liegt (lange Ärmel können tiefer reichen)
  let hem = m.bottom
  while (hem > m.top && !centerRun(m, hem, cx)) hem--
  const rows: [number, number][] = []
  for (let y = Math.round(hem - hgt * 0.1); y <= hem - hgt * 0.02; y++) { const r = centerRun(m, y, cx); if (r) rows.push(r) }
  if (rows.length < 3) return null
  cx = median(rows.map((r) => (r[0] + r[1]) / 2))
  const bh = median(rows.map((r) => (r[1] - r[0]) / 2))
  if (bh < 10) return null
  const sleeves: TopShape['sleeves'] = {}
  let seamY = m.bottom
  for (const side of [1, -1] as const) {
    const sx = Math.round(cx + side * bh * 0.96)
    let sy = m.top
    while (sy < hem && !m.on(sx, sy)) sy++
    seamY = Math.min(seamY, sy)
    // Achsel: von unten nach oben die erste Stelle, an der der Rumpf deutlich breiter wird als am Saum
    let armpit = -1, streak = 0
    for (let y = Math.round(hem - hgt * 0.1); y > m.top; y--) {
      const r = centerRun(m, y, cx)
      const ext = r ? (side > 0 ? r[1] - cx : cx - r[0]) : 0
      streak = ext > bh * 1.2 ? streak + 1 : 0
      if (streak >= 4) { armpit = y + 4; break }
    }
    if (armpit < 0) continue
    const ax = cx + side * bh, ay = (sy + armpit) / 2
    // Ärmelende: die Punkte jenseits der Rumpfkante, die am weitesten von der Schulter entfernt sind
    let far = 0
    const pts: [number, number, number][] = []
    const gap = Math.max(3, bh * 0.06)
    for (let y = m.top; y <= m.bottom; y += 2) {
      // Unter der Achsel gehört der mittlere Abschnitt zum Rumpf, nicht zum Ärmel
      const body = y > armpit ? centerRun(m, y, cx) : null
      for (let x = side > 0 ? Math.ceil(ax + gap) : m.left; side > 0 ? x <= m.right : x <= ax - gap; x += 2) {
        if (!m.on(x, y) || (body && x >= body[0] - 1 && x <= body[1] + 1)) continue
        const dist = Math.hypot(x - ax, y - ay)
        pts.push([x, y, dist])
        if (dist > far) far = dist
      }
    }
    const end = pts.filter((p) => p[2] > far * 0.93)
    if (far < bh * 0.3 || !end.length) continue
    sleeves[side] = { ax, ay, ex: end.reduce((a, p) => a + p[0], 0) / end.length, ey: end.reduce((a, p) => a + p[1], 0) / end.length, armpit, top: sy }
  }
  return { cx, bh, seamY, hem, sleeves }
}

const smooth = (k: number) => { const c = clamp(k, 0, 1); return c * c * (3 - 2 * c) }
function stage() {
  const out = document.createElement('canvas')
  out.width = W
  out.height = H
  const ctx = out.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  return { out, ctx }
}

/**
 * Oberteil: ein Maßstab für das ganze Teil (Rumpfbreite auf Schulterbreite, Naht auf Schulterhöhe). Der Rumpf bleibt,
 * wie er fotografiert wurde. Nur jenseits der Rumpfkante wird das Bild stufenlos nach unten geschert und etwas
 * zusammengeschoben, damit die Ärmel den Armen folgen. Nichts wird ausgeschnitten oder einzeln gedreht.
 */
function warpTop(src: HTMLCanvasElement, m: Mask, sex: Sex | undefined, sh: TopShape, s: number): HTMLCanvasElement {
  const t = bodyTargets(sex)
  const top = (t.shoulderY - 1.5) * U + (m.top - sh.seamY) * s
  const edge = sh.bh * s, onset = edge * 0.2
  const arm = Math.atan2(t.armTo[1] - t.armFrom[1], Math.max(1, t.armTo[0] - t.armFrom[0]))
  const bend = { 1: { squeeze: 1, shear: 0 }, [-1]: { squeeze: 1, shear: 0 } } as Record<1 | -1, { squeeze: number; shear: number }>
  for (const side of [1, -1] as const) {
    const sl = sh.sleeves[side]
    if (!sl) continue
    const dx = Math.abs(sl.ex - sl.ax) * s, dy = (sl.ey - sl.ay) * s
    if (dx < edge * 0.15) continue
    // Der Ärmel dreht sich nur einen Teil des Wegs zum Arm: Er soll fallen, aber seine Form behalten
    const from = Math.atan2(dy, dx), to = from + Math.max(0, arm - from) * 0.6, len = Math.hypot(dx, dy)
    const squeeze = clamp((len * Math.cos(to)) / dx, 0.6, 1)
    bend[side] = { squeeze, shear: clamp((len * Math.sin(to) - dy) / dx, 0, 1) }
  }
  const { out, ctx } = stage()
  const sh0 = m.bottom - m.top + 1
  for (let tx = 0; tx < W; tx++) {
    const side = tx >= CX ? 1 : -1, ud = Math.abs(tx + 0.5 - CX), b = bend[side]
    let u = ud / s, drop = 0, step = 1 / s
    if (ud > edge) {
      const v = (ud - edge) / b.squeeze // Weg jenseits der Rumpfkante, im Maßstab des Teils
      u = (edge + v) / s
      step /= b.squeeze
      // Weicher Einsatz der Scherung, damit an der Naht kein Knick entsteht
      drop = (v < onset ? (v * v) / (2 * onset) : v - onset / 2) * b.shear
    }
    const sx = sh.cx + side * u - step / 2
    if (sx + step < m.left || sx > m.right + 1) continue
    ctx.drawImage(src, clamp(sx, 0, m.w - step), m.top, step, sh0, tx, top + drop, 1, sh0 * s)
  }
  return out
}

/** Erster und letzter Stoffpunkt einer Zeile. */
function span(m: Mask, y: number): [number, number] | null {
  let l = m.left, r = m.right
  while (l <= r && !m.on(l, y)) l++
  while (r >= l && !m.on(r, y)) r--
  return r > l ? [l, r] : null
}

/** Oberkante einer Hose: die erste Zeile, die annähernd so breit ist wie die Hose oben. Etiketten über dem Bund zählen nicht. */
function waistRow(m: Mask): number {
  const hgt = m.bottom - m.top, widths: number[] = []
  for (let y = m.top; y <= m.top + hgt * 0.25; y++) { const r = span(m, y); widths.push(r ? r[1] - r[0] : 0) }
  const first = widths.findIndex((w) => w > Math.max(...widths) * 0.6)
  return m.top + Math.max(0, first)
}

/** Feste Zone je Art in Bühnenpunkten: Oberkante, größte Breite und größte Höhe. */
function zoneBox(kind: FitKind, jacket: boolean, sex: Sex | undefined, tall: boolean) {
  const t = bodyTargets(sex)
  if (kind === 'top') {
    const top = t.shoulderY - (jacket ? 8 : 6), k = jacket ? 1.07 : 1
    return { top: top * U, maxW: (t.armOuter * 2 + 8) * k * U, maxH: (t.crotchY - 4 - top) * k * U }
  }
  // Lange Hosen dürfen weit sein, kurze Hosen richten sich nach der Hüfte
  const hip = t.torsoHalf(t.waistY) * 2
  return { top: (t.waistY - 3) * U, maxW: hip * (tall ? 1.7 : 1.25) * U, maxH: (t.ankleY + 5 - t.waistY) * U }
}

/** Standard: das Teil unverformt in seine Zone legen. */
function place(src: HTMLCanvasElement, m: Mask, kind: FitKind, jacket: boolean, sex: Sex | undefined): { out: HTMLCanvasElement; s: number } {
  const y0 = kind === 'bottom' ? waistRow(m) : m.top
  const w = m.right - m.left + 1, h = m.bottom - y0 + 1
  const box = zoneBox(kind, jacket, sex, h / w >= 1.3)
  const s = Math.min(box.maxW / w, box.maxH / h)
  const { out, ctx } = stage()
  ctx.setTransform(s, 0, 0, s, CX - ((m.left + m.right + 1) / 2) * s, box.top - y0 * s)
  ctx.drawImage(src, 0, 0)
  return { out, s }
}

const cache = new Map<string, Promise<string | null>>()
/** Bild des Teils an seinem Platz auf der Figur (Bühnengröße 3:4), oder null für Arten ohne feste Zone hier. */
export function fittedUrl(item: Item, sex: Sex | undefined): Promise<string | null> {
  const kind = fitKind(item.category)
  if (!kind) return Promise.resolve(null)
  const key = `${item.id}:${item.category}:${item.sleeves ? 1 : 0}:${item.image.size}:${sex === 'Weiblich' ? 'w' : 'm'}`
  let hit = cache.get(key)
  if (!hit) {
    hit = (async () => {
      const bmp = await createImageBitmap(item.image)
      const src = document.createElement('canvas')
      src.width = bmp.width
      src.height = bmp.height
      src.getContext('2d', { willReadFrequently: true })!.drawImage(bmp, 0, 0)
      bmp.close?.()
      // Bildreste neben dem Teil würden die Ankerpunkte verfälschen
      const sc = src.getContext('2d')!, img = sc.getImageData(0, 0, src.width, src.height)
      const solid = new Uint8Array(src.width * src.height)
      for (let p = 0; p < solid.length; p++) solid[p] = img.data[p * 4 + 3] > 60 ? 1 : 0
      const loose = specks(solid, src.width, src.height, 1)
      if (loose.length) {
        for (const p of loose) img.data[p * 4 + 3] = 0
        sc.putImageData(img, 0, 0)
      }
      const m = maskOf(src)
      if (!m) return null
      const jacket = item.category === 'Jacken'
      let { out, s } = place(src, m, kind, jacket, sex)
      if (kind === 'top' && item.sleeves) {
        // Nur wenn beide Ärmel erkannt sind und der Maßstab zum Standard passt, sonst bleibt der Standard
        const sh = readTop(m), sw = sh ? ((bodyTargets(sex).shoulderHalf + (jacket ? 5 : 3)) * U) / sh.bh : 0
        if (sh && sh.sleeves[1] && sh.sleeves[-1] && sw > s * 0.8 && sw < s * 1.35) out = warpTop(src, m, sex, sh, sw)
      }
      const blob = await new Promise<Blob | null>((res) => out.toBlob(res, 'image/png'))
      return blob ? URL.createObjectURL(blob) : null
    })().catch(() => null)
    cache.set(key, hit)
  }
  return hit
}
