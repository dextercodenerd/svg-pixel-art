<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'
import ActiveColorSlotToggle from '../color/ActiveColorSlotToggle.vue'
import FgBgDisplay from '../color/FgBgDisplay.vue'
import PalettePanel from '../color/PalettePanel.vue'
import ConfirmDialog from '../dialogs/ConfirmDialog.vue'
import NewDocumentDialog from '../dialogs/NewDocumentDialog.vue'
import BrushSizePicker from './BrushSizePicker.vue'
import CanvasViewport from './CanvasViewport.vue'
import DocumentActions from './DocumentActions.vue'
import StatusBar from './StatusBar.vue'
import ToolBar from './ToolBar.vue'
import { useAutoSave } from '../../composables/useAutoSave'
import { useDocumentExport } from '../../composables/useDocumentExport'
import { useImport } from '../../composables/useImport'
import { useKeyboard } from '../../composables/useKeyboard'
import { useZoom } from '../../composables/useZoom'
import { loadDraft } from '../../services/draftStorage'
import { useConfirmationDialog } from '../../services/confirmationService'
import { useColorStore } from '../../stores/color'
import { useEditorStore } from '../../stores/editor'
import { useHistoryStore } from '../../stores/history'
import { BASE_PIXEL_SIZE, DEFAULT_DOCUMENT_NAME } from '../../types'

const editorStore = useEditorStore()
const colorStore = useColorStore()

const { document, gridVisible, zoom } = storeToRefs(editorStore)
const { fg } = storeToRefs(colorStore)
const { canRedo, canUndo } = storeToRefs(useHistoryStore())
const { resetZoom, zoomIn, zoomOut } = useZoom()
const autoSaveEnabled = ref(false)
const confirmationDialog = useConfirmationDialog()

const cursorCol = ref<number | null>(null)
const cursorRow = ref<number | null>(null)
const actionMessage = ref<string | null>(null)
const isNewDocumentDialogOpen = ref(false)

const effectivePixelSize = computed(() => BASE_PIXEL_SIZE * zoom.value)
const documentSummary = computed(() => `${document.value.width} x ${document.value.height}`)
const isAnyDialogOpen = computed(
  () => confirmationDialog.isOpen.value || isNewDocumentDialogOpen.value,
)

const { exportJson, exportSvg } = useDocumentExport()
const { importError, isImporting, onFileChange, setFileInputElement, triggerImport } = useImport({
  onImportSuccess() {
    actionMessage.value = 'Document imported.'
  },
})

useAutoSave({ enabled: autoSaveEnabled })
useKeyboard({
  exportJson: onExportJson,
  exportSvg: onExportSvg,
  importDocument: onImport,
  isDialogOpen: () => isAnyDialogOpen.value,
})

function onCursorChange(payload: { col: number | null; row: number | null }) {
  cursorCol.value = payload.col
  cursorRow.value = payload.row
}

function openNewDocumentDialog() {
  actionMessage.value = null
  isNewDocumentDialogOpen.value = true
}

function onNewDialogOpenChange(nextOpen: boolean) {
  isNewDocumentDialogOpen.value = nextOpen
}

function onNewDocumentCreated() {
  actionMessage.value = 'New document created.'
}

function onImport() {
  actionMessage.value = null
  triggerImport()
}

function onExportJson() {
  actionMessage.value = null
  const filename = exportJson(document.value)
  actionMessage.value = `Exported ${filename}.`
}

function onExportSvg() {
  actionMessage.value = null
  const filename = exportSvg(document.value)
  actionMessage.value = `Exported ${filename}.`
}

onMounted(() => {
  if (editorStore.isInitialState) {
    const draft = loadDraft()

    if (draft != null) {
      editorStore.replaceDocument(draft)
    } else {
      editorStore.newDocument({
        width: 32,
        height: 32,
        fill: 0,
        name: DEFAULT_DOCUMENT_NAME,
      })
    }
  }

  autoSaveEnabled.value = true
})
</script>

