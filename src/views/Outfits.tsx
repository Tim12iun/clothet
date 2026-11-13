import { useMemo, useState, type ReactNode } from 'react'
import { IconCheck, IconChevronLeft, IconChevronRight, IconPlus } from '../icons'
import { ensureOutfit, fromIso, hasParts, iso, today as todayIso } from '../lib/outfits'
import type { Toast } from '../main'
import { deleteOutfit, planOutfit, restoreOutfit, saveOutfit, setWorn, urlFor, useStore } from '../store'
import { CATEGORIES, COLORS, ZONES, type Item, type Outfit, type Slots } from '../types'
import { Sheet } from './Sheet'

type Mode = 'liste' | 'woche' | 'monat' | 'statistik'
const MODES: { id: Mode; label: string }[] = [{ id: 'liste', label: 'Liste' }, { id: 'woche', label: 'Woche' }, { id: 'monat', label: 'Monat' }, { id: 'statistik', label: 'Statistik' }]
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const longDate = (d: string) => fromIso(d).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDate = (d: string) => fromIso(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
const times = (n: number) => (n === 0 ? 'noch nie getragen' : n === 1 ? '1-mal getragen' : `${n}-mal getragen`)
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const monday = (d: Date) => addDays(d, -((d.getDay() + 6) % 7))

interface Props { hidden: boolean; slots: Slots; onWear: (o: Outfit) => void; onHome: () => void; toast: Toast; note: ReactNode }

export function Outfits({ hidden, slots, onWear, onHome, toast, note }: Props) {
  const { outfits, calendar, worn } = useStore()
  const [mode, setMode] = useState<Mode>('liste')
  const [openId, setOpenId] = useState<string | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [name, setName] = useState('')
  const today = todayIso()
  const byId = useMemo(() => new Map(outfits.map((o) => [o.id, o])), [outfits])
  const count = useMemo(() => {
    const c = new Map<string, number>()
    for (const id of Object.values(worn)) c.set(id, (c.get(id) ?? 0) + 1)
    return c
  }, [worn])
  const lastWorn = (id: string) => Object.keys(worn).filter((d) => worn[d] === id).sort().pop()
  const open = outfits.find((o) => o.id === openId)
  const close = () => {
    if (open && name.trim() && name.trim() !== open.name) saveOutfit({ ...open, name: name.trim() })
    setOpenId(null)
  }

  /** Bestätigt mit einem Tipp, was an einem Tag getragen wurde. Ein zweiter Tipp nimmt es zurück. */
  function toggleWorn(d: string, id: string) {
    const before = worn[d] ?? null
    if (before === id) {
      setWorn(d, null)
      return toast('Der Eintrag ist entfernt.', () => setWorn(d, before))
    }
    setWorn(d, id)
    toast(d === today ? 'Für heute als getragen eingetragen.' : `Für ${shortDate(d)} als getragen eingetragen.`, () => setWorn(d, before))
  }
  function remove(o: Outfit) {
    const cal = calendar, w = worn
    deleteOutfit(o.id)
    setOpenId(null)
    toast(`„${o.name}“ ist gelöscht.`, () => restoreOutfit(o, cal, w))
  }

  const todayWorn = byId.get(worn[today]), todayPlan = byId.get(calendar[today])

  return (
    <section className="view" hidden={hidden} aria-label="Outfits">
      <header className="view-head">
        <div>
          <h1>Outfits</h1>
          <p className="muted">{outfits.length === 1 ? '1 Outfit gespeichert' : `${outfits.length} Outfits gespeichert`}</p>
        </div>
      </header>
      {note}
      <div className="segment is-wide" role="tablist" aria-label="Ansicht">
        {MODES.map((m) => <button key={m.id} role="tab" aria-selected={mode === m.id} className={mode === m.id ? 'is-on' : ''} onClick={() => setMode(m.id)} id={'mode-' + m.id}>{m.label}</button>)}
      </div>

      {mode !== 'statistik' && outfits.length > 0 && (
        <div className="today" id="today-card">
          {(todayWorn ?? todayPlan) && <img src={urlFor((todayWorn ?? todayPlan)!.preview)} alt="" />}
          <div className="today-text">
            <strong>Heute</strong>
            <span className="muted">{todayWorn ? `Getragen: ${todayWorn.name}` : todayPlan ? `Geplant: ${todayPlan.name}` : 'Noch nichts eingetragen. Was trägst du heute?'}</span>
          </div>
          {todayWorn ? (
            <button className="btn is-compact" onClick={() => setDay(today)}>Ändern</button>
          ) : todayPlan ? (
            <button className="btn btn-primary is-compact" onClick={() => toggleWorn(today, todayPlan.id)} id="confirm-today"><IconCheck /> Getragen</button>
          ) : (
            <button className="btn btn-primary is-compact" onClick={() => setDay(today)} id="pick-today">Eintragen</button>
          )}
        </div>
      )}

      {mode === 'statistik' ? (
        <Stats />
      ) : outfits.length === 0 ? (
        <div className="empty">
          <p>Hier hängen bald deine Outfits. Stell auf der Anprobe eins zusammen und tipp auf das Lesezeichen oder auf „Heute getragen“.</p>
          <button className="btn btn-primary" onClick={onHome}>Zur Anprobe</button>
        </div>
      ) : mode === 'liste' ? (
        <div className="grid">
          {outfits.map((o) => (
            <button key={o.id} className="tile" onClick={() => { setOpenId(o.id); setName(o.name) }}>
              <span className="tile-img is-full"><img src={urlFor(o.preview)} alt="" loading="lazy" decoding="async" /></span>
              <span className="tile-name">{o.name}</span>
              <span className="tile-meta">{times(count.get(o.id) ?? 0)}</span>
            </button>
          ))}
        </div>
      ) : mode === 'woche' ? (
        <Week byId={byId} onDay={setDay} onToggle={toggleWorn} />
      ) : (
        <Month byId={byId} onDay={setDay} />
      )}

      {open && (
        <Sheet title="Outfit" onClose={close}>
          <div className="preview-tile is-full"><img src={urlFor(open.preview)} alt={open.name} /></div>
          <label className="field">
            <span>Name</span>
            <input id="outfit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} enterKeyHint="done" autoComplete="off" />
          </label>
          <p className="muted">{times(count.get(open.id) ?? 0)}{lastWorn(open.id) ? `, zuletzt am ${shortDate(lastWorn(open.id)!)}` : ''}</p>
          <button className={'btn' + (worn[today] === open.id ? ' is-on' : '')} aria-pressed={worn[today] === open.id} onClick={() => toggleWorn(today, open.id)} id="outfit-worn-today"><IconCheck /> Heute getragen</button>
          <div className="actions">
            <button className="btn btn-danger" onClick={() => remove(open)} id="delete-outfit">Löschen</button>
            <span className="grow" />
            <button className="btn btn-primary" id="wear-outfit" onClick={() => { close(); onWear(open) }}>Anziehen</button>
          </div>
        </Sheet>
      )}
      {day && <DaySheet day={day} slots={slots} onClose={() => setDay(null)} onHome={onHome} toast={toast} />}
    </section>
  )
}

/** Sieben Tage untereinander. Rechts bestätigt ein Tipp, dass das Outfit getragen wurde. */
function Week({ byId, onDay, onToggle }: { byId: Map<string, Outfit>; onDay: (d: string) => void; onToggle: (d: string, id: string) => void }) {
  const { calendar, worn } = useStore()
  const [start, setStart] = useState(() => monday(new Date()))
  const today = todayIso()
  const days = Array.from({ length: 7 }, (_, i) => iso(addDays(start, i)))
  const thisWeek = iso(start) === iso(monday(new Date()))
  return (
    <>
      <div className="month-nav">
        <button className="icon-btn" onClick={() => setStart(addDays(start, -7))} aria-label="Vorherige Woche"><IconChevronLeft /></button>
        <strong>{thisWeek ? 'Diese Woche' : `${fromIso(days[0]).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })} bis ${fromIso(days[6]).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })}`}</strong>
        <button className="icon-btn" onClick={() => setStart(addDays(start, 7))} aria-label="Nächste Woche"><IconChevronRight /></button>
        {!thisWeek && <button className="btn is-compact" onClick={() => setStart(monday(new Date()))}>Heute</button>}
      </div>
      <ul className="days">
        {days.map((d, i) => {
          const w = byId.get(worn[d]), p = byId.get(calendar[d]), o = w ?? p
          const past = d <= today
          return (
            <li key={d} className={'day-row' + (d === today ? ' is-today' : '')}>
              <button className="day-main" onClick={() => onDay(d)}>
                <span className="day-date"><b>{WEEKDAYS[i]}</b>{+d.slice(8)}.</span>
                <span className="day-thumb">{o ? <img src={urlFor(o.preview)} alt="" loading="lazy" /> : <IconPlus />}</span>
                <span className="day-text">
                  <span className="truncate">{o ? o.name : past ? 'Nichts eingetragen' : 'Noch nichts geplant'}</span>
                  <span className="muted">{w ? 'Getragen' : p ? (past ? 'Geplant, nicht bestätigt' : 'Geplant') : past ? 'Tippen zum Nachtragen' : 'Tippen zum Planen'}</span>
                </span>
              </button>
              {o && past && (
                <button className={'icon-btn is-outlined day-check' + (w ? ' is-done' : '')} aria-pressed={!!w} aria-label={`${o.name} am ${shortDate(d)} getragen`} onClick={() => onToggle(d, o.id)}><IconCheck /></button>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

function Month({ byId, onDay }: { byId: Map<string, Outfit>; onDay: (d: string) => void }) {
  const { calendar, worn } = useStore()
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const today = todayIso()
  const first = (month.getDay() + 6) % 7 // Montag = 0
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => iso(new Date(month.getFullYear(), month.getMonth(), i + 1)))]
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  return (
    <>
      <div className="month-nav">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Vorheriger Monat"><IconChevronLeft /></button>
        <strong>{month.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</strong>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Nächster Monat"><IconChevronRight /></button>
      </div>
      <div className="cal">
        {WEEKDAYS.map((w) => <span key={w} className="cal-wd" aria-hidden="true">{w}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={'e' + i} />
          const w = byId.get(worn[d]), o = w ?? byId.get(calendar[d])
          return (
            <button key={d} className={'cal-day' + (d === today ? ' is-today' : '') + (w ? ' is-worn' : '')} onClick={() => onDay(d)} aria-label={shortDate(d) + (o ? `, ${w ? 'getragen' : 'geplant'}: ${o.name}` : '')}>
              {o && <img src={urlFor(o.preview)} alt="" loading="lazy" />}
              <span className="cal-num">{+d.slice(8)}</span>
              {w && <span className="check"><IconCheck /></span>}
            </button>
          )
        })}
      </div>
      <p className="muted">Ein Haken zeigt, was du getragen hast. Bilder ohne Haken sind geplant.</p>
    </>
  )
}

/** Ein Tag: Outfit wählen. Für heute und früher zählt die Wahl als getragen, für kommende Tage als geplant. */
function DaySheet({ day, slots, onClose, onHome, toast }: { day: string; slots: Slots; onClose: () => void; onHome: () => void; toast: Toast }) {
  const { outfits, calendar, worn } = useStore()
  const [busy, setBusy] = useState(false)
  const past = day <= todayIso()
  const isToday = day === todayIso()
  const wornId = worn[day], planId = calendar[day]
  const current = outfits.find((o) => o.id === (wornId ?? planId))

  function choose(id: string) {
    if (past) setWorn(day, id)
    else planOutfit(day, id)
    onClose()
    toast(past ? (isToday ? 'Für heute als getragen eingetragen.' : `Für ${shortDate(day)} als getragen eingetragen.`) : `Für ${shortDate(day)} eingeplant.`, () => (past ? setWorn(day, wornId ?? null) : planOutfit(day, planId ?? null)))
  }
  async function fromStage() {
    setBusy(true)
    try {
      choose((await ensureOutfit(slots)).outfit.id)
    } catch {
      toast('Das Outfit ließ sich nicht speichern. Versuch es noch einmal.')
      setBusy(false)
    }
  }
  function clear() {
    setWorn(day, null)
    planOutfit(day, null)
    onClose()
    toast('Der Tag ist wieder leer.', () => { if (wornId) setWorn(day, wornId); if (planId) planOutfit(day, planId) })
  }

  return (
    <Sheet title={longDate(day)} onClose={onClose}>
      <p className="muted">
        {current ? `${wornId ? 'Getragen' : 'Geplant'}: ${current.name}. ` : ''}
        {past ? 'Tipp auf das Outfit, das du getragen hast.' : 'Tipp auf ein Outfit, um es für diesen Tag einzuplanen.'}
      </p>
      {hasParts(slots) && (
        <button className={'btn' + (busy ? ' is-busy' : '')} onClick={fromStage} id="day-from-stage">Outfit aus der Anprobe nehmen</button>
      )}
      {outfits.length === 0 ? (
        <div className="empty">
          <p>Du hast noch kein Outfit gespeichert.</p>
          <button className="btn btn-primary" onClick={() => { onClose(); onHome() }}>Zur Anprobe</button>
        </div>
      ) : (
        <div className="grid is-compact">
          {outfits.map((o) => (
            <button key={o.id} className={'tile' + (current?.id === o.id ? ' is-on' : '')} aria-pressed={current?.id === o.id} onClick={() => choose(o.id)}>
              <span className="tile-img is-full"><img src={urlFor(o.preview)} alt="" loading="lazy" /></span>
              <span className="tile-name">{o.name}</span>
            </button>
          ))}
        </div>
      )}
      {isToday && planId && !wornId && <p className="muted">Geplant war „{outfits.find((o) => o.id === planId)?.name}“. Ein Tipp darauf bestätigt es.</p>}
      {(wornId || planId) && (
        <div className="actions"><button className="btn" onClick={clear} id="clear-day">Tag leeren</button></div>
      )}
    </Sheet>
  )
}

/** Zahlen zum Schrank: was da ist, was oft und was lange nicht getragen wurde. */
function Stats() {
  const { items, outfits, worn } = useStore()
  const data = useMemo(() => {
    const byOutfit = new Map(outfits.map((o) => [o.id, o]))
    const wears = new Map<string, { n: number; last: string }>()
    for (const [d, id] of Object.entries(worn)) {
      const o = byOutfit.get(id)
      if (!o) continue
      for (const z of ZONES) {
        const it = o.slots[z]
        if (!it) continue
        const w = wears.get(it) ?? { n: 0, last: '' }
        wears.set(it, { n: w.n + 1, last: d > w.last ? d : w.last })
      }
    }
    const cats = CATEGORIES.map((c) => ({ c, n: items.filter((i) => i.category === c).length })).filter((x) => x.n)
    const colors = Object.keys(COLORS).map((c) => ({ c, n: items.filter((i) => i.color === c).length })).filter((x) => x.n).sort((a, b) => b.n - a.n)
    const most = items.filter((i) => wears.has(i.id)).sort((a, b) => wears.get(b.id)!.n - wears.get(a.id)!.n).slice(0, 5)
    const idle = [...items].sort((a, b) => (wears.get(a.id)?.last ?? '').localeCompare(wears.get(b.id)?.last ?? '')).slice(0, 5)
    const limit = iso(addDays(new Date(), -29))
    return { wears, cats, colors, most, idle, days30: Object.keys(worn).filter((d) => d >= limit && byOutfit.has(worn[d])).length }
  }, [items, outfits, worn])

  if (items.length === 0) return <div className="empty"><p>Sobald Teile im Schrank hängen, siehst du hier, was du hast und was du wirklich trägst.</p></div>
  const max = Math.max(...data.cats.map((x) => x.n))
  const row = (i: Item, meta: string) => (
    <li key={i.id} className="stat-row">
      <span className="day-thumb"><img src={urlFor(i.image)} alt="" loading="lazy" /></span>
      <span className="day-text"><span className="truncate">{i.name}</span><span className="muted">{meta}</span></span>
    </li>
  )
  return (
    <>
      <dl className="facts">
        <div><dt>Teile</dt><dd>{items.length}</dd></div>
        <div><dt>Outfits</dt><dd>{outfits.length}</dd></div>
        <div><dt>Getragene Tage (30 Tage)</dt><dd>{data.days30}</dd></div>
      </dl>
      <section className="card" aria-labelledby="st-cat">
        <h3 id="st-cat">Teile je Kategorie</h3>
        <ul className="bars">
          {data.cats.map((x) => (
            <li key={x.c}><span>{x.c}</span><i style={{ ['--w' as string]: (x.n / max) * 100 + '%' }} /><b>{x.n}</b></li>
          ))}
        </ul>
      </section>
      <section className="card" aria-labelledby="st-col">
        <h3 id="st-col">Farben im Schrank</h3>
        <ul className="rules">
          {data.colors.map((x) => <li key={x.c} className="is-plain"><span className="dot is-small" style={{ ['--dot' as string]: COLORS[x.c] }} /> {x.c} {x.n}</li>)}
        </ul>
      </section>
      <section className="card" aria-labelledby="st-most">
        <h3 id="st-most">Am häufigsten getragen</h3>
        {data.most.length ? <ul className="days">{data.most.map((i) => row(i, times(data.wears.get(i.id)!.n)))}</ul> : <p className="muted">Noch nichts bestätigt. Tipp auf der Anprobe auf „Heute getragen“, dann füllt sich diese Liste.</p>}
      </section>
      <section className="card" aria-labelledby="st-idle">
        <h3 id="st-idle">Lange nicht getragen</h3>
        <ul className="days">{data.idle.map((i) => row(i, data.wears.get(i.id) ? `zuletzt am ${shortDate(data.wears.get(i.id)!.last)}` : 'noch nie getragen'))}</ul>
      </section>
    </>
  )
}
