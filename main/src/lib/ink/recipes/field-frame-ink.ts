import { wash } from '@/lib/ink/fills'
import { roundRectPoly } from '@/lib/ink/geom'
import { clamp } from '@/lib/ink/rng'
import { box, dashedBox, focusRing, squiggle, RULER } from '@/lib/ink/shapes'
import type { Ink } from '@/lib/ink/builder'
import type { RecipeContext, Box } from '@/lib/ink/recipes'

export interface FieldFrameParams {
  disabled?: boolean
  invalid?: boolean
  readOnly?: boolean
  multiline?: boolean
  ruled?: boolean
  lineHeight?: number
  ruleTop?: number
  grip?: boolean
}

const RULE_OFFSET = 0.74

function ruledLines(ink: Ink, w: number, h: number, p: FieldFrameParams, alpha: number): void {
  const lh = p.lineHeight ?? 28
  const top = p.ruleTop ?? 8
  const bottom = h - 4
  for (let i = 0; ; i++) {
    const y = top + i * lh + lh * RULE_OFFSET
    if (y > bottom) break
    ink.stroke([[8, y], [w - 8, y]], 'pencil.fine', { ...RULER, color: 'rule-blue', alpha, width: 1.05, simple: true })
  }
}

function grip(ink: Ink, w: number, h: number, rtl: boolean): void {
  const X = (x: number): number => (rtl ? w - x : x)
  ink.stroke([[X(w - 12), h - 3.4], [X(w - 3.4), h - 12]], 'pencil.fine', { ...RULER, alpha: 0.85, simple: true })
  ink.stroke([[X(w - 7.6), h - 3.2], [X(w - 3.2), h - 7.6]], 'pencil.fine', { ...RULER, alpha: 0.85, simple: true })
}

function bang(ink: Ink, x: number, y: number): void {
  ink.stroke([[x, y - 7.5], [x + 0.6, y + 1.6]], 'redfelt', { end: 'flick', wobble: 0.2, width: 1.7 })
  ink.dot(x + 0.8, y + 6.8, 1.5, 'redfelt')
}

export function drawFieldFrame(ink: Ink, { w, h }: Box, p: FieldFrameParams, ctx: RecipeContext): void {
  const r = clamp(Math.min(w, h) * 0.08, 2, 4)
  const body = roundRectPoly(1.5, 1.5, w - 3, h - 3, r)
  const ruled = p.ruled && !!p.multiline
  const rtl = ctx.dir === 'rtl'

  if (p.disabled) {
    if (ctx.lazyOnly) return
    ink.layer('disabled', () => {
      wash(ink, body, 'paper-shade', { alpha: 0.9, material: 'wash' })
      if (ruled) ruledLines(ink, w, h, p, 0.55)
      dashedBox(ink, 0, 0, w, h, { r, pen: 'pencil', opts: { color: 'pencil-mark' } })
      if (p.grip) grip(ink, w, h, rtl)
    })
    return
  }

  ctx.lazy('focus', (fink) => focusRing(fink, 0, 0, w, h, { r }))
  if (!p.readOnly) {
    ctx.lazy('hover', (hink) =>
      box(hink, 0.6, 0.6, w - 1.2, h - 1.2, { pen: p.invalid ? 'red.fine' : 'ink.fine', corner: r, loose: 0.7, opts: { alpha: p.invalid ? 0.7 : 0.75 } }),
    )
  }
  if (ctx.lazyOnly) return

  const bangY = p.multiline ? 18 : h / 2
  if (p.invalid) {
    ink.layer('invalid', () => {
      ink.poly('under', body, 'slip', 0.7)
      if (ruled) ruledLines(ink, w, h, p, 0.8)
      box(ink, 0, 0, w, h, { pen: ctx.calm ? 'red.fine' : 'red', corner: r, opts: { width: ctx.calm ? 1.1 : 1.25 } })
      const len = clamp(w - 40, 24, 110)
      if (!ctx.calm) squiggle(ink, rtl ? w - 6 - len : 6, h + 5, len, { pen: 'redfelt.fine', h: 7, amp: 0.8 })
      if (w >= 72) bang(ink, rtl ? 18 : w - 18, bangY)
      if (p.grip) grip(ink, w, h, rtl)
    })
    return
  }

  ink.layer('rest', () => {
    if (p.readOnly) {
      wash(ink, body, 'paper-shade', { alpha: 0.6, material: 'wash' })
      if (ruled) ruledLines(ink, w, h, p, 0.8)
      box(ink, 0, 0, w, h, { pen: 'pencil.fine', corner: r, opts: { alpha: 0.8 } })
    } else {
      ink.poly('under', body, 'slip', 0.7)
      if (ruled) ruledLines(ink, w, h, p, 1)
      if (ctx.calm) box(ink, 0, 0, w, h, { pen: 'pencil.fine', corner: r })
      else box(ink, 0, 0, w, h, { pen: 'pencil', corner: r, opts: { width: 1.15 } })
    }
    if (p.grip) grip(ink, w, h, rtl)
  })
}
