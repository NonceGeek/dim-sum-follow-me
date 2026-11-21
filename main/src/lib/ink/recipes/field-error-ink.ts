import { underline } from '@/lib/ink/shapes'
import { defineRecipe } from '@/lib/ink/recipes'

export const fieldErrorRecipe = defineRecipe<Record<string, never>>({
  id: 'field-error',
  kind: 'underline',
  layers: ['rest'],
  pad: 12,
  draw(ink, { w, h }, _p, ctx) {
    ink.layer('rest', () => {
      underline(ink, -1, h + 0.5, w + 2, { kind: ctx.calm ? 'single' : 'wavy', pen: ctx.calm ? 'red.fine' : 'redfelt.fine', opts: { simple: w > 200 } })
    })
  },
})
