import { useEffect, useState } from 'react'
import { IconImage } from '../icons'
import { avatarOf } from '../lib/avatar'
import { loadPhoto, toBlob } from '../lib/image'
import type { Toast } from '../main'
import { exportAll, importAll, setAvatarMode, setBody, setKnowledge, urlFor, useStore } from '../store'
import { AvatarEditor } from './AvatarEditor'
import { Sheet } from './Sheet'

const mb = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1).replace('.', ',')} MB`)
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Einstellungen: Avatar, Stil-Wissen, Sicherung, Installation und Version. Alles, was man selten braucht. */
export function Settings({ online, onClose, toast }: { online: boolean; onClose: () => void; toast: Toast }) {
  const { items, outfits, body, figure, avatarMode, knowledgeText, knowledge, persistent } = useStore()
  const [editor, setEditor] = useState(false)
  const [text, setText] = useState(knowledgeText)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'export' | 'import' | null>(null)
  const [pending, setPending] = useState<File | null>(null)
  const [usage, setUsage] = useState<{ used: number; safe: boolean } | null>(null)

  useEffect(() => {
    let gone = false
    Promise.all([navigator.storage?.estimate?.() ?? null, navigator.storage?.persisted?.() ?? false])
      .then(([e, safe]) => { if (!gone && e) setUsage({ used: e.usage ?? 0, safe: !!safe }) })
      .catch(() => {})
    return () => { gone = true }
  }, [items.length, outfits.length])

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
    const merged = (text.trim() ? text.trim() + '\n' : '') + (await file.text()).trim()
    setText(merged)
    setKnowledge(merged)
  }
  async function save() {
    setBusy('export')
    try {
      const blob = await exportAll()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `clothet-sicherung-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      window.setTimeout(() => URL.revokeObjectURL(a.href), 10000)
      toast('Die Sicherung ist gespeichert. Du findest sie bei deinen Downloads.')
    } catch {
      toast('Die Sicherung ließ sich nicht erstellen. Versuch es noch einmal.')
    }
    setBusy(null)
  }
  async function restore() {
    if (!pending) return
    setBusy('import')
    try {
      const n = await importAll(pending)
      setText(n.knowledgeText)
      toast(`Sicherung geladen: ${n.items} Teile und ${n.outfits} Outfits.`)
    } catch {
      toast('Diese Datei ist keine Clothet-Sicherung. Es wurde nichts geändert.')
    }
    setPending(null)
    setBusy(null)
  }
  const pairs = knowledge.rules.filter((r, i, all) => all.findIndex((x) => x.a === r.a && x.b === r.b) === i)
  const av = avatarOf(body, figure, avatarMode)

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
              <p className="muted">{figure?.face ? 'Dein Gesicht sitzt auf einem Körpermodell. Gesicht, Körperform, Größe und Hautton passt du im Vollbild direkt am Avatar an.' : 'Aus einem Selfie und ein paar Angaben entsteht dein Avatar: weiblich oder männlich, in deiner Größe und deinem Hautton.'}</p>
              <button className={'btn' + (figure?.face ? '' : ' btn-primary')} onClick={() => setEditor(true)} id="open-editor">{figure ? 'Avatar anpassen' : 'Avatar einrichten'}</button>
            </div>
          ) : (
            <div className="avatar-side">
              <p className="muted">Nimm ein Ganzkörperfoto von dir: frontal, aufrecht, barfuß, Arme leicht ab, von Kopf bis Fuß. Es bleibt auf deinem Gerät.</p>
              <div className="actions">
                <label className="btn">
                  <IconImage /> Foto wählen
                  <input id="body-file" type="file" accept="image/*" hidden onChange={(e) => { pickBody(e.target.files?.[0]); e.target.value = '' }} />
                </label>
                {body && <button className="btn" onClick={() => setBody(null)}>Foto entfernen</button>}
              </div>
            </div>
          )}
        </div>
        {error && <p className="note is-danger" role="alert">{error}</p>}
      </div>

      <div className="field">
        <span>Stil-Wissen</span>
        <p className="muted">Schreib oder lad hoch, welche Farben für dich zusammenpassen. Eine Regel pro Zeile, zum Beispiel „Marine passt zu Beige“ oder „Rot und Rosa vermeiden“. Die Vorschläge richten sich danach.</p>
        <textarea id="knowledge" rows={5} value={text} onChange={(e) => setText(e.target.value)} onBlur={() => setKnowledge(text)} placeholder={'Marine passt zu Beige\nGrün und Braun passen gut\nRot und Rosa vermeiden'} aria-label="Stil-Wissen" />
        <div className="actions">
          <label className="btn">
            Textdatei laden
            <input id="knowledge-file" type="file" accept=".txt,.md,text/plain,text/markdown" hidden onChange={(e) => { pickText(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          <span className="grow" />
          <button className="btn btn-primary" id="save-knowledge" onClick={() => { setKnowledge(text); toast('Stil-Wissen gespeichert.') }}>Wissen speichern</button>
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

      <div className="field">
        <span>Deine Daten</span>
        <p className="muted">
          {items.length === 1 ? '1 Teil' : `${items.length} Teile`} und {outfits.length === 1 ? '1 Outfit' : `${outfits.length} Outfits`} liegen nur auf diesem Gerät{usage ? `, zusammen etwa ${mb(usage.used)}` : ''}.
          {!persistent ? ' Dieser Browser speichert gerade nichts dauerhaft.' : usage && !usage.safe ? ' Der Browser darf sie bei knappem Speicher löschen. Als installierte App sind sie besser geschützt, eine Sicherung schützt sie ganz.' : ' Eine Sicherung schützt sie, falls du das Gerät wechselst.'}
        </p>
        {pending ? (
          <div className="note is-block" role="alert">
            <strong>Sicherung laden?</strong>
            <span>Sie ersetzt alles, was jetzt im Schrank ist: Teile, Outfits, Planer und Avatar.</span>
            <div className="actions">
              <button className="btn" onClick={() => setPending(null)}>Abbrechen</button>
              <button className={'btn btn-danger' + (busy === 'import' ? ' is-busy' : '')} onClick={restore} id="confirm-import">Alles ersetzen</button>
            </div>
          </div>
        ) : (
          <div className="pick">
            <button className={'btn' + (busy === 'export' ? ' is-busy' : '')} onClick={save} id="export-data">Sicherung speichern</button>
            <label className="btn">
              Sicherung laden
              <input id="import-data" type="file" accept=".json,application/json" hidden onChange={(e) => { setPending(e.target.files?.[0] ?? null); e.target.value = '' }} />
            </label>
          </div>
        )}
      </div>

      {!standalone() && (
        <div className="field">
          <span>Als App installieren</span>
          {isIos() ? (
            <ol className="steps">
              <li>Öffne Clothet in Safari.</li>
              <li>Tipp unten auf Teilen, das Quadrat mit dem Pfeil nach oben.</li>
              <li>Wähl „Zum Home-Bildschirm“ und bestätige mit „Hinzufügen“.</li>
            </ol>
          ) : (
            <ol className="steps">
              <li>Öffne das Menü deines Browsers, die drei Punkte oben rechts.</li>
              <li>Wähl „App installieren“ oder „Zum Startbildschirm hinzufügen“.</li>
            </ol>
          )}
          <p className="muted">Danach startet Clothet wie eine App im Vollbild und läuft auch ohne Netz.</p>
        </div>
      )}

      <p className="muted" id="app-version">Clothet {__APP_VERSION__} · {online ? 'online' : 'offline, alles Gespeicherte bleibt nutzbar'}</p>
      {editor && <AvatarEditor onClose={() => setEditor(false)} toast={toast} />}
    </Sheet>
  )
}
