<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import HsvPicker from './HsvPicker.vue'
import HexInput from './HexInput.vue'
import { useColorStore } from '../../stores/color'
import { formatHex, parseHex } from '../../services/colorUtils'
import { clampByte } from '../../utils/math'

const colorStore = useColorStore()

const activeColor = computed({
  get() {
    return colorStore.activeSlot === 'fg' ? colorStore.fg : colorStore.bg
  },
  set(next) {
    if (colorStore.activeSlot === 'fg') {
      colorStore.setFg(next)
      return
    }

    colorStore.setBg(next)
  },
})

const fgColor = computed({
  get() {
    return colorStore.fg
  },
  set(next: string) {
    colorStore.setFg(next)
  },
})

const bgColor = computed({
  get() {
    return colorStore.bg
  },
  set(next: string) {
    colorStore.setBg(next)
  },
})

const activeAlpha = computed({
  get() {
    const channels = parseHex(activeColor.value)
    return channels.a
  },
  set(next: number) {
    const channels = parseHex(activeColor.value)
    const a = clampByte(next)
    activeColor.value = formatHex({ ...channels, a })
  },
})
</script>

<template>
  <section class="status-card space-y-4">
    <div class="flex items-center justify-between gap-3">
      <span class="status-label">Color picker</span>

      <div class="flex items-center gap-2 text-xs">
        <span class="text-[var(--ink-soft)]">Editing</span>
        <div class="inline-flex rounded border border-[var(--panel-border)] bg-[var(--panel-inner)]">
          <button
            type="button"
            class="px-2 py-1 font-semibold"
            :data-active="colorStore.activeSlot === 'fg'"
            @click="colorStore.setActiveSlot('fg')"
          >
            FG
          </button>
          <button
            type="button"
            class="px-2 py-1 font-semibold"
            :data-active="colorStore.activeSlot === 'bg'"
            @click="colorStore.setActiveSlot('bg')"
          >
            BG
          </button>
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <HsvPicker v-model="activeColor" />

      <div class="space-y-2">
        <div class="flex items-center justify-between gap-3">
          <span class="status-label">Transparency</span>
          <span class="text-xs text-[var(--ink-soft)]">
            {{ Math.round((activeAlpha / 255) * 100) }}%
          </span>
        </div>
        <SliderRoot
          class="channel-slider-root"
          :model-value="[activeAlpha]"
          :max="255"
          :step="1"
          aria-label="Alpha channel"
          @update:model-value="values => (activeAlpha = values?.[0] ?? activeAlpha)"
        >
          <SliderTrack class="channel-slider-track">
            <SliderRange class="channel-slider-range" />
          </SliderTrack>
          <SliderThumb class="channel-slider-thumb" />
        </SliderRoot>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="space-y-1">
        <span class="status-label">FG hex</span>
        <HexInput v-model="fgColor" />
      </div>

      <div class="space-y-1">
        <span class="status-label">BG hex</span>
        <HexInput v-model="bgColor" />
      </div>
    </div>
  </section>
</template>

