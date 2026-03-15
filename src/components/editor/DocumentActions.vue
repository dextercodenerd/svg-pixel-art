<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useImport } from '../../composables/useImport'
import { saveDraft } from '../../services/draftStorage'
import { documentToJson, documentToSvg, getDocumentFilename } from '../../services/exportService'
import { useEditorStore } from '../../stores/editor'
import { DEFAULT_DOCUMENT_NAME, EMPTY_PIXEL } from '../../types'

const editorStore = useEditorStore()
const { document: editorDocument } = storeToRefs(editorStore)
const { importError, isImporting, onFileChange, setFileInputElement, triggerImport } = useImport()

const draftName = ref(editorDocument.value.metadata.name)
const actionMessage = ref<string | null>(null)
const hasPendingNameChange = ref(false)

const documentDimensions = computed(
  () => `${editorDocument.value.width} x ${editorDocument.value.height}`,
)

watch(
  editorDocument,
  nextDocument => {
    hasPendingNameChange.value = false
    draftName.value = nextDocument.metadata.name
  },
  { immediate: true },
)

function commitDocumentName() {
  hasPendingNameChange.value = false

  const nextName = draftName.value.trim() || DEFAULT_DOCUMENT_NAME
  draftName.value = nextName

  if (nextName === editorDocument.value.metadata.name) {
    return
  }

  editorStore.renameDocument(nextName)
  saveDraft(editorStore.document)
  actionMessage.value = 'Document name updated.'
}

function markNameDirty() {
  hasPendingNameChange.value = true
  actionMessage.value = null
}

function confirmNewDocument(): boolean {
  if (typeof window === 'undefined') {
    return true
  }

  return window.confirm(
    'Create a new 32x32 transparent document? The current draft will be replaced.',
  )
}

function downloadText(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')

  link.href = url
  link.download = filename
  link.click()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}

function createNewDocument() {
  actionMessage.value = null

  if (!confirmNewDocument()) {
    return
  }

  editorStore.newDocument({
    width: 32,
    height: 32,
    fill: EMPTY_PIXEL,
    name: DEFAULT_DOCUMENT_NAME,
  })
  draftName.value = editorStore.document.metadata.name
  saveDraft(editorStore.document)
  actionMessage.value = 'New document created.'
}

function exportJson() {
  actionMessage.value = null
  const filename = getDocumentFilename(editorDocument.value, 'json')

  downloadText(documentToJson(editorDocument.value), 'application/json;charset=utf-8', filename)
  actionMessage.value = `Exported ${filename}.`
}

function exportSvg() {
  actionMessage.value = null
  const filename = getDocumentFilename(editorDocument.value, 'svg')

  downloadText(documentToSvg(editorDocument.value), 'image/svg+xml;charset=utf-8', filename)
  actionMessage.value = `Exported ${filename}.`
}
</script>

<template>
  <section class="rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel-inner)] p-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="status-label">Document actions</p>
        <p class="mt-2 text-sm text-[var(--ink-soft)]">
          Import, export, and keep the draft synced locally.
        </p>
      </div>
      <span
        class="rounded-full bg-[rgba(255,255,255,0.5)] px-3 py-1 text-xs font-bold text-[var(--ink-muted)]"
      >
        {{ documentDimensions }}
      </span>
    </div>

    <label class="mt-4 block">
      <span class="status-label">Name</span>
      <input
        v-model="draftName"
        type="text"
        class="text-field mt-2"
        maxlength="120"
        placeholder="untitled-svg-pixel-art"
        @blur="commitDocumentName"
        @input="markNameDirty"
        @keydown.enter.prevent="commitDocumentName"
      />
    </label>

    <div class="mt-4 grid gap-2 sm:grid-cols-2">
      <button type="button" class="editor-button w-full" @click="createNewDocument">New</button>
      <button
        type="button"
        class="editor-button w-full"
        :disabled="isImporting"
        @click="triggerImport"
      >
        {{ isImporting ? 'Importing…' : 'Import' }}
      </button>
      <button type="button" class="editor-button w-full" @click="exportJson()">Export JSON</button>
      <button type="button" class="editor-button w-full" @click="exportSvg()">Export SVG</button>
    </div>

    <p
      v-if="importError != null"
      class="mt-3 rounded-[18px] border border-[rgba(177,66,44,0.25)] bg-[rgba(177,66,44,0.08)] px-3 py-2 text-sm text-[rgb(128,46,29)]"
    >
      {{ importError }}
    </p>
    <p
      v-else-if="actionMessage != null"
      class="mt-3 rounded-[18px] border border-[var(--panel-border)] bg-[rgba(255,255,255,0.45)] px-3 py-2 text-sm text-[var(--ink-soft)]"
    >
      {{ actionMessage }}
    </p>

    <input
      :ref="setFileInputElement"
      type="file"
      accept=".json,.png"
      class="hidden"
      @change="onFileChange"
    />
  </section>
</template>
