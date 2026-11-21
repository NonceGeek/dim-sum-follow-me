import { dieCut, type DieCutResult } from '@/lib/ink/art-draw'
import type { ArtDef } from '@/lib/ink/art/types'
import { clamp } from '@/lib/ink/rng'

export interface MascotDrawOpts {
  tier?: 'lo' | 'hi'
  idPrefix?: string
  border?: number
  shadow?: boolean
}

export const mascotVariant = (size: number): 'micro' | 'small' | 'master' | 'hi' => (size < 28 ? 'micro' : size < 56 ? 'small' : size < 140 ? 'master' : 'hi')

export function drawMascot(def: ArtDef, size: number, seed: string | number, o: MascotDrawOpts = {}): DieCutResult {
  const px = Math.max(16, Math.round(size))
  const border = o.border ?? (px < 28 ? 1 : clamp(px * 0.065, 1.8, 6.5))
  const art = Math.max(8, px - 2 * Math.ceil(border + 2))
  const nib = clamp(art * (def.nibK ?? 0.05), 1.05, 4.6)
  return dieCut(def, art, seed, { border, nib, tier: o.tier ?? 'lo', variant: mascotVariant(px), idPrefix: o.idPrefix, shadow: o.shadow, silAll: false, crisp: true, grain: false })
}
