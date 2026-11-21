import type { Line, PenName, PenSpec, Pt, StrokeOpts } from '@/lib/ink/types'
import type { Ink } from '@/lib/ink/builder'
import { clamp, type Rng } from '@/lib/ink/rng'
import { TAU, seg } from '@/lib/ink/geom'
import { n } from '@/lib/ink/paint'
import { pen } from '@/lib/ink/pens'

export interface ShapeOpts {
  pen?: PenName | PenSpec
  opts?: StrokeOpts
  loose?: number
}

const dirv = (a: Pt, b: Pt): Pt => {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]
}

function put(ink: Ink, salt: string, gen: (rng: Rng) => Line[], defaultPen: PenName, o: ShapeOpts): void {
  ink.lines(gen(ink.next(salt)), o.pen ?? defaultPen, o.opts)
}

export function chain(vs: Pt[], bows: number[], rad: number, rng: Rng, cnt = 14): Pt[] {
  const E = vs.length - 1
  const d: Pt[] = [], len: number[] = []
  for (let i = 0; i < E; i++) {
    d.push(dirv(vs[i], vs[i + 1]))
    len.push(Math.hypot(vs[i + 1][0] - vs[i][0], vs[i + 1][1] - vs[i][1]))
  }
  const rv: number[] = new Array(E + 1).fill(0)
  for (let j = 1; j < E; j++) {
    const r = Math.min(rad * (0.75 + rng() * 0.5), len[j - 1] * 0.45, len[j] * 0.45)
    rv[j] = r < 0.6 ? 0 : r
  }
  const out: Pt[] = []
  for (let i = 0; i < E; i++) {
    const s: Pt = [vs[i][0] + d[i][0] * rv[i], vs[i][1] + d[i][1] * rv[i]]
    const e: Pt = [vs[i + 1][0] - d[i][0] * rv[i + 1], vs[i + 1][1] - d[i][1] * rv[i + 1]]
    const pts = seg(s[0], s[1], e[0], e[1], bows[i] || 0, Math.max(2, Math.ceil(Math.hypot(e[0] - s[0], e[1] - s[1]) / cnt)))
    if (i > 0 && rv[i] === 0) pts.shift()
    out.push(...pts)
    if (i < E - 1 && rv[i + 1] > 0) {
      const V = vs[i + 1], r = rv[i + 1]
      const a = e
      const b: Pt = [V[0] + d[i + 1][0] * r, V[1] + d[i + 1][1] * r]
      const k = 0.9 + rng() * 0.1
      const c: Pt = [V[0] * k + ((a[0] + b[0]) / 2) * (1 - k), V[1] * k + ((a[1] + b[1]) / 2) * (1 - k)]
      for (let j = 1; j < 4; j++) {
        const t = j / 4, u = 1 - t
        out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]])
      }
    }
  }
  return out
}

export const RULER: StrokeOpts = { poly: true, raw: true, start: 'soft', end: 'soft', speed: 1, dry: 0 }

export function lineLines(x1: number, y1: number, x2: number, y2: number): Line[] {
  return [{ pts: [[x1, y1], [x2, y2]], o: RULER }]
}
export function line(ink: Ink, x1: number, y1: number, x2: number, y2: number, o: ShapeOpts = {}): void {
  put(ink, 'line', () => lineLines(x1, y1, x2, y2), 'pencil', o)
}

