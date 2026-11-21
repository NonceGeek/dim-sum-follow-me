"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useEnsureInkDefs, useIconSize } from "@/lib/ink/react"
import { icons, resolveIconName, type IconName } from "@/lib/ink/art/icons"
import { drawSkeleton, memo } from "@/lib/ink/art-draw"
import type { ArtAccent, ArtDef } from "@/lib/ink/art/types"

function sizeFromClass(className?: string): number | undefined {
  if (!className) return undefined
  const m = /(?:^|\s)size-(?:(\d+(?:\.\d+)?)|\[(\d+(?:\.\d+)?)px\])(?=\s|$)/.exec(className)
  if (!m) return undefined
  return m[2] ? Number(m[2]) : Number(m[1]) * 4
}

const MISSING: ArtDef = {
  grid: 24,
  kind: "icon",
  parts: [
    ["s", "M4.6 4.8 L19.3 4.5 L19.5 19.2 L4.4 19.5 Z", 0.9],
    ["s", "M9.4 9.6 Q9.6 7.4 12.1 7.4 Q14.7 7.5 14.6 9.7 Q14.5 11.4 12.3 12.3 L12.1 14", 1.1],
    ["d", 12, 16.8, 1.1],
  ],
}

const UI_WEIGHT = 1.12
const UI_WEIGHT_MAX_PX = 20
const iconNib = (def: ArtDef, px: number): number => Math.min(3.4, Math.max(1.45, px * (def.nibK ?? 0.068)))

function Icon({
  name,
  size,
  tone = "ui",
  accent,
  seed,
  label,
  flip,
  weight,
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"svg">, "name" | "children" | "viewBox"> & {
  name: IconName | (string & {})
  size?: number
  tone?: "ui" | "doodle"
  accent?: ArtAccent
  seed?: string | number
  label?: string
  flip?: boolean | "x" | "y"
  weight?: number
}) {
  useEnsureInkDefs()
  const contextSize = useIconSize()
  const id = resolveIconName(name)
  const known = (icons as Record<string, ArtDef>)[id]
  const def = known ?? MISSING
  const explicit = size ?? sizeFromClass(className) ?? contextSize
  const px = Math.max(8, Math.round(explicit ?? 16))
  const k = weight ?? (tone === "ui" && px <= UI_WEIGHT_MAX_PX ? UI_WEIGHT : 1)
  const res = memo(`icon|${id}|${px}|${tone}|${accent ?? ""}|${seed ?? ""}|${k}`, () =>
    drawSkeleton(def, px, seed ?? id, { tone, accent, kind: "icon", ...(k === 1 ? {} : { nib: iconNib(def, px) * k }) })
  )
  const axis = flip === true ? "x" : flip
  return (
    <svg
      data-slot="icon"
      data-ink="icon"
      data-icon={id}
      data-missing={known ? undefined : ""}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
      viewBox={`0 0 ${res.w} ${res.h}`}
      width={size || contextSize ? px : "1em"}
      height={size || contextSize ? px : "1em"}
      style={size || contextSize ? { width: px, height: px, ...style } : style}
      className={cn(
        "pointer-events-none shrink-0 overflow-visible",
        def.rtl === "flip" && "rtl:-scale-x-100",
        def.mirror && axis === "x" && "-scale-x-100",
        def.mirror && axis === "y" && "-scale-y-100",
        className
      )}
      dangerouslySetInnerHTML={{ __html: res.svg }}
      {...props}
    />
  )
}

export { Icon }
export type { IconName }
