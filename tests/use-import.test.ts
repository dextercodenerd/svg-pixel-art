// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { describe, expect, it, vi } from 'vitest'
import { createEditorDocument } from '../src/types'
import { createImportController } from '../src/composables/useImport'

function createJsonFile(name: string, raw = '{"version":1}') {
  return {
    name,
    text: vi.fn(async () => raw),
  } as unknown as File
}

describe('createImportController', () => {
  it('stops before parsing or replacing when confirmation is canceled', async () => {
    const parseJson = vi.fn()
    const replaceDocument = vi.fn()
    const controller = createImportController({
      parseJson,
      replaceDocument,
      requestReplacementConfirmation: vi.fn(async () => false),
    })

    const input = {
      files: [createJsonFile('kept.json')],
      value: 'C:\\fakepath\\kept.json',
    }

    controller.onFileChange({ target: input } as unknown as Event)
    await Promise.resolve()

    expect(parseJson).not.toHaveBeenCalled()
    expect(replaceDocument).not.toHaveBeenCalled()
    expect(input.value).toBe('')
  })

  it('parses, replaces, and resets the input on successful JSON import', async () => {
    const importedDocument = createEditorDocument({ width: 2, height: 2, name: 'imported' })
    const parseJson = vi.fn(() => importedDocument)
    const replaceDocument = vi.fn()
    const onImportSuccess = vi.fn()
    const controller = createImportController({
      onImportSuccess,
      parseJson,
      replaceDocument,
      requestReplacementConfirmation: vi.fn(async () => true),
    })

    const file = createJsonFile('imported.json', '{"version":1,"width":2,"height":2,"pixels":["","","",""],"metadata":{}}')
    const input = {
      files: [file],
      value: 'C:\\fakepath\\imported.json',
    }

    controller.onFileChange({ target: input } as unknown as Event)
    await vi.waitFor(() => {
      expect(replaceDocument).toHaveBeenCalledWith(importedDocument, { persistDraft: true })
    })

    expect(file.text).toHaveBeenCalledTimes(1)
    expect(parseJson).toHaveBeenCalledTimes(1)
    expect(onImportSuccess).toHaveBeenCalledTimes(1)
    expect(input.value).toBe('')
    expect(controller.importError.value).toBeNull()
  })

  it('surfaces parse errors and clears the importing flag', async () => {
    const controller = createImportController({
      parseJson: vi.fn(() => {
        throw new Error('Broken file')
      }),
      replaceDocument: vi.fn(),
      requestReplacementConfirmation: vi.fn(async () => true),
    })

    await controller.importFile(createJsonFile('broken.json'))

    expect(controller.importError.value).toBe('Broken file')
    expect(controller.isImporting.value).toBe(false)
  })
})
