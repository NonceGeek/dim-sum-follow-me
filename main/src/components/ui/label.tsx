"use client"

import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"

import type { ArtDef } from "@/lib/ink/art/types"
import { drawSkeleton, memo } from "@/lib/ink/art-draw"
import { cn } from "@/lib/utils"

const STAR: ArtDef = {
  kind: "icon",
  grid: 24,
  parts: [
    ["s", "M12.3 4.4 L11.7 19.6", 1.25],
    ["s", "M4.9 8.3 L19.3 15.9", 1.25],
    ["s", "M18.7 8.6 L6.4 15.4", 1.25],
  ],
  small: [
    ["s", "M12.4 3.4 L11.6 20.6", 1.05],
    ["s", "M3.9 7.6 L20.2 16.6", 1.05],
    ["s", "M19.4 7.9 L5.4 16.1", 1.05],
  ],
}

function RequiredMark({ seed }: { seed: string }) {
  const res = memo(`label-star|${seed}`, () => drawSkeleton(STAR, 12, seed, { tone: "ui", kind: "icon" }))
  return (
    <svg
      data-slot="label-required"
      data-ink="icon"
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${res.w} ${res.h}`}
      className="pointer-events-none mt-px size-[0.8em] shrink-0 self-start overflow-visible text-red"
      dangerouslySetInnerHTML={{ __html: res.svg }}
    />
  )
}

function Label({
  className,
  required,
  seed,
  children,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & {
  required?: boolean
  seed?: string | number
}) {
  const id = React.useId()
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-1 font-hand text-[15px] leading-none font-bold text-foreground select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-pencil-text peer-disabled:cursor-not-allowed peer-disabled:text-pencil-text peer-has-[>input:disabled]:cursor-not-allowed peer-has-[>input:disabled]:text-pencil-text peer-has-[>textarea:disabled]:cursor-not-allowed peer-has-[>textarea:disabled]:text-pencil-text",
        className
      )}
      {...props}
    >
      {children}
      {required && <RequiredMark seed={seed === undefined ? id : String(seed)} />}
    </LabelPrimitive.Root>
  )
}

export { Label }
