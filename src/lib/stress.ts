import { addItems } from '../store'
import { CATEGORIES, COLORS, SEASONS, STYLES, uid, type Item } from '../types'
import { toBlob } from './image'

/**
 * Härtetest-Daten: füllt den Schrank mit n Teilen, darunter sehr lange Namen ohne Leerzeichen.
 * Aufruf über die Adresse: ?stress=1000 (oder 1). Nur zum Prüfen gedacht, die Teile sind als Beispiel markiert.
 */
export async function seedStress(n: number) {
  const names = Object.keys(COLORS)
  const tiles = await Promise.all(names.map(async (c) => {
    const cv = document.createElement('canvas')
    cv.width = 120
    cv.height = 150
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = COLORS[c]
    ctx.beginPath()
    ctx.roundRect(14, 10, 92, 130, 14)
    ctx.fill()
    return toBlob(cv)
  }))
  const now = Date.now()
  const list: Item[] = []
  for (let i = 0; i < n; i++) {
    const color = names[i % names.length]
    const name = i % 7 === 0 ? 'Donaudampfschifffahrtsgesellschaftskapitänsmützenabzeichenhalterung' + i : i % 11 === 0 ? `Sehr langer Name mit vielen Wörtern, einer Marke und einer Größe, Teil Nummer ${i}` : `Teil ${i + 1}`
    list.push({ id: uid(), name, category: CATEGORIES[i % CATEGORIES.length], color, seasons: [SEASONS[i % 4]], styles: [STYLES[i % 4]], image: tiles[i % tiles.length], sample: true, createdAt: now - i })
  }
  await addItems(list)
}
