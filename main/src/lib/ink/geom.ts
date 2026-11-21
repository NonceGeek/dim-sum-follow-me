import type { BBox, Pt, Tier } from '@/lib/ink/types'
import { fmtUnits, type Q } from '@/lib/ink/paint'
import { clamp, type Rng } from '@/lib/ink/rng'
import { noise1 } from '@/lib/ink/noise'

export const TAU = Math.PI * 2

export interface TierCfg {
  q: Q
  tol: number
  stepK: number
}

export const TIERS: Record<Tier, TierCfg> = {
  hi: { q: 20, tol: 0.085, stepK: 1 },
  lo: { q: 10, tol: 0.16, stepK: 1.5 },
}

const mixPt = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

export function seg(x1: number, y1: number, x2: number, y2: number, bow = 0, cnt = 8): Pt[] {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len, ny = dx / len
  const out: Pt[] = []
  for (let i = 0; i <= cnt; i++) {
    const t = i / cnt
    const b = bow * Math.sin(Math.PI * t)
    out.push([x1 + dx * t + nx * b, y1 + dy * t + ny * b])
  }
  return out
}

export function densify(pts: Pt[], step = 1.5): Pt[] {
  const out: Pt[] = [[pts[0][0], pts[0][1]]]
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]
    const c = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step))
    for (let k = 1; k <= c; k++) out.push(mixPt(a, b, k / c))
  }
  return out
}

export function spline(pts: Pt[], step = 1.5): Pt[] {
  if (pts.length < 3) return densify(pts, step)
  const out: Pt[] = []
  const first = pts[0], second = pts[1], last = pts[pts.length - 1], prev = pts[pts.length - 2]
  const P: Pt[] = [[first[0] - (second[0] - first[0]), first[1] - (second[1] - first[1])], ...pts, [last[0] + (last[0] - prev[0]), last[1] + (last[1] - prev[1])]]
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2]
    const d01 = Math.max(1e-3, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) ** 0.5)
    const d12 = Math.max(1e-3, Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) ** 0.5)
    const d23 = Math.max(1e-3, Math.hypot(p3[0] - p2[0], p3[1] - p2[1]) ** 0.5)
    const cnt = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step))
    const t1 = d01, t2 = d01 + d12, t3 = d01 + d12 + d23
    for (let k = 0; k < cnt; k++) {
      const u = t1 + (t2 - t1) * (k / cnt)
      const A1 = mixPt(p0, p1, u / t1)
      const A2 = mixPt(p1, p2, (u - t1) / (t2 - t1))
      const A3 = mixPt(p2, p3, (u - t2) / (t3 - t2))
      const B1 = mixPt(A1, A2, u / t2)
      const B2 = mixPt(A2, A3, (u - t1) / (t3 - t1))
      out.push(mixPt(B1, B2, (u - t1) / (t2 - t1)))
    }
  }
  out.push([last[0], last[1]])
  return out
}

export function fillet(pts: Pt[], r: number): Pt[] {
  if (pts.length < 3 || r <= 0) return pts
  const out: Pt[] = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1]
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]) || 1
    const rr = Math.min(r, l1 * 0.45, l2 * 0.45)
    const p1: Pt = [b[0] + ((a[0] - b[0]) / l1) * rr, b[1] + ((a[1] - b[1]) / l1) * rr]
    const p2: Pt = [b[0] + ((c[0] - b[0]) / l2) * rr, b[1] + ((c[1] - b[1]) / l2) * rr]
    for (let k = 0; k <= 5; k++) {
      const t = k / 5, u = 1 - t
      out.push([u * u * p1[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * b[1] + t * t * p2[1]])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

export function rounded(verts: Pt[], rad: number, rng: Rng, per = 5): Pt[] {
  const out: Pt[] = [[verts[0][0], verts[0][1]]]
  for (let i = 1; i < verts.length - 1; i++) {
    const P = verts[i - 1], V = verts[i], N = verts[i + 1]
    const l1 = Math.hypot(P[0] - V[0], P[1] - V[1]) || 1
    const l2 = Math.hypot(N[0] - V[0], N[1] - V[1]) || 1
    const r = Math.min(rad * (0.75 + rng() * 0.5), l1 * 0.48, l2 * 0.48)
    if (r < 0.6) {
      out.push([V[0], V[1]])
      continue
    }
    const a: Pt = [V[0] + ((P[0] - V[0]) / l1) * r, V[1] + ((P[1] - V[1]) / l1) * r]
    const b: Pt = [V[0] + ((N[0] - V[0]) / l2) * r, V[1] + ((N[1] - V[1]) / l2) * r]
    const k = 0.9 + rng() * 0.1
    const c: Pt = [V[0] * k + ((a[0] + b[0]) / 2) * (1 - k), V[1] * k + ((a[1] + b[1]) / 2) * (1 - k)]
    for (let j = 0; j <= per; j++) {
      const t = j / per, u = 1 - t
      out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]])
    }
  }
  const e = verts[verts.length - 1]
  out.push([e[0], e[1]])
  return out
}

