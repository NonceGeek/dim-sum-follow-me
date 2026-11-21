import type { ArtDef } from '@/lib/ink/art/types'
import { arrows } from '@/lib/ink/art/icons/arrows'
import { marks } from '@/lib/ink/art/icons/marks'
import { status } from '@/lib/ink/art/icons/status'
import { layout } from '@/lib/ink/art/icons/layout'
import { files } from '@/lib/ink/art/icons/files'
import { comms } from '@/lib/ink/art/icons/comms'
import { devData } from '@/lib/ink/art/icons/dev-data'
import { textNatureMisc } from '@/lib/ink/art/icons/text-nature-misc'
import { media } from '@/lib/ink/art/icons/media'
import { commerceTime } from '@/lib/ink/art/icons/commerce-time'

export const iconBatches = { arrows, marks, status, layout, files, comms, devData, textNatureMisc, media, commerceTime } as const
export const icons = { ...arrows, ...marks, ...status, ...layout, ...files, ...comms, ...devData, ...textNatureMisc, ...media, ...commerceTime } satisfies Record<string, ArtDef>
export type IconName = keyof typeof icons
export * from '@/lib/ink/art/icons/aliases'
