import { n } from '@/lib/ink/paint'
import { highlight } from '@/lib/ink/fills'
import { underline } from '@/lib/ink/shapes'
import { defineRecipe } from '@/lib/ink/recipes'
import { faceMark } from '@/lib/ink/paper/faces'
import { contactShadow, farShadow, type SheetShadowKind } from '@/lib/ink/paper/shadows'
import { stockOf, type StockName } from '@/lib/ink/paper/stocks'
import type { Rng } from '@/lib/ink/rng'
import type { Pt } from '@/lib/ink/types'

export const tok = (name: string) => `var(--ll-${name})`
export const num = (v: number) => n(v, 10)

export interface PathAttrs {
  fill?: string
  stroke?: string
  sw?: number
  op?: number
  transform?: string
  cap?: 'round' | 'butt'
  extra?: string
}

export function pathTag(d: string, a: PathAttrs): string {
  let s = `<path d="${d}"`
  s += a.fill ? ` fill="${a.fill}"` : ' fill="none"'
  if (a.stroke) s += ` stroke="${a.stroke}" stroke-width="${n(a.sw ?? 1)}" stroke-linecap="${a.cap ?? 'round'}" stroke-linejoin="round"`
  if (a.op !== undefined && a.op < 0.995) s += ` ${a.stroke && !a.fill ? 'stroke' : 'fill'}-opacity="${n(a.op, 100)}"`
  if (a.transform) s += ` transform="${a.transform}"`
  if (a.extra) s += ` ${a.extra}`
  return s + '/>'
}

export const polyD = (pts: readonly Pt[], close = false) => 'M' + pts.map((p) => `${num(p[0])} ${num(p[1])}`).join('L') + (close ? 'Z' : '')

export const circleD = (cx: number, cy: number, r: number) =>
  `M${num(cx - r)} ${num(cy)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0z`

export const ellipseD = (cx: number, cy: number, rx: number, ry: number) =>
  `M${num(cx - rx)} ${num(cy)}a${num(rx)} ${num(ry)} 0 1 0 ${num(2 * rx)} 0a${num(rx)} ${num(ry)} 0 1 0 ${num(-2 * rx)} 0z`

export const mirrorX = (w: number, inner: string) => `<g transform="translate(${num(w)} 0) scale(-1 1)">${inner}</g>`

export const MIRROR = (w: number) => `translate(${num(w)} 0) scale(-1 1)`

export function holePunch(id: string, cx: number, cy: number, r: number, tilt = 0): string {
  const rx = r * 1.03
  const ry = r * 0.97
  const rot = `rotate(${n(tilt)} ${num(cx)} ${num(cy)})`
  const hole = ellipseD(cx, cy, rx, ry)
  let s = `<clipPath id="${id}"><path d="${hole}" transform="${rot}"/></clipPath>`
  s += pathTag(hole, { fill: tok('desk-deep'), transform: rot })
  s += `<g clip-path="url(#${id})">${pathTag(circleD(cx, cy, r * 1.4), { fill: tok('ink'), op: 0.4 })}${pathTag(circleD(cx + r * 0.34, cy + r * 0.4, r * 0.98), { fill: tok('desk-deep') })}</g>`
  const a0 = -0.15 * Math.PI
  const a1 = 0.62 * Math.PI
  const p = (a: number): [number, number] => [cx + Math.cos(a) * (r - 0.4), cy + Math.sin(a) * (r - 0.4)]
  const [x0, y0] = p(a0)
  const [x1, y1] = p(a1)
  s += pathTag(`M${num(x0)} ${num(y0)}A${num(r - 0.4)} ${num(r - 0.4)} 0 0 1 ${num(x1)} ${num(y1)}`, { stroke: tok('photo'), sw: 1.1, op: 0.85 })
  s += pathTag(hole, { stroke: tok('ink'), sw: 0.7, op: 0.3, transform: rot })
  return s
}

export function reinforcement(cx: number, cy: number, r: number): string {
  const R = r + 5.4
  const ring = `${circleD(cx, cy, R)}${circleD(cx, cy, r - 0.3)}`
  let s = pathTag(ring, { fill: tok('ink'), op: 0.16, transform: 'translate(.7 1.2)', extra: 'fill-rule="evenodd"' })
  s += pathTag(ring, { fill: tok('photo'), extra: 'fill-rule="evenodd"' })
  s += pathTag(circleD(cx, cy, R - 0.4), { stroke: tok('ink'), sw: 0.7, op: 0.24 })
  s += pathTag(circleD(cx, cy, (R + r) / 2), { stroke: tok('paper-shade'), sw: 0.6, op: 0.7 })
  return s
}

