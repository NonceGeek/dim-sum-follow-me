import type { EdgeSpec } from '@/lib/ink/paper/edges'
import { sheetShadow, type SheetShadowKind } from '@/lib/ink/paper/shadows'

export type StockName =
  | 'paper' | 'card' | 'slip' | 'index-card' | 'graph' | 'dot-grid' | 'check' | 'ledger' | 'pad' | 'kraft' | 'napkin'
  | 'sticky-yellow' | 'sticky-green' | 'sticky-orange' | 'sticky-pink' | 'sticky-blue' | 'photo' | 'parchment' | 'receipt'

export const STICKY_VEIL = 0.45

export type Tooth = 'cold' | 'fine' | 'kraft' | 'none'
export type RuleName = 'none' | 'ruled' | 'ruled-hand' | 'index' | 'graph' | 'dots' | 'ledger' | 'pad' | 'window'

export interface StockDef {
  name: StockName
  label: string
  color: string
  base: string
  tint?: readonly [token: string, share: number]
  stockClass: string
  tooth: Tooth
  toothClass: string
  shadow: SheetShadowKind
  shadowClass: string
  edge: EdgeSpec
  rules: RuleName
  tilt: number
  gum?: boolean
}

const TOOTH_CLASS: Record<Tooth, string> = {
  cold: 'll-tooth-cold',
  fine: 'll-tooth-fine',
  kraft: 'll-tooth-kraft',
  none: '',
}

function def(d: Omit<StockDef, 'toothClass' | 'color' | 'base'> & { base?: string }): StockDef {
  const base = d.base ?? d.name
  const baseVar = TOKEN_OF[base] ?? base
  const color = d.tint ? `color-mix(in srgb, var(--ll-${d.tint[0]}) ${Math.round(d.tint[1] * 100)}%, var(--ll-${baseVar}))` : `var(--ll-${baseVar})`
  return { ...d, base: baseVar, color, toothClass: TOOTH_CLASS[d.tooth] }
}

const TOKEN_OF: Record<string, string> = {
  card: 'paper', napkin: 'paper', 'index-card': 'card', 'dot-grid': 'graph', ledger: 'check', receipt: 'photo',
}

