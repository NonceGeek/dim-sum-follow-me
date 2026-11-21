import { hashSeed } from '@/lib/ink/rng'
import { measureText } from '@/lib/ink/art/glyph-text'
import type { ArtColour, ArtDef, BadgeGen, Part } from '@/lib/ink/art/types'

export type BadgeOpts = Partial<Omit<BadgeGen, 'gen' | 'text' | 'kind'>> & { fill?: ArtColour }

const r1 = (v: number): number => Math.round(v * 10) / 10
const rad = (d: number): number => (d * Math.PI) / 180

function lcg(seed: number): () => number {
  let s = (seed % 2147483646) + 1
  return () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5) * 2
}

function seal(cx: number, cy: number, r0: number, r1_: number, n: number, rot: number, jit: number, rnd: () => number): string {
  const V: Array<[number, number]> = []
  const C: Array<[number, number]> = []
  for (let i = 0; i < n; i++) {
    const a0 = rad(rot + (i / n) * 360), a1 = rad(rot + ((i + 1) / n) * 360), am = (a0 + a1) / 2
    V.push([cx + Math.cos(a0) * (r0 + rnd() * jit), cy + Math.sin(a0) * (r0 + rnd() * jit)])
    C.push([cx + Math.cos(am) * (r1_ + rnd() * jit), cy + Math.sin(am) * (r1_ + rnd() * jit)])
  }
  let d = `M${r1(V[0][0])} ${r1(V[0][1])}`
  for (let i = 0; i < n; i++) d += ` Q${r1(C[i][0])} ${r1(C[i][1])} ${r1(V[(i + 1) % n][0])} ${r1(V[(i + 1) % n][1])}`
  return d + ' Z'
}

function burst(cx: number, cy: number, ro: number, ri: number, n: number, rot: number, jit: number, rnd: () => number): string {
  let d = ''
  for (let i = 0; i < n * 2; i++) {
    const a = rad(rot + (i / (n * 2)) * 360 + rnd() * 1.5)
    const rr = (i % 2 ? ri : ro) + rnd() * jit
    d += `${i ? ' L' : 'M'}${r1(cx + Math.cos(a) * rr)} ${r1(cy + Math.sin(a) * rr)}`
  }
  return d + ' Z'
}

const j = (v: number, rnd: () => number, a = 0.35): number => r1(v + rnd() * a)

interface Shape {
  outline: string
  under?: Part[]
  ring?: string
  text: { x: number; y: number; w: number; em: number }
  sub?: { y: number; w: number }
  over?: Part[]
  deco: { x: number; y: number }
}

