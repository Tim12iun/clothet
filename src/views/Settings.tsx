import { useRef, useState } from 'react'
import { IconCamera, IconImage } from '../icons'
import { avatarOf } from '../lib/avatar'
import { cropFace, skinTone, toCanvas } from '../lib/face'
import { FACE_GUIDE } from '../lib/guides'
import { loadPhoto, toBlob } from '../lib/image'
import { setAvatarMode, setBody, setFigure, setKnowledge, urlFor, useStore } from '../store'
import { BUILDS, DEFAULT_FIGURE, type Figure } from '../types'
import { Camera } from './Camera'
import { Sheet } from './Sheet'

// Hauttöne zur Auswahl von hell nach dunkel (Bildinhalt der Figur, keine Oberflächenfarbe)
const SKINS = ['#f6dcc6', '#eac4a4', '#d9a67e', '#b98058', '#8d5a3b', '#5c3a25']

export function Settings({ onClose, onFit }: { onClose: () => void; onFit: () => void }) {
  const { body, figure, avatarMode, knowledgeText, knowledge } = useStore()
  const [camera, setCamera] = useState(false)
  const nativeSelfie = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(knowledgeText)
  const [error, setError] = useState('')

  async function pickBody(file?: File) {
    if (!file) return
    setError('')
    try {
      await setBody(await toBlob(await loadPhoto(file, 1400), 'image/jpeg', 0.9))
    } catch {
      setError('Das Foto ließ sich nicht öffnen. Versuch es mit einem JPG oder PNG.')
    }
  }
  async function pickText(file?: File) {
    if (!file) return
    const t = await file.text()
    const merged = (text.trim() ? text.trim() + '\n' : '') + t.trim()
    setText(merged)
    setKnowledge(merged)
  }
  const pairs = knowledge.rules.filter((r, i, all) => all.findIndex((x) => x.a === r.a && x.b === r.b) === i)

  const fig = figure ?? DEFAULT_FIGURE
  const av = avatarOf(body, figure, avatarMode)

  // Schritt 1: Aus dem Selfie entsteht sofort die Figur, mit Hautton aus dem Foto und Standardwerten.
  async function applySelfie(src: HTMLCanvasElement) {
    setError('')
    const crop = { zoom: 1, dx: 0, dy: 0 }
    const face = cropFace(src, crop)
    await setFigure({ ...fig, selfie: src.toDataURL('image/jpeg', 0.88), crop, face: face.toDataURL('image/png'), skin: skinTone(face), skinAuto: true, tone: 0 })
    setAvatarMode('figure')
  }
  async function pickSelfie(file?: File) {
    if (!file) return
    try {
      await applySelfie(await loadPhoto(file, 900))
    } catch {
      setError('Das Foto ließ sich nicht öffnen. Versuch es mit einem JPG oder PNG.')
    }
  }
  // Schritt 2: Ausschnitt nachstellen. Der Hautton folgt dem Foto, solange er nicht von Hand gewählt ist.
  async function recrop(patch: Partial<Figure['crop']>) {
    if (!fig.selfie) return
    const crop = { ...fig.crop, ...patch }
    const face = cropFace(await toCanvas(fig.selfie), crop)
    setFigure({ ...fig, crop, face: face.toDataURL('image/png'), ...(fig.skinAuto ? { skin: skinTone(face) } : {}) })
  }
  async function autoSkin() {
    if (!fig.face) return
    setFigure({ ...fig, skin: skinTone(await toCanvas(fig.face)), skinAuto: true, tone: 0 })
  }

  if (camera) {
    return (
      <Camera
        title="Selfie"
        guide={FACE_GUIDE}
        facing="user"
        onShot={(c) => { setCamera(false); applySelfie(c) }}
        onClose={() => setCamera(false)}
        onFail={() => { setCamera(false); nativeSelfie.current?.click() }}
      />
    )
  }

  return (
    <Sheet title="Einstellungen" onClose={onClose}>
      <div className="field">
        <span>Avatar</span>
        <div className="segment" role="tablist" aria-label="Art des Avatars">
          <button role="tab" aria-selected={avatarMode === 'figure'} className={avatarMode === 'figure' ? 'is-on' : ''} onClick={() => setAvatarMode('figure')}>Figur aus Selfie</button>
          <button role="tab" aria-selected={avatarMode === 'photo'} className={avatarMode === 'photo' ? 'is-on' : ''} onClick={() => setAvatarMode('photo')}>Ganzkörperfoto</button>
        </div>
        <div className="avatar-row">
          <div className="avatar-thumb"><img className={av.photo ? 'is-photo' : ''} src={av.photo ? urlFor(av.photo) : av.url} alt="Aktueller Avatar" /></div>
          {avatarMode === 'figure' ? (
            <div className="avatar-side">
              <p className="muted">{fig.face ? 'Dein Gesicht sitzt auf einer gezeichneten Figur. Unten passt du sie an.' : 'Mach ein Selfie. Daraus entsteht sofort deine Figur, mit deinem Gesicht und deinem Hautton. Es bleibt auf deinem Gerät.'}</p>
              <div className="actions">
                <button className={'btn' + (fig.face ? '' : ' btn-primary')} onClick={() => setCamera(true)} id="selfie-camera"><IconCamera /> {fig.face ? 'Neues Selfie' : 'Selfie aufnehmen'}</button>
                <label className="btn">
                  <IconImage /> Foto wählen
                  <input id="selfie-file" type="file" accept="image/*" hidden onChange={(e) => pickSelfie(e.target.files?.[0])} />
                </label>
                <input ref={nativeSelfie} type="file" accept="image/*" capture="user" hidden onChange={(e) => pickSelfie(e.target.files?.[0])} />
              </div>
            </div>
          ) : (
            <div className="avatar-side">
              <p className="muted">Nimm ein Ganzkörperfoto von dir: frontal, aufrecht, barfuß, Arme leicht ab, von Kopf bis Fuß. Es bleibt auf deinem Gerät.</p>
              <div className="actions">
                <label className="btn">
                  <IconImage /> Foto wählen
                  <input id="body-file" type="file" accept="image/*" hidden onChange={(e) => pickBody(e.target.files?.[0])} />
                </label>
                {body && <button className="btn" onClick={() => setBody(null)}>Foto entfernen</button>}
              </div>
            </div>
          )}
        </div>
        {error && <p className="note is-danger">{error}</p>}
      </div>

      {avatarMode === 'figure' && figure && (
        <>
          {fig.selfie && (
            <div className="field">
              <span>Gesicht ausrichten</span>
              <label className="range"><span className="muted">Größe</span>
                <input id="face-zoom" type="range" min={50} max={300} value={fig.crop.zoom * 100} onChange={(e) => recrop({ zoom: +e.target.value / 100 })} />
              </label>
              <label className="range"><span className="muted">Höhe</span>
                <input id="face-dy" type="range" min={-40} max={40} value={fig.crop.dy * 100} onChange={(e) => recrop({ dy: +e.target.value / 100 })} />
              </label>
              <label className="range"><span className="muted">Seite</span>
                <input id="face-dx" type="range" min={-40} max={40} value={fig.crop.dx * 100} onChange={(e) => recrop({ dx: +e.target.value / 100 })} />
              </label>
            </div>
          )}
          <div className="field">
            <span>Hautton</span>
            <div className="chips wrap">
              {fig.face && <button className={'chip' + (fig.skinAuto ? ' is-on' : '')} aria-pressed={fig.skinAuto} onClick={autoSkin}>Aus dem Selfie</button>}
              {SKINS.map((c) => {
                const on = !fig.skinAuto && fig.skin === c
                return <button key={c} className={'dot' + (on ? ' is-on' : '')} style={{ ['--dot' as string]: c }} aria-pressed={on} aria-label={'Hautton ' + (SKINS.indexOf(c) + 1) + ' von ' + SKINS.length} onClick={() => setFigure({ ...fig, skin: c, skinAuto: false, tone: 0 })} />
              })}
            </div>
            <label className="range"><span className="muted">dunkler</span>
              <input id="skin-tone" type="range" min={-25} max={25} value={(fig.tone ?? 0) * 100} onChange={(e) => setFigure({ ...fig, tone: +e.target.value / 100 })} aria-label="Hautton heller oder dunkler" />
              <span className="muted">heller</span>
            </label>
          </div>
          <div className="field">
            <span>Körpergröße</span>
            <label className="range">
              <input id="fig-height" type="range" min={140} max={210} value={fig.height} onChange={(e) => setFigure({ ...fig, height: +e.target.value })} aria-label="Körpergröße in Zentimetern" />
              <output>{fig.height} cm</output>
            </label>
          </div>
          <div className="field">
            <span>Körpertyp</span>
            <div className="chips wrap">
              {BUILDS.map((b) => <button key={b} className={'chip' + (fig.build === b ? ' is-on' : '')} aria-pressed={fig.build === b} onClick={() => setFigure({ ...fig, build: b })}>{b}</button>)}
            </div>
          </div>
        </>
      )}
      <button className="link" onClick={onFit}>Sitz der Teile am Avatar anpassen</button>

      <div className="field">
        <span>Stil-Wissen</span>
        <p className="muted">Schreib oder lad hoch, welche Farben für dich zusammenpassen. Eine Regel pro Zeile, zum Beispiel „Marine passt zu Beige“ oder „Rot und Rosa vermeiden“. Die Vorschläge richten sich danach.</p>
        <textarea id="knowledge" rows={5} value={text} onChange={(e) => setText(e.target.value)} onBlur={() => setKnowledge(text)} placeholder={'Marine passt zu Beige\nGrün und Braun passen gut\nRot und Rosa vermeiden'} />
        <div className="actions">
          <label className="btn">
            Textdatei laden
            <input id="knowledge-file" type="file" accept=".txt,.md,text/plain,text/markdown" hidden onChange={(e) => pickText(e.target.files?.[0])} />
          </label>
          <span className="grow" />
          <button className="btn btn-primary" id="save-knowledge" onClick={() => setKnowledge(text)}>Wissen speichern</button>
        </div>
        {(pairs.length > 0 || knowledge.ignored > 0) && (
          <div className="note is-block">
            <strong>{pairs.length === 1 ? '1 Regel verstanden' : `${pairs.length} Regeln verstanden`}</strong>
            {pairs.length > 0 && (
              <ul className="rules">
                {pairs.slice(0, 12).map((r, i) => (
                  <li key={i} className={r.weight > 0 ? 'is-good' : 'is-bad'}>{r.a} {r.b === '*' ? 'zu allem' : '+ ' + r.b}: {r.weight > 0 ? 'passt' : 'vermeiden'}</li>
                ))}
              </ul>
            )}
            {pairs.length > 12 && <span>und {pairs.length - 12} weitere</span>}
            {knowledge.ignored > 0 && <span>{knowledge.ignored === 1 ? '1 Zeile' : `${knowledge.ignored} Zeilen`} ohne erkennbare Farbregel übersprungen.</span>}
          </div>
        )}
      </div>
    </Sheet>
  )
}
