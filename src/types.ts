export const CATEGORIES = ['Oberteile', 'Hosen', 'Kleider & Röcke', 'Jacken', 'Schuhe', 'Accessoires'] as const
export type Category = (typeof CATEGORIES)[number]

export const SEASONS = ['Frühling', 'Sommer', 'Herbst', 'Winter'] as const
export type Season = (typeof SEASONS)[number]

export const COLORS: Record<string, string> = {
  Schwarz: '#1c1c1c', Weiß: '#f5f5f2', Grau: '#8d9291', Beige: '#d8c7a6', Braun: '#7a5236',
  Rot: '#c8372d', Orange: '#e58a2b', Gelb: '#e8cf4a', Grün: '#4f8a55', Türkis: '#3aa6a0',
  Blau: '#3f6fc4', Marine: '#1f2f55', Lila: '#7d57b0', Rosa: '#e79ab5',
}

export interface Item {
  id: string
  name: string
  category: Category
  color: string
  seasons: Season[]
  image: Blob
  sample?: boolean
  createdAt: number
}

/** x, y: Mittelpunkt als Anteil der Bühne (0..1). w: Breite als Anteil der Bühnenbreite. */
export interface Layer {
  key: string
  itemId: string
  x: number
  y: number
  w: number
  rot: number
}

export type OutfitMode = 'collage' | 'body'

export interface Outfit {
  id: string
  name: string
  mode: OutfitMode
  layers: Layer[]
  preview: Blob
  createdAt: number
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
