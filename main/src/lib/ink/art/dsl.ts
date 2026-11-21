import type { ArtDef, ArtKind, Part } from '@/lib/ink/art/types'

export type P2 = [number, number]

export interface Sub {
  pts: P2[]
  closed: boolean
  anchor: boolean[]
  shape: number
}

export interface ParseOpts {
  step?: number
  rnd?: () => number
}

const TAU = Math.PI * 2
const TOKEN = /[MLlQCOEZ]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g
const CMD = /^[MLlQCOEZ]$/

export function tokenize(d: string): { tok: string[]; bad: string } {
  const tok = d.match(TOKEN) ?? []
  const bad = d.replace(TOKEN, '').replace(/[\s,]+/g, '')
  return { tok, bad }
}

export function parsePath(d: string, o: ParseOpts = {}): Sub[] {
  const step = o.step ?? 0.6
  const rnd = o.rnd ?? (() => 0.5)
  const { tok } = tokenize(d)
  const subs: Sub[] = []
  let cur: Sub | null = null
  let cx = 0, cy = 0, sx = 0, sy = 0, i = 0
  const num = (): number => Number.parseFloat(tok[i++])
  const isNum = (): boolean => i < tok.length && !CMD.test(tok[i])
  const push = (x: number, y: number, anchor: boolean): void => {
    if (!cur) subs.push((cur = { pts: [], closed: false, anchor: [], shape: 0 }))
    cur.pts.push([x, y])
    cur.anchor.push(anchor)
    cx = x
    cy = y
  }
  while (i < tok.length) {
    const c = tok[i++]
    if (c === 'M') {
      cur = null
      sx = num()
      sy = num()
      push(sx, sy, true)
      while (isNum()) push(num(), num(), true)
    } else if (c === 'L') {
      while (isNum()) push(num(), num(), true)
    } else if (c === 'l') {
      while (isNum()) push(cx + num(), cy + num(), true)
    } else if (c === 'Q') {
      while (isNum()) {
        const x1 = num(), y1 = num(), x2 = num(), y2 = num()
        const x0 = cx, y0 = cy
        const n = Math.max(3, Math.ceil(Math.hypot(x2 - x0, y2 - y0) / step))
        for (let k = 1; k <= n; k++) {
          const t = k / n, u = 1 - t
          push(u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2, k === n)
        }
      }
    } else if (c === 'C') {
      while (isNum()) {
        const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x3 = num(), y3 = num()
        const x0 = cx, y0 = cy
        const n = Math.max(4, Math.ceil((Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2)) / step))
        for (let k = 1; k <= n; k++) {
          const t = k / n, u = 1 - t
          push(
            u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
            u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
            k === n,
          )
        }
      }
    } else if (c === 'O') {
      const ox = num(), oy = num(), rx = num(), ry = isNum() ? num() : rx
      cur = null
      const n = Math.max(20, Math.ceil(((rx + ry) * Math.PI * 1.1) / step))
      const a0 = -2.3 + (rnd() - 0.5) * 0.7
      for (let k = 0; k <= n; k++) {
        const a = a0 + (k / n) * TAU * 1.09
        const kk = 1 + 0.02 * Math.sin(2 * a)
        push(ox + Math.cos(a) * rx * kk, oy + Math.sin(a) * ry * kk, false)
      }
      if (cur) {
        const s = cur as Sub
        s.closed = true
        s.shape = Math.round(n / 1.09)
      }
      sx = (cur as Sub | null)?.pts[0][0] ?? ox
      sy = (cur as Sub | null)?.pts[0][1] ?? oy
    } else if (c === 'E') {
      const ox = num(), oy = num(), rx = num(), ry = num()
      const a0 = (num() * Math.PI) / 180, a1 = (num() * Math.PI) / 180
      const ax = ox + Math.cos(a0) * rx, ay = oy + Math.sin(a0) * ry
      if (!cur || Math.hypot(ax - cx, ay - cy) > 0.8) cur = null
      const n = Math.max(6, Math.ceil((Math.abs(a1 - a0) * Math.max(rx, ry)) / step))
      for (let k = 0; k <= n; k++) {
        const a = a0 + ((a1 - a0) * k) / n
        push(ox + Math.cos(a) * rx, oy + Math.sin(a) * ry, k === 0 || k === n)
      }
    } else if (c === 'Z') {
      const s = cur as Sub | null
      if (s && s.pts.length > 2) {
        s.shape = s.pts.length
        const first = s.pts[0], look = s.pts[Math.min(3, s.pts.length - 1)]
        const dl = Math.hypot(look[0] - first[0], look[1] - first[1]) || 1
        const ux = (look[0] - first[0]) / dl, uy = (look[1] - first[1]) / dl
        const ov = 0.9 + rnd() * 1.0
        push(sx, sy, false)
        push(sx + ux * ov * 0.5 - uy * 0.2, sy + uy * ov * 0.5 + ux * 0.2, false)
        push(sx + ux * ov - uy * 0.45, sy + uy * ov + ux * 0.45, false)
        s.closed = true
      }
    }
  }
  for (const s of subs) if (!s.shape) s.shape = s.pts.length
  return subs
}

