// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { normalizeHexInput } from '../services/colorUtils'
import type { ActiveColorSlot } from '../types'

export const useColorStore = defineStore('color', () => {
  const fg = ref('#000000ff')
  const bg = ref('#ffffffff')
  const activeSlot = ref<ActiveColorSlot>('fg')

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
