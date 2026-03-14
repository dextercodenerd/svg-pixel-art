<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { isEditableTarget } from '../../utils/dom'
import type { BrushSize } from '../../types'

const editorStore = useEditorStore()
const { brushSize } = storeToRefs(editorStore)

const brushSizes: BrushSize[] = [1, 2, 3, 4]

function getPreviewBox(size: BrushSize) {
  const unitSize = size * 3
  const offset = (18 - unitSize) / 2

  return {
    offset,
    size: unitSize,
  }
}

const brushLabel = computed(() => `${brushSize.value} x ${brushSize.value}`)

function stepBrushSize(direction: -1 | 1) {
  const currentIndex = brushSizes.indexOf(brushSize.value)
  const nextIndex = Math.min(brushSizes.length - 1, Math.max(0, currentIndex + direction))
  const nextSize = brushSizes[nextIndex]

  if (nextSize != null) {
    editorStore.setBrushSize(nextSize)
  }
}

function onWindowKeyDown(event: KeyboardEvent) {
  if (isEditableTarget(event.target)) {
    return
  }

  if (event.key === '[') {
    stepBrushSize(-1)
    event.preventDefault()
    return
  }

  if (event.key === ']') {
    stepBrushSize(1)
    event.preventDefault()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onWindowKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeyDown)
})
</script>

<template>
  <section class="status-card">
    <span class="status-label">Brush</span>
    <strong class="status-value">{{ brushLabel }}</strong>
    <div class="brush-grid" role="group" aria-label="Brush size">
      <button
        v-for="size in brushSizes"
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
