import { useRef, useState } from 'react'
import { IconCamera, IconClose, IconImage, IconPaste, IconPlus } from '../icons'
import { GUIDES } from '../lib/guides'
import { coverage, cutArea, detectColors, guessCategory, isCutOut, loadPhoto, removeBackground, toBlob, trim, type Area } from '../lib/image'
import type { Toast } from '../main'
import { addItems, useCategories } from '../store'
import { uid, type Category, type Item } from '../types'
import { Camera } from './Camera'
import { MarkArea } from './MarkArea'
import { Sheet } from './Sheet'

interface Row { id: string; photo: HTMLCanvasElement; cut: HTMLCanvasElement | null; area: Area | null; url: string; category: Category; color: string; color2?: string; more: boolean; picked: boolean; wear: HTMLCanvasElement | null }
// Einzahl für den vorgeschlagenen Namen
const SINGULAR: Record<Category, string> = { Oberteile: 'Oberteil', Hosen: 'Hose', Röcke: 'Rock', Kleider: 'Kleid', Jacken: 'Jacke', Schuhe: 'Schuhe', Accessoires: 'Accessoire' }
// Das Häufigste steht direkt da, der Rest hinter „Mehr“
const MAIN: Category[] = ['Oberteile', 'Hosen', 'Schuhe']
const MORE: Category[] = ['Jacken', 'Kleider', 'Röcke', 'Accessoires']
const MAX = 40

/** Freistellen klappt auf ruhigem Grund. Bleibt fast alles oder fast nichts übrig, gilt es als nicht gelungen. */
function usable(removed: HTMLCanvasElement, from: HTMLCanvasElement) {
  if (removed === from) return null
  const cov = coverage(removed)
  return cov > 0.97 || cov < 0.05 ? null : trim(removed)
}

/**
 * Kleidung hinzufügen: zwei Wege zum Bild (Kamera oder Galerie, auch viele auf einmal). Danach ist alles vorbereitet:
 * freigestellt, Farbe und Art erkannt. Man korrigiert nur, was nicht stimmt, und speichert.
 */
