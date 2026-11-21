import { PathWriter } from '@/lib/ink/geom'
import type { Q } from '@/lib/ink/paint'
import type { Rng } from '@/lib/ink/rng'
import { GLYPH_FONTS, type GlyphFont } from '@/lib/ink/art/glyphs'
import type { LetterFont } from '@/lib/ink/art/types'

type Cmd = readonly [string, ...number[]]
const parsed = new Map<string, Cmd[]>()

function commands(font: LetterFont, ch: string): Cmd[] {
  const key = font + ch
  let c = parsed.get(key)
  if (c) return c
  c = []
  const d = GLYPH_FONTS[font].d[ch] ?? ''
  for (const m of d.matchAll(/([MLQZ])([^MLQZ]*)/g)) {
    const nums = m[2].trim() ? m[2].trim().split(/[ ,]+/).map(Number) : []
    c.push([m[1], ...nums] as unknown as Cmd)
  }
  parsed.set(key, c)
  return c
}

const upper = (s: string): string => s.toUpperCase()

const FIT = 0.8

export const hasGlyph = (font: string, ch: string): boolean => {
  const F = (GLYPH_FONTS as Record<string, GlyphFont>)[font]
  return !!F && (ch === ' ' || !!F.d[ch])
}

export function measureText(font: LetterFont, text: string, size: number, spacing = 0): number {
  const F = GLYPH_FONTS[font]
  let w = 0
  const t = upper(text)
  for (let i = 0; i < t.length; i++) w += ((F.adv[t[i]] ?? F.adv[' '] ?? 300) / 1000) * size * FIT + (i < t.length - 1 ? spacing : 0)
  return w
}

export const capHeight = (font: LetterFont, size: number): number => (GLYPH_FONTS[font].cap / 1000) * size * FIT

export interface TextOpts {
  font?: LetterFont
  anchor?: 'start' | 'middle' | 'end'
  spacing?: number
  jitter?: number
  rot?: number
  squeeze?: number
  q?: Q
}

export interface TextPath {
  d: string
  width: number
  bbox: [number, number, number, number]
}

export function textPath(text: string, x: number, y: number, em: number, rng: Rng, o: TextOpts = {}): TextPath {
  const font = o.font ?? 'hand'
  const F = GLYPH_FONTS[font]
  const t = upper(text)
  const sq = o.squeeze ?? 1
  const size = em * FIT
  const s = size / 1000
  const spacing = o.spacing ?? 0
  const jit = (o.jitter ?? 0) * 0.3
  const total = measureText(font, t, em, spacing) * sq
  const x0 = o.anchor === 'start' ? x : o.anchor === 'end' ? x - total : x - total / 2
  const w = new PathWriter(o.q ?? 10)
  const ampY = 0.045 * size * jit
  const ph = rng() * 6.28, ph2 = rng() * 6.28
  const rot0 = ((o.rot ?? 0) * Math.PI) / 180
  const cr = Math.cos(rot0), sr = Math.sin(rot0)
  let pen = 0
  const bb: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    const adv = ((F.adv[ch] ?? F.adv[' '] ?? 300) / 1000) * size * sq
    const cmds = commands(font, ch)
    if (cmds.length) {
      const dy = ampY * (0.6 * Math.sin(i * 0.9 + ph) + 0.4 * Math.sin(i * 2.3 + ph2)) + rng.gauss(0, ampY * 0.3)
      const lean = (rng.gauss(0, 1.5) * jit * Math.PI) / 180
      const gx = pen + adv / 2, gy = 0
      const cl = Math.cos(lean), sl = Math.sin(lean)
      const tr = (px: number, py: number): [number, number] => {
        let X = px * s * sq + pen, Y = py * s + dy
        const rx = X - gx, ry = Y - gy
        X = gx + rx * cl - ry * sl
        Y = gy + rx * sl + ry * cl
        const ax = x0 - x + X
        return [x + ax * cr - Y * sr, y + ax * sr + Y * cr]
      }
      for (const c of cmds) {
        const k = c[0]
        if (k === 'M') { const [a, b] = tr(c[1], c[2]); w.M(a, b); grow(bb, a, b) }
        else if (k === 'L') { const [a, b] = tr(c[1], c[2]); w.L(a, b); grow(bb, a, b) }
        else if (k === 'Q') { const [a, b] = tr(c[1], c[2]); const [e, f] = tr(c[3], c[4]); w.Q(a, b, e, f); grow(bb, e, f) }
        else if (k === 'Z') w.Z()
      }
    }
    pen += adv + spacing
  }
  return { d: w.d, width: total, bbox: bb[0] === Infinity ? [x, y, x, y] : bb }
}

function grow(b: [number, number, number, number], x: number, y: number): void {
  if (x < b[0]) b[0] = x
  if (y < b[1]) b[1] = y
  if (x > b[2]) b[2] = x
  if (y > b[3]) b[3] = y
}
