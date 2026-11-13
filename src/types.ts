export const CATEGORIES = ['Oberteile', 'Hosen', 'Röcke', 'Kleider', 'Jacken', 'Schuhe', 'Accessoires'] as const
export type Category = (typeof CATEGORIES)[number]

export const SEASONS = ['Frühling', 'Sommer', 'Herbst', 'Winter'] as const
export type Season = (typeof SEASONS)[number]

export const STYLES = ['Lässig', 'Business', 'Sport', 'Elegant'] as const
export type Style = (typeof STYLES)[number]

export const COLORS: Record<string, string> = {
  Schwarz: '#1c1c1c', Weiß: '#f5f5f2', Grau: '#8d9291', Beige: '#d8c7a6', Braun: '#7a5236',
  Rot: '#c8372d', Orange: '#e58a2b', Gelb: '#e8cf4a', Grün: '#4f8a55', Türkis: '#3aa6a0',
  Blau: '#3f6fc4', Marine: '#1f2f55', Lila: '#7d57b0', Rosa: '#e79ab5',
}

export interface Item {
  id: string
  name: string
  category: Category
  color: string // Hauptfarbe
  color2?: string // Nebenfarbe, falls deutlich vorhanden
  seasons: Season[]
  styles: Style[]
  image: Blob // Bild für den Schrank
  wearImage?: Blob // nur Schuhe: ein Schuh von vorne, wird am Avatar für beide Füße verwendet (einmal gespiegelt)
  flat?: boolean // true: liegt flach auf dem Avatar, statt an den Körper angepasst zu werden
  fit?: Fit // Feineinstellung des Sitzes nur für dieses Teil (Höhe und Größe)
  sample?: boolean
  createdAt: number
}

/** Körperzonen auf dem Hauptscreen, von oben nach unten. */
export const ZONES = ['jacket', 'top', 'bottom', 'shoes'] as const
export type Zone = (typeof ZONES)[number]
export const ZONE_LABEL: Record<Zone, string> = { jacket: 'Jacke', top: 'Oberteil', bottom: 'Hose', shoes: 'Schuhe' }
export const ZONE_CATEGORIES: Record<Zone, Category[]> = {
  jacket: ['Jacken'], top: ['Oberteile', 'Kleider'], bottom: ['Hosen', 'Röcke'], shoes: ['Schuhe'],
}

/** Welches Teil je Zone getragen wird (Item-ID oder null). */
export type Slots = Record<Zone, string | null>
export const EMPTY_SLOTS: Slots = { jacket: null, top: null, bottom: null, shoes: null }

/** Feineinstellung, wie ein Teil auf dem Avatar sitzt: Verschiebung in der Höhe (Anteil der Bühne) und Größe. */
export interface Fit { dy: number; scale: number }
export const NO_FIT: Fit = { dy: 0, scale: 1 }
/** Zone, in der ein Teil getragen wird (Accessoires haben keine). */
export const zoneOf = (c: Category): Zone | null => ZONES.find((z) => ZONE_CATEGORIES[z].includes(c)) ?? null
export type Fits = Record<Zone, Fit>
export const DEFAULT_FITS: Fits = {
  jacket: { dy: 0, scale: 1 }, top: { dy: 0, scale: 1 }, bottom: { dy: 0, scale: 1 }, shoes: { dy: 0, scale: 1 },
}

export interface Outfit {
  id: string
  name: string
  slots: Slots
  preview: Blob
  createdAt: number
}

/** Was eine Filter-Auswahl auf dem Hauptscreen bedeutet. */
export type Filter = { season?: Season; style?: Style }

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

/** Gezeichnete Figur aus Selfie und Körperdaten (Alternative zum Ganzkörperfoto). */
export const SEXES = ['Weiblich', 'Männlich'] as const
export type Sex = (typeof SEXES)[number]
export const BUILDS = ['Schmal', 'Mittel', 'Kräftig'] as const
export type Build = (typeof BUILDS)[number]
export interface Figure {
  selfie: string | null // Ausgangsfoto als Daten-URL
  crop: { zoom: number; dx: number; dy: number } // Ausschnitt des Gesichts im Selfie
  face: string | null // ausgeschnittenes Gesicht als Daten-URL
  skin: string // Hautton der Figur
  skinAuto: boolean // Hautton stammt aus dem Selfie
  tone: number // Feinabstimmung: heller (+) oder dunkler (-), als Anteil
  height: number // Körpergröße in cm
  build: Build
  sex?: Sex // Körperform der Figur, fehlt bei älteren Ständen (dann männlich)
}
export const DEFAULT_FIGURE: Figure = { selfie: null, crop: { zoom: 1, dx: 0, dy: 0 }, face: null, skin: '#d9a67e', skinAuto: true, tone: 0, height: 172, build: 'Mittel', sex: 'Männlich' }
export type AvatarMode = 'figure' | 'photo'