function shapeOf(kind: NonNullable<BadgeGen['shape']>, o: BadgeOpts, rnd: () => number): Shape {
  const bumps = o.bumps ?? 12
  const amp = o.amp ?? 3.6
  switch (kind) {
    case 'scallop': {
      const R = 24.4
      return {
        outline: seal(32, 32, R, R + amp, bumps, 6, 0.3, rnd),
        ring: `O 32 32 ${j(19.6, rnd, 0.2)}`,
        text: { x: 32, y: 34, w: 30, em: 21 },
        sub: { y: 45.4, w: 22 },
        deco: { x: 32, y: 21.2 },
      }
    }
    case 'starburst': {
      const n = o.bumps ?? 16
      return {
        outline: burst(32, 32, 26, 21.4, n, -90, 0.4, rnd),
        ring: `O 32 32 ${j(17.6, rnd, 0.2)}`,
        text: { x: 32, y: 33, w: 27, em: 20 },
        sub: { y: 43.5, w: 22 },
        deco: { x: 32, y: 19.6 },
      }
    }
    case 'rosette':
      return {
        outline: seal(32, 26.5, 17.6, 20, o.bumps ?? 16, 4, 0.2, rnd),
        under: [['f', 'tomato', `M21 40.4 L15.4 57.2 L22.4 53.4 L26.6 57.8 L30 43.4 Z`], ['f', 'tomato', `M43 40.4 L48.6 57.2 L41.6 53.4 L37.4 57.8 L34 43.4 Z`], ['s', 'M21 40.4 L15.4 57.2 L22.4 53.4 L26.6 57.8 L30 43.4', 0.9], ['s', 'M43 40.4 L48.6 57.2 L41.6 53.4 L37.4 57.8 L34 43.4', 0.9]],
        ring: `O 32 26.5 ${j(13.6, rnd, 0.2)}`,
        text: { x: 32, y: 28.4, w: 22, em: 16 },
        sub: { y: 38.4, w: 15 },
        deco: { x: 32, y: 17 },
      }
    case 'plate':
      return {
        outline: `M18 ${j(21, rnd)} L46 ${j(20.6, rnd)} Q${j(57.6, rnd)} 21 ${j(57.6, rnd)} 32 Q${j(57.4, rnd)} 43.4 46 43 L18 ${j(43.4, rnd)} Q6.4 43.4 ${j(6.6, rnd)} 32 Q6.4 20.6 18 ${j(21, rnd)} Z`,
        ring: `M15 ${j(24.4, rnd)} L49 ${j(24, rnd)} Q${j(55.6, rnd)} 24 ${j(55.6, rnd)} 32 Q${j(55.4, rnd)} 40 49 ${j(39.8, rnd)} L15 ${j(40, rnd)} Q8.4 40 8.6 32 Q8.4 24.2 15 ${j(24.4, rnd)} Z`,
        text: { x: 32, y: 32.6, w: 38, em: 15 },
        deco: { x: 32, y: 26 },
      }
    case 'shield':
      return {
        outline: `M32 ${j(6.4, rnd)} L${j(54.6, rnd)} 13.6 L${j(54.4, rnd)} 34 C${j(54, rnd)} 45.6 44.4 52.6 32 ${j(57.4, rnd)} C${j(19.6, rnd)} 52.8 ${j(9.8, rnd)} 45.6 ${j(9.8, rnd)} 34 L${j(9.6, rnd)} 13.4 Z`,
        ring: `M32 ${j(11, rnd)} L${j(48.8, rnd)} 17 L${j(48.6, rnd)} 33.6 C48.4 42 41 47.4 32 ${j(51.8, rnd)} C${j(23, rnd)} 47.4 ${j(15.4, rnd)} 42 15.4 33.6 L${j(15.2, rnd)} 17 Z`,
        text: { x: 32, y: 32.4, w: 26, em: 19 },
        sub: { y: 43, w: 19 },
        deco: { x: 32, y: 21 },
      }
    case 'ticket':
      return {
        outline: `M7 ${j(16, rnd)} L57 ${j(15.6, rnd)} L57 28.4 Q52.4 32 57 35.6 L57 ${j(48, rnd)} L7 ${j(48.4, rnd)} L7 35.6 Q11.6 32 7 28.4 Z`,
        ring: `M12.4 ${j(20.6, rnd)} L51.6 ${j(20.4, rnd)} L51.6 ${j(43.6, rnd)} L12.4 ${j(43.8, rnd)} Z`,
        text: { x: 32, y: 33, w: 34, em: 16 },
        sub: { y: 41.6, w: 30 },
        deco: { x: 32, y: 24.6 },
      }
    case 'banner':
      return {
        outline: `M6.6 ${j(19, rnd)} L12 ${j(19, rnd)} L12 ${j(46.4, rnd)} L6.4 46.6 L9.6 32.6 Z M12 19 L52 ${j(18.6, rnd)} L52 ${j(46, rnd)} L12 46.4 Z M52 18.8 L57.6 ${j(19, rnd)} L54.6 32.6 L57.8 46.4 L52 46.2 Z`,
        text: { x: 32, y: 34, w: 36, em: 16 },
        deco: { x: 32, y: 25 },
      }
    case 'medal':
      return {
        outline: seal(32, 37.4, 18.6, 19.6, 22, 0, 0.2, rnd),
        under: [['f', 'tomato', 'M21.6 6.4 L28 6.8 L34.4 22.6 L27.6 24 Z'], ['f', 'tomato', 'M42.4 6.4 L36 6.8 L29.6 22.6 L36.4 24 Z'], ['s', 'M21.6 6.4 L28 6.8 L34.4 22.6', 0.9], ['s', 'M42.4 6.4 L36 6.8 L29.6 22.6', 0.9]],
        ring: `O 32 37.4 ${j(14.6, rnd, 0.2)}`,
        text: { x: 32, y: 41, w: 21, em: 15 },
        deco: { x: 32, y: 28 },
      }
    case 'tag':
    default:
      return {
        outline: `M23 ${j(14.6, rnd)} L${j(41.6, rnd)} 14.4 L50 ${j(22.6, rnd)} L${j(50.4, rnd)} 57.4 L${j(13.8, rnd)} 57.6 L${j(14.2, rnd)} 22.8 Z`,
        over: [['s', 'O 32 22.4 2.6', 0.8], ['s', 'M32.4 19.8 C31.6 11.2 24 5.4 19.6 8.4 C16.4 10.8 20 16.6 25.6 12.4', 0.85]],
        text: { x: 32, y: 38.6, w: 29, em: 15 },
        sub: { y: 50.6, w: 24 },
        deco: { x: 32, y: 51.4 },
      }
  }
}

