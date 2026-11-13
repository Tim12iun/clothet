import { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/app.css'
import { IconHanger, IconOutfit, IconPerson } from './icons'
import { seedSamples } from './lib/samples'
import { load, markSeeded, useStore } from './store'
import { EMPTY_SLOTS, type Slots, type Zone } from './types'
import { AddItem } from './views/AddItem'
import { Closet } from './views/Closet'
import { Home } from './views/Home'
import { Outfits } from './views/Outfits'
import { Settings } from './views/Settings'

// Flache Navigation: drei Bereiche, darüber höchstens ein Sheet.
type Tab = 'anprobe' | 'schrank' | 'outfits'
const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'anprobe', label: 'Anprobe', icon: <IconPerson /> },
  { id: 'schrank', label: 'Schrank', icon: <IconHanger /> },
  { id: 'outfits', label: 'Outfits', icon: <IconOutfit /> },
]

function App() {
  const { ready, persistent } = useStore()
  const [tab, setTab] = useState<Tab>('anprobe')
  const [sheet, setSheet] = useState<'add' | 'settings' | null>(null)
  const [slots, setSlots] = useState<Slots>(EMPTY_SLOTS)
  const [fitZone, setFitZone] = useState<Zone | null>(null)
  const [toastText, setToastText] = useState('')
  const timer = useRef(0)
  const toast = useCallback((text: string) => {
    setToastText(text)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToastText(''), 3200)
  }, [])

  useEffect(() => {
    load().then(async (fresh) => {
      if (fresh) {
        await seedSamples()
        await markSeeded()
      }
    })
  }, [])

  if (!ready) return <p className="loading">Schrank wird geöffnet …</p>

  return (
    <>
      <main className={'app' + (tab === 'anprobe' ? ' is-home' : '')}>
        {!persistent && <p className="note">Dieser Browser speichert gerade nichts dauerhaft. Was du anlegst, bleibt nur, bis du die Seite schließt.</p>}
        {tab === 'anprobe' && <Home slots={slots} setSlots={setSlots} onSettings={() => setSheet('settings')} onAdd={() => setSheet('add')} fitZone={fitZone} setFitZone={setFitZone} toast={toast} />}
        {tab === 'schrank' && <Closet onAdd={() => setSheet('add')} />}
        {tab === 'outfits' && <Outfits onHome={() => setTab('anprobe')} onWear={(o) => { setSlots(o.slots); setTab('anprobe') }} />}
      </main>
      <nav className="nav" aria-label="Bereiche">
        <div className="nav-inner">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
      {toastText && <div className="toast" role="status">{toastText}</div>}
      {sheet === 'add' && <AddItem onClose={() => setSheet(null)} />}
      {sheet === 'settings' && <Settings onClose={() => setSheet(null)} onFit={() => { setSheet(null); setTab('anprobe'); setFitZone('top') }} />}
    </>
  )
}

// Als installierte App: offline nutzbar machen und den Browser bitten, die Daten nicht zu räumen.
if (import.meta.env.PROD && import.meta.env.MODE !== 'artifact' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
    navigator.storage?.persist?.().catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(<App />)
