import type { Line, Material, PenName, PenSpec, Pt, StrokeOpts } from '@/lib/ink/types'
import type { Ink } from '@/lib/ink/builder'
import type { PaintKey } from '@/lib/ink/paint'
import { clamp, type Rng } from '@/lib/ink/rng'
import { noise1 } from '@/lib/ink/noise'
import { TAU, area, bboxOf, centroid, densifyClosed, offsetPoly, scanSpans, seg, wobblePoly, xform } from '@/lib/ink/geom'
import { pen as resolvePen } from '@/lib/ink/pens'

export function misreg(poly: Pt[], rng: Rng, amt = 3, o: { bias?: number; tilt?: number; grow?: number } = {}): Pt[] {
  const ang = (o.bias ?? 0.75) + rng.gauss(0, 0.5)
  const k = amt * rng.range(0.7, 1.15)
  const b = bboxOf(poly)
  const bw = b[2] - b[0], bh = b[3] - b[1]
  const keep = Math.min(1, 120 / Math.max(bw, bh, 1))
  const sc = 1 + rng.gauss(0, 0.012) * keep + (o.grow ?? 0) / Math.max(10, Math.min(bw, bh))
  return xform(poly, {
    dx: Math.cos(ang) * k,
    dy: Math.sin(ang) * k,
    rot: clamp(rng.gauss(0, 0.014), -0.03, 0.03) * (o.tilt ?? 1) * Math.min(1, 40 / Math.max(20, Math.max(bw, bh))),
    sx: sc,
    sy: sc + rng.gauss(0, 0.01) * keep,
  })
}

export const defaultMis = (poly: Pt[]): number => {
  const b = bboxOf(poly)
  return clamp(Math.min(b[2] - b[0], b[3] - b[1]) * 0.11, 1.6, 6)
}

export interface Offset {
  dx: number
  dy: number
}

const shiftOf = (from: Pt[], to: Pt[]): Offset => {
  const a = centroid(from), b = centroid(to)
  return { dx: b[0] - a[0], dy: b[1] - a[1] }
}

function laid(_ink: Ink, poly: Pt[], _mis: number | false | undefined, _salt = 'mr'): Pt[] {
  return poly
}

export function rough(poly: Pt[], rng: Rng, amt = 0.8, step = 4): Pt[] {
  const pts = densifyClosed(poly, step)
  let per = 0
  for (let i = 0; i < pts.length; i++) per += Math.hypot(pts[(i + 1) % pts.length][0] - pts[i][0], pts[(i + 1) % pts.length][1] - pts[i][1])
  const nz = noise1(rng, per + 60, 22), nz2 = noise1(rng, per + 60, 6)
  const sgn = area(pts) >= 0 ? 1 : -1
  let s = 0
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length], r = pts[(i - 1 + pts.length) % pts.length]
    const tx = q[0] - r[0], ty = q[1] - r[1]
    const l = Math.hypot(tx, ty) || 1
    if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])
    const off = amt * (nz(s) * 0.8 + nz2(s) * 0.5)
    return [p[0] + (ty / l) * sgn * off, p[1] - (tx / l) * sgn * off]
  })
}

export function solidFill(ink: Ink, poly: Pt[], color: PaintKey, o: { alpha?: number; inset?: number; rough?: number; material?: Material } = {}): Offset {
  const rng = ink.next('solid')
  const inner = o.inset ? offsetPoly(poly, -o.inset, 0, 0) : poly
  ink.poly(o.material ?? 'marker', rough(inner, rng, o.rough ?? 0.1, 4), color, o.alpha ?? 0.94)
  return { dx: 0, dy: 0 }
}

export function flatFill(ink: Ink, poly: Pt[], color: PaintKey, alpha = 0.5, material: Material = 'marker'): void {
  if (poly.length < 3) return
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const p of poly) {
    if (p[0] < x0) x0 = p[0]
    if (p[0] > x1) x1 = p[0]
    if (p[1] < y0) y0 = p[1]
    if (p[1] > y1) y1 = p[1]
  }
  const d = 'M' + poly.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('L') + 'Z'
  ink.flat(material, d, color, alpha, { bbox: [x0, y0, x1, y1] })
}