export function pathLength(pts: Pt[]): number {
  let L = 0
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  return L
}

export interface Resampled {
  X: Float64Array
  Y: Float64Array
  S: Float64Array
  L: number
}

export function resample(P: Pt[], step: number): Resampled {
  const cum = [0]
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]))
  const L = cum[cum.length - 1]
  const cnt = Math.max(2, Math.round(L / step) + 1)
  const X = new Float64Array(cnt), Y = new Float64Array(cnt), S = new Float64Array(cnt)
  let j = 0
  for (let i = 0; i < cnt; i++) {
    const s = (L * i) / (cnt - 1)
    while (j < P.length - 2 && cum[j + 1] < s) j++
    const seglen = cum[j + 1] - cum[j] || 1
    const t = clamp((s - cum[j]) / seglen, 0, 1)
    const a = P[j], b = P[Math.min(j + 1, P.length - 1)]
    X[i] = a[0] + (b[0] - a[0]) * t
    Y[i] = a[1] + (b[1] - a[1]) * t
    S[i] = s
  }
  return { X, Y, S, L }
}

export function simplifyClosed(pts: Pt[], tol: number): Pt[] {
  const m = pts.length
  if (m < 12 || tol <= 0) return pts
  let far = 0, fd = -1
  for (let i = 1; i < m; i++) {
    const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2
    if (d > fd) { fd = d; far = i }
  }
  const keep = new Uint8Array(m)
  keep[0] = keep[far] = 1
  const rec = (a: number, b: number): void => {
    const len = (b - a + m) % m
    if (len < 2) return
    const ax = pts[a][0], ay = pts[a][1], bx = pts[b][0], by = pts[b][1]
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9
    let md = -1, mi = -1
    for (let k = 1; k < len; k++) {
      const i = (a + k) % m
      const t = Math.max(0, Math.min(1, ((pts[i][0] - ax) * dx + (pts[i][1] - ay) * dy) / l2))
      const d = Math.hypot(pts[i][0] - (ax + t * dx), pts[i][1] - (ay + t * dy))
      if (d > md) { md = d; mi = i }
    }
    if (md > tol) { keep[mi] = 1; rec(a, mi); rec(mi, b) }
  }
  rec(0, far)
  rec(far, 0)
  const out: Pt[] = []
  for (let i = 0; i < m; i++) if (keep[i]) out.push(pts[i])
  return out
}

export class PathWriter {
  d = ''
  private cmd = ''
  private px = 0
  private py = 0
  private sx = 0
  private sy = 0
  private lastNum = ''
  private readonly q: Q

  constructor(q: Q) {
    this.q = q
  }

  private u(v: number): number {
    return Number.isFinite(v) ? Math.round(v * this.q) : 0
  }

  private num(k: number): void {
    const s = fmtUnits(k, this.q)
    if (this.lastNum) {
      const c = s.charCodeAt(0)
      if (!(c === 45 || (c === 46 && this.lastNum.includes('.')))) this.d += ' '
    }
    this.d += s
    this.lastNum = s
  }

  private letter(c: string): void {
    if (this.cmd !== c) {
      this.d += c
      this.cmd = c
      this.lastNum = ''
    }
  }

  M(x: number, y: number): this {
    const X = this.u(x), Y = this.u(y)
    this.d += 'M'
    this.cmd = 'M'
    this.lastNum = ''
    this.num(X)
    this.num(Y)
    this.px = this.sx = X
    this.py = this.sy = Y
    return this
  }

  L(x: number, y: number): this {
    const X = this.u(x), Y = this.u(y)
    this.letter('l')
    this.num(X - this.px)
    this.num(Y - this.py)
    this.px = X
    this.py = Y
    return this
  }

  Q(cx: number, cy: number, x: number, y: number): this {
    const CX = this.u(cx), CY = this.u(cy), X = this.u(x), Y = this.u(y)
    this.letter('q')
    this.num(CX - this.px)
    this.num(CY - this.py)
    this.num(X - this.px)
    this.num(Y - this.py)
    this.px = X
    this.py = Y
    return this
  }

