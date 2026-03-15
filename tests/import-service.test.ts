// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseJsonDocument } from '../src/services/importService'
import { DEFAULT_DOCUMENT_NAME, EMPTY_PIXEL } from '../src/types'

describe('parseJsonDocument', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T10:00:00.000Z'))
  })

  it('normalizes transparent pixels, lowercases colors, and strips unknown metadata fields', () => {
    const raw = JSON.stringify({
      version: 1,
      width: 3,
      height: 1,
      pixels: ['', '#00000000', '#AABBCCDD'],
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
      width: 3,
      height: 1,
      pixels: [EMPTY_PIXEL, EMPTY_PIXEL, '#aabbccdd'],
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
