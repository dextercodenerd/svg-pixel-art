import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DOCUMENT_NAME,
  EMPTY_PIXEL,
  TRANSPARENT,
  createEditorDocument,
  isTransparentPixel,
  normalizeTransparentPixel,
} from '../src/types'

describe('pixel transparency helpers', () => {
  it('treats empty, null, undefined, and #00000000 as transparent', () => {
    expect(isTransparentPixel(EMPTY_PIXEL)).toBe(true)
    expect(isTransparentPixel(TRANSPARENT)).toBe(true)
    expect(isTransparentPixel(null)).toBe(true)
    expect(isTransparentPixel(undefined)).toBe(true)
  })

  it('normalizes any transparent representation to the empty pixel value', () => {
    expect(normalizeTransparentPixel(TRANSPARENT)).toBe(EMPTY_PIXEL)
    expect(normalizeTransparentPixel(undefined)).toBe(EMPTY_PIXEL)
  })

  it('keeps non-transparent colors unchanged', () => {
    expect(isTransparentPixel('#ff00ffff')).toBe(false)
    expect(normalizeTransparentPixel('#ff00ffff')).toBe('#ff00ffff')
  })
})

describe('createEditorDocument', () => {
  it('creates a dense row-major document with normalized fill and metadata', () => {
    const document = createEditorDocument({
      width: 3,
      height: 2,
      fill: TRANSPARENT,
      timestamp: '2026-03-13T15:00:00.000Z',
    })

    expect(document.version).toBe(1)
    expect(document.width).toBe(3)
    expect(document.height).toBe(2)
    expect(document.pixels).toHaveLength(6)
    expect(document.pixels.every(pixel => pixel === EMPTY_PIXEL)).toBe(true)
    expect(document.metadata).toEqual({
      name: DEFAULT_DOCUMENT_NAME,
      createdAt: '2026-03-13T15:00:00.000Z',
      updatedAt: '2026-03-13T15:00:00.000Z',
    })
  })
})
