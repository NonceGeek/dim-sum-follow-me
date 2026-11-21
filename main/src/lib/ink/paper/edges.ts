import type { Pt, Tier } from '@/lib/ink/types'
import type { Rng } from '@/lib/ink/rng'
import { noise1 } from '@/lib/ink/noise'
import { TIERS, polyPath, simplePath, smoothClosed } from '@/lib/ink/geom'

export type EdgeKind = 'cut' | 'torn' | 'deckle' | 'crimp' | 'zig' | 'perf' | 'scallop'
export type EdgeSide = 'top' | 'right' | 'bottom' | 'left'
export type EdgeSpec = EdgeKind | Partial<Record<EdgeSide, EdgeKind>>

export const EDGE_KINDS: readonly EdgeKind[] = ['cut', 'torn', 'deckle', 'crimp', 'zig', 'perf', 'scallop']
const SIDES: readonly EdgeSide[] = ['top', 'right', 'bottom', 'left']

export function edgeSides(edge: EdgeSpec | undefined): [EdgeKind, EdgeKind, EdgeKind, EdgeKind] {
  if (!edge) return ['cut', 'cut', 'cut', 'cut']
  if (typeof edge === 'string') return [edge, edge, edge, edge]
  return SIDES.map((s) => edge[s] ?? 'cut') as [EdgeKind, EdgeKind, EdgeKind, EdgeKind]
}

export const isCutEdge = (edge: EdgeSpec | undefined): boolean => edgeSides(edge).every((k) => k === 'cut')

export function edgeName(edge: EdgeSpec | undefined): EdgeKind {
  return edgeSides(edge).find((k) => k !== 'cut') ?? 'cut'
}

interface Rough {
  b: number
  lo: number
  mid: number
  hi: number
  f0: number
  f1: number
  step: number
}
const ROUGH: Record<'cut' | 'torn' | 'deckle' | 'crimp', Rough> = {
  cut: { b: 0.55, lo: 0.16, mid: 0, hi: 0.05, f0: 0, f1: 0, step: 14 },
  crimp: { b: 1.5, lo: 0.6, mid: 0.36, hi: 0.15, f0: 0.3, f1: 0.3, step: 2.1 },
  torn: { b: 2.5, lo: 1.5, mid: 1.15, hi: 0.6, f0: 0.9, f1: 0.8, step: 1.7 },
  deckle: { b: 2.3, lo: 1.3, mid: 0.95, hi: 0.42, f0: 1.5, f1: 1, step: 1.9 },
}

const ZIG = { pitch: 8, depth: 4.2 }
const PERF = { pitch: 5.4, depth: 2.3 }
const SCALLOP = { pitch: 14 }

interface Sample {
  u: number
  e: number
  f: number
}

const NOISE_PERIODS = { lo: 22, mid: 3.2, hi: 0.9, fz: 1.1 }

function roughSide(kind: keyof typeof ROUGH, len: number, rng: Rng, amp: number): Sample[] {
  const K = ROUGH[kind]
  const lo = noise1(rng.fork('lo'), len, NOISE_PERIODS.lo)
  const mid = noise1(rng.fork('mid'), len, NOISE_PERIODS.mid)
  const hi = noise1(rng.fork('hi'), len, NOISE_PERIODS.hi)
  const fz = noise1(rng.fork('fz'), len, NOISE_PERIODS.fz)
  const cnt = Math.max(2, Math.round(len / K.step))
  const out: Sample[] = []
  for (let i = 0; i <= cnt; i++) {
    const u = (i / cnt) * len
    const fade = Math.min(1, u / 7, (len - u) / 7)
    const e = Math.max(0.15, (K.b + K.lo * lo(u) + K.mid * mid(u) + K.hi * hi(u)) * amp) * (0.35 + 0.65 * fade)
    const f = Math.max(0, K.f0 + K.f1 * fz(u)) * amp * fade
    out.push({ u, e, f })
  }
  return out
}

function zigSide(len: number, rng: Rng, amp: number): Sample[] {
  const n = Math.max(2, Math.round(len / ZIG.pitch))
  const pitch = len / n
  const jit = noise1(rng.fork('zj'), len, 30)
  const out: Sample[] = []
  for (let i = 0; i <= n; i++) {
    out.push({ u: i * pitch, e: 0.15, f: 0 })
    if (i < n) out.push({ u: (i + 0.5) * pitch, e: (ZIG.depth + 0.5 * jit((i + 0.5) * pitch)) * amp, f: 0 })
  }
  return out
}

function perfSide(len: number, rng: Rng, amp: number): Sample[] {
  const n = Math.max(2, Math.round(len / PERF.pitch))
  const pitch = len / n
  const jit = noise1(rng.fork('pj'), len, 40)
  const out: Sample[] = [{ u: 0, e: 0.3, f: 0 }]
  for (let i = 0; i < n; i++) {
    const c = (i + 0.5) * pitch
    const r = pitch * 0.4
    const depth = (PERF.depth + 0.3 * jit(c)) * amp
    for (let k = 0; k <= 6; k++) {
      const a = Math.PI * (k / 6)
      out.push({ u: c - Math.cos(a) * r, e: 0.3 + Math.sin(a) * depth, f: 0 })
    }
  }
  out.push({ u: len, e: 0.3, f: 0 })
  return out
}

