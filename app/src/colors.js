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

  let savedMap = {}
  try {
    savedMap = JSON.parse(localStorage.getItem('annotationColorMap')) || {}
  } catch (e) {}

  let maxIndex = -1
  for (const key in savedMap) {
    if (savedMap[key] > maxIndex) {
      maxIndex = savedMap[key]
    }
  }
  let nextColorIndex = maxIndex + 1

  values.forEach((v) => {
    if (savedMap[v.name] !== undefined) {
      map[v.name] = savedMap[v.name]
    } else {
      map[v.name] = nextColorIndex % PALETTE.length
      savedMap[v.name] = map[v.name]
      nextColorIndex++
    }
  })

  localStorage.setItem('annotationColorMap', JSON.stringify(savedMap))
  return map
}