export function squiggleLines(rng: Rng, x: number, y: number, w: number, o: { h?: number; amp?: number; wl?: number } = {}): Line[] {
  const h = o.h ?? 12
  const amp = clamp(h * 0.2, 1.4, 3.2) * (o.amp ?? 1), wl = clamp(h * 1.1, 10, 18) * (o.wl ?? 1)
  const p1 = rng.range(0, TAU), p2 = rng.range(0, TAU), p3 = rng.range(0, TAU)
  const drift = rng.gauss(0, 0.6)
  const build = (xa: number, xb: number): Pt[] => {
    const pts: Pt[] = []
    let ph = rng.range(0, TAU)
    for (let xx = xa; xx <= xb; xx += 1.8) {
      ph += (1.8 / wl) * TAU * (1 + 0.22 * Math.sin(xx / 37 + p1) + 0.1 * Math.sin(xx / 11 + p2))
      const a = amp * (0.72 + 0.28 * Math.sin(xx / 53 + p3) + 0.12 * Math.sin(xx / 17 + p1))
      pts.push([xx, y + Math.sin(ph) * a + drift * Math.sin(((xx - x) / w) * Math.PI)])
    }
    return pts.filter((_, i) => i % 2 === 0)
  }
  if (w > 300) {
    const m = x + w * rng.range(0.46, 0.6)
    return [
      { pts: build(x, m + 3), o: { start: 'soft', end: 'soft', wobble: 0.5, speed: 1.1 } },
      { pts: build(m - 3, x + w), o: { start: 'soft', end: 'flick', wobble: 0.5, speed: 1.1 } },
    ]
  }
  return [{ pts: build(x, x + w), o: { end: 'flick', wobble: 0.5, speed: 1.1 } }]
}
export function squiggle(ink: Ink, x: number, y: number, w: number, o: ShapeOpts & { h?: number; amp?: number; wl?: number } = {}): void {
  put(ink, 'sq', (r) => squiggleLines(r, x, y, w, o), 'ink', o)
}

export function underlineLines(rng: Rng, x: number, y: number, w: number, o: { kind?: 'single' | 'double' | 'wavy' } = {}): Line[] {
  if (o.kind === 'wavy') return squiggleLines(rng, x, y, w, { h: 7, amp: 0.85 })
  const out: Line[] = [{ pts: [[x, y], [x + w, y]], o: RULER }]
  if (o.kind === 'double') out.push({ pts: [[x, y + 3.6], [x + w, y + 3.6]], o: RULER })
  return out
}
export function underline(ink: Ink, x: number, y: number, w: number, o: ShapeOpts & { kind?: 'single' | 'double' | 'wavy' } = {}): void {
  put(ink, 'ul', (r) => underlineLines(r, x, y, w, o), 'ink', o)
}

export function strikeLines(rng: Rng, x: number, y: number, w: number, o: { double?: boolean } = {}): Line[] {
  const tilt = rng.gauss(0, 0.012) * w
  const x1 = x - rng.range(1, 3), x2 = x + w + rng.range(0, 3)
  const so: StrokeOpts = { start: 'soft', end: 'flick', speed: 1.25, wobble: 0.6 }
  const out: Line[] = [{ pts: seg(x1, y + tilt / 2, x2, y - tilt / 2, rng.gauss(0, 0.003) * w, Math.max(3, Math.ceil(w / 16))), o: so }]
  if (o.double) out.push({ pts: seg(x1 + 2, y + 2.5, x2 - 1, y + 1.5 - tilt, 0, 6), o: so })
  return out
}
export function strike(ink: Ink, x: number, y: number, w: number, o: ShapeOpts & { double?: boolean } = {}): void {
  put(ink, 'st', (r) => strikeLines(r, x, y, w, o), 'red', o)
}

export interface BoxOpts {
  corner?: number
  loose?: number
  wobble?: number
}

export function boxLines(rng: Rng, x: number, y: number, w: number, h: number, o: BoxOpts = {}): Line[] {
  const k = o.loose ?? 1
  const m = Math.min(w, h)
  const jc = clamp(0.012 * m, 0.12, 0.4) * k
  const tilt = rng.gauss(0, 0.0012) * k
  const rad = o.corner ?? clamp(m * 0.09, 0.9, 3.4)
  const C = (px: number, py: number, sy: number): Pt => [px + rng.gauss(0, jc), py + rng.gauss(0, jc) + sy * tilt * w]
  const TL = C(x, y, 0), TR = C(x + w, y, 1), BR = C(x + w, y + h, 1), BL = C(x, y + h, 0)
  const lift = (l: number): number => rng.range(0.05, 0.32) * clamp(l / 110, 0.3, 1.2) * k
  const drift = (l: number): number => rng.gauss(0, 0.1) * clamp(l / 40, 0.4, 1) * k
  const t0 = rng.range(0.35, 0.65)
  const S: Pt = [TL[0] + (TR[0] - TL[0]) * t0, TL[1] + (TR[1] - TL[1]) * t0]
  const run = Math.min(0.06 * w, rng.range(1.6, 2.6))
  const vs: Pt[] = [S, TR, BR, BL, TL, [S[0] + run, S[1]]]
  const bows = [-lift(w * (1 - t0)), drift(h), lift(w), drift(h), -lift(w * t0 + run)]
  return [{ pts: chain(vs, bows, rad, rng), o: { speed: 1, wobble: 0.28 * (o.wobble ?? 1), dry: 0, end: 'soft', start: 'soft' } }]
}
export function box(ink: Ink, x: number, y: number, w: number, h: number, o: ShapeOpts & BoxOpts = {}): void {
  put(ink, 'box', (r) => boxLines(r, x, y, w, h, o), 'ink', o)
}