export function polygonsOf(d: string, o: ParseOpts = {}): P2[][] {
  return parsePath(d, { step: 0.5, ...o }).filter((s) => s.pts.length > 2).map((s) => s.pts.slice(0, s.shape))
}

export interface Problem {
  level: 'error' | 'warn'
  code: string
  msg: string
  at?: string
}

export interface PathCheck {
  errors: string[]
  warnings: string[]
  bbox: [number, number, number, number] | null
  strokes: number
}

const nf = (s: string): number => Number.parseFloat(s)

export function checkPath(d: string): PathCheck {
  const errors: string[] = []
  const warnings: string[] = []
  if (typeof d !== 'string' || !d.trim()) return { errors: ['empty path'], warnings, bbox: null, strokes: 0 }
  const { tok, bad } = tokenize(d)
  if (bad) errors.push(`illegal characters "${bad.slice(0, 12)}" (grammar: M L l Q C O E Z, numbers)`)
  let i = 0
  let open = false
  let count = 0
  let lastPoint = false
  const numsAfter = (): number => {
    let k = 0
    while (i + k < tok.length && !CMD.test(tok[i + k])) k++
    return k
  }
  if (tok.length && tok[0] !== 'M' && tok[0] !== 'O' && tok[0] !== 'E') errors.push(`path must start with M, O or E, not "${tok[0]}"`)
  let curLen = 0
  while (i < tok.length) {
    const c = tok[i++]
    if (!CMD.test(c)) {
      errors.push(`number "${c}" without a command`)
      continue
    }
    const k = numsAfter()
    const bump = (n: number): void => {
      i += n
    }
    switch (c) {
      case 'M':
        if (k < 2 || k % 2) errors.push(`M needs pairs of numbers (got ${k})`)
        open = true
        count++
        curLen = Math.floor(k / 2)
        bump(k)
        break
      case 'L':
        if (!open) errors.push('L before M')
        if (k < 2 || k % 2) errors.push(`L needs pairs of numbers (got ${k})`)
        curLen += Math.floor(k / 2)
        bump(k)
        break
      case 'l':
        if (!open) errors.push('l before M')
        if (k < 2 || k % 2) errors.push(`l needs pairs of numbers (got ${k})`)
        curLen += Math.floor(k / 2)
        bump(k)
        break
      case 'Q':
        if (!open) errors.push('Q before M')
        if (k < 4 || k % 4) errors.push(`Q needs groups of 4 numbers (got ${k})`)
        curLen += Math.floor(k / 4)
        bump(k)
        break
      case 'C':
        if (!open) errors.push('C before M')
        if (k < 6 || k % 6) errors.push(`C needs groups of 6 numbers (got ${k})`)
        curLen += Math.floor(k / 6)
        bump(k)
        break
      case 'O':
        if (k !== 3 && k !== 4) errors.push(`O needs cx cy rx [ry] (got ${k} numbers)`)
        else if (nf(tok[i + 2]) <= 0 || (k === 4 && nf(tok[i + 3]) <= 0)) errors.push('O radii must be positive')
        open = false
        count++
        bump(k)
        break
      case 'E':
        if (k !== 6) errors.push(`E needs cx cy rx ry a0 a1 (got ${k} numbers)`)
        else if (nf(tok[i + 2]) <= 0 || nf(tok[i + 3]) <= 0) errors.push('E radii must be positive')
        if (!open) count++
        open = true
        bump(k)
        break
      case 'Z':
        if (!open || curLen < 3) errors.push('Z closes a stroke of at least 3 points')
        if (k) errors.push('Z takes no numbers')
        open = false
        break
    }
    lastPoint = true
  }
  void lastPoint
  if (!errors.length) {
    const subs = parsePath(d)
    for (const s of subs) {
      if (s.closed || s.pts.length < 4) continue
      const a = s.pts[0], b = s.pts[s.pts.length - 1]
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.35) warnings.push('the stroke ends exactly where it began: close it with Z (the pen overshoots) or stop short')
    }
    const nums = tok.filter((t) => !CMD.test(t))
    const dec = nums.filter((t) => /\.\d{3,}/.test(t)).length
    if (dec) warnings.push(`${dec} coordinates have 3+ decimals (write one decimal: the engine adds the wobble)`)
    if (nums.length >= 8 && nums.filter((t) => /^-?\d+$/.test(t)).length / nums.length > 0.7) warnings.push('most coordinates are whole numbers: a tidy grid reads as computer-drawn (use 12.2, 11.8...)')
  }
  let bbox: PathCheck['bbox'] = null
  if (!errors.length) {
    for (const s of parsePath(d, { step: 0.4 })) {
      for (let k = 0; k < s.shape; k++) {
        const p = s.pts[k]
        bbox = bbox ? [Math.min(bbox[0], p[0]), Math.min(bbox[1], p[1]), Math.max(bbox[2], p[0]), Math.max(bbox[3], p[1])] : [p[0], p[1], p[0], p[1]]
      }
    }
  }
  return { errors, warnings, bbox, strokes: count }
}

