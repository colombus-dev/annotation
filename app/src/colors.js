export const PALETTE = [
  '#FF0000', // Rouge
  '#0000FF', // Bleu
  '#00FF00', // Vert
  '#FFFF00', // Jaune
  '#FFA500', // Orange
  '#800080', // Violet
  '#FFC0CB', // Rose
  '#00FFFF', // Cyan
  '#FF00FF', // Magenta
  '#A52A2A', // Marron
]

export function buildColorMap(values) {
  const map = {}
  let savedMap = {}

  try {
    savedMap = JSON.parse(localStorage.getItem('annotationColorMap')) || {}
  } catch (e) { }

  const usedColors = new Set()

  // 1. First pass: keep existing assigned colors
  values.forEach((v) => {
    if (typeof savedMap[v.name] === 'number') {
      map[v.name] = savedMap[v.name] % PALETTE.length
      usedColors.add(map[v.name])
    }
  })

  // 2. Second pass: assign available colors to new items
  let fallbackCounter = 0
  values.forEach((v) => {
    if (map[v.name] === undefined) {
      let colorIndex = 0
      // Find the first color from 0 to 9 that isn't currently used
      while (usedColors.has(colorIndex) && colorIndex < PALETTE.length) {
        colorIndex++
      }

      // If we somehow have > 10 items, we just start wrapping around safely
      if (colorIndex >= PALETTE.length) {
        colorIndex = fallbackCounter % PALETTE.length
        fallbackCounter++
      }

      map[v.name] = colorIndex
      savedMap[v.name] = colorIndex
      usedColors.add(colorIndex)
    }
  })

  localStorage.setItem('annotationColorMap', JSON.stringify(savedMap))
  return map
}
