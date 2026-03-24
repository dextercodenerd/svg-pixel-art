// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { normalizeHexInput } from '../services/colorUtils'
import type { ActiveColorSlot } from '../types'

const COLOR_STORAGE_KEY = 'pixel-art:colors'

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

function readStoredColorsSafely(): { fg: string; bg: string } {
  const defaultColors = { fg: '#000000ff', bg: '#ffffffff' }
  const storage = getLocalStorage()
  if (storage == null) {
    return defaultColors
  }

  try {
    const rawValue = storage.getItem(COLOR_STORAGE_KEY)
    if (!rawValue) {
      return defaultColors
    }

    const parsed = JSON.parse(rawValue)
    if (typeof parsed !== 'object' || parsed == null) {
      return defaultColors
    }

    const fg = normalizeHexInput(parsed.fg) ?? defaultColors.fg
    const bg = normalizeHexInput(parsed.bg) ?? defaultColors.bg

    return { fg, bg }
  } catch {
    return defaultColors
  }
}

function writeStoredColorsSafely(fg: string, bg: string): boolean {
  const storage = getLocalStorage()
  if (storage == null) {
    return false
  }

  try {
    storage.setItem(COLOR_STORAGE_KEY, JSON.stringify({ fg, bg }))
    return true
  } catch {
    return false
  }
}

export const useColorStore = defineStore('color', () => {
  const initialState = readStoredColorsSafely()
  const fg = ref(initialState.fg)
  const bg = ref(initialState.bg)
  const activeSlot = ref<ActiveColorSlot>('fg')

  watch([fg, bg], ([newFg, newBg]) => {
    writeStoredColorsSafely(newFg, newBg)
  })

  function setFg(color: string) {
    const normalized = normalizeHexInput(color)
    if (normalized == null) {
      return
    }

    fg.value = normalized
  }

  function setBg(color: string) {
    const normalized = normalizeHexInput(color)
    if (normalized == null) {
      return
    }

    bg.value = normalized
  }

  function swap() {
    const nextFg = bg.value
    bg.value = fg.value
    fg.value = nextFg
  }

  function setActiveSlot(slot: ActiveColorSlot) {
    activeSlot.value = slot
  }

  return {
    fg,
    bg,
    activeSlot,
    setFg,
    setBg,
    swap,
    setActiveSlot,
  }
})
