"use client"

import * as React from "react"

import { svgPatternDefs, type PaperTileName } from "@/lib/ink/textures"

export const PAPER_DEF_TILES: readonly PaperTileName[] = ["fibre", "relief", "slip", "kraft", "cloud"]

export function PaperDefs({ tiles = PAPER_DEF_TILES }: { tiles?: readonly PaperTileName[] }) {
  const html = React.useMemo(() => svgPatternDefs({ tiles }), [tiles])
  return (
    <svg data-ll-paper-defs="" width={0} height={0} style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs dangerouslySetInnerHTML={{ __html: html }} />
    </svg>
  )
}

export function ensurePaperDefs(tiles: readonly PaperTileName[]): void {
  if (typeof document === "undefined") return
  const missing = tiles.filter((t) => !document.getElementById(`ll-tex-${t}-img`))
  if (!missing.length) return
  const holder = document.createElement("div")
  holder.innerHTML = `<svg data-ll-paper-defs="" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${svgPatternDefs({ tiles: missing })}</defs></svg>`
  const svg = holder.firstElementChild
  if (svg) document.body.appendChild(svg)
}
