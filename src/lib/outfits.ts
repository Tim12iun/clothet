import { getState, saveOutfit } from '../store'
import { ZONES, uid, type Outfit, type Slots } from '../types'
import { avatarOf } from './avatar'
import { renderOutfit } from './image'

export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const today = () => iso(new Date())
export const fromIso = (d: string) => new Date(d + 'T12:00')

export const hasParts = (slots: Slots) => ZONES.some((z) => slots[z])
export const findOutfit = (slots: Slots) => getState().outfits.find((o) => ZONES.every((z) => (o.slots[z] ?? null) === (slots[z] ?? null)))

/** Gibt das gespeicherte Outfit zu dieser Kombination zurück und legt es an, falls es noch keins gibt. */
export async function ensureOutfit(slots: Slots): Promise<{ outfit: Outfit; created: boolean }> {
  const known = findOutfit(slots)
  if (known) return { outfit: known, created: false }
  const s = getState()
  const av = avatarOf(s.body, s.figure, s.avatarMode)
  const tile = getComputedStyle(document.documentElement).getPropertyValue('--c-tile').trim() || '#f2f4f1'
  const preview = await renderOutfit(slots, s.items, av.photo ?? av.url, !!av.photo, tile, av.wide, s.figure?.sex)
  const outfit: Outfit = { id: uid(), name: `Outfit ${s.outfits.length + 1}`, slots, preview, createdAt: Date.now() }
  await saveOutfit(outfit)
  return { outfit, created: true }
}
