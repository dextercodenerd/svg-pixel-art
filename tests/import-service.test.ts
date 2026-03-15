// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseJsonDocument, pngToDocument } from '../src/services/importService'
import { DEFAULT_DOCUMENT_NAME, EMPTY_PIXEL } from '../src/types'

describe('parseJsonDocument', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T10:00:00.000Z'))
  })

  it('normalizes transparent pixels, lowercases colors, and strips unknown metadata fields', () => {
    const raw = JSON.stringify({
      version: 1,
      width: 4,
      height: 1,
      pixels: ['', '#00000000', '#FF00AA00', '#AABBCCDD'],
      metadata: {
        name: ' imported ',
        createdAt: '2026-03-10T12:00:00.000Z',
        updatedAt: '2026-03-11T12:00:00.000Z',
        ignored: 'value',
      },
      ignoredTopLevel: true,
    })

    expect(parseJsonDocument(raw)).toEqual({
      version: 1,
      width: 4,
      height: 1,
      pixels: [EMPTY_PIXEL, EMPTY_PIXEL, EMPTY_PIXEL, '#aabbccdd'],
      metadata: {
        name: 'imported',
        createdAt: '2026-03-10T12:00:00.000Z',
        updatedAt: '2026-03-11T12:00:00.000Z',
      },
    })
  })

  it('falls back invalid metadata fields to safe defaults', () => {
    const raw = JSON.stringify({
      version: 1,
      width: 1,
      height: 1,
      pixels: ['#01020304'],
      metadata: {
        name: '   ',
        createdAt: 'not-a-date',
        updatedAt: 'also-not-a-date',
      },
    })

    expect(parseJsonDocument(raw)).toEqual({
      version: 1,
      width: 1,
      height: 1,
      pixels: ['#01020304'],
      metadata: {
        name: DEFAULT_DOCUMENT_NAME,
        createdAt: '2026-03-15T10:00:00.000Z',
        updatedAt: '2026-03-15T10:00:00.000Z',
      },
    })
  })

  it('throws when the pixel array does not match width * height', () => {
    const raw = JSON.stringify({
      version: 1,
      width: 2,
      height: 2,
      pixels: ['', '#ffffffff', '#00000000'],
      metadata: {},
    })

    expect(() => parseJsonDocument(raw)).toThrow('Pixel array length must match width * height.')
  })

  it('throws when a pixel value is not empty or #RRGGBBAA', () => {
    const raw = JSON.stringify({
      version: 1,
      width: 1,
      height: 1,
      pixels: ['#abc'],
      metadata: {},
    })

    expect(() => parseJsonDocument(raw)).toThrow(
      'Pixels must be empty strings or #RRGGBBAA values.',
    )
  })
})

describe('pngToDocument', () => {
  it('normalizes alpha-zero pixels to empty strings', async () => {
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    const drawImage = vi.fn()
    const getImageData = vi.fn(() => ({
      data: new Uint8ClampedArray([255, 0, 170, 0, 17, 34, 51, 128]),
    }))
    const getContext = vi.fn(() => ({
      drawImage,
      getImageData,
    }))
    const createElement = vi.fn(() => ({
      width: 0,
      height: 0,
      getContext,
    }))

    class MockImage {
      width = 2
      height = 1
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onload?.()
      }
    }

    vi.stubGlobal('Image', MockImage)
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })
    vi.stubGlobal('document', {
      createElement,
    })

    try {
      const file = new File(['png'], 'alpha-test.png', { type: 'image/png' })
      const document = await pngToDocument(file)

      expect(document.width).toBe(2)
      expect(document.height).toBe(1)
      expect(document.pixels).toEqual([EMPTY_PIXEL, '#11223380'])
      expect(document.metadata.name).toBe('alpha-test')
      expect(createObjectURL).toHaveBeenCalledWith(file)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('rejects oversized PNG dimensions', async () => {
    class OversizedImage {
      width = 257
      height = 1
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onload?.()
      }
    }

    vi.stubGlobal('Image', OversizedImage)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:oversized'),
      revokeObjectURL: vi.fn(),
    })

    try {
      const file = new File(['png'], 'oversized.png', { type: 'image/png' })

      await expect(pngToDocument(file)).rejects.toThrow(
        'PNG dimensions must be between 1 and 256 pixels.',
      )
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