const star5 = (cx: number, cy: number, ro: number, ri: number): string => {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const a = rad(-90 + i * 36)
    const rr = i % 2 ? ri : ro
    d += `${i ? ' L' : 'M'}${r1(cx + Math.cos(a) * rr)} ${r1(cy + Math.sin(a) * rr)}`
  }
  return d + ' Z'
}

export function badgeSkeleton(text: string, o: BadgeOpts = {}): ArtDef {
  const kind = o.shape ?? 'scallop'
  const rnd = lcg(hashSeed(`${kind}:${text}:${o.color ?? ''}`))
  const shape = shapeOf(kind, o, rnd)
  const color = o.fill ?? o.color ?? 'bubblegum'
  const ink = o.textColor ?? 'ink'
  const ttl = text.toUpperCase()
  const perEm = measureText('hand', ttl, 1)
  const em = r1(Math.min(shape.text.em, shape.text.w / perEm))
  const capH = 0.745 * em
  const build = (small: boolean): Part[] => {
    const parts: Part[] = []
    if (shape.under) parts.push(...shape.under)
    parts.push(['f', color, shape.outline])
    parts.push(['s', shape.outline, small ? 1.15 : 1.05])
    if (shape.ring) parts.push(['c', 'photo', shape.ring, small ? 0.6 : 0.5], ['s', shape.ring, small ? 0.6 : 0.5])
    if (shape.over) parts.push(...shape.over)
    const sub = !small && o.sub && shape.sub
    const ty = shape.text.y + capH / 2 - (sub ? 2 : 0)
    parts.push(['t', ttl, shape.text.x, r1(ty), em, ink, 'hand'])
    if (sub) parts.push(['t', o.sub!, shape.text.x, shape.sub!.y + 2, r1(Math.min(6.4, shape.sub!.w / measureText('hand', o.sub!.toUpperCase(), 1))), ink, 'hand'])
    if (!small && o.deco) {
      const { x, y } = shape.deco
      if (o.deco === 'tick') parts.push(['s', `M${r1(x - 3.8)} ${r1(y + 0.4)} L${r1(x - 1)} ${r1(y + 3)} L${r1(x + 4.2)} ${r1(y - 3)}`, 0.8])
      else if (o.deco === 'star') parts.push(['f', 'lemon', star5(x, y, 3.6, 1.6)], ['s', star5(x, y, 3.7, 1.6), 0.6])
      else if (o.deco === 'sparkle') parts.push(['s', `M${r1(x + 12)} ${r1(y - 4)} L${r1(x + 12.2)} ${r1(y + 2)} M${r1(x + 9)} ${r1(y - 1)} L${r1(x + 15)} ${r1(y - 1.2)}`, 0.8])
      else if (o.deco === 'swoosh') parts.push(['c', 'tomato', `M${r1(shape.text.x - em * 1.1)} ${r1(ty + 3.4)} Q${r1(shape.text.x)} ${r1(ty + 6)} ${r1(shape.text.x + em * 1.2)} ${r1(ty + 2.4)}`, 0.7])
      else if (o.deco === 'percent') parts.push(['c', ink, `O ${r1(x)} ${r1(y)} 3.4`, 0.55], ['c', ink, `M${r1(x - 2)} ${r1(y + 2)} L${r1(x + 2)} ${r1(y - 2)}`, 0.5])
    }
    return parts
  }
  const master = build(false)
  const small = build(true)
  const def: ArtDef = { grid: 64, nibK: 0.05, parts: master, small, kind: 'sticker' }
  if (o.tags) return { ...def, tags: o.tags }
  return def
}
