import { line, squiggle } from '@/lib/ink'
import { defineRecipe } from '@/lib/ink/recipes'

export type CardRuleStyle = 'pencil' | 'dashed' | 'wavy'

export interface CardRuleParams {
  edge: 'top' | 'bottom'
  style: CardRuleStyle
}

export const cardRuleRecipe = defineRecipe<CardRuleParams>({
  id: 'card-rule',
  kind: 'rule',
  layers: ['rest'],
  pad: 8,
  draw(ink, { w, h }, { edge, style }, ctx) {
    const y = edge === 'bottom' ? h - 1 : 1
    const x0 = Math.min(14, w * 0.05)
    const x1 = w - x0
    ink.layer('rest', () => {
      if (ctx.calm) {
        line(ink, x0, y, x1, y, { pen: 'pencil.fine', opts: { alpha: 0.7, wobble: 0.2 } })
      } else if (style === 'dashed') {
        const r = ink.next('dash')
        const dash = 8
        const gap = 5.5
        for (let x = x0 + r.range(0, 3); x < x1 - dash; x += dash + gap + r.gauss(0, 0.6)) {
          const yy = y + r.gauss(0, 0.45) - ((x - x0) / (x1 - x0)) * 0.9
          ink.stroke([[x, yy], [x + dash * r.range(0.85, 1.1), yy + r.gauss(0, 0.35)]], 'pencil', { simple: true, wobble: 0.3, start: 'soft', end: 'soft', width: 0.9 })
        }
      } else if (style === 'wavy') {
        squiggle(ink, x0, y, x1 - x0, { pen: 'pencil.fine', h: 3, amp: 1.3, wl: 15 })
      } else {
        line(ink, x0, y, x1, y, { pen: 'pencil' })
      }
    })
  },
})
