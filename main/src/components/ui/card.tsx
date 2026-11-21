"use client"

import * as React from "react"

import { Paper, type PaperProps } from "@/components/ui/paper"
import { useInk, useMergedRef } from "@/lib/ink/react"
import { cardRuleRecipe, type CardRuleStyle } from "@/lib/ink/recipes/card-ink"
import { cn } from "@/lib/utils"

type CardProps = PaperProps

function Card({ className, stock = "card", rules = "none", ...props }: CardProps) {
  return <Paper data-slot="card" stock={stock} rules={rules} className={cn("flex flex-col gap-6 py-6 text-card-foreground", className)} {...props} />
}

type RuleProps = {
  rule?: CardRuleStyle
}

const hasClass = (className: string | undefined, name: string) => !!className && className.split(/\s+/).includes(name)

function useDivider(edge: "top" | "bottom", drawn: boolean, rule: CardRuleStyle, ref: React.Ref<HTMLElement> | undefined) {
  const { hostRef, hostProps, node } = useInk({ recipe: cardRuleRecipe, params: { edge, style: rule }, kind: "rule" })
  const merged = useMergedRef<HTMLElement>(drawn ? hostRef : undefined, ref)
  return { ref: merged, hostProps: drawn && node ? hostProps : {}, node: drawn ? node : null }
}

function CardHeader({ className, rule = "pencil", ref, children, ...props }: React.ComponentProps<"div"> & RuleProps) {
  const d = useDivider("bottom", hasClass(className, "border-b"), rule, ref as React.Ref<HTMLElement> | undefined)
  return (
    <div
      data-slot="card-header"
      ref={d.ref as React.Ref<HTMLDivElement>}
      {...d.hostProps}
      className={cn(
        "@container/card-header relative isolate grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:border-transparent [.border-b]:pb-6",
        className
      )}
      {...props}
    >
      {d.node}
      {children}
    </div>
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-title" className={cn("font-script text-[1.7rem] leading-none font-semibold", className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-action" className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />
}

function CardFooter({ className, rule = "pencil", ref, children, ...props }: React.ComponentProps<"div"> & RuleProps) {
  const d = useDivider("top", hasClass(className, "border-t"), rule, ref as React.Ref<HTMLElement> | undefined)
  return (
    <div
      data-slot="card-footer"
      ref={d.ref as React.Ref<HTMLDivElement>}
      {...d.hostProps}
      className={cn("relative isolate flex items-center px-6 [.border-t]:border-transparent [.border-t]:pt-6", className)}
      {...props}
    >
      {d.node}
      {children}
    </div>
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
export type { CardProps }