const COLOUR_BASE = new Set([
  'ink', 'ink-soft', 'ink-you', 'pencil', 'pencil-mark', 'red', 'green', 'marker', 'hi', 'focus',
  'paper', 'paper-shade', 'slip', 'card', 'graph', 'kraft', 'check', 'photo', 'desk', 'desk-deep', 'rule-blue', 'rule-red', 'pad', 'pad-rule', 'check-rule',
  'ink-muted', 'pencil-text', 'orange-text', 'hi-deep', 'tape', 'tape-edge',
  'tomato', 'tangerine', 'lemon', 'grass', 'teal', 'sky', 'grape', 'bubblegum',
  'sticky-yellow', 'sticky-green', 'sticky-orange', 'sticky-pink', 'sticky-blue', 'current',
])
export function isArtColour(c: unknown): boolean {
  if (typeof c !== 'string') return false
  if (c === 'acc' || c === 'sil') return true
  const base = c.endsWith('~') ? c.slice(0, -1) : c
  return COLOUR_BASE.has(base) && base !== 'current'
}

export const ACCENT_KEYS = ['tomato', 'tangerine', 'lemon', 'grass', 'teal', 'sky', 'grape', 'bubblegum'] as const

export const USABLE: Partial<Record<ArtKind, [number, number, number, number]>> = {
  icon: [2, 2, 22, 22],
  doodle: [4, 4, 60, 60],
  sticker: [6, 6, 58, 58],
  mascot: [4, 3, 60, 70],
}

