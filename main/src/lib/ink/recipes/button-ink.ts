import { bandFill, blobFill, highlight, solidFill, wash } from '@/lib/ink/fills'
import { roundRectPoly } from '@/lib/ink/geom'
import { box, chain, dashedBox, focusRing, loop, underline } from '@/lib/ink/shapes'
import { clamp } from '@/lib/ink/rng'
import { defineRecipe } from '@/lib/ink/recipes'

export const buttonVariantList = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const
export const buttonSizeList = ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const
export type ButtonVariant = (typeof buttonVariantList)[number]
export type ButtonSize = (typeof buttonSizeList)[number]

export interface ButtonParams {
  variant: ButtonVariant
  size: ButtonSize
  disabled?: boolean
  shape?: 'default' | 'pill'
}

const WIDE_PX = 360

const LABEL_PX: Record<ButtonSize, number> = { default: 16, xs: 14, sm: 15, lg: 17, icon: 16, 'icon-xs': 14, 'icon-sm': 16, 'icon-lg': 18 }

export const buttonRecipe = defineRecipe<ButtonParams>({
  id: 'button',
  kind: 'button',
  layers: ['rest', 'hover', 'pressed', 'focus', 'disabled'],
  lazy: ['focus', 'pressed'],
  pad: 12,
  draw(ink, { w, h }, { variant, size, disabled, shape }, ctx) {
    ink.lean()
    const pill = shape === 'pill' && variant !== 'link'
    const r = pill ? Math.min(h, w) / 2 - 0.5 : clamp(h * 0.09, 2.5, 4.4)
    const inset = 0.5
    const body = roundRectPoly(inset, inset, w - 2 * inset, h - 2 * inset, r)
    const small = Math.min(w, h) < 30 || pill
    const squareish = w / h < 1.6
    const circle = pill && w / h < 1.12
    const calm = ctx.calm
    const fillOpts = squareish ? { ends: 'square' as const, W: clamp(Math.min(w, h) * 0.3, 5, 9), angle: -0.04 } : calm ? { ends: 'square' as const } : {}
    const outlinePen = calm ? (variant === 'destructive' ? 'red.fine' : 'pencil.fine') : variant === 'destructive' ? 'redfelt' : 'ink'
    const wide = w > WIDE_PX
    const outline = wide ? { opts: { simple: true } } : {}
    const underlineY = h / 2 + LABEL_PX[size] * 0.56

    if (disabled) {
      if (ctx.lazyOnly) return
      ink.layer('disabled', () => {
        if (variant === 'link') {
          underline(ink, w * 0.14, underlineY, w * 0.72, { pen: 'pencil.fine', kind: 'single', opts: { alpha: 0.6 } })
          return
        }
        if (variant !== 'ghost') wash(ink, body, 'paper-shade', { alpha: 0.9, material: 'wash' })
        dashedBox(ink, 0, 0, w, h, { r, pen: 'pencil', opts: { color: 'pencil-mark' } })
      })
      return
    }

    ctx.lazy('focus', (fink) => focusRing(fink, 0, 0, w, h, { r }))
    ctx.lazy('pressed', (pink) => {
      if (variant === 'ghost') highlight(pink, 6, h * 0.22, w - 12, h * 0.56, { k: 1, pen: 'm_lemon' })
      else if (variant === 'link') underline(pink, w * 0.06, underlineY + 0.5, w * 0.88, { pen: 'blue.brush', kind: 'single' })
      else if (variant === 'outline') wash(pink, body, 'marker', { alpha: 0.32 })
      else if (circle) loop(pink, w / 2, h / 2, w / 2 - 0.9, h / 2 - 0.9, { pen: outlinePen, clean: true, opts: { alpha: 0.6, width: 0.85 } })
      else solidFill(pink, body, variant === 'secondary' ? 'hi' : variant === 'destructive' ? 'red' : 'marker', { alpha: variant === 'destructive' ? 0.18 : 0.34 })
    })
    if (ctx.lazyOnly) return

    ink.layer('rest', () => {
      if (variant === 'outline') ink.poly('under', body, 'slip', 0.9)
      if (variant === 'default') {
        ink.part('fill', () => (small ? blobFill(ink, body, 'marker', { alpha: 0.9 }) : bandFill(ink, body, 'marker', { passes: calm ? 1 : 2, alpha: 0.84, ...fillOpts })))
      } else if (variant === 'secondary') {
        ink.part('fill', () => (small ? blobFill(ink, body, 'hi', { alpha: 0.85 }) : bandFill(ink, body, 'hi', { alpha: 0.8, ...fillOpts })))
      } else if (variant === 'destructive') {
        ink.part('fill', () => (small ? blobFill(ink, body, 'red', { alpha: 0.97 }) : bandFill(ink, body, 'red', { passes: 1, alpha: 0.97, ...fillOpts })))
      }
      if (variant === 'link') {
        underline(ink, w * 0.1, underlineY, w * 0.8, { pen: 'blue.fine', kind: 'single' })
      } else if (variant === 'ghost') {
        if (circle) loop(ink, w / 2, h / 2, w / 2 - 1.2, h / 2 - 1.2, { pen: 'pencil.fine', clean: true, opts: { alpha: 0.42 } })
        else box(ink, 0, 0, w, h, { pen: 'pencil.fine', corner: r, opts: { alpha: 0.42 } })
      } else if (circle) {
        loop(ink, w / 2, h / 2, w / 2 - 1.2, h / 2 - 1.2, { pen: outlinePen, clean: true, ...(wide ? { opts: { simple: true } } : {}) })
      } else {
        box(ink, 0, 0, w, h, { pen: outlinePen, corner: r, ...outline })
      }
    })

    ink.layer('hover', () => {
      const d = 3.6 + h / 40
      if (variant === 'ghost') {
        ink.part('swipe', () => highlight(ink, 6, h * 0.22, w - 12, h * 0.56, { k: 1 }), 'hl')
        return
      }
      if (variant === 'link') {
        ink.part('swipe', () => underline(ink, w * 0.06, underlineY + 0.5, w * 0.88, { pen: 'blue.brush', kind: 'single' }), 'top')
        return
      }
      if (variant === 'outline') wash(ink, body, 'hi', { alpha: 0.5 })
      if (calm) {
        box(ink, 1.2, 1.2, w - 2.4, h - 2.4, { pen: outlinePen, corner: r, loose: 0.6, opts: { alpha: 0.7, simple: true } })
        return
      }
      ink.lines(
        [
          { pts: chain([[r + d + 2, h + d], [w + d, h + d], [w + d, r + d + 2]], [0.25, -0.2], Math.max(2.5, r + 1), ink.next('drop')), o: { start: 'soft', end: 'soft', wobble: 0.25, dry: 0 } },
        ],
        'ink.fine',
        { width: 1.35, simple: wide },
      )
    })
  },
})
