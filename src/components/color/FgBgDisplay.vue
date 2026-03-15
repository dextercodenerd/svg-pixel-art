<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import ColorPicker from './ColorPicker.vue'
import { useColorStore } from '../../stores/color'

const colorStore = useColorStore()
const { bg, fg } = storeToRefs(colorStore)

const fgStyle = computed(() => ({ backgroundColor: fg.value }))
const bgStyle = computed(() => ({ backgroundColor: bg.value }))
</script>

<template>
  <section class="status-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <span class="status-label">Colors</span>
        <strong class="status-value mt-1 block">Foreground / background</strong>
      </div>
      <button type="button" class="editor-button !min-h-0 px-3 py-2" @click="colorStore.swap()">
        Swap
      </button>
    </div>

    <div class="relative mt-4 h-32">
      <ColorPicker
        title="Foreground color"
        description="Applies on left click and the active touch slot."
        :model-value="fg"
        @confirm="colorStore.setFg"
      >
        <button type="button" class="color-slot color-slot-front checkerboard-surface">
          <span class="color-preview-fill" :style="fgStyle" />
          <span class="color-slot-label">FG</span>
        </button>
      </ColorPicker>

      <ColorPicker
        title="Background color"
        description="Applies on right click and when BG is the active touch slot."
        :model-value="bg"
        @confirm="colorStore.setBg"
      >
        <button type="button" class="color-slot color-slot-back checkerboard-surface">
          <span class="color-preview-fill" :style="bgStyle" />
          <span class="color-slot-label">BG</span>
        </button>
      </ColorPicker>
    </div>

    <div class="grid gap-2 text-sm text-[var(--ink-soft)]">
      <span><strong class="text-[var(--ink-strong)]">FG</strong> {{ fg }}</span>
      <span><strong class="text-[var(--ink-strong)]">BG</strong> {{ bg }}</span>
      <span>Press `X` to swap the slots instantly.</span>
    </div>
  </section>
</template>
