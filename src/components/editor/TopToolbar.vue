<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import {
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
  TooltipContent,
  TooltipPortal,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'
import BrushSizePicker from './BrushSizePicker.vue'
import DocumentActions from './DocumentActions.vue'
import { useEditorStore } from '../../stores/editor'
import { useHistoryStore } from '../../stores/history'
import { useZoom } from '../../composables/useZoom'

const editorStore = useEditorStore()
const { activeTool, gridVisible, zoom } = storeToRefs(editorStore)
const { canRedo, canUndo } = storeToRefs(useHistoryStore())
const { resetZoom, zoomIn, zoomOut } = useZoom()

const props = defineProps<{
  importError: string | null
  isImporting: boolean
  statusMessage: string | null
}>()

const emit = defineEmits<{
  exportJson: []
  exportSvg: []
  import: []
  new: []
}>()

const isMenuOpen = ref(false)

function onMenuAction(action: 'exportJson' | 'exportSvg' | 'import' | 'new') {
  isMenuOpen.value = false
  ;(emit as (e: typeof action) => void)(action)
}

const showBrushSize = computed(() => {
  return ['pencil', 'eraser', 'line'].includes(activeTool.value)
})
</script>

<template>
  <header class="top-toolbar">
    <!-- Main Menu Panel -->
    <div class="toolbar-panel">
      <PopoverRoot v-model:open="isMenuOpen">
        <PopoverTrigger as-child>
          <button type="button" class="toolbar-button" aria-label="Menu">
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
              <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z" />
            </svg>
          </button>
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent side="bottom" :side-offset="8" class="menu-popover z-[100]">
            <DocumentActions
              :import-error="importError"
              :is-importing="isImporting"
              :status-message="statusMessage"
              @export-json="onMenuAction('exportJson')"
              @export-svg="onMenuAction('exportSvg')"
              @import="onMenuAction('import')"
              @new="onMenuAction('new')"
            />
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
    </div>

    <!-- History Panel -->
    <div class="toolbar-panel">
      <TooltipRoot>
        <TooltipTrigger as-child>
          <button
            type="button"
            class="toolbar-button"
            :disabled="!canUndo"
            @click="editorStore.applyUndo()"
          >
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
              <path d="M12 12H4v-2l-4 3 4 3v-2h10V8h-2v4z" />
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
            Undo · Ctrl+Z
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>

      <TooltipRoot>
        <TooltipTrigger as-child>
          <button
            type="button"
            class="toolbar-button"
            :disabled="!canRedo"
            @click="editorStore.applyRedo()"
          >
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
              <path d="M4 4h8v2l4-3-4-3v2H2v6h2V4z" />
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
            Redo · Ctrl+Shift+Z
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </div>

    <!-- View Panel -->
    <div class="toolbar-panel">
      <TooltipRoot>
        <TooltipTrigger as-child>
          <button
            type="button"
            class="toolbar-button px-3 w-auto gap-2"
            :data-active="gridVisible"
            @click="editorStore.toggleGrid()"
          >
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
              <path
                d="M1 1h6v6H1V1zm1 1v4h4V2H2zM9 1h6v6H9V1zm1 1v4h4V2h-4zM1 9h6v6H1V9zm1 1v4h4v-4H2zm7-1h6v6H9V9zm1 1v4h4v-4h-4z"
              />
            </svg>
            <span class="text-xs font-bold uppercase transition-all"
              >Grid {{ gridVisible ? 'On' : 'Off' }}</span
            >
          </button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
            Toggle Grid ({{ gridVisible ? 'On' : 'Off' }}) · G
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>

      <div class="toolbar-separator" />

      <TooltipRoot>
        <TooltipTrigger as-child>
          <button type="button" class="toolbar-button" @click="zoomOut()">-</button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
            Zoom out · -
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>

      <TooltipRoot>
        <TooltipTrigger as-child>
          <button type="button" class="toolbar-button font-bold text-xs" @click="resetZoom()">
            {{ zoom }}x
          </button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
            Reset zoom · 0
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>

      <TooltipRoot>
        <TooltipTrigger as-child>
          <button type="button" class="toolbar-button" @click="zoomIn()">+</button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
            Zoom in · +
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </div>

    <!-- Tool Context Panel -->
    <div v-if="showBrushSize" class="toolbar-panel">
      <BrushSizePicker />
    </div>

    <div class="flex-1" />

    <!-- Document Info? Future? -->
    <div class="toolbar-panel px-4 py-2 hidden md:flex items-center gap-2">
      <span class="status-label text-[10px]">Document</span>
      <span class="text-sm font-semibold truncate max-w-[150px]">{{
        editorStore.document.metadata.name
      }}</span>
    </div>
  </header>
</template>

<style scoped>
.top-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem;
  background: var(--app-bg);
  border-bottom: 2px solid var(--panel-border-strong);
  z-index: 50;
}

.toolbar-panel {
  display: flex;
  align-items: center;
  background: var(--panel);
  border-top: 2px solid white;
  border-left: 2px solid white;
  border-right: 2px solid var(--panel-border-strong);
  border-bottom: 2px solid var(--panel-border-strong);
  padding: 2px;
}

.toolbar-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  background: transparent;
  border: none;
  color: var(--ink-strong);
  cursor: pointer;
}

.toolbar-button:hover:not(:disabled) {
  background: var(--app-bg-accent);
}

.toolbar-button[data-active='true'] {
  background: var(--app-bg-accent);
  box-shadow: inset 2px 2px 0 rgba(0, 0, 0, 0.2);
}

.toolbar-button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.toolbar-separator {
  width: 2px;
  height: 1.5rem;
  background: var(--panel-border);
  margin: 0 0.25rem;
  opacity: 0.2;
}

/* Ensure the font matches pixel art style for zoom display */
.toolbar-button.font-bold {
  font-family: 'LazyFoxPixel', monospace;
}

.menu-popover {
  min-width: 280px;
  animation: slideDown 0.2s ease-out;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
