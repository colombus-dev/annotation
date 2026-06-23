export const PALETTE = [
  '#2563eb40',
  '#7c3aed40',
  '#05966940',
  '#d9770640',
  '#dc262640',
  '#ec489940',
  '#0891b240',
  '#84cc1640',
  '#f59e0b40',
  '#6366f140',
]

export function buildColorMap(values) {
  const map = {}
  values.forEach((v, i) => {
    map[v.name] = i
  })
  return map
}