export const STOCKS: Record<StockName, StockDef> = {
  paper: def({ name: 'paper', label: 'Paper', stockClass: 'll-stock-paper', tooth: 'cold', shadow: 'paper', shadowClass: '', edge: 'cut', rules: 'none', tilt: 0.6 }),
  card: def({ name: 'card', label: 'Card', stockClass: 'll-stock-paper', tooth: 'cold', shadow: 'card', shadowClass: 'll-sheet-card', edge: 'cut', rules: 'none', tilt: 0.5 }),
  slip: def({ name: 'slip', label: 'Slip', stockClass: 'll-stock-slip', tooth: 'fine', shadow: 'slip', shadowClass: 'll-sheet-slip', edge: 'cut', rules: 'none', tilt: 0.7 }),
  'index-card': def({ name: 'index-card', label: 'Index card', stockClass: 'll-stock-index-card', tooth: 'fine', shadow: 'card', shadowClass: 'll-sheet-card', edge: 'cut', rules: 'index', tilt: 0.5 }),
  graph: def({ name: 'graph', label: 'Graph', stockClass: 'll-stock-graph', tooth: 'fine', shadow: 'paper', shadowClass: '', edge: 'cut', rules: 'graph', tilt: 0.5 }),
  'dot-grid': def({ name: 'dot-grid', label: 'Dot grid', stockClass: 'll-stock-graph', tooth: 'fine', shadow: 'paper', shadowClass: '', edge: 'cut', rules: 'dots', tilt: 0.5 }),
  check: def({ name: 'check', label: 'Guest check', stockClass: 'll-stock-check', tooth: 'fine', shadow: 'check', shadowClass: 'll-sheet-check', edge: { top: 'perf' }, rules: 'ledger', tilt: 0.8 }),
  ledger: def({ name: 'ledger', label: 'Ledger', stockClass: 'll-stock-check', tooth: 'fine', shadow: 'check', shadowClass: 'll-sheet-check', edge: 'cut', rules: 'ledger', tilt: 0.5 }),
  pad: def({ name: 'pad', label: 'Order pad', stockClass: 'll-stock-pad', tooth: 'fine', shadow: 'pad', shadowClass: 'll-sheet-pad', edge: { top: 'torn' }, rules: 'pad', tilt: 0.45 }),
  kraft: def({ name: 'kraft', label: 'Kraft', stockClass: 'll-stock-kraft', tooth: 'kraft', shadow: 'slip', shadowClass: 'll-sheet-slip', edge: 'cut', rules: 'none', tilt: 1 }),
  napkin: def({ name: 'napkin', label: 'Napkin', stockClass: 'll-stock-paper', tooth: 'cold', shadow: 'paper', shadowClass: '', edge: 'crimp', rules: 'none', tilt: 1.2 }),
  'sticky-yellow': def({ name: 'sticky-yellow', label: 'Sticky yellow', stockClass: 'll-stock-sticky-yellow', tooth: 'fine', shadow: 'sticky', shadowClass: 'll-sheet-sticky', edge: 'cut', rules: 'none', tilt: 1.6, gum: true }),
  'sticky-green': def({ name: 'sticky-green', label: 'Sticky green', stockClass: 'll-stock-sticky-green', tooth: 'fine', shadow: 'sticky', shadowClass: 'll-sheet-sticky', edge: 'cut', rules: 'none', tilt: 1.6, gum: true }),
  'sticky-orange': def({ name: 'sticky-orange', label: 'Sticky orange', stockClass: 'll-stock-sticky-orange', tooth: 'fine', shadow: 'sticky', shadowClass: 'll-sheet-sticky', edge: 'cut', rules: 'none', tilt: 1.6, gum: true }),
  'sticky-pink': def({ name: 'sticky-pink', label: 'Sticky pink', stockClass: 'll-stock-sticky-pink', tooth: 'fine', shadow: 'sticky', shadowClass: 'll-sheet-sticky', edge: 'cut', rules: 'none', tilt: 1.6, gum: true }),
  'sticky-blue': def({ name: 'sticky-blue', label: 'Sticky blue', stockClass: 'll-stock-sticky-blue', tooth: 'fine', shadow: 'sticky', shadowClass: 'll-sheet-sticky', edge: 'cut', rules: 'none', tilt: 1.6, gum: true }),
  photo: def({ name: 'photo', label: 'Photo', stockClass: 'll-stock-photo', tooth: 'fine', shadow: 'card', shadowClass: 'll-sheet-card', edge: 'cut', rules: 'window', tilt: 1.5 }),
  parchment: def({ name: 'parchment', label: 'Parchment', base: 'paper', tint: ['kraft', 0.34], stockClass: '', tooth: 'cold', shadow: 'paper', shadowClass: '', edge: 'deckle', rules: 'none', tilt: 0.6 }),
  receipt: def({ name: 'receipt', label: 'Receipt', stockClass: 'll-stock-photo', tooth: 'none', shadow: 'slip', shadowClass: 'll-sheet-slip', edge: { top: 'zig', bottom: 'zig' }, rules: 'none', tilt: 0.9 }),
}

export const STOCK_NAMES = Object.keys(STOCKS) as StockName[]

export function stockOf(name: string | undefined): StockDef {
  return (name && (STOCKS as Record<string, StockDef>)[name]) || STOCKS.paper
}

export const TOOTH_TILES: Record<Tooth, readonly (readonly [tile: string, w: number, h: number])[]> = {
  cold: [['fibre', 240, 240], ['relief', 192, 192], ['cloud', 720, 720]],
  fine: [['fibre', 240, 240], ['slip', 128, 128], ['cloud', 720, 720]],
  kraft: [['fibre', 240, 240], ['kraft', 192, 96], ['cloud', 720, 720]],
  none: [['cloud', 720, 720]],
}

