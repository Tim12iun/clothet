import { useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '../icons'
import { useOverlay } from '../lib/overlay'

/** Blatt von unten (am Desktop mittig). Schließen: Knopf, Escape, Zurück, Tipp daneben oder am Griff herunterziehen. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const scrim = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const drag = useRef<number | null>(null)
  useOverlay(onClose, sheet)

  const move = (y: number) => {
    if (drag.current === null || !sheet.current) return
    sheet.current.style.transform = `translateY(${Math.max(0, y - drag.current)}px)`
  }
  const end = (y: number) => {
    if (drag.current === null || !sheet.current) return
    const far = y - drag.current > 96
    drag.current = null
    sheet.current.style.transform = ''
    if (far) onClose()
  }

  return createPortal(
    <div className="scrim" ref={scrim} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" ref={sheet} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <header
          className="sheet-head"
          onPointerDown={(e) => { if (!(e.target as HTMLElement).closest('button')) { drag.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId) } }}
          onPointerMove={(e) => move(e.clientY)}
          onPointerUp={(e) => end(e.clientY)}
          onPointerCancel={() => end(0)}
        >
          <i className="sheet-grip" aria-hidden="true" />
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Schließen"><IconClose /></button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
