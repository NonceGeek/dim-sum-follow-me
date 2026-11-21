const CONTROL_VARIANT = /^(?:placeholder|file|selection|autofill|read-only|disabled|enabled|focus|focus-visible|aria-invalid|user-invalid|invalid|required|optional)$/
const PADDING = /^-?p[xytblrse]?-/
const CONTROL_UTILITY = /^(?:resize|field-sizing)(?:-|$)/

function parse(token: string): [string[], string] {
  const variants: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < token.length; i++) {
    const c = token[i]
    if (c === "[" || c === "(") depth++
    else if (c === "]" || c === ")") depth--
    else if (c === ":" && depth === 0) {
      variants.push(token.slice(start, i))
      start = i + 1
    }
  }
  return [variants, token.slice(start).replace(/^!/, "").replace(/!$/, "")]
}

export function splitFieldClass(className?: string): { frame: string; control: string } {
  const frame: string[] = []
  const control: string[] = []
  for (const token of className?.split(/\s+/) ?? []) {
    if (!token) continue
    const [variants, utility] = parse(token)
    const own = variants.some((v) => CONTROL_VARIANT.test(v.replace(/[-_]?\[.*$/, "").replace(/\/.*$/, "")))
    ;(own || PADDING.test(utility) || CONTROL_UTILITY.test(utility) ? control : frame).push(token)
  }
  return { frame: frame.join(" "), control: control.join(" ") }
}
