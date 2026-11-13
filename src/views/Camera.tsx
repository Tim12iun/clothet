import { useEffect, useRef, useState } from 'react'
import { IconClose } from '../icons'
import type { Guide } from '../lib/guides'

const MAX_SIDE = 900

/**
 * Eigene Kamera im Vollbild mit Umrisslinie des Teils. Ersetzt für die Dauer der Aufnahme das Sheet.
 * Steht keine Kamera bereit (kein Zugriff, kein https), ruft sie onFail und der Aufrufer nimmt die Kamera des Geräts.
 */
export function Camera({ title, guide, onShot, onClose, onFail }: { title: string; guide: Guide; onShot: (c: HTMLCanvasElement) => void; onClose: () => void; onFail: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)
  const fail = useRef(onFail)
  fail.current = onFail

  useEffect(() => {
    let stream: MediaStream | null = null
    let gone = false
    const media = navigator.mediaDevices
    if (!media?.getUserMedia) { fail.current(); return }
    media.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } } })
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
    onShot(c)
  }

  return (
    <div className="camera" role="dialog" aria-modal="true" aria-label={title}>
      <header className="camera-head">
        <strong>{title}</strong>
        <button className="icon-btn" onClick={onClose} aria-label="Kamera schließen"><IconClose /></button>
      </header>
      <div className="camera-frame" ref={frame}>
        <video ref={video} playsInline muted />
        <svg className="camera-guide" viewBox={guide.vb} aria-hidden="true"><path d={guide.d} /></svg>
      </div>
      <footer className="camera-foot">
        <p>{guide.hint}</p>
        <button className="shutter" onClick={shoot} disabled={!live} aria-label="Foto aufnehmen" id="shutter" />
      </footer>
    </div>
  )
}
