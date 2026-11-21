import { tileOffsets, type SheetShadowKind } from '@/lib/ink/paper/shadows'
import { STICKY_VEIL, TOOTH_TILES, stockOf, type StockName } from '@/lib/ink/paper/stocks'
import type { PaperTileName } from '@/lib/ink/textures'

export interface FaceSpec {
  d: string
  evenodd?: boolean
  stock: StockName
  seed: number
  veil?: false
  paper?: false
  cast?: {
    kind: SheetShadowKind
    inset: readonly [number, number, number, number]
    radius?: readonly [number, number, number, number]
  }
}

const MARK = /<!--ll-face:(.*?)-->/gs

export function faceMark(spec: FaceSpec): string {
  return `<!--ll-face:${JSON.stringify(spec).replace(/--/g, '-\\u002d')}-->`
}

export function shadowMark(kind: SheetShadowKind, radius: readonly [number, number, number, number], inset: readonly [number, number, number, number] = [0, 0, 0, 0]): string {
  return faceMark({ d: 'M0 0', stock: 'paper', seed: 0, paper: false, cast: { kind, inset, radius } })
}

export function splitFaces(markup: string): Array<string | FaceSpec> {
  const out: Array<string | FaceSpec> = []
  let last = 0
  for (const m of markup.matchAll(MARK)) {
    if (m.index > last) out.push(markup.slice(last, m.index))
    out.push(JSON.parse(m[1]) as FaceSpec)
    last = m.index + m[0].length
  }
  if (last < markup.length) out.push(markup.slice(last))
  return out
}

export const hasFace = (markup: string): boolean => markup.includes('<!--ll-face:')

export function tilesOf(stocks: Iterable<StockName>): PaperTileName[] {
  const names = new Set<PaperTileName>()
  for (const s of stocks) for (const [t] of TOOTH_TILES[stockOf(s).tooth]) names.add(t as PaperTileName)
  return [...names]
}

export function faceLook(stock: StockName, seed: string | number, veil = true): { className: string; vars: Record<string, string> } {
  const S = stockOf(stock)
  const vars: Record<string, string> = {}
  if (S.tooth === 'none') {
    vars['--ll-tex-paper'] = 'var(--ll-tex-cloud)'
    vars['--ll-tex-paper-size'] = '720px 720px'
    vars['--ll-tex-paper-pos'] = tileOffsets(seed, [[720, 720]])
  } else {
    vars['--ll-tex-paper-pos'] = tileOffsets(seed, TOOTH_TILES[S.tooth].map(([, w, h]) => [w, h] as const))
  }
  if (S.gum && veil) vars['--ll-veil'] = `${Math.round(STICKY_VEIL * 100)}%`
  if (!S.stockClass) vars['--ll-stock'] = S.color
  return { className: [S.stockClass, S.toothClass].filter(Boolean).join(' '), vars }
}

export function faceClip(spec: Pick<FaceSpec, 'd' | 'evenodd'>, dx = 0, dy = 0): string {
  return `path(${spec.evenodd ? 'evenodd, ' : ''}'${dx || dy ? translatePath(spec.d, dx, dy) : spec.d}')`
}

const num = (v: number) => String(Math.round(v * 100) / 100)
const ARITY: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7 }

interface Seg {
  cmd: string
  args: number[]
}

function parsePath(d: string): Seg[] | null {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? []
  const out: Seg[] = []
  let cmd = ''
  let i = 0
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) {
      cmd = tokens[i++]
      if (cmd === 'z' || cmd === 'Z') {
        out.push({ cmd, args: [] })
        continue
      }
    }
    const n = ARITY[cmd.toLowerCase()]
    if (!n || i + n > tokens.length) return null
    const args = tokens.slice(i, i + n).map(Number)
    if (args.some((x) => Number.isNaN(x))) return null
    i += n
    out.push({ cmd, args })
    if (cmd === 'M') cmd = 'L'
    else if (cmd === 'm') cmd = 'l'
  }
  return out
}

export function translatePath(d: string, dx: number, dy: number): string {
  const m = /^\s*M\s*(-?(?:\d+\.?\d*|\.\d+))[\s,]*(-?(?:\d+\.?\d*|\.\d+))/.exec(d)
  if (m) {
    const rest = d.slice(m[0].length)
    if (!/[A-Z]/.test(rest)) return `M${num(+m[1] + dx)} ${num(+m[2] + dy)}${/^[.\d-]/.test(rest) ? ' ' : ''}${rest}`
  }
  const segs = parsePath(d)
  if (!segs) return d
  let last = ''
  return segs
    .map(({ cmd, args }, k) => {
      const a = [...args]
      const L = cmd.toLowerCase()
      if (cmd === cmd.toUpperCase() || (k === 0 && cmd === 'm')) {
        if (L === 'h') a[0] += dx
        else if (L === 'v') a[0] += dy
        else if (L === 'a') (a[5] += dx), (a[6] += dy)
        else for (let j = 0; j < a.length; j += 2) (a[j] += dx), (a[j + 1] += dy)
      }
      const same = cmd === last && L !== 'm'
      last = cmd
      return (same ? ' ' : cmd) + a.map(num).join(' ')
    })
    .join('')
}