  Z(): this {
    this.d += 'z'
    this.cmd = 'z'
    this.lastNum = ''
    this.px = this.sx
    this.py = this.sy
    return this
  }
}

export function smoothClosed(pts: Pt[], cfg: TierCfg): string {
  const p = simplifyClosed(pts, cfg.tol)
  const m = p.length
  if (m < 3) return ''
  const w = new PathWriter(cfg.q)
  w.M((p[m - 1][0] + p[0][0]) / 2, (p[m - 1][1] + p[0][1]) / 2)
  for (let i = 0; i < m; i++) {
    const a = p[i], b = p[(i + 1) % m]
    w.Q(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
  }
  return w.Z().d
}

export function simplePath(pts: Pt[], cfg: TierCfg): string {
  const p = simplifyClosed(pts, cfg.tol)
  if (p.length < 3) return ''
  const w = new PathWriter(cfg.q)
  w.M(p[0][0], p[0][1])
  for (let i = 1; i < p.length; i++) w.L(p[i][0], p[i][1])
  return w.Z().d
}

export function polyPath(pts: Pt[], q: Q = 20): string {
  if (pts.length < 3) return ''
  const w = new PathWriter(q)
  w.M(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) w.L(pts[i][0], pts[i][1])
  return w.Z().d
}

export function area(pts: Pt[]): number {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length]
    a += p[0] * q[1] - q[0] * p[1]
  }
  return a / 2
}

export function bboxOf(pts: readonly Pt[]): BBox {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const p of pts) {
    if (p[0] < x0) x0 = p[0]
    if (p[0] > x1) x1 = p[0]
    if (p[1] < y0) y0 = p[1]
    if (p[1] > y1) y1 = p[1]
  }
  return [x0, y0, x1, y1]
}

export function centroid(poly: Pt[]): Pt {
  let a = 0, cx = 0, cy = 0
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i]
    const [x1, y1] = poly[(i + 1) % poly.length]
    const c = x0 * y1 - x1 * y0
    a += c
    cx += (x0 + x1) * c
    cy += (y0 + y1) * c
  }
  if (Math.abs(a) < 1e-6) {
    const b = bboxOf(poly)
    return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]
  }
  return [cx / (3 * a), cy / (3 * a)]
}

export function inside(pts: Pt[], x: number, y: number): boolean {
  let c = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j]
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c
  }
  return c
}

export function xform(pts: Pt[], o: { dx?: number; dy?: number; rot?: number; sx?: number; sy?: number; about?: Pt } = {}): Pt[] {
  const { dx = 0, dy = 0, rot = 0, sx = 1, sy = sx } = o
  const [cx, cy] = o.about ?? centroid(pts)
  const c = Math.cos(rot), s = Math.sin(rot)
  return pts.map(([x, y]) => {
    const px = (x - cx) * sx, py = (y - cy) * sy
    return [cx + px * c - py * s + dx, cy + px * s + py * c + dy]
  })
}

export function roundRectPoly(x: number, y: number, w: number, h: number, r = 0, per = 5): Pt[] {
  r = Math.min(r, w / 2, h / 2)
  if (r < 0.3) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
  const pts: Pt[] = []
  const arc = (cx: number, cy: number, a0: number): void => {
    for (let i = 0; i <= per; i++) {
      const a = a0 + (i / per) * (Math.PI / 2)
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
    }
  }
  arc(x + w - r, y + r, -Math.PI / 2)
  arc(x + w - r, y + h - r, 0)
  arc(x + r, y + h - r, Math.PI / 2)
  arc(x + r, y + r, Math.PI)
  return pts
}

export function rectPoly(x: number, y: number, w: number, h: number, r = 0, per = 5): Pt[] {
  return roundRectPoly(x, y, w, h, r, per)
}

export function pillPoly(x: number, y: number, w: number, h: number, per = 7): Pt[] {
  return roundRectPoly(x, y, w, h, h / 2, per)
}

export function ellipsePoly(cx: number, cy: number, rx: number, ry: number, cnt = 28, rot = 0): Pt[] {
  const pts: Pt[] = []
  const c = Math.cos(rot), s = Math.sin(rot)
  for (let i = 0; i < cnt; i++) {
    const a = (i / cnt) * TAU
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry
    pts.push([cx + x * c - y * s, cy + x * s + y * c])
  }
  return pts
}