export const BUDGET: Record<'icon' | 'doodle' | 'sticker' | 'mascot', { parts: number; small: number; micro: number; hi: number }> = {
  icon: { parts: 6, small: 4, micro: 3, hi: 6 },
  doodle: { parts: 14, small: 9, micro: 5, hi: 8 },
  sticker: { parts: 24, small: 16, micro: 8, hi: 10 },
  mascot: { parts: 34, small: 22, micro: 12, hi: 12 },
}

export function kindOfDef(def: { kind?: ArtKind; grid: ArtDef['grid'] }): ArtKind {
  if (def.kind) return def.kind
  if (def.grid === 24) return 'icon'
  if (Array.isArray(def.grid)) return 'mascot'
  return 'doodle'
}

const PART_TAGS = new Set(['f', 's', 'c', 'd', 'h', 't'])

function widthOf(p: Part): number | undefined {
  if (p[0] === 's') return p[2]
  if (p[0] === 'c') return p[3]
  if (p[0] === 'h') return undefined
  return undefined
}

export type GlyphLookup = (font: string, ch: string) => boolean | undefined

export function validateParts(parts: readonly Part[], kind: ArtKind, tier: string, hasAccent: boolean, glyph?: GlyphLookup): Problem[] {
  const out: Problem[] = []
  const area = USABLE[kind]
  const E = (code: string, msg: string, at: string): number => out.push({ level: 'error', code, msg, at })
  const W = (code: string, msg: string, at: string): number => out.push({ level: 'warn', code, msg, at })
  parts.forEach((p, idx) => {
    const at = `${tier}[${idx}]`
    if (!Array.isArray(p) || !PART_TAGS.has(p[0] as string)) return void E('part-shape', `unknown part ${JSON.stringify(p)?.slice(0, 40)}`, at)
    const paths: string[] = []
    switch (p[0]) {
      case 'f':
        if (!isArtColour(p[1])) E('colour', `"${String(p[1])}" is not an allowed color (PaintKey, key~, acc, sil)`, at)
        if (p[1] === 'acc' && !hasAccent && kind === 'icon') W('accent', "'acc' part but the def has no `accent` (falls back to the highlighter)", at)
        paths.push(p[2])
        if (p[3] !== undefined && !(p[3] >= 0 && p[3] <= 3)) E('mis', 'fill misregistration multiplier must be 0..3', at)
        break
      case 's':
        paths.push(p[1])
        break
      case 'c':
        if (!isArtColour(p[1]) || p[1] === 'sil') E('colour', `"${String(p[1])}" is not an allowed stroke color`, at)
        paths.push(p[2])
        break
      case 'h':
        paths.push(p[1])
        break
      case 'd': {
        const [, x, y, r] = p
        if (![x, y].every((v) => typeof v === 'number' && Number.isFinite(v))) E('part-shape', 'dot needs numeric x y', at)
        else if (area && (x < area[0] || x > area[2] || y < area[1] || y > area[3])) E('bounds', `dot (${x}, ${y}) is outside the usable area ${area[0]},${area[1]}..${area[2]},${area[3]}`, at)
        if (r !== undefined && !(r >= 0.6 && r <= (tier === 'micro' ? 8 : 6))) W('dot-radius', `dot radius ${r} is outside 0.6..${tier === 'micro' ? 8 : 6} grid units`, at)
        return
      }
      case 't': {
        const [, txt, x, y, size] = p
        const font = p[6] ?? 'hand'
        if (font !== 'hand' && font !== 'type') E('text', `unknown lettering font "${String(font)}" (hand | type)`, at)
        else if (glyph) for (const ch of String(txt).toUpperCase()) if (ch !== ' ' && glyph(font, ch) === false) E('text', `no glyph for "${ch}" in the ${font} lettering`, at)
        if (![x, y, size].every((v) => typeof v === 'number' && Number.isFinite(v))) E('part-shape', 'text needs numeric x y size', at)
        if (p[5] !== undefined && !isArtColour(p[5])) E('colour', `"${String(p[5])}" is not an allowed color`, at)
        return
      }
    }
    const wm = widthOf(p)
    if (wm !== undefined) {
      const lo = kind === 'icon' && tier !== 'hi' ? 0.6 : 0.45
      const hi = tier === 'micro' ? 1.8 : kind === 'icon' ? 1.4 : 1.5
      if (!(wm >= 0.4 && wm <= 1.8)) E('width', `widthMul ${wm} is outside 0.4..1.8`, at)
      else if (wm < lo || wm > hi) W('width', `widthMul ${wm} is outside ${lo}..${hi} for ${kind} ${tier}`, at)
    }
    for (const d of paths) {
      const r = checkPath(d)
      for (const m of r.errors) E('path', m, at)
      for (const m of r.warnings) W('path-style', m, at)
      if (!r.errors.length && r.bbox && area && !(p[0] === 'f' && p[1] === 'sil')) {
        const [x0, y0, x1, y1] = r.bbox
        const slack = 0.5
        if (x0 < area[0] - slack || y0 < area[1] - slack || x1 > area[2] + slack || y1 > area[3] + slack) {
          E('bounds', `path extent ${x0.toFixed(1)},${y0.toFixed(1)}..${x1.toFixed(1)},${y1.toFixed(1)} leaves the usable area ${area[0]},${area[1]}..${area[2]},${area[3]}`, at)
        }
      }
    }
  })
  return out
}

