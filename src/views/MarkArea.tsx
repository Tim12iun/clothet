import { useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '../icons'
import type { Area } from '../lib/image'
import { useOverlay } from '../lib/overlay'

const clamp = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Bereich des Teils grob markieren: Der Rahmen hat vier Ecken zum Ziehen, lässt sich verschieben oder daneben neu aufziehen. Freigestellt wird danach nur
 * innerhalb des Rahmens, andere Dinge im Bild fallen weg.
 */
export function MarkArea({ photo, area, onDone, onClose }: { photo: HTMLCanvasElement; area?: Area | null; onDone: (a: Area) => void; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  useOverlay(onClose, root)
  const url = useMemo(() => photo.toDataURL('image/jpeg', 0.85), [photo])
  const [box, setBox] = useState<Area>(area ?? { x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
  // Was die Geste gerade tut: eine Ecke ziehen (die gegenüberliegende bleibt stehen), den Rahmen verschieben oder neu aufziehen
  const drag = useRef<{ fix?: { x: number; y: number }; grab?: { x: number; y: number }; start: Area } | null>(null)

  const at = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height), rx: 30 / r.width, ry: 30 / r.height }
  }
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = at(e), x1 = box.x + box.w, y1 = box.y + box.h
    const corner = ([[box.x, box.y, x1, y1], [x1, box.y, box.x, y1], [box.x, y1, x1, box.y], [x1, y1, box.x, box.y]] as const).find(([cx, cy]) => Math.abs(p.x - cx) < p.rx && Math.abs(p.y - cy) < p.ry)
    if (corner) drag.current = { fix: { x: corner[2], y: corner[3] }, start: box }
    else if (p.x > box.x && p.x < x1 && p.y > box.y && p.y < y1) drag.current = { grab: { x: p.x - box.x, y: p.y - box.y }, start: box }
    else drag.current = { fix: { x: p.x, y: p.y }, start: box }
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const g = drag.current
    if (!g) return
    const b = at(e)
    if (g.grab) return setBox({ ...g.start, x: Math.min(1 - g.start.w, Math.max(0, b.x - g.grab.x)), y: Math.min(1 - g.start.h, Math.max(0, b.y - g.grab.y)) })
    const a = g.fix!
    if (Math.abs(b.x - a.x) < 0.05 || Math.abs(b.y - a.y) < 0.05) return
    setBox({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) })
  }
  const pct = (v: number) => `${v * 100}%`

  return createPortal(
    <div className="camera" ref={root} role="dialog" aria-modal="true" aria-label="Teil markieren" tabIndex={-1}>
      <header className="camera-head">
        <strong>Teil markieren</strong>
        <button className="icon-btn" onClick={onClose} aria-label="Markieren schließen"><IconClose /></button>
      </header>
      <div className="mark-frame">
        <div className="mark-photo" id="mark-photo" style={{ '--ar': photo.width / photo.height } as CSSProperties} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
          <img src={url} alt="Dein Foto" draggable={false} />
          <div className="mark-box" style={{ left: pct(box.x), top: pct(box.y), width: pct(box.w), height: pct(box.h) }}><i /><i /><i /><i /></div>
        </div>
      </div>
      <footer className="camera-foot">
        <p>Zieh die Ecken, bis der Rahmen knapp um das Teil liegt. Nur was im Rahmen liegt, wird ausgeschnitten.</p>
        <button className="btn btn-primary" id="mark-done" onClick={() => onDone(box)}>Ausschneiden</button>
      </footer>
    </div>,
    document.body,
  )
}
