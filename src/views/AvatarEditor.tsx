import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconCamera, IconChevronLeft, IconChevronRight, IconDown, IconImage, IconMinus, IconPlus, IconUp } from '../icons'
import { FACE_BOX, figureUrl, headScale } from '../lib/avatar'
import { cropFace, cropRect, skinTone, toCanvas } from '../lib/face'
import { FACE_GUIDE } from '../lib/guides'
import { loadPhoto } from '../lib/image'
import { useOverlay } from '../lib/overlay'
import type { Toast } from '../main'
import { setAvatarMode, setFigure, useStore } from '../store'
import { BUILDS, DEFAULT_FIGURE, SEXES, type Figure } from '../types'
import { Camera } from './Camera'
import { Range } from './Range'

// Hauttöne zur Auswahl von hell nach dunkel (Bildinhalt der Figur, keine Oberflächenfarbe)
const SKINS = ['#f6dcc6', '#eac4a4', '#d9a67e', '#b98058', '#8d5a3b', '#5c3a25']
type Crop = Figure['crop']
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const fix = (c: Crop): Crop => ({ zoom: clamp(c.zoom, 0.5, 4), dx: clamp(c.dx, -0.5, 0.5), dy: clamp(c.dy, -0.5, 0.5) })

/**
 * Avatar im Vollbild einrichten. Gesicht: Das Selfie liegt direkt am großen Avatar und wird mit dem Finger
 * verschoben, mit zwei Fingern vergrößert. Körper: Form, Hautton, Größe und Statur, jede Änderung ist sofort zu sehen.
 */
