"use client"

import * as React from "react"

import { dropShadow, tiltFor } from "@/lib/ink/paper/shadows"
import { tape, type TapeEnds, type TapeKind } from "@/lib/ink/paper/props"
import { PropSvg } from "@/lib/ink/paper/prop-svg"
import { useDensity, useInkSeed, useInkTier } from "@/lib/ink/react"
import { cn } from "@/lib/utils"

type TapeProps = Omit<React.ComponentProps<"svg">, "children"> & {
  kind?: TapeKind
  length?: number
  height?: number
  angle?: number
  ends?: TapeEnds
  color?: "tomato" | "tangerine" | "lemon" | "grass" | "teal" | "sky" | "grape" | "bubblegum"
  seed?: string | number
}

function Tape({ kind = "masking", length = 72, height = 22, angle, ends, color, seed: seedProp, className, style, ...props }: TapeProps) {
  const seed = useInkSeed(seedProp)
  const tier = useInkTier()
  const calm = useDensity() === "calm"
  const res = React.useMemo(() => tape(`${seed}|tape`, { kind, length, height, ends, color, tier, calm }), [seed, kind, length, height, ends, color, tier, calm])
  const deg = angle ?? tiltFor(`${seed}|tape`, 4)
  return (
    <PropSvg
      res={res}
      kind="tape"
      data-slot="tape"
      data-kind={kind}
      className={cn("pointer-events-none relative z-(--ll-z-prop) block shrink-0", className)}
      style={{
        rotate: `clamp(calc(var(--ll-tilt-max) * -2.5), ${deg}deg, calc(var(--ll-tilt-max) * 2.5))`,
        filter: dropShadow("tape"),
        ...style,
      }}
      {...props}
    />
  )
}

export { Tape }
export type { TapeProps }
