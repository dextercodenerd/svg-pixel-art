<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui'
import { useEditorStore } from '../../stores/editor'
import { getPreviewBox } from '../../utils/math'
import { BRUSH_SIZES } from '../../types'

const editorStore = useEditorStore()
const { rectangleStrokeSlot, rectangleStrokeWidth, rectangleFillSlot } = storeToRefs(editorStore)
</script>

<template>
  <div class="rectangle-config-group" role="group" aria-label="Rectangle tool configuration">
    <!-- Stroke Color -->
    <div class="config-section">
      <span class="section-label">Stroke</span>
      <div class="toggle-group">
        <TooltipRoot>
          <TooltipTrigger as-child>
            <button
              type="button"
              class="config-button"
              :data-active="rectangleStrokeSlot === 'fg'"
              @click="editorStore.setRectangleStrokeSlot('fg')"
            >
              FG
            </button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
              Stroke color: Foreground
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
        <TooltipRoot>
          <TooltipTrigger as-child>
            <button
              type="button"
              class="config-button"
              :data-active="rectangleStrokeSlot === 'bg'"
              @click="editorStore.setRectangleStrokeSlot('bg')"
            >
              BG
            </button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
              Stroke color: Background
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
      </div>
    </div>

    <div class="config-separator" />

    <!-- Stroke Width -->
    <div class="config-section">
      <span class="section-label">Size</span>
      <div class="toggle-group">
        <TooltipRoot v-for="size in BRUSH_SIZES" :key="size">
          <TooltipTrigger as-child>
            <button
              type="button"
              class="config-button-small"
              :data-active="size === rectangleStrokeWidth"
              @click="editorStore.setRectangleStrokeWidth(size)"
            >
              <svg
                viewBox="0 0 18 18"
                class="brush-icon"
                aria-hidden="true"
                style="shape-rendering: crispEdges"
              >
                <rect
                  :x="getPreviewBox(size).offset"
                  :y="getPreviewBox(size).offset"
                  :width="getPreviewBox(size).size"
                  :height="getPreviewBox(size).size"
                  fill="currentColor"
                />
              </svg>
            </button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
              Stroke width: {{ size }}px
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
      </div>
    </div>

    <div class="config-separator" />

    <!-- Fill Color -->
    <div class="config-section">
      <span class="section-label">Fill</span>
      <div class="toggle-group">
        <TooltipRoot>
          <TooltipTrigger as-child>
            <button
              type="button"
              class="config-button px-2"
              :data-active="rectangleFillSlot === 'transparent'"
              @click="editorStore.setRectangleFillSlot('transparent')"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="2" />
                <rect
                  x="0"
                  y="0"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1"
                />
              </svg>
            </button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
              Fill color: Transparent
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
        <TooltipRoot>
          <TooltipTrigger as-child>
            <button
              type="button"
              class="config-button"
              :data-active="rectangleFillSlot === 'fg'"
              @click="editorStore.setRectangleFillSlot('fg')"
            >
              FG
            </button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
              Fill color: Foreground
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
        <TooltipRoot>
          <TooltipTrigger as-child>
            <button
              type="button"
              class="config-button"
              :data-active="rectangleFillSlot === 'bg'"
              @click="editorStore.setRectangleFillSlot('bg')"
            >
              BG
            </button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
              Fill color: Background
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rectangle-config-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.5rem;
}

.config-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.section-label {
  font-size: 8px;
  font-weight: bold;
  text-transform: uppercase;
  color: var(--ink-muted);
  pointer-events: none;
}

.toggle-group {
  display: flex;
  align-items: center;
  gap: 1px;
  background: var(--panel-border);
  padding: 1px;
}

.config-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 1.5rem;
  background: var(--panel);
  border: none;
  color: var(--ink-strong);
  font-family: 'LazyFoxPixel', monospace;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
}

.config-button-small {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: var(--panel);
  border: none;
  color: var(--ink-strong);
  cursor: pointer;
}

.config-button:hover,
.config-button-small:hover {
  background: var(--app-bg-accent);
}

.config-button[data-active='true'],
.config-button-small[data-active='true'] {
  background: var(--ink-strong);
  color: var(--panel);
}

.brush-icon {
  width: 12px;
  height: 12px;
}

.config-separator {
  width: 2px;
  height: 2rem;
  background: var(--panel-border);
  opacity: 0.2;
}
</style>
