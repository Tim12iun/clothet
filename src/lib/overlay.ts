import { useEffect, useRef, type RefObject } from 'react'

/**
 * Gemeinsames Verhalten aller Überlagerungen (Sheet, Kamera, Avatar-Einrichtung):
 * Die Zurück-Taste und Escape schließen zuerst die oberste Überlagerung, der Hintergrund ist nicht bedienbar,
 * der Fokus geht hinein und beim Schließen zurück auf das auslösende Element.
 */
interface Entry { id: number; el: HTMLElement | null; close: () => void; popped: boolean }
const stack: Entry[] = []
let seq = 0
let selfBacks = 0 // Zurück-Schritte, die die App selbst ausgelöst hat

const stateId = () => (history.state && typeof history.state.overlay === 'number' ? history.state.overlay : 0)
const push = (id: number) => { try { history.pushState({ overlay: id }, '') } catch { /* ohne Verlauf (z. B. eingebettete Vorschau) */ } }

function syncInert() {
  document.getElementById('root')?.toggleAttribute('inert', stack.length > 0)
  stack.forEach((e, i) => e.el?.toggleAttribute('inert', i < stack.length - 1))
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const top = stack[stack.length - 1]
    if (selfBacks > 0) {
      selfBacks--
      if (top && stateId() < top.id) push(top.id) // der eigene Schritt hat den Eintrag einer neuen Überlagerung getroffen
      return
    }
    if (top && stateId() < top.id) {
      top.popped = true
      top.close()
    }
  })
  window.addEventListener('keydown', (e) => {
    const top = stack[stack.length - 1]
    if (e.key === 'Escape' && top) {
      e.preventDefault()
      top.close()
    }
  })
}

export function useOverlay(onClose: () => void, el: RefObject<HTMLElement | null>) {
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const entry: Entry = { id: ++seq, el: el.current, close: () => close.current(), popped: false }
    stack.push(entry)
    push(entry.id)
    syncInert()
    el.current?.focus({ preventScroll: true })
    return () => {
      stack.splice(stack.indexOf(entry), 1)
      syncInert()
      if (!entry.popped && stateId() === entry.id) {
        selfBacks++
        history.back()
      }
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [el])
}

/** true, solange irgendeine Überlagerung offen ist (für Gesten im Hintergrund). */
export const overlayOpen = () => stack.length > 0
