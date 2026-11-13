import type { Category, Item, Sex } from '../types'
import { bodyTargets } from './avatar'
import { specks } from './image'

/**
 * Sitz am Avatar ohne KI. Die Figur ist eine Puppe ohne Arme, darum wird kein Oberteil verzerrt: Das freigestellte
 * Bild wird über seinen wirklichen Umriss (ohne Rand und lose Bildreste) nur skaliert und an die Schultern gelegt.
 * Die Größe kommt aus der Schulterbreite des Teils, der sichere Weg aus seiner Länge. Hosen hängen am Bund und enden
 * am Knöchel, die Beine werden höchstens leicht zur Seite ausgerichtet.
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

/**
 * Rumpf eines Oberteils ohne Ärmel: Länge vom Kragen bis zum Saum (Ärmel können tiefer hängen) und die Breite an der
 * schmalsten Stelle zwischen Schulter und Saum. Liegen die Ärmel am Rumpf an, ist das die Schulterbreite, stehen sie
 * ab, die Breite des Rumpfs darunter.
 */
export function readTop(m: Mask): { width: number; length: number } | null {
  const cx = (m.left + m.right) / 2
  let hem = m.bottom
  while (hem > m.top && !centerRun(m, hem, cx)) hem--
  const length = hem - m.top + 1
  if (length < 20) return null
  const widths: number[] = []
  for (let y = Math.round(m.top + length * 0.15); y <= m.top + length * 0.95; y++) { const r = centerRun(m, y, cx); if (r) widths.push(r[1] - r[0] + 1) }
  if (widths.length < 5) return null
  const width = widths.sort((x, y) => x - y)[Math.floor(widths.length * 0.1)]
  return width < 20 ? null : { width, length }
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

/** Feste Zone je Art in Bühnenpunkten. Oberteil: Oberkante, Länge des Oberkörpers, Schulterbreite. Hose: Oberkante, größte Breite und Höhe. */
function topBox(jacket: boolean, sex: Sex | undefined) {
  const t = bodyTargets(sex), top = t.shoulderY - (jacket ? 11 : 9)
  return { top: top * U, torso: (t.crotchY - top) * (jacket ? 1.06 : 1) * U, shoulders: (t.shoulderHalf * 2 + (jacket ? 22 : 16)) * U }
}
function bottomBox(sex: Sex | undefined, tall: boolean) {
  // Lange Hosen dürfen weit sein, kurze Hosen richten sich nach der Hüfte
  const t = bodyTargets(sex), hip = t.torsoHalf(t.waistY) * 2
  return { top: (t.waistY - 3) * U, maxW: hip * (tall ? 1.7 : 1.25) * U, maxH: (t.ankleY + 5 - t.waistY) * U }
}

/** Sicherer Weg für Hosen, der bei jedem Bild geht: das Teil als Ganzes in seine Zone einpassen, ohne etwas zu erkennen. */
function simpleScale(m: Mask, y0: number, box: ReturnType<typeof bottomBox>) {
  return Math.min(box.maxW / (m.right - m.left + 1), box.maxH / (m.bottom - y0 + 1))
}

/**
 * Oberteil und Jacke: Das Bild bleibt, wie es ist, mit Ärmeln, und wird nur als Ganzes skaliert und mittig an die
 * Schultern gelegt. Sicherer Weg: Die Länge vom Kragen bis zum Saum wird zur Länge des Oberkörpers. Ist die
 * Schulterbreite des Teils erkannt und liegt ihr Ergebnis in der Nähe, bestimmt sie die Größe: Schultern des Teils
 * auf die Schultern der Figur. Nichts wird verzerrt.
 */
function placeTop(src: HTMLCanvasElement, m: Mask, jacket: boolean, sex: Sex | undefined): HTMLCanvasElement {
  const box = topBox(jacket, sex), w = m.right - m.left + 1, shape = readTop(m)
  const simple = box.torso / (shape?.length ?? m.bottom - m.top + 1)
  let s = simple
  const byShoulder = shape ? box.shoulders / shape.width : 0
  // Weicht die Erkennung stark vom sicheren Weg ab, stimmt sie nicht, und der sichere Weg gilt
  if (byShoulder > simple * 0.7 && byShoulder < simple * 1.4) s = byShoulder
  s = Math.min(s, (W * 0.98) / w) // weit ausgebreitete Ärmel bleiben auf der Bühne
  const { out, ctx } = stage()
  ctx.setTransform(s, 0, 0, s, CX - ((m.left + m.right + 1) / 2) * s, box.top - m.top * s)
  ctx.drawImage(src, 0, 0)
  return out
}

/**
 * Hose: Wenn er sicher erkannt ist, bestimmt der Bund die Größe (Bundbreite auf Hüftbreite) und die Mitte. Lange Hosen
 * werden höchstens leicht in der Länge angeglichen, damit sie am Knöchel enden. Sind zwei Beine sicher erkannt, wird
 * jedes Bein unterhalb des Schritts stufenlos zur Seite geschoben, bis es am Saum über dem Bein der Figur liegt.
 * Geschoben wird nur, nichts gestaucht: Weite und Form der Hose bleiben, wie sie sind.
 */
function placeBottom(src: HTMLCanvasElement, m: Mask, sex: Sex | undefined): HTMLCanvasElement {
  const t = bodyTargets(sex), y0 = waistRow(m), w = m.right - m.left + 1, h = m.bottom - y0 + 1
  const tall = h / w >= 1.3, box = bottomBox(sex, tall), simple = simpleScale(m, y0, box)
  let s = simple, cx = (m.left + m.right + 1) / 2
  const rows: [number, number][] = []
  for (let y = Math.round(y0 + h * 0.01); y <= y0 + h * 0.05; y++) { const r = span(m, y); if (r) rows.push(r) }
  if (rows.length >= 2) {
    const wh = median(rows.map((r) => (r[1] - r[0]) / 2)), byWaist = ((t.torsoHalf(t.waistY) + 2.5) * U) / wh
    if (wh >= 10 && byWaist > simple * 0.75 && byWaist < simple * 1.35) {
      s = byWaist
      cx = median(rows.map((r) => (r[0] + r[1]) / 2))
    }
  }
  const full = (t.ankleY + 2 - t.waistY) * U
  const sy = tall ? s * clamp(full / (h * s), 0.9, 1.12) : s
  const top = box.top, { out, ctx } = stage()

  // Zwei Beine? Der Schritt ist die erste Zeile, ab der die Mitte bis zum Saum frei bleibt.
  let crotch = -1
  const mid = Math.round(cx)
  for (let y = Math.round(y0 + h * 0.15); y < y0 + h * 0.8; y++) {
    if (m.on(mid, y)) continue
    let free = true
    for (let k = y; k <= m.bottom && free; k += 3) free = !m.on(mid, k)
    if (free) { crotch = y; break }
  }
  // Mitte und innere Kante jedes Beins am Saum (mittlere der untersten Zeilen)
  const hem: Record<1 | -1, { c: number; inner: number } | null> = { 1: null, [-1]: null }
  if (crotch > 0) for (const side of [1, -1] as const) {
    const cs: number[] = [], inner: number[] = []
    for (let y = Math.round(m.bottom - h * 0.06); y <= m.bottom - h * 0.01; y++) {
      const lim = side > 0 ? m.right : m.left
      let a = mid, e = lim
      while (a !== lim && !m.on(a, y)) a += side
      while (e !== a && !m.on(e, y)) e -= side
      if (a !== e) { cs.push(Math.abs((a + e) / 2 - cx)); inner.push(Math.abs(a - cx)) }
    }
    if (cs.length >= 2) hem[side] = { c: median(cs), inner: median(inner) }
  }
  if (crotch < 0 || !tall || !hem[1] || !hem[-1]) {
    // Beine nicht sicher erkannt oder kurze Hose: nur skalieren und setzen
    ctx.setTransform(s, 0, 0, sy, CX - cx * s, top - y0 * sy)
    ctx.drawImage(src, 0, 0)
    return out
  }
  // Bis zum Schritt bleibt das Bild, wie es ist
  ctx.setTransform(s, 0, 0, sy, CX - cx * s, top - y0 * sy)
  ctx.drawImage(src, 0, y0, m.w, crotch - y0, 0, y0, m.w, crotch - y0)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const legLen = (m.bottom - crotch) * sy, target = t.leg(t.ankleY - 6) * U
  const end = { 1: 0, [-1]: 0 } as Record<1 | -1, number>
  for (const side of [1, -1] as const) {
    const l = hem[side]!
    // Nach außen höchstens ein Stück der Beinlänge, nach innen nur so weit, dass die Beine sich nicht überlagern
    end[side] = clamp(target - l.c * s, -Math.min(l.inner * s * 0.8, legLen * 0.12), legLen * 0.12)
  }
  const crotchT = top + (crotch - y0) * sy, step = 1 / sy
  for (let ty = Math.floor(crotchT); ty < Math.min(H, top + h * sy + 1); ty++) {
    const srcY = crotch + (ty + 0.5 - crotchT) / sy - step / 2
    if (srcY > m.bottom) break
    const k = smooth((ty - crotchT) / legLen)
    for (const side of [1, -1] as const) {
      const x0 = side > 0 ? cx : m.left, wd = side > 0 ? m.right + 1 - cx : cx - m.left
      if (wd < 1) continue
      ctx.drawImage(src, x0, clamp(srcY, 0, m.h - step), wd, step, CX + (x0 - cx) * s + side * end[side] * k, ty, wd * s, 1)
    }
  }
  return out
}

const cache = new Map<string, Promise<string | null>>()
/** Bild des Teils an seinem Platz auf der Figur (Bühnengröße 3:4), oder null für Arten ohne feste Zone hier. */
export function fittedUrl(item: Item, sex: Sex | undefined): Promise<string | null> {
  const kind = fitKind(item.category)
  if (!kind) return Promise.resolve(null)
  const key = `${item.id}:${item.category}:${item.image.size}:${sex === 'Weiblich' ? 'w' : 'm'}`
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
      let out: HTMLCanvasElement
      try {
        out = kind === 'bottom' ? placeBottom(src, m, sex) : placeTop(src, m, jacket, sex)
      } catch {
        // Was auch immer bei der Erkennung schiefgeht: Der einfache Weg legt das Teil unverändert in seine Zone
        const top = kind === 'top' ? topBox(jacket, sex) : null, low = bottomBox(sex, (m.bottom - m.top) / (m.right - m.left) >= 1.3)
        const k = top ? Math.min(top.torso / (m.bottom - m.top + 1), (W * 0.98) / (m.right - m.left + 1)) : simpleScale(m, m.top, low)
        const st = stage()
        st.ctx.setTransform(k, 0, 0, k, CX - ((m.left + m.right + 1) / 2) * k, (top ?? low).top - m.top * k)
        st.ctx.drawImage(src, 0, 0)
        out = st.out
      }
      const blob = await new Promise<Blob | null>((res) => out.toBlob(res, 'image/png'))
      return blob ? URL.createObjectURL(blob) : null
    })().catch(() => null)
    cache.set(key, hit)
  }
  return hit
}
