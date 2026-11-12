import { useEffect, useRef, useState } from 'react'
import { IconCamera, IconImage } from '../icons'
import { coverage, detectColor, loadPhoto, removeBackground, toBlob } from '../lib/image'
import { saveItem } from '../store'
import { uid, type Category, type Season } from '../types'
import { ItemFields } from './Closet'
import { Sheet } from './Sheet'

export function AddItem({ onClose }: { onClose: () => void }) {
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null)
  const [cutout, setCutout] = useState(true)
  const [tolerance, setTolerance] = useState(45)
  const [result, setResult] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [fields, setFields] = useState({ name: '', category: 'Oberteile' as Category, color: 'Grau', seasons: ['Frühling', 'Sommer', 'Herbst', 'Winter'] as Season[] })
  const colorTouched = useRef(false)

  async function pick(file?: File) {
    if (!file) return
    setError('')
    try {
      setPhoto(await loadPhoto(file))
    } catch {
      setError('Das Foto ließ sich nicht öffnen. Versuch es mit einem JPG oder PNG.')
    }
  }

  useEffect(() => {
    if (!photo) return
    let canvas = photo
    let note = ''
    if (cutout) {
      canvas = removeBackground(photo, tolerance)
      const cov = canvas === photo ? 1 : coverage(canvas)
      if (canvas === photo || cov > 0.97) note = 'Der Hintergrund ließ sich nicht sauber trennen. Am besten klappt es auf einer einfarbigen Fläche mit etwas Rand um das Teil.'
      else if (cov < 0.08) note = 'Es ist fast nichts übrig geblieben. Stell den Regler weiter nach links.'
    }
    setHint(note)
    if (!colorTouched.current) setFields((f) => ({ ...f, color: detectColor(canvas) }))
    const url = canvas.toDataURL('image/png')
    setResult({ canvas, url })
  }, [photo, cutout, tolerance])

  async function save() {
    if (!result) return
    const image = await toBlob(result.canvas)
    await saveItem({ id: uid(), ...fields, name: fields.name.trim() || 'Neues Teil', image, createdAt: Date.now() })
    onClose()
  }

  return (
    <Sheet title="Teil hinzufügen" onClose={onClose}>
      {!photo ? (
        <>
          <p className="muted">Leg das Teil flach auf eine einfarbige Fläche und fotografier es von oben. Lass rundherum etwas Rand.</p>
          <div className="pick">
            <label className="btn btn-primary">
              <IconCamera /> Foto aufnehmen
              <input id="item-camera" type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            <label className="btn">
              <IconImage /> Aus Fotos wählen
              <input id="item-file" type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
            </label>
          </div>
          {error && <p className="note is-danger">{error}</p>}
        </>
      ) : (
        <>
          <div className="preview-tile">{result && <img src={result.url} alt="Vorschau des Teils" />}</div>
          <div className="field">
            <span>Hintergrund</span>
            <div className="chips wrap">
              <button type="button" className={'chip' + (cutout ? ' is-on' : '')} onClick={() => setCutout(true)}>Entfernen</button>
              <button type="button" className={'chip' + (!cutout ? ' is-on' : '')} onClick={() => setCutout(false)}>Behalten</button>
            </div>
            {cutout && (
              <label className="range">
                <span className="muted">weniger</span>
                <input id="cutout-tolerance" type="range" min={5} max={100} value={tolerance} onChange={(e) => setTolerance(+e.target.value)} aria-label="Wie viel Hintergrund entfernt wird" />
                <span className="muted">mehr</span>
              </label>
            )}
            {hint && <p className="note">{hint}</p>}
          </div>
          <ItemFields
            value={fields}
            onChange={(v) => {
              if (v.color) colorTouched.current = true
              setFields({ ...fields, ...v })
            }}
          />
          <div className="actions">
            <button className="btn" onClick={() => { setPhoto(null); setResult(null) }}>Anderes Foto</button>
            <span className="grow" />
            <button className="btn btn-primary" onClick={save} id="save-item">Speichern</button>
          </div>
        </>
      )}
    </Sheet>
  )
}
