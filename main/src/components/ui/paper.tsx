"use client"

import * as React from "react"

import { isCutEdge, edgeInset, edgeName, type EdgeSpec } from "@/lib/ink/paper/edges"
import { PaperDefs } from "@/lib/ink/paper/defs"
import { faceLook, tilesOf } from "@/lib/ink/paper/faces"
import { clip, pin, staple, binderClip, type Accent, type TapeKind } from "@/lib/ink/paper/props"
import { PropSvg } from "@/lib/ink/paper/prop-svg"
import { useInkFaces } from "@/lib/ink/paper/sheet-layers"
import { dropShadow, sheetShadow, tiltFor, type SheetShadowKind } from "@/lib/ink/paper/shadows"
import { RULE_OFFSET_VAR, ruleGeometry, rulesLayer, stockOf, type RuleName, type StockName } from "@/lib/ink/paper/stocks"
import { InkTiles, useDensity, useInk, useInkSeed, useInkTier, useMergedRef } from "@/lib/ink/react"
import { handRulesRecipe, sheetRecipe } from "@/lib/ink/recipes/paper-ink"
import { cn } from "@/lib/utils"
import { Tape } from "@/components/ui/tape"

type FastenerKind = "clip" | "pin" | "staple" | "binder-clip"
type TapePlacement = "corner" | "top" | "both"
type PaperElement = "div" | "section" | "article" | "aside" | "header" | "footer" | "main" | "nav" | "li" | "ul" | "ol" | "form" | "fieldset" | "figure"

type PaperProps = Omit<React.ComponentProps<"div">, "ref"> & {
  ref?: React.Ref<HTMLElement>
  stock?: StockName
  edge?: EdgeSpec
  tilt?: boolean | number
  rules?: RuleName
  tape?: TapePlacement | false
  tapeKind?: TapeKind
  fastener?: FastenerKind | false
  fastenerTone?: "steel" | Accent
  fastenerClassName?: string
  shadow?: "stock" | "none" | SheetShadowKind
  curl?: boolean
  as?: PaperElement
  seed?: string | number
  size?: readonly [number, number]
}

const RULED = new Set<RuleName>(["ruled", "ruled-hand", "index", "pad", "ledger"])

const TAPE_PLACES: Record<TapePlacement, ReadonlyArray<{ className: string; angle: number }>> = {
  corner: [{ className: "-top-2 -left-7", angle: -38 }],
  top: [{ className: "-top-3 left-1/2 -ml-8", angle: -2 }],
  both: [
    { className: "-top-2 -left-7", angle: -38 },
    { className: "-top-2 -right-7", angle: 36 },
  ],
}

const FASTENER_PLACE: Record<FastenerKind, string> = {
  clip: "-top-5 right-8",
  pin: "-top-2 left-1/2 -ml-3",
  staple: "top-2 left-2",
  "binder-clip": "-top-10 left-1/2 -ml-[26px]",
}

const CURL = 34

