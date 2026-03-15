// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { ref } from 'vue'
import { confirmImportReplacement } from '../services/documentConfirmations'
import { parseJsonDocument, pngToDocument } from '../services/importService'
import { useEditorStore } from '../stores/editor'
import type { ComponentPublicInstance } from 'vue'

export function useImport() {
  const editorStore = useEditorStore()

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

    if (!confirmImportReplacement()) {
      return
    }

    isImporting.value = true

    try {
      const document = await parseFile(file)
      editorStore.replaceDocument(document, { persistDraft: true })
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
