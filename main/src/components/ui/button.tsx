"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { IconSizeContext, useInk, useMergedRef } from "@/lib/ink/react"
import { buttonRecipe } from "@/lib/ink/recipes/button-ink"
import { cn } from "@/lib/utils"

const swipe = "hover:[&>svg_[data-part=swipe]]:animate-[ll-wipe_var(--ll-dur-sheet)_var(--ll-ease-out)_both]"

const buttonVariants = cva(
  "relative isolate inline-flex shrink-0 items-center justify-center gap-2 font-hand font-bold whitespace-nowrap transition-[translate] duration-(--ll-dur-press) ease-out active:translate-y-(--ll-press-sink) [&[data-pressed]:not([data-pressed=false])]:translate-y-(--ll-press-sink) disabled:pointer-events-none disabled:text-pencil-text aria-disabled:pointer-events-none aria-disabled:text-pencil-text [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not(.absolute):not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "text-primary-foreground",
        destructive: "text-paper",
        outline: "text-ink",
        secondary: "text-secondary-foreground",
        ghost: `text-foreground ${swipe}`,
        link: `text-link hover:text-link-hover ${swipe}`,
      },
      size: {
        default: "h-9 px-4 py-2 text-base has-[>svg:not(.absolute)]:px-3 compact:h-8 calm:h-7",
        xs: "h-6 gap-1 px-2 text-sm has-[>svg:not(.absolute)]:px-1.5 [&_svg:not(.absolute):not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 text-[15px] has-[>svg:not(.absolute)]:px-2.5 compact:h-7 calm:h-7",
        lg: "h-10 px-6 text-[17px] has-[>svg:not(.absolute)]:px-4 compact:h-9 calm:h-8",
        icon: "size-9 compact:size-8 calm:size-7",
        "icon-xs": "size-6 [&_svg:not(.absolute):not([class*='size-'])]:size-3",
        "icon-sm": "size-8 compact:size-7 calm:size-7",
        "icon-lg": "size-10 compact:size-9 calm:size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  disabled,
  seed,
  children,
  ref,
  onClick,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    seed?: string | number
  }) {
  const v = variant ?? "default"
  const s = size ?? "default"
  const pill = !!className && className.split(/\s+/).includes("rounded-full")
  const forced = "data-focus-visible" in props || "data-pressed" in props
  const { hostRef, hostProps, node } = useInk({
    recipe: buttonRecipe,
    params: { variant: v, size: s, disabled: !!disabled, shape: pill ? "pill" : "default" },
    kind: "button",
    seed,
    layers: forced ? "all" : undefined,
  })
  const mergedRef = useMergedRef<HTMLElement>(hostRef, ref as React.Ref<HTMLElement> | undefined)
  const iconPx = s === "xs" || s === "icon-xs" ? 12 : undefined
  const shared = {
    "data-variant": v,
    "data-size": s,
    "data-shape": pill ? "pill" : undefined,
    "data-ink-sink": "self",
    className: cn(buttonVariants({ variant: v, size: s, className })),
    ref: mergedRef,
    ...hostProps,
    ...props,
  }

  if (asChild) {
    const inert = disabled
      ? {
          "aria-disabled": true as const,
          "data-disabled": "",
          tabIndex: -1,
          onClick: (e: React.MouseEvent<HTMLElement>) => e.preventDefault(),
        }
      : { onClick: onClick as React.MouseEventHandler<HTMLElement> | undefined }
    return (
      <IconSizeContext value={iconPx}>
        <Slot.Root data-slot="button" {...shared} {...inert}>
          <Slot.Slottable>{children}</Slot.Slottable>
          {node}
        </Slot.Root>
      </IconSizeContext>
    )
  }

  return (
    <IconSizeContext value={iconPx}>
      <button data-slot="button" {...shared} disabled={disabled} onClick={onClick}>
        {node}
        {children}
      </button>
    </IconSizeContext>
  )
}

export { Button, buttonVariants }
