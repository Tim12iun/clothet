import { useRef, useState, type PointerEvent } from 'react'
import { IconClose, IconDown, IconHanger, IconImage, IconPerson, IconTrash, IconUp } from '../icons'
import { loadPhoto, renderOutfit, toBlob } from '../lib/image'
import { saveOutfit, setBody, urlFor, useStore } from '../store'
import { CATEGORIES, uid, type Category, type Layer, type Outfit, type OutfitMode } from '../types'

// Startposition je Kategorie: als Collage nebeneinander, bei der Anprobe am Körper.
const PLACE: Record<OutfitMode, Record<Category, [number, number, number]>> = {
  collage: {
    Oberteile: [0.34, 0.28, 0.5], Jacken: [0.7, 0.3, 0.48], Hosen: [0.36, 0.7, 0.36],
    'Kleider & Röcke': [0.4, 0.45, 0.5], Schuhe: [0.74, 0.86, 0.34], Accessoires: [0.78, 0.6, 0.22],
  },
  body: {
    Oberteile: [0.5, 0.34, 0.44], Jacken: [0.5, 0.35, 0.5], Hosen: [0.5, 0.66, 0.3],
    'Kleider & Röcke': [0.5, 0.48, 0.42], Schuhe: [0.5, 0.93, 0.26], Accessoires: [0.5, 0.1, 0.2],
  },
}

interface Gesture {
  key: string
  start: Layer
  px: number
  py: number
  dist?: number
  angle?: number
}

