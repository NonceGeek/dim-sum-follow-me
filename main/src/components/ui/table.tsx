"use client"

import * as React from "react"

import { tableTiles } from "@/lib/ink/recipes/table-ink"
import { cn } from "@/lib/utils"

let sheet: string | undefined
function tableSheet(): string {
  if (sheet) return sheet
  const t = tableTiles()
  return (sheet = `@layer components {
:root { --ll-tbl-rule: ${t.rule}; --ll-tbl-head: ${t.head}; --ll-tbl-cap-a: ${t.capStart}; --ll-tbl-cap-b: ${t.capEnd}; }
[data-slot="table"] {
  isolation: isolate; border-collapse: separate; border-spacing: 0;
  --ll-tbl-img: var(--ll-tbl-rule); --ll-tbl-h: 8px;
  --ll-fade-s: linear-gradient(90deg, transparent, black 14px); --ll-fade-e: linear-gradient(90deg, black calc(100% - 26px), transparent);
  --ll-fade-se: linear-gradient(90deg, transparent, black 14px, black calc(100% - 26px), transparent);
}
[data-slot="table"]:dir(rtl) {
  --ll-fade-s: linear-gradient(270deg, transparent, black 14px); --ll-fade-e: linear-gradient(270deg, black calc(100% - 26px), transparent);
  --ll-fade-se: linear-gradient(270deg, transparent, black 14px, black calc(100% - 26px), transparent);
}
[data-slot="table-row"] { --ll-rx: 0px; }
[data-slot="table-row"]:nth-child(4n + 2) { --ll-rx: -330px; }
[data-slot="table-row"]:nth-child(4n + 3) { --ll-rx: -610px; }
[data-slot="table-row"]:nth-child(4n) { --ll-rx: -140px; }
[data-slot="table-row"] > :is(td, th) { position: relative; --ll-cx: 0px; }
[data-slot="table-row"] > :is(td, th):nth-child(5n + 2) { --ll-cx: -173px; }
[data-slot="table-row"] > :is(td, th):nth-child(5n + 3) { --ll-cx: -419px; }
[data-slot="table-row"] > :is(td, th):nth-child(5n + 4) { --ll-cx: -71px; }
[data-slot="table-row"] > :is(td, th):nth-child(5n) { --ll-cx: -617px; }
[data-slot="table-row"] > :is(td, th)::after {
  content: ""; position: absolute; inset-inline: 0; bottom: -4px; height: var(--ll-tbl-h); pointer-events: none;
  background-color: var(--ll-pencil-mark);
  mask-image: var(--ll-tbl-img); mask-size: 960px var(--ll-tbl-h); mask-repeat: repeat-x; mask-position: calc(var(--ll-rx) + var(--ll-cx)) 0;
}
[data-slot="table-row"] > :is(td, th):is(:first-child, :last-child)::after {
  mask-size: 960px var(--ll-tbl-h), 100% 100%; mask-repeat: repeat-x, no-repeat; mask-position: calc(var(--ll-rx) + var(--ll-cx)) 0, 0 0; mask-composite: intersect;
}
[data-slot="table-row"] > :is(td, th):first-child::after { mask-image: var(--ll-tbl-img), var(--ll-fade-s); }
[data-slot="table-row"] > :is(td, th):last-child::after { mask-image: var(--ll-tbl-img), var(--ll-fade-e); }
[data-slot="table-row"] > :is(td, th):only-child::after { mask-image: var(--ll-tbl-img), var(--ll-fade-se); }
[data-slot="table-body"] > [data-slot="table-row"]:last-child > :is(td, th)::after { display: none; }
[data-slot="table-header"] > [data-slot="table-row"] { --ll-tbl-img: var(--ll-tbl-head); --ll-tbl-h: 12px; }
[data-slot="table-header"] > [data-slot="table-row"] > :is(td, th)::after { bottom: -6px; background-color: var(--ll-ink-soft); }
[data-slot="table-footer"] > [data-slot="table-row"] > :is(td, th)::after { display: none; }
[data-slot="table-footer"] > [data-slot="table-row"]:first-child { --ll-tbl-img: var(--ll-tbl-head); --ll-tbl-h: 12px; }
[data-slot="table-footer"] > [data-slot="table-row"]:first-child > :is(td, th)::after {
  display: block; top: -6px; bottom: auto; background-color: var(--ll-ink-soft); scale: 1 -1;
}
[data-slot="table-body"] > [data-slot="table-row"] > :is(td, th)::before {
  content: ""; position: absolute; inset-inline: 0; inset-block: 5px; z-index: -1; pointer-events: none; opacity: 0;
  background-color: var(--ll-hi-select); mask-image: linear-gradient(black, black);
  transition: opacity var(--ll-dur-hover) var(--ll-ease-out);
}
[data-slot="table-body"] > [data-slot="table-row"] > :is(td, th):first-child::before {
  inset-inline-start: -4px; mask-image: var(--ll-tbl-cap-a), linear-gradient(black, black);
  mask-size: 18px 100%, calc(100% - 15px) 100%; mask-position: left top, right top; mask-repeat: no-repeat;
}
[data-slot="table-body"] > [data-slot="table-row"] > :is(td, th):last-child::before {
  inset-inline-end: -4px; mask-image: linear-gradient(black, black), var(--ll-tbl-cap-b);
  mask-size: calc(100% - 15px) 100%, 18px 100%; mask-position: left top, right top; mask-repeat: no-repeat;
}
[data-slot="table-body"] > [data-slot="table-row"] > :is(td, th):only-child::before {
  mask-image: var(--ll-tbl-cap-a), linear-gradient(black, black), var(--ll-tbl-cap-b);
  mask-size: 18px 100%, calc(100% - 30px) 100%, 18px 100%; mask-position: left top, center, right top; mask-repeat: no-repeat;
}
[data-slot="table-body"] > [data-slot="table-row"] > :is(td, th):dir(rtl):first-child::before {
  mask-image: linear-gradient(black, black), var(--ll-tbl-cap-b); mask-size: calc(100% - 15px) 100%, 18px 100%;
}
[data-slot="table-body"] > [data-slot="table-row"] > :is(td, th):dir(rtl):last-child::before {
  mask-image: var(--ll-tbl-cap-a), linear-gradient(black, black); mask-size: 18px 100%, calc(100% - 15px) 100%;
}
[data-slot="table-body"] > [data-slot="table-row"] > :is(td, th):dir(rtl):only-child::before {
  mask-image: var(--ll-tbl-cap-a), linear-gradient(black, black), var(--ll-tbl-cap-b); mask-size: 18px 100%, calc(100% - 30px) 100%, 18px 100%;
}
@media (hover: hover) { [data-slot="table-body"] > [data-slot="table-row"]:hover > :is(td, th)::before { opacity: 0.4; } }
[data-slot="table-body"] > [data-slot="table-row"]:has([aria-expanded="true"]) > :is(td, th)::before { opacity: 0.4; }
[data-slot="table-body"] > [data-slot="table-row"]:is([data-state="selected"], [aria-selected="true"]) > :is(td, th)::before { opacity: 1; }
[data-density="calm"] [data-slot="table-row"] > :is(td, th)::after { mask-image: none; height: 1px; bottom: 0; background-color: var(--ll-line-soft, var(--ll-pencil-mark)); opacity: 0.7; }
[data-density="calm"] [data-slot="table-header"] > [data-slot="table-row"] > :is(td, th)::after { height: 2px; bottom: -1px; background-color: var(--ll-ink-soft); opacity: 1; }
[data-density="calm"] [data-slot="table-footer"] > [data-slot="table-row"]:first-child > :is(td, th)::after { top: -1px; bottom: auto; }
[data-density="calm"] [data-slot="table-body"] > [data-slot="table-row"] > :is(td, th):is(*, :first-child, :last-child, :only-child, :dir(rtl))::before { mask-image: none; border-radius: 1px; inset-block: 2px; inset-inline: 0; }
@media (forced-colors: active) {
  [data-slot="table-row"] > :is(td, th)::before, [data-slot="table-row"] > :is(td, th)::after { display: none; }
  [data-slot="table-head"], [data-slot="table-cell"] { border-bottom: 1px solid CanvasText; }
  [data-slot="table-row"]:is([data-state="selected"], [aria-selected="true"]) > [data-slot="table-cell"] { background-color: Highlight; color: HighlightText; forced-color-adjust: none; }
}
}`)
}

