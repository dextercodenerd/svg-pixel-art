import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { DEFAULT_PALETTE_SWATCHES } from '../types'

const PALETTE_STORAGE_KEY = 'pixel-art:palette'
const MAX_SWATCHES = 32

function readStoredPalette(): string[] {
  if (typeof window === 'undefined') {
    return [...DEFAULT_PALETTE_SWATCHES]
  }

  const rawValue = window.localStorage.getItem(PALETTE_STORAGE_KEY)
  if (!rawValue) {
    return [...DEFAULT_PALETTE_SWATCHES]
  }

  try {
    const parsed = JSON.parse(rawValue)
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_PALETTE_SWATCHES]
    }

    return parsed
      .filter((value): value is string => typeof value === 'string')
      .slice(0, MAX_SWATCHES)
  } catch {
    return [...DEFAULT_PALETTE_SWATCHES]
  }
}

export const usePaletteStore = defineStore('palette', () => {
  const swatches = ref<string[]>(readStoredPalette())

  watch(
    swatches,
    value => {
      if (typeof window === 'undefined') {
        return
      }

      window.localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true },
  )

  function addSwatch(color: string) {
    if (swatches.value.length >= MAX_SWATCHES) {
      return
    }

    swatches.value.push(color)
  }

  function removeSwatch(index: number) {
    if (index < 0 || index >= swatches.value.length) {
      return
    }

    swatches.value.splice(index, 1)
  }

  function updateSwatch(index: number, color: string) {
    if (index < 0 || index >= swatches.value.length) {
      return
    }

    swatches.value[index] = color
  }

  return {
    swatches,
    addSwatch,
    removeSwatch,
    updateSwatch,
  }
})
