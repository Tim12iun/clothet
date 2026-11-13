import { IconMinus, IconPlus } from '../icons'

/**
 * Regler mit großem Griff und Tasten für einzelne Stufen links und rechts. Unter dem Regler stehen entweder die beiden
 * Enden in Worten (low, high) oder der aktuelle Wert (output).
 */
export function Range({ id, label, min, max, step = 1, value, onChange, low, high, output }: { id: string; label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void; low?: string; high?: string; output?: string }) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)))
  return (
    <div className="range">
      <button type="button" className="icon-btn is-outlined" onClick={() => set(value - step)} disabled={value <= min} aria-label={`${label}: ${low ?? 'weniger'}`}><IconMinus /></button>
      <div className="range-main">
        <input id={id} type="range" min={min} max={max} value={value} onChange={(e) => set(+e.target.value)} aria-label={label} />
        <div className="range-ends">{output ? <output htmlFor={id}>{output}</output> : <><span>{low}</span><span>{high}</span></>}</div>
      </div>
      <button type="button" className="icon-btn is-outlined" onClick={() => set(value + step)} disabled={value >= max} aria-label={`${label}: ${high ?? 'mehr'}`}><IconPlus /></button>
    </div>
  )
}