export function loopLines(rng: Rng, cx: number, cy: number, rx: number, ry: number, o: { turns?: number; a0?: number; drift?: number; breathe?: number; loose?: number; clean?: boolean } = {}): Line[] {
  if (o.clean) {
    const a0 = o.a0 ?? rng.range(-2.9, -1.8)
    const steps = Math.max(24, Math.ceil((rx + ry) * 0.6))
    const turn = 1 + 2.2 / Math.max(6, Math.PI * (rx + ry))
    const ph = rng.range(0, TAU)
    const pts: Pt[] = []
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (i / steps) * turn * TAU
      const kk = 1 + 0.006 * Math.sin(2 * a + ph)
      pts.push([cx + Math.cos(a) * rx * kk, cy + Math.sin(a) * ry * kk])
    }
    return [{ pts, o: { end: 'soft', start: 'soft', wobble: 0.25, speed: 1, dry: 0 } }]
  }
  const turns = o.turns ?? rng.range(1.05, 1.18)
  const a0 = o.a0 ?? rng.range(-2.9, -1.8)
  const tilt = rng.gauss(0, 0.05) * (o.loose ?? 1)
  const drift = o.drift ?? rng.range(-0.07, 0.05)
  const breathe = o.breathe ?? 0.035
  const ph = rng.range(0, TAU)
  const steps = Math.max(16, Math.ceil((rx + ry) * turns * 0.5))
  const pts: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = a0 + t * turns * TAU
    const kk = 1 + breathe * Math.sin(2 * a + ph) + drift * t
    const ex = Math.cos(a) * rx * kk, ey = Math.sin(a) * ry * kk
    pts.push([cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), cy + ex * Math.sin(tilt) + ey * Math.cos(tilt)])
  }
  return [{ pts, o: { end: 'flick', start: 'pool', wobble: 0.7, speed: 1 } }]
}
export function loop(ink: Ink, cx: number, cy: number, rx: number, ry: number, o: ShapeOpts & { turns?: number; a0?: number; drift?: number; breathe?: number; clean?: boolean } = {}): void {
  put(ink, 'loop', (r) => loopLines(r, cx, cy, rx, ry, o), 'ink', o)
}

