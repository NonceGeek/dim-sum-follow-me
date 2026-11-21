export const ICON_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "badge-check": ["verified"],
  "chart-column": ["bar-chart-3"],
  "chart-line": ["line-chart"],
  "chart-pie": ["pie-chart"],
  "circle-alert": ["alert-circle"],
  "circle-check": ["check-circle-2"],
  "circle-minus": ["minus-circle"],
  "circle-play": ["play-circle"],
  "circle-plus": ["plus-circle"],
  "circle-question-mark": ["circle-help", "help-circle"],
  "circle-user": ["user-circle"],
  "circle-x": ["x-circle"],
  "cloud-upload": ["upload-cloud"],
  "code-xml": ["code-2"],
  "columns-2": ["columns"],
  "ellipsis": ["more-horizontal"],
  "ellipsis-vertical": ["more-vertical"],
  "face-slightly-smiling": ["smile"],
  "funnel": ["filter"],
  "house": ["home"],
  "loader-circle": ["loader-2"],
  "message-circle-question-mark": ["message-circle-question"],
  "octagon-alert": ["alert-octagon"],
  "octagon-x": ["x-octagon"],
  "panel-left": ["sidebar"],
  "panel-left-close": ["sidebar-close"],
  "panel-left-open": ["sidebar-open"],
  "rotate-ccw-clock": ["history"],
  "sparkles": ["stars"],
  "square-check": ["check-square-2"],
  "square-terminal": ["terminal-square"],
  "text-align-center": ["align-center"],
  "text-align-start": ["align-left", "text"],
  "trash": ["trash-2"],
  "triangle-alert": ["alert-triangle"],
}

const REVERSE: Record<string, string> = {}
for (const id of Object.keys(ICON_ALIASES)) for (const a of ICON_ALIASES[id]) REVERSE[a] = id

export function kebabIconName(name: string): string {
  return name
    .replace(/^Lucide(?=[A-Z])/, '')
    .replace(/Icon$/, '')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .replace(/(\d)([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase()
}

export function resolveIconName(name: string): string {
  const k = kebabIconName(name)
  return REVERSE[k] ?? k
}
