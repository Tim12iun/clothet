import { useMemo, useState } from 'react'
import { IconPlus, IconSearch } from '../icons'
import { deleteItem, saveItem, urlFor, useStore } from '../store'
import { CATEGORIES, COLORS, SEASONS, STYLES, type Category, type Item, type Season } from '../types'
import { Sheet } from './Sheet'

export function Closet({ onAdd }: { onAdd: () => void }) {
  const { items } = useStore()
  const [cat, setCat] = useState<Category | null>(null)
  const [season, setSeason] = useState<Season | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const usedColors = useMemo(() => Object.keys(COLORS).filter((c) => items.some((i) => i.color === c)), [items])
  const shown = items.filter(
    (i) =>
      (!cat || i.category === cat) &&
      (!season || i.seasons.includes(season)) &&
      (!color || i.color === color) &&
      (!q || [i.name, i.category, i.color, i.color2, ...i.seasons, ...i.styles].join(' ').toLowerCase().includes(q.toLowerCase())),
  )
  const samples = items.filter((i) => i.sample)
  const open = items.find((i) => i.id === openId)

  return (
    <section className="view">
      <header className="view-head">
        <div>
          <h1>Schrank</h1>
          <p className="muted">{items.length === 1 ? '1 Teil' : `${items.length} Teile`}</p>
        </div>
        <button className="btn btn-primary" onClick={onAdd} id="add-item">
          <IconPlus /> Teil hinzufügen
        </button>
      </header>

      {samples.length > 0 && (
        <p className="note">
          <span>Im Schrank liegen {samples.length} Beispiel-Teile zum Ausprobieren.</span>
          <button className="link" onClick={() => samples.forEach((s) => deleteItem(s.id))}>Beispiele entfernen</button>
        </p>
      )}

      {items.length > 0 && (
        <div className="filters">
          <label className="search">
            <IconSearch />
            <input id="closet-search" type="search" placeholder="Im Schrank suchen" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Im Schrank suchen" />
          </label>
          <div className="chips" role="group" aria-label="Kategorie">
            <button className={'chip' + (!cat ? ' is-on' : '')} onClick={() => setCat(null)}>Alle</button>
            {CATEGORIES.map((c) => (
              <button key={c} className={'chip' + (cat === c ? ' is-on' : '')} onClick={() => setCat(cat === c ? null : c)}>{c}</button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="Jahreszeit und Farbe">
            {SEASONS.map((s) => (
              <button key={s} className={'chip' + (season === s ? ' is-on' : '')} onClick={() => setSeason(season === s ? null : s)}>{s}</button>
            ))}
            <span className="chips-gap" />
            {usedColors.map((c) => (
              <button key={c} className={'dot' + (color === c ? ' is-on' : '')} style={{ ['--dot' as string]: COLORS[c] }} onClick={() => setColor(color === c ? null : c)} aria-label={c} aria-pressed={color === c} title={c} />
            ))}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty">
          <p>Dein Schrank ist noch leer. Leg ein Teil flach hin, fotografier es von oben, und es hängt hier.</p>
          <button className="btn btn-primary" onClick={onAdd}><IconPlus /> Teil hinzufügen</button>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty"><p>Kein Teil passt zu diesen Filtern.</p></div>
      ) : (
        <div className="grid">
          {shown.map((i) => (
            <button key={i.id} className="tile" onClick={() => setOpenId(i.id)}>
              <span className="tile-img">
                <img src={urlFor(i.image)} alt="" />
                {i.sample && <span className="badge">Beispiel</span>}
              </span>
              <span className="tile-name">{i.name}</span>
              <span className="tile-meta">{i.category} · {i.color}{i.color2 ? ` und ${i.color2}` : ''}</span>
            </button>
          ))}
        </div>
      )}

      {open && <ItemSheet item={open} onClose={() => setOpenId(null)} />}
    </section>
  )
}

export function ItemFields({ value, onChange }: { value: Pick<Item, 'name' | 'category' | 'color' | 'seasons' | 'styles'>; onChange: (v: Partial<Item>) => void }) {
  return (
    <>
      <label className="field">
        <span>Name</span>
        <input id="item-name" type="text" value={value.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="z. B. Weißes T-Shirt" />
      </label>
      <div className="field">
        <span>Kategorie</span>
        <div className="chips wrap">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className={'chip' + (value.category === c ? ' is-on' : '')} onClick={() => onChange({ category: c })}>{c}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Farbe</span>
        <div className="chips wrap">
          {Object.keys(COLORS).map((c) => (
            <button key={c} type="button" className={'dot' + (value.color === c ? ' is-on' : '')} style={{ ['--dot' as string]: COLORS[c] }} onClick={() => onChange({ color: c })} aria-label={c} aria-pressed={value.color === c} title={c} />
          ))}
          <span className="muted">{value.color}</span>
        </div>
      </div>
      <div className="field">
        <span>Jahreszeit</span>
        <div className="chips wrap">
          {SEASONS.map((s) => {
            const on = value.seasons.includes(s)
            return (
              <button key={s} type="button" className={'chip' + (on ? ' is-on' : '')} onClick={() => onChange({ seasons: on ? value.seasons.filter((x) => x !== s) : [...value.seasons, s] })}>{s}</button>
            )
          })}
        </div>
      </div>
      <div className="field">
        <span>Stil</span>
        <div className="chips wrap">
          {STYLES.map((t) => {
            const on = value.styles.includes(t)
            return (
              <button key={t} type="button" className={'chip' + (on ? ' is-on' : '')} onClick={() => onChange({ styles: on ? value.styles.filter((x) => x !== t) : [...value.styles, t] })}>{t}</button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function ItemSheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const [draft, setDraft] = useState(item)
  const [confirm, setConfirm] = useState(false)
  return (
    <Sheet title="Teil bearbeiten" onClose={onClose}>
      <div className="preview-tile small"><img src={urlFor(item.image)} alt={item.name} /></div>
      <ItemFields value={draft} onChange={(v) => setDraft({ ...draft, ...v })} />
      <div className="actions">
        {confirm ? (
          <>
            <span className="muted grow">Teil wirklich löschen?</span>
            <button className="btn" onClick={() => setConfirm(false)}>Behalten</button>
            <button className="btn btn-danger" onClick={() => { deleteItem(item.id); onClose() }}>Löschen</button>
          </>
        ) : (
          <>
            <button className="btn btn-danger" onClick={() => setConfirm(true)}>Löschen</button>
            <span className="grow" />
            <button className="btn btn-primary" onClick={() => { saveItem({ ...draft, name: draft.name.trim() || item.name, sample: false }); onClose() }}>Speichern</button>
          </>
        )}
      </div>
    </Sheet>
  )
}