export function arrowLines(rng: Rng, x1: number, y1: number, x2: number, y2: number, o: { head?: 'v' | 'two' | 'open' | 'solid' | 'none'; curl?: boolean; curve?: number; headLen?: number } = {}): Line[] {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const bow = (o.curve ?? rng.range(-0.1, 0.1)) * len
  let shaft = seg(x1, y1, x2, y2, bow, Math.max(6, Math.ceil(len / 8)))
  if (o.curl) {
    const m = Math.floor(shaft.length * 0.5), pm = shaft[m], pn = shaft[m + 1] || pm
    const d0 = dirv(pm, pn), r0 = Math.min(9, len * 0.09)
    const loopPts: Pt[] = []
    for (let i = 0; i <= 14; i++) {
      const a = -Math.PI / 2 + (i / 14) * TAU
      const lx = Math.cos(a) * r0, ly = Math.sin(a) * r0 * 1.15 + r0 * 1.15
      loopPts.push([pm[0] + d0[0] * lx * 1.1 + d0[1] * (ly - r0 * 1.15), pm[1] + d0[1] * lx * 1.1 - d0[0] * (ly - r0 * 1.15)])
    }
    shaft = [...shaft.slice(0, m), ...loopPts, ...shaft.slice(m + 1)]
  }
  const out: Line[] = [{ pts: shaft, o: { end: 'flick', start: 'pool' } }]
  const style = o.head ?? 'v'
  if (style === 'none') return out
  const p = shaft[shaft.length - 1], q = shaft[shaft.length - 3] || shaft[0]
  const d = dirv(q, p)
  const hl = o.headLen ?? clamp(len * 0.2, 6, 12)
  const s1 = rng.range(0.42, 0.6), s2 = rng.range(0.42, 0.6)
  const tip: Pt = [p[0] + rng.gauss(0, 0.3), p[1] + rng.gauss(0, 0.3)]
  const rot = (a: number, l: number): Pt => [tip[0] - (d[0] * Math.cos(a) - d[1] * Math.sin(a)) * l, tip[1] - (d[0] * Math.sin(a) + d[1] * Math.cos(a)) * l]
  const b1 = rot(s1, hl), b2 = rot(-s2, hl * rng.range(0.85, 1.1))
  if (style === 'v') {
    out.push({ pts: [b1, seg(b1[0], b1[1], tip[0], tip[1], rng.gauss(0, 0.3), 3)[1], tip, seg(tip[0], tip[1], b2[0], b2[1], rng.gauss(0, 0.3), 3)[1], b2], o: { end: 'flick', start: 'soft', wobble: 0.5 } })
  } else if (style === 'two') {
    out.push({ pts: seg(b1[0], b1[1], tip[0], tip[1], 0.3, 4), o: { end: 'pool', start: 'soft', wobble: 0.5 } })
    out.push({ pts: seg(tip[0], tip[1], b2[0], b2[1], -0.3, 4), o: { end: 'flick', start: 'soft', wobble: 0.5 } })
  } else if (style === 'open') {
    out.push({ pts: [b1, tip, b2], o: { end: 'soft', start: 'soft', wobble: 0.4, poly: true } })
  } else {
    const toward = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    out.push({ pts: [b1, tip, b2, toward(b1, tip, 0.12)], o: { end: 'pool', wobble: 0.3, width: 1.1 } })
    const c: Pt = [(b1[0] + b2[0] + tip[0]) / 3, (b1[1] + b2[1] + tip[1]) / 3]
    out.push({ pts: [toward(b1, c, 0.35), toward(b2, c, 0.3), toward(tip, c, 0.3), c], o: { end: 'pool', wobble: 0.2, width: 1.3 } })
  }
  return out
}
export function arrow(ink: Ink, x1: number, y1: number, x2: number, y2: number, o: ShapeOpts & { head?: 'v' | 'two' | 'open' | 'solid' | 'none'; curl?: boolean; curve?: number; headLen?: number } = {}): void {
  put(ink, 'arrow', (r) => arrowLines(r, x1, y1, x2, y2, o), 'ink', o)
}

export function checkLines(rng: Rng, x: number, y: number, s: number): Line[] {
  const a: Pt = [x + s * rng.range(0, 0.1), y + s * rng.range(0.45, 0.58)]
  const b: Pt = [x + s * rng.range(0.32, 0.42), y + s * rng.range(0.86, 0.96)]
  const c: Pt = [x + s * rng.range(0.9, 1.02), y + s * rng.range(0, 0.1)]
  const mid: Pt = [b[0] + (c[0] - b[0]) * 0.45 - s * 0.05, b[1] + (c[1] - b[1]) * 0.45 + s * 0.02]
  return [{ pts: [...seg(a[0], a[1], b[0], b[1], s * 0.03, 4), mid, c], o: { start: 'pool', end: 'flick', speed: 1.1, wobble: 0.5 } }]
}
export function check(ink: Ink, x: number, y: number, s: number, o: ShapeOpts = {}): void {
  put(ink, 'check', (r) => checkLines(r, x, y, s), 'greenfelt', o)
}

