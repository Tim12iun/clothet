/** Gesicht aus einem Selfie schneiden und den Hautton daraus lesen. Alles lokal, ohne Gesichtserkennung. */
const OUT_W = 240, OUT_H = 330

export function toCanvas(url: string): Promise<HTMLCanvasElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      c.getContext('2d')!.drawImage(img, 0, 0)
      res(c)
    }
    img.onerror = rej
    img.src = url
  })
}

/**
 * Schneidet das Oval aus, das die Kamera als Umriss zeigt (mittig, 80 % des Bildes, Verhältnis 160:220).
 * zoom vergrößert das Gesicht, dx und dy verschieben den Ausschnitt (Anteil der Bildbreite bzw. -höhe).
 */
export function cropFace(src: HTMLCanvasElement, crop: { zoom: number; dx: number; dy: number }): HTMLCanvasElement {
  const s = Math.min((0.8 * src.width) / 200, (0.8 * src.height) / 260)
  const w = (160 * s) / crop.zoom, h = (220 * s) / crop.zoom
  const x = src.width / 2 + crop.dx * src.width - w / 2, y = src.height / 2 + crop.dy * src.height - h / 2
  const c = document.createElement('canvas')
  c.width = OUT_W
  c.height = OUT_H
  const ctx = c.getContext('2d')!
  ctx.beginPath()
  ctx.ellipse(OUT_W / 2, OUT_H / 2, OUT_W / 2, OUT_H / 2, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(src, x, y, w, h, 0, 0, OUT_W, OUT_H)
  return c
}

/** Mittlerer Farbton aus Wangen und Nase des ausgeschnittenen Gesichts. */
export function skinTone(face: HTMLCanvasElement): string {
  const x0 = Math.round(face.width * 0.3), y0 = Math.round(face.height * 0.5)
  const w = Math.round(face.width * 0.4), h = Math.round(face.height * 0.2)
  const d = face.getContext('2d', { willReadFrequently: true })!.getImageData(x0, y0, w, h).data
  const px: number[][] = []
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) px.push([d[i], d[i + 1], d[i + 2]])
  if (!px.length) return '#d9a67e'
  // Median je Kanal, damit Schatten, Bart oder Brille wenig verfälschen
  const mid = (k: number) => px.map((p) => p[k]).sort((a, b) => a - b)[px.length >> 1]
  return '#' + [0, 1, 2].map((k) => mid(k).toString(16).padStart(2, '0')).join('')
}
