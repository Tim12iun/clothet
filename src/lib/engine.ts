import { COLORS, SEASONS, ZONES, type Item, type Slots, type Zone } from '../types'

/*
 * Outfit-Engine: bewertet, wie gut Teile zusammenpassen, und würfelt stimmige Outfits.
 * Grundlage sind die Tags der Teile (Farben, Jahreszeit, Stil) plus das hochgeladene Stil-Wissen.
 */

const NEUTRAL = new Set(['Schwarz', 'Weiß', 'Grau', 'Beige', 'Marine', 'Braun'])
const HUE: Record<string, number> = { Rot: 0, Orange: 30, Gelb: 55, Grün: 120, Türkis: 175, Blau: 220, Lila: 275, Rosa: 335 }

// ---------- Stil-Wissen ----------

export interface Rule {
  a: string
  b: string // Farbname oder '*' für "passt zu allem"
  weight: number // > 0 passt, < 0 vermeiden
  source: string
}
export interface Knowledge { rules: Rule[]; ignored: number }

const SYNONYMS: [RegExp, string][] = [
  [/schwarz|black/, 'Schwarz'], [/wei(ß|ss)|white|creme?wei/, 'Weiß'], [/grau|gr[ae]y|anthrazit/, 'Grau'],
  [/beige|creme|sand|camel|khaki|ecru/, 'Beige'], [/braun|brown|cognac|schoko/, 'Braun'],
  [/marine|navy|dunkelblau/, 'Marine'], [/t(ü|ue)rkis|turquoise|petrol|mint/, 'Türkis'],
  [/bordeaux|weinrot|rot|red/, 'Rot'], [/orange|rost|terrakotta/, 'Orange'], [/gelb|yellow|senf/, 'Gelb'],
  [/gr(ü|ue)n|green|oliv/, 'Grün'], [/blau|blue|jeans|denim/, 'Blau'],
  [/lila|violett|purple|flieder|lavendel/, 'Lila'], [/rosa|pink|ros[ée]/, 'Rosa'],
]
const NEGATIVE = /\b(nicht|nie|niemals|kein|keine|vermeide\w*|meide\w*|bei(ß|ss)\w*|schlecht|unpassend|avoid|never|don'?t|clash\w*)\b/
const EVERYTHING = /\b(allem|alles|jeder farbe|allen farben|everything|anything)\b/

function colorsIn(text: string): string[] {
  const found: { name: string; at: number }[] = []
  let rest = text
  for (const [re, name] of SYNONYMS) {
    const g = new RegExp(re.source, 'g')
    let m: RegExpExecArray | null
    while ((m = g.exec(rest))) {
      found.push({ name, at: m.index })
      // gefundene Stelle ausblenden, damit z. B. "dunkelblau" nicht zusätzlich als "blau" zählt
      rest = rest.slice(0, m.index) + ' '.repeat(m[0].length) + rest.slice(m.index + m[0].length)
    }
  }
  return [...new Set(found.sort((x, y) => x.at - y.at).map((f) => f.name))]
}

/** Liest Farbregeln aus frei geschriebenem Text, eine Regel pro Zeile oder Satz. */
export function parseKnowledge(text: string): Knowledge {
  const rules: Rule[] = []
  let ignored = 0
  for (const raw of text.split(/[\n.;!]+/)) {
    const source = raw.replace(/^[\s\-*•\d)]+/, '').trim()
    if (source.length < 4) continue
    const line = source.toLowerCase()
    const cols = colorsIn(line)
    const weight = NEGATIVE.test(line) ? -3 : 2
    if (cols.length >= 2) {
      for (let i = 0; i < cols.length; i++) for (let j = i + 1; j < cols.length; j++) rules.push({ a: cols[i], b: cols[j], weight, source })
    } else if (cols.length === 1 && EVERYTHING.test(line)) {
      rules.push({ a: cols[0], b: '*', weight: weight > 0 ? 1.5 : -2, source })
    } else ignored++
  }
  return { rules, ignored }
}

// ---------- Bewertung ----------

function pairScore(a: string, b: string, k: Knowledge): { score: number; learned: boolean } {
  const exact = k.rules.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a))
  if (exact) return { score: exact.weight, learned: true }
  const wild = k.rules.find((r) => r.b === '*' && (r.a === a || r.a === b))
  if (wild) return { score: wild.weight, learned: true }
  if (a === b) return { score: NEUTRAL.has(a) ? 0.6 : 1, learned: false } // Ton in Ton
  if (NEUTRAL.has(a) || NEUTRAL.has(b)) return { score: 1, learned: false }
  const d = Math.abs(HUE[a] - HUE[b])
  const diff = Math.min(d, 360 - d)
  if (diff <= 45) return { score: 0.8, learned: false } // benachbarte Farben
  if (diff >= 150) return { score: 0.2, learned: false } // Komplementärfarben: geht, ist aber kräftig
  return { score: -1, learned: false }
}

