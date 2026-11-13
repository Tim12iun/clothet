import { DEFAULT_FIGURE, type AvatarMode, type Figure, type Fit, type Sex, type Zone } from '../types'

/**
 * Sitz je Zone als Anteil der Bühne (3:4): Teile hängen an einer Kante (oben = Schulter/Bund, unten = Boden),
 * sind waagerecht mittig und w breit. Reihenfolge beim Zeichnen: Schuhe, Hose, Oberteil, Jacke.
 */
const BASE: Record<Zone | 'dress', { anchor: 'top' | 'bottom'; y: number; w: number }> = {
  jacket: { anchor: 'top', y: 0.175, w: 0.62 },
  top: { anchor: 'top', y: 0.18, w: 0.56 },
  dress: { anchor: 'top', y: 0.18, w: 0.5 },
  bottom: { anchor: 'top', y: 0.465, w: 0.3 },
  shoes: { anchor: 'bottom', y: 0.985, w: 0.26 }, // Paar von vorne, je ein Schuh unter einem Bein
}
/** Breite eines einzelnen Schuhs als Anteil der Paarbreite (zwischen den Schuhen bleibt eine Lücke). */
export const PAIR_SHOE = 0.41
export const DRAW_ORDER: Zone[] = ['shoes', 'bottom', 'top', 'jacket']

export function placement(zone: Zone, isDress: boolean, fit: Fit, wide = 1) {
  const b = BASE[zone === 'top' && isDress ? 'dress' : zone]
  return { anchor: b.anchor, y: b.y + fit.dy, w: b.w * fit.scale * wide }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const BUILD_K = { Schmal: 0.9, Mittel: 1, Kräftig: 1.13 }

/** Wie breit die Figur im Verhältnis zur Standardfigur ist. Die Kleidung wird im selben Maß breiter. */
export function figureWide(f: Figure | null): number {
  if (!f) return 1
  // Die Figur füllt die Bühne immer in der Höhe: Wer größer ist, wirkt bei gleicher Statur schmaler.
  return clamp(BUILD_K[f.build] * clamp(172 / f.height, 0.9, 1.12), 0.8, 1.25)
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, '0'))
  return '#' + c.join('')
}

// --- Körpermodell -----------------------------------------------------------------------------
// Die Figur steht frontal im Format 300 x 400. Alle Umrisse sind als Stützpunkte der rechten Körperhälfte
// notiert (Abstand von der Mittelachse, Höhe) und werden zu weichen Kurven verbunden und gespiegelt.
type Pt = [number, number]
const n1 = (v: number) => +v.toFixed(1)

