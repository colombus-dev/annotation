export const PALETTE = [
  '#2563eb',
  '#7c3aed',
  '#059669',
  '#d97706',
  '#dc2626',
  '#ec4899',
  '#0891b2',
  '#84cc16',
  '#f59e0b',
  '#6366f1',
]

export function buildColorMap(values) {
  const map = {}
  values.forEach((v, i) => {
    map[v.name] = i
  })
  return map
}
