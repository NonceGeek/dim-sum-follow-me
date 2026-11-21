"use client"

import * as React from "react"

import { Icon } from "@/components/ui/icon"
import { splitFieldClass } from "@/lib/field-class"
import { useInk } from "@/lib/ink/react"
import { nativeSelectRecipe } from "@/lib/ink/recipes/native-select-ink"
import { cn } from "@/lib/utils"

const isTrue = (v: unknown) => v === true || v === "true"

function NativeSelect({
  className,
  size = "default",
  seed,
  style,
  children,
  ref,
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default"
  seed?: string | number
}) {
  const { hostRef, hostProps, node } = useInk({
    recipe: nativeSelectRecipe,
    params: { disabled: !!props.disabled, invalid: isTrue(props["aria-invalid"]) },
    kind: "field",
    seed,
    still: true,
  })
  const split = splitFieldClass(className)
  return (
    <span
      data-slot="native-select-wrapper"
      data-size={size}
      data-ink-focus="within"
      ref={hostRef}
      {...hostProps}
      style={style}
      className={cn(
        "group/native-select relative isolate flex h-9 w-fit items-center font-hand text-base text-(--ll-input-ink) caret-(--ll-caret) has-[select[multiple]]:h-auto data-[size=sm]:h-8 data-[size=sm]:text-[15px] compact:h-8 calm:h-7 calm:text-[15px] compact:data-[size=sm]:h-7",
        split.frame
      )}
    >
      {node}
      <select
        data-slot="native-select"
        data-size={size}
        ref={ref}
        className={cn(
          "h-full w-full min-w-0 appearance-none bg-transparent ps-3 pe-10 aria-invalid:pe-14 outline-none text-[length:inherit] disabled:cursor-not-allowed disabled:text-pencil-text has-[option[value='']:checked]:text-(--ll-placeholder) forced-colors:aria-invalid:underline forced-colors:aria-invalid:decoration-wavy",
          split.control
        )}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="chevron-down"
        size={16}
        data-slot="native-select-icon"
        className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-ink-soft select-none group-has-[select:disabled]/native-select:text-pencil-text"
      />
    </span>
  )
}

function NativeSelectOption({ className, ...props }: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" className={cn("bg-popover text-popover-foreground", className)} {...props} />
}

function NativeSelectOptGroup({ className, ...props }: React.ComponentProps<"optgroup">) {
  return <optgroup data-slot="native-select-optgroup" className={cn("bg-popover text-popover-foreground", className)} {...props} />
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