/** Weiche geschlossene Kurve durch alle Punkte (Catmull-Rom als Bézier). */
function smooth(pts: Pt[]): string {
  const n = pts.length
  let d = `M${n1(pts[0][0])} ${n1(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]
    d += `C${n1(p1[0] + (p2[0] - p0[0]) / 6)} ${n1(p1[1] + (p2[1] - p0[1]) / 6)} ${n1(p2[0] - (p3[0] - p1[0]) / 6)} ${n1(p2[1] - (p3[1] - p1[1]) / 6)} ${n1(p2[0])} ${n1(p2[1])}`
  }
  return d + 'z'
}
const side = (pts: Pt[], s: 1 | -1): Pt[] => pts.map(([x, y]) => [150 + s * x, y])
/** Symmetrische Form: rechte Hälfte von oben nach unten, die linke wird gespiegelt ergänzt. */
const mirrored = (half: Pt[]) => smooth([...side(half, 1), ...side(half, -1).reverse()])

interface Shape {
  torso: Pt[]; arm: Pt[]; leg: Pt[]
  wrist: number; hand: number // Mitte und halbe Breite des Handgelenks
  lines: string // Körperlinien der rechten Hälfte (Schlüsselbein, Brust, Knie …), werden gespiegelt
  mid: string // Linien auf der Mittelachse
  wear: string // schlichte Wäsche, wird auf den Körper beschnitten
}
const MALE: Shape = {
  torso: [[9, 60], [9.5, 72], [11, 80], [25, 85], [41, 90], [47, 100], [38.5, 113], [36, 128], [33, 152], [33.5, 172], [36, 192], [36, 206], [20, 210], [0, 208]],
  arm: [[38, 89], [48, 93], [53.5, 104], [55, 120], [57.5, 137], [59.5, 153], [64, 172], [67.5, 193], [59, 194], [55, 176], [50, 156], [46.5, 138], [41, 120], [35, 104]],
  leg: [[20, 186], [36, 190], [37.5, 215], [34.5, 250], [29.5, 279], [31, 304], [26.5, 340], [21.5, 361], [23.5, 371], [28.5, 380], [27, 386.5], [16, 388], [7, 386.5], [6.5, 379], [10.5, 368], [10.5, 359], [8, 335], [7, 308], [8.5, 281], [5, 250], [2, 218], [1.5, 200]],
  wrist: 63.2, hand: 4.1,
  lines: 'M4 90Q18 86.500 33 91M5 119Q20 126 35 115M36 108Q34 112 35 117M14 132Q20 134 27 131M14 146Q19 148 25 145M13 277Q19 284 25.500 277M15 289Q19 292 23 289M18 300Q17 325 18.500 350M52 152Q55.500 155 58.500 152M44 104Q47 110 46 118',
  mid: 'M150 97V121M150 127V161',
  wear: '<path d="M100 177h100v41h-46.500l-3.500-7-3.500 7H100z" fill="#e6e9e5"/><path d="M100 177h100v5.500H100z" fill="#cfd5cf"/><path d="M150 183v28M132 200q4 8 5 18M168 200q-4 8-5 18" stroke="#cfd5cf" stroke-width=".9" fill="none"/>',
}
const FEMALE: Shape = {
  torso: [[8, 60], [8.5, 72], [10, 80], [22, 85], [35.500, 90], [41, 99], [33.500, 112], [32.500, 126], [25.500, 149], [31, 170], [37, 190], [37.500, 206], [20, 210], [0, 208]],
  arm: [[33, 89], [42, 92.500], [46.500, 103], [47.500, 120], [49.500, 137], [51.500, 153], [56, 172], [59.500, 193], [52.500, 194], [48.500, 176], [44, 156], [41, 138], [36, 120], [30.500, 104]],
  leg: [[20, 186], [36.500, 190], [37.500, 215], [33, 250], [28, 279], [29.500, 304], [24.500, 340], [20.500, 361], [22, 371], [26.500, 380], [25.500, 386.500], [15.500, 388], [7.500, 386.500], [7, 379], [10.500, 368], [11, 359], [8.500, 335], [8, 308], [8.500, 281], [4.500, 250], [1.500, 218], [1, 200]],
  wrist: 56, hand: 3.600,
  lines: 'M4 90Q16 86.500 28 91M13 277Q18.500 283.500 24.500 277M15 289Q18.500 291.500 22 289M17.500 300Q16.500 325 18 350M44.500 152Q47.500 155 50.500 152',
  mid: 'M150 96V104M150 138V160',
  wear: '<path d="M150 113q-10-7-15.500-27h-4.500q-2 17-13 24l1 19q16 5 32-1 16 6 32 1l1-19q-11-7-13-24h-4.500q-5.500 20-15.500 27z" fill="#e6e9e5"/><path d="M118 126q16 5 32-1 16 6 32 1l-.300 4.500q-16 4.500-31.700-1-15.700 5.500-31.700 1z" fill="#cfd5cf"/><path d="M106 181h88v14q-24 4-40.500 22h-7q-16.500-18-40.500-22z" fill="#e6e9e5"/><path d="M106 181h88v4.500h-88z" fill="#cfd5cf"/>',
}

/** Hand mit Daumen und vier Fingern, hängt entspannt am Handgelenk. s: 1 rechts, -1 links. */
function hand(sh: Shape, s: 1 | -1, fill: string, edge: string): string {
  const x = (v: number) => n1(150 + s * (sh.wrist + v)), h = sh.hand
  const palm = `M${x(-h)} 191.500L${x(h)} 191.500Q${x(h + 1.700)} 200 ${x(h + 0.900)} 207L${x(-h - 0.200)} 207.500Q${x(-h - 0.900)} 200 ${x(-h)} 191.500z`
  const thumb = `M${x(-h + 0.600)} 197Q${x(-h - 3.300)} 203 ${x(-h - 2.300)} 212`
  const step = (2 * h - 1.400) / 3, len = [14.500, 17, 15.500, 11.500]
  const fingers = len.map((l, i) => `M${x(-h + 0.900 + i * step)} 205.500L${x(-h + 0.900 + i * step + i * 0.350)} ${n1(205.500 + l)}`).join('')
  const w = n1(step * 0.960)
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${fingers}" stroke="${edge}" stroke-width="${n1(+w + 1)}"/><path d="${thumb}" stroke="${edge}" stroke-width="3.900"/>` +
    `<path d="${palm}" fill="${fill}" stroke="${edge}" stroke-width=".7"/><path d="${fingers}" stroke="${fill}" stroke-width="${w}"/><path d="${thumb}" stroke="${fill}" stroke-width="2.900"/>` +
    `<path d="M${x(-h + 1.500)} 206.500L${x(h)} 205.800" stroke="${edge}" stroke-width=".5" opacity=".6"/></g>`
}