export type CssDecls = Record<string, string>

interface BgLayer {
  image: string
  size: string
  position?: string
  repeat?: string
  origin?: string
  clip?: string
}

function layersToDecls(layers: BgLayer[]): CssDecls {
  const join = (f: (l: BgLayer) => string) => layers.map(f).join(', ')
  return {
    backgroundImage: join((l) => l.image),
    backgroundSize: join((l) => l.size),
    backgroundPosition: join((l) => l.position ?? '0 0'),
    backgroundRepeat: join((l) => l.repeat ?? 'repeat'),
    backgroundOrigin: join((l) => l.origin ?? 'border-box'),
    backgroundClip: join((l) => l.clip ?? 'border-box'),
  }
}

const up = (y: number, geo: RuleGeometry): string => (geo.offset ? `calc(${y}px - var(${RULE_OFFSET_VAR}, ${geo.offset}px))` : `${y}px`)
const upClamped = (y: number, geo: RuleGeometry): string => (geo.offset ? `max(0px, ${up(y, geo)})` : `${y}px`)

const soft = (token: string, pct: number) => `color-mix(in srgb, var(--ll-${token}) ${pct}%, transparent)`

const hline = (color: string, w = 0.9) => `linear-gradient(to bottom, transparent calc(100% - ${w}px), ${color} calc(100% - ${w}px))`
const vline = (color: string, x: number, w = 1.2, fromRight = false) => {
  const at = (v: number) => (fromRight ? `calc(100% - ${x - v}px)` : `${x + v}px`)
  return `linear-gradient(to right, transparent ${at(-w / 2)}, ${color} ${at(-w / 2)} ${at(w / 2)}, transparent ${at(w / 2)})`
}

export interface RulesOpts {
  calm?: boolean
  first?: number
}

export const RULE_OFFSET_VAR = '--ll-rule-offset'

export const KALAM_BASELINE = 0.266

export const ruleOffsetFor = (pitch: number, fs = 17): number => Math.round(pitch / 2 - KALAM_BASELINE * fs - 1.95)

export interface RulesLayer {
  style: CssDecls
  pitch: number
  geo: RuleGeometry
}

export interface RuleGeometry {
  kind: RuleName
  pitch: number
  first: number
  offset: number
  margin?: number
  major?: number
  cols?: readonly [number, number]
}

export function ruleGeometry(kind: RuleName, o: RulesOpts = {}): RuleGeometry {
  const calm = !!o.calm
  switch (kind) {
    case 'ruled':
    case 'ruled-hand': {
      const pitch = calm ? 24 : 28
      return { kind, pitch, first: o.first ?? 16 + pitch, offset: ruleOffsetFor(pitch), margin: calm ? undefined : 44 }
    }
    case 'pad':
      return { kind, pitch: 30, first: o.first ?? 40, offset: ruleOffsetFor(30) }
    case 'index':
      return { kind, pitch: 30, first: o.first ?? 49, offset: ruleOffsetFor(30) }
    case 'graph':
      return { kind, pitch: 16, first: 0, offset: 0, major: 64 }
    case 'dots':
      return { kind, pitch: 20, first: 10, offset: 0, major: 100 }
    case 'ledger': {
      const pitch = calm ? 22 : 24
      return { kind, pitch, first: 40, offset: ruleOffsetFor(pitch, 15), cols: [54, 70] }
    }
    case 'window':
      return { kind, pitch: 0, first: 0, offset: 0 }
    default:
      return { kind: 'none', pitch: 0, first: 0, offset: 0 }
  }
}

