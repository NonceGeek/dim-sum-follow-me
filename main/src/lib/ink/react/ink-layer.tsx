"use client"

import * as React from "react"

import { useInkCore, type UseInkOptions } from "@/lib/ink/react/hooks"
import { InkSvg } from "@/lib/ink/react/svg"

export type InkProps<P> = UseInkOptions<P>

export function Ink<P>(props: InkProps<P>) {
  const { hostRef, frame, still } = useInkCore(props)
  const ready = frame !== null
  const svg = React.useRef<SVGSVGElement | null>(null)

  const anchor = React.useCallback(
    (el: SVGSVGElement | null) => {
      svg.current = el
      const host = el?.parentElement
      if (!host) return
      host.setAttribute("data-ink-host", "")
      const stop = hostRef(host)
      return () => {
        if (typeof stop === "function") stop()
        host.removeAttribute("data-ink-host")
        host.removeAttribute("data-ink-ready")
      }
    },
    [hostRef],
  )

  React.useLayoutEffect(() => {
    const host = svg.current?.parentElement
    if (!host) return
    if (ready) host.setAttribute("data-ink-ready", "")
    else host.removeAttribute("data-ink-ready")
  }, [ready])

  return <InkSvg ref={anchor} kind={props.kind ?? props.recipe.kind} frame={frame} still={still} />
}
