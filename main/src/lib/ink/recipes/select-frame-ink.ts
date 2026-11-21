import { wash } from '@/lib/ink/fills'
import { roundRectPoly } from '@/lib/ink/geom'
import { clamp } from '@/lib/ink/rng'
import { box, focusRing, squiggle, RULER } from '@/lib/ink/shapes'
import type { Box, RecipeContext } from '@/lib/ink/recipes'
import type { Ink } from '@/lib/ink/builder'
import { drawFieldFrame } from '@/lib/ink/recipes/field-frame-ink'

export interface SelectFrameParams {
  disabled?: boolean
  invalid?: boolean
  openable?: boolean
  cell?: number
}

function divider(ink: Ink, x: number, h: number, alpha: number): void {
  ink.stroke([[x, 7], [x, h - 7]], 'pencil.fine', { ...RULER, alpha, simple: true })
}

function bang(ink: Ink, x: number, y: number): void {
  ink.stroke([[x, y - 7.5], [x + 0.6, y + 1.6]], 'redfelt', { end: 'flick', wobble: 0.2, width: 1.7 })
  ink.dot(x + 0.8, y + 6.8, 1.5, 'redfelt')
}

export function drawSelectFrame(ink: Ink, box_: Box, p: SelectFrameParams, ctx: RecipeContext): void {
  const { w, h } = box_
  const cell = p.cell ?? 32
  const rtl = ctx.dir === 'rtl'
  const tickX = rtl ? cell : w - cell
  const roomy = w >= cell * 2.4
  const r = clamp(Math.min(w, h) * 0.08, 2, 4)
  const body = roundRectPoly(1.5, 1.5, w - 3, h - 3, r)

  if (p.invalid && !p.disabled) {
    ctx.lazy('focus', (f) => focusRing(f, 0, 0, w, h, { r }))
    ctx.lazy('hover', (hv) => box(hv, 0.6, 0.6, w - 1.2, h - 1.2, { pen: 'red.fine', corner: r, loose: 0.7, opts: { alpha: 0.7 } }))
    if (ctx.lazyOnly) return
    ink.layer('invalid', () => {
      ink.poly('under', body, 'slip', 0.7)
      box(ink, 0, 0, w, h, { pen: ctx.calm ? 'red.fine' : 'red', corner: r, opts: { width: ctx.calm ? 1.1 : 1.25 } })
      const len = clamp(w - cell - 32, 24, 110)
      if (!ctx.calm) squiggle(ink, rtl ? w - 6 - len : 6, h + 5, len, { pen: 'redfelt.fine', h: 7, amp: 0.8 })
      if (roomy) bang(ink, rtl ? cell + 14 : w - cell - 14, h / 2)
    })
    return
  }

  drawFieldFrame(ink, box_, { disabled: p.disabled }, ctx)
  if (ctx.lazyOnly) return
  if (roomy) ink.layer(p.disabled ? 'disabled' : 'rest', () => divider(ink, tickX, h, p.disabled ? 0.6 : 0.8))
  if (p.disabled || !p.openable) return
  ink.layer('open', () => {
    wash(ink, body, 'hi', { alpha: ctx.calm ? 0.3 : 0.5 })
    box(ink, 0.6, 0.6, w - 1.2, h - 1.2, { pen: ctx.calm ? 'pencil.fine' : 'ink.fine', corner: r, loose: 0.7, opts: { alpha: 0.85 } })
  })
}
