// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  jpegToDocument,
  parseJsonDocument,
  pngToDocument,
  svgToDocument,
} from '../src/services/importService'
import { DEFAULT_DOCUMENT_NAME, TRANSPARENT_U32 } from '../src/types'
import { hexToAbgr } from '../src/services/colorUtils'

const T = TRANSPARENT_U32
const h = hexToAbgr

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
      pixels: new Uint32Array([T, T, T, h('#aabbccdd')]),
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
      pixels: new Uint32Array([h('#01020304')]),
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
  it('normalizes alpha-zero pixels to transparent and reads RGBA correctly', async () => {
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
      // First pixel has alpha=0 → transparent (0)
      // Second pixel: R=17, G=34, B=51, A=128 → ABGR uint32
      expect(document.pixels[0]).toBe(T)
      expect(document.pixels[1]).toBe(h('#11223380'))
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

describe('jpegToDocument', () => {
  it('imports JPEG raster data through the shared image path', async () => {
    const createObjectURL = vi.fn(() => 'blob:jpeg')
    const revokeObjectURL = vi.fn()
    const drawImage = vi.fn()
    const getImageData = vi.fn(() => ({
      data: new Uint8ClampedArray([9, 8, 7, 255, 6, 5, 4, 255]),
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
      const file = new File(['jpeg'], 'photo.jpeg', { type: 'image/jpeg' })
      const document = await jpegToDocument(file)

      expect(document.width).toBe(2)
      expect(document.height).toBe(1)
      expect(document.pixels[0]).toBe(h('#090807ff'))
      expect(document.pixels[1]).toBe(h('#060504ff'))
      expect(document.metadata.name).toBe('photo')
      expect(createObjectURL).toHaveBeenCalledWith(file)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:jpeg')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('rejects oversized JPEG dimensions', async () => {
    class OversizedImage {
      width = 1
      height = 257
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onload?.()
      }
    }

    vi.stubGlobal('Image', OversizedImage)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:jpeg-oversized'),
      revokeObjectURL: vi.fn(),
    })

    try {
      const file = new File(['jpeg'], 'oversized.jpg', { type: 'image/jpeg' })

      await expect(jpegToDocument(file)).rejects.toThrow(
        'JPEG dimensions must be between 1 and 256 pixels.',
      )
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('svgToDocument', () => {
  it('uses width and height from the SVG before rasterizing', async () => {
    const createObjectURL = vi.fn(() => 'blob:svg')
    const revokeObjectURL = vi.fn()
    const drawImage = vi.fn()
    const getImageData = vi.fn(() => ({
      data: new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 0]),
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
      width = 99
      height = 99
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        this.onload?.()
      }
    }

    class MockDOMParser {
      parseFromString() {
        return {
          querySelector: vi.fn(() => null),
          documentElement: {
            getAttribute(attribute: string) {
              if (attribute === 'width') {
                return '2'
              }

              if (attribute === 'height') {
                return '1'
              }

              return null
            },
          },
        }
      }
    }

    vi.stubGlobal('Image', MockImage)
    vi.stubGlobal('DOMParser', MockDOMParser)
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })
    vi.stubGlobal('document', {
      createElement,
    })

    try {
      const file = new File(['<svg width="2" height="1"></svg>'], 'vector.svg', {
        type: 'image/svg+xml',
      })
      const document = await svgToDocument(file)

      expect(document.width).toBe(2)
      expect(document.height).toBe(1)
      expect(document.pixels[0]).toBe(h('#010203ff'))
      expect(document.pixels[1]).toBe(T)
      expect(document.metadata.name).toBe('vector')
      expect(drawImage).toHaveBeenCalled()
      expect(getImageData).toHaveBeenCalledWith(0, 0, 2, 1)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('rejects malformed SVG content', async () => {
    class MockDOMParser {
      parseFromString() {
        return {
          querySelector: vi.fn(() => ({ textContent: 'bad svg' })),
          documentElement: {
            getAttribute: vi.fn(() => null),
          },
        }
      }
    }

    vi.stubGlobal('DOMParser', MockDOMParser)

    try {
      const file = new File(['<svg'], 'broken.svg', { type: 'image/svg+xml' })

      await expect(svgToDocument(file)).rejects.toThrow('SVG could not be parsed.')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
