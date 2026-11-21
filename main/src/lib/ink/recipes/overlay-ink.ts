import { Ink, type InkResult } from '@/lib/ink/builder'
import { highlight } from '@/lib/ink/fills'
import { arrow, cross, focusRing } from '@/lib/ink/shapes'
import { defineRecipe } from '@/lib/ink/recipes'
import type { Tier } from '@/lib/ink/types'

export interface CloseMarkParams {
  tone?: 'ink' | 'red'
}

export const closeMarkRecipe = defineRecipe<CloseMarkParams>({
  id: 'overlay-close',
  kind: 'close',
  layers: ['rest', 'hover', 'focus'],
  lazy: ['focus'],
  pad: 12,
  draw(ink, { w, h }, { tone = 'ink' }, ctx) {
    const cx = w / 2
    const cy = h / 2
    ctx.lazy('focus', (f) => focusRing(f, cx - 12, cy - 12, 24, 24, { shape: 'ellipse', gap: 1.5 }))
    if (ctx.lazyOnly) return
    const s = ctx.calm ? 11 : 12.5
    ink.layer('rest', () => {
      cross(ink, cx - s / 2, cy - s / 2, s, { pen: tone === 'red' ? 'redfelt' : ctx.calm ? 'ink.fine' : 'ink', opts: { width: ctx.calm ? 1.1 : 1.35, start: 'soft' } })
    })
    ink.layer('hover', () => {
      highlight(ink, cx - 12, cy - 8.5, 24, 17, { pen: 'hi', opts: { alpha: 0.85 } })
    })
  },
})

export interface PointerMarkOptions {
  w?: number
  h?: number
  tier?: Tier
  calm?: boolean
}

export function pointerMark(seed: string | number, o: PointerMarkOptions = {}): InkResult {
  const w = o.w ?? 22
  const h = o.h ?? 20
  const ink = new Ink(seed, { tier: o.tier, calm: o.calm })
  const r = ink.next('pointer')
  const x = w / 2 + r.gauss(0, 0.5)
  arrow(ink, x - 0.6, 0.6, x + r.range(-0.4, 1), h - 1.8, { pen: 'ink', head: 'v', headLen: Math.min(10.5, h * 0.56), curve: r.range(0.1, 0.17), opts: { width: 1.6 } })
  ink.grow([0, 0, w, h])
  return ink.toSvg({ w, h, pad: 3 })
}