export function crossLines(rng: Rng, x: number, y: number, s: number): Line[] {
  const j = (): number => rng.gauss(0, 0.04 * s)
  return [
    { pts: seg(x + j(), y + j(), x + s + j(), y + s + j(), rng.gauss(0, 0.03 * s), 5), o: { end: 'flick', wobble: 0.5 } },
    { pts: seg(x + s + j(), y + j(), x + j(), y + s + j(), rng.gauss(0, 0.03 * s), 5), o: { end: 'flick', wobble: 0.5 } },
  ]
}
export function cross(ink: Ink, x: number, y: number, s: number, o: ShapeOpts = {}): void {
  put(ink, 'cross', (r) => crossLines(r, x, y, s), 'redfelt', o)
}

export function asteriskLines(rng: Rng, cx: number, cy: number, s: number): Line[] {
  const out: Line[] = []
  for (let k = 0; k < 3; k++) {
    const a = Math.PI / 2 + (k * Math.PI) / 3 + rng.gauss(0, 0.07)
    const l = 0.5 * s * rng.range(0.85, 1)
    const c: Pt = [cx + rng.gauss(0, 0.03 * s), cy + rng.gauss(0, 0.03 * s)]
    out.push({ pts: seg(c[0] - Math.cos(a) * l, c[1] - Math.sin(a) * l, c[0] + Math.cos(a) * l, c[1] + Math.sin(a) * l, rng.gauss(0, 0.3), 4), o: { end: 'flick', wobble: 0.4 } })
  }
  return out
}
export function asterisk(ink: Ink, cx: number, cy: number, s: number, o: ShapeOpts = {}): void {
  put(ink, 'ast', (r) => asteriskLines(r, cx, cy, s), 'redfelt', o)
}

export function spiralLines(rng: Rng, cx: number, cy: number, r0: number, o: { turns?: number; steps?: number; shrink?: number } = {}): Line[] {
  const turns = o.turns ?? 2.3
  const steps = o.steps ?? 26
  const a0 = rng.range(0, TAU)
  const pts: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = r0 * (1 - (o.shrink ?? 0.78) * t)
    const a = a0 + t * turns * TAU + rng.range(0, 0.2)
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.94])
  }
  return [{ pts, o: { end: 'pool', start: 'soft', wobble: 0.3, speed: 0.9 } }]
}
export function spiral(ink: Ink, cx: number, cy: number, r: number, o: ShapeOpts & { turns?: number; steps?: number; shrink?: number } = {}): void {
  put(ink, 'spiral', (rg) => spiralLines(rg, cx, cy, r, o), 'ink', o)
}

