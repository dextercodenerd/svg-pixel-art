<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { BRUSH_SIZES } from '../../types'
import type { BrushSize } from '../../types'

const editorStore = useEditorStore()
const { brushSize } = storeToRefs(editorStore)

function getPreviewBox(size: BrushSize) {
  const unitSize = size * 3
  const offset = (18 - unitSize) / 2

  return {
    offset,
    size: unitSize,
  }
}

const brushLabel = computed(() => `${brushSize.value} x ${brushSize.value}`)
</script>

<template>
  <section class="status-card">
    <span class="status-label">Brush</span>
    <strong class="status-value">{{ brushLabel }}</strong>
    <div class="brush-grid" role="group" aria-label="Brush size">
      <button
        v-for="size in BRUSH_SIZES"
        :key="size"
        type="button"
        class="brush-button"
        :data-active="size === brushSize"
        :aria-label="`${size} by ${size} brush`"
        @click="editorStore.setBrushSize(size)"
      >
        <svg viewBox="0 0 18 18" class="brush-icon" aria-hidden="true">
          <rect width="18" height="18" rx="4" fill="rgba(255,255,255,0.48)" />
          <rect
            :x="getPreviewBox(size).offset"
            :y="getPreviewBox(size).offset"
            :width="getPreviewBox(size).size"
            :height="getPreviewBox(size).size"
            rx="1.5"
            fill="currentColor"
          />
        </svg>
        <span>{{ size }}x{{ size }}</span>
      </button>
    </div>
    <span class="status-detail">Use `[` and `]` to cycle sizes.</span>
  </section>
</template>
