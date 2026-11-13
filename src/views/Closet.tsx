import { useMemo, useState, type ReactNode } from 'react'
import { IconPlus, IconSearch, IconSort } from '../icons'
import { fitKind } from '../lib/fitting'
import { seedSamples } from '../lib/samples'
import type { Toast } from '../main'
import { deleteItem, markSeeded, saveItem, urlFor, useStore } from '../store'
import { CATEGORIES, COLORS, SEASONS, STYLES, type Category, type Item, type Season } from '../types'
import { Sheet } from './Sheet'

const SORTS = { neu: 'Neueste zuerst', alt: 'Älteste zuerst', name: 'Name', kategorie: 'Kategorie', farbe: 'Farbe' } as const
type Sort = keyof typeof SORTS
const PAGE = 120 // so viele Kacheln auf einmal, damit auch ein sehr großer Schrank flüssig bleibt

export function Closet({ hidden, onAdd, toast, note }: { hidden: boolean; onAdd: () => void; toast: Toast; note: ReactNode }) {
  const { items } = useStore()
  const [cat, setCat] = useState<Category | null>(null)
  const [season, setSeason] = useState<Season | null>(null)
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
        (!season || i.seasons.includes(season)) &&
        (!color || i.color === color) &&
        (!needle || [i.name, i.category, i.color, i.color2, ...i.seasons, ...i.styles].join(' ').toLowerCase().includes(needle)),
    )
    const by: Record<Sort, (a: Item, b: Item) => number> = {
      neu: (a, b) => b.createdAt - a.createdAt,
      alt: (a, b) => a.createdAt - b.createdAt,
      name: (a, b) => a.name.localeCompare(b.name, 'de'),
      kategorie: (a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name, 'de'),
      farbe: (a, b) => a.color.localeCompare(b.color, 'de') || a.name.localeCompare(b.name, 'de'),
    }
    return list.sort(by[sort])
  }, [items, cat, season, color, q, sort])
  const filtered = !!cat || !!season || !!color || !!q.trim()
  const reset = () => { setCat(null); setSeason(null); setColor(null); setQ('') }
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
        <div>
          <h1>Schrank</h1>
          <p className="muted" aria-live="polite">{filtered ? `${shown.length} von ${items.length} Teilen` : items.length === 1 ? '1 Teil' : `${items.length} Teile`}</p>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={onAdd} id="add-item"><IconPlus /> Hinzufügen</button>
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
          <div className="chips" role="group" aria-label="Jahreszeit und Farbe">
            {SEASONS.map((s) => (
              <button key={s} className={'chip' + (season === s ? ' is-on' : '')} aria-pressed={season === s} onClick={() => setSeason(season === s ? null : s)}>{s}</button>
            ))}
            <span className="chips-gap" />
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

export function ItemFields({ value, onChange }: { value: Pick<Item, 'name' | 'category' | 'color' | 'seasons' | 'styles'>; onChange: (v: Partial<Item>) => void }) {
  return (
    <>
      <label className="field">
        <span>Name</span>
        <input id="item-name" type="text" value={value.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="z. B. Weißes T-Shirt" enterKeyHint="done" autoComplete="off" autoCapitalize="sentences" />
      </label>
      <div className="field">
        <span>Kategorie</span>
        <div className="chips wrap">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className={'chip' + (value.category === c ? ' is-on' : '')} aria-pressed={value.category === c} onClick={() => onChange({ category: c })}>{c}</button>
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
              <button key={s} type="button" className={'chip' + (on ? ' is-on' : '')} aria-pressed={on} onClick={() => onChange({ seasons: on ? value.seasons.filter((x) => x !== s) : [...value.seasons, s] })}>{s}</button>
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
              <button key={t} type="button" className={'chip' + (on ? ' is-on' : '')} aria-pressed={on} onClick={() => onChange({ styles: on ? value.styles.filter((x) => x !== t) : [...value.styles, t] })}>{t}</button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function ItemSheet({ item, onClose, onDelete }: { item: Item; onClose: () => void; onDelete: () => void }) {
  const [draft, setDraft] = useState(item)
  return (
    <Sheet title="Teil bearbeiten" onClose={onClose}>
      <div className="preview-tile small"><img src={urlFor(item.image)} alt={item.name} /></div>
      <ItemFields value={draft} onChange={(v) => setDraft({ ...draft, ...v })} />
      {fitKind(draft.category) && (
        <div className="field">
          <span>Am Avatar</span>
          <div className="chips wrap">
            <button className={'chip' + (!draft.flat ? ' is-on' : '')} aria-pressed={!draft.flat} onClick={() => setDraft({ ...draft, flat: false })} id="fit-shaped">An den Körper angepasst</button>
            <button className={'chip' + (draft.flat ? ' is-on' : '')} aria-pressed={!!draft.flat} onClick={() => setDraft({ ...draft, flat: true })} id="fit-flat">Flach aufgelegt</button>
          </div>
          <p className="muted">Angepasst folgt das Teil der Körperlinie, Ärmel und Hosenbeine liegen an Armen und Beinen. Sitzt es so nicht gut, nimm „Flach aufgelegt“.</p>
        </div>
      )}
      <div className="actions">
        <button className="btn btn-danger" onClick={onDelete} id="delete-item">Löschen</button>
        <span className="grow" />
        <button className="btn btn-primary" id="save-edit" onClick={() => { saveItem({ ...draft, name: draft.name.trim() || item.name, sample: false }); onClose() }}>Speichern</button>
      </div>
    </Sheet>
  )
}
