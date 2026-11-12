import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/app.css'
import { IconCalendar, IconHanger, IconOutfit } from './icons'
import { seedSamples } from './lib/samples'
import { load, markSeeded, useStore } from './store'
import type { Outfit } from './types'
import { AddItem } from './views/AddItem'
import { Closet } from './views/Closet'
import { Editor } from './views/Editor'
import { CalendarView, Outfits } from './views/Outfits'

type Tab = 'schrank' | 'outfits' | 'kalender'
const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'schrank', label: 'Schrank', icon: <IconHanger /> },
  { id: 'outfits', label: 'Outfits', icon: <IconOutfit /> },
  { id: 'kalender', label: 'Kalender', icon: <IconCalendar /> },
]

function App() {
  const { ready, persistent } = useStore()
  const [tab, setTab] = useState<Tab>('schrank')
  const [adding, setAdding] = useState(false)
  const [editor, setEditor] = useState<{ outfit?: Outfit } | null>(null)

  useEffect(() => {
    load().then(async (fresh) => {
      if (fresh) {
        await seedSamples()
        await markSeeded()
      }
    })
  }, [])

  if (!ready) return <p className="loading">Schrank wird geöffnet …</p>
  if (editor) return <Editor outfit={editor.outfit} onClose={() => { setEditor(null); setTab('outfits') }} />

  return (
    <>
      <main className="app">
        <div className="brand">Clothet</div>
        {!persistent && <p className="note">Dieser Browser speichert gerade nichts dauerhaft. Was du anlegst, bleibt nur, bis du die Seite schließt.</p>}
        {tab === 'schrank' && <Closet onAdd={() => setAdding(true)} />}
        {tab === 'outfits' && <Outfits onNew={() => setEditor({})} onEdit={(outfit) => setEditor({ outfit })} />}
        {tab === 'kalender' && <CalendarView onNew={() => setEditor({})} />}
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
      {adding && <AddItem onClose={() => setAdding(false)} />}
    </>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
