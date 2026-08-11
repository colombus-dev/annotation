import { useMemo } from 'react'

export const SERIES_COLOR_PALETTE = [
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
  '#9ACD32', // Vert-jaune
  '#556B2F', // Olive foncé
  '#2E8B57', // Vert de mer
  '#00FA9A', // Vert printemps
  '#4682B4', // Bleu acier
  '#9932CC', // Orchidée foncée
  '#C71585', // Rouge violet
  '#696969', // Gris terne
  '#708090', // Gris ardoise
  '#2F4F4F', // Gris ardoise foncé
]

function hashSeriesName(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function assignSeriesColors(series) {
  const usedIndexes = new Set()

  return series.map((entry) => {
    let index = hashSeriesName(entry.name) % SERIES_COLOR_PALETTE.length
    let attempts = 0
    while (usedIndexes.has(index) && attempts < SERIES_COLOR_PALETTE.length) {
      index = (index + 1) % SERIES_COLOR_PALETTE.length
      attempts++
    }

    usedIndexes.add(index)

    return { ...entry, color: SERIES_COLOR_PALETTE[index], colorIndex: index }
  })
}

export default function useSeriesColors(series) {
  return useMemo(() => assignSeriesColors(series), [series])
}
