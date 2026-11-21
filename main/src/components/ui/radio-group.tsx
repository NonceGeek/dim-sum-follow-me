"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { useInk, useMergedRef } from "@/lib/ink/react"
import { REVEAL_DASH, REVEAL_WHEN_CHECKED, markTouched } from "@/lib/ink/recipes/draw-on-ink"
import { radioRecipe } from "@/lib/ink/recipes/radio-group-ink"
import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext({ invalid: false, disabled: false })

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  const invalid = props["aria-invalid"] === true || props["aria-invalid"] === "true"
  const group = React.useMemo(() => ({ invalid, disabled: !!props.disabled }), [invalid, props.disabled])
  return (
    <RadioGroupContext.Provider value={group}>
      <RadioGroupPrimitive.Root
        data-slot="radio-group"
        className={cn("grid gap-3 data-[orientation=horizontal]:flex data-[orientation=horizontal]:flex-wrap data-[orientation=horizontal]:gap-x-6", className)}
        {...props}
      />
    </RadioGroupContext.Provider>
  )
}

function RadioGroupItem({
  className,
  seed,
  disabled,
  ref,
  onClickCapture,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> & {
  seed?: string | number
}) {
  const group = React.useContext(RadioGroupContext)
  const invalid = props["aria-invalid"] === true || props["aria-invalid"] === "true" || (group.invalid && props["aria-invalid"] === undefined)
  const off = !!disabled || group.disabled
  const { hostRef, hostProps, node } = useInk({ recipe: radioRecipe, params: { disabled: off, invalid }, kind: "radio", seed })
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      ref={useMergedRef<HTMLButtonElement>(hostRef, ref)}
      {...hostProps}
      disabled={disabled}
      onClickCapture={(e) => {
        markTouched(e)
        onClickCapture?.(e)
      }}
      className={cn(
        "peer relative isolate aspect-square size-4 shrink-0 after:absolute after:-inset-2 disabled:cursor-not-allowed",
        REVEAL_DASH,
        REVEAL_WHEN_CHECKED,
        "group-hover/field:[&>svg_[data-layer=hover]]:visible group-hover/field:[&>svg_[data-layer=hover]]:opacity-100",
        "has-[+[data-slot=label]:hover]:[&>svg_[data-layer=hover]]:visible has-[+[data-slot=label]:hover]:[&>svg_[data-layer=hover]]:opacity-100",
        "has-[+input+[data-slot=label]:hover]:[&>svg_[data-layer=hover]]:visible has-[+input+[data-slot=label]:hover]:[&>svg_[data-layer=hover]]:opacity-100",
        className
      )}
      {...props}
    >
      {node}
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="pointer-events-none absolute inset-0 hidden place-content-center leading-none font-bold forced-colors:grid forced-colors:before:content-['●']"
      />
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