<template>
  <TooltipProvider :delay-duration="120">
    <section class="grid h-full gap-3 md:grid-cols-[240px_minmax(0,1fr)_240px] md:gap-4">
      <main class="panel order-1 flex min-h-[420px] min-w-0 flex-col overflow-hidden md:order-2">
        <header
          class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--panel-border)] px-4 py-4"
        >
          <div>
            <p class="eyebrow">Viewport</p>
            <h2 class="mt-2 text-xl font-semibold tracking-tight">Canvas workspace</h2>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <TooltipRoot>
              <TooltipTrigger as-child>
                <button
                  type="button"
                  class="editor-button"
                  :disabled="!canUndo"
                  @click="editorStore.applyUndo()"
                >
                  Undo
                </button>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent side="top" :side-offset="10" class="editor-tooltip">
                  Undo · Ctrl/Cmd+Z
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>

            <TooltipRoot>
              <TooltipTrigger as-child>
                <button
                  type="button"
                  class="editor-button"
                  :disabled="!canRedo"
                  @click="editorStore.applyRedo()"
                >
                  Redo
                </button>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent side="top" :side-offset="10" class="editor-tooltip">
                  Redo · Ctrl/Cmd+Shift+Z
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>

            <TooltipRoot>
              <TooltipTrigger as-child>
                <button type="button" class="editor-button" @click="zoomOut()">-</button>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent side="top" :side-offset="10" class="editor-tooltip">
                  Zoom out · -
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>

            <TooltipRoot>
              <TooltipTrigger as-child>
                <button type="button" class="editor-button" @click="resetZoom()">1x</button>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent side="top" :side-offset="10" class="editor-tooltip">
                  Reset zoom · 0
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>

            <TooltipRoot>
              <TooltipTrigger as-child>
                <button type="button" class="editor-button" @click="zoomIn()">+</button>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent side="top" :side-offset="10" class="editor-tooltip">
                  Zoom in · +
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>

            <TooltipRoot>
              <TooltipTrigger as-child>
                <button type="button" class="editor-button" @click="editorStore.toggleGrid()">
                  Grid {{ gridVisible ? 'on' : 'off' }}
                </button>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent side="top" :side-offset="10" class="editor-tooltip">
                  Toggle grid · G
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>
          </div>
        </header>

        <div class="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
          <CanvasViewport class="flex-1" @cursor-change="onCursorChange" />
        </div>

        <StatusBar :cursor-col="cursorCol" :cursor-row="cursorRow" />
      </main>

      <aside class="panel order-2 p-4 md:order-1 md:p-5">
        <p class="eyebrow">Document</p>
        <h1 class="mt-3 text-2xl font-semibold tracking-tight">SVG Pixel Art</h1>
        <div class="mt-5">
          <DocumentActions
            :import-error="importError"
            :is-importing="isImporting"
            :status-message="actionMessage"
            @export-json="onExportJson"
            @export-svg="onExportSvg"
            @import="onImport"
            @new="openNewDocumentDialog"
          />
        </div>
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
          Phase 6 completes the keyboard map, replacement dialogs, and final responsive polish.
        </div>
      </aside>

      <aside class="panel order-3 p-4 md:p-5">
        <p class="eyebrow">Tools</p>
        <h2 class="mt-3 text-2xl font-semibold tracking-tight">Editor state</h2>

        <div class="mt-5">
          <ToolBar />
        </div>

        <div class="mt-5 grid gap-3">
          <BrushSizePicker />
          <FgBgDisplay />
          <ActiveColorSlotToggle />
          <PalettePanel />
        </div>
      </aside>

      <input
        :ref="setFileInputElement"
        type="file"
        accept=".json,.png"
        class="hidden"
        @change="onFileChange"
      />

      <ConfirmDialog />
      <NewDocumentDialog
        :open="isNewDocumentDialogOpen"
        :initial-fill-color="fg"
        @created="onNewDocumentCreated"
        @update:open="onNewDialogOpenChange"
      />
    </section>
  </TooltipProvider>
</template>
