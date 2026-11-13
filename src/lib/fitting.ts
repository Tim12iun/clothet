import type { Category, Item, Sex } from '../types'
import { bodyTargets } from './avatar'

/**
 * Passform ohne KI: Aus dem freigestellten Umriss eines Teils werden Ankerpunkte gelesen (Schulternaht, Achsel,
 * Ärmelende, Saum bzw. Bund, Schritt, Beinenden). Damit wird das Bild auf die Körperpunkte der Figur gezogen:
 * Der Rumpf folgt zeilenweise der Körperlinie, Ärmel werden um die Schulter entlang der Arme gedreht, jedes Hosenbein
 * folgt einem Bein. Es wird nur verschoben, gedreht und leicht gestreckt, Farbe und Muster bleiben, wie sie sind.
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

function shade(ctx: CanvasRenderingContext2D, half: number, strength: number) {
  // Leichter Schatten zu den Rändern hin, nur auf dem Stoff: lässt das Teil rund um den Körper wirken
  const g = ctx.createLinearGradient(CX - half, 0, CX + half, 0)
  g.addColorStop(0, `rgba(0,0,0,${strength})`)
  g.addColorStop(0.2, 'rgba(0,0,0,0)')
  g.addColorStop(0.8, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${strength})`)
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.globalCompositeOperation = 'source-over'
}

function warpTop(src: HTMLCanvasElement, m: Mask, sex: Sex | undefined, jacket: boolean): HTMLCanvasElement | null {
  const t = bodyTargets(sex), sh = readTop(m)
  if (!sh) return null
  const ease = jacket ? 5 : 3
  const s = ((t.shoulderHalf + ease) * U) / sh.bh
  const seamT = (t.shoulderY - 1.5) * U
  const yT = (y: number) => seamT + (y - sh.seamY) * s
  const natural = sh.bh * s
  /** Halbe Breite des Rumpfs in Zielhöhe: folgt der Körperlinie, bleibt aber nah an der eigenen Breite des Teils. */
  const half = (ty: number) => {
    const yu = ty / U
    if (yu <= t.shoulderY + 4) return natural
    const k = clamp((yu - t.shoulderY - 4) / 14, 0, 1)
    return natural + k * (clamp(t.torsoHalf(yu) * U + ease * 1.4 * U, natural * 0.9, natural * 1.06) - natural)
  }
  const out = document.createElement('canvas')
  out.width = W
  out.height = H
  const ctx = out.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'

  // Ärmel zuerst, der Rumpf liegt danach darüber und deckt die Naht
  for (const side of [1, -1] as const) {
    const sl = sh.sleeves[side]
    if (!sl) continue
    const part = document.createElement('canvas')
    part.width = m.w
    part.height = m.h
    const pc = part.getContext('2d')!
    pc.drawImage(src, 0, 0)
    // Nur der Ärmel: alles innerhalb der Rumpfkante weg, unter der Achsel auch den Rumpf selbst
    // Etwas Stoff vom Rumpf bleibt am Ärmel: Er füllt nach dem Drehen die Schulter und verschwindet sonst unter dem Rumpf
    const edge = sh.cx + side * sh.bh * 0.5
    if (side > 0) pc.clearRect(0, 0, edge, m.h)
    else pc.clearRect(edge, 0, m.w - edge, m.h)
    for (let y = sl.armpit; y <= sh.hem; y++) {
      const r = centerRun(m, y, sh.cx)
      if (r) pc.clearRect(r[0] - 1, y, r[1] - r[0] + 3, 1)
    }
    const from = [CX + side * t.armFrom[0] * U, t.armFrom[1] * U], to = [CX + side * t.armTo[0] * U, t.armTo[1] * U]
    const aT = Math.atan2(to[1] - from[1], to[0] - from[0]), aS = Math.atan2(sl.ey - sl.ay, sl.ex - sl.ax)
    // Die Ärmelachse liegt auf der Armachse, der obere Nahtpunkt auf Schulterhöhe
    const turn = aT - aS, d = (sl.ay - sl.top) * s
    const ty = yT(sl.top) + 2 * U + d * Math.cos(turn)
    const tx = from[0] + ((ty - from[1]) * (to[0] - from[0])) / (to[1] - from[1])
    const len = Math.hypot(sl.ex - sl.ax, sl.ey - sl.ay) * s, reach = Math.hypot(to[0] - tx, to[1] - ty)
    // Lange Ärmel enden am Handgelenk, damit die Hand frei bleibt; kurze behalten ihre Länge
    const kLen = len > reach * 0.72 ? clamp((reach * 0.97) / len, 0.75, 1.3) : 1
    ctx.save()
    // Schulterlinie: Über der abfallenden Schulter bleibt nichts stehen, sonst wirkt sie gepolstert
    const y0 = yT(sl.top) - U, x0 = CX + side * natural * 0.8
    ctx.beginPath()
    ctx.moveTo(CX, y0)
    ctx.lineTo(x0, y0)
    ctx.lineTo(x0 + side * W, y0 + W * 0.2)
    ctx.lineTo(x0 + side * W, H)
    ctx.lineTo(CX, H)
    ctx.closePath()
    ctx.clip()
    ctx.translate(tx, ty)
    ctx.rotate(aT)
    ctx.scale(s * kLen, s)
    ctx.rotate(-aS)
    ctx.translate(-sl.ax, -sl.ay)
    ctx.drawImage(part, 0, 0)
    ctx.restore()
  }
  // Ärmel liegen seitlich im Schatten des Rumpfs
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = 'rgba(0,0,0,0.07)'
  ctx.fillRect(0, 0, W, H)
  ctx.globalCompositeOperation = 'source-over'

  // Rumpf zeilenweise: gleiche Höhe im Teil, Breite an die Körperlinie angenähert
  const body = document.createElement('canvas')
  body.width = W
  body.height = H
  const bc = body.getContext('2d')!
  bc.imageSmoothingQuality = 'high'
  const armpit = Math.min(sh.sleeves[1]?.armpit ?? m.top, sh.sleeves[-1]?.armpit ?? m.top)
  let widest = natural
  for (let ty = Math.max(0, Math.floor(yT(m.top))); ty < Math.min(H, yT(sh.hem) + 1); ty++) {
    const sy = sh.seamY + (ty - seamT) / s
    if (sy < m.top || sy > sh.hem) continue
    const h = half(ty), k = h / sh.bh
    // Unter den Ärmeln zählt die echte Kante des Rumpfs, darüber die Rumpfbreite (der Rest gehört zum Ärmel)
    const r = sy > armpit || (!sh.sleeves[1] && !sh.sleeves[-1]) ? centerRun(m, Math.round(sy), sh.cx) : null
    const l = r && !sh.sleeves[-1] ? r[0] : Math.max(r?.[0] ?? 0, sh.cx - sh.bh), rr = r && !sh.sleeves[1] ? r[1] + 1 : Math.min((r?.[1] ?? m.w) + 1, sh.cx + sh.bh)
    if (rr <= l) continue
    bc.drawImage(src, l, sy, rr - l, Math.max(1, 1 / s), CX + (l - sh.cx) * k, ty, (rr - l) * k, 1.4)
    widest = Math.max(widest, (sh.cx - l) * k, (rr - sh.cx) * k)
  }
  shade(bc, widest, 0.13)
  ctx.drawImage(body, 0, 0)
  return out
}