const solidAlpha = (alpha: number | undefined, fallback: number, passes = 1): number => clamp((alpha ?? fallback) * (passes > 1 ? 1.14 : 1.08), 0.3, 0.96)

const MAX_BAND_POINTS = 72

export function bandPoly(a: Pt, b: Pt, width: number, rng: Rng, chisel = 0.34, maxPts = MAX_BAND_POINTS): Pt[] {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const L = Math.hypot(dx, dy) || 1
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux
  const hw = width / 2
  const sk = Math.min(0.45 * L, chisel * width) * (rng() < 0.5 ? 1 : -1)
  const amp = clamp(0.035 * width + 0.0022 * L, 0.12, 0.65)
  const p1 = rng() * TAU, p2 = rng() * TAU, p3 = rng() * TAU, p4 = rng() * TAU
  const cnt = clamp(Math.ceil(L / 4), 3, maxPts)
  const left: Pt[] = [], right: Pt[] = []
  for (let i = 0; i <= cnt; i++) {
    const t = i / cnt
    const wl = amp * (Math.sin(5.1 * t + p1) + 0.4 * Math.sin(13.7 * t + p2))
    const wr = amp * (Math.sin(5.1 * t + p3) + 0.4 * Math.sin(13.7 * t + p4))
    const cx = a[0] + dx * t, cy = a[1] + dy * t
    left.push([cx + nx * (hw + wl), cy + ny * (hw + wl)])
    right.push([cx - nx * (hw + wr), cy - ny * (hw + wr)])
  }
  left[0] = [left[0][0] + ux * sk, left[0][1] + uy * sk]
  right[0] = [right[0][0] - ux * sk, right[0][1] - uy * sk]
  left[cnt] = [left[cnt][0] + ux * sk, left[cnt][1] + uy * sk]
  right[cnt] = [right[cnt][0] - ux * sk, right[cnt][1] - uy * sk]
  return left.concat(right.reverse())
}

export interface BandOpts {
  alpha?: number
  mis?: number | false
  passes?: 1 | 2
  angle?: number
  W?: number
  overlap?: number
  ends?: 'loose' | 'flag' | 'square'
  material?: Material
}


export function bandFill(ink: Ink, poly: Pt[], color: PaintKey, o: BandOpts = {}): Offset {
  return solidFill(ink, poly, color, { alpha: solidAlpha(o.alpha, 0.85, o.passes ?? 1), material: o.material })
}

export interface ClipOpts {
  alpha?: number
  mis?: number | false
  W?: number
  angle?: number
  overlap?: number
  rough?: number
  rim?: boolean
  material?: Material
}

export function clipFill(ink: Ink, poly: Pt[], color: PaintKey, o: ClipOpts = {}): Offset {
  return solidFill(ink, poly, color, { alpha: solidAlpha(o.alpha, 0.92), rough: Math.min(o.rough ?? 0.3, 0.3), material: o.material, inset: 0 })
}

export interface BlobOpts {
  alpha?: number
  mis?: number | false
  rough?: number
  material?: Material
}

export function blobFill(ink: Ink, poly: Pt[], color: PaintKey, o: BlobOpts = {}): Offset {
  const rng = ink.next('blob')
  const at = laid(ink, poly, o.mis)
  ink.poly(o.material ?? 'marker', rough(at, rng, Math.min(o.rough ?? 0.1, 0.12), 4), color, Math.max(o.alpha ?? 0.9, 0.92))
  return shiftOf(poly, at)
}

export function wash(ink: Ink, poly: Pt[], color: PaintKey, o: { alpha?: number; inset?: number; shift?: number; wobble?: number; material?: Material } = {}): Offset {
  const rng = ink.next('wash')
  const b = bboxOf(poly)
  const size = Math.max(b[2] - b[0], b[3] - b[1])
  const dn = o.shift ?? 0.007 * size + 0.3
  const P = wobblePoly(densifyClosed(offsetPoly(poly, -(o.inset ?? 0.9), dn * 0.85 * ink.knobs.misreg, dn * ink.knobs.misreg), 4), rng, (o.wobble ?? 0.7) * ink.knobs.wobble, 18)
  ink.poly(o.material ?? 'marker', P, color, o.alpha ?? 0.5)
  return { dx: dn * 0.85 * ink.knobs.misreg, dy: dn * ink.knobs.misreg }
}

