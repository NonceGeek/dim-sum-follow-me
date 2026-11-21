import { Ink, type InkResult } from '@/lib/ink/builder'
import { area, densifyClosed, ellipsePoly, polyPath, roundRectPoly } from '@/lib/ink/geom'
import type { PaintKey } from '@/lib/ink/paint'
import { clamp, type Rng } from '@/lib/ink/rng'
import type { Pt } from '@/lib/ink/types'
import { measureText, textPath } from '@/lib/ink/art/glyph-text'
import type { StampGen } from '@/lib/ink/art/types'

export interface StampOpts extends Partial<Omit<StampGen, 'gen' | 'text' | 'shape' | 'kind'>> {
  seed?: string | number
  grain?: boolean
}

const INK: Record<NonNullable<StampGen['ink']>, PaintKey> = { red: 'red', 'ink-you': 'ink-you', green: 'green', ink: 'ink' }

const flip = (pts: Pt[]): Pt[] => (area(pts) > 0 ? pts.slice().reverse() : pts)

function ring(outer: Pt[], inner: Pt[]): string {
  const o = area(outer) < 0 ? outer.slice().reverse() : outer
  const i = area(inner) > 0 ? inner.slice().reverse() : inner
  return polyPath(o, 10) + polyPath(i, 10)
}

