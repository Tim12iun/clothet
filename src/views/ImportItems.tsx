import { useState } from 'react'
import { IconClose, IconImage } from '../icons'
import { coverage, cutArea, detectColors, guessCategory, loadPhoto, removeBackground, toBlob, trim, type Area } from '../lib/image'
import type { Toast } from '../main'
import { addItems } from '../store'
import { uid, type Category, type Item } from '../types'
import { MarkArea } from './MarkArea'
import { Sheet } from './Sheet'

interface Row { id: string; photo: HTMLCanvasElement; cut: HTMLCanvasElement | null; area: Area | null; url: string; category: Category; color: string; color2?: string; more: boolean }
// Einzahl für den vorgeschlagenen Namen
const SINGULAR: Record<Category, string> = { Oberteile: 'Oberteil', Hosen: 'Hose', Röcke: 'Rock', Kleider: 'Kleid', Jacken: 'Jacke', Schuhe: 'Schuhe', Accessoires: 'Accessoire' }
// Das Häufigste steht direkt da, der Rest hinter „Mehr“
const MAIN: Category[] = ['Oberteile', 'Hosen', 'Schuhe']
const REST: Category[] = ['Jacken', 'Kleider', 'Röcke', 'Accessoires']
const MAX = 40

/** Freistellen klappt auf ruhigem Grund. Bleibt fast alles oder fast nichts übrig, gilt es als nicht gelungen. */
function usable(removed: HTMLCanvasElement, from: HTMLCanvasElement) {
  if (removed === from) return null
  const cov = coverage(removed)
  return cov > 0.97 || cov < 0.05 ? null : trim(removed)
}

/**
 * Viele Teile auf einmal anlegen: Bilder wählen, je Bild nur die Art antippen, speichern.
 * Freistellen, Farbe und Name laufen automatisch. Ein Tipp auf ein Bild öffnet das Markieren des Teils.
 */
export function ImportItems({ onClose, toast }: { onClose: () => void; toast: Toast }) {
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState<'load' | 'save' | null>(null)
  const [progress, setProgress] = useState('')
  const [failed, setFailed] = useState(0)
  const [marking, setMarking] = useState<string | null>(null)

  async function add(files: FileList | null) {
    if (!files?.length) return
    const list = [...files].slice(0, MAX - rows.length)
    setBusy('load')
    let bad = 0
    for (let i = 0; i < list.length; i++) {
      setProgress(`Bild ${i + 1} von ${list.length} wird vorbereitet …`)
      try {
        const photo = await loadPhoto(list[i])
        const cut = usable(removeBackground(photo, 45), photo)
        const base = cut ?? photo
        const row: Row = { id: uid(), photo, cut, area: null, url: base.toDataURL('image/png'), category: cut ? guessCategory(cut) : 'Oberteile', ...detectColors(base), more: false }
        setRows((all) => [...all, row])
        await new Promise((r) => setTimeout(r)) // Oberfläche zwischen zwei Bildern atmen lassen
      } catch {
        bad++
      }
    }
    setFailed(bad)
    setProgress('')
    setBusy(null)
  }
  const patch = (id: string, p: Partial<Row>) => setRows((all) => all.map((r) => (r.id === id ? { ...r, ...p } : r)))
  function mark(r: Row, area: Area) {
    const part = cutArea(r.photo, area)
    // Ließ sich im Rahmen nichts trennen, bleibt der Ausschnitt selbst: Alles außerhalb ist trotzdem weg
    const cut = usable(part, part) ?? part
    patch(r.id, { cut, area, url: cut.toDataURL('image/png'), ...detectColors(cut) })
    setMarking(null)
  }

  async function save() {
    if (!rows.length || busy) return
    setBusy('save')
    try {
      const now = Date.now()
      const items: Item[] = []
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        items.push({ id: uid(), name: `${SINGULAR[r.category]} in ${r.color}`, category: r.category, color: r.color, color2: r.color2, seasons: ['Frühling', 'Sommer', 'Herbst', 'Winter'], styles: [], image: await toBlob(r.cut ?? r.photo), createdAt: now - i })
      }
      await addItems(items)
      toast(items.length === 1 ? '1 Teil hängt jetzt im Schrank.' : `${items.length} Teile hängen jetzt im Schrank.`)
      onClose()
    } catch {
      setBusy(null)
      toast('Die Teile ließen sich nicht speichern. Versuch es noch einmal.')
    }
  }
  const open = rows.find((r) => r.id === marking)

  return (
    <Sheet title="Kleidung importieren" onClose={onClose}>
      {rows.length === 0 && <p className="muted">Wähl ein oder mehrere Bilder aus deinen Fotos, zum Beispiel gespeicherte Bilder aus einem Shop. Clothet schneidet die Teile aus und erkennt die Farbe. Du tippst nur an, was es ist.</p>}
      {rows.length > 0 && (
        <>
          <p className="muted">Tipp an, was es ist. Nicht sauber ausgeschnitten? Tipp auf das Bild und markier das Teil.</p>
          <ul className="days" id="import-list">
            {rows.map((r, n) => (
              <li key={r.id} className="import-row">
                <button className="import-thumb" onClick={() => setMarking(r.id)} aria-label={`Bild ${n + 1}: Teil markieren`}><img src={r.url} alt="" /></button>
                <div className="import-kinds grow" role="group" aria-label={`Art von Bild ${n + 1}`}>
                  {(r.more || REST.includes(r.category) ? [...MAIN, ...REST] : MAIN).map((c) => <button key={c} className={'chip' + (r.category === c ? ' is-on' : '')} aria-pressed={r.category === c} onClick={() => patch(r.id, { category: c })}>{SINGULAR[c]}</button>)}
                  {!r.more && !REST.includes(r.category) && <button className="chip" onClick={() => patch(r.id, { more: true })} aria-label={`Mehr Arten für Bild ${n + 1}`}>Mehr</button>}
                </div>
                <button className="icon-btn" onClick={() => setRows((all) => all.filter((x) => x.id !== r.id))} aria-label={`Bild ${n + 1} entfernen`}><IconClose /></button>
              </li>
            ))}
          </ul>
        </>
      )}
      {progress && <p className="muted" role="status">{progress}</p>}
      {failed > 0 && <p className="note is-danger" role="alert">{failed === 1 ? '1 Bild ließ sich nicht öffnen.' : `${failed} Bilder ließen sich nicht öffnen.`} Versuch es mit JPG oder PNG.</p>}
      {rows.length >= MAX && <p className="note">Mehr als {MAX} Bilder auf einmal gehen nicht. Speicher diese zuerst.</p>}
      <div className="actions">
        <label className={'btn' + (rows.length ? '' : ' btn-primary grow') + (busy === 'load' ? ' is-busy' : '')}>
          <IconImage /> {rows.length ? 'Weitere' : 'Bilder wählen'}
          <input id="import-files" type="file" accept="image/*" multiple hidden disabled={!!busy || rows.length >= MAX} onChange={(e) => { add(e.target.files); e.target.value = '' }} />
        </label>
        {rows.length > 0 && (
          <>
            <span className="grow" />
            <button className={'btn btn-primary' + (busy === 'save' ? ' is-busy' : '')} onClick={save} disabled={busy === 'load'} id="import-save">{rows.length === 1 ? '1 Teil speichern' : `${rows.length} Teile speichern`}</button>
          </>
        )}
      </div>
      {open && <MarkArea photo={open.photo} area={open.area} onDone={(a) => mark(open, a)} onClose={() => setMarking(null)} />}
    </Sheet>
  )
}
