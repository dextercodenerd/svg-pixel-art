// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { ref } from 'vue'
import { requestConfirmation } from '../services/confirmationService'
import {
  jpegToDocument,
  parseJsonDocument,
  pngToDocument,
  svgToDocument,
} from '../services/importService'
import { useEditorStore } from '../stores/editor'
import type { ComponentPublicInstance } from 'vue'

interface FileInputLike {
  click?: () => void
  files?: FileList | null
  value: string
}

interface ImportControllerOptions {
  onImportSuccess?: () => void
  parseJson?: typeof parseJsonDocument
  parseJpeg?: typeof jpegToDocument
  parsePng?: typeof pngToDocument
  parseSvg?: typeof svgToDocument
  replaceDocument?: ReturnType<typeof useEditorStore>['replaceDocument']
  requestReplacementConfirmation?: () => Promise<boolean>
}

function isFileInputElement(value: unknown): value is FileInputLike {
  return value != null && typeof value === 'object' && 'value' in value
}

export function createImportController(options: ImportControllerOptions = {}) {
  const parseJson = options.parseJson ?? parseJsonDocument
  const parseJpeg = options.parseJpeg ?? jpegToDocument
  const parsePng = options.parsePng ?? pngToDocument
  const parseSvg = options.parseSvg ?? svgToDocument
  const replaceDocument = options.replaceDocument
  const requestReplacementConfirmation =
    options.requestReplacementConfirmation ??
    (() =>
      requestConfirmation({
        title: 'Replace current document?',
        message: 'Importing will replace the current draft.',
        confirmLabel: 'Import file',
        cancelLabel: 'Keep current',
      }))

  const fileInputRef = ref<HTMLInputElement | null>(null)
  const importError = ref<string | null>(null)
  const isImporting = ref(false)

  async function parseFile(file: File) {
    const name = file.name.toLowerCase()

    if (name.endsWith('.json')) {
      return parseJson(await file.text())
    }

    if (name.endsWith('.png')) {
      return parsePng(file)
    }

    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
      return parseJpeg(file)
    }

    if (name.endsWith('.svg')) {
      return parseSvg(file)
    }

    throw new Error('Only .json, .png, .jpg, .jpeg, and .svg files are supported.')
  }

  async function importFile(file: File) {
    importError.value = null

    const confirmed = await requestReplacementConfirmation()
    if (!confirmed || replaceDocument == null) {
      return
    }

    isImporting.value = true

    try {
      const document = await parseFile(file)
      replaceDocument(document, { persistDraft: true })
      options.onImportSuccess?.()
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
    if (!isFileInputElement(input)) {
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
    fileInputRef.value = isFileInputElement(element) ? (element as HTMLInputElement) : null
  }

  return {
    fileInputRef,
    importError,
    isImporting,
    importFile,
    onFileChange,
    parseFile,
    setFileInputElement,
    triggerImport,
  }
}

export function useImport(options: Pick<ImportControllerOptions, 'onImportSuccess'> = {}) {
  const editorStore = useEditorStore()

  return createImportController({
    ...options,
    replaceDocument: editorStore.replaceDocument,
  })
}
