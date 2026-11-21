"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { Paper, type PaperProps } from "@/components/ui/paper"
import { PropSvg } from "@/lib/ink/paper/prop-svg"
import { useDensity, useInkScope, useInkSeed, useInkTier } from "@/lib/ink/react"
import { pointerMark } from "@/lib/ink/recipes/overlay-ink"
import { cn } from "@/lib/utils"

function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipPointer({ seed }: { seed: string }) {
  const tier = useInkTier()
  const calm = useDensity() === "calm"
  const res = React.useMemo(() => pointerMark(`${seed}|pointer`, { tier, calm, w: 18, h: 16 }), [seed, tier, calm])
  return (
    <TooltipPrimitive.Arrow asChild>
      <PropSvg
        res={res}
        kind="prop"
        data-slot="tooltip-arrow"
        width={res.w}
        height={res.h}
        viewBox={`0 0 ${res.w} ${res.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="pointer-events-none"
      />
    </TooltipPrimitive.Arrow>
  )
}

function TooltipContent({
  className,
  sideOffset = 1,
  collisionPadding = 8,
  stock = "sticky-yellow",
  tilt = false,
  arrow = true,
  seed: seedProp,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> &
  Pick<PaperProps, "stock" | "tilt" | "seed"> & {
    arrow?: boolean
  }) {
  const scope = useInkScope()
  const seed = useInkSeed(seedProp)
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content asChild sideOffset={sideOffset} collisionPadding={collisionPadding} {...props}>
        <Paper
          data-slot="tooltip-content"
          stock={stock}
          tilt={tilt}
          rules="none"
          seed={seed}
          {...scope}
          className={cn(
            "z-(--ll-z-popover) w-fit max-w-[min(22rem,calc(100vw-1rem))] origin-(--radix-tooltip-content-transform-origin) px-2.5 py-1.5 text-sm/snug break-words text-balance text-foreground",
            "duration-(--ll-dur-pop) animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            className
          )}
        >
          {children}
          {arrow && <TooltipPointer seed={seed} />}
        </Paper>
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