/** Wo eine waagerechte Linie in Höhe y einen Umriss schneidet: kleinster und größter Abstand von der Mittelachse. */
function spanAt(pts: Pt[], y: number): [number, number] | null {
  let lo = Infinity, hi = -Infinity
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    if (a[1] === b[1] || (a[1] - y) * (b[1] - y) > 0) continue
    const x = a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1])
    lo = Math.min(lo, x)
    hi = Math.max(hi, x)
  }
  return hi === -Infinity ? null : [lo, hi]
}

/**
 * Körperpunkte, an denen Kleidung ausgerichtet wird (src/lib/fitting.ts). Alle Maße in der Zeichnung 300 x 400,
 * waagerecht als Abstand von der Mittelachse, für die Figur in Normalbreite.
 */
export function bodyTargets(sex: Sex | undefined) {
  const sh = sex === 'Weiblich' ? FEMALE : MALE
  const torso: Pt[] = [...sh.torso, [0, sh.torso[0][1]]]
  const armTop = spanAt(sh.arm, 100)!
  return {
    shoulderHalf: sh.torso[4][0], shoulderY: sh.torso[4][1],
    torsoHalf: (y: number) => spanAt(torso, clamp(y, 91, 205))?.[1] ?? sh.torso[4][0],
    armOuter: spanAt(sh.arm, 104)![1],
    armFrom: [(armTop[0] + armTop[1]) / 2, 100] as Pt, armTo: [sh.wrist, 192] as Pt,
    leg: (y: number) => { const s = spanAt(sh.leg, clamp(y, 196, 360))!; return (s[0] + s[1]) / 2 },
    waistY: 177, crotchY: 209, ankleY: 369,
  }
}

const shapeOf = (f: Figure) => (f.sex === 'Weiblich' ? FEMALE : MALE)
/** Maßstab des Kopfes: größere Menschen haben im Verhältnis einen kleineren Kopf. */
export const headScale = (f: Figure) => clamp(172 / f.height, 0.9, 1.1)
/** Lage des Gesichts-Ovals in der Zeichnung (vor dem Kopf-Maßstab). */
export const FACE_BOX = { x: 130, y: 16, w: 40, h: 55, pivotX: 150, pivotY: 71 }

/**
 * Zeichnet die Figur im Format 3:4 als SVG-Text: Körpermodell im Hautton mit Händen, Füßen und schlichter Wäsche,
 * als Kopf das Gesicht aus dem Selfie. face: false lässt das Gesicht frei (die Einrichtung legt es selbst darüber).
 */
