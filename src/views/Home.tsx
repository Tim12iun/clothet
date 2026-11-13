import { useEffect, useMemo, useRef, useState } from 'react'
import { IconBookmark, IconChevronLeft, IconChevronRight, IconDice, IconGear, IconSliders } from '../icons'
import { DRAW_ORDER, MANNEQUIN_URL, placement } from '../lib/avatar'
import { judge, randomOutfit, type Pools, type RandomPrefs } from '../lib/engine'
import { renderOutfit } from '../lib/image'
import { saveOutfit, setFits, urlFor, useStore } from '../store'
import { COLORS, SEASONS, STYLES, ZONES, ZONE_CATEGORIES, ZONE_LABEL, uid, type Filter, type Item, type Season, type Slots, type Style, type Zone } from '../types'
import { Sheet } from './Sheet'

// Höhe der Karussell-Streifen auf der Bühne (Anteil von oben), passend zu den Körperzonen.
const STRIP: Record<Zone, [number, number]> = { jacket: [0, 0.2], top: [0.2, 0.47], bottom: [0.47, 0.84], shoes: [0.84, 1] }

interface Props {
  slots: Slots
  setSlots: (s: Slots) => void
  onSettings: () => void
  onAdd: () => void
  fitZone: Zone | null
  setFitZone: (z: Zone | null) => void
  toast: (text: string) => void
}

