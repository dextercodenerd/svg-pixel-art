<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui'
import { useEditorStore } from '../../stores/editor'
import { DEFAULT_DOCUMENT_NAME } from '../../types'

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

const editorStore = useEditorStore()
const { document: editorDocument } = storeToRefs(editorStore)

const draftName = ref(editorDocument.value.metadata.name)
const localMessage = ref<string | null>(null)

const documentDimensions = computed(
  () => `${editorDocument.value.width} x ${editorDocument.value.height}`,
)
const noticeMessage = computed(() => props.importError ?? props.statusMessage ?? localMessage.value)

watch(
  editorDocument,
  nextDocument => {
    draftName.value = nextDocument.metadata.name
  },
  { immediate: true },
)

function commitDocumentName() {
  const nextName = draftName.value.trim() || DEFAULT_DOCUMENT_NAME
  draftName.value = nextName

  if (nextName === editorDocument.value.metadata.name) {
    return
  }

  editorStore.renameDocument(nextName)
  localMessage.value = 'Document name updated.'
}

function markNameDirty() {
  localMessage.value = null
}

function requestNewDocument() {
  localMessage.value = null
  emit('new')
}

function requestImport() {
  localMessage.value = null
  emit('import')
}

function requestExportJson() {
  localMessage.value = null
  emit('exportJson')
}

function requestExportSvg() {
  localMessage.value = null
  emit('exportSvg')
}
</script>

<template>
  <section class="status-card">
    <div class="flex items-start justify-between gap-3">
      <div>
        <span class="status-label">Info</span>
        <strong class="status-value block mt-1">{{ documentDimensions }}</strong>
      </div>
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
      <TooltipRoot>
        <TooltipTrigger as-child>
          <button type="button" class="editor-button w-full" @click="requestNewDocument()">
            New
          </button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
            New document
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>

      <TooltipRoot>
        <TooltipTrigger as-child>
          <button
            type="button"
            class="editor-button w-full"
            :disabled="isImporting"
            @click="requestImport()"
          >
            {{ isImporting ? 'Importing…' : 'Import' }}
          </button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
            Import file · Ctrl/Cmd+O
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>

      <TooltipRoot>
        <TooltipTrigger as-child>
          <button type="button" class="editor-button w-full" @click="requestExportJson()">
            Save JSON
          </button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
            Export JSON · Ctrl/Cmd+S
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>

      <TooltipRoot>
        <TooltipTrigger as-child>
          <button type="button" class="editor-button w-full" @click="requestExportSvg()">
            Export SVG
          </button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="bottom" :side-offset="10" class="editor-tooltip">
            Export SVG · Ctrl/Cmd+Shift+S
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </div>

    <p
      v-if="noticeMessage != null"
      class="mt-3 border-2 border-dashed border-[var(--panel-border)] p-3 text-sm"
      :class="{
        'border-red-500 bg-red-50 text-red-900': importError != null,
        'bg-white text-[var(--ink-soft)]': importError == null,
      }"
    >
      {{ noticeMessage }}
    </p>
  </section>
</template>