export function AvatarEditor({ onClose, toast }: { onClose: () => void; toast: Toast }) {
  const { figure } = useStore()
  const fig = figure ?? DEFAULT_FIGURE
  const figRef = useRef(fig)
  figRef.current = fig
  const root = useRef<HTMLDivElement>(null)
  const layer = useRef<SVGSVGElement>(null)
  const [tab, setTab] = useState<'face' | 'body'>(fig.selfie ? 'body' : 'face')
  const [crop, setCropState] = useState<Crop>(fig.crop)
  const cropRef = useRef(crop)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [camera, setCamera] = useState(false)
  const [busy, setBusy] = useState(false)
  const source = useRef<HTMLCanvasElement | null>(null)
  const native = useRef<HTMLInputElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const last = useRef<{ x: number; y: number; d: number } | null>(null)
  const timer = useRef(0)
  useOverlay(onClose, root)

  // Das Selfie einmal als Bildfläche bereithalten: daraus wird der Ausschnitt geschnitten.
  useEffect(() => {
    let gone = false
    source.current = null
    setSize(null)
    if (fig.selfie) toCanvas(fig.selfie).then((c) => { if (!gone) { source.current = c; setSize({ w: c.width, h: c.height }) } }).catch(() => {})
    return () => { gone = true }
  }, [fig.selfie])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const setCrop = (c: Crop) => { cropRef.current = c; setCropState(c) }
  /** Übernimmt den Ausschnitt in die Figur. Der Hautton folgt dem Foto, solange er nicht von Hand gewählt ist. */
  function commit() {
    window.clearTimeout(timer.current)
    const src = source.current, f = figRef.current
    if (!src) return
    const face = cropFace(src, cropRef.current)
    setFigure({ ...f, crop: cropRef.current, face: face.toDataURL('image/png'), ...(f.skinAuto ? { skin: skinTone(face) } : {}) })
  }
  const commitSoon = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(commit, 350) }
  const nudge = (patch: Partial<Crop>) => { setCrop(fix({ ...cropRef.current, ...patch })); commitSoon() }

  // Schritt 1: Aus dem Selfie entsteht sofort die Figur. Danach wird das Gesicht direkt am Avatar zurechtgerückt.
  async function applySelfie(src: HTMLCanvasElement) {
    const c = { zoom: 1, dx: 0, dy: 0 }
    const face = cropFace(src, c)
    setCrop(c)
    await setFigure({ ...figRef.current, selfie: src.toDataURL('image/jpeg', 0.88), crop: c, face: face.toDataURL('image/png'), skin: skinTone(face), skinAuto: true, tone: 0 })
    setAvatarMode('figure')
    setTab('face')
  }
  async function pickSelfie(file?: File) {
    if (!file) return
    setBusy(true)
    try {
      await applySelfie(await loadPhoto(file, 900))
    } catch {
      toast('Das Foto ließ sich nicht öffnen. Versuch es mit einem JPG oder PNG.')
    }
    setBusy(false)
  }
  const patch = (p: Partial<Figure>) => { setFigure({ ...figRef.current, ...p }); setAvatarMode('figure') }
  async function autoSkin() {
    const f = figRef.current
    if (f.face) setFigure({ ...f, skin: skinTone(await toCanvas(f.face)), skinAuto: true, tone: 0 })
  }

  // Gesten am Avatar: ein Finger verschiebt, zwei Finger vergrößern
  const editing = tab === 'face' && !!size
  const head = headScale(fig)
  const measure = () => {
    const p = [...pointers.current.values()]
    const x = p.reduce((s, q) => s + q.x, 0) / p.length, y = p.reduce((s, q) => s + q.y, 0) / p.length
    return { x, y, d: p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0 }
  }
  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!editing) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    last.current = measure()
  }
  function onMove(e: React.PointerEvent) {
    if (!editing || !size || !pointers.current.has(e.pointerId) || !last.current || !layer.current) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const now = measure(), was = last.current, c = cropRef.current
    last.current = now
    const zoom = was.d && now.d ? c.zoom * (now.d / was.d) : c.zoom
    // Bildschirmpunkte in Pixel des Selfies umrechnen
    const perUnit = (layer.current.getBoundingClientRect().width / 300) * head
    const perPixel = perUnit * (FACE_BOX.w / cropRect(size.w, size.h, c).w)
    setCrop(fix({ zoom, dx: c.dx - (now.x - was.x) / perPixel / size.w, dy: c.dy - (now.y - was.y) / perPixel / size.h }))
  }
  function onUp(e: React.PointerEvent) {
    if (!pointers.current.delete(e.pointerId)) return
    if (pointers.current.size) last.current = measure()
    else { last.current = null; commit() }
  }
  function onKey(e: React.KeyboardEvent) {
    if (!editing) return
    const c = cropRef.current, s = 0.01
    const map: Record<string, Partial<Crop>> = { ArrowLeft: { dx: c.dx + s }, ArrowRight: { dx: c.dx - s }, ArrowUp: { dy: c.dy + s }, ArrowDown: { dy: c.dy - s }, '+': { zoom: c.zoom * 1.06 }, '-': { zoom: c.zoom / 1.06 } }
    if (map[e.key]) { e.preventDefault(); nudge(map[e.key]) }
  }

  const bodyUrl = useMemo(() => figureUrl(fig, { face: !editing }), [fig.skin, fig.tone, fig.height, fig.build, fig.sex, fig.face, editing]) // eslint-disable-line react-hooks/exhaustive-deps
  const img = size && (() => {
    const r = cropRect(size.w, size.h, crop), k = FACE_BOX.w / r.w
    return { x: FACE_BOX.x - r.x * k, y: FACE_BOX.y - r.y * k, width: size.w * k, height: size.h * k }
  })()
  const sources = (primary: boolean) => (
    <div className="pick">
      <button className={'btn' + (primary ? ' btn-primary' : '') + (busy ? ' is-busy' : '')} onClick={() => setCamera(true)} id="selfie-camera"><IconCamera /> {primary ? 'Selfie aufnehmen' : 'Neues Selfie'}</button>
      <label className="btn">
        <IconImage /> Foto wählen
        <input id="selfie-file" type="file" accept="image/*" hidden onChange={(e) => { pickSelfie(e.target.files?.[0]); e.target.value = '' }} />
      </label>
      <input ref={native} type="file" accept="image/*" capture="user" hidden onChange={(e) => { pickSelfie(e.target.files?.[0]); e.target.value = '' }} />
    </div>
  )

  return createPortal(
    <div className={'editor is-' + tab} ref={root} role="dialog" aria-modal="true" aria-label="Avatar einrichten" tabIndex={-1}>
      <header className="editor-head">
        <h2>Avatar einrichten</h2>
        <button className="btn btn-primary" onClick={onClose} id="editor-done">Fertig</button>
      </header>
      <div
        className={'editor-stage' + (editing ? ' is-editing' : '')}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onWheel={(e) => editing && nudge({ zoom: cropRef.current.zoom * Math.exp(-e.deltaY * 0.002) })}
        onKeyDown={onKey}
        tabIndex={editing ? 0 : undefined}
        role={editing ? 'group' : undefined}
        aria-label={editing ? 'Gesicht am Avatar. Pfeiltasten verschieben, Plus und Minus ändern die Größe.' : undefined}
        id="editor-stage"
      >
        <div className="editor-figure">
          <img src={bodyUrl} alt={editing ? '' : 'Dein Avatar'} draggable={false} />
          {editing && img && (
            <svg ref={layer} viewBox="0 0 300 400" aria-hidden="true">
              <defs><clipPath id="editor-face"><ellipse cx="150" cy="43.5" rx="20" ry="27.5" /></clipPath></defs>
              <g transform={`translate(${FACE_BOX.pivotX} ${FACE_BOX.pivotY}) scale(${head}) translate(${-FACE_BOX.pivotX} ${-FACE_BOX.pivotY})`}>
                <g clipPath="url(#editor-face)"><image href={fig.selfie!} preserveAspectRatio="none" {...img} /></g>
                <ellipse className="editor-ring" cx="150" cy="43.5" rx="20" ry="27.5" />
              </g>
            </svg>
          )}
        </div>
      </div>
      <div className="editor-panel">
        <div className="segment" role="tablist" aria-label="Was du anpasst">
          <button role="tab" aria-selected={tab === 'face'} className={tab === 'face' ? 'is-on' : ''} onClick={() => setTab('face')} id="editor-tab-face">Gesicht</button>
          <button role="tab" aria-selected={tab === 'body'} className={tab === 'body' ? 'is-on' : ''} onClick={() => { commit(); setTab('body') }} id="editor-tab-body">Körper</button>
        </div>
        {tab === 'face' ? (
          fig.selfie ? (
            <>
              <p className="muted">Zieh dein Gesicht mit dem Finger an die richtige Stelle. Mit zwei Fingern machst du es größer oder kleiner.</p>
              <div className="pad" role="group" aria-label="Gesicht ausrichten">
                <button className="icon-btn is-outlined" onClick={() => nudge({ zoom: crop.zoom / 1.08 })} aria-label="Gesicht kleiner" id="face-smaller"><IconMinus /></button>
                <button className="icon-btn is-outlined" onClick={() => nudge({ zoom: crop.zoom * 1.08 })} aria-label="Gesicht größer" id="face-bigger"><IconPlus /></button>
                <span className="grow" />
                <button className="icon-btn is-outlined" onClick={() => nudge({ dx: crop.dx + 0.012 })} aria-label="Gesicht nach links"><IconChevronLeft /></button>
                <button className="icon-btn is-outlined" onClick={() => nudge({ dy: crop.dy + 0.012 })} aria-label="Gesicht nach oben"><IconUp /></button>
                <button className="icon-btn is-outlined" onClick={() => nudge({ dy: crop.dy - 0.012 })} aria-label="Gesicht nach unten"><IconDown /></button>
                <button className="icon-btn is-outlined" onClick={() => nudge({ dx: crop.dx - 0.012 })} aria-label="Gesicht nach rechts"><IconChevronRight /></button>
              </div>
              {sources(false)}
            </>
          ) : (
            <>
              <p className="muted">Mach ein Selfie. Daraus entsteht sofort dein Avatar, mit deinem Gesicht und deinem Hautton. Das Foto bleibt auf deinem Gerät.</p>
              {sources(true)}
            </>
          )
        ) : (
          <>
            <div className="field">
              <span>Körperform</span>
              <div className="segment" role="group" aria-label="Körperform">
                {SEXES.map((s) => <button key={s} aria-pressed={(fig.sex ?? 'Männlich') === s} className={(fig.sex ?? 'Männlich') === s ? 'is-on' : ''} onClick={() => patch({ sex: s })}>{s}</button>)}
              </div>
            </div>
            <div className="field">
              <span>Körpertyp</span>
              <div className="chips wrap">
                {BUILDS.map((b) => <button key={b} className={'chip' + (fig.build === b ? ' is-on' : '')} aria-pressed={fig.build === b} onClick={() => patch({ build: b })}>{b}</button>)}
              </div>
            </div>
            <div className="field">
              <span>Körpergröße</span>
              <Range id="fig-height" label="Körpergröße in Zentimetern" min={140} max={210} value={fig.height} onChange={(v) => patch({ height: v })} low="kleiner" high="größer" output={`${fig.height} cm`} />
            </div>
            <div className="field">
              <span>Hautton</span>
              <div className="swatches">
                {fig.face && <button className={'swatch-any' + (fig.skinAuto ? ' is-on' : '')} aria-pressed={fig.skinAuto} aria-label="Aus dem Selfie" onClick={autoSkin}>Selfie</button>}
                {SKINS.map((c, i) => {
                  const on = !fig.skinAuto && fig.skin === c
                  return <button key={c} className={'dot' + (on ? ' is-on' : '')} style={{ ['--dot' as string]: c }} aria-pressed={on} aria-label={`Hautton ${i + 1} von ${SKINS.length}`} onClick={() => patch({ skin: c, skinAuto: false, tone: 0 })} />
                })}
              </div>
              <Range id="skin-tone" label="Hautton" min={-25} max={25} step={5} value={Math.round((fig.tone ?? 0) * 100)} onChange={(v) => patch({ tone: v / 100 })} low="dunkler" high="heller" />
            </div>
          </>
        )}
      </div>
      {camera && (
        <Camera
          title="Selfie"
          guide={FACE_GUIDE}
          facing="user"
          onShot={(c) => { setCamera(false); applySelfie(c) }}
          onClose={() => setCamera(false)}
          onFail={() => { setCamera(false); native.current?.click() }}
        />
      )}
    </div>,
    document.body,
  )
}
