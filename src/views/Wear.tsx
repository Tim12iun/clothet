import { useEffect, useState } from 'react'
import { placement } from '../lib/avatar'
import { FIT_ORIGIN, fitKind, fittedUrl } from '../lib/fitting'
import { urlFor } from '../store'
import { NO_FIT, ZONE_LABEL, type Item, type Sex, type Zone } from '../types'

/** Bild eines Teils an seinem Platz auf der Figur: undefined solange es gerechnet wird, null wenn es keins gibt. */
function useFitted(item: Item, sex: Sex | undefined, on: boolean) {
  // Art und Bild gehören zum Schlüssel: Ändert sich eins davon, wird neu gerechnet
  const key = `${item.id}:${item.category}:${item.image.size}:${sex ?? ''}`
  const [hit, setHit] = useState<{ key: string; url: string | null } | null>(null)
  useEffect(() => {
    if (!on) return
    let gone = false
    fittedUrl(item, sex).then((url) => { if (!gone) setHit({ key, url }) })
    return () => { gone = true }
  }, [key, on]) // eslint-disable-line react-hooks/exhaustive-deps
  // Solange das neue Teil gerechnet wird, bleibt das vorige stehen: kein Moment ohne Kleidung
  return !on ? null : hit ? hit.url : undefined
}

/**
 * Ein Teil auf der Bühne (Anprobe und Vorschau beim Bearbeiten): an die Figur angepasst, wo das geht, sonst flach an
 * seiner Zone. Die Feineinstellung des Sitzes gehört zum Teil selbst (item.fit).
 */
export function Wear({ item, zone, isDress, wide, photo, sex, dir = null }: { item: Item; zone: Zone; isDress: boolean; wide: number; photo: boolean; sex: Sex | undefined; dir?: 'next' | 'prev' | null }) {
  const kind = fitKind(item.category)
  const full = useFitted(item, sex, !photo && !!kind)
  const f = item.fit ?? NO_FIT
  const label = `${ZONE_LABEL[zone]}: ${item.name}`
  if (full === undefined) return null
  if (full && kind) {
    return (
      <div className="wear is-full" data-zone={zone} style={{ transformOrigin: `50% ${FIT_ORIGIN[kind] * 100}%`, transform: `translateY(${f.dy * 100}%) scale(${wide * f.scale}, ${f.scale})` }}>
        <img key={full} className={'wear-img' + (dir ? ' is-' + dir : '')} src={full} alt={label} draggable={false} />
      </div>
    )
  }
  const p = placement(zone, isDress, f, wide)
  return (
    <div className="wear" data-zone={zone} style={{ width: p.w * 100 + '%', ...(p.anchor === 'top' ? { top: p.y * 100 + '%' } : { bottom: (1 - p.y) * 100 + '%' }) }}>
      {zone === 'shoes' && item.wearImage ? (
        <div key={item.id} className={'wear-pair wear-img' + (dir ? ' is-' + dir : '')} role="img" aria-label={label}>
          <img src={urlFor(item.wearImage)} alt="" draggable={false} />
          <img src={urlFor(item.wearImage)} alt="" draggable={false} />
        </div>
      ) : (
        <img key={item.id} className={'wear-img' + (dir ? ' is-' + dir : '')} src={urlFor(item.image)} alt={label} draggable={false} />
      )}
    </div>
  )
}
