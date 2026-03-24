// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { describe, expect, it, vi } from 'vitest'
import { createNewDocumentController } from '../src/composables/useNewDocumentDialog'
import { hexToAbgr } from '../src/services/colorUtils'

describe('createNewDocumentController', () => {
  it('creates a preset-backed document with normalized fill and fallback name', async () => {
    const createDocument = vi.fn()
    const confirmReplacement = vi.fn(async () => true)
    const controller = createNewDocumentController({
      confirmReplacement,
      createDocument,
    })

    controller.selectedPreset.value = '48'
    controller.fillMode.value = 'color'
    controller.fillColor.value = 'AABBCC'
    controller.documentName.value = '   '

    await expect(controller.submit()).resolves.toBe(true)

    expect(confirmReplacement).toHaveBeenCalledTimes(1)
    expect(createDocument).toHaveBeenCalledWith({
      width: 48,
      height: 48,
      fill: hexToAbgr('#aabbccff'),
      name: 'untitled-svg-pixel-art',
    })
  })

  it('blocks invalid custom sizes and invalid fill colors before confirmation', async () => {
    const createDocument = vi.fn()
    const confirmReplacement = vi.fn(async () => true)
    const controller = createNewDocumentController({
      confirmReplacement,
      createDocument,
    })

    controller.selectedPreset.value = 'custom'
    controller.customWidth.value = '257'
    controller.customHeight.value = '0'
    controller.fillMode.value = 'color'
    controller.fillColor.value = 'not-a-color'

    expect(controller.validationError.value).toBe(
      'Width and height must be integers between 1 and 256.',
    )
    await expect(controller.submit()).resolves.toBe(false)
    expect(confirmReplacement).not.toHaveBeenCalled()
    expect(createDocument).not.toHaveBeenCalled()

    controller.customWidth.value = '12.5'
    controller.customHeight.value = '10'
    expect(controller.validationError.value).toBe(
      'Width and height must be integers between 1 and 256.',
    )
  })

  it('keeps the dialog state intact when replacement confirmation is canceled', async () => {
    const createDocument = vi.fn()
    const controller = createNewDocumentController({
      confirmReplacement: vi.fn(async () => false),
      createDocument,
    })

    controller.selectedPreset.value = 'custom'
    controller.customWidth.value = '12'
    controller.customHeight.value = '8'
    controller.fillMode.value = 'color'
    controller.fillColor.value = '#11223344'
    controller.documentName.value = 'keep-me'

    await expect(controller.submit()).resolves.toBe(false)

    expect(createDocument).not.toHaveBeenCalled()
    expect(controller.customWidth.value).toBe('12')
    expect(controller.customHeight.value).toBe('8')
    expect(controller.fillColor.value).toBe('#11223344')
    expect(controller.documentName.value).toBe('keep-me')
  })
})
