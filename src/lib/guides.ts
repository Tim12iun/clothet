import type { Category } from '../types'

/** Umrisslinien für die Kamera: zeigen, wie das Teil ungefähr im Bild liegen soll. */
export interface Guide { vb: string; d: string; hint: string }
export type GuideKey = Category | 'Schuh von vorne'

export const GUIDES: Record<GuideKey, Guide> = {
  Oberteile: { vb: '0 0 200 200', d: 'M62 18h22q16 16 32 0h22l50 36-20 32-22-14v110H54V72L32 86 12 54z', hint: 'Flach hinlegen, Ärmel leicht ausbreiten, von oben fotografieren.' },
  Jacken: { vb: '0 0 200 212', d: 'M64 16h72l28 24 28 118-26 8-20-74v104H54V92l-20 74-26-8L36 40zM100 34v162', hint: 'Geschlossen und flach hinlegen, Ärmel leicht ausbreiten, von oben fotografieren.' },
  Hosen: { vb: '0 0 200 260', d: 'M56 10h88l12 240h-44L100 84 88 250H44z', hint: 'Flach und gerade hinlegen, Beine nebeneinander, von oben fotografieren.' },
  Röcke: { vb: '0 0 200 200', d: 'M62 20h76l42 160H20z', hint: 'Flach hinlegen, Bund oben, von oben fotografieren.' },
  Kleider: { vb: '0 0 200 256', d: 'M72 12h16q12 14 24 0h16l10 62-8 18 38 150H32L70 92l-8-18z', hint: 'Flach hinlegen, Träger oder Ärmel oben, von oben fotografieren.' },
  Schuhe: { vb: '0 0 200 112', d: 'M12 82 20 22q18-6 34 6l44 30q46 4 78 18 12 6 12 24v2q0 8-10 8H22q-10 0-10-8z', hint: 'Einen Schuh von der Seite, die Spitze zeigt nach rechts. Dieses Bild liegt im Schrank.' },
  'Schuh von vorne': { vb: '8 4 88 100', d: 'M18 90Q18 42 34 24q18-16 36 0 16 18 16 66 0 8-9 8H27q-9 0-9-8zM30 70q22-16 44 0', hint: 'Einen Schuh von vorne, die Spitze zeigt zu dir, leicht von oben. Den zweiten ergänzt Clothet gespiegelt.' },
  Accessoires: { vb: '0 0 200 200', d: 'M40 30h120q10 0 10 10v120q0 10-10 10H40q-10 0-10-10V40q0-10 10-10z', hint: 'Mittig auf eine einfarbige Fläche legen, von oben fotografieren.' },
}

/** Umriss für das Selfie: das Gesicht füllt das Oval. Die Maße nutzt auch der Ausschnitt in face.ts. */
export const FACE_GUIDE: Guide = { vb: '0 0 200 260', d: 'M100 20c44 0 80 49 80 110s-36 110-80 110-80-49-80-110S56 20 100 20z', hint: 'Halt das Handy auf Augenhöhe. Dein Gesicht füllt das Oval, vom Kinn bis zum Haaransatz.' }
