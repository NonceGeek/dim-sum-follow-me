"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { IconSizeContext, useInk, useMergedRef } from "@/lib/ink/react"
import { badgeRecipe, tallyWidth, type BadgeTone } from "@/lib/ink/recipes/badge-ink"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "relative isolate inline-flex w-fit shrink-0 items-center justify-center gap-1 font-hand font-bold whitespace-nowrap select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not(.absolute):not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "text-primary-foreground",
        secondary: "text-secondary-foreground",
        destructive: "text-paper",
        outline: "text-foreground",
        ghost: "text-foreground",
        link: "text-link hover:text-link-hover",
      },
      size: {
        sm: "h-5 px-2 text-[13px] leading-none [&:is(a,button)]:after:absolute [&:is(a,button)]:after:inset-x-0 [&:is(a,button)]:after:-inset-y-0.5 has-[>svg:not(.absolute)]:ps-1.5 [&_svg:not(.absolute):not([class*='size-'])]:size-3",
        default:
          "h-6 px-2.5 text-sm leading-none has-[>svg:not(.absolute)]:ps-2 calm:h-5 calm:[&:is(a,button)]:after:absolute calm:[&:is(a,button)]:after:inset-x-0 calm:[&:is(a,button)]:after:-inset-y-0.5",
        lg: "h-7 px-3 text-base leading-none has-[>svg:not(.absolute)]:ps-2.5 [&_svg:not(.absolute):not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const BADGE_H = { sm: 20, default: 24, lg: 28 } as const
const ICON_PX = { sm: 12, default: 14, lg: 16 } as const
const TALLY_MAX = 20

function Badge({
  className,
  variant,
  size,
  tone,
  count,
  max = 99,
  tally = false,
  asChild = false,
  seed,
  children,
  ref,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
    tone?: BadgeTone
    count?: number
    max?: number
    tally?: boolean
    seed?: string | number
  }) {
  const v = variant ?? "default"
  const s = size ?? "default"
  const tallied = !asChild && tally && count !== undefined && count > 0 && count <= TALLY_MAX
  const hoverable = asChild || typeof props.onClick === "function"
  const { hostRef, hostProps, node } = useInk({
    recipe: badgeRecipe,
    params: { variant: v, size: s, tone, tally: tallied ? count : undefined, hoverable },
    kind: "chip",
    seed,
  })
  const mergedRef = useMergedRef<HTMLElement>(hostRef, ref as React.Ref<HTMLElement> | undefined)
  const shared = {
    "data-variant": v,
    "data-size": s,
    ref: mergedRef,
    ...hostProps,
    ...props,
  }

  const iconPx = ICON_PX[s]
  if (asChild) {
    return (
      <IconSizeContext value={iconPx}>
        <Slot.Root data-slot="badge" {...shared} className={cn(badgeVariants({ variant: v, size: s }), className)}>
          <Slot.Slottable>{children}</Slot.Slottable>
          {node}
        </Slot.Root>
      </IconSizeContext>
    )
  }

  const shown = children ?? (count === undefined ? undefined : count > max ? `${max}+` : String(count))
  return (
    <IconSizeContext value={iconPx}>
      <span data-slot="badge" {...shared} className={cn(badgeVariants({ variant: v, size: s }), count !== undefined && "ll-num min-w-6 px-1.5", className)}>
        {node}
        {tallied ? (
          <>
            <span className="sr-only">{shown}</span>
            <span aria-hidden="true" data-slot="badge-tally" className="inline-block h-full" style={{ width: tallyWidth(count, BADGE_H[s]) }} />
          </>
        ) : (
          shown
        )}
      </span>
    </IconSizeContext>
  )
}

export { Badge, badgeVariants }