export function starLines(rng: Rng, cx: number, cy: number, r: number): Line[] {
  const pts: Pt[] = []
  const a0 = -Math.PI / 2 + rng.gauss(0, 0.06)
  for (let i = 0; i <= 5; i++) {
    const a = a0 + ((i * 2) % 5) * (TAU / 5)
    const rr = r * rng.range(0.9, 1.05)
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  pts.push([pts[0][0] + rng.gauss(0, 0.05 * r) + 0.1 * r, pts[0][1] + 0.18 * r])
  return [{ pts, o: { poly: true, wobble: 0.5, end: 'flick' } }]
}
export function star(ink: Ink, cx: number, cy: number, r: number, o: ShapeOpts = {}): void {
  put(ink, 'star', (rg) => starLines(rg, cx, cy, r), 'ink', o)
}

export function tallyLines(rng: Rng, x: number, y: number, count: number, gh: number): { lines: Line[]; width: number } {
  const step = 0.26 * gh, gw = 1.05 * gh + 6
  const lines: Line[] = []
  let gx = x
  let left = count
  while (left > 0) {
    const n5 = Math.min(5, left)
    left -= n5
    const up = Math.min(4, n5)
    for (let i = 0; i < up; i++) {
      const lx = gx + i * step + rng.gauss(0, 0.35)
      lines.push({ pts: seg(lx + rng.gauss(0.4, 0.4), y + rng.gauss(0, 0.5), lx - rng.gauss(0.3, 0.3), y + gh + rng.gauss(0, 0.6), rng.gauss(0, 0.4), 4), o: { end: rng.chance(0.5) ? 'flick' : 'pool', speed: 1.15, wobble: 0.5 } })
    }
    if (n5 === 5) lines.push({ pts: seg(gx - 0.55 * step, y + 0.78 * gh + rng.gauss(0, 0.6), gx + 3.55 * step, y + 0.2 * gh + rng.gauss(0, 0.6), rng.gauss(0, 0.5), 5), o: { end: 'flick', speed: 1.25, wobble: 0.5 } })
    gx += gw
  }
  return { lines, width: gx - x }
}
export function tally(ink: Ink, x: number, y: number, count: number, gh: number, o: ShapeOpts = {}): number {
  const t = tallyLines(ink.next('tally'), x, y, count, gh)
  ink.lines(t.lines, o.pen ?? 'ink', o.opts)
  return t.width
}

export function bracketLines(rng: Rng, x: number, y: number, h: number, o: { kind?: 'square' | 'curly' | 'round'; dir?: 1 | -1 } = {}): Line[] {
  const d = o.dir ?? 1
  const tip = clamp(h * 0.12, 3, 9)
  const kind = o.kind ?? 'square'
  const so: StrokeOpts = { end: 'flick', wobble: 0.5 }
  if (kind === 'square') {
    const rad = Math.min(0.35 * tip, 2.2)
    const pts: Pt[] = [
      [x + d * tip * rng.range(0.85, 1.1), y + rng.gauss(0, 0.5)],
      [x + d * rad, y + rng.gauss(0, 0.2)],
      [x + rng.gauss(0, 0.2), y + rad],
      ...seg(x + rng.gauss(0, 0.2), y + rad, x + rng.gauss(0, 0.6), y + h - rad, rng.gauss(0, 0.004) * h, 6).slice(1),
      [x + d * rad, y + h + rng.gauss(0, 0.2)],
      [x + d * tip * rng.range(0.85, 1.15), y + h + rng.gauss(0, 0.6)],
    ]
    return [{ pts, o: so }]
  }
  if (kind === 'curly') {
    const m = y + h * rng.range(0.47, 0.53)
    return [{ pts: [[x + d * tip, y], [x + 0.35 * d * tip, y + 0.06 * h], [x + 0.3 * d * tip, m - 0.12 * h], [x - 0.15 * d * tip, m], [x + 0.3 * d * tip, m + 0.12 * h], [x + 0.35 * d * tip, y + h * 0.94], [x + d * tip, y + h]], o: so }]
  }
  const pts: Pt[] = []
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    pts.push([x + d * tip * (1 - Math.sin(Math.PI * t)), y + h * t])
  }
  return [{ pts, o: so }]
}
export function bracket(ink: Ink, x: number, y: number, h: number, o: ShapeOpts & { kind?: 'square' | 'curly' | 'round'; dir?: 1 | -1 } = {}): void {
  put(ink, 'br', (r) => bracketLines(r, x, y, h, o), 'pencil', o)
}

export function cloudLines(rng: Rng, cx: number, cy: number, w: number, h: number, o: { bulge?: number } = {}): Line[] {
  const rx = w / 2, ry = h / 2
  const bumps = clamp(Math.round((Math.PI * (rx + ry)) / clamp(0.32 * Math.min(w, h), 9, 26)), 6, 40)
  const a0 = -Math.PI / 2 + rng.gauss(0, 0.3)
  const sizes = Array.from({ length: bumps }, () => rng.range(0.75, 1.25))
  const tot = sizes.reduce((a, b) => a + b, 0)
  const pts: Pt[] = []
  let a = a0
  const P = (ang: number): Pt => [cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry]
  for (let i = 0; i < bumps + 1; i++) {
    const i2 = i % bumps
    const da = (sizes[i2] / tot) * TAU
    const p0 = P(a), p1 = P(a + da)
    const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    const bulge = Math.min(0.42 * L, o.bulge ?? L * 0.3) * rng.range(0.8, 1.1)
    const nx = (p0[0] + p1[0]) / 2 - cx, ny = (p0[1] + p1[1]) / 2 - cy
    const nl = Math.hypot(nx, ny) || 1
    for (let k = i === 0 ? 0 : 1; k <= 6; k++) {
      const t = k / 6, b = Math.sin(Math.PI * t) * bulge
      pts.push([p0[0] + (p1[0] - p0[0]) * t + (nx / nl) * b, p0[1] + (p1[1] - p0[1]) * t + (ny / nl) * b])
    }
    a += da
  }
  pts.push([pts[1][0] + 1.5, pts[1][1] + 0.6])
  return [{ pts, o: { end: 'flick', wobble: 0.5, speed: 1.05 } }]
}
export function cloud(ink: Ink, cx: number, cy: number, w: number, h: number, o: ShapeOpts & { bulge?: number } = {}): void {
  put(ink, 'cloud', (r) => cloudLines(r, cx, cy, w, h, o), 'pencil', o)
}

