<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import {
} from 'vue'
import {
  TooltipContent,
  TooltipPortal,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'
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

</script>

<template>
  <div class="brush-toolbar-group" role="group" aria-label="Brush size">
    <TooltipRoot v-for="size in BRUSH_SIZES" :key="size">
      <TooltipTrigger as-child>
        <button
          type="button"
          class="brush-toolbar-button"
          :data-active="size === brushSize"
          :aria-label="`${size} by ${size} brush`"
          @click="editorStore.setBrushSize(size)"
        >
          <svg
            viewBox="0 0 18 18"
            class="brush-toolbar-icon"
            aria-hidden="true"
            style="shape-rendering: crispEdges"
          >
            <rect width="18" height="18" fill="rgba(255,255,255,0.48)" />
            <rect
              :x="getPreviewBox(size).offset"
              :y="getPreviewBox(size).offset"
              :width="getPreviewBox(size).size"
              :height="getPreviewBox(size).size"
              fill="currentColor"
            />
          </svg>
          <span class="text-[10px] font-bold">{{ size }}</span>
        </button>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
          Brush size {{ size }}x{{ size }}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </div>
</template>

<style scoped>
.brush-toolbar-group {
  display: flex;
  align-items: center;
  gap: 1px;
}

.brush-toolbar-button {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  background: transparent;
  border: none;
  color: var(--ink-strong);
  cursor: pointer;
  padding: 2px;
}

.brush-toolbar-button:hover:not(:disabled) {
  background: var(--app-bg-accent);
}

.brush-toolbar-button[data-active='true'] {
  background: var(--app-bg-accent);
  box-shadow: inset 1px 1px 0 rgba(0, 0, 0, 0.1);
}

.brush-toolbar-icon {
  width: 1.1rem;
  height: 1.1rem;
}
</style>
