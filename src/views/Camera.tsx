import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '../icons'
import type { Guide } from '../lib/guides'
import { useOverlay } from '../lib/overlay'

const MAX_SIDE = 900

/**
 * Eigene Kamera im Vollbild mit Umrisslinie des Teils. Liegt für die Dauer der Aufnahme über allem; Zurück und Escape schließen sie.
 * Steht keine Kamera bereit (kein Zugriff, kein https), ruft sie onFail und der Aufrufer nimmt die Kamera des Geräts.
 */
export interface Kind { key: string; label: string; guide: Guide }
export function Camera({ title, guide: single, kinds, facing = 'environment', onShot, onClose, onFail }: { title: string; guide: Guide; kinds?: Kind[]; facing?: 'environment' | 'user'; onShot: (c: HTMLCanvasElement, kind?: string) => void; onClose: () => void; onFail: () => void }) {
  // Mit kinds wählt man unten, was man fotografiert: Die Umrisslinie wechselt mit und die Art des Teils steht damit fest
  const [kind, setKind] = useState(kinds?.[0]?.key)
  const guide = kinds?.find((k) => k.key === kind)?.guide ?? single
  const video = useRef<HTMLVideoElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)
  useOverlay(onClose, root)
  const fail = useRef(onFail)
  fail.current = onFail

  useEffect(() => {
    let stream: MediaStream | null = null
    let gone = false
    const media = navigator.mediaDevices
    if (!media?.getUserMedia) { fail.current(); return }
    media.getUserMedia({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } } })
      .then(async (s) => {
        stream = s
        if (gone) return s.getTracks().forEach((t) => t.stop())
        const v = video.current!
        v.srcObject = s
        await v.play()
        setLive(true)
      })
      .catch(() => { if (!gone) fail.current() })
    return () => {
      gone = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function shoot() {
    const v = video.current, f = frame.current
    if (!v || !f || !v.videoWidth) return
    // Genau den sichtbaren Ausschnitt aufnehmen (das Video füllt den Rahmen und ist dafür beschnitten)
    const ratio = f.clientWidth / f.clientHeight
    let sw = v.videoWidth, sh = v.videoHeight
    if (sw / sh > ratio) sw = sh * ratio
    else sh = sw / ratio
    const k = Math.min(1, MAX_SIDE / Math.max(sw, sh))
    const c = document.createElement('canvas')
    c.width = Math.round(sw * k)
    c.height = Math.round(sh * k)
    c.getContext('2d')!.drawImage(v, (v.videoWidth - sw) / 2, (v.videoHeight - sh) / 2, sw, sh, 0, 0, c.width, c.height)
    onShot(c, kind)
  }

  return createPortal(
    <div className="camera" ref={root} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
      <header className="camera-head">
        <strong>{title}</strong>
        <button className="icon-btn" onClick={onClose} aria-label="Kamera schließen"><IconClose /></button>
      </header>
      <div className="camera-frame" ref={frame}>
        <video ref={video} playsInline muted className={facing === 'user' ? 'is-mirrored' : ''} />
        <svg className="camera-guide" viewBox={guide.vb} aria-hidden="true"><path d={guide.d} /></svg>
      </div>
      <footer className="camera-foot">
        {kinds && (
          <div className="chips camera-kinds" role="group" aria-label="Was fotografierst du?">
            {kinds.map((k) => <button key={k.key} className={'chip' + (k.key === kind ? ' is-on' : '')} aria-pressed={k.key === kind} onClick={() => setKind(k.key)}>{k.label}</button>)}
          </div>
        )}
        <p>{live ? guide.hint : 'Kamera wird gestartet …'}</p>
        <button className="shutter" onClick={shoot} disabled={!live} aria-label="Foto aufnehmen" id="shutter" />
      </footer>
    </div>,
    document.body,
  )
}
