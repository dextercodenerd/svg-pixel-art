// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { ref } from 'vue'
import { saveDraft } from '../services/draftStorage'
import { parseJsonDocument, pngToDocument } from '../services/importService'
import { useEditorStore } from '../stores/editor'
import { useHistoryStore } from '../stores/history'
import type { ComponentPublicInstance } from 'vue'

function shouldConfirmReplacement(): boolean {
  if (typeof window === 'undefined') {
    return true
  }

  return window.confirm('Replace the current document? The current draft will be overwritten.')
}

export function useImport() {
  const editorStore = useEditorStore()
  const historyStore = useHistoryStore()

  const fileInputRef = ref<HTMLInputElement | null>(null)
  const importError = ref<string | null>(null)
  const isImporting = ref(false)

  async function parseFile(file: File) {
    const name = file.name.toLowerCase()

    if (name.endsWith('.json')) {
      return parseJsonDocument(await file.text())
    }

    if (name.endsWith('.png')) {
      return pngToDocument(file)
    }

    throw new Error('Only .json and .png files are supported.')
  }

  async function importFile(file: File) {
    importError.value = null

    if (!shouldConfirmReplacement()) {
      return
    }

    isImporting.value = true

    try {
      const document = await parseFile(file)
      editorStore.loadDocument(document)
      editorStore.resetViewState()
      historyStore.resetWith(document)
      saveDraft(document)
    } catch (error) {
      importError.value =
        error instanceof Error ? error.message : 'Unable to import the selected file.'
    } finally {
      isImporting.value = false
    }
  }

  function triggerImport() {
    importError.value = null
    fileInputRef.value?.click()
  }

  function onFileChange(event: Event) {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) {
      return
    }

    const file = input.files?.[0] ?? null
    input.value = ''

    if (file == null) {
      return
    }

    void importFile(file)
  }

  function setFileInputElement(element: Element | ComponentPublicInstance | null) {
    fileInputRef.value = element instanceof HTMLInputElement ? element : null
  }

  return {
    importError,
    isImporting,
    onFileChange,
    setFileInputElement,
    triggerImport,
  }
}
