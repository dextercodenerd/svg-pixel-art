<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { TooltipProvider } from 'reka-ui'
import FgBgDisplay from '../color/FgBgDisplay.vue'
import PalettePanel from '../color/PalettePanel.vue'
import ConfirmDialog from '../dialogs/ConfirmDialog.vue'
import NewDocumentDialog from '../dialogs/NewDocumentDialog.vue'
import CanvasViewport from './CanvasViewport.vue'
import StatusBar from './StatusBar.vue'
import ToolBar from './ToolBar.vue'
import TopToolbar from './TopToolbar.vue'
import { useAutoSave } from '../../composables/useAutoSave'
import { useDocumentExport } from '../../composables/useDocumentExport'
import { useImport } from '../../composables/useImport'
import { useKeyboard } from '../../composables/useKeyboard'
import { loadDraft } from '../../services/draftStorage'
import { useConfirmationDialog } from '../../services/confirmationService'
import { useColorStore } from '../../stores/color'
import { useEditorStore } from '../../stores/editor'
import { DEFAULT_DOCUMENT_NAME, EMPTY_PIXEL } from '../../types'

const editorStore = useEditorStore()
const colorStore = useColorStore()

const { document } = storeToRefs(editorStore)
const { fg } = storeToRefs(colorStore)
const autoSaveEnabled = ref(false)
const confirmationDialog = useConfirmationDialog()

const cursorCol = ref<number | null>(null)
const cursorRow = ref<number | null>(null)
const actionMessage = ref<string | null>(null)
const isNewDocumentDialogOpen = ref(false)

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
        fill: EMPTY_PIXEL,
        name: DEFAULT_DOCUMENT_NAME,
      })
    }
  }

  autoSaveEnabled.value = true
})
</script>

<template>
  <TooltipProvider :delay-duration="120">
    <div class="flex h-full w-full flex-col overflow-hidden">
      <TopToolbar
        :import-error="importError"
        :is-importing="isImporting"
        :status-message="actionMessage"
        @export-json="onExportJson"
        @export-svg="onExportSvg"
        @import="onImport"
        @new="openNewDocumentDialog"
      />
      <section
        class="grid flex-1 w-full gap-2 md:grid-cols-[68px_minmax(0,1fr)_300px] md:gap-3 overflow-hidden p-2 md:p-3"
      >
        <aside
          class="panel custom-scrollbar order-1 flex flex-col items-center overflow-y-auto overflow-x-hidden p-0.5 md:p-1"
        >
          <ToolBar />
          <div class="mt-4 w-full flex flex-col items-center gap-2">
            <FgBgDisplay compact />
          </div>
        </aside>

        <main
          class="panel order-2 flex min-h-[300px] min-w-0 flex-col overflow-hidden bg-[var(--app-bg)] bg-opacity-30"
        >
          <header class="px-4 py-4">
            <div>
              <p class="eyebrow">Viewport</p>
              <h2 class="mt-2 text-xl font-semibold tracking-tight">Canvas workspace</h2>
            </div>
          </header>

          <div class="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
            <CanvasViewport class="flex-1" @cursor-change="onCursorChange" />
          </div>

          <StatusBar :cursor-col="cursorCol" :cursor-row="cursorRow" />
        </main>

        <aside
          class="panel custom-scrollbar order-3 flex flex-col overflow-y-auto overflow-x-hidden p-4 md:p-5"
        >
          <div>
            <p class="eyebrow">Colors & Tools</p>
            <div class="mt-4 grid gap-3">
              <PalettePanel />
            </div>
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
    </div>
  </TooltipProvider>
</template>
```