export function scribbleLines(rng: Rng, x: number, y: number, w: number, h: number): Line[] {
  const step = Math.max(2.2, 0.28 * h)
  const nn = Math.max(3, Math.round(w / step))
  const lean = rng.gauss(0.18, 0.08) * h
  const pts: Pt[] = []
  for (let k = 0; k <= nn; k++) {
    const up = k % 2 === 0
    pts.push([clamp(x + (k / nn) * w + rng.gauss(0, 0.18 * step) + (up ? -lean / 2 : lean / 2), x, x + w), up ? y + rng.range(0, 0.2) * h : y + rng.range(0.8, 1) * h])
  }
  return [{ pts, o: { end: 'flick', speed: 1.3, wobble: 0.6 } }]
}
export function scribble(ink: Ink, x: number, y: number, w: number, h: number, o: ShapeOpts = {}): void {
  put(ink, 'scrib', (r) => scribbleLines(r, x, y, w, h), 'red', o)
}

export function burstLines(rng: Rng, cx: number, cy: number, r: number, o: { rays?: number } = {}): Line[] {
  const k = o.rays ?? 10
  const a0 = rng.range(0, TAU)
  const out: Line[] = []
  for (let i = 0; i < k; i++) {
    const a = a0 + (i / k) * TAU + rng.gauss(0, 0.07)
    const r0 = r * rng.range(0.42, 0.52), r1 = r * (i % 2 ? rng.range(0.78, 0.9) : rng.range(0.98, 1.1))
    out.push({ pts: seg(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, rng.gauss(0, 0.25), 3), o: { end: 'flick', start: 'soft', wobble: 0.3, speed: 1.2 } })
  }
  return out
}
export function burst(ink: Ink, cx: number, cy: number, r: number, o: ShapeOpts & { rays?: number } = {}): void {
  put(ink, 'burst', (rg) => burstLines(rg, cx, cy, r, o), 'redfelt', o)
}

export interface FocusRingOpts {
  shape?: 'rect' | 'ellipse'
  gap?: number
  r?: number
  ticks?: boolean
}

export function focusRingLines(rng: Rng, x: number, y: number, w: number, h: number, o: FocusRingOpts = {}): Line[] {
  const gap = o.gap ?? 4
  const out: Line[] = []
  const rect = (o.shape ?? 'rect') === 'rect'
  const X = x - gap, Y = y - gap, W = w + gap * 2, H = h + gap * 2
  if (rect) {
    const R = (o.r ?? 4) + gap
    out.push(...boxLines(rng.fork('ring'), X, Y, W, H, { corner: R }))
  } else {
    out.push(...loopLines(rng.fork('ring'), x + w / 2, y + h / 2, W / 2, H / 2, { clean: true }))
  }
  if (o.ticks === true) {
    const tr = rng.fork('ticks')
    if (rect) {
      const cs: Array<[number, number, number, number]> = [[X, Y, -1, -1], [X + W, Y, 1, -1], [X + W, Y + H, 1, 1], [X, Y + H, -1, 1]]
      const inset = ((o.r ?? 4) + gap) * (1 - Math.SQRT1_2)
      for (const [cx, cy, sx, sy] of cs) {
        if (tr() < 0.15) continue
        const a = Math.atan2(sy, sx) + tr.gauss(0, 0.15)
        const r0 = 2 + inset, r1 = r0 + 3 + tr() * 2.5
        out.push({ pts: seg(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, 0.3, 3), o: { end: 'flick', start: 'soft', wobble: 0.3, width: 0.8 } })
      }
    } else {
      const cx = x + w / 2, cy = y + h / 2
      for (const base of [-0.75 * Math.PI, 0.25 * Math.PI]) {
        const a = base + tr.gauss(0, 0.2)
        const ex = Math.cos(a), ey = Math.sin(a)
        const r0 = Math.hypot(ex * (W / 2), ey * (H / 2)) + 2, r1 = r0 + 3 + tr() * 2.5
        out.push({ pts: seg(cx + ex * r0, cy + ey * r0, cx + ex * r1, cy + ey * r1, 0.3, 3), o: { end: 'flick', start: 'soft', wobble: 0.3, width: 0.8 } })
      }
    }
  }
  return out
}
export function focusRing(ink: Ink, x: number, y: number, w: number, h: number, o: ShapeOpts & FocusRingOpts = {}): void {
  put(ink, 'focus', (r) => focusRingLines(r, x, y, w, h, o), 'focus', o)
}

