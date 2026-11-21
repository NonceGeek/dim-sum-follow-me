import { solidFill } from '@/lib/ink/fills'
import { roundRectPoly } from '@/lib/ink/geom'
import { clamp } from '@/lib/ink/rng'
import { box } from '@/lib/ink/shapes'
import { defineRecipe } from '@/lib/ink/recipes'
import type { PenName, Pt } from '@/lib/ink/types'

export const progressToneList = ['marker', 'hi', 'green', 'blue'] as const
export type ProgressTone = (typeof progressToneList)[number]

const TONE_PEN: Record<ProgressTone, PenName> = { marker: 'terracotta', hi: 'hi', green: 'm_grass', blue: 'm_sky' }

export const progressRecipe = defineRecipe<Record<string, never>>({
  id: 'progress',
  kind: 'progress',
  layers: ['rest'],
  pad: 12,
  draw(ink, { w, h }, _p, ctx) {
    const r = clamp(h * 0.22, 1.5, 4)
    const body = roundRectPoly(1.2, 1.2, w - 2.4, h - 2.4, r)
    ink.layer('rest', () => {
      ink.poly('under', body, 'slip', 0.85)
      const gap = clamp(w / 60, ctx.calm ? 5.5 : 4, 40)
      void gap
      solidFill(ink, body, 'paper-shade', { alpha: 1, material: 'wash' })
      if (ctx.calm) box(ink, 0, 0, w, h, { pen: 'pencil.fine', corner: r })
      else box(ink, 0, 0, w, h, { pen: 'ink', corner: r, opts: { width: 1.05, simple: w > 240 } })
    })
  },
})

export interface ProgressFillParams {
  tone?: ProgressTone
  indeterminate?: boolean
}

export const progressFillRecipe = defineRecipe<ProgressFillParams>({
  id: 'progress-fill',
  kind: 'progress',
  layers: ['rest'],
  pad: 12,
  draw(ink, { w, h }, { tone = 'marker', indeterminate }, ctx) {
    ink.layer('rest', () => {
      if (indeterminate) {
        const rng = ink.next('scribble')
        const top = h * 0.16
        const bot = h * 0.84
        const step = clamp(w / 40, h * 0.75, 16)
        const pts: Pt[] = [[-1, h / 2]]
        for (let x = 2, up = false; x < w - 1; x += step, up = !up) pts.push([Math.min(x + rng.range(-1, 1), w - 1), (up ? top : bot) + rng.range(-0.8, 0.8)])
        pts.push([w + 0.5, h / 2])
        ink.stroke(pts, TONE_PEN[tone], { width: tone === 'hi' ? 0.36 : tone === 'blue' ? 1.4 : clamp(h * 0.07, 0.5, 0.9), alpha: 0.92, start: 'pool', end: 'pool', wobble: 0.5, poly: true, round: 2, simple: w > 160 || ctx.calm })
        return
      }
      const base = tone === 'hi' ? 14 : 9
      const width = clamp((h - 3.4) / base, 0.3, 2.2)
      const mid = h / 2
      const long = w > 300
      void width
      void mid
      void long
      const color = tone === 'hi' ? 'hi' : tone === 'green' ? 'grass' : tone === 'blue' ? 'sky' : 'marker'
      ink.part('fill', () => {
        solidFill(ink, roundRectPoly(1.6, 1.6, w - 3.2, h - 3.2, clamp(h * 0.22, 1.5, 4)), color, { alpha: 0.95 })
        return { dx: 0, dy: 0 }
      })
    })
  },
})
