import type { Ink } from '@/lib/ink/builder'
import { Ink as InkBuilder } from '@/lib/ink/builder'
import type { InkResult } from '@/lib/ink/builder'
import { n } from '@/lib/ink/paint'
import { defineRecipe } from '@/lib/ink/recipes'
import { curlMarkup } from '@/lib/ink/paper/props'
import { ruleGeometry, STICKY_VEIL, stockOf, type StockName } from '@/lib/ink/paper/stocks'
import { edgeInset, outlinePath, sheetOutline, sideInsets, type EdgeSpec, type Outline } from '@/lib/ink/paper/edges'
import { faceMark, renderFaces, type FaceSvgOptions } from '@/lib/ink/paper/faces'
import { contactShadow, farShadow, type SheetShadowKind } from '@/lib/ink/paper/shadows'
import type { Pt, Tier } from '@/lib/ink/types'
import { RULER } from '@/lib/ink/shapes'

export interface SheetParams {
  stock: StockName
  edge: EdgeSpec
  chamfer?: number
  shadow?: SheetShadowKind | 'none'
}

export { STICKY_VEIL }

const tok = (name: string) => `var(--ll-${name})`
const num = (v: number) => n(v, 10)

export function sheetPad(edge: EdgeSpec): number {
  return Math.ceil(edgeInset(edge) * 0.4) + 3
}

function railPath(pts: readonly Pt[], from: number, to: number, gap = 2.4): string {
  let d = ''
  let lx = -1e9, ly = -1e9
  for (let i = from; i < to; i++) {
    const p = pts[i]
    if (Math.hypot(p[0] - lx, p[1] - ly) < gap && i !== to - 1) continue
    d += `${d ? 'L' : 'M'}${num(p[0])} ${num(p[1])}`
    lx = p[0]
    ly = p[1]
  }
  return d
}

export function drawSheet(ink: Ink, w: number, h: number, p: SheetParams): Outline {
  const S = stockOf(p.stock)
  const r = ink.next('sheet')
  const outline = sheetOutline(r, w, h, p.edge, { amp: ink.knobs.wobble, chamfer: p.chamfer })
  const body = outlinePath(outline, 'body', ink.tier)
  const gid = `ll-sh${ink.seed.toString(36)}`
  const shadow = p.shadow ?? S.shadow
  const contact = shadow === 'none' ? null : contactShadow(shadow)
  const casts = shadow !== 'none' && farShadow(shadow) !== 'none'
  ink.layer('rest', () => {
    let s = ''
    if (outline.fibrous && outline.reach > 0.25) s += `<path d="${outlinePath(outline, 'rim', ink.tier)}" fill="${tok(S.base)}" fill-opacity=".42"/>`
    if (contact) s += `<use href="#${gid}" transform="translate(0 ${num(contact.dy)})" fill="var(--ll-umber)" fill-opacity="${contact.a}" opacity="var(--ll-shadow-k)"/>`
    s += faceMark({ d: body, stock: p.stock, seed: ink.seed, ...(casts ? { cast: { kind: shadow as SheetShadowKind, inset: sideInsets(outline, w, h, p.chamfer) } } : {}) })
    s += `<defs><path id="${gid}" d="${body}"/></defs>`
    s += `<use href="#${gid}" fill="none" stroke="${tok('ink')}" stroke-opacity="${outline.fibrous ? 0.16 : 0.13}" stroke-width=".6"/>`
    if (outline.fibrous) {
      const rim = `fill="none" stroke="${tok('photo')}" stroke-opacity=".78" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -.6)"`
      const torn = outline.sides.filter((q) => q.kind === 'torn' || q.kind === 'deckle')
      if (torn.length === 4 || !outline.sides.length) s += `<use href="#${gid}" ${rim}/>`
      else s += `<path d="${torn.map((q) => railPath(outline.pts, q.from, q.to)).join('')}" ${rim}/>`
    }
    if (S.gum) {
      const gh = Math.min(22, h * 0.2)
      s += `<linearGradient id="${gid}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tok('orange-text')}" stop-opacity=".1"/><stop offset="1" stop-color="${tok('orange-text')}" stop-opacity="0"/></linearGradient><rect x=".6" y=".6" width="${num(w - 1.2)}" height="${num(gh)}" fill="url(#${gid}g)"/>`
    }
    if (p.stock === 'napkin') s += napkinEmboss(w, h)
    if (p.chamfer) {
      const c = p.chamfer
      s += `<g transform="translate(${num(w - c)} ${num(h - c)})">${curlMarkup(ink.next('curl'), `${gid}f`, c, S.base)}</g>`
    }
    ink.raw(s, 'under')
    ink.grow([-2, -2, w + 2, h + 2])
  })
  return outline
}

