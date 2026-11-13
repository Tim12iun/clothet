import type { Fit, Zone } from '../types'

/** Standard-Avatar im Format 3:4, falls kein eigenes Foto hinterlegt ist. */
const MANNEQUIN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="600" height="800">
<g fill="#c9d0ca" stroke="#c9d0ca" stroke-linecap="round">
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
  shoes: { anchor: 'bottom', y: 0.985, w: 0.27 },
}
export const DRAW_ORDER: Zone[] = ['shoes', 'bottom', 'top', 'jacket']

export function placement(zone: Zone, isDress: boolean, fit: Fit) {
  const b = BASE[zone === 'top' && isDress ? 'dress' : zone]
  return { anchor: b.anchor, y: b.y + fit.dy, w: b.w * fit.scale }
}
