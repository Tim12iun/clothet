import { useEffect, useMemo, useRef, useState } from 'react'
import { IconBookmark, IconCheck, IconDice, IconGear, IconPlus, IconSliders } from '../icons'
import { DRAW_ORDER, avatarOf } from '../lib/avatar'
import { judge, randomOutfit, type Pools, type RandomPrefs } from '../lib/engine'
import { ensureOutfit, today } from '../lib/outfits'
import { seedSamples } from '../lib/samples'
import type { Toast } from '../main'
import { deleteOutfit, markSeeded, setWorn, urlFor, useStore } from '../store'
import { COLORS, SEASONS, STYLES, ZONES, ZONE_CATEGORIES, ZONE_LABEL, type Filter, type Item, type Season, type Slots, type Style, type Zone } from '../types'
import { Sheet } from './Sheet'
import { Wear } from './Wear'

// Höhe der Körperzonen auf der Bühne (Anteil von oben): dort wischt oder tippt man.
const STRIP: Record<Zone, [number, number]> = { jacket: [0, 0.2], top: [0.2, 0.47], bottom: [0.47, 0.84], shoes: [0.84, 1] }

interface Props {
  hidden: boolean
  slots: Slots
  setSlots: (s: Slots) => void
  onSettings: () => void
  onAdd: () => void
  toast: Toast
}

