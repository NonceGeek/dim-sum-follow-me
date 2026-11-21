"use client"

import * as React from "react"

import { splitFieldClass } from "@/lib/field-class"
import { useInk, useMergedRef } from "@/lib/ink/react"
import { textareaRecipe } from "@/lib/ink/recipes/textarea-ink"
import { cn } from "@/lib/utils"

const control =
  "min-w-0 flex-1 resize-y appearance-none self-stretch border-0 bg-transparent px-3 py-2 text-[length:inherit] leading-6 [text-align:inherit] " +
  "disabled:cursor-not-allowed disabled:text-pencil-text aria-invalid:pe-9 forced-colors:aria-invalid:underline forced-colors:aria-invalid:decoration-wavy [&::-webkit-resizer]:bg-transparent " +
  "autofill:shadow-[inset_0_0_0_1000px_var(--ll-slip)] autofill:[-webkit-text-fill-color:var(--ll-input-ink)]"
const RULED_LINE = 28
const RULED_TOP = 8

const frame =
  "relative isolate flex min-h-16 w-full min-w-0 items-stretch font-hand text-base text-(--ll-input-ink) caret-(--ll-caret) calm:text-[15px]"

const isTrue = (v: unknown) => v === true || v === "true"
const noResize = (s: string) => /(?:^|\s)(?:[^\s:]+:)*resize-none(?:\s|$)/.test(s)

function TextareaControl({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(control, "field-sizing-content", className)} {...props} />
}

interface CountInfo {
  length: number
  max?: number
}

function Textarea({
  className,
  inputClassName,
  ruled = false,
  autoGrow = true,
  showCount = false,
  seed,
  style,
  ref,
  onChange,
  ...props
}: React.ComponentProps<"textarea"> & {
  inputClassName?: string
  ruled?: boolean
  autoGrow?: boolean
  showCount?: boolean | ((info: CountInfo) => React.ReactNode)
  seed?: string | number
}) {
  const split = splitFieldClass(className)
  const grow = autoGrow || ruled
  const resizable = !noResize(`${className ?? ""} ${inputClassName ?? ""}`)
  const { hostRef, hostProps, node } = useInk({
    recipe: textareaRecipe,
    params: {
      disabled: !!props.disabled,
      invalid: isTrue(props["aria-invalid"]),
      readOnly: !!props.readOnly,
      ruled,
      lineHeight: RULED_LINE,
      ruleTop: RULED_TOP,
      grip: resizable,
    },
    kind: "field",
    seed,
    still: true,
  })

  const inner = React.useRef<HTMLTextAreaElement | null>(null)
  const [typed, setTyped] = React.useState(() => String(props.defaultValue ?? "").length)
  React.useEffect(() => {
    const form = inner.current?.form
    if (!showCount || !form) return
    const onReset = () => queueMicrotask(() => setTyped(inner.current?.value.length ?? 0))
    form.addEventListener("reset", onReset)
    return () => form.removeEventListener("reset", onReset)
  }, [showCount])
  const length = props.value !== undefined ? String(props.value).length : typed
  const mergedRef = useMergedRef(ref, inner)
  const countId = React.useId()
  const count = typeof showCount === "function" ? showCount({ length, max: props.maxLength }) : `${length}${props.maxLength ? `/${props.maxLength}` : ""}`

  return (
    <span data-slot="textarea-frame" data-ink-focus="within" ref={hostRef} {...hostProps} style={style} className={cn(frame, ruled && "min-h-24", split.frame)}>
      {node}
      <TextareaControl
        {...props}
        ref={mergedRef}
        className={cn(!grow && "field-sizing-fixed", showCount && "pb-7", split.control, inputClassName, ruled && "pt-2 pb-2 leading-7")}
        aria-describedby={showCount ? cn(countId, props["aria-describedby"]) : props["aria-describedby"]}
        onChange={(e) => {
          if (showCount) setTyped(e.currentTarget.value.length)
          onChange?.(e)
        }}
      />
      {showCount && (
        <span data-slot="textarea-count" id={countId} className="pointer-events-none absolute end-6 bottom-1.5 text-sm text-ink-muted ll-num">
          <span aria-hidden="true">{count}</span>
          <span className="sr-only">
            {length} characters{props.maxLength ? ` of ${props.maxLength}` : ""}
          </span>
        </span>
      )}
    </span>
  )
}

export { Textarea, TextareaControl }
