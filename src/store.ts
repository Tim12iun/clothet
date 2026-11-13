import { useSyncExternalStore } from 'react'
import { createStore, del, entries, set, setMany } from 'idb-keyval'
import { DEFAULT_FITS, type AvatarMode, type Figure, type Fits, type Item, type Outfit } from './types'
import { attach, touch } from './lib/cloud'
import { parseKnowledge, type Knowledge } from './lib/engine'

export interface State {
  ready: boolean
  items: Item[]
  outfits: Outfit[]
  calendar: Record<string, string> // geplant: Datum (JJJJ-MM-TT) -> Outfit-ID
  worn: Record<string, string> // getragen: Datum (JJJJ-MM-TT) -> Outfit-ID
  body: Blob | null // eigenes Avatar-Foto, sonst Standard-Avatar
  figure: Figure | null // gezeichnete Figur aus Selfie und Körperdaten
  avatarMode: AvatarMode // was auf der Bühne steht: Figur oder Ganzkörperfoto
  fits: Fits
  knowledgeText: string
  knowledge: Knowledge
  persistent: boolean // false, wenn der Browser keinen Speicher erlaubt
}

let state: State = { ready: false, items: [], outfits: [], calendar: {}, worn: {}, body: null, figure: null, avatarMode: 'figure', fits: DEFAULT_FITS, knowledgeText: '', knowledge: { rules: [], ignored: 0 }, persistent: true }
const listeners = new Set<() => void>()
const db = (() => {
  try {
    return createStore('clothet', 'data')
  } catch {
    return null
  }
})()

