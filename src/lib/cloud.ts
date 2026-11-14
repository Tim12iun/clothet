import { useSyncExternalStore } from 'react'
import { del, get, keys, set, type UseStore } from 'idb-keyval'
import { CLOUD } from '../cloud.config'

/**
 * Cloud-Speicher (Supabase, ohne Zusatzbibliothek): Konto per E-Mail und Passwort, je Eintrag des Browser-Speichers
 * eine Zeile in der Tabelle `records`, Bilder im privaten Ablageort `clothet`. Der Browser-Speicher bleibt die Quelle
 * für die Oberfläche (schnell, startet ohne Netz), die Cloud ist die dauerhafte Kopie. Abgleich je Eintrag: Der
 * jüngere Stand gilt, Gelöschtes bleibt als Marke stehen, damit es auf anderen Geräten auch verschwindet.
 * Einrichtung: `supabase/setup.sql`, Adresse und Schlüssel in `src/cloud.config.ts`.
 */
const cfg: { url: string; key: string } = (window as { __CLOTHET_CLOUD__?: { url: string; key: string } }).__CLOTHET_CLOUD__ ?? CLOUD
const BUCKET = 'clothet', SESSION = 'clothet-konto', META = 'sync-meta'
/** Diese Einträge wandern in die Cloud. Alles andere (Merker für Beispiele und Umstellungen) gilt nur für das Gerät. */
const synced = (k: string) => k.startsWith('item:') || k.startsWith('outfit:') || ['calendar', 'worn', 'fits', 'knowledge', 'body', 'figure', 'avatarMode', 'categories'].includes(k)

interface Session { access: string; refresh: string; expires: number; id: string; email: string }
interface Mark { ts: number; dirty?: boolean; deleted?: boolean; files?: Record<string, { path: string; sig: string }> }
export interface CloudState {
  configured: boolean
  email: string | null
  status: 'idle' | 'syncing' | 'offline' | 'error'
  pending: number // Änderungen, die noch nicht in der Cloud sind
  lastSync: number | null
  error: string
}

let session: Session | null = (() => { try { return JSON.parse(localStorage.getItem(SESSION) ?? 'null') } catch { return null } })()
let state: CloudState = { configured: !!(cfg.url && cfg.key), email: session?.email ?? null, status: 'idle', pending: 0, lastSync: null, error: '' }
const listeners = new Set<() => void>()
const update = (p: Partial<CloudState>) => { state = { ...state, ...p }; listeners.forEach((l) => l()) }
export const useCloud = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => state)

let db: UseStore | null = null
let reload: () => Promise<unknown> = async () => {}
let meta: Record<string, Mark> = {}
let metaReady: Promise<void> | null = null
const saveMeta = () => (db ? set(META, meta, db).catch(() => {}) : Promise.resolve())
const countPending = () => update({ pending: Object.values(meta).filter((m) => m.dirty).length })

function keepSession(s: Session | null) {
  session = s
  try { s ? localStorage.setItem(SESSION, JSON.stringify(s)) : localStorage.removeItem(SESSION) } catch { /* Sitzung gilt dann nur bis zum Schließen */ }
  update({ email: s?.email ?? null })
}

class CloudError extends Error { constructor(public status: number, message: string) { super(message) } }
async function call(path: string, init: RequestInit & { token?: string } = {}): Promise<Response> {
  const res = await fetch(cfg.url.replace(/\/$/, '') + path, { ...init, headers: { apikey: cfg.key, ...(init.token ? { Authorization: 'Bearer ' + init.token } : {}), ...init.headers } })
  if (!res.ok) {
    let msg = ''
    try { const j = await res.clone().json(); msg = j.msg ?? j.message ?? j.error_description ?? j.error ?? '' } catch { /* ohne Text */ }
    throw new CloudError(res.status, String(msg))
  }
  return res
}
const json = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

function adopt(j: { access_token?: string; refresh_token?: string; expires_in?: number; user?: { id: string; email?: string } }, email: string) {
  if (!j.access_token || !j.refresh_token || !j.user) return false
  keepSession({ access: j.access_token, refresh: j.refresh_token, expires: Date.now() + (j.expires_in ?? 3600) * 1000, id: j.user.id, email: j.user.email ?? email })
  return true
}
/** Gültiges Zugangs-Token, kurz vor Ablauf erneuert. null, wenn die Anmeldung nicht mehr gilt. */
async function token(): Promise<string | null> {
  if (!session) return null
  if (session.expires - Date.now() > 60000) return session.access
  try {
    const j = await (await call('/auth/v1/token?grant_type=refresh_token', json({ refresh_token: session.refresh }))).json()
    return adopt(j, session.email) ? session!.access : null
  } catch (e) {
    if (e instanceof CloudError && e.status >= 400 && e.status < 500) {
      keepSession(null)
      update({ status: 'error', error: 'Deine Anmeldung ist abgelaufen. Melde dich noch einmal an.' })
      return null
    }
    throw e
  }
}