export function Home({ hidden, slots, setSlots, onSettings, onAdd, toast }: Props) {
  const { items, body, figure, avatarMode, knowledge, outfits, worn: wornDays } = useStore()
  const av = useMemo(() => avatarOf(body, figure, avatarMode), [body, figure, avatarMode])
  const [filter, setFilter] = useState<Filter>({})
  const [prefs, setPrefs] = useState<RandomPrefs>({ mainColor: null, keep: [], mode: 'normal' })
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [zone, setZone] = useState<Zone>('top')
  const [open, setOpen] = useState(false)
  const grip = useRef<number | null>(null), swiped = useRef(false)
  // Die große Schublade gilt nur für den Moment: Wer den Bereich verlässt, findet sie danach wieder klein vor
  useEffect(() => { if (hidden) setOpen(false) }, [hidden])
  // Nur beim Wischen an der Figur gleitet das gewischte Teil herein, alles andere wechselt und steht still
  const [slide, setSlide] = useState<{ zone: Zone; dir: 'next' | 'prev' } | null>(null)
  const swipe = useRef<{ x: number } | null>(null)
  const [busy, setBusy] = useState<'save' | 'worn' | 'seed' | null>(null)

  // Zonen, die mit Absicht leer sind: ein zweiter Tipp auf das angezogene Teil zieht es wieder aus
  const [bare, setBare] = useState<Zone[]>([])
  const pools = useMemo(() => {
    const ok = (i: Item) => (!filter.season || i.seasons.includes(filter.season)) && (!filter.style || i.styles.includes(filter.style))
    return Object.fromEntries(ZONES.map((z) => [z, items.filter((i) => ZONE_CATEGORIES[z].includes(i.category) && ok(i))])) as Pools
  }, [items, filter])

  // Was wirklich getragen wird: die Auswahl, sofern sie zum Filter passt, sonst das erste passende Teil.
  const worn = useMemo(() => {
    const w = {} as Record<Zone, Item | null>
    for (const z of ZONES) w[z] = pools[z].find((i) => i.id === slots[z]) ?? (z === 'jacket' || bare.includes(z) ? null : pools[z][0] ?? null)
    return w
  }, [pools, slots, bare])
  const isDress = worn.top?.category === 'Kleider'
  const sex = figure?.sex
  const wornList = ZONES.filter((z) => !(z === 'bottom' && isDress)).map((z) => worn[z]).filter((i): i is Item => !!i)
  const wornSlots = Object.fromEntries(ZONES.map((z) => [z, worn[z]?.id ?? null])) as Slots

  // Auswahl mit dem abgleichen, was zu sehen ist (z. B. nach einem Filterwechsel)
  useEffect(() => {
    if (ZONES.some((z) => wornSlots[z] !== slots[z])) setSlots(wornSlots)
    // Kommt von anderswo wieder ein Teil in die Zone (Zufall, Wischen, geladenes Outfit), gilt sie nicht mehr als leer
    if (bare.some((z) => slots[z])) setBare(bare.filter((z) => !slots[z]))
  })

  function step(z: Zone, d: 1 | -1) {
    // Die Jacke hat zusätzlich die Position "ohne"
    const ids: (string | null)[] = z === 'jacket' ? [null, ...pools[z].map((i) => i.id)] : pools[z].map((i) => i.id)
    if (ids.length < 2) return
    const at = ids.indexOf(wornSlots[z])
    setSlide({ zone: z, dir: d === 1 ? 'next' : 'prev' })
    setSlots({ ...wornSlots, [z]: ids[(at + d + ids.length) % ids.length] })
  }
  function wear(z: Zone, id: string | null) {
    setSlide(null)
    const off = id !== null && wornSlots[z] === id
    setBare((b) => (off ? [...b.filter((x) => x !== z), z] : b.filter((x) => x !== z)))
    setSlots({ ...wornSlots, [z]: off ? null : id })
  }

  function roll() {
    const result = randomOutfit(pools, wornSlots, prefs, knowledge)
    if (typeof result === 'string') return toast(result)
    setSlide(null)
    setSlots(result)
  }

  // Gespeichert wird immer das, was zu sehen ist. Eine Kombination liegt nur einmal unter Outfits.
  const saved = outfits.find((o) => ZONES.every((z) => (o.slots[z] ?? null) === wornSlots[z]))
  const wornToday = !!saved && wornDays[today()] === saved.id
  async function save() {
    if (!wornList.length || busy === 'save') return
    if (saved) return toast('Dieses Outfit ist schon gespeichert. Du findest es unter Outfits.')
    setBusy('save')
    try {
      const { outfit } = await ensureOutfit(wornSlots)
      toast('Outfit gespeichert. Du findest es unter Outfits.', () => deleteOutfit(outfit.id))
    } catch {
      toast('Das Outfit ließ sich nicht speichern. Versuch es noch einmal.')
    }
    setBusy(null)
  }
  // Ein Tipp: Das Outfit wird, falls nötig, gespeichert und für heute als getragen eingetragen.
  async function wearToday() {
    if (!wornList.length || busy === 'worn') return
    const day = today(), before = wornDays[day] ?? null
    if (wornToday) {
      await setWorn(day, null)
      return toast('Der Eintrag für heute ist entfernt.', () => setWorn(day, before))
    }
    setBusy('worn')
    try {
      const { outfit, created } = await ensureOutfit(wornSlots)
      await setWorn(day, outfit.id)
      toast(created ? 'Für heute eingetragen und als Outfit gespeichert.' : 'Für heute als getragen eingetragen.', () => { setWorn(day, before); if (created) deleteOutfit(outfit.id) })
    } catch {
      toast('Das ließ sich nicht eintragen. Versuch es noch einmal.')
    }
    setBusy(null)
  }
  async function loadSamples() {
    setBusy('seed')
    await seedSamples()
    await markSeeded()
    setBusy(null)
  }

  const filtered = !!filter.season || !!filter.style
  const list = pools[zone]
  const dressBlocks = zone === 'bottom' && isDress

  return (
    <section className={'home' + (open ? ' is-open' : '')} hidden={hidden} aria-label="Anprobe">
      <header className="home-head">
        <h1>Anprobe</h1>
        <div className="home-head-actions">
          <button className={'btn is-compact' + (wornToday ? ' is-on' : '') + (busy === 'worn' ? ' is-busy' : '')} onClick={wearToday} disabled={!wornList.length} aria-pressed={wornToday} aria-label="Heute getragen" id="worn-today"><IconCheck /><span>Heute getragen</span></button>
          <button className={'icon-btn' + (saved ? ' is-on' : '')} onClick={save} disabled={!wornList.length} aria-label={saved ? 'Outfit ist gespeichert' : 'Outfit speichern'} aria-pressed={!!saved} id="save-outfit"><IconBookmark /></button>
          <button className="icon-btn" onClick={onSettings} aria-label="Einstellungen" id="open-settings"><IconGear /></button>
        </div>
      </header>

      <div className="stage-wrap">
        <div className="stage">
          <img className={'avatar' + (av.photo ? ' is-photo' : '')} src={av.photo ? urlFor(av.photo) : av.url} alt={av.photo ? 'Dein Foto' : 'Avatar'} draggable={false} />
          {DRAW_ORDER.map((z) => {
            const item = worn[z]
            if (!item || (z === 'bottom' && isDress)) return null
            return <Wear key={z} item={item} zone={z} isDress={isDress} wide={av.wide} photo={!!av.photo} sex={sex} dir={slide?.zone === z ? slide.dir : null} />
          })}
          {ZONES.map((z) => (
            <div
              key={z}
              className="strip"
              data-zone={z}
              style={{ top: STRIP[z][0] * 100 + '%', height: (STRIP[z][1] - STRIP[z][0]) * 100 + '%' }}
              onPointerDown={(e) => { swipe.current = { x: e.clientX } }}
              onPointerUp={(e) => {
                const s = swipe.current
                swipe.current = null
                if (!s) return
                const dx = e.clientX - s.x
                setZone(z) // Tippen oder Wischen zeigt die Zone auch in der Schublade
                if (Math.abs(dx) > 28 && !(z === 'bottom' && isDress)) step(z, dx < 0 ? 1 : -1)
              }}
              onPointerCancel={() => { swipe.current = null }}
            />
          ))}
        </div>
        {items.length === 0 ? (
          <div className="stage-empty">
            <p>Dein Schrank ist noch leer. Füg dein erstes Teil hinzu, dann kannst du es hier anziehen.</p>
            <button className="btn btn-primary" onClick={onAdd}>Teil hinzufügen</button>
            <button className={'btn' + (busy === 'seed' ? ' is-busy' : '')} onClick={loadSamples} id="load-samples">Beispiele laden</button>
          </div>
        ) : (
          <>
            <div className="segment roll-mode" role="group" aria-label="Art des Zufalls">
              <button className={prefs.mode === 'normal' ? 'is-on' : ''} aria-pressed={prefs.mode === 'normal'} onClick={() => setPrefs({ ...prefs, mode: 'normal' })} title="Klassische Kombinationen">Normal</button>
              <button className={prefs.mode === 'special' ? 'is-on' : ''} aria-pressed={prefs.mode === 'special'} onClick={() => setPrefs({ ...prefs, mode: 'special' })} title="Ungewöhnliche Kombinationen, die auf den zweiten Blick passen">Speziell</button>
            </div>
            <button className="fab" onClick={roll} id="roll" aria-label="Zufall: Outfit würfeln">
              <IconDice /> Zufall
              {prefs.mainColor && <span className="dot is-small" style={{ ['--dot' as string]: COLORS[prefs.mainColor] }} title={'Hauptfarbe ' + prefs.mainColor} />}
            </button>
          </>
        )}
      </div>

      <div className="drawer">
        <button
          className="drawer-handle" aria-expanded={open} aria-label={open ? 'Schublade verkleinern' : 'Schublade vergrößern'}
          onPointerDown={(e) => { grip.current = e.clientY }}
          onPointerCancel={() => { grip.current = null }}
          onPointerUp={(e) => {
            // Wischen am Griff: nach oben groß, nach unten klein. Der Klick danach schaltet dann nicht noch einmal um
            const dy = grip.current === null ? 0 : e.clientY - grip.current
            grip.current = null
            if (Math.abs(dy) > 10) { swiped.current = true; setOpen(dy < 0) }
          }}
          onClick={() => { if (swiped.current) swiped.current = false; else setOpen(!open) }}
        ><i /></button>
        <>
            <div className="drawer-bar">
              <div className="segment grow" role="tablist" aria-label="Körperzone">
                {ZONES.map((z) => <button key={z} role="tab" aria-selected={zone === z} className={zone === z ? 'is-on' : ''} onClick={() => setZone(z)}>{ZONE_LABEL[z]}</button>)}
              </div>
              <button className={'btn is-compact' + (filtered || prefs.mainColor || prefs.keep.length ? ' is-on' : '')} onClick={() => setPrefsOpen(true)} id="open-prefs"><IconSliders /> Filter</button>
            </div>
            <div className="drawer-body">
              {dressBlocks ? (
                <p className="muted drawer-note">Zum Kleid gehört keine Hose. Wähl ein anderes Oberteil, dann kannst du hier wieder wechseln.</p>
              ) : (
                <div className="picks">
                  {zone === 'jacket' && (
                    <button className={'pick-tile is-text' + (!wornSlots.jacket ? ' is-on' : '')} aria-pressed={!wornSlots.jacket} onClick={() => wear('jacket', null)}>
                      Ohne{!wornSlots.jacket && <span className="check"><IconCheck /></span>}
                    </button>
                  )}
                  {list.map((i) => {
                    const on = wornSlots[zone] === i.id
                    return (
                      <button key={i.id} className={'pick-tile' + (on ? ' is-on' : '')} aria-pressed={on} aria-label={i.name + (on ? ', angezogen, ausziehen' : ' anziehen')} title={i.name} onClick={() => wear(zone, i.id)}>
                        <img src={urlFor(i.image)} alt="" draggable={false} />
                        {on && <span className="check"><IconCheck /></span>}
                      </button>
                    )
                  })}
                  <button className="pick-tile is-add" onClick={onAdd}><IconPlus />Neues Teil</button>
                </div>
              )}
              {!dressBlocks && filtered && list.length === 0 && <p className="muted drawer-note">Zu diesem Filter passt hier kein Teil.</p>}
            </div>
        </>
      </div>

      {prefsOpen && (
        <Sheet title="Filter und Zufall" onClose={() => setPrefsOpen(false)}>
          <div className="field">
            <span>Jahreszeit</span>
            <div className="chips wrap">
              {SEASONS.map((s: Season) => {
                const on = filter.season === s
                return <button key={s} className={'chip' + (on ? ' is-on' : '')} aria-pressed={on} onClick={() => setFilter({ ...filter, season: on ? undefined : s })}>{s}</button>
              })}
            </div>
          </div>
          <div className="field">
            <span>Stil</span>
            <div className="chips wrap">
              {STYLES.map((s: Style) => {
                const on = filter.style === s
                return <button key={s} className={'chip' + (on ? ' is-on' : '')} aria-pressed={on} onClick={() => setFilter({ ...filter, style: on ? undefined : s })}>{s}</button>
              })}
            </div>
          </div>
          <div className="field">
            <span>Hauptfarbe beim Würfeln</span>
            <div className="chips wrap">
              <button className={'chip' + (!prefs.mainColor ? ' is-on' : '')} onClick={() => setPrefs({ ...prefs, mainColor: null })}>Egal</button>
              {Object.keys(COLORS).filter((c) => items.some((i) => i.color === c)).map((c) => (
                <button key={c} className={'dot' + (prefs.mainColor === c ? ' is-on' : '')} style={{ ['--dot' as string]: COLORS[c] }} onClick={() => setPrefs({ ...prefs, mainColor: c })} aria-label={c} aria-pressed={prefs.mainColor === c} title={c} />
              ))}
              {prefs.mainColor && <span className="muted">{prefs.mainColor}</span>}
            </div>
          </div>
          <div className="field">
            <span>Beim Würfeln behalten</span>
            <div className="chips wrap">
              {ZONES.map((z) => {
                const on = prefs.keep.includes(z)
                return <button key={z} className={'chip' + (on ? ' is-on' : '')} aria-pressed={on} onClick={() => setPrefs({ ...prefs, keep: on ? prefs.keep.filter((k) => k !== z) : [...prefs.keep, z] })}>{ZONE_LABEL[z]}</button>
              })}
            </div>
          </div>
          <div className="actions">
            <button className="btn" onClick={() => { setFilter({}); setPrefs({ ...prefs, mainColor: null, keep: [] }) }}>Zurücksetzen</button>
            <span className="grow" />
            <button className="btn btn-primary" id="roll-prefs" onClick={() => { setPrefsOpen(false); roll() }}><IconDice /> Würfeln</button>
          </div>
        </Sheet>
      )}
    </section>
  )
}
