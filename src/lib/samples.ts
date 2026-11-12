import { saveItem } from '../store'
import { uid, type Category, type Season } from '../types'
import { toBlob } from './image'

// Schlichte Beispiel-Teile, damit der Schrank beim ersten Öffnen nicht leer ist.
interface Sample {
  name: string
  category: Category
  color: string
  seasons: Season[]
  vb: [number, number]
  svg: string
}

const st = (fill: string, stroke: string) => `fill="${fill}" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"`
const ln = (stroke: string) => `fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round"`

const SAMPLES: Sample[] = [
  {
    name: 'Weißes T-Shirt', category: 'Oberteile', color: 'Weiß', seasons: ['Frühling', 'Sommer'], vb: [200, 200],
    svg: `<path ${st('#f6f6f2', '#c9cdc8')} d="M62 18h22q16 16 32 0h22l50 36-20 32-22-14v110H54V72L32 86 12 54z"/><path ${ln('#c9cdc8')} d="M84 18q16 22 32 0"/>`,
  },
  {
    name: 'Marine Pullover', category: 'Oberteile', color: 'Marine', seasons: ['Herbst', 'Winter'], vb: [200, 200],
    svg: `<path ${st('#22335c', '#162344')} d="M66 18h20q14 12 28 0h20l28 22 28 112-26 8-20-74v96H56V86l-20 74-26-8L38 40z"/><path ${ln('#162344')} d="M56 170h88M86 18q14 18 28 0"/>`,
  },
  {
    name: 'Blaue Jeans', category: 'Hosen', color: 'Blau', seasons: ['Frühling', 'Sommer', 'Herbst', 'Winter'], vb: [200, 260],
    svg: `<path ${st('#4a74b8', '#33558f')} d="M54 10h92l16 240h-50L100 84 88 250H38z"/><path ${ln('#33558f')} d="M52 30h96M100 30v54M66 30q0 22-16 26M134 30q0 22 16 26"/>`,
  },
  {
    name: 'Beige Chino', category: 'Hosen', color: 'Beige', seasons: ['Frühling', 'Sommer', 'Herbst'], vb: [200, 260],
    svg: `<path ${st('#d9c8a5', '#b7a480')} d="M56 10h88l14 240h-46L100 84 88 250H42z"/><path ${ln('#b7a480')} d="M54 28h92M100 28v56"/>`,
  },
  {
    name: 'Olive Jacke', category: 'Jacken', color: 'Grün', seasons: ['Frühling', 'Herbst'], vb: [200, 210],
    svg: `<path ${st('#5d7350', '#435639')} d="M64 16h72l28 24 28 118-26 8-20-74v104H54V92l-20 74-26-8L36 40z"/><path ${ln('#435639')} d="M100 34v162M64 16l36 18 36-18M70 130h20M110 130h20"/>`,
  },
  {
    name: 'Weiße Sneaker', category: 'Schuhe', color: 'Weiß', seasons: ['Frühling', 'Sommer', 'Herbst'], vb: [200, 110],
    svg: `<path ${st('#f4f4f0', '#c3c8c2')} d="M14 78 20 22q18-6 34 6l44 30q46 4 78 18 10 6 8 20H14z"/><path ${st('#dfe3dd', '#c3c8c2')} d="M12 82h178v10q0 8-10 8H22q-10 0-10-8z"/><path ${ln('#c3c8c2')} d="M60 36l-8 12M74 44l-8 12M88 52l-8 12"/>`,
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
  return toBlob(c)
}

export async function seedSamples() {
  const now = Date.now()
  for (let i = 0; i < SAMPLES.length; i++) {
    const s = SAMPLES[i]
    try {
      const image = await rasterize(s)
      await saveItem({ id: uid(), name: s.name, category: s.category, color: s.color, seasons: s.seasons, image, sample: true, createdAt: now - i })
    } catch {
      /* Beispiel überspringen */
    }
  }
}
