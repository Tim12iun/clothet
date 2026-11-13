import { saveItem } from '../store'
import type { Item } from '../types'
import { uid, type Category } from '../types'
import { toBlob, trim } from './image'

// Schlichte Beispiel-Teile, damit der Schrank beim ersten Öffnen nicht leer ist.
interface Sample {
  name: string
  category: Category
  color: string
  vb: [number, number]
  svg: string
}

const st = (fill: string, stroke: string) => `fill="${fill}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"`
const ln = (stroke: string) => `fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round"`

const SAMPLES: Sample[] = [
  {
    name: 'Weißes T-Shirt', category: 'Oberteile', color: 'Weiß', vb: [200, 200],
    svg: `<path ${st('#f6f6f2', '#c9cdc8')} d="M62 18h22q16 16 32 0h22l50 36-20 32-22-14v110H54V72L32 86 12 54z"/><path ${ln('#c9cdc8')} d="M84 18q16 22 32 0"/>`,
  },
  {
    name: 'Marine Pullover', category: 'Oberteile', color: 'Marine', vb: [200, 200],
    svg: `<path ${st('#22335c', '#162344')} d="M66 18h20q14 12 28 0h20l28 22 28 112-26 8-20-74v96H56V86l-20 74-26-8L38 40z"/><path ${ln('#162344')} d="M56 170h88M86 18q14 18 28 0"/>`,
  },
  {
    name: 'Blaue Jeans', category: 'Hosen', color: 'Blau', vb: [200, 260],
    svg: `<path ${st('#4a74b8', '#33558f')} d="M54 10h92l16 240h-50L100 84 88 250H38z"/><path ${ln('#33558f')} d="M52 30h96M100 30v54M66 30q0 22-16 26M134 30q0 22 16 26"/>`,
  },
  {
    name: 'Beige Chino', category: 'Hosen', color: 'Beige', vb: [200, 260],
    svg: `<path ${st('#d9c8a5', '#b7a480')} d="M56 10h88l14 240h-46L100 84 88 250H42z"/><path ${ln('#b7a480')} d="M54 28h92M100 28v56"/>`,
  },
  {
    name: 'Olive Jacke', category: 'Jacken', color: 'Grün', vb: [200, 210],
    svg: `<path ${st('#5d7350', '#435639')} d="M64 16h72l28 24 28 118-26 8-20-74v104H54V92l-20 74-26-8L36 40z"/><path ${ln('#435639')} d="M100 34v162M64 16l36 18 36-18M70 130h20M110 130h20"/>`,
  },
  {
    name: 'Weiße Sneaker', category: 'Schuhe', color: 'Weiß', vb: [200, 104],
    svg: [0, 96].map((x) => `<g transform="translate(${x})"><path ${st('#f4f4f0', '#c3c8c2')} d="M22 86Q20 42 34 24q18-16 36 0 14 18 12 62z"/><path ${st('#dfe3dd', '#c3c8c2')} d="M18 82h68v8q0 8-9 8H27q-9 0-9-8z"/><path ${ln('#c3c8c2')} d="M30 70q22-16 44 0M43 30h18M41 40h22M40 50h24"/></g>`).join(''),
  },
  {
    name: 'Grünes T-Shirt', category: 'Oberteile', color: 'Grün', vb: [200, 200],
    svg: `<path ${st('#4f8a55', '#3b6b41')} d="M62 18h22q16 16 32 0h22l50 36-20 32-22-14v110H54V72L32 86 12 54z"/><path ${ln('#3b6b41')} d="M84 18q16 22 32 0"/>`,
  },
  {
    name: 'Schwarze Hose', category: 'Hosen', color: 'Schwarz', vb: [200, 260],
    svg: `<path ${st('#262626', '#111111')} d="M56 10h88l12 240h-44L100 84 88 250H44z"/><path ${ln('#111111')} d="M54 28h92M100 28v56"/>`,
  },
  {
    name: 'Braune Stiefel', category: 'Schuhe', color: 'Braun', vb: [200, 150],
    svg: [0, 96].map((x) => `<g transform="translate(${x})"><path ${st('#7a5236', '#5a3b25')} d="M30 8h44v58q16 22 12 66H18q-4-44 12-66z"/><path ${st('#3e2a1c', '#3e2a1c')} d="M16 130h72v10H16z"/><path ${ln('#5a3b25')} d="M30 66h44M30 108q22-14 44 0"/></g>`).join(''),
  },
]

async function rasterize(s: Sample): Promise<Blob> {
  const [w, h] = s.vb
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 3}" height="${h * 3}">${s.svg}</svg>`
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  await img.decode()
  const c = document.createElement('canvas')
  c.width = w * 3
  c.height = h * 3
  c.getContext('2d')!.drawImage(img, 0, 0)
  return toBlob(trim(c))
}

export async function seedSamples() {
  const now = Date.now()
  for (let i = 0; i < SAMPLES.length; i++) {
    const s = SAMPLES[i]
    try {
      const image = await rasterize(s)
      await saveItem({ id: uid(), name: s.name, category: s.category, color: s.color, image, sample: true, createdAt: now - i })
    } catch {
      /* Beispiel überspringen */
    }
  }
}

/** Ersetzt die Bilder der Beispiel-Schuhe durch die Ansicht von vorne (ältere Stände zeigten sie von der Seite). */
export async function refreshSampleShoes(items: Item[]) {
  for (const it of items) {
    const s = it.sample && it.category === 'Schuhe' ? SAMPLES.find((x) => x.name === it.name) : undefined
    if (!s) continue
    try {
      await saveItem({ ...it, image: await rasterize(s) })
    } catch {
      /* altes Bild behalten */
    }
  }
}
