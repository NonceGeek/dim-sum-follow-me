import { Ink } from '@/lib/ink/builder'
import { pen } from '@/lib/ink/pens'
import { RULER } from '@/lib/ink/shapes'
import type { PenName, PenSpec } from '@/lib/ink/types'

export const TABLE_TILE_W = 960
export const TABLE_RULE_H = 8
export const TABLE_HEAD_H = 12

export interface TableTiles {
  rule: string
  head: string
  capStart: string
  capEnd: string
}

interface Pull {
  y: number
  pen: PenName | PenSpec
  width?: number
  alpha?: number
}

function tileSvg(seed: string, W: number, H: number, pulls: readonly Pull[]): string {
  const ink = new Ink(seed, { tier: 'lo', grain: false })
  ink.layer('rest', () => {
    for (const p of pulls) ink.stroke([[-24, p.y], [W + 24, p.y]], p.pen, { ...RULER, width: p.width, alpha: p.alpha })
  })
  const res = ink.toSvg({ w: W, h: H, pad: 0 })
  const body = res.svg.replace(/(fill|stroke)="var\(--ll-[a-z-]+\)"/g, '$1="black"')
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}'>${body.replace(/"/g, "'")}</svg>`
}

export function svgUrl(svg: string): string {
  const enc = svg.replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/\s+/g, ' ')
  return `url("data:image/svg+xml,${enc}")`
}

let cache: TableTiles | undefined

export function tableTiles(): TableTiles {
  if (cache) return cache
  const W = TABLE_TILE_W
  const rule = tileSvg('table-rule', W, TABLE_RULE_H, [{ y: 4, pen: pen('pencil', { W: 1.3 }) }])
  const head = tileSvg('table-head', W, TABLE_HEAD_H, [
    { y: 3.3, pen: pen('ink', { W: 2.3, halo: 0 }) },
    { y: 8.5, pen: 'ink.fine' },
  ])
  cache = { rule: svgUrl(rule), head: svgUrl(head), capStart: svgUrl(capSvg(false)), capEnd: svgUrl(capSvg(true)) }
  return cache
}

export const TABLE_CAP_W = 18

function capSvg(end: boolean): string {
  const start = 'M18 0 L6 0 Q1 0 1 6 L1 34 Q1 40 6 40 L18 40 Z'
  const stop = 'M0 0 L12 0 Q17 0 17 6 L17 34 Q17 40 12 40 L0 40 Z'
  return `<svg xmlns='http://www.w3.org/2000/svg' width='18' height='40' viewBox='0 0 18 40' preserveAspectRatio='none'><path fill='black' d='${end ? stop : start}'/></svg>`
}