const AUTH_TEXT: [RegExp, string][] = [
  [/invalid login|invalid_credentials/i, 'E-Mail oder Passwort stimmen nicht.'],
  [/already registered|user_already_exists/i, 'Zu dieser E-Mail gibt es schon ein Konto. Melde dich damit an.'],
  [/password.*(6|short|weak)/i, 'Das Passwort braucht mindestens 6 Zeichen.'],
  [/valid email|invalid.*email/i, 'Das ist keine gültige E-Mail-Adresse.'],
  [/not confirmed/i, 'Bestätige zuerst den Link in der E-Mail, die du bekommen hast.'],
  [/rate limit|too many/i, 'Zu viele Versuche. Warte kurz und versuch es noch einmal.'],
]
const authText = (e: unknown) => (e instanceof CloudError ? AUTH_TEXT.find(([r]) => r.test(e.message))?.[1] ?? 'Die Anmeldung hat nicht geklappt. Versuch es noch einmal.' : 'Keine Verbindung. Prüf dein Netz und versuch es noch einmal.')

/** Meldet an oder legt ein Konto an. Gibt einen Fehlertext zurück, sonst einen leeren Text. */
export async function signIn(email: string, password: string, create: boolean): Promise<string> {
  if (!state.configured) return 'Der Cloud-Speicher ist noch nicht eingerichtet.'
  try {
    const before = localStorage.getItem(SESSION + '-id')
    const j = await (await call(create ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password', json({ email: email.trim(), password }))).json()
    if (!adopt(j, email.trim())) return 'Das Konto ist angelegt. Bestätige den Link in der E-Mail und melde dich dann an.'
    // Anderes Konto als zuletzt auf diesem Gerät: Der Abgleich beginnt neu, nichts gilt als schon gesichert
    if (before && before !== session!.id) { meta = {}; await saveMeta() }
    localStorage.setItem(SESSION + '-id', session!.id)
    update({ status: 'idle', error: '' })
    syncNow()
    return ''
  } catch (e) {
    return authText(e)
  }
}
export function signOut() {
  const t = session?.access
  keepSession(null)
  update({ status: 'idle', error: '' })
  if (t) call('/auth/v1/logout', { method: 'POST', token: t }).catch(() => {})
}

// --- Bilder ----------------------------------------------------------------------------------------
const filePath = (path: string) => path.split('/').map(encodeURIComponent).join('/')
const sigOf = (b: Blob) => `${b.size}-${b.type}`
async function upload(t: string, path: string, blob: Blob) {
  await call(`/storage/v1/object/${BUCKET}/${filePath(path)}`, { method: 'POST', token: t, headers: { 'Content-Type': blob.type || 'application/octet-stream', 'x-upsert': 'true' }, body: blob })
}
async function download(t: string, path: string, type: string): Promise<Blob> {
  const b = await (await call(`/storage/v1/object/authenticated/${BUCKET}/${filePath(path)}`, { token: t })).blob()
  return type && b.type !== type ? new Blob([b], { type }) : b
}
const dropFiles = (t: string, paths: string[]) =>
  paths.length ? call(`/storage/v1/object/${BUCKET}`, { ...json({ prefixes: paths }), method: 'DELETE', token: t }).catch(() => {}) : Promise.resolve()

interface Packed { __blob: { path: string; type: string } }
const isPacked = (v: unknown): v is Packed => !!v && typeof v === 'object' && '__blob' in (v as object)
/** Ersetzt Bilder im Eintrag durch Verweise und lädt geänderte Bilder hoch. */
async function pack(t: string, key: string, value: unknown, mark: Mark): Promise<unknown> {
  const files: NonNullable<Mark['files']> = {}, old = mark.files ?? {}
  const one = async (field: string, blob: Blob): Promise<Packed> => {
    const sig = sigOf(blob)
    let path = old[field]?.sig === sig ? old[field].path : ''
    if (!path) {
      path = `${session!.id}/${key.replace(':', '/')}/${field}-${Date.now().toString(36)}`
      await upload(t, path, blob)
    }
    files[field] = { path, sig }
    return { __blob: { path, type: blob.type } }
  }
  let out: unknown = value
  if (value instanceof Blob) out = await one('bild', value)
  else if (value && typeof value === 'object' && !Array.isArray(value)) {
    const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) }
    for (const [f, v] of Object.entries(copy)) if (v instanceof Blob) copy[f] = await one(f, v)
    out = copy
  }
  // Ersetzte Bilder aufräumen
  await dropFiles(t, Object.entries(old).filter(([f, o]) => files[f]?.path !== o.path).map(([, o]) => o.path))
  mark.files = Object.keys(files).length ? files : undefined
  return out
}
/** Holt die Bilder eines Eintrags aus der Cloud zurück. */
async function unpack(t: string, value: unknown): Promise<{ value: unknown; files?: Mark['files'] }> {
  const files: NonNullable<Mark['files']> = {}
  const one = async (field: string, p: Packed) => {
    const blob = await download(t, p.__blob.path, p.__blob.type)
    files[field] = { path: p.__blob.path, sig: sigOf(blob) }
    return blob
  }
  let out = value
  if (isPacked(value)) out = await one('bild', value)
  else if (value && typeof value === 'object' && !Array.isArray(value)) {
    const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) }
    for (const [f, v] of Object.entries(copy)) if (isPacked(v)) copy[f] = await one(f, v)
    out = copy
  }
  return { value: out, files: Object.keys(files).length ? files : undefined }
}

