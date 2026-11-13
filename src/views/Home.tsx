import { useEffect, useMemo, useRef, useState } from 'react'
import { IconBookmark, IconCheck, IconDice, IconDown, IconGear, IconMinus, IconPlus, IconSliders, IconUp } from '../icons'
import { DRAW_ORDER, avatarOf, placement } from '../lib/avatar'
import { judge, randomOutfit, type Pools, type RandomPrefs } from '../lib/engine'
import { FIT_ORIGIN, fitKind, fittedUrl } from '../lib/fitting'
import { ensureOutfit, today } from '../lib/outfits'
import { seedSamples } from '../lib/samples'
import type { Toast } from '../main'
import { deleteOutfit, markSeeded, setFits, setWorn, urlFor, useStore } from '../store'
import { COLORS, DEFAULT_FITS, SEASONS, STYLES, ZONES, ZONE_CATEGORIES, ZONE_LABEL, type Filter, type Fit, type Item, type Season, type Slots, type Style, type Zone } from '../types'
import { Sheet } from './Sheet'

// Höhe der Körperzonen auf der Bühne (Anteil von oben): dort wischt oder tippt man.
const STRIP: Record<Zone, [number, number]> = { jacket: [0, 0.2], top: [0.2, 0.47], bottom: [0.47, 0.84], shoes: [0.84, 1] }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fixFit = (f: Fit): Fit => ({ dy: clamp(f.dy, -0.14, 0.14), scale: clamp(f.scale, 0.6, 1.7) })

interface Props {
  hidden: boolean
  slots: Slots
  setSlots: (s: Slots) => void
  onSettings: () => void
  onAdd: () => void
  fitZone: Zone | null
  setFitZone: (z: Zone | null) => void
  toast: Toast
}

