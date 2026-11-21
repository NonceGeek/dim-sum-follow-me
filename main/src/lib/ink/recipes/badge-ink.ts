import { blobFill, highlight, wash } from '@/lib/ink/fills'
import { pillPoly } from '@/lib/ink/geom'
import { tallyLines, box, focusRing, underline, RULER } from '@/lib/ink/shapes'
import { defineRecipe } from '@/lib/ink/recipes'
import type { PaintKey } from '@/lib/ink/paint'

export const badgeVariantList = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const
export const badgeSizeList = ['sm', 'default', 'lg'] as const
export const badgeToneList = ['marker', 'hi', 'tangerine', 'lemon', 'grass', 'teal', 'sky', 'bubblegum'] as const
export type BadgeVariant = (typeof badgeVariantList)[number]
export type BadgeSize = (typeof badgeSizeList)[number]
export type BadgeTone = (typeof badgeToneList)[number]

export interface BadgeParams {
  variant: BadgeVariant
  size: BadgeSize
  tone?: BadgeTone
  tally?: number
  hoverable?: boolean
}

const LABEL_PX: Record<BadgeSize, number> = { sm: 13, default: 14, lg: 16 }

export const tallyHeight = (h: number): number => Math.round(h * 0.62)

export function tallyWidth(count: number, h: number): number {
  const gh = tallyHeight(h)
  const step = 0.26 * gh
  const groupW = 1.05 * gh + 6
  const full = Math.floor(count / 5)
  const rest = count % 5
  const last = rest ? (Math.min(4, rest) - 1) * step + 1.4 : 0
  return Math.max(0, Math.ceil(full * groupW - (rest ? 0 : 6) + last))
}

export const badgeRecipe = defineRecipe<BadgeParams>({
  id: 'badge',
  kind: 'chip',
  layers: ['rest', 'hover', 'focus'],
  lazy: ['focus'],
  pad: 12,
  draw(ink, { w, h }, { variant, size, tone = 'marker', tally, hoverable }, ctx) {
    const r = h / 2
    const calm = ctx.calm
    ctx.lazy('focus', (fink) => focusRing(fink, 0, 0, w, h, { r }))
    if (ctx.lazyOnly) return
    const body = pillPoly(0.5, 0.5, w - 1, h - 1)
    const fillTone: PaintKey = tone === 'marker' ? 'marker' : tone
    const labelBase = h / 2 + LABEL_PX[size] * 0.56

    ink.layer('rest', () => {
      const outlinePen = calm ? 'pencil.fine' : 'ink.fine'
      if (variant === 'default') {
        ink.part('fill', () => blobFill(ink, body, fillTone, { alpha: 0.9, mis: calm ? false : undefined }))
        box(ink, 0, 0, w, h, { pen: outlinePen, corner: r })
      } else if (variant === 'secondary') {
        ink.part(
          'fill',
          () => {
            highlight(ink, 2, h * 0.08, w - 4, h * 0.84, { k: 1 })
            return { dx: 0, dy: 0 }
          },
          'hl'
        )
      } else if (variant === 'destructive') {
        ink.part('fill', () => blobFill(ink, body, 'red', { alpha: 0.97 }))
        box(ink, 0, 0, w, h, { pen: calm ? 'red.fine' : 'redfelt', corner: r, opts: { width: 0.8 } })
      } else if (variant === 'outline') {
        box(ink, 0, 0, w, h, { pen: outlinePen, corner: r })
      }
      if (tally) {
        const gh = tallyHeight(h)
        const tw = tallyWidth(tally, h)
        const t = tallyLines(ink.next('tally'), (w - tw) / 2 + 0.8, (h - gh) / 2, tally, gh)
        ink.lines(t.lines, h < 24 ? 'ink.fine' : 'ink', { width: 1.05 })
      }
    })

    if (!hoverable) return
    ink.layer('hover', () => {
      if (variant === 'ghost') {
        ink.part('swipe', () => highlight(ink, 2, h * 0.08, w - 4, h * 0.84, { k: 1 }), 'hl')
        return
      }
      if (variant === 'link') {
        ink.part('swipe', () => underline(ink, w * 0.08, labelBase, w * 0.84, { pen: 'blue.brush', kind: 'single' }), 'top')
        return
      }
      if (variant === 'outline') wash(ink, body, 'hi', { alpha: 0.5 })
      if (calm) {
        box(ink, 1, 1, w - 2, h - 2, {
          pen: 'pencil.fine',
          corner: r,
          loose: 0.6,
          opts: { alpha: 0.7, simple: true },
        })
        return
      }
      const d = 3 + h / 40
      ink.lines([{ pts: [[r * 0.8 + d, h + d], [w - r * 0.7 + d, h + d]], o: RULER }], 'ink.fine', { width: 1.3 })
    })
  },
})