export function rulesLayer(kind: RuleName, o: RulesOpts = {}): RulesLayer | null {
  if (kind === 'none' || kind === 'ruled-hand') return null
  const calm = !!o.calm
  const geo = ruleGeometry(kind, o)
  const drift = 'linear-gradient(90deg, rgb(0 0 0 / .86), rgb(0 0 0) 19%, rgb(0 0 0 / .8) 47%, rgb(0 0 0 / .96) 71%, rgb(0 0 0 / .84))'
  const withMask = (style: CssDecls): CssDecls => (calm ? style : { ...style, maskImage: drift, WebkitMaskImage: drift })
  if (kind === 'window') {
    return {
      pitch: 0,
      geo,
      style: {
        inset: '10px 10px 26%',
        backgroundColor: soft('paper-shade', 55),
        boxShadow: 'inset 0 2px 4px rgb(var(--ll-shade) / calc(0.26 * var(--ll-shadow-k))), inset 0 0 0 1px rgb(var(--ll-shade) / calc(0.1 * var(--ll-shadow-k)))',
      },
    }
  }
  if (kind === 'ruled' || kind === 'pad' || kind === 'index') {
    const { pitch, first } = geo
    const rule = soft(kind === 'pad' ? 'pad-rule' : 'rule-blue', kind === 'pad' ? 100 : 82)
    const red = soft('rule-red', 88)
    const layers: BgLayer[] = []
    if (geo.margin !== undefined) layers.push({ image: vline(red, geo.margin), size: '100% 100%', repeat: 'no-repeat' })
    if (kind === 'index') layers.push({ image: hline(red, 1.2), size: `100% ${up(first + 1, geo)}`, repeat: 'no-repeat' })
    const blueFirst = kind === 'index' ? first + pitch : first
    layers.push({ image: hline(rule), size: `100% ${pitch}px`, position: `0 ${up(blueFirst - pitch + 1, geo)}`, repeat: 'repeat-y', clip: 'content-box' })
    return { pitch, geo, style: withMask({ ...layersToDecls(layers), paddingTop: upClamped(Math.max(0, kind === 'index' ? first + 2 : blueFirst - 1), geo) }) }
  }
  if (kind === 'graph') {
    const fine = soft('check-rule', 46)
    const bold = soft('check-rule', 72)
    return {
      pitch: 16,
      geo,
      style: withMask({
        ...layersToDecls([
          { image: `linear-gradient(to right, ${bold} 1px, transparent 1px)`, size: '64px 64px', position: '0 0' },
          { image: `linear-gradient(to bottom, ${bold} 1px, transparent 1px)`, size: '64px 64px', position: '0 0' },
          { image: `linear-gradient(to right, ${fine} 1px, transparent 1px)`, size: '16px 16px', position: '0 0' },
          { image: `linear-gradient(to bottom, ${fine} 1px, transparent 1px)`, size: '16px 16px', position: '0 0' },
        ]),
      }),
    }
  }
  if (kind === 'dots') {
    const dot = `radial-gradient(circle at center, ${soft('pencil-mark', 90)} 0 .8px, transparent 1.15px)`
    const big = `radial-gradient(circle at center, ${soft('pencil', 70)} 0 1.05px, transparent 1.5px)`
    return {
      pitch: 20,
      geo,
      style: layersToDecls([
        { image: big, size: '100px 100px', position: '10px 10px' },
        { image: dot, size: '20px 20px', position: '10px 10px' },
      ]),
    }
  }
  const pitch = geo.pitch
  const line = soft('check-rule', 62)
  const strong = soft('check-rule', 100)
  const [qty, total] = geo.cols as readonly [number, number]
  return {
    pitch,
    geo,
    style: withMask({
      ...layersToDecls([
        { image: vline(strong, qty, 1), size: '100% 100%', repeat: 'no-repeat' },
        { image: vline(strong, total, 1, true), size: '100% 100%', repeat: 'no-repeat' },
        { image: hline(strong, 1.1), size: `100% ${up(40, geo)}`, position: '0 0', repeat: 'no-repeat' },
        { image: hline(line), size: `100% ${pitch}px`, position: `0 ${up(40 - pitch + 1, geo)}`, repeat: 'repeat-y', clip: 'content-box' },
      ]),
      paddingTop: upClamped(40, geo),
    }),
  }
}

export const stockShadow = (name: string | undefined, lift = 1): string => sheetShadow(stockOf(name).shadow, lift)
