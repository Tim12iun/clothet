import { useRef, useState } from 'react'
import { IconClose, IconImage } from '../icons'
import { coverage, detectColors, guessCategory, loadPhoto, removeBackground, toBlob, trim } from '../lib/image'
import type { Toast } from '../main'
import { addItems } from '../store'
import { uid, type Category, type Item } from '../types'
import { Sheet } from './Sheet'

interface Row { id: string; file: string; photo: HTMLCanvasElement; cut: HTMLCanvasElement | null; url: string; category: Category; color: string; color2?: string; name: string; plain: boolean }
// Einzahl für den vorgeschlagenen Namen
const SINGULAR: Record<Category, string> = { Oberteile: 'Oberteil', Hosen: 'Hose', Röcke: 'Rock', Kleider: 'Kleid', Jacken: 'Jacke', Schuhe: 'Schuhe', Accessoires: 'Accessoire' }
// Das Häufigste zuerst
const ORDER: Category[] = ['Oberteile', 'Hosen', 'Schuhe', 'Jacken', 'Kleider', 'Röcke', 'Accessoires']
const MAX = 40

/**
 * Viele Teile auf einmal anlegen: Bilder aus der Mediathek, aus Dateien oder aus einem Shop wählen,
 * je Bild nur die Art antippen. Freistellen und Farbe laufen automatisch.
 */
export function ImportItems({ onClose, toast }: { onClose: () => void; toast: Toast }) {
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState<'load' | 'save' | null>(null)
  const [progress, setProgress] = useState('')
  const [failed, setFailed] = useState(0)
  const [cutout, setCutout] = useState(true)
  const input = useRef<HTMLInputElement>(null)

  const picture = (r: Pick<Row, 'photo' | 'cut'>, on: boolean) => (on && r.cut ? r.cut : r.photo)
  async function add(files: FileList | null) {
    if (!files?.length) return
    const list = [...files].slice(0, MAX - rows.length)
    setBusy('load')
    let bad = 0
    for (let i = 0; i < list.length; i++) {
      setProgress(`Bild ${i + 1} von ${list.length} wird vorbereitet …`)
      try {
        const photo = await loadPhoto(list[i])
        // Freistellen klappt auf ruhigem Grund (z. B. Shop-Bilder). Bleibt fast alles oder fast nichts übrig, bleibt das Bild, wie es ist.
        const removed = removeBackground(photo, 45)
        const cov = removed === photo ? 1 : coverage(removed)
        const cut = cov > 0.97 || cov < 0.05 ? null : trim(removed)
        const base = cut ?? photo
        const category = cut ? guessCategory(cut) : 'Oberteile'
        const row: Row = { id: uid(), file: list[i].name, photo, cut, url: '', category, ...detectColors(base), name: '', plain: !cut }
        setRows((all) => [...all, { ...row, url: picture(row, cutout).toDataURL('image/png') }])
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
  function toggleCutout(on: boolean) {
    setCutout(on)
    setRows((all) => all.map((r) => ({ ...r, url: picture(r, on).toDataURL('image/png') })))
  }

  async function save() {
    if (!rows.length || busy) return
    setBusy('save')
    try {
      const now = Date.now()
      const items: Item[] = []
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        const name = r.name.trim() || `${SINGULAR[r.category]} in ${r.color}`
        items.push({ id: uid(), name, category: r.category, color: r.color, color2: r.color2, seasons: ['Frühling', 'Sommer', 'Herbst', 'Winter'], styles: [], image: await toBlob(picture(r, cutout)), createdAt: now - i })
      }
      await addItems(items)
      toast(items.length === 1 ? '1 Teil hängt jetzt im Schrank.' : `${items.length} Teile hängen jetzt im Schrank.`)
      onClose()
    } catch {
      setBusy(null)
      toast('Die Teile ließen sich nicht speichern. Versuch es noch einmal.')
    }
  }

  return (
    <Sheet title="Kleidung importieren" onClose={onClose}>
      {rows.length === 0 && <p className="muted">Wähl ein oder mehrere Bilder, zum Beispiel aus deinen Fotos oder gespeicherte Bilder aus einem Shop. Danach tippst du je Bild nur an, was es ist. Am besten klappt es mit Bildern auf ruhigem, einfarbigem Grund.</p>}
      <div className="pick">
        <label className={'btn' + (rows.length ? '' : ' btn-primary') + (busy === 'load' ? ' is-busy' : '')}>
          <IconImage /> {rows.length ? 'Weitere Bilder wählen' : 'Bilder wählen'}
          <input ref={input} id="import-files" type="file" accept="image/*" multiple hidden disabled={!!busy || rows.length >= MAX} onChange={(e) => { add(e.target.files); e.target.value = '' }} />
        </label>
      </div>
      {progress && <p className="muted" role="status">{progress}</p>}
      {failed > 0 && <p className="note is-danger" role="alert">{failed === 1 ? '1 Bild ließ sich nicht öffnen.' : `${failed} Bilder ließen sich nicht öffnen.`} Versuch es mit JPG oder PNG.</p>}
      {rows.length >= MAX && <p className="note">Mehr als {MAX} Bilder auf einmal gehen nicht. Speicher diese zuerst.</p>}

      {rows.length > 0 && (
        <>
          <div className="field">
            <span>Hintergrund</span>
            <div className="chips wrap">
              <button className={'chip' + (cutout ? ' is-on' : '')} aria-pressed={cutout} onClick={() => toggleCutout(true)}>Entfernen</button>
              <button className={'chip' + (!cutout ? ' is-on' : '')} aria-pressed={!cutout} onClick={() => toggleCutout(false)}>Behalten</button>
            </div>
          </div>
          <ul className="days" id="import-list">
            {rows.map((r, n) => (
              <li key={r.id} className="import-row">
                <div className="import-top">
                  <span className="import-thumb"><img src={r.url} alt={`Bild ${n + 1}`} /></span>
                  <label className="field grow">
                    <span>Name (optional)</span>
                    <input type="text" value={r.name} onChange={(e) => patch(r.id, { name: e.target.value })} placeholder={`${SINGULAR[r.category]} in ${r.color}`} enterKeyHint="done" autoComplete="off" />
                  </label>
                  <button className="icon-btn" onClick={() => setRows((all) => all.filter((x) => x.id !== r.id))} aria-label={`Bild ${n + 1} entfernen`}><IconClose /></button>
                </div>
                <div className="chips" role="group" aria-label={`Art von Bild ${n + 1}`}>
                  {ORDER.map((c) => <button key={c} className={'chip' + (r.category === c ? ' is-on' : '')} aria-pressed={r.category === c} onClick={() => patch(r.id, { category: c })}>{SINGULAR[c]}</button>)}
                </div>
                {cutout && r.plain && <p className="muted">Hier ließ sich der Hintergrund nicht trennen, das Bild bleibt, wie es ist.</p>}
              </li>
            ))}
          </ul>
          <p className="muted">Farbe ist erkannt, die Art ist nur ein Vorschlag. Jahreszeit, Stil und bei Schuhen das Foto von vorne ergänzt du später im Schrank.</p>
          <div className="actions">
            <span className="grow" />
            <button className={'btn btn-primary' + (busy === 'save' ? ' is-busy' : '')} onClick={save} disabled={busy === 'load'} id="import-save">{rows.length === 1 ? '1 Teil speichern' : `${rows.length} Teile speichern`}</button>
          </div>
        </>
      )}
    </Sheet>
  )
}