function warpBottom(src: HTMLCanvasElement, m: Mask, sex: Sex | undefined): HTMLCanvasElement | null {
  const t = bodyTargets(sex), hgt = m.bottom - m.top
  const rows: [number, number][] = []
  for (let y = Math.round(m.top + hgt * 0.02); y <= m.top + hgt * 0.07; y++) { const r = centerRun(m, y, (m.left + m.right) / 2); if (r) rows.push(r) }
  if (rows.length < 2) return null
  const cx = median(rows.map((r) => (r[0] + r[1]) / 2)), wh = median(rows.map((r) => (r[1] - r[0]) / 2))
  // Schritt: die erste Zeile, ab der die Mitte frei bleibt (Lücke zwischen den Beinen)
  let crotch = -1
  for (let y = Math.round(m.top + hgt * 0.12); y < m.bottom - hgt * 0.1; y++) {
    if (m.on(cx, y)) continue
    let free = true
    for (let k = y; k < Math.min(m.bottom, y + hgt * 0.5) && free; k += 3) free = !m.on(cx, k)
    if (free) { crotch = y; break }
  }
  if (wh < 10 || crotch < 0) return null
  const s = ((t.torsoHalf(t.waistY) + 2.5) * U) / wh
  const waistT = t.waistY * U
  const kRise = clamp(((t.crotchY + 3 - t.waistY) * U) / ((crotch - m.top) * s), 0.8, 1.25)
  const crotchT = waistT + (crotch - m.top) * s * kRise
  const legLen = m.bottom - crotch, ankleT = t.ankleY * U
  // Lange Hosen enden am Knöchel, kurze behalten ihre Länge
  const kLeg = crotchT + legLen * s > ankleT * 0.9 ? clamp((ankleT - crotchT) / (legLen * s), 0.8, 1.25) : 1
  const out = document.createElement('canvas')
  out.width = W
  out.height = H
  const ctx = out.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  let widest = wh * s
  for (let ty = Math.floor(waistT); ty < Math.min(H, crotchT + legLen * s * kLeg + 1); ty++) {
    const upper = ty <= crotchT
    const sy = upper ? m.top + (ty - waistT) / (s * kRise) : crotch + (ty - crotchT) / (s * kLeg)
    const y = Math.round(sy), sh = Math.max(1, 1 / (s * (upper ? kRise : kLeg)))
    if (y > m.bottom) break
    if (upper) {
      const r = centerRun(m, y, cx)
      if (!r) continue
      const nat = ((r[1] - r[0]) / 2) * s, h = clamp(t.torsoHalf(ty / U) * U + 2.5 * U, nat * 0.92, nat * 1.08), k = h / ((r[1] - r[0]) / 2)
      const c = CX + ((r[0] + r[1]) / 2 - cx) * s
      ctx.drawImage(src, r[0], sy, r[1] - r[0] + 1, sh, c - h, ty, 2 * h, 1.4)
      widest = Math.max(widest, h)
      continue
    }
    const blend = clamp((sy - crotch) / (legLen * 0.3), 0, 1), b = blend * blend * (3 - 2 * blend)
    for (const side of [1, -1] as const) {
      let a = Math.round(cx), e: number
      // Bein dieser Seite: vom ersten bis zum letzten Stoffpunkt neben der Mitte
      const lim = side > 0 ? m.right : m.left
      while (a !== lim && !m.on(a, y)) a += side
      if (!m.on(a, y)) continue
      e = lim
      while (e !== a && !m.on(e, y)) e -= side
      const l = Math.min(a, e), w = Math.abs(e - a) + 1
      const nat = ((l + w / 2) - cx) * s, c = CX + nat * (1 - b) + side * t.leg(ty / U) * U * b
      ctx.drawImage(src, l, sy, w, sh, c - (w * s) / 2, ty, w * s, 1.4)
      widest = Math.max(widest, Math.abs(c - CX) + (w * s) / 2)
    }
  }
  shade(ctx, widest, 0.1)
  return out
}

const cache = new Map<string, Promise<string | null>>()
/** Bild des Teils, an die Figur angepasst (Bühnengröße 3:4), oder null, wenn das Teil flach aufgelegt wird. */
export function fittedUrl(item: Item, sex: Sex | undefined): Promise<string | null> {
  const kind = fitKind(item.category)
  if (!kind || item.flat) return Promise.resolve(null)
  const key = `${item.id}:${item.image.size}:${sex === 'Weiblich' ? 'w' : 'm'}`
  let hit = cache.get(key)
  if (!hit) {
    hit = (async () => {
      const bmp = await createImageBitmap(item.image)
      const src = document.createElement('canvas')
      src.width = bmp.width
      src.height = bmp.height
      src.getContext('2d', { willReadFrequently: true })!.drawImage(bmp, 0, 0)
      bmp.close?.()
      const m = maskOf(src)
      const out = m && (kind === 'top' ? warpTop(src, m, sex, item.category === 'Jacken') : warpBottom(src, m, sex))
      if (!out) return null
      const blob = await new Promise<Blob | null>((res) => out.toBlob(res, 'image/png'))
      return blob ? URL.createObjectURL(blob) : null
    })().catch(() => null)
    cache.set(key, hit)
  }
  return hit
}
