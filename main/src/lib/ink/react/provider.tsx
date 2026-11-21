"use client"

import * as React from "react"

import type { Knobs } from "@/lib/ink/builder"
import type { Tier } from "@/lib/ink/types"
import type { PaperTileName } from "@/lib/ink/textures"
import { InkDefs, InkTiles } from "@/lib/ink/react/defs"
import { InkContext, type InkContextValue, type InkScopeProps } from "@/lib/ink/react/hooks"
import { DEFAULT_KNOBS, resolveKnobs, stableStringify, type Density, type Dir } from "@/lib/ink/recipes"

export interface InkProviderProps {
  tier?: Tier
  density?: Density
  motion?: "system" | "reduced"
  theme?: string
  dir?: Dir
  knobs?: Partial<Knobs>
  textures?: boolean | readonly PaperTileName[]
  defs?: boolean
  patterns?: boolean | readonly PaperTileName[]
  children?: React.ReactNode
}

const wrapperStyle: React.CSSProperties = { display: "contents" }

const num = (cs: CSSStyleDeclaration, name: string, fallback: number): number => {
  const v = Number.parseFloat(cs.getPropertyValue(name))
  return Number.isFinite(v) ? v : fallback
}

function readKnobs(el: Element): Knobs {
  const cs = getComputedStyle(el)
  return {
    wobble: num(cs, "--ll-wobble", 1),
    misreg: num(cs, "--ll-misreg-k", 1),
    bleed: num(cs, "--ll-bleed", 6) / 6,
    width: num(cs, "--ll-stroke-fine", 1.7) / 1.7,
  }
}

const sameKnobs = (a: Knobs, b: Knobs) => a.wobble === b.wobble && a.misreg === b.misreg && a.bleed === b.bleed && a.width === b.width

const ATTRS = ["data-theme", "data-density", "data-motion", "dir"]

export function InkProvider({ tier = "lo", density: densityProp, motion = "system", theme, dir: dirProp, knobs: knobsProp, textures = false, defs = true, patterns, children }: InkProviderProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [css, setCss] = React.useState<Knobs>(DEFAULT_KNOBS)
  const [inheritedDensity, setInheritedDensity] = React.useState<Density>("comfortable")
  const [inheritedDir, setInheritedDir] = React.useState<Dir>("ltr")

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => {
      const k = readKnobs(el)
      setCss((prev) => (sameKnobs(prev, k) ? prev : k))
      const d = el.parentElement?.closest("[data-density]")?.getAttribute("data-density")
      setInheritedDensity(d === "compact" || d === "calm" ? d : "comfortable")
      const r = el.parentElement?.closest("[dir]")?.getAttribute("dir") ?? el.ownerDocument.documentElement.getAttribute("dir")
      setInheritedDir(r === "rtl" ? "rtl" : "ltr")
    }
    read()
    if (typeof MutationObserver === "undefined") return
    const mo = new MutationObserver(read)
    mo.observe(el, { attributes: true, attributeFilter: ATTRS })
    mo.observe(el.ownerDocument.documentElement, { attributes: true, attributeFilter: ATTRS })
    return () => mo.disconnect()
  }, [theme, densityProp, motion])

  const density = densityProp ?? inheritedDensity
  const dir = dirProp ?? inheritedDir
  const outerScope = React.useContext(InkContext).scope
  const scope = React.useMemo<InkScopeProps>(() => {
    const own: InkScopeProps = {}
    if (densityProp) own["data-density"] = densityProp
    if (motion === "reduced") own["data-motion"] = "reduced"
    if (theme) own["data-theme"] = theme
    return { ...outerScope, ...own }
  }, [outerScope, densityProp, motion, theme])
  const knobsPropKey = knobsProp ? stableStringify(knobsProp) : ""
  const knobs = React.useMemo(
    () => resolveKnobs(knobsProp ? { ...css, ...knobsProp } : css, density),
    [css, density, knobsPropKey],
  )
  const value = React.useMemo<InkContextValue>(() => ({ tier, density, dir, motion, knobs, hasProvider: true, scope }), [tier, density, dir, motion, knobs, scope])

  return (
    <InkContext.Provider value={value}>
      <div ref={ref} data-ll-scope="" data-density={densityProp} data-motion={motion === "reduced" ? "reduced" : undefined} data-theme={theme} style={wrapperStyle}>
        {defs ? <InkDefs patterns={patterns} /> : null}
        {textures ? <InkTiles tiles={textures} /> : null}
        {children}
      </div>
    </InkContext.Provider>
  )
}