function update(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

async function put(key: string, value: unknown) {
  if (!db || !state.persistent) return
  try {
    await set(key, value, db)
    touch(key)
  } catch {
    update({ persistent: false })
  }
}
async function remove(key: string) {
  if (!db || !state.persistent) return
  try {
    await del(key, db)
    touch(key, true)
  } catch {
    update({ persistent: false })
  }
}

/** Lädt alles aus dem Browser-Speicher. Gibt true zurück, wenn der Schrank noch nie befüllt wurde. */
let attached = false
export async function load(): Promise<boolean> {
  if (db && !attached) { attached = true; attach(db, load) }
  const items: Item[] = []
  const outfits: Outfit[] = []
  let calendar: Record<string, string> = {}
  let worn: Record<string, string> = {}
  let body: Blob | null = null
  let figure: Figure | null = null
  let avatarMode: AvatarMode | null = null
  let seeded = false, fitReset = false
  shoesFront = false
  let persistent = true
  let fits = DEFAULT_FITS
  let knowledgeText = ''
  try {
    if (!db) throw new Error('no db')
    for (const [k, v] of await entries(db)) {
      const key = String(k)
      if (key.startsWith('item:')) {
        // Ältere Einträge an das aktuelle Format anpassen; Beispiel-Teile der ersten Version werden ersetzt
        const it = v as Omit<Item, 'category'> & { category: string }
        if (it.sample && !it.styles) { del(k, db); continue }
        items.push({ ...it, styles: it.styles ?? [], category: (it.category === 'Kleider & Röcke' ? 'Kleider' : it.category) as Item['category'] })
      } else if (key.startsWith('outfit:')) {
        if ((v as Outfit).slots) outfits.push(v as Outfit)
        else del(k, db) // Collage-Outfits der ersten Version gibt es nicht mehr
      }
      else if (key === 'fits') fits = { ...DEFAULT_FITS, ...(v as Fits) }
      else if (key === 'knowledge') knowledgeText = v as string
      else if (key === 'calendar') calendar = v as Record<string, string>
      else if (key === 'worn') worn = v as Record<string, string>
      else if (key === 'body') body = v as Blob
      else if (key === 'figure') figure = v as Figure
      else if (key === 'avatarMode') avatarMode = v as AvatarMode
      else if (key === 'seeded2') seeded = true
      else if (key === 'shoes-front') shoesFront = true
      else if (key === 'fit-reset') fitReset = true
    }
    // Oberteile sitzen seit der Puppe ohne Arme von selbst größer: von Hand gesetzte Werte von davor würden doppelt wirken
    if (!fitReset) {
      for (const it of items) if (it.fit && (it.category === 'Oberteile' || it.category === 'Jacken')) { delete it.fit; set('item:' + it.id, it, db) }
      set('fit-reset', 1, db)
    }
  } catch {
    persistent = false
  }
  items.sort((a, b) => b.createdAt - a.createdAt)
  outfits.sort((a, b) => b.createdAt - a.createdAt)
  update({ ready: true, items, outfits, calendar, worn, body, figure, avatarMode: avatarMode ?? (body ? 'photo' : 'figure'), fits, knowledgeText, knowledge: parseKnowledge(knowledgeText), persistent })
  return !seeded
}

export const markSeeded = () => put('seeded2', true)
/** Ob die Beispiel-Schuhe schon in der Ansicht von vorne vorliegen. */
export let shoesFront = false
export const getState = () => state
export const markShoesFront = () => put('shoes-front', true)

export function saveItem(item: Item) {
  const rest = state.items.filter((i) => i.id !== item.id)
  update({ items: [item, ...rest].sort((a, b) => b.createdAt - a.createdAt) })
  return put('item:' + item.id, item)
}
/** Legt viele Teile in einem Schritt an (Sicherung, Härtetest). */
export async function addItems(list: Item[]) {
  const ids = new Set(list.map((i) => i.id))
  update({ items: [...list, ...state.items.filter((i) => !ids.has(i.id))].sort((a, b) => b.createdAt - a.createdAt) })
  if (!db || !state.persistent) return
  try {
    await setMany(list.map((i) => ['item:' + i.id, i]), db)
    for (const i of list) touch('item:' + i.id)
  } catch {
    update({ persistent: false })
  }
}
export function deleteItem(id: string) {
  update({ items: state.items.filter((i) => i.id !== id) })
  return remove('item:' + id)
}
export function saveOutfit(outfit: Outfit) {
  const rest = state.outfits.filter((o) => o.id !== outfit.id)
  update({ outfits: [outfit, ...rest].sort((a, b) => b.createdAt - a.createdAt) })
  return put('outfit:' + outfit.id, outfit)
}
export function deleteOutfit(id: string) {
  const without = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).filter(([, o]) => o !== id))
  const calendar = without(state.calendar), worn = without(state.worn)
  update({ outfits: state.outfits.filter((o) => o.id !== id), calendar, worn })
  put('calendar', calendar)
  put('worn', worn)
  return remove('outfit:' + id)
}
/** Stellt ein gelöschtes Outfit samt seiner Planer-Einträge wieder her (für "Rückgängig"). */
export function restoreOutfit(outfit: Outfit, calendar: Record<string, string>, worn: Record<string, string>) {
  update({ calendar, worn })
  put('calendar', calendar)
  put('worn', worn)
  return saveOutfit(outfit)
}
export function planOutfit(date: string, outfitId: string | null) {
  const calendar = { ...state.calendar }
  if (outfitId) calendar[date] = outfitId
  else delete calendar[date]
  update({ calendar })
  return put('calendar', calendar)
}
/** Trägt ein, welches Outfit an einem Tag wirklich getragen wurde (null nimmt den Eintrag zurück). */
export function setWorn(date: string, outfitId: string | null) {
  const worn = { ...state.worn }
  if (outfitId) worn[date] = outfitId
  else delete worn[date]
  update({ worn })
  return put('worn', worn)
}

// Sicherung: alles in eine Datei und zurück. Bilder werden als Daten-URL eingebettet.
const toDataUrl = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(b) })
const toBlobFrom = async (url: string) => (await fetch(url)).blob()
export const BACKUP_KIND = 'clothet-sicherung'