export function dashedBoxLines(rng: Rng, x: number, y: number, w: number, h: number, o: { r?: number; dash?: number; gap?: number } = {}): Line[] {
  const r = Math.min(o.r ?? 4, w / 2, h / 2)
  const cornerPts: Pt[] = []
  const per = 5
  const arc = (cx: number, cy: number, a0: number): void => {
    for (let i = 0; i <= per; i++) {
      const a = a0 + (i / per) * (Math.PI / 2)
      cornerPts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
    }
  }
  if (r < 0.5) cornerPts.push([x, y], [x + w, y], [x + w, y + h], [x, y + h])
  else {
    arc(x + w - r, y + r, -Math.PI / 2)
    arc(x + w - r, y + h - r, 0)
    arc(x + r, y + h - r, Math.PI / 2)
    arc(x + r, y + r, Math.PI)
  }
  const closed = [...cornerPts, cornerPts[0]]
  const cum = [0]
  for (let i = 1; i < closed.length; i++) cum.push(cum[i - 1] + Math.hypot(closed[i][0] - closed[i - 1][0], closed[i][1] - closed[i - 1][1]))
  const per_ = cum[cum.length - 1]
  const at = (d: number): Pt => {
    d = ((d % per_) + per_) % per_
    let i = 1
    while (i < cum.length - 1 && cum[i] < d) i++
    const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)
    return [closed[i - 1][0] + (closed[i][0] - closed[i - 1][0]) * t, closed[i - 1][1] + (closed[i][1] - closed[i - 1][1]) * t]
  }
  const dash = o.dash ?? clamp(Math.min(w, h) * 0.3, 5, 9), gap = o.gap ?? dash * 0.55
  const count = Math.max(4, Math.round(per_ / (dash + gap)))
  const step = per_ / count
  const len = step * (dash / (dash + gap))
  const d0 = rng() * step
  const out: Line[] = []
  for (let i = 0; i < count; i++) {
    const d = d0 + i * step
    const pts: Pt[] = []
    for (let k = 0; k <= 4; k++) pts.push(at(d + (len * k) / 4))
    out.push({ pts, o: { ...RULER, simple: true } })
  }
  return out
}
export function dashedBox(ink: Ink, x: number, y: number, w: number, h: number, o: ShapeOpts & { r?: number; dash?: number; gap?: number } = {}): void {
  const P = pen(o.pen ?? 'pencil')
  const color = o.opts?.color ?? P.color
  const sw = P.W * 0.85 * (o.opts?.width ?? 1) * ink.knobs.width
  let d = ''
  for (const l of dashedBoxLines(ink.next('dash'), x, y, w, h, o)) d += 'M' + l.pts.map((p) => `${n(p[0], 100)} ${n(p[1], 100)}`).join('L')
  ink.flat(P.kind === 'pencil' ? 'pencil' : 'felt', d, color, P.alpha * (o.opts?.alpha ?? 1), { stroke: color, sw, bbox: [x - sw, y - sw, x + w + sw, y + h + sw] })
}
