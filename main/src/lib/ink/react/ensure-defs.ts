"use client"

import * as React from "react"

import { ensureInkDefs } from "@/lib/ink/react/defs"
import { useInkContext } from "@/lib/ink/react/hooks"

export function useEnsureInkDefs(): void {
  const { hasProvider } = useInkContext()
  React.useLayoutEffect(() => {
    if (!hasProvider) ensureInkDefs()
  }, [hasProvider])
}
