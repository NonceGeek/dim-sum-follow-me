"use client"

import * as React from "react"

import type { InkResult } from "@/lib/ink/builder"
import { ensureInkDefs } from "@/lib/ink/react/defs"
import { useInkContext } from "@/lib/ink/react/hooks"

export function PropSvg({ res, kind, ...props }: { res: InkResult; kind: string } & Omit<React.ComponentProps<"svg">, "children">) {
  const { hasProvider } = useInkContext()
  React.useLayoutEffect(() => {
    if (!hasProvider) ensureInkDefs()
  }, [hasProvider])
  return (
    <svg
      data-ink={kind}
      aria-hidden="true"
      focusable="false"
      width={res.w}
      height={res.h}
      viewBox={`0 0 ${res.w} ${res.h}`}
      {...props}
      style={{ overflow: "visible", ...props.style }}
      dangerouslySetInnerHTML={{ __html: res.svg }}
    />
  )
}
