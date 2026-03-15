<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import ColorPicker from './ColorPicker.vue'
import ColorSwatch from './ColorSwatch.vue'
import { useColorStore } from '../../stores/color'
import { usePaletteStore } from '../../stores/palette'
import { MAX_PALETTE_SWATCHES } from '../../types'

const colorStore = useColorStore()
const paletteStore = usePaletteStore()

const { fg } = storeToRefs(colorStore)
const { persistenceStatus, swatches } = storeToRefs(paletteStore)
</script>

<template>
  <section class="status-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <span class="status-label">Palette</span>
        <strong class="status-value mt-1 block"
          >{{ swatches.length }} / {{ MAX_PALETTE_SWATCHES }}</strong
        >
      </div>
      <button
        type="button"
        class="editor-button !min-h-0 px-3 py-2"
        :disabled="swatches.length >= MAX_PALETTE_SWATCHES"
        @click="paletteStore.addSwatch(fg)"
      >
        +
      </button>
    </div>

    <div class="palette-grid mt-4">
      <div v-for="(swatch, index) in swatches" :key="`${swatch}-${index}`" class="group relative">
        <ColorSwatch :color="swatch" :label="`Palette swatch ${index + 1}`" />
        <div class="swatch-actions">
          <ColorPicker
            :model-value="swatch"
            title="Edit swatch"
            description="Update this palette slot without changing FG or BG."
            @confirm="paletteStore.updateSwatch(index, $event)"
          >
            <button type="button" class="swatch-action-button" aria-label="Edit swatch">E</button>
          </ColorPicker>
          <button
            type="button"
            class="swatch-action-button"
            aria-label="Remove swatch"
            @click="paletteStore.removeSwatch(index)"
          >
            -
          </button>
        </div>
      </div>
    </div>

    <span class="status-detail">
      Left click sends a swatch to FG. Right click sends it to BG.
    </span>
    <span class="status-detail">
      {{
        persistenceStatus === 'available'
          ? 'Palette is stored locally and restored on reload.'
          : 'Local palette storage is unavailable in this browser context.'
      }}
    </span>
  </section>
</template>
