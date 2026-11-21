"use client"

import * as React from "react"

import { GRAINS } from "@/lib/ink/builder"
import { PAPER_TILES, inkDefsSvg, svgMaskDefs, svgPatternDefs, textureCssVars, type GrainMaskKind, type PaperTileName } from "@/lib/ink/textures"

export function InkDefs({
  kinds = GRAINS,
  patterns,
}: {
  kinds?: readonly GrainMaskKind[]
  patterns?: boolean | readonly PaperTileName[]
}) {
  const token = React.useRef<object>({})
  const [hidden, setHidden] = React.useState(false)
  const tiles = patterns === true ? "all" : patterns ? patterns.join(",") : ""
  const html = React.useMemo(() => defsMarkup(kinds, tiles), [kinds, tiles])

  React.useLayoutEffect(() => {
    ensureInkFonts()
    const me = token.current
    const recheck = () => setHidden(first() !== me || hasInjected())
    instances.set(me, recheck)
    recheck()
    return () => {
      instances.delete(me)
      for (const other of instances.values()) queueMicrotask(other)
    }
  }, [])

  if (hidden) return null
  return (
    <svg data-ll-defs="" width={0} height={0} style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs dangerouslySetInnerHTML={{ __html: html }} />
    </svg>
  )
}

export function InkTiles({ tiles }: { tiles: readonly PaperTileName[] | true }) {
  const names = tiles === true ? (Object.keys(PAPER_TILES) as PaperTileName[]) : tiles
  return (
    <>
      {names.map((name) => (
        <style key={name} href={`ll-tex-${name}`} precedence="low">
          {tileCss(name)}
        </style>
      ))}
    </>
  )
}

const tileCssCache = new Map<PaperTileName, string>()
function tileCss(name: PaperTileName): string {
  let s = tileCssCache.get(name)
  if (s === undefined) tileCssCache.set(name, (s = textureCssVars([name])))
  return s
}

const instances = new Map<object, () => void>()
const first = () => instances.keys().next().value

const hasInjected = () => document.querySelector('[data-ll-defs="injected"]') !== null

const markupCache = new Map<string, string>()
function defsMarkup(kinds: readonly GrainMaskKind[], tiles: string): string {
  const key = `${kinds.join(",")}|${tiles}`
  let s = markupCache.get(key)
  if (s === undefined) {
    s = svgMaskDefs({ kinds })
    if (tiles) s += svgPatternDefs(tiles === "all" ? {} : { tiles: tiles.split(",") as PaperTileName[] })
    markupCache.set(key, s)
  }
  return s
}

export const KEVIN_SANS_CSS = "https://kevintngo.github.io/looseleaf/fonts/kevin-sans.css"

export function ensureInkFonts(): void {
  if (typeof document === "undefined" || document.querySelector("[data-ll-fonts]")) return
  let present = false
  document.fonts?.forEach((face) => {
    if (face.family.replace(/["']/g, "").startsWith("Kevin Sans")) present = true
  })
  if (present) return
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = KEVIN_SANS_CSS
  link.setAttribute("data-ll-fonts", "")
  document.head.appendChild(link)
}

export function ensureInkDefs(): void {
  ensureInkFonts()
  if (typeof document === "undefined" || instances.size > 0) return
  if (document.querySelector("[data-ll-defs]") || document.getElementById("ll-felt-0")) return
  const holder = document.createElement("div")
  holder.innerHTML = inkDefsSvg({ kinds: GRAINS })
  const svg = holder.firstElementChild
  if (!svg) return
  svg.setAttribute("data-ll-defs", "injected")
  document.body.appendChild(svg)
}
