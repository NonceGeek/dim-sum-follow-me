import type { Ink } from '@/lib/ink/builder'
import { paint } from '@/lib/ink/paint'
import { hashSeed } from '@/lib/ink/rng'
import type { Box } from '@/lib/ink/recipes'
import type { Line, PenName, Pt } from '@/lib/ink/types'

export const REVEAL_DASH = '[&>svg_[data-part=reveal]]:[stroke-dasharray:1]'
export const REVEAL_WHEN_CHECKED = 'data-touched:data-[state=checked]:[&>svg_[data-part=reveal]]:animate-[ll-draw_var(--ll-dur-sheet)_var(--ll-ease-out)_both]'
export const REVEAL_WHEN_INDETERMINATE = 'data-touched:data-[state=indeterminate]:[&>svg_[data-part=reveal]]:animate-[ll-draw_var(--ll-dur-sheet)_var(--ll-ease-out)_both]'
export const REVEAL_WHEN_ON = 'data-touched:data-[state=on]:[&>svg_[data-part=reveal]]:animate-[ll-draw_var(--ll-dur-sheet)_var(--ll-ease-out)_both]'

export function markTouched(e: { currentTarget: Element }): void {
  e.currentTarget.setAttribute('data-touched', '')
}

export function revealId(seed: string, name: string): string {
  return `ll-rv-${hashSeed(seed).toString(36)}${name}`
}

export interface RevealOpts {
  id: string
  lines: Line[]
  pen: PenName
  box: Box
  width?: number
  revealWidth?: number
}

export function reveal(ink: Ink, o: RevealOpts): void {
  const sym = ink.define(() => ink.lines(o.lines, o.pen, { width: o.width }))
  const d = o.lines.map((l) => l.pts.map((p: Pt, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('')).join('')
  const pad = 12
  const sw = o.revealWidth ?? Math.max(3.4, Math.min(o.box.w, o.box.h) * 0.3)
  ink.raw(
    `<mask id="${o.id}" maskUnits="userSpaceOnUse" x="${-pad}" y="${-pad}" width="${o.box.w + 2 * pad}" height="${o.box.h + 2 * pad}">` +
      `<path data-part="reveal" d="${d}" pathLength="1" fill="none" stroke="${paint('photo')}" stroke-width="${sw.toFixed(1)}" stroke-linejoin="round"/>` +
      `</mask>`,
    'under',
  )
  ink.raw(`<g mask="url(#${o.id})"><use href="#${sym}"/></g>`, 'top')
}
