<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CanvasViewport from './CanvasViewport.vue'
import StatusBar from './StatusBar.vue'
import { useZoom } from '../../composables/useZoom'
import { useColorStore } from '../../stores/color'
import { useEditorStore } from '../../stores/editor'
import { useHistoryStore } from '../../stores/history'
import { BASE_PIXEL_SIZE } from '../../types'
import { isEditableTarget } from '../../utils/dom'
import type { ToolId } from '../../types'

const editorStore = useEditorStore()
const colorStore = useColorStore()
const historyStore = useHistoryStore()

const { activeTool, brushSize, document, gridVisible, zoom } = storeToRefs(editorStore)
const { fg, bg, activeSlot } = storeToRefs(colorStore)
const { canRedo, canUndo } = storeToRefs(historyStore)
const { resetZoom, zoomIn, zoomOut } = useZoom()

const cursorCol = ref<number | null>(null)
const cursorRow = ref<number | null>(null)

const effectivePixelSize = computed(() => BASE_PIXEL_SIZE * zoom.value)
const documentSummary = computed(() => `${document.value.width} x ${document.value.height}`)

const tools: ToolId[] = ['pencil', 'eraser', 'line', 'fill', 'eyedropper']

function onCursorChange(payload: { col: number | null; row: number | null }) {
  cursorCol.value = payload.col
  cursorRow.value = payload.row
}

function onWindowKeyDown(event: KeyboardEvent) {
  if (isEditableTarget(event.target)) {
    return
  }

  if ((event.key === '+' || event.key === '=') && !event.metaKey && !event.ctrlKey) {
    zoomIn()
    event.preventDefault()
    return
  }

  if ((event.key === '-' || event.key === '_') && !event.metaKey && !event.ctrlKey) {
    zoomOut()
    event.preventDefault()
    return
  }

  if (event.key === '0' && !event.metaKey && !event.ctrlKey) {
    resetZoom()
    event.preventDefault()
    return
  }

  if ((event.key === 'g' || event.key === 'G') && !event.metaKey && !event.ctrlKey) {
    editorStore.toggleGrid()
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
  <section class="grid h-full gap-4 md:grid-cols-[240px_minmax(0,1fr)_240px]">
    <aside class="panel order-2 p-5 md:order-1">
      <p class="eyebrow">Document</p>
      <h1 class="mt-3 text-2xl font-semibold tracking-tight">SVG Pixel Art</h1>
      <div class="mt-5 space-y-3">
        <div class="status-card">
          <span class="status-label">Name</span>
          <strong class="status-value">{{ document.metadata.name }}</strong>
          <span class="status-detail">{{ documentSummary }}</span>
        </div>
        <div class="status-card">
          <span class="status-label">History</span>
          <strong class="status-value">Undo {{ canUndo ? 'ready' : 'empty' }}</strong>
          <span class="status-detail">Redo {{ canRedo ? 'ready' : 'empty' }}</span>
        </div>
        <div class="status-card">
          <span class="status-label">Viewport</span>
          <strong class="status-value">{{ zoom }}x / {{ effectivePixelSize }}px</strong>
          <span class="status-detail">Grid {{ gridVisible ? 'visible' : 'hidden' }}</span>
        </div>
      </div>
      <div
        class="mt-6 rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel-inner)] p-4 text-sm text-[var(--ink-soft)]"
      >
        Phase 2 focuses on the viewport foundation, so document actions stay as placeholders here
        until import, export, and dialogs arrive.
      </div>
    </aside>

    <main class="panel order-1 flex min-h-[560px] min-w-0 flex-col overflow-hidden md:order-2">
      <header
        class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--panel-border)] px-4 py-4"
      >
        <div>
          <p class="eyebrow">Viewport</p>
          <h2 class="mt-2 text-xl font-semibold tracking-tight">Canvas workspace</h2>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="editor-button" @click="zoomOut()">-</button>
          <button type="button" class="editor-button" @click="resetZoom()">1x</button>
          <button type="button" class="editor-button" @click="zoomIn()">+</button>
          <button type="button" class="editor-button" @click="editorStore.toggleGrid()">
            Grid {{ gridVisible ? 'on' : 'off' }}
          </button>
        </div>
      </header>

      <div class="flex min-h-0 flex-1 flex-col p-4">
        <CanvasViewport class="flex-1" @cursor-change="onCursorChange" />
      </div>

      <StatusBar :cursor-col="cursorCol" :cursor-row="cursorRow" />
    </main>

    <aside class="panel order-3 p-5">
      <p class="eyebrow">Tools</p>
      <h2 class="mt-3 text-2xl font-semibold tracking-tight">Editor state</h2>

      <div class="mt-5 grid grid-cols-2 gap-2">
        <button
          v-for="tool in tools"
          :key="tool"
          type="button"
          class="tool-button capitalize"
          :data-active="tool === activeTool"
          @click="editorStore.setTool(tool)"
        >
          {{ tool }}
        </button>
      </div>

      <div class="mt-5 grid gap-3">
        <div class="status-card">
          <span class="status-label">Brush</span>
          <strong class="status-value">{{ brushSize }} x {{ brushSize }}</strong>
          <span class="status-detail">Cursor size follows the active paint tool.</span>
        </div>
        <div class="status-card">
          <span class="status-label">Active colors</span>
          <strong class="status-value">{{ activeSlot.toUpperCase() }}</strong>
          <div class="mt-3 flex gap-3">
            <span class="swatch-chip" :style="{ backgroundColor: fg }" title="Foreground" />
            <span class="swatch-chip" :style="{ backgroundColor: bg }" title="Background" />
          </div>
          <span class="status-detail">FG {{ fg }} • BG {{ bg }}</span>
        </div>
      </div>
    </aside>
  </section>
</template>
