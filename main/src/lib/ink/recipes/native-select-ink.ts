import { defineRecipe } from '@/lib/ink/recipes'
import { drawSelectFrame } from '@/lib/ink/recipes/select-frame-ink'

export interface NativeSelectParams {
  disabled?: boolean
  invalid?: boolean
}

export const nativeSelectRecipe = defineRecipe<NativeSelectParams>({
  id: 'native-select',
  kind: 'field',
  layers: ['rest', 'hover', 'focus', 'invalid', 'disabled'],
  lazy: ['focus', 'hover'],
  pad: 12,
  draw(ink, box, params, ctx) {
    drawSelectFrame(ink, box, { ...params, openable: false }, ctx)
  },
})
