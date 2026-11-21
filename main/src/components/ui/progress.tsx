"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { useInk, useMergedRef } from "@/lib/ink/react"
import { progressFillRecipe, progressRecipe, type ProgressTone } from "@/lib/ink/recipes/progress-ink"
import { cn } from "@/lib/utils"

const css =
  "@keyframes ll-progress-slide{from{clip-path:inset(-12px 100% -12px -40%)}to{clip-path:inset(-12px -40% -12px 100%)}}" +
  "@keyframes ll-progress-slide-rtl{from{clip-path:inset(-12px -40% -12px 100%)}to{clip-path:inset(-12px 100% -12px -40%)}}"

const sizes = {
  sm: "h-3",
  default: "h-4",
  lg: "h-5",
} as const

function Progress({
  className,
  value,
  max = 100,
  size = "default",
  tone = "marker",
  seed,
  ref,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  size?: keyof typeof sizes
  tone?: ProgressTone
  seed?: string | number
}) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100
  const indeterminate = typeof value !== "number" || Number.isNaN(value)
  const clamped = indeterminate ? null : Math.min(safeMax, Math.max(0, value))
  const pct = clamped === null ? 0 : (clamped / safeMax) * 100
  const root = useInk({ recipe: progressRecipe, params: {}, kind: "progress", seed, still: true })
  const fill = useInk({ recipe: progressFillRecipe, params: { tone, indeterminate }, kind: "progress", seed: root.seed ? `${root.seed}:fill` : undefined, still: true })
  return (
    <>
      <style href="ll-progress" precedence="low">
        {css}
      </style>
      <ProgressPrimitive.Root
        data-slot="progress"
        ref={useMergedRef<HTMLDivElement>(root.hostRef, ref)}
        {...root.hostProps}
        value={clamped}
        max={safeMax}
        className={cn(
          "relative isolate w-full bg-paper-shade outline-hidden data-ink-ready:bg-transparent forced-colors:border forced-colors:border-[ButtonText]",
          sizes[size],
          className
        )}
        {...props}
      >
        {root.node}
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          ref={fill.hostRef}
          {...fill.hostProps}
          style={indeterminate ? undefined : ({ "--ll-progress": pct } as React.CSSProperties)}
          className={cn(
            "absolute inset-0 isolate bg-marker/70 outline-hidden data-ink-ready:bg-transparent forced-colors:bg-[Highlight]",
            "[clip-path:inset(-12px_calc(100%_-_var(--ll-progress,100)_*_1%)_-12px_0)] rtl:[clip-path:inset(-12px_0_-12px_calc(100%_-_var(--ll-progress,100)_*_1%))]",
            "transition-[clip-path] duration-(--ll-dur-sheet) ease-out",
            "data-[state=indeterminate]:animate-[ll-progress-slide_1.6s_linear_infinite] rtl:data-[state=indeterminate]:animate-[ll-progress-slide-rtl_1.6s_linear_infinite]",
            "motion-reduce:data-[state=indeterminate]:animate-none motion-reduce:data-[state=indeterminate]:[clip-path:inset(-12px_30%_-12px_30%)]",
            "[[data-motion=reduced]_&]:data-[state=indeterminate]:animate-none [[data-motion=reduced]_&]:data-[state=indeterminate]:[clip-path:inset(-12px_30%_-12px_30%)]"
          )}
        >
          {fill.node}
        </ProgressPrimitive.Indicator>
      </ProgressPrimitive.Root>
    </>
  )
}

export { Progress }
