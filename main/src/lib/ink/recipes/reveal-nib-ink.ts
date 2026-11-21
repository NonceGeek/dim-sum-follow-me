import { blobFill } from '@/lib/ink/fills'
import { defineRecipe } from '@/lib/ink/recipes'
import type { PaintKey } from '@/lib/ink/paint'
import { seg } from '@/lib/ink/geom'
import type { Pt } from '@/lib/ink/types'

export interface RevealNibParams {
  color?: PaintKey
}

export const revealNibRecipe = defineRecipe<RevealNibParams>({
  id: 'reveal-nib',
  kind: 'reveal-nib',
  layers: ['rest'],
  pad: 4,
  draw(ink, { w, h }, { color = 'tomato' }) {
    const s = Math.min(w, h) / 24
    const P = (x: number, y: number): Pt => [x * s, y * s]
    ink.layer('rest', () => {
      blobFill(ink, [P(6.5, 17.5), P(18.5, 3.5), P(22.5, 6.5), P(9.5, 19.5)], 'paper', { alpha: 0.95, mis: 0.6, material: 'wash' })
      blobFill(ink, [P(15.4, 7.1), P(18.5, 3.5), P(22.5, 6.5), P(19.2, 10)], color, { alpha: 0.95, mis: 0.5, material: 'wash' })
      ink.lines(
        [
          { pts: seg(...P(6.5, 17.5), ...P(18.5, 3.5), 0.2, 5), o: { start: 'soft', end: 'soft' } },
          { pts: seg(...P(9.5, 19.5), ...P(22.5, 6.5), 0.2, 5), o: { start: 'soft', end: 'soft' } },
          { pts: seg(...P(18.5, 3.5), ...P(22.5, 6.5), 0.1, 3), o: { start: 'soft', end: 'soft' } },
          { pts: [P(6.5, 17.5), P(3.2, 21.4), P(9.5, 19.5)], o: { poly: true, round: 0.4 } },
        ],
        'ink.fine',
        { width: 0.9 },
      )
      ink.dot(...P(3.4, 21.6), 1.5 * s, 'ink', { width: 1 })
    })
  },
})