const TableContext = React.createContext<{ sticky: boolean } | null>(null)
function useInTable(part: string) {
  const table = React.useContext(TableContext)
  if (!table) throw new Error(`<${part}> must be rendered inside <Table>.`)
  return table
}

function Table({
  className,
  containerClassName,
  sticky = false,
  ...props
}: React.ComponentProps<"table"> & {
  containerClassName?: string
  sticky?: boolean
}) {
  const tableContext = React.useMemo(() => ({ sticky }), [sticky])
  return (
    <div
      data-slot="table-container"
      className={cn("relative -m-3 w-[calc(100%+1.5rem)] max-w-none overflow-x-auto p-3", containerClassName)}
    >
      <style href="ll-table" precedence="low">
        {tableSheet()}
      </style>
      <TableContext.Provider value={tableContext}>
        <table
          data-slot="table"
          data-sticky={sticky ? "" : undefined}
          className={cn("group/table w-full caption-bottom text-[15px]", className)}
          {...props}
        />
      </TableContext.Provider>
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  const { sticky } = useInTable("TableHeader")
  return (
    <thead
      data-slot="table-header"
      className={cn(sticky && "sticky top-0 z-(--ll-z-sticky) bg-(--ll-table-bg,var(--ll-card))", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  useInTable("TableBody")
  return <tbody data-slot="table-body" className={cn(className)} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  useInTable("TableFooter")
  return <tfoot data-slot="table-footer" className={cn("font-bold", className)} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  useInTable("TableRow")
  return (
    <tr
      data-slot="table-row"
      className={cn("h-11 compact:h-9 calm:h-8", className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  useInTable("TableHead")
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-3 text-start align-middle font-script text-[19px] leading-none font-semibold whitespace-nowrap text-ink-you aria-[sort=ascending]:text-ink aria-[sort=descending]:text-ink calm:font-hand calm:text-sm calm:font-bold calm:text-ink-soft [&:has([role=checkbox])]:pe-0 [&>[role=checkbox]]:align-middle",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  useInTable("TableCell")
  return (
    <td
      data-slot="table-cell"
      className={cn("px-3 py-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0 [&>[role=checkbox]]:align-middle", className)}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  useInTable("TableCaption")
  return <caption data-slot="table-caption" className={cn("mt-4 font-script text-lg text-muted-foreground", className)} {...props} />
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
