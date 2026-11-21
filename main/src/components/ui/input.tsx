"use client"

import * as React from "react"

import { splitFieldClass } from "@/lib/field-class"
import { useInk } from "@/lib/ink/react"
import { inputRecipe } from "@/lib/ink/recipes/input-ink"
import { cn } from "@/lib/utils"

const control =
  "h-full w-full min-w-0 flex-1 appearance-none border-0 bg-transparent px-3 py-1 text-[length:inherit] [text-align:inherit] " +
  "file:me-3 file:inline-flex file:h-6 file:items-center file:border-0 file:bg-hi-select file:px-2 file:text-sm file:font-bold file:text-foreground " +
  "disabled:cursor-not-allowed disabled:text-pencil-text aria-invalid:pe-9 forced-colors:aria-invalid:underline forced-colors:aria-invalid:decoration-wavy " +
  "autofill:shadow-[inset_0_0_0_1000px_var(--ll-slip)] autofill:[-webkit-text-fill-color:var(--ll-input-ink)] " +
  "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-search-cancel-button]:appearance-none [&::-ms-reveal]:hidden " +
  "[&[type=number]]:[appearance:textfield] " +
  "[&[type=password]:not(:placeholder-shown)]:font-mono [&[type=password]:not(:placeholder-shown)]:tracking-wider"

const frame =
  "relative isolate flex h-9 w-full min-w-0 items-center font-hand text-base text-(--ll-input-ink) caret-(--ll-caret) compact:h-8 calm:h-7 calm:text-[15px]"

const isTrue = (v: unknown) => v === true || v === "true"

function InputControl({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(control, className)} {...props} />
}

function Input({
  className,
  inputClassName,
  type,
  seed,
  style,
  ref,
  ...props
}: React.ComponentProps<"input"> & {
  inputClassName?: string
  seed?: string | number
}) {
  const { hostRef, hostProps, node } = useInk({
    recipe: inputRecipe,
    params: { disabled: !!props.disabled, invalid: isTrue(props["aria-invalid"]), readOnly: !!props.readOnly },
    kind: "field",
    seed,
    still: true,
  })
  if (type === "hidden") return <InputControl type="hidden" ref={ref} {...props} />
  const split = splitFieldClass(className)
  return (
    <span data-slot="input-frame" data-ink-focus="within" ref={hostRef} {...hostProps} style={style} className={cn(frame, split.frame)}>
      {node}
      <InputControl type={type} ref={ref} className={cn(split.control, inputClassName)} {...props} />
    </span>
  )
}

export { Input, InputControl }