export function Home({ hidden, slots, setSlots, onSettings, onAdd, fitZone, setFitZone, toast }: Props) {
  const { items, body, figure, avatarMode, fits, knowledge, outfits, worn: wornDays } = useStore()
  const av = useMemo(() => avatarOf(body, figure, avatarMode), [body, figure, avatarMode])
  const [filter, setFilter] = useState<Filter>({})
  const [prefs, setPrefs] = useState<RandomPrefs>({ mainColor: null, keep: [] })
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [zone, setZone] = useState<Zone>('top')
  const [open, setOpen] = useState(false)
  const [dir, setDir] = useState<'next' | 'prev'>('next')
  const swipe = useRef<{ x: number } | null>(null)
  const [busy, setBusy] = useState<'save' | 'worn' | 'seed' | null>(null)
  const touches = useRef(new Map<number, { x: number; y: number }>())
  const grip = useRef<{ y: number; d: number; moved: number } | null>(null)

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
  // Passform: Teile, die an die Figur angepasst werden können, kommen als fertiges Bild in Bühnengröße
  const sex = figure?.sex
  const [fitted, setFitted] = useState<Record<string, string | null>>({})
  const fitKey = (i: Item) => `${i.id}:${i.flat ? 1 : 0}:${sex ?? ''}`
  useEffect(() => {
    if (av.photo) return
    let gone = false
    for (const z of ZONES) {
      const i = worn[z]
      if (i && fitted[fitKey(i)] === undefined) fittedUrl(i, sex).then((url) => { if (!gone) setFitted((f) => ({ ...f, [fitKey(i)]: url })) })
    }
    return () => { gone = true }
  }, [worn, sex, av.photo]) // eslint-disable-line react-hooks/exhaustive-deps
  const wornList = ZONES.filter((z) => !(z === 'bottom' && isDress)).map((z) => worn[z]).filter((i): i is Item => !!i)
  const verdict = judge(wornList, knowledge)
  const wornSlots = Object.fromEntries(ZONES.map((z) => [z, worn[z]?.id ?? null])) as Slots

  // Auswahl mit dem abgleichen, was zu sehen ist (z. B. nach einem Filterwechsel)
  useEffect(() => {
    if (ZONES.some((z) => wornSlots[z] !== slots[z])) setSlots(wornSlots)
  })

  function step(z: Zone, d: 1 | -1) {
    // Die Jacke hat zusätzlich die Position "ohne"
    const ids: (string | null)[] = z === 'jacket' ? [null, ...pools[z].map((i) => i.id)] : pools[z].map((i) => i.id)
    if (ids.length < 2) return
    const at = ids.indexOf(wornSlots[z])
    setDir(d === 1 ? 'next' : 'prev')
    setSlots({ ...wornSlots, [z]: ids[(at + d + ids.length) % ids.length] })
  }
  function wear(z: Zone, id: string | null) {
    setDir('next')
    setSlots({ ...wornSlots, [z]: id })
  }

  function roll() {
    const result = randomOutfit(pools, wornSlots, prefs, knowledge)
    if (typeof result === 'string') return toast(result)
    setDir('next')
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

  // Sitz anpassen direkt am Avatar: ziehen verschiebt die Zone in der Höhe, zwei Finger ändern die Größe.
  const setFit = (z: Zone, f: Fit) => setFits({ ...fits, [z]: fixFit(f) })
  const grasp = () => {
    const p = [...touches.current.values()]
    return { y: p.reduce((a, q) => a + q.y, 0) / p.length, d: p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0 }
  }
  function fitDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!fitZone) return
    e.currentTarget.setPointerCapture(e.pointerId)
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    grip.current = { ...grasp(), moved: grip.current?.moved ?? 0 }
  }
  function fitMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!fitZone || !grip.current || !touches.current.has(e.pointerId)) return
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const now = grasp(), was = grip.current, f = fits[fitZone]
    grip.current = { ...now, moved: was.moved + Math.abs(now.y - was.y) + Math.abs(now.d - was.d) }
    if (grip.current.moved < 6) return
    setFit(fitZone, { dy: f.dy + (now.y - was.y) / e.currentTarget.clientHeight, scale: was.d && now.d ? f.scale * (now.d / was.d) : f.scale })
  }
  function fitUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!touches.current.delete(e.pointerId) || !grip.current) return
    if (touches.current.size) return void (grip.current = { ...grasp(), moved: grip.current.moved })
    // Ohne Bewegung war es ein Tipp: Er wählt die Zone, die angepasst wird.
    if (grip.current.moved < 6) {
      const r = e.currentTarget.getBoundingClientRect(), y = (e.clientY - r.top) / r.height
      const z = ZONES.find((k) => y >= STRIP[k][0] && y < STRIP[k][1])
      if (z) setFitZone(z)
    }
    grip.current = null
  }

  const fit = fitZone ? fits[fitZone] : null
  const filtered = !!filter.season || !!filter.style
  const list = pools[zone]
  const dressBlocks = zone === 'bottom' && isDress

  return (
    <section className={'home' + (open ? ' is-open' : '') + (fitZone ? ' is-fit' : '')} hidden={hidden} aria-label="Anprobe">
      <header className="home-head">
        <h1>Anprobe</h1>
        <div className="home-head-actions">
          <button className={'btn is-compact' + (wornToday ? ' is-on' : '') + (busy === 'worn' ? ' is-busy' : '')} onClick={wearToday} disabled={!wornList.length} aria-pressed={wornToday} aria-label="Heute getragen" id="worn-today"><IconCheck /><span>Heute getragen</span></button>
          <button className={'icon-btn' + (saved ? ' is-on' : '')} onClick={save} disabled={!wornList.length} aria-label={saved ? 'Outfit ist gespeichert' : 'Outfit speichern'} aria-pressed={!!saved} id="save-outfit"><IconBookmark /></button>
          <button className="icon-btn" onClick={onSettings} aria-label="Einstellungen" id="open-settings"><IconGear /></button>
        </div>
      </header>

      <div className="stage-wrap">
        <div className="stage" onPointerDown={fitDown} onPointerMove={fitMove} onPointerUp={fitUp} onPointerCancel={fitUp}>
          <img className={'avatar' + (av.photo ? ' is-photo' : '')} src={av.photo ? urlFor(av.photo) : av.url} alt={av.photo ? 'Dein Foto' : 'Avatar'} draggable={false} />
          {DRAW_ORDER.map((z) => {
            const item = worn[z]
            if (!item || (z === 'bottom' && isDress)) return null
            const p = placement(z, isDress, fits[z], av.wide)
            const kind = fitKind(item.category), full = !av.photo && kind ? fitted[fitKey(item)] : null
            if (full && kind) {
              return (
                <div key={z} className={'wear is-full' + (fitZone === z ? ' is-fitting' : '')} style={{ transformOrigin: `50% ${FIT_ORIGIN[kind] * 100}%`, transform: `translateY(${fits[z].dy * 100}%) scale(${av.wide * fits[z].scale}, ${fits[z].scale})` }}>
                  <img key={item.id} className={'wear-img is-' + dir} src={full} alt={`${ZONE_LABEL[z]}: ${item.name}`} draggable={false} />
                </div>
              )
            }
            return (
              <div key={z} className={'wear' + (fitZone === z ? ' is-fitting' : '')} style={{ width: p.w * 100 + '%', ...(p.anchor === 'top' ? { top: p.y * 100 + '%' } : { bottom: (1 - p.y) * 100 + '%' }) }}>
                {z === 'shoes' && item.wearImage ? (
                  <div key={item.id} className={'wear-pair wear-img is-' + dir} role="img" aria-label={`${ZONE_LABEL[z]}: ${item.name}`}>
                    <img src={urlFor(item.wearImage)} alt="" draggable={false} />
                    <img src={urlFor(item.wearImage)} alt="" draggable={false} />
                  </div>
                ) : (
                  <img key={item.id} className={'wear-img is-' + dir} src={urlFor(item.image)} alt={`${ZONE_LABEL[z]}: ${item.name}`} draggable={false} />
                )}
              </div>
            )
          })}
          {!fitZone && ZONES.map((z) => (
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
            {verdict && (
              <p className={'match is-' + verdict.level} aria-live="polite"><strong>{verdict.label}</strong><span>{verdict.reason}</span></p>
            )}
            {!fitZone && (
              <button className="fab" onClick={roll} id="roll" aria-label="Zufall: Outfit würfeln">
                <IconDice /> Zufall
                {prefs.mainColor && <span className="dot is-small" style={{ ['--dot' as string]: COLORS[prefs.mainColor] }} title={'Hauptfarbe ' + prefs.mainColor} />}
              </button>
            )}
          </>
        )}
      </div>

      <div className="drawer">
        <button className="drawer-handle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Schublade verkleinern' : 'Schublade vergrößern'}><i /></button>
        {fitZone && fit ? (
          <div className="drawer-body is-fit">
            <div className="segment" role="tablist" aria-label="Zone anpassen">
              {ZONES.map((z) => <button key={z} role="tab" aria-selected={fitZone === z} className={fitZone === z ? 'is-on' : ''} onClick={() => setFitZone(z)}>{ZONE_LABEL[z]}</button>)}
            </div>
            <p className="muted">Zieh das Teil am Avatar nach oben oder unten. Mit zwei Fingern änderst du die Größe. Das gilt für alle Teile dieser Zone.</p>
            <div className="pad" role="group" aria-label={'Sitz anpassen: ' + ZONE_LABEL[fitZone]}>
              <button className="icon-btn is-outlined" id="fit-up" onClick={() => setFit(fitZone, { ...fit, dy: fit.dy - 0.005 })} aria-label="Höher"><IconUp /></button>
              <button className="icon-btn is-outlined" id="fit-down" onClick={() => setFit(fitZone, { ...fit, dy: fit.dy + 0.005 })} aria-label="Tiefer"><IconDown /></button>
              <button className="icon-btn is-outlined" id="fit-smaller" onClick={() => setFit(fitZone, { ...fit, scale: fit.scale / 1.03 })} aria-label="Kleiner"><IconMinus /></button>
              <button className="icon-btn is-outlined" id="fit-bigger" onClick={() => setFit(fitZone, { ...fit, scale: fit.scale * 1.03 })} aria-label="Größer"><IconPlus /></button>
              <span className="grow" />
              <button className="btn" onClick={() => setFit(fitZone, DEFAULT_FITS[fitZone])}>Zurücksetzen</button>
            </div>
            <button className="btn btn-primary" onClick={() => setFitZone(null)}>Fertig</button>
          </div>
        ) : (
          <>
            <div className="drawer-bar">
              <div className="segment grow" role="tablist" aria-label="Körperzone">
                {ZONES.map((z) => <button key={z} role="tab" aria-selected={zone === z} className={zone === z ? 'is-on' : ''} onClick={() => setZone(z)}>{ZONE_LABEL[z]}</button>)}
              </div>
              <button className={'icon-btn is-outlined' + (filtered || prefs.mainColor || prefs.keep.length ? ' has-mark' : '')} onClick={() => setPrefsOpen(true)} aria-label="Filter und Vorgaben für den Zufall" id="open-prefs"><IconSliders /></button>
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
                      <button key={i.id} className={'pick-tile' + (on ? ' is-on' : '')} aria-pressed={on} aria-label={i.name + (on ? ', angezogen' : ' anziehen')} title={i.name} onClick={() => wear(zone, i.id)}>
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
        )}
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
            <button className="btn" onClick={() => { setFilter({}); setPrefs({ mainColor: null, keep: [] }) }}>Zurücksetzen</button>
            <span className="grow" />
            <button className="btn btn-primary" id="roll-prefs" onClick={() => { setPrefsOpen(false); roll() }}><IconDice /> Würfeln</button>
          </div>
        </Sheet>
      )}
    </section>
  )
}
