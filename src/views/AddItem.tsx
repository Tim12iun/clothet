import { useEffect, useRef, useState } from 'react'
import { IconCamera, IconImage } from '../icons'
import { GUIDES, type GuideKey } from '../lib/guides'
import { coverage, cutArea, detectColors, loadPhoto, removeBackground, toBlob, trim, type Area } from '../lib/image'
import type { Toast } from '../main'
import { saveItem } from '../store'
import { CATEGORIES, uid, type Category, type Season, type Style } from '../types'
import { Camera } from './Camera'
import { ItemFields } from './Closet'
import { MarkArea } from './MarkArea'
import { Range } from './Range'
import { Sheet } from './Sheet'

type Which = 'main' | 'wear' // main: Bild für den Schrank, wear: Schuh von vorne für den Avatar

export function AddItem({ onClose, onImport, toast }: { onClose: () => void; onImport: () => void; toast: Toast }) {
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null)
  const [wearPhoto, setWearPhoto] = useState<HTMLCanvasElement | null>(null)
  const [cutout, setCutout] = useState(true)
  const [area, setArea] = useState<Area | null>(null) // von Hand markierter Bereich des Teils
  const [marking, setMarking] = useState(false)
  const [tolerance, setTolerance] = useState(45)
  const [result, setResult] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null)
  const [wear, setWear] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null)
  const [camera, setCamera] = useState<Which | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [hint, setHint] = useState('')
  const [fields, setFields] = useState({ name: '', category: 'Oberteile' as Category, color: 'Grau', color2: undefined as string | undefined, seasons: ['Frühling', 'Sommer', 'Herbst', 'Winter'] as Season[], styles: [] as Style[] })
  const touched = useRef({ color: false })
  const native = useRef<Record<Which, HTMLInputElement | null>>({ main: null, wear: null })
  const isShoe = fields.category === 'Schuhe'

  const take = (which: Which, c: HTMLCanvasElement) => { if (which === 'main') { setArea(null); setPhoto(c) } else setWearPhoto(c) }
  async function pick(which: Which, file?: File) {
    if (!file) return
    setError('')
    try {
      take(which, await loadPhoto(file))
    } catch {
      setError('Das Foto ließ sich nicht öffnen. Versuch es mit einem JPG oder PNG.')
    }
  }

  useEffect(() => {
    if (!photo) return
    let canvas = photo
    let note = ''
    if (cutout) {
      canvas = area ? cutArea(photo, area, tolerance) : removeBackground(photo, tolerance)
      const cov = canvas === photo ? 1 : coverage(canvas)
      if (canvas === photo || cov > 0.97) note = 'Der Hintergrund ließ sich nicht sauber trennen. Markier das Teil im Foto, dann wird nur dort ausgeschnitten.'
      else if (cov < 0.08) note = 'Es ist fast nichts übrig geblieben. Stell den Regler weiter nach links.'
    }
    setHint(note)
    // Automatisch taggen: Farben erkennen. Was der Nutzer selbst gewählt hat, bleibt.
    const auto = detectColors(canvas)
    setFields((f) => ({ ...f, ...(touched.current.color ? {} : auto) }))
    setResult({ canvas, url: canvas.toDataURL('image/png') })
  }, [photo, cutout, tolerance, area])

  useEffect(() => {
    if (!wearPhoto) return setWear(null)
    const canvas = cutout ? trim(removeBackground(wearPhoto, tolerance)) : wearPhoto
    setWear({ canvas, url: canvas.toDataURL('image/png') })
  }, [wearPhoto, cutout, tolerance])

  async function save() {
    if (!result || saving) return
    setSaving(true)
    try {
      const image = await toBlob(result.canvas)
      const wearImage = isShoe && wear ? await toBlob(wear.canvas) : undefined
      const name = fields.name.trim() || 'Neues Teil'
      await saveItem({ id: uid(), ...fields, name, image, wearImage, createdAt: Date.now() })
      toast(`„${name}“ hängt jetzt im Schrank.`)
      onClose()
    } catch {
      setSaving(false)
      setError('Das Teil ließ sich nicht speichern. Versuch es noch einmal.')
    }
  }

  const guideKey: GuideKey = camera === 'wear' ? 'Schuh von vorne' : fields.category
  const cam = camera && (
    <Camera
      title={camera === 'wear' ? 'Schuh von vorne' : isShoe ? 'Schuh von der Seite' : fields.category}
      guide={GUIDES[guideKey]}
      onShot={(c) => { take(camera, c); setCamera(null) }}
      onClose={() => setCamera(null)}
      onFail={() => { const w = camera; setCamera(null); native.current[w]?.click() }}
    />
  )

  // Zwei Wege zum Foto: eigene Kamera mit Umrisslinie oder ein vorhandenes Bild
  const sources = (which: Which, primary: boolean) => (
    <div className="pick">
      <button className={'btn' + (primary ? ' btn-primary' : '')} onClick={() => setCamera(which)} id={which + '-camera'}><IconCamera /> Foto aufnehmen</button>
      <label className="btn">
        <IconImage /> Aus Fotos wählen
        <input id={which + '-file'} type="file" accept="image/*" hidden onChange={(e) => { pick(which, e.target.files?.[0]); e.target.value = '' }} />
      </label>
      <input ref={(el) => { native.current[which] = el }} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(which, e.target.files?.[0])} />
    </div>
  )

  return (
    <Sheet title="Teil hinzufügen" onClose={onClose}>
      {!photo ? (
        <>
          <div className="field">
            <span>Was legst du an?</span>
            <div className="chips wrap">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" className={'chip' + (fields.category === c ? ' is-on' : '')} aria-pressed={fields.category === c} onClick={() => setFields({ ...fields, category: c })}>{c}</button>
              ))}
            </div>
          </div>
          <div className="guide-row">
            <svg className="guide-thumb" viewBox={GUIDES[fields.category].vb} aria-hidden="true"><path d={GUIDES[fields.category].d} /></svg>
            {isShoe ? (
              <p className="muted">Schuhe brauchen zwei Fotos von einem Schuh: zuerst von der Seite für den Schrank, danach von vorne für den Avatar. Die Kamera zeigt dir jeweils eine Umrisslinie.</p>
            ) : (
              <p className="muted">Leg das Teil flach auf eine einfarbige Fläche und fotografier es von oben. Die Kamera zeigt dir eine Umrisslinie, an der du es ausrichtest.</p>
            )}
          </div>
          {sources('main', true)}
          <button className="link" onClick={onImport} id="to-import">Mehrere Bilder auf einmal importieren</button>
          {error && <p className="note is-danger" role="alert">{error}</p>}
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
              <Range id="cutout-tolerance" label="Wie viel Hintergrund entfernt wird" min={5} max={100} step={5} value={tolerance} onChange={setTolerance} low="weniger" high="mehr" />
            )}
            {hint && <p className="note">{hint}</p>}
            {cutout && <button className="link" onClick={() => setMarking(true)} id="mark-area">{area ? 'Markierung ändern' : 'Teil im Foto markieren'}</button>}
          </div>
          {isShoe && (
            <div className="field">
              <span>Am Avatar</span>
              {wear ? (
                <>
                  <div className="preview-tile small is-pair"><img src={wear.url} alt="Schuh von vorne" /><img src={wear.url} alt="" /></div>
                  <div className="actions"><button className="btn" onClick={() => setWearPhoto(null)}>Anderes Foto von vorne</button></div>
                </>
              ) : (
                <>
                  <p className="muted">Jetzt denselben Schuh von vorne, die Spitze zeigt zu dir, leicht von oben. Den zweiten Schuh ergänzt Clothet gespiegelt.</p>
                  {sources('wear', true)}
                </>
              )}
            </div>
          )}
          <p className="muted">Die Farbe ist automatisch erkannt. Prüf sie kurz und ergänz Jahreszeit und Stil.</p>
          <ItemFields
            value={fields}
            onChange={(v) => {
              if (v.color) touched.current.color = true
              setFields({ ...fields, ...v, ...(v.color ? { color2: undefined } : {}) })
            }}
          />
          {error && <p className="note is-danger" role="alert">{error}</p>}
          <div className="actions">
            <button className="btn" onClick={() => { setPhoto(null); setResult(null); setWearPhoto(null) }}>Anderes Foto</button>
            <span className="grow" />
            <button className={'btn' + (isShoe && !wear ? '' : ' btn-primary') + (saving ? ' is-busy' : '')} onClick={save} id="save-item">{isShoe && !wear ? 'Ohne zweites Foto speichern' : 'Speichern'}</button>
          </div>
        </>
      )}
      {cam}
      {marking && photo && <MarkArea photo={photo} area={area} onDone={(a) => { setArea(a); setMarking(false) }} onClose={() => setMarking(false)} />}
    </Sheet>
  )
}
