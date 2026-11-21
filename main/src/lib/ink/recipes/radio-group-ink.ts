import { blobFill, wash } from '@/lib/ink/fills'
import { ellipsePoly } from '@/lib/ink/geom'
import { clamp } from '@/lib/ink/rng'
import { dashedBox, focusRing, loop, spiralLines } from '@/lib/ink/shapes'
import { defineRecipe } from '@/lib/ink/recipes'
import { reveal, revealId } from '@/lib/ink/recipes/draw-on-ink'
import type { PenName, Pt } from '@/lib/ink/types'

export interface RadioParams {
  disabled?: boolean
  invalid?: boolean
}

export const radioRecipe = defineRecipe<RadioParams>({
  id: 'radio-group',
  kind: 'radio',
  layers: ['rest', 'hover', 'checked', 'focus'],
  lazy: ['focus'],
  pad: 12,
  draw(ink, { w, h }, { disabled, invalid }, ctx) {
    const s = Math.min(w, h)
    const cx = w / 2
    const cy = h / 2
    const R = s / 2 - 1
    const fine = s < 18
    const calm = ctx.calm
    const disc = ellipsePoly(cx, cy, R, R, 28)

    if (!disabled) ctx.lazy('focus', (fink) => focusRing(fink, 0, 0, w, h, { shape: 'ellipse' }))
    if (ctx.lazyOnly) return

    const ring = (pen: PenName, opts?: { width?: number }): void => loop(ink, cx, cy, R, R, { pen, clean: true, opts })
    const inkPen: PenName = invalid ? (calm || fine ? 'red.fine' : 'red') : calm ? 'pencil.fine' : fine ? 'ink.fine' : 'ink'

    ink.layer('rest', () => {
      if (disabled) {
        wash(ink, disc, 'pencil-mark', { alpha: 0.35, material: 'wash' })
        dashedBox(ink, 0, 0, w, h, { r: s / 2, pen: 'pencil', opts: { color: 'pencil', width: 1.2 } })
        return
      }
      ink.poly('under', disc, 'slip', 0.85)
      ring(inkPen, invalid ? { width: 1.15 } : s >= 26 ? { width: 1.2 } : undefined)
    })

    if (!disabled) {
      ink.layer('hover', () => {
        if (calm) {
          loop(ink, cx, cy, R - 1.6, R - 1.6, { pen: invalid ? 'red.fine' : 'pencil.fine', turns: 1.05, opts: { alpha: 0.75, simple: true } })
          return
        }
        const d = 1.8 + s / 24
        const arc = (a0: number, a1: number): Pt[] => {
          const pts: Pt[] = []
          for (let i = 0; i <= 5; i++) {
            const a = a0 + ((a1 - a0) * i) / 5
            pts.push([cx + Math.cos(a) * (R + d), cy + Math.sin(a) * (R + d)])
          }
          return pts
        }
        ink.lines(
          [
            { pts: arc(0.25, 1.05), o: { start: 'soft', end: 'flick' } },
            { pts: arc(1.25, 1.85), o: { start: 'soft', end: 'flick', width: 0.8 } },
          ],
          'ink.fine',
          { width: 1.1 }
        )
      })
    }

    ink.layer('checked', () => {
      if (disabled) {
        wash(ink, ellipsePoly(cx, cy, R * 0.6, R * 0.6, 20), 'pencil-mark', { alpha: 0.55, material: 'wash' })
        return
      }
      const dotR = clamp(R * 0.68, 2.6, 14)
      ink.part('fill', () => blobFill(ink, ellipsePoly(cx, cy, dotR, dotR, 20), 'marker', { alpha: 0.88, mis: clamp(s * 0.07, 0.8, 2) }))
      if (invalid) ring('red', { width: 1.25 })
      const spiral = spiralLines(ink.next('spiral'), cx, cy, dotR * 0.85, { turns: fine ? 1.8 : 2.2, steps: fine ? 18 : 24, shrink: 0.82 })
      reveal(ink, { id: revealId(ctx.seed, 'd'), lines: spiral, pen: fine ? 'ink.fine' : 'ink', box: { w, h }, width: fine ? 0.9 : 1, revealWidth: Math.max(3, dotR * 0.9) })
    })
  },
})
