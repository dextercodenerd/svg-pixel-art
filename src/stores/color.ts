// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ActiveColorSlot } from '../types'

export const useColorStore = defineStore('color', () => {
  const fg = ref('#000000ff')
  const bg = ref('#ffffffff')
  const activeSlot = ref<ActiveColorSlot>('fg')

  function setFg(color: string) {
    fg.value = color
  }

  function setBg(color: string) {
    bg.value = color
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