function napkinEmboss(w: number, h: number): string {
  const inset = Math.max(8, Math.min(26, Math.min(w, h) * 0.058))
  const rr = Math.max(4, inset * 0.5)
  const rect = (o: number) => `M${num(inset + rr - o)} ${num(inset - o)}H${num(w - inset - rr - o)}a${num(rr)} ${num(rr)} 0 0 1 ${num(rr)} ${num(rr)}V${num(h - inset - rr - o)}a${num(rr)} ${num(rr)} 0 0 1 ${num(-rr)} ${num(rr)}H${num(inset + rr - o)}a${num(rr)} ${num(rr)} 0 0 1 ${num(-rr)} ${num(-rr)}V${num(inset + rr - o)}a${num(rr)} ${num(rr)} 0 0 1 ${num(rr)} ${num(-rr)}z`
  const groove = (dx: number, dy: number, c: string, op: number, sw: number, extra = '') =>
    `<path d="${rect(0)}" transform="translate(${dx} ${dy})" fill="none" stroke="${c}" stroke-opacity="${op}" stroke-width="${sw}" stroke-linecap="round" ${extra}/>`
  return (
    groove(0.8, 0.8, tok('ink'), 0.11, 2, 'stroke-dasharray="0 5.6"') +
    groove(-0.7, -0.7, tok('photo'), 0.95, 2, 'stroke-dasharray="0 5.6"') +
    groove(0.6, 0.6, tok('ink'), 0.08, 0.9) +
    groove(-0.5, -0.5, tok('photo'), 0.8, 0.9)
  )
}

export const sheetRecipe = defineRecipe<SheetParams>({
  id: 'paper-sheet',
  kind: 'sheet',
  layers: ['rest'],
  pad: (_box, p) => sheetPad(p.edge),
  draw(ink, box, params) {
    drawSheet(ink, box.w, box.h, params)
  },
})

export function paperSheet(seed: string | number, w: number, h: number, p: SheetParams, o: { tier?: Tier; calm?: boolean; faces?: FaceSvgOptions } = {}): InkResult {
  const ink = new InkBuilder(seed, { tier: o.tier, calm: o.calm })
  drawSheet(ink, w, h, p)
  const res = ink.toSvg({ w, h, pad: sheetPad(p.edge) })
  const parts = Object.fromEntries(Object.entries(res.parts).map(([k, v]) => [k, renderFaces(v as string, o.faces)])) as typeof res.parts
  return { ...res, svg: renderFaces(res.svg, o.faces), parts }
}

export interface HandRulesParams {
  paper?: 'ruled' | 'pad'
}

export const handRulesRecipe = defineRecipe<HandRulesParams>({
  id: 'paper-rules-hand',
  kind: 'rules',
  layers: ['rest'],
  pad: 2,
  draw(ink, { w, h }, { paper }, ctx) {
    const g = ruleGeometry('ruled', { calm: ctx.calm })
    const color = paper === 'pad' ? 'ink-you' : 'rule-blue'
    ink.layer('rest', () => {
      for (let y = g.first - g.offset; y < h - 4; y += g.pitch) {
        ink.stroke([[-1, y], [w + 1, y]], 'pencil.fine', { ...RULER, simple: true, color, alpha: paper === 'pad' ? 0.42 : 0.85, width: 0.9 })
      }
      if (g.margin !== undefined) ink.stroke([[g.margin, -1], [g.margin, h + 1]], 'pencil.fine', { ...RULER, simple: true, color: 'rule-red', alpha: 0.9, width: 1.1 })
    })
  },
})