function loosen(a: Pt, b: Pt, rng: Rng, over: number, under: number, cap = 0.3): [Pt, Pt] {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  const t: Pt = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]
  const ext = (): number => (rng() < 0.3 ? -rng() * under : rng() * over)
  const e0 = Math.max(ext(), -cap * L), e1 = Math.max(ext(), -cap * L)
  return [[a[0] - t[0] * e0, a[1] - t[1] * e0], [b[0] + t[0] * e1, b[1] + t[1] * e1]]
}

export interface HatchOpts {
  angle?: number
  gap?: number
  cross?: boolean | number
  tones?: 1 | 2 | 3
  over?: number
  under?: number
  skip?: number
  pen?: PenName | PenSpec
  alpha?: number
  width?: number
  opts?: StrokeOpts
}

export function hatch(ink: Ink, region: Pt[] | [number, number, number, number], o: HatchOpts = {}): void {
  const rng = ink.next('hatch')
  const poly: Pt[] = region.length === 4 && typeof region[0] === 'number'
    ? ((r: [number, number, number, number]) => [[r[0], r[1]], [r[0] + r[2], r[1]], [r[0] + r[2], r[1] + r[3]], [r[0], r[1] + r[3]]] as Pt[])(region as [number, number, number, number])
    : (region as Pt[])
  const gap = o.gap ?? 4
  const a0 = (o.angle ?? 60) + rng.gauss(0, 1.2)
  const tones = o.tones ?? (o.cross ? 2 : 1)
  const crossOff = typeof o.cross === 'number' ? o.cross : 78
  const passes = [a0, ...(tones >= 2 ? [a0 + crossOff] : []), ...(tones >= 3 ? [a0 + crossOff / 2 + 8] : [])]
  passes.forEach((deg, pi) => {
    const g = gap * (pi ? 1.3 : 1)
    const spans = scanSpans(poly, (deg * Math.PI) / 180, g, rng, { jitter: 0.15, even: false })
    const lines: Line[] = []
    let flip = false
    for (const sp of spans) {
      if (o.skip && rng.chance(o.skip)) continue
      let [la, lb] = loosen(sp.a, sp.b, rng, o.over ?? 1.6, o.under ?? 1.4)
      flip = !flip
      if (flip) [la, lb] = [lb, la]
      const mid: Pt = [(la[0] + lb[0]) / 2 + rng.gauss(0, 0.25), (la[1] + lb[1]) / 2 + rng.gauss(0, 0.25)]
      lines.push({ pts: [la, mid, lb], o: { simple: true, end: 'flick', start: rng.chance(0.4) ? 'pool' : 'soft', speed: 1.3, wobble: 0.5, width: (o.width ?? 1) * rng.range(0.85, 1.15), alpha: o.alpha ?? 0.85 } })
    }
    ink.lines(lines, o.pen ?? 'pencil', o.opts)
  })
}

export function edgeBand(ink: Ink, x: number, y: number, w: number, h: number, side: 't' | 'r' | 'b' | 'l', o: { thick?: number; gap?: number; inset?: number; pen?: PenName | PenSpec; alpha?: number; width?: number } = {}): void {
  const R = ink.next('edge')
  const thick = o.thick ?? 4
  const gap = o.gap ?? 2.6
  const horiz = side === 'b' || side === 't'
  const len = horiz ? w : h
  const dirSign = side === 'b' || side === 'r' ? 1 : -1
  const inset = o.inset ?? 2
  let t = R.range(0, gap) + inset
  const end = len - inset
  let inCluster = R.int(3, 7), cl = 0
  const lines: Line[] = []
  while (t < end) {
    const fade = Math.min(1, t / 9, (len - t) / 9)
    const bell = 0.55 + 0.45 * Math.sin((Math.PI * (cl + 0.5)) / inCluster)
    const L = thick * (0.45 + 0.55 * fade) * bell * R.range(0.65, 1.2)
    const lean = R.range(0.55, 1.2) * L
    let p0: Pt, p1: Pt
    if (horiz) {
      const by = side === 'b' ? y + h : y
      const x0 = x + t
      p0 = [x0 + R.gauss(0, 0.3), by - dirSign * R.range(0, 1)]
      p1 = [x0 - lean * 0.7, by + dirSign * L]
    } else {
      const bx = side === 'r' ? x + w : x
      const y0 = y + t
      p0 = [bx - dirSign * R.range(0, 1), y0 + R.gauss(0, 0.3)]
      p1 = [bx + dirSign * L, y0 + lean * 0.7]
    }
    lines.push({ pts: seg(p0[0], p0[1], p1[0], p1[1], R.gauss(0, 0.2), 3), o: { simple: true, start: 'soft', end: 'flick', speed: 1.5, wobble: 0.5, alpha: o.alpha ?? 0.82, width: o.width ?? 0.62 } })
    cl++
    t += gap * R.range(0.75, 1.3)
    if (cl >= inCluster) {
      cl = 0
      inCluster = R.int(3, 7)
      t += gap * R.range(0.8, 2.2)
    }
  }
  ink.lines(lines, o.pen ?? 'ink.fine')
}

