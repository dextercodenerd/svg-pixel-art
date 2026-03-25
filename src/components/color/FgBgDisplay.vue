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

defineProps<{
  compact?: boolean
}>()

const colorStore = useColorStore()
const { bg, fg } = storeToRefs(colorStore)

const fgStyle = computed(() => ({ backgroundColor: fg.value }))
const bgStyle = computed(() => ({ backgroundColor: bg.value }))
</script>

<template>
  <section :class="['status-card', compact && '!p-1 !gap-1']">
    <div v-if="!compact" class="flex items-start justify-between gap-3">
      <div>
        <span class="status-label">Colors</span>
        <strong class="status-value mt-1 block">Foreground / background</strong>
      </div>
      <button type="button" class="editor-button !min-h-0 px-3 py-2" @click="colorStore.swap()">
        Swap
      </button>
    </div>

    <!-- Centered relative container for mobile/sidebar -->
    <div :class="['relative mx-auto', compact ? 'h-12 w-12 mt-1' : 'h-32 mt-4']">
      <!-- Secondary Color (Back) -->
      <ColorPicker
        title="Background color"
        description="Applies on right click and when BG is the active touch slot."
        :model-value="bg"
        @confirm="colorStore.setBg"
      >
        <button
          type="button"
          :class="[
            'color-slot color-slot-back checkerboard-surface',
            compact && 'color-slot-compact',
          ]"
        >
          <span class="color-preview-fill" :style="bgStyle" />
          <span v-if="!compact" class="color-slot-label">BG</span>
        </button>
      </ColorPicker>

      <!-- Primary Color (Front) - Rendered last for top z-index -->
      <ColorPicker
        title="Foreground color"
        description="Applies on left click and the active touch slot."
        :model-value="fg"
        @confirm="colorStore.setFg"
      >
        <button
          type="button"
          :class="[
            'color-slot color-slot-front checkerboard-surface',
            compact && 'color-slot-compact',
          ]"
        >
          <span class="color-preview-fill" :style="fgStyle" />
          <span v-if="!compact" class="color-slot-label">FG</span>
        </button>
      </ColorPicker>
    </div>

    <!-- Centered Swap Button -->
    <div v-if="compact" class="mt-2 flex justify-center">
      <button
        type="button"
        class="icon-only-button"
        title="Swap Colors (X)"
        @click="colorStore.swap()"
      >
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
          <path d="M12 4h-2V2l4 3-4 3V6H4v4H2V4h10zM4 12h2v2l-4-3 4-3v2h8V8h2v4H4z" />
        </svg>
      </button>
    </div>

    <div v-if="!compact" class="grid gap-2 text-sm text-[var(--ink-soft)]">
      <span><strong class="text-[var(--ink-strong)]">FG</strong> {{ fg }}</span>
      <span><strong class="text-[var(--ink-strong)]">BG</strong> {{ bg }}</span>
      <span>Press `X` to swap the slots instantly.</span>
    </div>
  </section>
</template>
