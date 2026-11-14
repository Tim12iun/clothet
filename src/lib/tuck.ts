import { useEffect, useState } from 'react'
import { NO_FIT, type Item, type Sex } from '../types'
import { FIT_ORIGIN, fitKind, fittedUrl } from './fitting'

const W = 600, H = 800
const NECK = 0.19 // bis hierher liegen Kopf und Hals ohnehin vor der Kleidung

const load = async (src: string) => {
  const img = new Image()
  img.src = src
  await img.decode()
  return img
}

/**
 * Die Figur ohne das, was seitlich unter Oberteil oder Jacke hervorschaut: In jeder Zeile, in der das Teil liegt,
 * bleibt vom Körper nur, was zwischen dem linken und rechten Rand des Teils steht. Schulterspitzen neben einem
 * schmaler geschnittenen Teil verschwinden so, Beine und alles unter dem Saum bleiben. Ohne angepasstes Teil: null.
 */
export async function tuck(figure: CanvasImageSource, tops: Item[], wide: number, sex: Sex | undefined, scale = 1.5): Promise<HTMLCanvasElement | null> {
  const g = document.createElement('canvas')
  g.width = W
  g.height = H
  const gc = g.getContext('2d', { willReadFrequently: true })!
  let any = false
  for (const item of tops) {
    const kind = fitKind(item.category), url = kind ? await fittedUrl(item, sex) : null
    if (!kind || !url) continue
    // Dieselbe Feineinstellung wie auf der Bühne (Wear.tsx)
    const f = item.fit ?? NO_FIT, oy = FIT_ORIGIN[kind] * H
    gc.save()
    gc.translate(W / 2, oy + f.dy * H)
    gc.scale(wide * f.scale, f.scale)
    gc.drawImage(await load(url), -W / 2, -oy, W, H)
    gc.restore()
    any = true
  }
  if (!any) return null
  const a = gc.getImageData(0, 0, W, H).data
  const out = document.createElement('canvas')
  out.width = Math.round(W * scale)
  out.height = Math.round(H * scale)
  const oc = out.getContext('2d')!
  oc.drawImage(figure, 0, 0, out.width, out.height)
  for (let y = Math.round(H * NECK); y < H; y++) {
    let l = -1, r = -1
    for (let x = 0; x < W; x++) if (a[(y * W + x) * 4 + 3] > 60) { if (l < 0) l = x; r = x }
    if (l < 0) continue
    // Ein Pixel nach innen, damit am Rand des Teils kein Saum der Figur stehen bleibt
    const y0 = y * scale, x0 = (l + 1) * scale, x1 = r * scale
    oc.clearRect(0, y0, x0, scale)
    oc.clearRect(x1, y0, out.width - x1, scale)
  }
  return out
}

/** Für die Bühne: Adresse der Figur ohne überstehende Schultern, solange Oberteil oder Jacke an sind. Sonst null. */
export function useTucked(avatar: string | null, tops: Item[], wide: number, sex: Sex | undefined): string | null {
  const key = avatar && tops.length ? [avatar.length, avatar.slice(-40), wide, sex, ...tops.map((i) => `${i.id}:${i.category}:${i.image.size}:${i.fit?.dy ?? 0}:${i.fit?.scale ?? 1}`)].join('|') : ''
  const [hit, setHit] = useState<{ key: string; url: string } | null>(null)
  useEffect(() => {
    if (!key || !avatar) return
    let gone = false, made = ''
    ;(async () => {
      const c = await tuck(await load(avatar), tops, wide, sex)
      const blob = c && (await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png')))
      if (gone || !blob) return
      made = URL.createObjectURL(blob)
      setHit({ key, url: made })
    })().catch(() => {})
    return () => { gone = true; if (made) URL.revokeObjectURL(made) }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return hit && hit.key === key ? hit.url : null
}