export function figureSvg(f: Figure, opts: { face?: boolean; plain?: boolean } = {}): string {
  const sh = shapeOf(f), k = figureWide(f), head = headScale(f)
  const S = shade(f.skin, 1 + (f.tone ?? 0)), L = shade(S, 1.05), D = shade(S, 0.86), E = shade(S, 0.68)
  const torso = mirrored(sh.torso)
  const limbs = ([1, -1] as const).map((s) => ({ arm: smooth(side(sh.arm, s)), leg: smooth(side(sh.leg, s)), s }))
  const all = `<path d="${torso}"/>` + limbs.map((l) => `<path d="${l.arm}"/><path d="${l.leg}"/>`).join('')
  const toes = [9.500, 13.200, 16.600, 19.800, 22.800].map((x, i) => `M${x} ${n1(383.500 - i * 0.300)}V387`).join('')
  const half = (s: 1 | -1) => `<g transform="translate(150 0) scale(${s} 1)"><path d="${sh.lines}" /><path d="${toes}" opacity=".7"/></g>`
  const showFace = opts.face !== false
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 300 400" width="900" height="1200">
<defs>
<linearGradient id="v"><stop offset="0" stop-color="${D}"/><stop offset=".2" stop-color="${S}"/><stop offset=".55" stop-color="${L}"/><stop offset=".84" stop-color="${S}"/><stop offset="1" stop-color="${D}"/></linearGradient>
<clipPath id="f"><ellipse cx="150" cy="43.500" rx="20" ry="27.500"/></clipPath>
<clipPath id="b"><path d="${torso}"/>${limbs.map((l) => `<path d="${l.leg}"/>`).join('')}</clipPath>
</defs>
<ellipse cx="150" cy="388" rx="${n1(46 * k)}" ry="4" fill="#000" opacity=".07"/>
<g transform="translate(150 0) scale(${k.toFixed(3)} 1) translate(-150 0)">
<g fill="${S}" stroke="${E}" stroke-width="1.400" stroke-linejoin="round">${all}</g>
<g fill="url(#v)"><path d="${torso}"/>${limbs.map((l) => `<path d="${l.leg}"/>`).join('')}${limbs.map((l) => `<path d="${l.arm}"/>`).join('')}</g>
${hand(sh, 1, S, E)}${hand(sh, -1, S, E)}
${opts.plain ? '' : `<g clip-path="url(#b)">${sh.wear}</g>`}
<g fill="none" stroke="${E}" stroke-width=".9" stroke-linecap="round" opacity=".42">${half(1)}${half(-1)}<path d="${sh.mid}"/></g>
<ellipse cx="150" cy="166" rx="1.300" ry="2.200" fill="${E}" opacity=".5"/>
<ellipse cx="150" cy="74" rx="9" ry="5.500" fill="${E}" opacity=".3"/>
</g>
<g transform="translate(150 71) scale(${head.toFixed(3)}) translate(-150 -71)">
${showFace && f.face ? `<image href="${f.face}" xlink:href="${f.face}" x="130" y="16" width="40" height="55" preserveAspectRatio="xMidYMid slice" clip-path="url(#f)"/>` : `<ellipse cx="150" cy="43.500" rx="20" ry="27.500" fill="url(#v)" stroke="${E}" stroke-width=".7"/>`}
</g></svg>`
}
const asUrl = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
export const figureUrl = (f: Figure, opts?: { face?: boolean; plain?: boolean }) => asUrl(figureSvg(f, opts))

/** Neutrale Standardfigur, solange kein Selfie und kein Foto hinterlegt ist. */
const MANNEQUIN: Figure = { ...DEFAULT_FIGURE, skin: '#cdd3ce' }
export const MANNEQUIN_URL = figureUrl(MANNEQUIN, { plain: true })

/** Was auf der Bühne steht: das Ganzkörperfoto, die Figur aus dem Selfie oder die neutrale Standardfigur. */
export function avatarOf(body: Blob | null, figure: Figure | null, mode: AvatarMode): { photo: Blob | null; url: string; wide: number } {
  if (mode === 'photo' && body) return { photo: body, url: '', wide: 1 }
  return figure ? { photo: null, url: figureUrl(figure), wide: figureWide(figure) } : { photo: null, url: MANNEQUIN_URL, wide: 1 }
}