function Paper({
  className,
  style,
  children,
  ref,
  stock = "paper",
  edge,
  tilt = false,
  rules,
  tape,
  tapeKind = "masking",
  fastener = false,
  fastenerTone,
  fastenerClassName,
  shadow = "stock",
  curl = false,
  as = "div",
  seed: seedProp,
  size,
  ...props
}: PaperProps) {
  const Comp = as as React.ElementType
  const S = stockOf(stock)
  const calm = useDensity() === "calm"
  const requested: EdgeSpec = calm ? "cut" : (edge ?? "cut")
  const drawn = !isCutEdge(requested) || (curl && !calm)
  const shadowKind = shadow === "stock" ? undefined : shadow
  const sheetParams = React.useMemo(() => ({ stock: S.name, edge: requested, chamfer: curl && !calm ? CURL : undefined, shadow: shadowKind }), [S.name, requested, curl, calm, shadowKind])
  const { hostRef, hostProps, node, seed } = useInkFaces({ recipe: sheetRecipe, params: sheetParams, kind: "sheet", size: drawn ? size : undefined, seed: seedProp })
  const merged = useMergedRef<HTMLElement>(drawn ? hostRef : undefined, ref)
  const ready = drawn && node !== null

  const ruleName: RuleName = rules ?? S.rules
  const handRules = ruleName === "ruled-hand" && !calm
  const hand = useInk({ recipe: handRulesRecipe, params: { paper: S.name === "pad" ? "pad" : "ruled" }, kind: "rules", seed: `${seed}|rules` })
  const layer = React.useMemo(() => rulesLayer(ruleName === "ruled-hand" ? (calm ? "ruled" : "none") : ruleName, { calm }), [ruleName, calm])
  const handOffset = ruleGeometry("ruled", { calm }).offset
  const deg = tilt === false ? 0 : typeof tilt === "number" ? tilt : tiltFor(seed, S.tilt * (RULED.has(ruleName) ? 0.45 : 1))

  const vars: Record<string, string> = ready ? {} : faceLook(S.name, seed).vars
  if (deg) vars["--ll-tilt"] = `${deg}deg`
  if (shadow !== "stock") vars["--ll-sheet-shadow"] = shadow === "none" ? "none" : sheetShadow(shadow)

  const inset = drawn ? Math.ceil(edgeInset(requested)) + 1 : 0
  const places = tape ? TAPE_PLACES[tape] : []
  const cssTiles = ready ? null : tilesOf([S.name])

  return (
    <>
      {cssTiles ? <InkTiles tiles={cssTiles} /> : null}
      <Comp
        data-slot="paper"
        data-stock={S.name}
        data-edge={ready ? (curl && isCutEdge(requested) ? "curl" : edgeName(requested)) : "cut"}
        ref={merged}
        {...(ready ? hostProps : {})}
        className={cn(
          "ll-paper",
          S.stockClass,
          S.toothClass,
          S.shadowClass,
          "calm:[--ll-sheet-shadow:var(--ll-shadow-hair)]",
          className
        )}
        style={{ ...vars, ...style } as React.CSSProperties}
        {...props}
      >
        {drawn ? node : null}
        {layer ? (
          <span
            data-slot="paper-rules"
            aria-hidden="true"
            className="ll-tilt-layer ll-multiply pointer-events-none absolute z-(--ll-z-sheet)"
            style={{ inset, ...layer.style, ...(deg ? { "--ll-tilt": `${deg}deg` } : {}) } as React.CSSProperties}
          />
        ) : null}
        {handRules ? (
          <span
            data-slot="paper-rules"
            aria-hidden="true"
            ref={hand.hostRef}
            {...(hand.node ? hand.hostProps : {})}
            className="ll-tilt-layer ll-multiply pointer-events-none absolute isolate z-(--ll-z-sheet)"
            style={{ inset, translate: `0 calc(${handOffset}px - var(${RULE_OFFSET_VAR}, ${handOffset}px))`, ...(deg ? ({ "--ll-tilt": `${deg}deg` } as React.CSSProperties) : {}) }}
          >
            {hand.node}
          </span>
        ) : null}
        {children}
        {places.map((p, i) => (
          <Tape
            key={i}
            kind={tapeKind}
            length={64}
            height={20}
            angle={p.angle}
            seed={`${seed}:tape:${i}`}
            className={cn("absolute z-(--ll-z-prop) calm:hidden", p.className)}
          />
        ))}
        {fastener ? (
          <Fastener kind={fastener} tone={fastenerTone} seed={`${seed}:fastener`} className={cn("absolute z-(--ll-z-prop) calm:hidden", FASTENER_PLACE[fastener], fastenerClassName)} />
        ) : null}
      </Comp>
    </>
  )
}

type FastenerProps = Omit<React.ComponentProps<"svg">, "children"> & {
  kind?: FastenerKind
  tone?: "steel" | Accent
  size?: number
  seed?: string | number
}

function Fastener({ kind = "clip", tone, size, seed: seedProp, className, style, ...props }: FastenerProps) {
  const seed = useInkSeed(seedProp)
  const tier = useInkTier()
  const calm = useDensity() === "calm"
  const res = React.useMemo(() => {
    const s = `${seed}|${kind}`
    if (kind === "pin") return pin(s, { size: size ?? 24, color: tone && tone !== "steel" ? tone : undefined, tier, calm })
    if (kind === "staple") return staple(s, { length: size ?? 20, tier, calm })
    if (kind === "binder-clip") return binderClip(s, { width: size ?? 52, tier, calm })
    return clip(s, { height: size ?? 62, tone: tone ?? "steel", tier, calm })
  }, [seed, kind, tone, size, tier, calm])
  const jitter = Math.round(tiltFor(`${seed}|at`, 1) * 6)
  return (
    <PropSvg
      res={res}
      kind="sticker"
      data-slot="fastener"
      data-kind={kind}
      className={cn("pointer-events-none relative z-(--ll-z-prop) block shrink-0", className)}
      style={{ filter: dropShadow("prop"), translate: `${jitter}px 0`, ...style }}
      {...props}
    />
  )
}

export { Paper, Fastener, PaperDefs }
export type { PaperProps, FastenerProps, FastenerKind, TapePlacement }