function scallopSide(len: number, rng: Rng, amp: number): Sample[] {
  const n = Math.max(2, Math.round(len / SCALLOP.pitch))
  const pitch = len / n
  const R = pitch / 2
  const out: Sample[] = []
  for (let i = 0; i < n; i++) {
    const c = (i + 0.5) * pitch
    const wob = 1 + 0.05 * (rng.fork('s' + i)() - 0.5)
    for (let k = 0; k <= 12; k++) {
      const a = -Math.PI / 2 + Math.PI * (k / 12)
      out.push({ u: c + Math.sin(a) * R * 0.98, e: 0.15 + R * 0.6 * (1 - Math.cos(a)) * amp * wob, f: 0 })
    }
  }
  return out
}

function side(kind: EdgeKind, len: number, rng: Rng, amp: number): Sample[] {
  switch (kind) {
    case 'zig':
      return zigSide(len, rng, amp)
    case 'perf':
      return perfSide(len, rng, amp)
    case 'scallop':
      return scallopSide(len, rng, amp)
    default:
      return roughSide(kind, len, rng, amp)
  }
}

export interface OutlineOpts {
  amp?: number
  chamfer?: number
}

export interface Outline {
  pts: Pt[]
  rim: Pt[]
  crisp: boolean
  reach: number
  fibrous: boolean
  sides: Array<{ kind: EdgeKind; from: number; to: number }>
}

export function sheetOutline(rng: Rng, w: number, h: number, edge: EdgeSpec, o: OutlineOpts = {}): Outline {
  const amp = o.amp ?? 1
  const kinds = edgeSides(edge)
  const S = [
    side(kinds[0], w, rng.fork('top'), amp),
    side(kinds[1], h, rng.fork('right'), amp),
    side(kinds[2], w, rng.fork('bottom'), amp),
    side(kinds[3], h, rng.fork('left'), amp),
  ]
  const pts: Pt[] = []
  const rim: Pt[] = []
  let reach = 0
  const push = (p: Pt, r: Pt, f: number) => {
    pts.push(p)
    rim.push(r)
    if (f > reach) reach = f
  }
  const sides: Outline['sides'] = []
  const mark = (kind: EdgeKind, from: number) => sides.push({ kind, from, to: pts.length })
  for (const q of S[0]) push([q.u, q.e], [q.u, q.e - q.f], q.f)
  mark(kinds[0], 0)
  for (const q of S[1]) push([w - q.e, q.u], [w - q.e + q.f, q.u], q.f)
  mark(kinds[1], sides[0].to)
  for (const q of S[2]) push([w - q.u, h - q.e], [w - q.u, h - q.e + q.f], q.f)
  mark(kinds[2], sides[1].to)
  for (const q of S[3]) push([q.e, h - q.u], [q.e - q.f, h - q.u], q.f)
  mark(kinds[3], sides[2].to)
  if (o.chamfer && o.chamfer > 0) {
    chamferCorner(pts, rim, w, h, o.chamfer)
    sides.length = 0
  }
  const crisp = kinds.some((k) => k === 'zig' || k === 'perf' || k === 'scallop')
  const fibrous = kinds.some((k) => k === 'torn' || k === 'deckle')
  return { pts, rim, crisp, reach, fibrous, sides }
}

function chamferCorner(pts: Pt[], rim: Pt[], w: number, h: number, c: number): void {
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    if (p[0] > w - c - 0.5 && p[1] > h - c - 0.5 && p[0] + p[1] > w + h - c) {
      pts.splice(i, 1)
      rim.splice(i, 1)
    }
  }
  const at = pts.findIndex((p, i) => i > 0 && p[1] > h - 2 && p[0] < w - c && pts[i - 1][0] > p[0])
  const ins: Pt[] = [
    [w - 0.3, h - c],
    [w - c, h - 0.3],
  ]
  const j = at < 0 ? pts.length : at
  pts.splice(j, 0, ...ins)
  rim.splice(j, 0, ...ins)
}

const coarse = (tier: Tier) => ({ ...TIERS[tier], tol: TIERS[tier].tol * 1.75 })

export function outlinePath(o: Outline, which: 'body' | 'rim', tier: Tier = 'lo'): string {
  const pts = which === 'body' ? o.pts : o.rim
  if (o.crisp) return which === 'body' ? simplePath(pts, { ...TIERS[tier], tol: TIERS[tier].tol * 0.8 }) : polyPath(pts, 10)
  return smoothClosed(pts, coarse(tier))
}

export function sideInsets(o: Outline, w: number, h: number, chamfer = 0): [number, number, number, number] {
  const sum = [0, 0, 0, 0]
  const cnt = [0, 0, 0, 0]
  for (const [x, y] of o.pts) {
    if (chamfer && x > w - chamfer - 1 && y > h - chamfer - 1) continue
    const d = [y, w - x, h - y, x]
    let k = 0
    for (let i = 1; i < 4; i++) if (d[i] < d[k]) k = i
    sum[k] += d[k]
    cnt[k]++
  }
  return sum.map((v, i) => Math.round((cnt[i] ? v / cnt[i] : 0.5) * 10) / 10) as [number, number, number, number]
}

export function edgeInset(edge: EdgeSpec | undefined): number {
  const k = edgeSides(edge)
  let m = 0.6
  for (const kind of k) {
    const v = kind === 'torn' ? 4.5 : kind === 'deckle' ? 4.2 : kind === 'crimp' ? 2.6 : kind === 'zig' ? ZIG.depth + 1 : kind === 'perf' ? PERF.depth + 1 : kind === 'scallop' ? SCALLOP.pitch * 0.4 : 0.6
    if (v > m) m = v
  }
  return m
}
