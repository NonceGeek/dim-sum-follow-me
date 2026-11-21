"use client"

import * as React from "react"
import { Separator as SeparatorPrimitive } from "radix-ui"

import { useInk, useMergedRef } from "@/lib/ink/react"
import { separatorRecipe, type SeparatorVariant } from "@/lib/ink/recipes/separator-ink"
import { cn } from "@/lib/utils"

type Orientation = "horizontal" | "vertical"

function Rule({
  variant,
  orientation,
  seed,
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<"div"> & { variant: SeparatorVariant; orientation: Orientation; seed?: string | number }) {
  const { hostRef, hostProps, node } = useInk({ recipe: separatorRecipe, params: { variant, orientation }, kind: "rule", seed, still: true })
  return (
    <div
      ref={useMergedRef<HTMLDivElement>(hostRef, ref)}
      {...hostProps}
      data-variant={variant}
      className={cn(
        "relative isolate shrink-0 bg-pencil-mark/60 outline-hidden data-ink-ready:bg-transparent data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=horizontal]:overflow-x-clip data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px data-[orientation=vertical]:overflow-y-clip",
        className
      )}
      {...props}
    >
      {node}
      {children}
    </div>
  )
}

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  variant = "pencil",
  seed,
  children,
  ...props
}: Omit<React.ComponentProps<typeof SeparatorPrimitive.Root>, "asChild"> & {
  variant?: SeparatorVariant
  seed?: string | number
}) {
  if (children === undefined || children === null || children === false) {
    return (
      <SeparatorPrimitive.Root data-slot="separator" asChild decorative={decorative} orientation={orientation} {...props}>
        <Rule variant={variant} orientation={orientation} seed={seed} className={className} />
      </SeparatorPrimitive.Root>
    )
  }
  const vertical = orientation === "vertical"
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      data-variant={variant}
      decorative={decorative}
      orientation={orientation}
      className={cn("flex shrink-0 items-center gap-3 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:flex-col", className)}
      {...props}
    >
      <Rule variant={variant} orientation={orientation} seed={seed === undefined ? undefined : `${seed}:a`} data-orientation={orientation} data-slot="separator-line" className={vertical ? "data-[orientation=vertical]:h-auto flex-1" : "data-[orientation=horizontal]:w-auto flex-1"} />
      <span data-slot="separator-label" className="shrink-0 font-hand text-sm leading-none font-bold text-muted-foreground select-none">
        {children}
      </span>
      <Rule variant={variant} orientation={orientation} seed={seed === undefined ? undefined : `${seed}:b`} data-orientation={orientation} data-slot="separator-line" className={vertical ? "data-[orientation=vertical]:h-auto flex-1" : "data-[orientation=horizontal]:w-auto flex-1"} />
    </SeparatorPrimitive.Root>
  )
}

export { Separator }
