import { useEffect, useMemo, useRef, useState } from 'react'
import { IconBookmark, IconCheck, IconDice, IconGear, IconPlus, IconSliders } from '../icons'
import { DRAW_ORDER, avatarOf } from '../lib/avatar'
import { randomOutfit, type Pools, type RandomPrefs } from '../lib/engine'
import { ensureOutfit, today } from '../lib/outfits'
import { seedSamples } from '../lib/samples'
import { useTucked } from '../lib/tuck'
import type { Toast } from '../main'
import { deleteOutfit, markSeeded, setWorn, urlFor, useStore } from '../store'
import { COLORS, ZONES, ZONE_CATEGORIES, ZONE_LABEL, type Item, type Slots, type Zone } from '../types'
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
  const [prefs, setPrefs] = useState<RandomPrefs>({ mainColor: null, keep: [], mode: 'normal' })
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [zone, setZone] = useState<Zone>('top')
  // Schublade in drei Größen: nur die Leiste der Zonen (die Vorschau ist groß), normal, groß
  const [size, setSize] = useState<0 | 1 | 2>(1)
  const open = size === 2
  const grip = useRef<number | null>(null), swiped = useRef(false)
  // Die große Schublade gilt nur für den Moment: Wer den Bereich verlässt, findet sie danach wieder klein vor
  useEffect(() => { if (hidden) setSize((s) => (s === 2 ? 1 : s)) }, [hidden])
  // Nur beim Wischen an der Figur gleitet das gewischte Teil herein, alles andere wechselt und steht still
  const [slide, setSlide] = useState<{ zone: Zone; dir: 'next' | 'prev' } | null>(null)
  const swipe = useRef<{ x: number } | null>(null)
  const [busy, setBusy] = useState<'save' | 'worn' | 'seed' | null>(null)

  // Zonen, die mit Absicht leer sind: ein zweiter Tipp auf das angezogene Teil zieht es wieder aus
  const [bare, setBare] = useState<Zone[]>([])
  const pools = useMemo(() => Object.fromEntries(ZONES.map((z) => [z, items.filter((i) => ZONE_CATEGORIES[z].includes(i.category))])) as Pools, [items])

  // Was wirklich getragen wird: die Auswahl, sonst das erste Teil der Zone.
  const worn = useMemo(() => {
    const w = {} as Record<Zone, Item | null>
    for (const z of ZONES) w[z] = pools[z].find((i) => i.id === slots[z]) ?? (z === 'jacket' || bare.includes(z) ? null : pools[z][0] ?? null)
    return w
  }, [pools, slots, bare])
  const isDress = worn.top?.category === 'Kleider'
  // Wie beim Anziehen: Unter einer Jacke ist das Oberteil nicht zu sehen. Es bleibt gewählt und kommt ohne Jacke wieder. Ein Kleid bleibt sichtbar
  const covered = !!worn.jacket && !!worn.top && !isDress
  const sex = figure?.sex
  // Was unter Oberteil oder Jacke seitlich hervorschaut (Schulterspitzen), wird von der Figur weggenommen
  const tucked = useTucked(av.photo ? null : av.url, [worn.jacket, covered ? null : worn.top].filter((i): i is Item => !!i), av.wide, sex)
  const wornList = ZONES.filter((z) => !(z === 'bottom' && isDress)).map((z) => worn[z]).filter((i): i is Item => !!i)
  const wornSlots = Object.fromEntries(ZONES.map((z) => [z, worn[z]?.id ?? null])) as Slots

  // Auswahl mit dem abgleichen, was zu sehen ist (z. B. nach dem Löschen eines Teils)
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
    setSlots({ ...wornSlots, ...(z === 'top' ? { jacket: null } : {}), [z]: ids[(at + d + ids.length) % ids.length] })
  }
  function wear(z: Zone, id: string | null) {
    setSlide(null)
    const off = id !== null && wornSlots[z] === id
    setBare((b) => (off ? [...b.filter((x) => x !== z), z] : b.filter((x) => x !== z)))
    // Ein Oberteil wählen zieht die Jacke aus, sonst bliebe es unter ihr unsichtbar
    setSlots({ ...wornSlots, ...(z === 'top' && !off ? { jacket: null } : {}), [z]: off ? null : id })
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

  const tuned = prefs.mode !== 'normal' || !!prefs.mainColor || prefs.keep.length > 0
  const list = pools[zone]
  const dressBlocks = zone === 'bottom' && isDress

  return (
    <section className={'home' + (open ? ' is-open' : size === 0 ? ' is-min' : '')} hidden={hidden} aria-label="Anprobe">
      <header className="view-head home-head">
        <div className="view-title">
          <h1>Anprobe</h1>
          <p className="muted">{wornList.length === 0 ? 'Noch nichts an' : saved ? 'Gespeichert' : wornList.length === 1 ? '1 Teil an' : `${wornList.length} Teile an`}</p>
        </div>
        <div className="actions">
          <button className={'btn is-compact' + (wornToday ? ' is-on' : '') + (busy === 'worn' ? ' is-busy' : '')} onClick={wearToday} disabled={!wornList.length} aria-pressed={wornToday} aria-label="Heute getragen" id="worn-today"><IconCheck /><span>Heute getragen</span></button>
          <button className={'icon-btn' + (saved ? ' is-on' : '')} onClick={save} disabled={!wornList.length} aria-label={saved ? 'Outfit ist gespeichert' : 'Outfit speichern'} aria-pressed={!!saved} id="save-outfit"><IconBookmark /></button>
          <button className="icon-btn" onClick={onSettings} aria-label="Einstellungen" id="open-settings"><IconGear /></button>
        </div>
      </header>

      <div className="stage-wrap">
        <div className="stage">
          <img className={'avatar' + (av.photo ? ' is-photo' : '')} src={av.photo ? urlFor(av.photo) : tucked ?? av.url} alt={av.photo ? 'Dein Foto' : 'Avatar'} draggable={false} />
          {DRAW_ORDER.map((z) => {
            const item = worn[z]
            if (!item || (z === 'bottom' && isDress) || (z === 'top' && covered)) return null
            return <Wear key={z} item={item} zone={z} isDress={isDress} wide={av.wide} photo={!!av.photo} sex={sex} dir={slide?.zone === z ? slide.dir : null} />
          })}
          {!av.photo && <img className="avatar is-front" src={av.url} alt="" aria-hidden="true" draggable={false} />}
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
            <div className="roll">
              <button className="fab" onClick={roll} id="roll" aria-label="Zufall: Outfit würfeln" title="Zufall"><IconDice /></button>
              <button className={'fab-more' + (tuned ? ' is-on' : '')} onClick={() => setPrefsOpen(true)} id="open-prefs" aria-label={tuned ? 'Zufall einstellen, Vorgaben aktiv' : 'Zufall einstellen'}><IconSliders /></button>
            </div>
          </>
        )}
      </div>

      <div className="drawer">
        <button
          className="drawer-handle" aria-expanded={size > 0} aria-label={size === 0 ? 'Schublade öffnen' : open ? 'Schublade verkleinern' : 'Schublade vergrößern'}
          onPointerDown={(e) => { grip.current = e.clientY }}
          onPointerCancel={() => { grip.current = null }}
          onPointerUp={(e) => {
            // Wischen am Griff: nach oben eine Stufe größer, nach unten eine kleiner. Der Klick danach schaltet dann nicht noch einmal um
            const dy = grip.current === null ? 0 : e.clientY - grip.current
            grip.current = null
            if (Math.abs(dy) > 10) { swiped.current = true; setSize((s) => Math.min(2, Math.max(0, s + (dy < 0 ? 1 : -1))) as 0 | 1 | 2) }
          }}
          onClick={() => { if (swiped.current) swiped.current = false; else setSize(size === 1 ? 2 : 1) }}
        ><i /></button>
        <>
            <div className="drawer-bar">
              <div className="segment grow" role="tablist" aria-label="Körperzone">
                {ZONES.map((z) => <button key={z} role="tab" aria-selected={zone === z} className={zone === z ? 'is-on' : ''} onClick={() => { setZone(z); if (size === 0) setSize(1) }}>{ZONE_LABEL[z]}</button>)}
              </div>
            </div>
            <div className="drawer-body" hidden={size === 0}>
              {zone === 'top' && covered && <p className="muted drawer-note">Unter der Jacke ist das Oberteil nicht zu sehen. Wählst du ein Oberteil, kommt die Jacke weg.</p>}
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
            </div>
        </>
      </div>

      {prefsOpen && (
        <Sheet title="Zufall" onClose={() => setPrefsOpen(false)}>
          <div className="choices" role="group" aria-label="Art des Zufalls" id="roll-mode">
            <button className={prefs.mode === 'normal' ? 'is-on' : ''} aria-pressed={prefs.mode === 'normal'} onClick={() => setPrefs({ ...prefs, mode: 'normal' })}><strong>Normal</strong><span>Ruhig: neutrale Farben, höchstens eine kräftige.</span></button>
            <button className={prefs.mode === 'special' ? 'is-on' : ''} aria-pressed={prefs.mode === 'special'} onClick={() => setPrefs({ ...prefs, mode: 'special' })}><strong>Speziell</strong><span>Gewagt: genau ein spannendes Farbpaar.</span></button>
          </div>
          <div className="field">
            <span>Hauptfarbe: {prefs.mainColor ?? 'egal'}</span>
            <div className="swatches">
              <button className={'swatch-any' + (!prefs.mainColor ? ' is-on' : '')} aria-pressed={!prefs.mainColor} onClick={() => setPrefs({ ...prefs, mainColor: null })}>Egal</button>
              {Object.keys(COLORS).filter((c) => items.some((i) => i.color === c)).map((c) => (
                <button key={c} className={'dot' + (prefs.mainColor === c ? ' is-on' : '')} style={{ ['--dot' as string]: COLORS[c] }} onClick={() => setPrefs({ ...prefs, mainColor: c })} aria-label={c} aria-pressed={prefs.mainColor === c} title={c} />
              ))}
            </div>
          </div>
          <div className="field">
            <span>Beim Würfeln behalten</span>
            <div className="chips is-even">
              {ZONES.map((z) => {
                const on = prefs.keep.includes(z)
                return <button key={z} className={'chip' + (on ? ' is-on' : '')} aria-pressed={on} onClick={() => setPrefs({ ...prefs, keep: on ? prefs.keep.filter((k) => k !== z) : [...prefs.keep, z] })}>{ZONE_LABEL[z]}</button>
              })}
            </div>
          </div>
          <button className="btn btn-primary" id="roll-prefs" onClick={() => { setPrefsOpen(false); roll() }}><IconDice /> Würfeln</button>
          {tuned && <button className="link is-center" onClick={() => setPrefs({ mode: 'normal', mainColor: null, keep: [] })}>Vorgaben zurücksetzen</button>}
        </Sheet>
      )}
    </section>
  )
}
