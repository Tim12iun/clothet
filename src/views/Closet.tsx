import { useMemo, useState, type ReactNode } from 'react'
import { IconDown, IconGear, IconMinus, IconPlus, IconSearch, IconSort, IconUp } from '../icons'
import { avatarOf } from '../lib/avatar'
import { fitKind } from '../lib/fitting'
import { seedSamples } from '../lib/samples'
import type { Toast } from '../main'
import { deleteItem, markSeeded, saveItem, urlFor, useStore } from '../store'
import { CATEGORIES, COLORS, NO_FIT, zoneOf, type Category, type Fit, type Item } from '../types'
import { Sheet } from './Sheet'
import { Wear } from './Wear'

const SORTS = { neu: 'Neueste zuerst', alt: 'Älteste zuerst', name: 'Name', kategorie: 'Kategorie', farbe: 'Farbe' } as const
type Sort = keyof typeof SORTS
const PAGE = 120 // so viele Kacheln auf einmal, damit auch ein sehr großer Schrank flüssig bleibt

export function Closet({ hidden, onAdd, onSettings, toast, note }: { hidden: boolean; onAdd: () => void; onSettings: () => void; toast: Toast; note: ReactNode }) {
  const { items } = useStore()
  const [cat, setCat] = useState<Category | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>('neu')
  const [limit, setLimit] = useState(PAGE)
  const [seeding, setSeeding] = useState(false)

  const usedColors = useMemo(() => Object.keys(COLORS).filter((c) => items.some((i) => i.color === c)), [items])
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = items.filter(
      (i) =>
        (!cat || i.category === cat) &&
        (!color || i.color === color) &&
        (!needle || [i.name, i.category, i.color, i.color2].join(' ').toLowerCase().includes(needle)),
    )
    const by: Record<Sort, (a: Item, b: Item) => number> = {
      neu: (a, b) => b.createdAt - a.createdAt,
      alt: (a, b) => a.createdAt - b.createdAt,
      name: (a, b) => a.name.localeCompare(b.name, 'de'),
      kategorie: (a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name, 'de'),
      farbe: (a, b) => a.color.localeCompare(b.color, 'de') || a.name.localeCompare(b.name, 'de'),
    }
    return list.sort(by[sort])
  }, [items, cat, color, q, sort])
  const filtered = !!cat || !!color || !!q.trim()
  const reset = () => { setCat(null); setColor(null); setQ('') }
  function remove(list: Item[], text: string) {
    list.forEach((i) => deleteItem(i.id))
    toast(text, () => list.forEach((i) => saveItem(i)))
  }
  async function loadSamples() {
    setSeeding(true)
    await seedSamples()
    await markSeeded()
    setSeeding(false)
  }
  const samples = items.filter((i) => i.sample)
  const open = items.find((i) => i.id === openId)

  return (
    <section className="view" hidden={hidden} aria-label="Schrank">
      <header className="view-head">
        <div className="view-title">
          <h1>Schrank</h1>
          <p className="muted" aria-live="polite">{filtered ? `${shown.length} von ${items.length} Teilen` : items.length === 1 ? '1 Teil' : `${items.length} Teile`}</p>
        </div>
        <div className="actions">
          <button className="btn btn-primary is-compact" onClick={onAdd} id="add-item"><IconPlus /> Hinzufügen</button>
          <button className="icon-btn" onClick={onSettings} aria-label="Einstellungen"><IconGear /></button>
        </div>
      </header>

      {note}
      {samples.length > 0 && (
        <p className="note">
          <span>Im Schrank liegen {samples.length} Beispiel-Teile zum Ausprobieren.</span>
          <button className="link" onClick={() => remove(samples, 'Die Beispiele sind entfernt.')}>Beispiele entfernen</button>
        </p>
      )}

      {items.length > 0 && (
        <div className="filters">
          <label className="search">
            <IconSearch />
            <input id="closet-search" type="search" inputMode="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="Im Schrank suchen" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }} aria-label="Im Schrank suchen" />
          </label>
          <div className="chips" role="group" aria-label="Kategorie">
            <button className={'chip' + (!cat ? ' is-on' : '')} aria-pressed={!cat} onClick={() => setCat(null)}>Alle</button>
            {CATEGORIES.map((c) => (
              <button key={c} className={'chip' + (cat === c ? ' is-on' : '')} aria-pressed={cat === c} onClick={() => setCat(cat === c ? null : c)}>{c}</button>
            ))}
          </div>
          <div className="filter-row">
            <div className="chips" role="group" aria-label="Farbe">
              {usedColors.map((c) => (
                <button key={c} className={'dot' + (color === c ? ' is-on' : '')} style={{ ['--dot' as string]: COLORS[c] }} onClick={() => setColor(color === c ? null : c)} aria-label={c} aria-pressed={color === c} title={c} />
              ))}
            </div>
          <label className="sort">
            <IconSort />
            <span>Sortieren</span>
            <select id="closet-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              {(Object.keys(SORTS) as Sort[]).map((k) => <option key={k} value={k}>{SORTS[k]}</option>)}
            </select>
          </label>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty">
          <p>Dein Schrank ist noch leer. Fotografier ein Teil oder wähl Bilder aus deiner Galerie, und es hängt hier.</p>
          <button className="btn btn-primary" onClick={onAdd}><IconPlus /> Teil hinzufügen</button>
          <button className={'btn' + (seeding ? ' is-busy' : '')} onClick={loadSamples} id="closet-samples">Beispiele laden</button>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty"><p>Kein Teil passt zu deiner Suche und den Filtern.</p><button className="btn" onClick={reset}>Filter zurücksetzen</button></div>
      ) : (
        <div className="grid">
          {shown.slice(0, limit).map((i) => (
            <button key={i.id} className="tile" onClick={() => setOpenId(i.id)}>
              <span className="tile-img">
                <img src={urlFor(i.image)} alt="" loading="lazy" decoding="async" />
                {i.sample && <span className="badge">Beispiel</span>}
              </span>
              <span className="tile-name">{i.name}</span>
              <span className="tile-meta">{i.category} · {i.color}{i.color2 ? ` und ${i.color2}` : ''}</span>
            </button>
          ))}
        </div>
      )}
      {shown.length > limit && <button className="btn" onClick={() => setLimit(limit + PAGE)} id="closet-more">Weitere {Math.min(PAGE, shown.length - limit)} zeigen</button>}

      {open && <ItemSheet item={open} onClose={() => setOpenId(null)} onDelete={() => { setOpenId(null); remove([open], `„${open.name}“ ist gelöscht.`) }} />}
    </section>
  )
}

