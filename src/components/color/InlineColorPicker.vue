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
        <div class="segmented-control">
          <button
            type="button"
            class="segmented-control-item !min-h-0 p-1.5 text-[10px]"
            :data-active="colorStore.activeSlot === 'fg'"
            @click="colorStore.setActiveSlot('fg')"
          >
            FG
          </button>
          <button
            type="button"
            class="segmented-control-item !min-h-0 p-1.5 text-[10px]"
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
        </div>
        <SliderRoot
          class="channel-slider-root channel-slider-root-alpha"
          :model-value="[activeAlpha]"
          :max="255"
          :step="1"
          aria-label="Alpha channel"
          @update:model-value="values => (activeAlpha = values?.[0] ?? activeAlpha)"
        >
          <SliderTrack class="channel-slider-track channel-slider-track-alpha checkerboard-surface">
            <SliderRange class="channel-slider-range channel-slider-range-alpha" />
          </SliderTrack>
          <SliderThumb class="channel-slider-thumb channel-slider-thumb-alpha" />
        </SliderRoot>
      </div>
    </div>

    <div class="space-y-3">
      <div class="space-y-1">
        <span class="status-label">Foreground hex</span>
        <HexInput v-model="fgColor" :color="fgColor" />
      </div>

      <div class="space-y-1">
        <span class="status-label">Background hex</span>
        <HexInput v-model="bgColor" :color="bgColor" />
      </div>
    </div>
  </section>
</template>
