import { useSyncExternalStore } from 'react'
import { createStore, del, entries, set } from 'idb-keyval'
import { DEFAULT_FITS, type Fits, type Item, type Outfit } from './types'
import { parseKnowledge, type Knowledge } from './lib/engine'

export interface State {
  ready: boolean
  items: Item[]
  outfits: Outfit[]
  calendar: Record<string, string> // Datum (JJJJ-MM-TT) -> Outfit-ID
  body: Blob | null // eigenes Avatar-Foto, sonst Standard-Avatar
  fits: Fits
  knowledgeText: string
  knowledge: Knowledge
  persistent: boolean // false, wenn der Browser keinen Speicher erlaubt
}

let state: State = { ready: false, items: [], outfits: [], calendar: {}, body: null, fits: DEFAULT_FITS, knowledgeText: '', knowledge: { rules: [], ignored: 0 }, persistent: true }
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
  } catch {
    update({ persistent: false })
  }
}
async function remove(key: string) {
  if (!db || !state.persistent) return
  try {
    await del(key, db)
  } catch {
    update({ persistent: false })
  }
}

/** Lädt alles aus dem Browser-Speicher. Gibt true zurück, wenn der Schrank noch nie befüllt wurde. */
export async function load(): Promise<boolean> {
  const items: Item[] = []
  const outfits: Outfit[] = []
  let calendar: Record<string, string> = {}
  let body: Blob | null = null
  let seeded = false
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
      else if (key === 'body') body = v as Blob
      else if (key === 'seeded2') seeded = true
    }
  } catch {
    persistent = false
  }
  items.sort((a, b) => b.createdAt - a.createdAt)
  outfits.sort((a, b) => b.createdAt - a.createdAt)
  update({ ready: true, items, outfits, calendar, body, fits, knowledgeText, knowledge: parseKnowledge(knowledgeText), persistent })
  return !seeded
}

export const markSeeded = () => put('seeded2', true)

export function saveItem(item: Item) {
  const rest = state.items.filter((i) => i.id !== item.id)
  update({ items: [item, ...rest].sort((a, b) => b.createdAt - a.createdAt) })
  return put('item:' + item.id, item)
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
  const calendar = Object.fromEntries(Object.entries(state.calendar).filter(([, o]) => o !== id))
  update({ outfits: state.outfits.filter((o) => o.id !== id), calendar })
  put('calendar', calendar)
  return remove('outfit:' + id)
}
export function planOutfit(date: string, outfitId: string | null) {
  const calendar = { ...state.calendar }
  if (outfitId) calendar[date] = outfitId
  else delete calendar[date]
  update({ calendar })
  return put('calendar', calendar)
}
export function setBody(body: Blob | null) {
  update({ body })
  return body ? put('body', body) : remove('body')
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
