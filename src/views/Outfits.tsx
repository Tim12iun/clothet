import { useState } from 'react'
import { IconChevronLeft, IconChevronRight } from '../icons'
import { deleteOutfit, planOutfit, saveOutfit, urlFor, useStore } from '../store'
import type { Outfit } from '../types'
import { Sheet } from './Sheet'

export function Outfits({ onWear, onHome }: { onWear: (o: Outfit) => void; onHome: () => void }) {
  const { outfits } = useStore()
  const [mode, setMode] = useState<'liste' | 'kalender'>('liste')
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [name, setName] = useState('')
  const open = outfits.find((o) => o.id === openId)
  const close = () => {
    if (open && name.trim() && name.trim() !== open.name) saveOutfit({ ...open, name: name.trim() })
    setOpenId(null)
    setConfirm(false)
  }

  return (
    <section className="view">
      <header className="view-head">
        <div>
          <h1>Outfits</h1>
          <p className="muted">{outfits.length === 1 ? '1 Outfit gespeichert' : `${outfits.length} Outfits gespeichert`}</p>
        </div>
        <div className="segment" role="group" aria-label="Ansicht">
          <button className={mode === 'liste' ? 'is-on' : ''} onClick={() => setMode('liste')}>Liste</button>
          <button className={mode === 'kalender' ? 'is-on' : ''} onClick={() => setMode('kalender')}>Kalender</button>
        </div>
      </header>
      {mode === 'kalender' ? (
        <Calendar onHome={onHome} />
      ) : outfits.length === 0 ? (
        <div className="empty">
          <p>Hier hängen bald deine Outfits. Stell auf der Anprobe eins zusammen und tipp auf Speichern.</p>
          <button className="btn btn-primary" onClick={onHome}>Zur Anprobe</button>
        </div>
      ) : (
        <div className="grid">
          {outfits.map((o) => (
            <button key={o.id} className="tile" onClick={() => { setOpenId(o.id); setName(o.name) }}>
              <span className="tile-img is-full"><img src={urlFor(o.preview)} alt="" /></span>
              <span className="tile-name">{o.name}</span>
            </button>
          ))}
        </div>
      )}
      {open && (
        <Sheet title="Outfit" onClose={close}>
          <div className="preview-tile is-full"><img src={urlFor(open.preview)} alt={open.name} /></div>
          <label className="field">
            <span>Name</span>
            <input id="outfit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="actions">
            {confirm ? (
              <>
                <span className="muted grow">Outfit wirklich löschen?</span>
                <button className="btn" onClick={() => setConfirm(false)}>Behalten</button>
                <button className="btn btn-danger" onClick={() => { deleteOutfit(open.id); setOpenId(null); setConfirm(false) }}>Löschen</button>
              </>
            ) : (
              <>
                <button className="btn btn-danger" onClick={() => setConfirm(true)}>Löschen</button>
                <span className="grow" />
                <button className="btn btn-primary" id="wear-outfit" onClick={() => { close(); onWear(open) }}>Anziehen</button>
              </>
            )}
          </div>
        </Sheet>
      )}
    </section>
  )
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function Calendar({ onHome }: { onHome: () => void }) {
  const { outfits, calendar } = useStore()
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [day, setDay] = useState<string | null>(null)
  const today = iso(new Date())

  const first = (month.getDay() + 6) % 7 // Montag = 0
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => iso(new Date(month.getFullYear(), month.getMonth(), i + 1)))]
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  const planned = day ? outfits.find((o) => o.id === calendar[day]) : undefined

  return (
    <>
      <div className="month-nav">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Vorheriger Monat"><IconChevronLeft /></button>
        <strong>{month.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</strong>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Nächster Monat"><IconChevronRight /></button>
      </div>
      <div className="cal">
        {WEEKDAYS.map((w) => <span key={w} className="cal-wd">{w}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={'e' + i} />
          const o = outfits.find((x) => x.id === calendar[d])
          return (
            <button key={d} className={'cal-day' + (d === today ? ' is-today' : '')} onClick={() => setDay(d)} aria-label={new Date(d + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }) + (o ? ', ' + o.name : '')}>
              {o && <img src={urlFor(o.preview)} alt="" />}
              <span className="cal-num">{+d.slice(8)}</span>
            </button>
          )
        })}
      </div>
      {day && (
        <Sheet title={new Date(day + 'T12:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })} onClose={() => setDay(null)}>
          {outfits.length === 0 ? (
            <div className="empty">
              <p>Du hast noch kein Outfit gespeichert, das du einplanen könntest.</p>
              <button className="btn btn-primary" onClick={() => { setDay(null); onHome() }}>Zur Anprobe</button>
            </div>
          ) : (
            <>
              <p className="muted">{planned ? `Geplant: ${planned.name}. Tipp auf ein anderes Outfit, um zu tauschen.` : 'Tipp auf ein Outfit, um es für diesen Tag einzuplanen.'}</p>
              <div className="grid is-compact">
                {outfits.map((o) => (
                  <button key={o.id} className={'tile' + (planned?.id === o.id ? ' is-on' : '')} onClick={() => { planOutfit(day, o.id); setDay(null) }}>
                    <span className="tile-img is-full"><img src={urlFor(o.preview)} alt="" /></span>
                    <span className="tile-name">{o.name}</span>
                  </button>
                ))}
              </div>
              {planned && (
                <div className="actions">
                  <button className="btn" onClick={() => { planOutfit(day, null); setDay(null) }}>Tag leeren</button>
                </div>
              )}
            </>
          )}
        </Sheet>
      )}
    </>
  )
}