// --- Abgleich --------------------------------------------------------------------------------------
interface Row { key: string; ts: number; deleted: boolean; value?: unknown }
const REST = '/rest/v1/records'
async function index(t: string): Promise<Row[]> {
  const all: Row[] = []
  for (let from = 0; ; from += 1000) {
    const page: Row[] = await (await call(`${REST}?select=key,ts,deleted&order=key&offset=${from}&limit=1000`, { token: t })).json()
    all.push(...page)
    if (page.length < 1000) return all
  }
}
const values = async (t: string, list: string[]): Promise<Row[]> =>
  (await call(`${REST}?select=key,ts,deleted,value&key=in.(${encodeURIComponent(list.map((k) => `"${k.replace(/"/g, '')}"`).join(','))})`, { token: t })).json()
const upsert = (t: string, row: Row) =>
  call(`${REST}?on_conflict=user_id,key`, { ...json([{ user_id: session!.id, key: row.key, ts: row.ts, deleted: row.deleted, value: row.value ?? null }]), token: t, headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' } })

let running = false, again = false, timer = 0
async function run() {
  if (!db || !session || !state.configured) return
  if (running) { again = true; return }
  running = true
  update({ status: 'syncing', error: '' })
  let changed = false
  try {
    await metaReady
    const t = await token()
    if (!t) return
    // Was schon vor der Anmeldung auf dem Gerät lag, gilt als älter als alles in der Cloud und wird sonst hochgeladen
    for (const k of await keys(db)) if (typeof k === 'string' && synced(k) && !meta[k]) meta[k] = { ts: 1, dirty: true }
    countPending()

    // 1. Herunter: alles, was in der Cloud jünger ist
    const newer = (await index(t)).filter((r) => r.ts > (meta[r.key]?.ts ?? 0) && synced(r.key))
    for (const r of newer.filter((r) => r.deleted)) {
      if (!meta[r.key]?.deleted) { await del(r.key, db); changed = true }
      meta[r.key] = { ts: r.ts, deleted: true }
    }
    const live = newer.filter((r) => !r.deleted)
    for (let i = 0; i < live.length; i += 20) {
      for (const r of await values(t, live.slice(i, i + 20).map((r) => r.key))) {
        const u = await unpack(t, r.value)
        await set(r.key, u.value, db)
        meta[r.key] = { ts: r.ts, files: u.files }
        changed = true
      }
      await saveMeta()
      countPending()
    }

    // 2. Hinauf: alles, was hier geändert wurde
    for (const [k, m] of Object.entries(meta)) {
      if (!m.dirty) continue
      const ts = m.ts, value = m.deleted ? undefined : await get(k, db)
      if (value === undefined) {
        await upsert(t, { key: k, ts, deleted: true })
        await dropFiles(t, Object.values(m.files ?? {}).map((f) => f.path))
        if (meta[k].ts === ts) meta[k] = { ts, deleted: true }
      } else {
        await upsert(t, { key: k, ts, deleted: false, value: await pack(t, k, value, m) })
        if (meta[k].ts === ts) meta[k] = { ts, files: m.files }
      }
      countPending()
    }
    await saveMeta()
    update({ status: 'idle', lastSync: Date.now() })
  } catch (e) {
    await saveMeta()
    const offline = !(e instanceof CloudError)
    update({ status: offline ? 'offline' : 'error', error: offline ? '' : e.status === 404 || /relation|schema|bucket/i.test(e.message) ? 'Der Cloud-Speicher ist noch nicht fertig eingerichtet.' : e.status === 413 ? 'Ein Bild ist zu groß für den Cloud-Speicher.' : 'Der Abgleich hat nicht geklappt. Er wird später wiederholt.' })
    window.clearTimeout(timer)
    timer = window.setTimeout(run, 30000)
  } finally {
    running = false
    countPending()
    if (changed) await reload()
    if (again) { again = false; run() }
  }
}
export const syncNow = () => { run() }
const soon = () => { window.clearTimeout(timer); timer = window.setTimeout(run, 1500) }

/** Der Speicher meldet jede Änderung: Der Eintrag wird beim nächsten Abgleich hochgeladen (oder als gelöscht vermerkt). */
export function touch(key: string, deleted = false) {
  if (!synced(key)) return
  const files = meta[key]?.files
  meta[key] = { ts: Date.now(), dirty: true, ...(deleted ? { deleted: true } : {}), ...(files ? { files } : {}) }
  saveMeta()
  if (session) { countPending(); soon() }
}

/** Verbindet den Abgleich mit dem Browser-Speicher. reload liest den Bestand neu ein, wenn die Cloud etwas geändert hat. */
export function attach(store: UseStore, onChange: () => Promise<unknown>) {
  db = store
  reload = onChange
  metaReady = get<Record<string, Mark>>(META, store).then((m) => { meta = { ...(m ?? {}), ...meta } }).catch(() => {})
  if (!state.configured) return
  window.addEventListener('online', syncNow)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow() })
  syncNow()
}