export function Home({ slots, setSlots, onSettings, onAdd, fitZone, setFitZone, toast }: Props) {
  const { items, body, fits, knowledge, outfits } = useStore()
  const [filter, setFilter] = useState<Filter>({})
  const [prefs, setPrefs] = useState<RandomPrefs>({ mainColor: null, keep: [] })
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [dir, setDir] = useState<'next' | 'prev'>('next')
  const swipe = useRef<{ x: number; at: number } | null>(null)
  const swipedAt = useRef(0)

  const pools = useMemo(() => {
    const ok = (i: Item) => (!filter.season || i.seasons.includes(filter.season)) && (!filter.style || i.styles.includes(filter.style))
    return Object.fromEntries(ZONES.map((z) => [z, items.filter((i) => ZONE_CATEGORIES[z].includes(i.category) && ok(i))])) as Pools
  }, [items, filter])

  // Was wirklich getragen wird: die Auswahl, sofern sie zum Filter passt, sonst das erste passende Teil.
  const worn = useMemo(() => {
    const w = {} as Record<Zone, Item | null>
    for (const z of ZONES) w[z] = pools[z].find((i) => i.id === slots[z]) ?? (z === 'jacket' ? null : pools[z][0] ?? null)
    return w
  }, [pools, slots])
  const isDress = worn.top?.category === 'Kleider'
  const wornList = ZONES.filter((z) => !(z === 'bottom' && isDress)).map((z) => worn[z]).filter((i): i is Item => !!i)
  const verdict = judge(wornList, knowledge)
  const wornSlots = Object.fromEntries(ZONES.map((z) => [z, worn[z]?.id ?? null])) as Slots

  // Auswahl mit dem abgleichen, was zu sehen ist (z. B. nach einem Filterwechsel)
  useEffect(() => {
    if (ZONES.some((z) => wornSlots[z] !== slots[z])) setSlots(wornSlots)
  })

  function step(zone: Zone, d: 1 | -1) {
    // Die Jacke hat zusätzlich die Position "ohne"
    const ids: (string | null)[] = zone === 'jacket' ? [null, ...pools[zone].map((i) => i.id)] : pools[zone].map((i) => i.id)
    if (ids.length < 2) return
    const at = ids.indexOf(wornSlots[zone])
    setDir(d === 1 ? 'next' : 'prev')
    setSlots({ ...wornSlots, [zone]: ids[(at + d + ids.length) % ids.length] })
  }
  function neighbour(zone: Zone, d: 1 | -1): Item | null | undefined {
    const list: (Item | null)[] = zone === 'jacket' ? [null, ...pools[zone]] : pools[zone]
    if (list.length < 2 || (list.length === 2 && d === -1)) return undefined // bei zwei Teilen reicht eine Karte
    const at = list.findIndex((i) => (i?.id ?? null) === wornSlots[zone])
    return list[(at + d + list.length) % list.length]
  }

  function roll(p = prefs) {
    const result = randomOutfit(pools, wornSlots, p, knowledge)
    if (typeof result === 'string') return toast(result)
    setDir('next')
    setSlots(result)
  }

  async function save() {
    if (!wornList.length) return
    const tile = getComputedStyle(document.documentElement).getPropertyValue('--c-tile').trim() || '#f1f3f0'
    try {
      const preview = await renderOutfit(wornSlots, items, fits, body ?? MANNEQUIN_URL, !!body, tile)
      await saveOutfit({ id: uid(), name: `Outfit ${outfits.length + 1}`, slots: wornSlots, preview, createdAt: Date.now() })
      toast('Outfit gespeichert. Du findest es unter Outfits.')
    } catch {
      toast('Das Outfit ließ sich nicht speichern. Versuch es noch einmal.')
    }
  }

  const chip = (label: string, on: boolean, f: Filter) => (
    <button key={label} className={'chip' + (on ? ' is-on' : '')} onClick={() => setFilter(on ? {} : f)} aria-pressed={on}>{label}</button>
  )
  const fit = fitZone ? fits[fitZone] : null

  return (
    <section className="home">
      <header className="home-head">
        <div className="brand">Clothet</div>
        <button className="icon-btn" onClick={onSettings} aria-label="Einstellungen" id="open-settings"><IconGear /></button>
      </header>

      <div className="chips" role="group" aria-label="Outfits für">
        <button className={'chip' + (!filter.season && !filter.style ? ' is-on' : '')} onClick={() => setFilter({})}>Alle</button>
        {SEASONS.map((s: Season) => chip(s, filter.season === s, { season: s }))}
        {STYLES.map((s: Style) => chip(s, filter.style === s, { style: s }))}
      </div>

      <div className="stage-wrap">
        <div className="stage">
          <img className={'avatar' + (body ? ' is-photo' : '')} src={body ? urlFor(body) : MANNEQUIN_URL} alt={body ? 'Dein Foto' : 'Avatar'} draggable={false} />
          {DRAW_ORDER.map((z) => {
            const item = worn[z]
            if (!item || (z === 'bottom' && isDress)) return null
            const p = placement(z, isDress, fits[z])
            return (
              <div key={z} className="wear" style={{ width: p.w * 100 + '%', ...(p.anchor === 'top' ? { top: p.y * 100 + '%' } : { bottom: (1 - p.y) * 100 + '%' }) }}>
                <img key={item.id} className={'wear-img is-' + dir} src={urlFor(item.image)} alt={`${ZONE_LABEL[z]}: ${item.name}`} draggable={false} />
              </div>
            )
          })}
          {items.length === 0 && (
            <div className="stage-empty">
              <p>Dein Schrank ist noch leer. Füg dein erstes Teil hinzu, dann kannst du es hier anziehen.</p>
              <button className="btn btn-primary" onClick={onAdd}>Teil hinzufügen</button>
            </div>
          )}
          {ZONES.map((z) => {
            const prev = neighbour(z, -1), next = neighbour(z, 1)
            const dim = z === 'bottom' && isDress
            return (
              <div
                key={z}
                className={'strip' + (dim ? ' is-dim' : '')}
                style={{ top: STRIP[z][0] * 100 + '%', height: (STRIP[z][1] - STRIP[z][0]) * 100 + '%' }}
                onPointerDown={(e) => { swipe.current = { x: e.clientX, at: Date.now() } }}
                onPointerUp={(e) => {
                  const s = swipe.current
                  swipe.current = null
                  if (!s || dim) return
                  const dx = e.clientX - s.x
                  if (Math.abs(dx) > 28) {
                    swipedAt.current = Date.now()
                    step(z, dx < 0 ? 1 : -1)
                  }
                }}
                onPointerCancel={() => { swipe.current = null }}
              >
                {prev !== undefined && !dim && (
                  <button className="side is-left" onClick={() => Date.now() - swipedAt.current > 350 && step(z, -1)} aria-label={`${ZONE_LABEL[z]}: vorheriges Teil${prev ? ', ' + prev.name : ', ohne'}`}>
                    {prev ? <img src={urlFor(prev.image)} alt="" draggable={false} /> : <span>ohne</span>}
                    <i><IconChevronLeft /></i>
                  </button>
                )}
                {next !== undefined && !dim && (
                  <button className="side is-right" onClick={() => Date.now() - swipedAt.current > 350 && step(z, 1)} aria-label={`${ZONE_LABEL[z]}: nächstes Teil${next ? ', ' + next.name : ', ohne'}`}>
                    {next ? <img src={urlFor(next.image)} alt="" draggable={false} /> : <span>ohne</span>}
                    <i><IconChevronRight /></i>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {fitZone && fit ? (
        <div className="panel">
          <div className="chips" role="group" aria-label="Zone">
            {ZONES.map((z) => <button key={z} className={'chip' + (fitZone === z ? ' is-on' : '')} onClick={() => setFitZone(z)}>{ZONE_LABEL[z]}</button>)}
          </div>
          <label className="range"><span className="muted">Höhe</span>
            <input id="fit-dy" type="range" min={-12} max={12} step={0.5} value={fit.dy * 100} onChange={(e) => setFits({ ...fits, [fitZone]: { ...fit, dy: +e.target.value / 100 } })} />
          </label>
          <label className="range"><span className="muted">Größe</span>
            <input id="fit-scale" type="range" min={60} max={160} value={fit.scale * 100} onChange={(e) => setFits({ ...fits, [fitZone]: { ...fit, scale: +e.target.value / 100 } })} />
          </label>
          <button className="btn btn-primary" onClick={() => setFitZone(null)}>Fertig</button>
        </div>
      ) : (
        <>
          <p className={'match' + (verdict ? ' is-' + verdict.level : '')} aria-live="polite">
            {verdict ? <><strong>{verdict.label}</strong> · {verdict.reason}</> : 'Wisch über den Avatar, um Teile zu wechseln.'}
          </p>
          <div className="home-actions">
            <button className="icon-btn is-outlined" onClick={() => setPrefsOpen(true)} aria-label="Vorgaben für das Zufalls-Outfit" id="open-prefs"><IconSliders /></button>
            <button className="btn btn-primary grow" onClick={() => roll()} id="roll"><IconDice /> Zufalls-Outfit{prefs.mainColor && <span className="dot is-small" style={{ ['--dot' as string]: COLORS[prefs.mainColor] }} title={'Hauptfarbe ' + prefs.mainColor} />}</button>
            <button className="btn" onClick={save} disabled={!wornList.length} id="save-outfit"><IconBookmark /> Speichern</button>
          </div>
        </>
      )}

      {prefsOpen && (
        <Sheet title="Zufalls-Outfit" onClose={() => setPrefsOpen(false)}>
          <p className="muted">Ohne Vorgaben wird frei gewürfelt. Der Filter oben gilt immer mit.</p>
          <div className="field">
            <span>Hauptfarbe</span>
            <div className="chips wrap">
              <button className={'chip' + (!prefs.mainColor ? ' is-on' : '')} onClick={() => setPrefs({ ...prefs, mainColor: null })}>Egal</button>
              {Object.keys(COLORS).filter((c) => items.some((i) => i.color === c)).map((c) => (
                <button key={c} className={'dot' + (prefs.mainColor === c ? ' is-on' : '')} style={{ ['--dot' as string]: COLORS[c] }} onClick={() => setPrefs({ ...prefs, mainColor: c })} aria-label={c} aria-pressed={prefs.mainColor === c} title={c} />
              ))}
              {prefs.mainColor && <span className="muted">{prefs.mainColor}</span>}
            </div>
          </div>
          <div className="field">
            <span>Diese Teile behalten</span>
            <div className="chips wrap">
              {ZONES.map((z) => {
                const on = prefs.keep.includes(z)
                return <button key={z} className={'chip' + (on ? ' is-on' : '')} aria-pressed={on} onClick={() => setPrefs({ ...prefs, keep: on ? prefs.keep.filter((k) => k !== z) : [...prefs.keep, z] })}>{ZONE_LABEL[z]}</button>
              })}
            </div>
          </div>
          <div className="actions">
            <span className="grow" />
            <button className="btn btn-primary" id="roll-prefs" onClick={() => { setPrefsOpen(false); roll() }}><IconDice /> Würfeln</button>
          </div>
        </Sheet>
      )}
    </section>
  )
}