export interface Verdict { score: number; level: 'good' | 'ok' | 'bold'; label: string; reason: string }

export function judge(items: Item[], k: Knowledge): Verdict | null {
  if (items.length < 2) return null
  let sum = 0, n = 0
  let best = { s: -Infinity, text: '' }, worst = { s: Infinity, text: '' }
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i].color, b = items[j].color
      const { score, learned } = pairScore(a, b, k)
      sum += score
      n++
      const note = learned ? ' (aus deinem Stil-Wissen)' : ''
      if (score > best.s) best = { s: score, text: (a === b ? `Ton in Ton in ${a}` : `${a} und ${b} passen gut`) + note }
      if (score < worst.s) worst = { s: score, text: `${a} und ${b} beißen sich` + note }
    }
  }
  let score = sum / n
  const loud = new Set(items.map((i) => i.color).filter((c) => !NEUTRAL.has(c)))
  let reason = ''
  if (loud.size > 2) {
    score -= 1.2
    reason = `${loud.size} kräftige Farben auf einmal`
  }
  const season = SEASONS.filter((s) => items.every((i) => i.seasons.length === 0 || i.seasons.includes(s)))
  if (season.length === 0) {
    score -= 0.8
    reason ||= 'Die Teile sind für verschiedene Jahreszeiten'
  }
  const tagged = items.filter((i) => i.styles.length)
  if (tagged.length > 1) {
    const common = tagged[0].styles.filter((s) => tagged.every((i) => i.styles.includes(s)))
    if (common.length) score += 0.3
    else {
      score -= 0.4
      reason ||= 'Die Stile mischen sich'
    }
  }
  if (!reason) reason = worst.s < 0 ? worst.text : best.text
  const level = score >= 0.7 ? 'good' : score >= 0 ? 'ok' : 'bold'
  return { score, level, label: { good: 'Stimmig', ok: 'Passt', bold: 'Gewagt' }[level], reason }
}

// ---------- Zufalls-Outfit ----------

export interface RandomPrefs { mainColor: string | null; keep: Zone[] }
export type Pools = Record<Zone, Item[]>

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

/**
 * Würfelt ein Outfit aus den (gefilterten) Teilen. Es werden viele Kombinationen probiert und bewertet,
 * dann wird zufällig eine der besten genommen. Gibt einen Hinweistext zurück, wenn es nicht geht.
 */
export function randomOutfit(pools: Pools, current: Slots, prefs: RandomPrefs, k: Knowledge): Slots | string {
  if (!ZONES.some((z) => pools[z].length)) return 'Zu diesem Filter liegt nichts im Schrank.'
  const free = ZONES.filter((z) => !prefs.keep.includes(z))
  const byId = (z: Zone, id: string | null) => pools[z].find((i) => i.id === id) ?? null
  const candidates: { slots: Slots; items: Item[]; score: number }[] = []
  for (let t = 0; t < 300; t++) {
    const slots = { ...current }
    for (const z of free) {
      if (!pools[z].length) slots[z] = null
      else if (z === 'jacket') slots[z] = Math.random() < 0.5 ? null : pick(pools[z]).id
      else slots[z] = pick(pools[z]).id
    }
    const top = byId('top', slots.top)
    const worn = ZONES.filter((z) => !(z === 'bottom' && top?.category === 'Kleider')).map((z) => byId(z, slots[z])).filter((i): i is Item => !!i)
    if (prefs.mainColor && !worn.some((i) => i.color === prefs.mainColor)) continue
    candidates.push({ slots, items: worn, score: judge(worn, k)?.score ?? 0 })
  }
  if (!candidates.length) return `Kein passendes Teil in ${prefs.mainColor} gefunden. Wähl eine andere Hauptfarbe oder einen anderen Filter.`
  candidates.sort((a, b) => b.score - a.score)
  const same = (s: Slots) => ZONES.every((z) => s[z] === current[z])
  const top = candidates.slice(0, Math.max(1, Math.ceil(candidates.length * 0.2)))
  const fresh = top.filter((c) => !same(c.slots))
  return pick(fresh.length ? fresh : top).slots
}

export const isColor = (name: string) => name in COLORS