export function AddItems({ onClose, toast }: { onClose: () => void; toast: Toast }) {
  const [rows, setRows] = useState<Row[]>([])
  // Nur Kategorien, die in den Einstellungen an sind (und was eine Zeile schon trägt)
  const on = useCategories()
  const REST = MORE.filter((c) => on.includes(c) || rows.some((r) => r.category === c))
  const [busy, setBusy] = useState<'load' | 'save' | null>(null)
  const [progress, setProgress] = useState('')
  const [failed, setFailed] = useState(0)
  const [marking, setMarking] = useState<string | null>(null)
  const [pasteNote, setPasteNote] = useState('')
  const [camera, setCamera] = useState<'new' | string | null>(null) // 'new': neues Teil, sonst Zeile, deren Schuh von vorne aufgenommen wird
  const native = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null) // ein Bild aus der Galerie für den Schuh von vorne

  // Was die Form vermuten lässt, aber nur aus den angebotenen Kategorien: ohne Kleider und Röcke wird daraus Oberteil und Hose
  const guess = (c: HTMLCanvasElement): Category => {
    const g = guessCategory(c)
    return on.includes(g) ? g : g === 'Kleider' ? 'Oberteile' : g === 'Röcke' ? 'Hosen' : g
  }
  function addPhoto(photo: HTMLCanvasElement, kind?: Category) {
    // Schon freigestellte Bilder (durchsichtiger Grund, etwa ein in Fotos kopiertes Motiv) bleiben, wie sie sind
    const cut = isCutOut(photo) ? trim(photo) : usable(removeBackground(photo, 45), photo)
    const base = cut ?? photo
    const row: Row = { id: uid(), photo, cut, area: null, url: base.toDataURL('image/png'), category: kind ?? (cut ? guess(cut) : 'Oberteile'), ...detectColors(base), more: false, picked: !!kind, wear: null }
    setRows((all) => [...all, row])
    return row
  }
  const front = (id: string, photo: HTMLCanvasElement) => patch(id, { wear: isCutOut(photo) ? trim(photo) : usable(removeBackground(photo, 45), photo) ?? photo })
  /** Übernimmt ein kopiertes Bild aus der Zwischenablage, zum Beispiel ein in Fotos freigestelltes Motiv. */
  async function paste(target: 'new' | string = 'new') {
    setPasteNote('')
    try {
      const found: Blob[] = []
      for (const entry of await navigator.clipboard.read()) {
        const type = entry.types.find((t) => t === 'image/png') ?? entry.types.find((t) => t.startsWith('image/'))
        if (type) found.push(await entry.getType(type))
      }
      if (found.length) return add(found, target)
      setPasteNote('In der Zwischenablage liegt kein Bild. Halt in Fotos das Teil gedrückt, wähl „Kopieren“ und tipp dann hier auf „Einfügen“.')
    } catch {
      setPasteNote('Der Browser hat das Einfügen nicht erlaubt. Tipp noch einmal auf „Einfügen“ und bestätige die Nachfrage.')
    }
  }
  async function add(files: FileList | Blob[] | null, target: 'new' | string = 'new') {
    if (!files?.length) return
    const list = [...files].slice(0, target === 'new' ? MAX - rows.length : 1)
    setBusy('load')
    let bad = 0
    for (let i = 0; i < list.length; i++) {
      setProgress(list.length === 1 ? 'Das Bild wird vorbereitet …' : `Bild ${i + 1} von ${list.length} wird vorbereitet …`)
      try {
        const photo = await loadPhoto(list[i])
        if (target === 'new') addPhoto(photo)
        else front(target, photo)
        await new Promise((r) => setTimeout(r)) // Oberfläche zwischen zwei Bildern atmen lassen
      } catch {
        bad++
      }
    }
    setFailed(bad)
    setProgress('')
    setBusy(null)
  }
  const patch = (id: string, p: Partial<Row>) => setRows((all) => all.map((r) => (r.id === id ? { ...r, ...p } : r)))
  function mark(r: Row, area: Area) {
    const part = cutArea(r.photo, area)
    // Ließ sich im Rahmen nichts trennen, bleibt der Ausschnitt selbst: Alles außerhalb ist trotzdem weg
    const cut = isCutOut(part) ? trim(part) : part
    patch(r.id, { cut, area, url: cut.toDataURL('image/png'), ...detectColors(cut), ...(r.picked ? {} : { category: guess(cut) }) })
    setMarking(null)
  }

  async function save() {
    if (!rows.length || busy || missing) return
    setBusy('save')
    try {
      const now = Date.now()
      const items: Item[] = []
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        items.push({ id: uid(), name: `${SINGULAR[r.category]} in ${r.color}`, category: r.category, color: r.color, color2: r.color2, image: await toBlob(r.cut ?? r.photo), wearImage: r.category === 'Schuhe' && r.wear ? await toBlob(r.wear) : undefined, createdAt: now - i })
      }
      await addItems(items)
      toast(items.length === 1 ? '1 Teil hängt jetzt im Schrank.' : `${items.length} Teile hängen jetzt im Schrank.`)
      onClose()
    } catch {
      setBusy(null)
      toast('Die Teile ließen sich nicht speichern. Versuch es noch einmal.')
    }
  }
  const open = rows.find((r) => r.id === marking)

  const target = useRef<'new' | string>('new')
  const cam = camera && (
    <Camera
      key={camera}
      title={camera === 'new' ? 'Teil fotografieren' : 'Schuh von vorne'}
      guide={camera === 'new' ? GUIDES.Oberteile : GUIDES['Schuh von vorne']}
      kinds={camera === 'new' ? [...MAIN, ...REST].map((c) => ({ key: c, label: SINGULAR[c], guide: GUIDES[c] })) : undefined}
      onShot={(c, kind) => {
        if (camera !== 'new') { front(camera, c); return setCamera(null) }
        // Schuhe brauchen für den Avatar ein zweites Foto von vorne: gleich danach fragen
        const row = addPhoto(c, kind as Category | undefined)
        setCamera(row.category === 'Schuhe' ? row.id : null)
      }}
      onClose={() => setCamera(null)}
      onFail={() => { target.current = camera; setCamera(null); native.current?.click() }}
    />
  )
  const full = rows.length >= MAX
  // Schuhe brauchen vor dem Speichern ihr Bild von vorne
  const missing = rows.filter((r) => r.category === 'Schuhe' && !r.wear).length

  return (
    <Sheet title="Kleidung hinzufügen" onClose={onClose}>
      {rows.length === 0 ? (
        <p className="muted">Clothet stellt jedes Teil frei und erkennt Art und Farbe. Am saubersten: in der Fotos-App das Teil gedrückt halten, „Kopieren“ wählen und hier einfügen.</p>
      ) : (
        <>
          <p className="muted">Stimmt die Art? Sonst antippen. Ist ein Teil nicht sauber ausgeschnitten, tipp auf „Zuschnitt“ unter dem Bild.</p>
          <ul className="days" id="import-list">
            {rows.map((r, n) => (
              <li key={r.id} className="import-row">
                <button className="import-thumb" onClick={() => setMarking(r.id)} aria-label={`Zuschnitt von Bild ${n + 1} ändern`}><img src={r.url} alt="" /><span>Zuschnitt</span></button>
                <div className="import-kinds grow" role="group" aria-label={`Art von Bild ${n + 1}`}>
                  {(r.more || REST.includes(r.category) ? [...MAIN, ...REST] : MAIN).map((c) => <button key={c} className={'chip' + (r.category === c ? ' is-on' : '')} aria-pressed={r.category === c} onClick={() => patch(r.id, { category: c, picked: true })}>{SINGULAR[c]}</button>)}
                  {!r.more && !REST.includes(r.category) && <button className="chip" onClick={() => patch(r.id, { more: true })} aria-label={`Mehr Arten für Bild ${n + 1}`}>Mehr</button>}
                </div>
                <button className="icon-btn" onClick={() => setRows((all) => all.filter((x) => x.id !== r.id))} aria-label={`Bild ${n + 1} entfernen`}><IconClose /></button>
                {r.category === 'Schuhe' && (
                  <div className={'import-ask import-front' + (r.wear ? '' : ' is-missing')}>
                    <span className="import-front-img">{r.wear ? <img src={r.wear.toDataURL('image/png')} alt="Schuh von vorne" /> : <IconPlus />}</span>
                    <div className="import-front-text">
                      <strong>{r.wear ? 'Bild von vorne ist da' : 'Bild von vorne fehlt noch'}</strong>
                      <span className="muted">{r.wear ? 'Du kannst es ersetzen.' : 'Derselbe Schuh, die Spitze zeigt zu dir. So steht er am Avatar.'}</span>
                    </div>
                    <div className="import-front-ways" role="group" aria-label={`Bild von vorne für Bild ${n + 1}`}>
                      <button className="icon-btn is-outlined" onClick={() => paste(r.id)} disabled={!!busy} aria-label="Bild von vorne einfügen" title="Einfügen"><IconPaste /></button>
                      <button className="icon-btn is-outlined" onClick={() => { target.current = r.id; gallery.current?.click() }} disabled={!!busy} aria-label="Bild von vorne aus der Galerie wählen" title="Aus Galerie"><IconImage /></button>
                      <button className="icon-btn is-outlined" onClick={() => setCamera(r.id)} disabled={!!busy} aria-label="Schuh von vorne fotografieren" title="Kamera"><IconCamera /></button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {progress && <p className="muted" role="status">{progress}</p>}
      {failed > 0 && <p className="note is-danger" role="alert">{failed === 1 ? '1 Bild ließ sich nicht öffnen.' : `${failed} Bilder ließen sich nicht öffnen.`} Versuch es mit JPG oder PNG.</p>}
      {pasteNote && <p className="note" role="status">{pasteNote}</p>}
      {full && <p className="note">Mehr als {MAX} Bilder auf einmal gehen nicht. Speicher diese zuerst.</p>}
      <div className={'add-ways' + (rows.length ? ' is-small' : '')}>
        <button className={'btn' + (rows.length ? '' : ' btn-primary')} onClick={() => setCamera('new')} disabled={!!busy || full} id="add-camera"><IconCamera /> Kamera</button>
        <label className={'btn' + (busy === 'load' ? ' is-busy' : '')}>
          <IconImage /> Galerie
          <input id="import-files" type="file" accept="image/*" multiple hidden disabled={!!busy || full} onChange={(e) => { add(e.target.files); e.target.value = '' }} />
        </label>
        <button className="btn" onClick={() => paste()} disabled={!!busy || full} id="add-paste"><IconPaste /> Einfügen</button>
        <input ref={gallery} id="front-file" type="file" accept="image/*" hidden onChange={(e) => { add(e.target.files, target.current); e.target.value = '' }} />
        <input ref={native} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { add(e.target.files, target.current); e.target.value = '' }} />
      </div>
      {missing > 0 && <p className="note" role="status" id="front-missing">{missing === 1 ? 'Bei einem Schuh fehlt noch das Bild von vorne.' : `Bei ${missing} Schuhen fehlt noch das Bild von vorne.`} Erst dann lässt sich speichern.</p>}
      {rows.length > 0 && <button className={'btn btn-primary' + (busy === 'save' ? ' is-busy' : '')} onClick={save} disabled={busy === 'load' || missing > 0} id="import-save">{rows.length === 1 ? '1 Teil speichern' : `${rows.length} Teile speichern`}</button>}
      {cam}
      {open && <MarkArea photo={open.photo} area={open.area} onDone={(a) => mark(open, a)} onClose={() => setMarking(null)} />}
    </Sheet>
  )
}