function star(cx: number, cy: number, ro: number, ri: number, rot = -90): Pt[] {
  const p: Pt[] = []
  for (let i = 0; i < 10; i++) {
    const a = ((rot + i * 36) * Math.PI) / 180
    const r = i % 2 ? ri : ro
    p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return p
}

function dashes(poly: Pt[], len: number, gap: number, w: number, rng: Rng): string {
  let d = ''
  const m = poly.length
  let carry = 0
  let on = true
  let left = len
  for (let i = 0; i < m; i++) {
    const a = poly[i], b = poly[(i + 1) % m]
    const L = Math.hypot(b[0] - a[0], b[1] - a[1])
    const ux = (b[0] - a[0]) / (L || 1), uy = (b[1] - a[1]) / (L || 1)
    let s = carry
    while (s < L) {
      const step = Math.min(left, L - s)
      if (on && step > 0.5) {
        const p0: Pt = [a[0] + ux * s, a[1] + uy * s], p1: Pt = [a[0] + ux * (s + step), a[1] + uy * (s + step)]
        const nx = -uy * w * 0.5, ny = ux * w * 0.5
        d += polyPath([[p0[0] + nx, p0[1] + ny], [p1[0] + nx, p1[1] + ny], [p1[0] - nx, p1[1] - ny], [p0[0] - nx, p0[1] - ny]], 10)
      }
      s += step
      left -= step
      if (left <= 0.01) {
        on = !on
        left = (on ? len : gap) * (0.85 + rng() * 0.3)
      }
    }
    carry = 0
  }
  return d
}

function cleanRect(x: number, y: number, w: number, h: number, r: number): Pt[] {
  return densifyClosed(roundRectPoly(x, y, w, h, r, 5), 5)
}

export function stamp(text: string, shape: StampGen['shape'], o: StampOpts = {}): InkResult {
  const key = INK[o.ink ?? 'red']
  const seed = `stamp:${o.seed ?? text}:${shape}`
  const ink = new Ink(seed, { tier: 'lo', grain: o.grain })
  const rng = ink.rng.fork('stamp')
  const round = shape === 'round' || shape === 'burst'
  const W = o.w ?? (round ? 96 : shape === 'void' ? 160 : 160)
  const H = o.h ?? (round ? W : shape === 'void' ? 64 : 56)
  const tilt = o.tilt ?? (rng.range(-5, 5))
  const cx = W / 2, cy = H / 2
  const TXT = text.toUpperCase()

  const impression = (r: Rng, alpha: number): void => {
    let d = ''
    const outerW = clamp(H * 0.045, 2, 3), innerW = 1.1
    if (shape === 'rect') {
      const a = cleanRect(0, 0, W, H, 5)
      const b = cleanRect(outerW, outerW, W - 2 * outerW, H - 2 * outerW, 3.4)
      d += ring(a, b)
      const gap = 3.1
      const c = cleanRect(outerW + gap, outerW + gap, W - 2 * (outerW + gap), H - 2 * (outerW + gap), 2.4)
      const e = cleanRect(outerW + gap + innerW, outerW + gap + innerW, W - 2 * (outerW + gap + innerW), H - 2 * (outerW + gap + innerW), 2)
      d += o.dashed ? dashes(c, 5.5, 3.2, innerW + 0.3, r.fork('dash')) : ring(c, e)
      const innerH = H - 2 * (outerW + gap + innerW)
      const innerW2 = W - 2 * (outerW + gap + innerW) - 10
      const sub = o.sub
      let em = Math.min(innerH * (sub ? 0.5 : 0.62), 38)
      const spacing = clamp(em * 0.08, 1, 3.4)
      const fit = innerW2 / Math.max(1, measureText('type', TXT, 1, 0) + (TXT.length - 1) * (spacing / em))
      em = Math.min(em, fit)
      const cap = 0.68 * em
      const ty = sub ? cy - innerH * 0.06 + cap / 2 - 1 : cy + cap / 2
      const t = textPath(TXT, cx, ty, em, r.fork('t'), { font: 'type', spacing: (spacing * em) / Math.max(em, 1) * 0.9, jitter: 0.25 })
      d += t.d
      if (sub) {
        const sm = clamp(innerH * 0.2, 6, 10)
        const st = textPath(sub.toUpperCase(), cx, cy + innerH * 0.34, sm, r.fork('s'), { font: 'type', spacing: 1.2, jitter: 0.2 })
        d += st.d
      }
    } else if (shape === 'round' || shape === 'burst') {
      const R = W / 2
      if (shape === 'burst') {
        const pts: Pt[] = []
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2 - Math.PI / 2
          const rr = i % 2 ? R * 0.82 : R - 1
          pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
        }
        d += ring(pts, densifyClosed(ellipsePoly(cx, cy, R * 0.76, R * 0.76, 48), 4))
        d += ring(densifyClosed(ellipsePoly(cx, cy, R * 0.66, R * 0.66, 48), 4), densifyClosed(ellipsePoly(cx, cy, R * 0.66 - 1.1, R * 0.66 - 1.1, 48), 4))
      } else {
        const a = densifyClosed(ellipsePoly(cx, cy, R - 0.5, R - 0.5, 60), 5)
        const b = densifyClosed(ellipsePoly(cx, cy, R - 0.5 - 2.6, R - 0.5 - 2.6, 60), 5)
        d += ring(a, b)
        const rin = R * 0.63
        d += ring(densifyClosed(ellipsePoly(cx, cy, rin, rin, 48), 4), densifyClosed(ellipsePoly(cx, cy, rin - 1.1, rin - 1.1, 48), 4))
      }
      const inner = shape === 'burst' ? R * 0.6 : R * 0.62
      let em = Math.min(W * 0.3, 40)
      const fit = (inner * 1.78) / Math.max(0.5, measureText('type', TXT, 1, 0) + TXT.length * 0.06)
      em = Math.min(em, fit)
      const cap = 0.68 * em
      const t = textPath(TXT, cx, cy + cap / 2 - (o.sub ? 1.5 : 0), em, r.fork('t'), { font: 'type', spacing: em * 0.06, jitter: 0.25 })
      d += t.d
      if (o.sub) d += textPath(o.sub.toUpperCase(), cx, cy + cap / 2 + em * 0.42, Math.max(5.5, em * 0.28), r.fork('s'), { font: 'type', spacing: 0.8, jitter: 0.2 }).d
      const ns = o.stars ?? (shape === 'round' ? 2 : 0)
      for (let i = 0; i < ns; i++) {
        const sx = cx + (i === 0 ? -1 : 1) * inner * 0.68
        d += polyPath(star(sx, cy - cap * 1.05 - 3, 2.6, 1.1, -90), 10)
      }
      if (shape === 'round') {
        const rim = o.ring ?? ''
        const chars = Array.from(rim.toUpperCase())
        if (chars.length) {
          const rr = R - 2.6 - 3.4 - 2
          const span = chars.length >= 12 ? 300 : chars.length * 26
          const sz = clamp((rr * ((span * Math.PI) / 180)) / (chars.length * 0.86), 5.2, 10)
          chars.forEach((ch, i) => {
            if (ch === ' ') return
            const ang = -90 - span / 2 + ((i + 0.5) / chars.length) * span
            const A = (ang * Math.PI) / 180
            d += textPath(ch, cx + Math.cos(A) * rr, cy + Math.sin(A) * rr, sz, r.fork(`ch${i}`), { font: 'type', rot: ang + 90, jitter: 0.1 }).d
          })
        }
      }
    } else {
      const em = Math.min(H * 0.86, (W * 0.86) / Math.max(1, measureText('type', TXT, 1, 0)))
      const t = textPath(TXT, cx, cy + em * 0.34, em, r.fork('t'), { font: 'type', spacing: em * 0.04, jitter: 0.35, rot: -8 })
      d += t.d
      const bar = densifyClosed([[cx - W * 0.44, cy + 3.5], [cx + W * 0.44, cy - 3.2], [cx + W * 0.44, cy - 0.2], [cx - W * 0.44, cy + 6.4]], 5)
      d += polyPath(flip(bar), 10)
    }
    ink.flat('text', d, key, alpha, { bbox: [-6, -6, W + 6, H + 6] })
  }

  ink.group({ transform: `rotate(${(tilt).toFixed(2)} ${cx.toFixed(1)} ${cy.toFixed(1)})` }, () => {
    if (o.ghost) ink.group({ transform: `translate(${(1.6).toFixed(1)} ${(-1.3).toFixed(1)}) rotate(0.8 ${cx.toFixed(1)} ${cy.toFixed(1)})` }, () => impression(rng.fork('ghost'), 0.2), 'stamp')
    impression(rng.fork('main'), 0.92)
  }, 'stamp')
  return ink.toSvg({ w: W, h: H, pad: 10 })
}