export function validateArt(def: ArtDef, o: { id?: string; kind?: ArtKind; glyph?: GlyphLookup } = {}): Problem[] {
  const out: Problem[] = []
  const kind = o.kind ?? kindOfDef(def)
  const g = def.grid
  const okGrid = g === 24 || g === 64 || (Array.isArray(g) && g.length === 2 && g.every((v) => Number.isFinite(v) && v >= 8 && v <= 512))
  if (!okGrid) out.push({ level: 'error', code: 'grid', msg: `grid must be 24, 64 or [w, h] (got ${JSON.stringify(g)})` })
  if (!Array.isArray(def.parts) || !def.parts.length) out.push({ level: 'error', code: 'parts', msg: 'a definition needs at least one part' })
  if (def.accent !== undefined && !([...ACCENT_KEYS, 'hi', 'kraft'] as string[]).includes(def.accent)) out.push({ level: 'error', code: 'accent', msg: `accent "${String(def.accent)}" is not a stationery accent, "hi" or "kraft"` })
  if (def.nibK !== undefined && !(def.nibK >= 0.02 && def.nibK <= 0.14)) out.push({ level: 'error', code: 'nibK', msg: 'nibK must be 0.02..0.14' })
  if (def.tags !== undefined && (!Array.isArray(def.tags) || def.tags.some((t) => typeof t !== 'string' || !t))) out.push({ level: 'error', code: 'tags', msg: 'tags must be non-empty strings' })
  const b = BUDGET[kind as keyof typeof BUDGET]
  const tiers: Array<['parts' | 'small' | 'micro' | 'hi', readonly Part[] | undefined]> = [['parts', def.parts], ['small', def.small], ['micro', def.micro], ['hi', def.hi]]
  for (const [name, list] of tiers) {
    if (!list) continue
    if (!Array.isArray(list)) {
      out.push({ level: 'error', code: 'parts', msg: `${name} must be an array of parts` })
      continue
    }
    out.push(...validateParts(list, kind, name, def.accent !== undefined, o.glyph))
    const blots = list.filter((p) => p[0] === 'd').length
    const drawn = list.length - blots
    if (b && drawn > b[name]) out.push({ level: 'error', code: 'budget', msg: `${name} has ${drawn} fills / strokes; the ${kind} budget is ${b[name]} (put several strokes in one path with M)`, at: name })
    if (blots > 8) out.push({ level: 'error', code: 'budget', msg: `${name} has ${blots} blots; at most 8`, at: name })
  }
  if (def.small && def.parts && JSON.stringify(def.small) === JSON.stringify(def.parts)) out.push({ level: 'warn', code: 'small-copy', msg: '`small` is identical to the master: redraw it (bigger silhouette, fewer details, heavier strokes)' })
  return out
}
