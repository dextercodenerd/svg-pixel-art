// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { DEFAULT_PALETTE_SWATCHES } from '../types'

const PALETTE_STORAGE_KEY = 'pixel-art:palette'
const MAX_SWATCHES = 32
type PersistenceStatus = 'unknown' | 'available' | 'unavailable'

function getLocalStorage(): Storage | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') {
      return null
    }

    return globalThis.localStorage
  } catch {
    return null
  }
}

function readStoredPaletteSafely(): { swatches: string[]; status: PersistenceStatus } {
  const storage = getLocalStorage()
  if (storage == null) {
    return {
      swatches: [...DEFAULT_PALETTE_SWATCHES],
      status: typeof window === 'undefined' ? 'unknown' : 'unavailable',
    }
  }

  try {
    const rawValue = storage.getItem(PALETTE_STORAGE_KEY)
    if (!rawValue) {
      return { swatches: [...DEFAULT_PALETTE_SWATCHES], status: 'available' }
    }

    const parsed = JSON.parse(rawValue)
    if (!Array.isArray(parsed)) {
      return { swatches: [...DEFAULT_PALETTE_SWATCHES], status: 'available' }
    }

    return {
      swatches: parsed
        .filter((value): value is string => typeof value === 'string')
        .slice(0, MAX_SWATCHES),
      status: 'available',
    }
  } catch {
    return { swatches: [...DEFAULT_PALETTE_SWATCHES], status: 'unavailable' }
  }
}

function writeStoredPaletteSafely(swatches: string[]): boolean {
  const storage = getLocalStorage()
  if (storage == null) {
    return false
  }

  try {
    storage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(swatches))
    return true
  } catch {
    return false
  }
}

export const usePaletteStore = defineStore('palette', () => {
  const initialState = readStoredPaletteSafely()
  const swatches = ref<string[]>(initialState.swatches)
  const persistenceStatus = ref<PersistenceStatus>(initialState.status)
  const persistenceNoticeDismissed = ref(false)

  watch(
    swatches,
    value => {
      if (writeStoredPaletteSafely(value)) {
        persistenceStatus.value = 'available'
        return
      }

      persistenceStatus.value = 'unavailable'
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

  function markPersistenceNoticeDismissed() {
    persistenceNoticeDismissed.value = true
  }

  return {
    swatches,
    persistenceStatus,
    persistenceNoticeDismissed,
    addSwatch,
    removeSwatch,
    updateSwatch,
    markPersistenceNoticeDismissed,
  }
})
