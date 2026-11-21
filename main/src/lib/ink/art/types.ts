import type { PaintKey } from '@/lib/ink/paint'
import type { Accent } from '@/lib/ink/types'
import { validateArt, type Problem } from '@/lib/ink/art/dsl'

export type ArtKind = 'icon' | 'doodle' | 'sticker' | 'mascot' | 'prop' | 'scene'

export type ArtColour = Exclude<PaintKey, 'current'> | `${Exclude<PaintKey, 'current'>}~` | 'acc' | 'sil'

export type LetterFont = 'hand' | 'type'

export interface Hand {
  start?: 'pool' | 'soft'
  end?: 'pool' | 'flick' | 'soft'
  taper?: number
}

export type Part =
  | readonly ['f', ArtColour, string, number?]
  | readonly ['s', string, number?, Hand?]
  | readonly ['c', ArtColour, string, number?, Hand?]
  | readonly ['d', number, number, number?]
  | readonly ['h', string, number?]
  | readonly ['t', string, number, number, number, ArtColour?, LetterFont?]

export type ArtAccent = Accent | 'hi' | 'kraft'

export interface ArtDef {
  grid: 24 | 64 | readonly [number, number]
  parts: readonly Part[]
  small?: readonly Part[]
  micro?: readonly Part[]
  hi?: readonly Part[]
  accent?: ArtAccent
  nibK?: number
  tags?: readonly string[]
  shade?: boolean
  tilt?: number
  rtl?: 'flip'
  mirror?: boolean
  kind?: ArtKind
}

export interface BadgeGen {
  gen: 'badge'
  text: string
  shape?: 'scallop' | 'starburst' | 'rosette' | 'banner' | 'tag' | 'ticket' | 'plate' | 'shield' | 'medal'
  color?: Exclude<PaintKey, 'current'>
  sub?: string
  bumps?: number
  amp?: number
  deco?: 'tick' | 'star' | 'sparkle' | 'swoosh' | 'percent'
  textColor?: Exclude<PaintKey, 'current'>
  tilt?: number
  tags?: readonly string[]
  kind?: ArtKind
}

export interface StampGen {
  gen: 'stamp'
  text: string
  shape: 'rect' | 'round' | 'burst' | 'void'
  sub?: string
  ring?: string
  ink?: 'red' | 'ink-you' | 'green' | 'ink'
  w?: number
  h?: number
  tilt?: number
  ghost?: boolean
  dashed?: boolean
  wear?: number
  stars?: number
  tags?: readonly string[]
  kind?: ArtKind
}

export type StickerDef = ArtDef | BadgeGen | StampGen

declare const process: { env?: { NODE_ENV?: string } } | undefined

const isDev = (): boolean => {
  const env = (import.meta as unknown as { env?: { DEV?: boolean } }).env
  if (env && typeof env.DEV === 'boolean') return env.DEV
  return typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production'
}

function check(kind: ArtKind, id: string, def: ArtDef): void {
  if (!isDev()) return
  const errors = validateArt(def, { id, kind }).filter((p: Problem) => p.level === 'error')
  if (errors.length) throw new Error(`ink art: ${kind} "${id}": ${errors.map((e) => `${e.at ? e.at + ' ' : ''}${e.msg}`).join('; ')}`)
}

function make<T extends Record<string, ArtDef>>(kind: ArtKind, map: T): T {
  const out: Record<string, ArtDef> = {}
  for (const id of Object.keys(map)) {
    const def = { ...map[id], kind }
    check(kind, id, def)
    out[id] = def
  }
  return out as T
}

export const defineIcons = <const T extends Record<string, ArtDef>>(map: T): T => make('icon', map)
export const defineDoodles = <const T extends Record<string, ArtDef>>(map: T): T => make('doodle', map)
export const defineMascot = <const T extends Record<string, ArtDef>>(map: T): T => make('mascot', map)
export const defineProps = <const T extends Record<string, ArtDef>>(map: T): T => make('prop', map)
export function defineStickers<const T extends Record<string, StickerDef>>(map: T): T {
  const out: Record<string, StickerDef> = {}
  for (const id of Object.keys(map)) {
    const def = map[id]
    if ('gen' in def) out[id] = { ...def, kind: 'sticker' }
    else {
      const d = { ...def, kind: 'sticker' as const }
      check('sticker', id, d)
      out[id] = d
    }
  }
  return out as T
}

export const defineIcon = (def: ArtDef): ArtDef => make('icon', { def }).def
export const defineDoodle = (def: ArtDef): ArtDef => make('doodle', { def }).def
export const defineSticker = (def: StickerDef): StickerDef => defineStickers({ def }).def

export const isGen = (d: StickerDef): d is BadgeGen | StampGen => 'gen' in d
