import type { AvatarMode, Figure, Fit, Zone } from '../types'

/** Standard-Avatar im Format 3:4, falls kein eigenes Foto hinterlegt ist. */
const MANNEQUIN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="600" height="800">
<g fill="#cdc6ba" stroke="#cdc6ba" stroke-linecap="round">
<circle cx="150" cy="44" r="24" stroke="none"/>
<rect x="141" y="62" width="18" height="24" stroke="none"/>
<path d="M118 92 86 204M182 92l32 112" stroke-width="18" fill="none"/>
<path d="M120 80h60q10 0 10 10v102q0 8-8 8h-64q-8 0-8-8V90q0-10 10-10z" stroke="none"/>
<rect x="114" y="186" width="33" height="190" rx="13" stroke="none"/>
<rect x="153" y="186" width="33" height="190" rx="13" stroke="none"/>
<ellipse cx="129" cy="381" rx="18" ry="8" stroke="none"/>
<ellipse cx="171" cy="381" rx="18" ry="8" stroke="none"/>
</g></svg>`
export const MANNEQUIN_URL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(MANNEQUIN)

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

/** Zeichnet die Figur im Format 3:4: Körper im Hautton mit schlichter Wäsche, als Kopf das Gesicht aus dem Selfie. */
export function figureUrl(f: Figure): string {
  const k = figureWide(f), S = shade(f.skin, 1 + (f.tone ?? 0)), D = shade(S, 0.86)
  const head = clamp(172 / f.height, 0.9, 1.1) // größere Menschen haben im Verhältnis einen kleineren Kopf
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 300 400" width="600" height="800">
<defs><clipPath id="f"><ellipse cx="150" cy="43.5" rx="20" ry="27.5"/></clipPath></defs>
<g transform="translate(150 0) scale(${k.toFixed(3)} 1) translate(-150 0)">
<path d="M118 94 90 198M182 94l28 104" stroke="${S}" stroke-width="17" stroke-linecap="round" fill="none"/>
<g fill="${S}"><circle cx="88.500" cy="206" r="9.500"/><circle cx="211.500" cy="206" r="9.500"/>
<path d="M120 80h60q10 0 10 10v102q0 8-8 8h-64q-8 0-8-8V90q0-10 10-10z"/>
<path d="M114 190h33v176q0 10-10 10h-13q-10 0-10-10zM153 190h33v176q0 10-10 10h-13q-10 0-10-10z"/>
<ellipse cx="130.500" cy="381" rx="15" ry="8.500"/><ellipse cx="169.500" cy="381" rx="15" ry="8.500"/></g>
<path d="M150 190v176" stroke="${D}" stroke-width="2" opacity=".5"/>
<path d="M126 84q7 9 14 5h20q7 4 14-5 14 1 14 12v96h-76V96q0-11 14-12z" fill="#eceeeb"/>
<path d="M112 186h76v54h-35l-3-32-3 32h-35z" fill="#dfe2de"/>
</g>
<rect x="141" y="58" width="18" height="30" rx="6" fill="${S}"/><ellipse cx="150" cy="71" rx="9" ry="5" fill="${D}"/>
<g transform="translate(150 71) scale(${head.toFixed(3)}) translate(-150 -71)">
${f.face ? `<image href="${f.face}" xlink:href="${f.face}" x="130" y="16" width="40" height="55" preserveAspectRatio="xMidYMid slice" clip-path="url(#f)"/>` : `<ellipse cx="150" cy="43.500" rx="20" ry="27.500" fill="${S}"/>`}
</g></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

/** Was auf der Bühne steht: das Ganzkörperfoto, die Figur aus dem Selfie oder die neutrale Standardfigur. */
export function avatarOf(body: Blob | null, figure: Figure | null, mode: AvatarMode): { photo: Blob | null; url: string; wide: number } {
  if (mode === 'photo' && body) return { photo: body, url: '', wide: 1 }
  return figure ? { photo: null, url: figureUrl(figure), wide: figureWide(figure) } : { photo: null, url: MANNEQUIN_URL, wide: 1 }
}