export function ItemFields({ value, onChange }: { value: Pick<Item, 'category' | 'color'>; onChange: (v: Partial<Item>) => void }) {
  return (
    <div className="item-rows">
      <div className="field">
        <span>Kategorie</span>
        <div className="chips wrap">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className={'chip' + (value.category === c ? ' is-on' : '')} aria-pressed={value.category === c} onClick={() => onChange({ category: c })}>{c}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Farbe: {value.color}</span>
        <div className="chips wrap">
          {Object.keys(COLORS).map((c) => (
            <button key={c} type="button" className={'dot' + (value.color === c ? ' is-on' : '')} style={{ ['--dot' as string]: COLORS[c] }} onClick={() => onChange({ color: c })} aria-label={c} aria-pressed={value.color === c} title={c} />
          ))}
        </div>
      </div>
    </div>
  )
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function ItemSheet({ item, onClose, onDelete }: { item: Item; onClose: () => void; onDelete: () => void }) {
  const { body, figure, avatarMode } = useStore()
  const av = useMemo(() => avatarOf(body, figure, avatarMode), [body, figure, avatarMode])
  const [draft, setDraft] = useState(item)
  const zone = zoneOf(draft.category), fit = draft.fit ?? NO_FIT
  const setFit = (f: Fit) => setDraft({ ...draft, fit: { dy: clamp(f.dy, -0.14, 0.14), scale: clamp(f.scale, 0.6, 1.7) } })
  // Mit der Art ändert sich, wo und wie das Teil sitzt: Passform und Feineinstellung beginnen neu
  const change = (v: Partial<Item>) => setDraft({ ...draft, ...v, ...(v.category && v.category !== draft.category ? { fit: undefined } : {}) })
  return (
    <Sheet title="Teil bearbeiten" onClose={onClose}>
      <div className="item-edit">
      <div className="fit-row">
        {zone ? (
          <div className="stage is-mini" id="fit-stage">
            <img className={'avatar' + (av.photo ? ' is-photo' : '')} src={av.photo ? urlFor(av.photo) : av.url} alt="" draggable={false} />
            <Wear item={draft} zone={zone} isDress={draft.category === 'Kleider'} wide={av.wide} photo={!!av.photo} sex={figure?.sex} />
            {!av.photo && <img className="avatar is-front" src={av.url} alt="" aria-hidden="true" draggable={false} />}
          </div>
        ) : (
          <div className="stage is-mini is-plain"><img src={urlFor(item.image)} alt={item.name} /></div>
        )}
        <div className="fit-side">
          <label className="field">
            <span>Name</span>
            <input id="item-name" type="text" value={draft.name} onChange={(e) => change({ name: e.target.value })} placeholder="z. B. Weißes T-Shirt" enterKeyHint="done" autoComplete="off" autoCapitalize="sentences" />
          </label>
          {zone && (
            <div className="field">
              <span>Sitz am Avatar</span>
              <div className="pad" role="group" aria-label="Sitz dieses Teils">
                <button className="icon-btn is-outlined" id="fit-up" onClick={() => setFit({ ...fit, dy: fit.dy - 0.01 })} aria-label="Höher"><IconUp /></button>
                <button className="icon-btn is-outlined" id="fit-down" onClick={() => setFit({ ...fit, dy: fit.dy + 0.01 })} aria-label="Tiefer"><IconDown /></button>
                <button className="icon-btn is-outlined" id="fit-smaller" onClick={() => setFit({ ...fit, scale: fit.scale / 1.04 })} aria-label="Kleiner"><IconMinus /></button>
                <button className="icon-btn is-outlined" id="fit-bigger" onClick={() => setFit({ ...fit, scale: fit.scale * 1.04 })} aria-label="Größer"><IconPlus /></button>
              </div>
              {draft.fit && <button className="link" onClick={() => setDraft({ ...draft, fit: undefined })}>Sitz zurücksetzen</button>}
            </div>
          )}
        </div>
      </div>
      <ItemFields value={draft} onChange={change} />
      <div className="actions">
        <button className="btn btn-danger" onClick={onDelete} id="delete-item">Löschen</button>
        <span className="grow" />
        <button className="btn btn-primary" id="save-edit" onClick={() => { saveItem({ ...draft, name: draft.name.trim() || item.name, sample: false }); onClose() }}>Speichern</button>
      </div>
      </div>
    </Sheet>
  )
}
