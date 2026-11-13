import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/app.css'
import { IconHanger, IconOutfit, IconPerson } from './icons'
import { refreshSampleShoes } from './lib/samples'
import { getState, load, markShoesFront, shoesFront, useStore } from './store'
import { EMPTY_SLOTS, type Slots, type Zone } from './types'
import { Closet } from './views/Closet'
import { Home } from './views/Home'
import { AddItems } from './views/AddItems'
import { Outfits } from './views/Outfits'
import { Settings } from './views/Settings'

// Flache Navigation: drei Bereiche mit eigener Adresse, darüber höchstens ein Sheet.
const TABS = [
  { id: 'anprobe', label: 'Anprobe', icon: <IconPerson /> },
  { id: 'schrank', label: 'Schrank', icon: <IconHanger /> },
  { id: 'outfits', label: 'Outfits', icon: <IconOutfit /> },
] as const
type Tab = (typeof TABS)[number]['id']
const tabFromHash = (): Tab => TABS.find((t) => location.hash === '#/' + t.id)?.id ?? 'anprobe'

export type Toast = (text: string, undo?: () => void) => void

function App() {
  const { ready, persistent } = useStore()
  const [tab, setTab] = useState<Tab>(tabFromHash)
  const [sheet, setSheet] = useState<'add' | 'settings' | null>(null)
  const [slots, setSlots] = useState<Slots>(EMPTY_SLOTS)
  const [note, setNote] = useState<{ text: string; undo?: () => void } | null>(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [update, setUpdate] = useState<ServiceWorker | null>(null)
  const timer = useRef(0)
  const main = useRef<HTMLElement>(null)
  const toast = useCallback<Toast>((text, undo) => {
    setNote({ text, undo })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setNote(null), undo ? 6000 : 3200)
  }, [])

  // Bereich wechseln: Adresse mitführen (Zurück und Neuladen funktionieren). Tipp auf den aktiven Bereich scrollt nach oben.
  const go = useCallback((t: Tab) => {
    if (t === tabFromHash() && t === tab) return main.current?.querySelector('.view:not([hidden])')?.scrollTo({ top: 0, behavior: 'smooth' })
    setTab(t)
    try { location.hash = '#/' + t } catch { /* eingebettete Vorschau ohne Adresse */ }
  }, [tab])
  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    load().then(async (fresh) => {
      if (!fresh && !shoesFront) await refreshSampleShoes(getState().items)
      await markShoesFront()
      // Härtetest: ?stress=1000 füllt einen leeren Schrank mit Testteilen
      const stress = +(new URLSearchParams(location.search).get('stress') ?? 0)
      if (stress > 0 && getState().items.length === 0) (await import('./lib/stress')).seedStress(Math.min(stress, 5000))
    })
  }, [])

  // Netz-Hinweis: erscheint beim Wechsel und verschwindet von selbst. Alles Gespeicherte bleibt nutzbar.
  useEffect(() => {
    const on = () => { setOnline(true); toast('Du bist wieder online.') }
    const off = () => { setOnline(false); toast('Du bist offline. Dein Schrank bleibt nutzbar.') }
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [toast])

  // Neue Version: nur ein Hinweis, geladen wird erst auf Wunsch
  useEffect(() => {
    const onUpdate = (e: Event) => setUpdate((e as CustomEvent<ServiceWorker>).detail)
    window.addEventListener('clothet-update', onUpdate)
    return () => window.removeEventListener('clothet-update', onUpdate)
  }, [])

  if (!ready) return <Skeleton />

  const storageNote = !persistent && <p className="note" role="status">Dieser Browser speichert gerade nichts dauerhaft. Was du anlegst, bleibt nur, bis du die Seite schließt.</p>

  return (
    <div className="app">
      <main className="app-main" ref={main}>
        <Home hidden={tab !== 'anprobe'} slots={slots} setSlots={setSlots} onSettings={() => setSheet('settings')} onAdd={() => setSheet('add')} toast={toast} />
        <Closet hidden={tab !== 'schrank'} onAdd={() => setSheet('add')} toast={toast} note={storageNote} />
        <Outfits hidden={tab !== 'outfits'} slots={slots} onHome={() => go('anprobe')} onWear={(o) => { setSlots(o.slots); go('anprobe') }} toast={toast} note={storageNote} />
        {update && (
          <div className="toast" role="status">
            <span>Eine neue Version ist da.</span>
            <button onClick={() => { update.postMessage('skip-waiting'); setUpdate(null) }}>Jetzt laden</button>
          </div>
        )}
        {note && !update && (
          <div className="toast" role="status" aria-live="polite">
            <span>{note.text}</span>
            {note.undo && <button onClick={() => { note.undo?.(); setNote(null) }}>Rückgängig</button>}
          </div>
        )}
      </main>
      <nav className="nav" aria-label="Bereiche">
        <div className="nav-inner">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => go(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
      {sheet === 'add' && <AddItems onClose={() => setSheet(null)} toast={toast} />}
      {sheet === 'settings' && <Settings online={online} onClose={() => setSheet(null)} toast={toast} />}
    </div>
  )
}

/** Platzhalter in der Form der Anprobe, solange der Schrank aus dem Speicher geladen wird. */
function Skeleton() {
  return (
    <div className="app" role="status" aria-label="Schrank wird geöffnet">
      <main className="app-main">
        <section className="home" aria-hidden="true">
          <header className="home-head"><h1>Anprobe</h1></header>
          <div className="stage-wrap"><div className="stage skeleton" /></div>
          <div className="drawer"><div className="drawer-body"><div className="picks">{[0, 1, 2].map((i) => <span key={i} className="pick-tile skeleton" />)}</div></div></div>
        </section>
      </main>
      <nav className="nav" aria-hidden="true"><div className="nav-inner" /></nav>
    </div>
  )
}

// Tastatur: iOS legt sie über die Seite. Der verdeckte Bereich wird gemessen, damit die App darüber endet.
const vv = window.visualViewport
function syncKeyboard() {
  if (!vv) return
  const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
  document.documentElement.style.setProperty('--keyboard', `${Math.round(covered)}px`)
  document.documentElement.classList.toggle('keyboard-open', covered > 80)
  if (covered > 80) window.scrollTo(0, 0) // falls iOS das Dokument beim Fokus verschoben hat
}
vv?.addEventListener('resize', syncKeyboard)
vv?.addEventListener('scroll', syncKeyboard)
syncKeyboard()
// Nach dem Fokus das Feld im eigenen Scroll-Bereich sichtbar machen
document.addEventListener('focusin', (e) => {
  const el = e.target as HTMLElement
  if (el.matches?.('input:not([type=range]):not([type=file]), textarea')) window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
})
// Damit :active auf iOS zuverlässig greift
document.addEventListener('touchstart', () => {}, { passive: true })

// Als installierte App: offline nutzbar machen, Updates melden und den Browser bitten, die Daten nicht zu räumen.
if (import.meta.env.PROD && import.meta.env.MODE !== 'artifact' && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    navigator.storage?.persist?.().catch(() => {})
    try {
      const reg = await navigator.serviceWorker.register('./sw.js')
      const announce = (w: ServiceWorker | null) => w && navigator.serviceWorker.controller && window.dispatchEvent(new CustomEvent('clothet-update', { detail: w }))
      announce(reg.waiting)
      reg.addEventListener('updatefound', () => {
        const w = reg.installing
        w?.addEventListener('statechange', () => w.state === 'installed' && announce(w))
      })
      // Installierte Apps werden selten neu gestartet: bei jeder Rückkehr in die App nach einer neuen Version sehen
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}) })
      // Neu laden nur bei einem Update. Beim ersten Besuch übernimmt der Service Worker still, ohne die Seite zu unterbrechen.
      let reloaded = !navigator.serviceWorker.controller
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload() } })
    } catch { /* ohne Service Worker läuft die App normal weiter */ }
  })
}

createRoot(document.getElementById('root')!).render(<App />)
