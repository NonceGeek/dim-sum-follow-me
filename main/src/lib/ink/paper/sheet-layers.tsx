"use client"

import * as React from "react"

import { inkViewBox } from "@/lib/ink/builder"
import { faceClip, faceLook, hasFace, splitFaces, tilesOf, type FaceSpec } from "@/lib/ink/paper/faces"
import { farShadow } from "@/lib/ink/paper/shadows"
import { InkSvg, InkTiles, useInkCore, type Frame, type UseInkOptions } from "@/lib/ink/react"
import type { InkLayerName } from "@/lib/ink/recipes"

type Piece = { type: "svg"; groups: Array<[layer: InkLayerName, markup: string]> } | { type: "face"; spec: FaceSpec; layer: InkLayerName }

function piecesOf(frame: Frame): { pieces: Piece[]; casts: FaceSpec[] } {
  const out: Piece[] = []
  const casts: FaceSpec[] = []
  let cur: Extract<Piece, { type: "svg" }> | null = null
  for (const layer of frame.layers) {
    for (const part of splitFaces(frame.parts[layer] ?? "")) {
      if (typeof part === "string") {
        if (!cur) out.push((cur = { type: "svg", groups: [] }))
        cur.groups.push([layer, part])
      } else if (part.paper === false) {
        casts.push(part)
      } else {
        cur = null
        casts.push(part)
        out.push({ type: "face", spec: part, layer })
      }
    }
  }
  if (!out.some((p) => p.type === "svg") || out[out.length - 1].type === "face") out.push({ type: "svg", groups: [] })
  return { pieces: out, casts: casts.filter((c) => c.cast) }
}

export function SheetLayers({ kind, frame, still }: { kind: string; frame: Frame; still?: boolean }) {
  const { w, h, pad } = frame
  const { pieces, casts } = React.useMemo(() => piecesOf(frame), [frame])
  const at = (x: number, y: number, ww: number, hh: number): React.CSSProperties => ({ left: `calc(50% - ${x}px)`, top: `calc(50% - ${y}px)`, width: ww, height: hh })
  const faces = pieces.filter((p): p is Extract<Piece, { type: "face" }> => p.type === "face")
  return (
    <>
      {faces.length ? <InkTiles tiles={tilesOf(faces.map((f) => f.spec.stock))} /> : null}
      {casts.map(({ cast }, i) => {
        const [t, r, b, l] = cast!.inset
        return (
          <span
            key={`shadow${i}`}
            data-slot="paper-shadow"
            aria-hidden="true"
            className="ll-face-shadow"
            style={{
              ...at(w / 2 - l, h / 2 - t, w - l - r, h - t - b),
              boxShadow: farShadow(cast!.kind, !!cast!.radius),
              ...(cast!.radius ? { borderRadius: cast!.radius.map((v) => `${v}px`).join(" ") } : {}),
            }}
          />
        )
      })}
      {pieces.map((p, i) => {
        if (p.type === "face") {
          const look = faceLook(p.spec.stock, p.spec.seed, p.spec.veil !== false)
          return (
            <span
              key={`face${i}`}
              data-slot="paper-face"
              data-layer={p.layer === "rest" ? undefined : p.layer}
              aria-hidden="true"
              className={`ll-face ${look.className}`}
              style={
                {
                  ...at(w / 2 + pad, h / 2 + pad, w + 2 * pad, h + 2 * pad),
                  ...look.vars,
                  "--ll-face-path": faceClip(p.spec, pad, pad),
                } as React.CSSProperties
              }
            />
          )
        }
        const groups = p.groups.some(([layer]) => layer === "rest") ? p.groups : ([["rest", ""], ...p.groups] as typeof p.groups)
        return (
          <svg
            key={`svg${i}`}
            data-ink={kind}
            data-still={still ? "" : undefined}
            aria-hidden="true"
            focusable="false"
            className="pointer-events-none absolute"
            viewBox={inkViewBox(frame)}
            preserveAspectRatio="none"
            style={{ position: "absolute", pointerEvents: "none", ...at(w / 2 + pad, h / 2 + pad, w + 2 * pad, h + 2 * pad), overflow: "visible", zIndex: -1 }}
          >
            {groups.map(([layer, markup]) => (
              <g key={layer} data-layer={layer} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: markup }} />
            ))}
          </svg>
        )
      })}
    </>
  )
}

export function useInkFaces<P>(o: UseInkOptions<P>) {
  const { hostRef, hostProps, frame, box, seed, still } = useInkCore(o)
  const kind = o.kind ?? o.recipe.kind
  const faced = frame?.layers.some((l) => hasFace(frame.parts[l] ?? ""))
  const node = !frame ? null : faced ? <SheetLayers key="ink" kind={kind} frame={frame} still={still} /> : <InkSvg key="ink" kind={kind} frame={frame} still={still} />
  return { hostRef, hostProps, node, box, seed }
}