function arcPoints(x1: number, y1: number, rx: number, ry: number, rot: number, large: number, sweep: number, x2: number, y2: number): Array<[number, number]> {
  rx = Math.abs(rx)
  ry = Math.abs(ry)
  if (!rx || !ry || (x1 === x2 && y1 === y2)) return [[x2, y2]]
  const phi = (rot * Math.PI) / 180
  const c = Math.cos(phi), s = Math.sin(phi)
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2
  const x1p = c * dx + s * dy, y1p = -s * dx + c * dy
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
  if (lam > 1) {
    rx *= Math.sqrt(lam)
    ry *= Math.sqrt(lam)
  }
  const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num2 / den))
  const cxp = (k * rx * y1p) / ry, cyp = (-k * ry * x1p) / rx
  const cx = c * cxp - s * cyp + (x1 + x2) / 2, cy = s * cxp + c * cyp + (y1 + y2) / 2
  const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
  if (!sweep && dt > 0) dt -= 2 * Math.PI
  else if (sweep && dt < 0) dt += 2 * Math.PI
  const out: Array<[number, number]> = []
  for (let i = 1; i <= 16; i++) {
    const t = t1 + (dt * i) / 16
    out.push([cx + rx * Math.cos(t) * c - ry * Math.sin(t) * s, cy + rx * Math.cos(t) * s + ry * Math.sin(t) * c])
  }
  return out
}

export function pathBox(d: string): [number, number, number, number] {
  const segs = parsePath(d) ?? []
  let x = 0, y = 0, sx = 0, sy = 0
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  const see = (px: number, py: number) => {
    if (px < x0) x0 = px
    if (px > x1) x1 = px
    if (py < y0) y0 = py
    if (py > y1) y1 = py
  }
  for (const { cmd, args } of segs) {
    const rel = cmd !== cmd.toUpperCase()
    const L = cmd.toLowerCase()
    if (L === 'z') {
      x = sx
      y = sy
      continue
    }
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    if (L === 'h') x = ox + args[0]
    else if (L === 'v') y = oy + args[0]
    else if (L === 'a') {
      const ex = ox + args[5], ey = oy + args[6]
      for (const [px, py] of arcPoints(x, y, args[0], args[1], args[2], args[3], args[4], ex, ey)) see(px, py)
      x = ex
      y = ey
    } else {
      for (let j = 0; j < args.length - 2; j += 2) see(ox + args[j], oy + args[j + 1])
      x = ox + args[args.length - 2]
      y = oy + args[args.length - 1]
    }
    if (L === 'm') (sx = x), (sy = y)
    see(x, y)
  }
  return Number.isFinite(x0) ? [x0, y0, x1, y1] : [0, 0, 0, 0]
}

export interface FaceSvgOptions {
  tiles?: boolean
  id?: string
}

const tok = (name: string) => `var(--ll-${name})`

export function faceSvg(spec: FaceSpec, o: FaceSvgOptions = {}): string {
  if (spec.paper === false) return ''
  const S = stockOf(spec.stock)
  const gid = `${o.id ?? 'll-fc'}${spec.seed.toString(36)}`
  const [x0, y0, x1, y1] = pathBox(spec.d)
  const R = `x="${num(x0 - 2)}" y="${num(y0 - 2)}" width="${num(x1 - x0 + 4)}" height="${num(y1 - y0 + 4)}"`
  let defs = ''
  let inner = `<rect ${R} fill="${tok(S.base)}"/>`
  if (S.tint) inner += `<rect ${R} fill="${tok(S.tint[0])}" fill-opacity="${S.tint[1]}"/>`
  if (o.tiles) {
    const offs = tileOffsets(spec.seed, TOOTH_TILES[S.tooth].map(([, w, h]) => [w, h] as const)).split(', ')
    TOOTH_TILES[S.tooth].forEach(([tile, tw, th], i) => {
      const [ox, oy] = offs[i].split(' ').map(parseFloat)
      defs += `<pattern id="${gid}t${i}" width="${tw}" height="${th}" patternUnits="userSpaceOnUse" patternTransform="translate(${num(ox)} ${num(oy)})"><use href="#ll-tex-${tile}-img"/></pattern>`
      inner += `<rect ${R} fill="url(#${gid}t${i})"/>`
    })
  }
  defs += `<linearGradient id="${gid}l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tok('photo')}" stop-opacity=".38"/><stop offset=".42" stop-color="${tok('photo')}" stop-opacity="0"/><stop offset="1" stop-color="${tok('ink')}" stop-opacity=".035"/></linearGradient>`
  inner += `<rect ${R} fill="url(#${gid}l)"/>`
  if (S.gum && spec.veil !== false) inner += `<rect ${R} fill="${tok(S.base)}" fill-opacity="${STICKY_VEIL}"/>`
  const rule = spec.evenodd ? ' clip-rule="evenodd"' : ''
  return `<defs>${defs}<clipPath id="${gid}c"><path d="${spec.d}"${rule}/></clipPath></defs><g clip-path="url(#${gid}c)">${inner}</g>`
}

export function renderFaces(markup: string, o: FaceSvgOptions = {}): string {
  if (!hasFace(markup)) return markup
  return splitFaces(markup)
    .map((p) => (typeof p === 'string' ? p : faceSvg(p, o)))
    .join('')
}