export interface PaperFillOpts {
  stock: StockName
  id?: string
  edge?: number
  evenodd?: boolean
  shadow?: boolean | SheetShadowKind
  far?: boolean
  inset?: readonly [number, number, number, number]
}

export function paperFill(seed: number, d: string, o: PaperFillOpts): string {
  const S = stockOf(o.stock)
  const gid = `ll-pf${seed.toString(36)}${o.id ?? ''}`
  const kind = o.shadow === undefined || o.shadow === false ? 'none' : o.shadow === true ? S.shadow : o.shadow
  const contact = kind === 'none' ? null : contactShadow(kind)
  const cast = kind !== 'none' && o.far !== false && farShadow(kind) !== 'none'
  let s = `<defs><path id="${gid}" d="${d}"${o.evenodd ? ' fill-rule="evenodd"' : ''}/></defs>`
  if (contact) s += `<use href="#${gid}" transform="translate(0 ${num(contact.dy)})" fill="${tok('umber')}" fill-opacity="${contact.a}" opacity="var(--ll-shadow-k)"/>`
  s += faceMark({ d, stock: o.stock, seed, veil: false, ...(o.evenodd ? { evenodd: true } : {}), ...(cast ? { cast: { kind: kind as SheetShadowKind, inset: o.inset ?? [1, 1, 1, 1] } } : {}) })
  s += `<use href="#${gid}" fill="none" stroke="${tok('ink')}" stroke-opacity="${o.edge ?? 0.14}" stroke-width=".6"/>`
  return s
}

export function litEdge(d: string, op = 0.7): string {
  return pathTag(d, { stroke: tok('photo'), sw: 1, op, transform: 'translate(0 -.6)' })
}

export type TitleMark = 'single' | 'double' | 'wavy' | 'highlight'

export interface TitleMarkParams {
  kind: TitleMark
  tone?: 'ink' | 'you' | 'red' | 'marker'
}

const MARK_PEN = { ink: 'ink', you: 'blue', red: 'redfelt', marker: 'terracotta' } as const

export const titleMarkRecipe = defineRecipe<TitleMarkParams>({
  id: 'paper-set-title-mark',
  kind: 'mark',
  layers: ['rest'],
  pad: 10,
  draw(ink, { w, h }, { kind, tone = 'ink' }, ctx) {
    ink.layer('rest', () => {
      if (kind === 'highlight') {
        highlight(ink, -3, h * 0.46, w + 6, h * 0.42, { pen: 'hi' })
        return
      }
      const y = h - 4
      if (ctx.calm) {
        underline(ink, 0, y, w, { kind: 'single', pen: 'pencil.fine' })
        return
      }
      underline(ink, -2, y, w + 4, { kind, pen: MARK_PEN[tone] })
    })
  },
})

export function stackSvg(w: number, h: number, count: number, r: Rng, id: string, fills: readonly [string, string] = ['paper', 'paper-shade']): string {
  if (count < 1) return ''
  const step = 2.6
  let s = `<clipPath id="${id}c"><path d="M-60 -60H${num(w + 120)}V${num(h + 120)}H-60zM0 0V${num(h)}H${num(w)}V0z" clip-rule="evenodd"/></clipPath>`
  let sheets = ''
  for (let i = count; i >= 1; i--) {
    const d = i * step
    const rot = r.gauss(0, 0.18) * i
    const x0 = 3 + i * 1.4
    const y0 = 3 + i * 1.4
    const path = `M${num(x0)} ${num(y0)}H${num(w + d)}V${num(h + d)}H${num(x0)}z`
    sheets += `<g transform="rotate(${num(rot)} ${num(x0)} ${num(y0)})">`
    if (i === count) {
      sheets += pathTag(path, { fill: tok('ink'), op: 0.1, transform: 'translate(1.4 4)' }) + pathTag(path, { fill: tok('ink'), op: 0.14, transform: 'translate(.6 1.6)' })
    }
    sheets += pathTag(path, { fill: i % 2 ? tok(fills[1]) : tok(fills[0]) })
    sheets += pathTag(path, { stroke: tok('ink'), sw: 0.6, op: 0.22 })
    sheets += pathTag(`M${num(x0 + 2)} ${num(h + d - 0.6)}H${num(w + d - 1)}M${num(w + d - 0.6)} ${num(y0 + 2)}V${num(h + d - 1)}`, { stroke: tok('photo'), sw: 0.8, op: 0.7 })
    sheets += '</g>'
  }
  s += `<g clip-path="url(#${id}c)">${sheets}</g>`
  return s
}

