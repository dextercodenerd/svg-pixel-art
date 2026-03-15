// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { documentToJson, documentToSvg, getDocumentFilename } from '../services/exportService'
import type { EditorDocument } from '../types'

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

export function useDocumentExport() {
  function exportJson(document: EditorDocument) {
    const filename = getDocumentFilename(document, 'json')
    downloadText(documentToJson(document), 'application/json;charset=utf-8', filename)
    return filename
  }

  function exportSvg(document: EditorDocument) {
    const filename = getDocumentFilename(document, 'svg')
    downloadText(documentToSvg(document), 'image/svg+xml;charset=utf-8', filename)
    return filename
  }

  return {
    exportJson,
    exportSvg,
  }
}