export async function exportAll(): Promise<Blob> {
  const s = state
  const data = {
    kind: BACKUP_KIND, version: 1, exportedAt: new Date().toISOString(),
    items: await Promise.all(s.items.map(async (i) => ({ ...i, image: await toDataUrl(i.image), wearImage: i.wearImage ? await toDataUrl(i.wearImage) : undefined }))),
    outfits: await Promise.all(s.outfits.map(async (o) => ({ ...o, preview: await toDataUrl(o.preview) }))),
    calendar: s.calendar, worn: s.worn, fits: s.fits, figure: s.figure, avatarMode: s.avatarMode, knowledgeText: s.knowledgeText,
    body: s.body ? await toDataUrl(s.body) : null,
  }
  return new Blob([JSON.stringify(data)], { type: 'application/json' })
}

/** Ersetzt den gesamten Bestand durch eine Sicherung. Wirft einen Fehler, wenn die Datei keine Clothet-Sicherung ist. */
export async function importAll(file: Blob): Promise<{ items: number; outfits: number; knowledgeText: string }> {
  const data = JSON.parse(await file.text())
  if (data?.kind !== BACKUP_KIND || !Array.isArray(data.items) || !Array.isArray(data.outfits)) throw new Error('format')
  const items: Item[] = await Promise.all(data.items.map(async (i: Record<string, unknown>) => ({ ...i, image: await toBlobFrom(i.image as string), wearImage: i.wearImage ? await toBlobFrom(i.wearImage as string) : undefined }) as Item))
  const outfits: Outfit[] = await Promise.all(data.outfits.map(async (o: Record<string, unknown>) => ({ ...o, preview: await toBlobFrom(o.preview as string) }) as Outfit))
  const body = data.body ? await toBlobFrom(data.body) : null
  for (const i of state.items) await remove('item:' + i.id)
  for (const o of state.outfits) await remove('outfit:' + o.id)
  items.sort((a, b) => b.createdAt - a.createdAt)
  outfits.sort((a, b) => b.createdAt - a.createdAt)
  const patch = {
    items, outfits, body, calendar: data.calendar ?? {}, worn: data.worn ?? {}, fits: { ...DEFAULT_FITS, ...(data.fits ?? {}) },
    figure: (data.figure ?? null) as Figure | null, avatarMode: (data.avatarMode ?? 'figure') as AvatarMode,
    knowledgeText: data.knowledgeText ?? '', knowledge: parseKnowledge(data.knowledgeText ?? ''),
  }
  update(patch)
  for (const i of items) await put('item:' + i.id, i)
  for (const o of outfits) await put('outfit:' + o.id, o)
  await put('calendar', patch.calendar); await put('worn', patch.worn); await put('fits', patch.fits)
  await put('knowledge', patch.knowledgeText); await put('avatarMode', patch.avatarMode)
  if (patch.figure) await put('figure', patch.figure); else await remove('figure')
  if (body) await put('body', body); else await remove('body')
  await put('seeded2', true)
  return { items: items.length, outfits: outfits.length, knowledgeText: patch.knowledgeText }
}

export function setBody(body: Blob | null) {
  update({ body })
  if (body) setAvatarMode('photo')
  return body ? put('body', body) : remove('body')
}
export function setFigure(figure: Figure) {
  update({ figure })
  return put('figure', figure)
}
export function setAvatarMode(avatarMode: AvatarMode) {
  update({ avatarMode })
  return put('avatarMode', avatarMode)
}

export function setFits(fits: Fits) {
  update({ fits })
  return put('fits', fits)
}
export function setKnowledge(text: string) {
  update({ knowledgeText: text, knowledge: parseKnowledge(text) })
  return put('knowledge', text)
}

export function useStore(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

const urls = new WeakMap<Blob, string>()
/** Stabile Objekt-URL für ein gespeichertes Bild. */
export function urlFor(blob: Blob): string {
  let u = urls.get(blob)
  if (!u) {
    u = URL.createObjectURL(blob)
    urls.set(blob, u)
  }
  return u
}
