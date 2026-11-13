import { useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '../icons'
import type { Area } from '../lib/image'
import { useOverlay } from '../lib/overlay'

const clamp = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Bereich des Teils grob markieren: Mit dem Finger einen Rahmen um das Teil ziehen. Freigestellt wird danach nur
 * innerhalb des Rahmens, andere Dinge im Bild fallen weg.
 */
export function MarkArea({ photo, area, onDone, onClose }: { photo: HTMLCanvasElement; area?: Area | null; onDone: (a: Area) => void; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  useOverlay(onClose, root)
  const url = useMemo(() => photo.toDataURL('image/jpeg', 0.85), [photo])
  const [box, setBox] = useState<Area>(area ?? { x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
  const from = useRef<{ x: number; y: number } | null>(null)

  const at = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) }
  }
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    from.current = at(e)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const a = from.current
    if (!a) return
    const b = at(e)
    if (Math.abs(b.x - a.x) < 0.03 || Math.abs(b.y - a.y) < 0.03) return
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
        <div className="mark-photo" id="mark-photo" style={{ '--ar': photo.width / photo.height } as CSSProperties} onPointerDown={down} onPointerMove={move} onPointerUp={() => { from.current = null }} onPointerCancel={() => { from.current = null }}>
          <img src={url} alt="Dein Foto" draggable={false} />
          <div className="mark-box" style={{ left: pct(box.x), top: pct(box.y), width: pct(box.w), height: pct(box.h) }} />
        </div>
      </div>
      <footer className="camera-foot">
        <p>Zieh mit dem Finger einen Rahmen um das Teil. Nur was im Rahmen liegt, wird ausgeschnitten.</p>
        <button className="btn btn-primary" id="mark-done" onClick={() => onDone(box)}>Ausschneiden</button>
      </footer>
    </div>,
    document.body,
  )
}
