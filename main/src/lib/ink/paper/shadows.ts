import { makeRng } from '@/lib/ink/rng'

export type SheetShadowKind = 'hair' | 'loose' | 'lift' | 'slip' | 'card' | 'pad' | 'check' | 'paper' | 'sticky'

type Layer = readonly [dy: number, blur: number, spread: number, a: number]

export const SHADOW_LAYERS: Record<SheetShadowKind, readonly Layer[]> = {
  hair: [[1, 1.5, 0, 0.16]],
  loose: [[1, 2, 0, 0.12], [6, 16, -2, 0.12]],
  lift: [[1, 1.5, 0, 0.2], [7, 16, -4, 0.2]],
  slip: [[1, 1, 0, 0.2], [4, 8, -3, 0.2]],
  card: [[1, 1.5, 0, 0.2], [6, 11, -5, 0.24]],
  pad: [[1, 1.5, 0, 0.18], [10, 20, -8, 0.22]],
  check: [[1, 1.5, 0, 0.22], [6, 12, -5, 0.24]],
  paper: [[1, 1.5, 0, 0.2], [2, 5, -1, 0.1], [12, 22, -8, 0.2]],
  sticky: [[1, 1, 0, 0.2], [9, 10, -7, 0.34]],
}

const umber = (a: number) => `rgb(var(--ll-shade) / calc(${a} * var(--ll-shadow-k)))`
const px = (v: number) => (v === 0 ? '0' : `${Math.round(v * 100) / 100}px`)

export function sheetShadow(kind: SheetShadowKind = 'paper', lift = 1): string {
  if (lift === 1) return `var(--ll-shadow-${kind})`
  const L = SHADOW_LAYERS[kind]
  return L.map(([dy, blur, spread, a], i) => {
    const far = i > 0 || L.length === 1
    const k = far ? lift : Math.min(1, 0.4 + lift * 0.6)
    return `0 ${px(dy * k)} ${px(blur * k)} ${px(spread * (far ? lift : 1))} ${umber(Math.min(0.6, a * (far ? Math.min(1.35, 0.5 + lift * 0.5) : 1)))}`
  }).join(', ')
}

const CONTACT_BLUR = 2

export function contactShadow(kind: SheetShadowKind): { dy: number; a: number } | null {
  const first = SHADOW_LAYERS[kind][0]
  return first && first[1] <= CONTACT_BLUR ? { dy: first[0], a: first[3] } : null
}

export function farShadow(kind: SheetShadowKind, all = false): string {
  const far = SHADOW_LAYERS[kind].filter((l) => all || l[1] > CONTACT_BLUR)
  return far.length ? far.map(([dy, blur, spread, a]) => `0 ${px(dy)} ${px(blur)} ${px(spread)} ${umber(a)}`).join(', ') : 'none'
}

export type DropKind = 'sheet' | 'sticker' | 'tape' | 'prop'
const DROP: Record<DropKind, readonly (readonly [number, number, number])[]> = {
  sheet: [[1, 0.75, 0.22], [8, 8, 0.14]],
  sticker: [[1, 0.6, 0.26], [3, 3, 0.14]],
  tape: [[0.6, 0.8, 0.18]],
  prop: [[1, 0.8, 0.3], [3, 2.4, 0.16]],
}
export function dropShadow(kind: DropKind = 'sheet', lift = 1): string {
  if (lift === 1 && (kind === 'sheet' || kind === 'sticker')) return `var(--ll-drop-${kind})`
  return DROP[kind].map(([dy, blur, a]) => `drop-shadow(0 ${px(dy * lift)} ${px(blur * lift)} ${umber(Math.min(0.5, a))})`).join(' ')
}

export function tiltFor(seed: string | number, max = 0.6): number {
  const r = makeRng(`tilt:${seed}`)
  const sign = r.sign()
  return Math.round(sign * max * (0.25 + 0.75 * r()) * 100) / 100
}

export function tiltLimit(w: number, h: number, shift = 5, cap = 2): number {
  const L = Math.max(w, h, 1)
  const deg = (Math.asin(Math.min(1, (2 * shift) / L)) * 180) / Math.PI
  return Math.min(cap, Math.max(0.05, Math.round(deg * 20) / 20))
}

export function tiltVars(deg: number): Record<'--ll-tilt', string> {
  return { '--ll-tilt': `${deg}deg` }
}

export function tileOffsets(seed: string | number, sizes: readonly (readonly [number, number])[]): string {
  const r = makeRng(`tex:${seed}`)
  return sizes.map(([w, h]) => `${-Math.floor(r() * w)}px ${-Math.floor(r() * h)}px`).join(', ')
}