export function Editor({ outfit, onClose }: { outfit?: Outfit; onClose: () => void }) {
  const { items, body } = useStore()
  const [mode, setMode] = useState<OutfitMode>(outfit?.mode ?? 'collage')
  const [layers, setLayers] = useState<Layer[]>(outfit?.layers ?? [])
  const [selected, setSelected] = useState<string | null>(null)
  const [name, setName] = useState(outfit?.name ?? '')
  const [cat, setCat] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const stage = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<Gesture | null>(null)
  const layersRef = useRef(layers)
  layersRef.current = layers

  const sel = layers.find((l) => l.key === selected)
  const patch = (key: string, p: Partial<Layer>) => setLayers((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)))

  function add(itemId: string, category: Category) {
    const [x, y, w] = PLACE[mode][category]
    const n = layers.filter((l) => l.itemId === itemId).length
    const layer: Layer = { key: uid(), itemId, x: Math.min(0.9, x + n * 0.05), y: Math.min(0.9, y + n * 0.04), w, rot: 0 }
    setLayers([...layers, layer])
    setSelected(layer.key)
  }

  function switchMode(next: OutfitMode) {
    if (next === mode) return
    // Teile an die passende Stelle für die neue Ansicht legen
    setLayers(layers.map((l) => {
      const item = items.find((i) => i.id === l.itemId)
      if (!item) return l
      const [x, y, w] = PLACE[next][item.category]
      return { ...l, x, y, w, rot: 0 }
    }))
    setMode(next)
  }

  function startGesture(key: string) {
    const layer = layersRef.current.find((l) => l.key === key)
    const pts = [...pointers.current.values()]
    if (!layer || !pts.length) return
    const g: Gesture = { key, start: { ...layer }, px: pts[0].x, py: pts[0].y }
    if (pts.length >= 2) {
      g.dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      g.angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x)
    }
    gesture.current = g
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    const hit = (e.target as HTMLElement).closest<HTMLElement>('[data-key]')
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    e.currentTarget.setPointerCapture(e.pointerId)
    const key = hit?.dataset.key ?? (pointers.current.size > 1 ? gesture.current?.key : null) ?? null
    if (!key) {
      setSelected(null)
      gesture.current = null
      return
    }
    setSelected(key)
    startGesture(key)
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    const box = stage.current?.getBoundingClientRect()
    if (!g || !box) return
    const pts = [...pointers.current.values()]
    if (pts.length >= 2 && g.dist) {
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x)
      patch(g.key, {
        w: clamp(g.start.w * (dist / g.dist), 0.06, 1.6),
        rot: Math.round(g.start.rot + ((angle - (g.angle ?? 0)) * 180) / Math.PI),
      })
    } else {
      patch(g.key, {
        x: clamp(g.start.x + (pts[0].x - g.px) / box.width, -0.1, 1.1),
        y: clamp(g.start.y + (pts[0].y - g.py) / box.height, -0.1, 1.1),
      })
    }
  }

  function onUp(e: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId)
    const key = gesture.current?.key
    if (pointers.current.size && key) startGesture(key)
    else gesture.current = null
  }

  function reorder(dir: 1 | -1) {
    const i = layers.findIndex((l) => l.key === selected)
    const j = i + dir
    if (i < 0 || j < 0 || j >= layers.length) return
    const next = [...layers]
    ;[next[i], next[j]] = [next[j], next[i]]
    setLayers(next)
  }

  async function pickBody(file?: File) {
    if (!file) return
    setError('')
    try {
      const c = await loadPhoto(file, 1400)
      await setBody(await toBlob(c, 'image/jpeg', 0.9))
    } catch {
      setError('Das Foto ließ sich nicht öffnen. Versuch es mit einem JPG oder PNG.')
    }
  }

  async function save() {
    setSaving(true)
    try {
      const tile = getComputedStyle(document.documentElement).getPropertyValue('--c-tile').trim() || '#e6eae5'
      const used = layers.filter((l) => items.some((i) => i.id === l.itemId))
      const preview = await renderOutfit(used, items, mode === 'body' ? body : null, tile)
      await saveOutfit({ id: outfit?.id ?? uid(), name: name.trim() || 'Outfit ohne Namen', mode, layers: used, preview, createdAt: outfit?.createdAt ?? Date.now() })
      onClose()
    } catch {
      setError('Das Outfit ließ sich nicht speichern. Versuch es noch einmal.')
      setSaving(false)
    }
  }

  const pickable = items.filter((i) => !cat || i.category === cat)
  const needsBody = mode === 'body' && !body

  return (
    <div className="editor">
      <header className="editor-head">
        <button className="icon-btn" onClick={onClose} aria-label="Editor schließen"><IconClose /></button>
        <input id="outfit-name" className="title-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Outfit-Name" aria-label="Name des Outfits" />
        <button className="btn btn-primary" onClick={save} disabled={saving || layers.length === 0} id="save-outfit">Outfit speichern</button>
      </header>

      <div className="editor-main">
        <div className="editor-stage-col">
          <div className="segment" role="group" aria-label="Ansicht">
            <button className={mode === 'collage' ? 'is-on' : ''} onClick={() => switchMode('collage')}><IconHanger /> Collage</button>
            <button className={mode === 'body' ? 'is-on' : ''} onClick={() => switchMode('body')}><IconPerson /> Anprobe</button>
          </div>

          <div className="stage" ref={stage} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            {mode === 'body' && body && <img className="stage-body" src={urlFor(body)} alt="Dein Ganzkörperfoto" draggable={false} />}
            {needsBody && (
              <div className="stage-empty">
                <p>Lad ein Ganzkörperfoto hoch: frontal, aufrecht, von Kopf bis Fuß. Es bleibt auf deinem Gerät.</p>
                <label className="btn btn-primary" onPointerDown={(e) => e.stopPropagation()}>
                  <IconImage /> Foto wählen
                  <input id="body-file" type="file" accept="image/*" hidden onChange={(e) => pickBody(e.target.files?.[0])} />
                </label>
              </div>
            )}
            {!needsBody && layers.length === 0 && <div className="stage-empty"><p>Tipp unten auf ein Teil, um es hier abzulegen.</p></div>}
            {!needsBody && layers.map((l) => {
              const item = items.find((i) => i.id === l.itemId)
              if (!item) return null
              return (
                <img
                  key={l.key}
                  data-key={l.key}
                  className={'layer' + (l.key === selected ? ' is-selected' : '')}
                  src={urlFor(item.image)}
                  alt={item.name}
                  draggable={false}
                  style={{ left: l.x * 100 + '%', top: l.y * 100 + '%', width: l.w * 100 + '%', transform: `translate(-50%, -50%) rotate(${l.rot}deg)` }}
                />
              )
            })}
          </div>

          {error && <p className="note is-danger">{error}</p>}

          {sel ? (
            <div className="layer-tools">
              <label className="range"><span className="muted">Größe</span>
                <input id="layer-size" type="range" min={6} max={160} value={Math.round(sel.w * 100)} onChange={(e) => patch(sel.key, { w: +e.target.value / 100 })} />
              </label>
              <label className="range"><span className="muted">Drehung</span>
                <input id="layer-rot" type="range" min={-180} max={180} value={sel.rot} onChange={(e) => patch(sel.key, { rot: +e.target.value })} />
              </label>
              <div className="tool-row">
                <button className="btn" onClick={() => reorder(1)}><IconUp /> Nach vorn</button>
                <button className="btn" onClick={() => reorder(-1)}><IconDown /> Nach hinten</button>
                <button className="icon-btn is-danger" onClick={() => { setLayers(layers.filter((l) => l.key !== sel.key)); setSelected(null) }} aria-label="Teil aus dem Outfit nehmen"><IconTrash /></button>
              </div>
            </div>
          ) : (
            <p className="muted hint">
              {mode === 'body' && body ? (
                <>Zieh die Teile an die richtige Stelle. Mit zwei Fingern änderst du Größe und Drehung.{' '}
                  <label className="link">Anderes Foto<input id="body-file-change" type="file" accept="image/*" hidden onChange={(e) => pickBody(e.target.files?.[0])} /></label></>
              ) : (
                'Zieh die Teile an ihren Platz. Mit zwei Fingern änderst du Größe und Drehung.'
              )}
            </p>
          )}
        </div>

        <div className="picker">
          <div className="chips" role="group" aria-label="Kategorie">
            <button className={'chip' + (!cat ? ' is-on' : '')} onClick={() => setCat(null)}>Alle</button>
            {CATEGORIES.filter((c) => items.some((i) => i.category === c)).map((c) => (
              <button key={c} className={'chip' + (cat === c ? ' is-on' : '')} onClick={() => setCat(cat === c ? null : c)}>{c}</button>
            ))}
          </div>
          {items.length === 0 ? (
            <p className="muted">Dein Schrank ist noch leer. Füg zuerst ein Teil hinzu.</p>
          ) : (
            <div className="picker-row">
              {pickable.map((i) => (
                <button key={i.id} className="pick-tile" onClick={() => add(i.id, i.category)} aria-label={i.name + ' ablegen'} title={i.name}>
                  <img src={urlFor(i.image)} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
