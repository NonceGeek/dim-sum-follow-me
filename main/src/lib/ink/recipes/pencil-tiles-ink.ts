import { Ink } from '@/lib/ink/builder'
import { loopLines, RULER } from '@/lib/ink/shapes'
import type { Line, Pt } from '@/lib/ink/types'

export const EDGE_LEN = 96
export const EDGE_TH = 5
export const HATCH = 40
export const CIRCLE = 64

const CURRENT = { color: 'current' as const }

function tile(seed: string, w: number, h: number, draw: (ink: Ink) => void, tier: 'lo' | 'hi' = 'lo', stretch = false): string {
  const ink = new Ink(seed, { tier, grain: false })
  ink.layer('rest', () => draw(ink))
  const svg = ink.toSvg({ w, h, pad: 0 }).svg
  const fit = stretch ? ' preserveAspectRatio="none"' : ''
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${fit}>${svg}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(doc)}")`
}

export function edgeTile(seed: string, vertical: boolean): string {
  const w = vertical ? EDGE_TH : EDGE_LEN
  const h = vertical ? EDGE_LEN : EDGE_TH
  const c = EDGE_TH / 2
  const ends: Pt[] = vertical ? [[c, -16], [c, EDGE_LEN + 16]] : [[-16, c], [EDGE_LEN + 16, c]]
  return tile(seed, w, h, (ink) => ink.stroke(ends, 'pencil', { ...CURRENT, ...RULER, width: 0.95, simple: true }), 'lo', true)
}

export function hatchTile(seed: string): string {
  return tile(seed, HATCH, HATCH, (ink) => {
    const rng = ink.next('hatch')
    const gap = HATCH / 5
    const J = Array.from({ length: 5 }, () => rng.gauss(0, 0.35))
    const width = rng.range(0.86, 1.02)
    const slot = (i: number): number => J[((i % 5) + 5) % 5]
    const lines: Line[] = []
    for (let i = -4; i <= 9; i++) {
      const x0 = i * gap
      const top = slot(i), bot = slot(i - 3)
      const slope = (bot - top) / HATCH
      const a: Pt = [x0 + (HATCH + 24) * 0.6 + top - slope * 24, -24]
      const b: Pt = [x0 - 24 * 0.6 + bot + slope * 24, HATCH + 24]
      lines.push({
        pts: [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b],
        o: { simple: true, start: 'soft', end: 'soft', speed: 1.1, wobble: 0.1, width },
      })
    }
    ink.lines(lines, 'pencil', { ...CURRENT })
  }, 'hi')
}

export function circleTile(seed: string): string {
  return tile(seed, CIRCLE, CIRCLE, (ink) => {
    const lines = loopLines(ink.next('circle'), CIRCLE / 2, CIRCLE / 2, CIRCLE / 2 - 5, CIRCLE / 2 - 5, { clean: true })
    ink.lines(lines, 'pencil', { ...CURRENT, width: 1.05, simple: true })
  })
}
