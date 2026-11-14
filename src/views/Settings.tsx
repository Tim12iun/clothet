import { useEffect, useState } from 'react'
import { IconImage } from '../icons'
import { avatarOf } from '../lib/avatar'
import { loadPhoto, toBlob } from '../lib/image'
import type { Toast } from '../main'
import { exportAll, importAll, setAvatarMode, setBody, setCategories, setFigure, setKnowledge, urlFor, useCategories, useStore } from '../store'
import { CATEGORIES, DEFAULT_FIGURE, SEXES, type Category, type Sex } from '../types'
import { AvatarEditor } from './AvatarEditor'
import { Sheet } from './Sheet'

const mb = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1).replace('.', ',')} MB`)
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Einstellungen: Avatar, Farbregeln, Sicherung, Installation und Version. Alles, was man selten braucht. */
export function Settings({ online, onClose, toast }: { online: boolean; onClose: () => void; toast: Toast }) {
  const { items, outfits, body, figure, avatarMode, knowledgeText, knowledge, persistent } = useStore()
  const cats = useCategories()
  const sex: Sex = figure?.sex ?? 'Männlich'
  // Männlich oder weiblich gilt für die Figur und setzt die Kategorien auf die passende Vorgabe zurück
  const pickSex = (s: Sex) => { setFigure({ ...(figure ?? DEFAULT_FIGURE), sex: s }); setCategories(null) }
  const used = (c: Category) => items.some((i) => i.category === c)
  function toggle(c: Category) {
    if (used(c)) return toast(`Im Schrank liegen noch ${c}. Solange bleibt die Kategorie an.`)
    const next = cats.includes(c) ? cats.filter((x) => x !== c) : CATEGORIES.filter((x) => x === c || cats.includes(x))
    if (next.length) setCategories(next)
  }
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
      <section className="card" aria-labelledby="set-avatar">
        <h3 id="set-avatar">Avatar</h3>
        <div className="segment" role="tablist" aria-label="Art des Avatars">
          <button role="tab" aria-selected={avatarMode === 'figure'} className={avatarMode === 'figure' ? 'is-on' : ''} onClick={() => setAvatarMode('figure')}>Figur aus Selfie</button>
          <button role="tab" aria-selected={avatarMode === 'photo'} className={avatarMode === 'photo' ? 'is-on' : ''} onClick={() => setAvatarMode('photo')}>Ganzkörperfoto</button>
        </div>
        <div className="avatar-row">
          <div className="avatar-thumb"><img className={av.photo ? 'is-photo' : ''} src={av.photo ? urlFor(av.photo) : av.url} alt="Aktueller Avatar" /></div>
          {avatarMode === 'figure' ? (
            <div className="avatar-side">
              <p className="muted">{figure?.face ? 'Gesicht, Körperform, Größe und Hautton passt du direkt am Avatar an.' : 'Aus einem Selfie und ein paar Angaben entsteht dein Avatar in deiner Größe und deinem Hautton.'}</p>
              <button className={'btn' + (figure?.face ? '' : ' btn-primary')} onClick={() => setEditor(true)} id="open-editor">{figure ? 'Avatar anpassen' : 'Avatar einrichten'}</button>
            </div>
          ) : (
            <div className="avatar-side">
              <p className="muted">Ein Foto von dir von Kopf bis Fuß: frontal, aufrecht, Arme leicht ab. Es bleibt auf deinem Gerät.</p>
              <div className="actions">
                <label className="btn">
                  <IconImage /> Foto wählen
                  <input id="body-file" type="file" accept="image/*" hidden onChange={(e) => { pickBody(e.target.files?.[0]); e.target.value = '' }} />
                </label>
                {body && <button className="btn" onClick={() => setBody(null)}>Entfernen</button>}
              </div>
            </div>
          )}
        </div>
        {error && <p className="note is-danger" role="alert">{error}</p>}
      </section>

      <section className="card" aria-labelledby="set-cats">
        <h3 id="set-cats">Kategorien</h3>
        <p className="muted">Nur was hier an ist, erscheint im Schrank und beim Hinzufügen.</p>
        <div className="segment" role="group" aria-label="Vorgabe" id="set-sex">
          {SEXES.map((s) => <button key={s} className={sex === s ? 'is-on' : ''} aria-pressed={sex === s} onClick={() => pickSex(s)}>{s}</button>)}
        </div>
        <div className="chips wrap" role="group" aria-label="Kategorien" id="set-cat-list">
          {CATEGORIES.map((c) => <button key={c} className={'chip' + (cats.includes(c) ? ' is-on' : '')} aria-pressed={cats.includes(c)} onClick={() => toggle(c)}>{c}</button>)}
        </div>
      </section>

      <section className="card" aria-labelledby="set-rules">
        <h3 id="set-rules">Farbregeln</h3>
        <p className="muted">Welche Farben passen für dich zusammen? Eine Regel pro Zeile. Der Zufall hält sich daran.</p>
        <div className="field">
          <textarea id="knowledge" rows={4} value={text} onChange={(e) => setText(e.target.value)} onBlur={() => setKnowledge(text)} placeholder={'Marine passt zu Beige\nGrün und Braun passen gut\nRot und Rosa vermeiden'} aria-label="Farbregeln" />
        </div>
        {(pairs.length > 0 || knowledge.ignored > 0) && (
          <div className="rules-read">
            <span className="muted">{pairs.length === 1 ? '1 Regel verstanden' : `${pairs.length} Regeln verstanden`}{knowledge.ignored > 0 ? `, ${knowledge.ignored === 1 ? '1 Zeile' : `${knowledge.ignored} Zeilen`} übersprungen` : ''}</span>
            {pairs.length > 0 && (
              <ul className="rules">
                {pairs.slice(0, 12).map((r, i) => (
                  <li key={i} className={r.weight > 0 ? 'is-good' : 'is-bad'}>{r.a} {r.b === '*' ? 'zu allem' : '+ ' + r.b}: {r.weight > 0 ? 'passt' : 'vermeiden'}</li>
                ))}
                {pairs.length > 12 && <li className="is-plain">und {pairs.length - 12} weitere</li>}
              </ul>
            )}
          </div>
        )}
        <div className="pick">
          <label className="btn">
            Textdatei laden
            <input id="knowledge-file" type="file" accept=".txt,.md,text/plain,text/markdown" hidden onChange={(e) => { pickText(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          <button className="btn" id="save-knowledge" onClick={() => { setKnowledge(text); toast('Farbregeln gespeichert.') }}>Speichern</button>
        </div>
      </section>

      <section className="card" aria-labelledby="set-data">
        <h3 id="set-data">Deine Daten</h3>
        <dl className="facts">
          <div><dt>{items.length === 1 ? 'Teil' : 'Teile'}</dt><dd>{items.length}</dd></div>
          <div><dt>{outfits.length === 1 ? 'Outfit' : 'Outfits'}</dt><dd>{outfits.length}</dd></div>
          <div><dt>Speicher</dt><dd>{usage ? mb(usage.used) : '–'}</dd></div>
        </dl>
        <p className="muted">
          Alles liegt nur auf diesem Gerät.
          {!persistent ? ' Dieser Browser speichert gerade nichts dauerhaft.' : usage && !usage.safe ? ' Bei knappem Speicher darf der Browser es löschen. Eine Sicherung schützt davor.' : ' Eine Sicherung schützt es, falls du das Gerät wechselst.'}
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
      </section>

      {!standalone() && (
        <section className="card" aria-labelledby="set-install">
          <h3 id="set-install">Als App installieren</h3>
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
          <p className="muted">Danach startet Clothet im Vollbild und läuft auch ohne Netz.</p>
        </section>
      )}

      <p className="muted is-center" id="app-version">Clothet {__APP_VERSION__} · {online ? 'online' : 'offline, alles Gespeicherte bleibt nutzbar'}</p>
      {editor && <AvatarEditor onClose={() => setEditor(false)} toast={toast} />}
    </Sheet>
  )
}