export function densifyClosed(pts: Pt[], step = 4): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    const c = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step))
    for (let k = 0; k < c; k++) out.push([a[0] + ((b[0] - a[0]) * k) / c, a[1] + ((b[1] - a[1]) * k) / c])
  }
  return out
}

export function wobblePoly(pts: Pt[], rng: Rng, amp: number, wl = 24): Pt[] {
  const m = pts.length
  const cum = [0]
  for (let i = 1; i <= m; i++) cum.push(cum[i - 1] + Math.hypot(pts[i % m][0] - pts[i - 1][0], pts[i % m][1] - pts[i - 1][1]))
  const f = noise1(rng, cum[m], wl), g = noise1(rng, cum[m], wl * 0.3)
  const sg = area(pts) >= 0 ? 1 : -1
  return pts.map((p, i) => {
    const a = pts[(i + m - 1) % m], b = pts[(i + 1) % m]
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1
    const off = amp * (f(cum[i]) + 0.3 * g(cum[i]))
    return [p[0] + (ty / l) * off * sg, p[1] - (tx / l) * off * sg]
  })
}

export function offsetPoly(pts: Pt[], d: number, dx = 0, dy = 0): Pt[] {
  const m = pts.length
  const sg = area(pts) > 0 ? 1 : -1
  const nrm = (a: Pt, b: Pt): Pt => {
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1
    return [(ty / l) * sg, (-tx / l) * sg]
  }
  return pts.map((p, i) => {
    const a = pts[(i + m - 1) % m], b = pts[(i + 1) % m]
    const n1 = nrm(a, p), n2 = nrm(p, b)
    let nx = n1[0] + n2[0], ny = n1[1] + n2[1]
    const l = Math.hypot(nx, ny) || 1
    nx /= l
    ny /= l
    const c = Math.max(0.5, nx * n1[0] + ny * n1[1])
    return [p[0] + (nx * d) / c + dx, p[1] + (ny * d) / c + dy]
  })
}

export interface Span {
  row: number
  a: Pt
  b: Pt
  len: number
}

export function scanSpans(poly: Pt[], angle: number, gap: number, rng: Rng, o: { jitter?: number; inset?: number; even?: boolean } = {}): Span[] {
  const { jitter = 0.12, inset = 0, even = true } = o
  const bb = bboxOf(poly)
  const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2
  const ux = Math.cos(angle), uy = Math.sin(angle)
  const vx = -uy, vy = ux
  let pmin = Infinity, pmax = -Infinity
  for (const [x, y] of poly) {
    const p = (x - cx) * vx + (y - cy) * vy
    if (p < pmin) pmin = p
    if (p > pmax) pmax = p
  }
  const offs: number[] = []
  if (even) {
    let lo = pmin + inset, hi = pmax - inset
    if (hi <= lo) lo = hi = (pmin + pmax) / 2
    const rows = hi > lo ? Math.max(1, Math.round((hi - lo) / gap) + 1) : 1
    const step = rows > 1 ? (hi - lo) / (rows - 1) : 0
    for (let r = 0; r < rows; r++) offs.push(rows > 1 ? lo + r * step + (r > 0 && r < rows - 1 ? (rng() - 0.5) * step * jitter * 2 : 0) : (pmin + pmax) / 2)
  } else {
    let p = pmin + gap * rng.range(0.2, 0.9)
    while (p < pmax) {
      offs.push(p)
      p += gap * (1 + (rng() - 0.5) * 2 * jitter)
    }
  }
  const spans: Span[] = []
  offs.forEach((off, row) => {
    const ox = cx + vx * off, oy = cy + vy * off
    const ts: number[] = []
    for (let i = 0; i < poly.length; i++) {
      const [x0, y0] = poly[i]
      const [x1, y1] = poly[(i + 1) % poly.length]
      const d0 = (x0 - ox) * vx + (y0 - oy) * vy
      const d1 = (x1 - ox) * vx + (y1 - oy) * vy
      if ((d0 <= 0 && d1 > 0) || (d1 <= 0 && d0 > 0)) {
        const t = d0 / (d0 - d1)
        ts.push((x0 + (x1 - x0) * t - ox) * ux + (y0 + (y1 - y0) * t - oy) * uy)
      }
    }
    ts.sort((p, q) => p - q)
    for (let k = 0; k + 1 < ts.length; k += 2) {
      if (ts[k + 1] - ts[k] < 0.8) continue
      spans.push({ row, a: [ox + ux * ts[k], oy + uy * ts[k]], b: [ox + ux * ts[k + 1], oy + uy * ts[k + 1]], len: ts[k + 1] - ts[k] })
    }
  })
  return spans
}