export function stipple(ink: Ink, x: number, y: number, w: number, h: number, count: number, o: { pen?: PenName | PenSpec; alpha?: number } = {}): void {
  const R = ink.next('stip')
  const lines: Line[] = []
  for (let i = 0; i < count; i++) {
    const px = x + R() * w, py = y + R() * h
    lines.push({ pts: [[px, py], [px + R.range(-0.5, 0.5), py + R.range(0.2, 0.9)]], o: { simple: true, width: R.range(0.8, 1.5), start: 'pool', end: 'pool', wobble: 0, alpha: o.alpha } })
  }
  ink.lines(lines, o.pen ?? 'ink.fine')
}

export function contourArcs(ink: Ink, cx: number, cy: number, rx: number, ry: number, o: { n?: number; dir?: 1 | -1; pen?: PenName | PenSpec; alpha?: number } = {}): void {
  const cnt = o.n ?? 4
  const lines: Line[] = []
  for (let i = 0; i < cnt; i++) {
    const t = (i + 0.6) / (cnt + 0.2)
    const y = cy - ry + 2 * ry * t
    const half = rx * Math.sqrt(Math.max(0, 1 - Math.pow((y - cy) / ry, 2)))
    const bulge = ry * 0.28 * (1 - t) + 1
    lines.push({ pts: seg(cx - half * 0.92, y, cx + half * 0.92, y, bulge * (o.dir ?? 1), 6), o: { simple: true, width: 0.75, start: 'soft', end: 'flick', speed: 1.3, wobble: 0.5, alpha: o.alpha } })
  }
  ink.lines(lines, o.pen ?? 'ink.fine')
}

export function highlight(ink: Ink, x: number, y: number, w: number, h: number, o: { pen?: PenName | PenSpec; k?: number; opts?: StrokeOpts } = {}): void {
  const rng = ink.next('hl')
  const cy = y + h / 2
  const x1 = x - (1 + rng() * 3), x2 = x + w + 1 + rng() * 4
  const y1 = cy + rng.gauss(0, 0.04 * h), y2 = cy + rng.gauss(0, 0.05 * h) - 0.004 * w
  const mid: Pt = [(x1 + x2) / 2, (y1 + y2) / 2 + rng.gauss(0, 0.04 * h)]
  const P = resolvePen(o.pen ?? 'hi')
  ink.stroke([[x1, y1], mid, [x2, y2]], P, { width: (h * (o.k ?? 0.86)) / P.W, end: rng() < 0.5 ? 'flick' : 'pool', start: 'pool', wobble: 0.6, ...o.opts })
}

export interface PolyFillOpts {
  alpha?: number
  mis?: number | false
  angle?: number
  pw?: number
  overlap?: number
}

export function polyFill(ink: Ink, poly: Pt[], color: PaintKey, o: PolyFillOpts = {}): Offset {
  return solidFill(ink, poly, color, { alpha: clamp((o.alpha ?? 0.5) * 1.8, 0.3, 0.96) })
}

export function sweepFill(ink: Ink, x: number, y: number, w: number, h: number, color: PaintKey, o: { alpha?: number; pw?: number; overlap?: number; mis?: number | false } = {}): Offset {
  return solidFill(ink, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], color, { alpha: clamp((o.alpha ?? 0.48) * 1.9, 0.3, 0.96) })
}
