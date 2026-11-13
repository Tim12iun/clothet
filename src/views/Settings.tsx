import { useState } from 'react'
import { IconImage } from '../icons'
import { MANNEQUIN_URL } from '../lib/avatar'
import { loadPhoto, toBlob } from '../lib/image'
import { setBody, setKnowledge, urlFor, useStore } from '../store'
import { Sheet } from './Sheet'

export function Settings({ onClose, onFit }: { onClose: () => void; onFit: () => void }) {
  const { body, knowledgeText, knowledge } = useStore()
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

  return (
    <Sheet title="Einstellungen" onClose={onClose}>
      <div className="field">
        <span>Avatar</span>
        <div className="avatar-row">
          <div className="avatar-thumb"><img className={body ? 'is-photo' : ''} src={body ? urlFor(body) : MANNEQUIN_URL} alt="Aktueller Avatar" /></div>
          <div className="avatar-side">
            <p className="muted">Nimm ein Ganzkörperfoto von dir: frontal, aufrecht, Arme leicht ab, von Kopf bis Fuß. Es bleibt auf deinem Gerät.</p>
            <div className="actions">
              <label className="btn">
                <IconImage /> Foto wählen
                <input id="body-file" type="file" accept="image/*" hidden onChange={(e) => pickBody(e.target.files?.[0])} />
              </label>
              {body && <button className="btn" onClick={() => setBody(null)}>Standard-Avatar</button>}
            </div>
            <button className="link" onClick={onFit}>Passform der Teile anpassen</button>
          </div>
        </div>
        {error && <p className="note is-danger">{error}</p>}
      </div>

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
