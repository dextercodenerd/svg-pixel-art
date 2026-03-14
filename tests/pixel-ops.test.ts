// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { describe, expect, it } from 'vitest'
import { bresenhamLine, brushStamp, floodFill } from '../src/services/pixelOps'
import { EMPTY_PIXEL } from '../src/types'

describe('brushStamp', () => {
  it('centers odd brush sizes around the target pixel', () => {
    const pixels = Array(25).fill(EMPTY_PIXEL)
    const stamped = brushStamp(pixels, 5, 5, 2, 2, 3, '#112233ff')

    expect(stamped).toEqual([
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      '#112233ff',
      '#112233ff',
      '#112233ff',
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      '#112233ff',
      '#112233ff',
      '#112233ff',
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      '#112233ff',
      '#112233ff',
      '#112233ff',
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
    ])
    expect(pixels).toEqual(Array(25).fill(EMPTY_PIXEL))
  })

  it('uses top-left bias for even brush sizes and clamps to bounds', () => {
    const pixels = Array(16).fill(EMPTY_PIXEL)
    const stamped = brushStamp(pixels, 4, 4, 3, 3, 2, '#445566ff')

    expect(stamped).toEqual([
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      '#445566ff',
    ])
  })
})

describe('bresenhamLine', () => {
  it('returns both endpoints for a diagonal line', () => {
    expect(bresenhamLine(0, 0, 3, 3)).toEqual([
      { col: 0, row: 0 },
      { col: 1, row: 1 },
      { col: 2, row: 2 },
      { col: 3, row: 3 },
    ])
  })

  it('handles steep lines without gaps', () => {
    expect(bresenhamLine(1, 1, 3, 6)).toEqual([
      { col: 1, row: 1 },
      { col: 1, row: 2 },
      { col: 2, row: 3 },
      { col: 2, row: 4 },
      { col: 3, row: 5 },
      { col: 3, row: 6 },
    ])
  })
})

describe('floodFill', () => {
  it('fills 4-connected regions with exact color matches', () => {
    const pixels = [
      '#000000ff',
      '#000000ff',
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      '#000000ff',
      EMPTY_PIXEL,
      '#ffffffff',
      '#ffffffff',
      EMPTY_PIXEL,
    ]

    expect(floodFill(pixels, 3, 3, 0, 0, '#000000ff', '#ff0000ff')).toEqual([
      '#ff0000ff',
      '#ff0000ff',
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      '#ff0000ff',
      EMPTY_PIXEL,
      '#ffffffff',
      '#ffffffff',
      EMPTY_PIXEL,
    ])
  })

  it('treats empty and #00000000 as the same target color', () => {
    const pixels = [EMPTY_PIXEL, '#00000000', '#112233ff', '#00000000']

    expect(floodFill(pixels, 2, 2, 0, 0, '#00000000', '#abcdef88')).toEqual([
      '#abcdef88',
      '#abcdef88',
      '#112233ff',
      '#abcdef88',
    ])
  })

  it('returns an unchanged clone when target and fill colors are equivalent', () => {
    const pixels = [EMPTY_PIXEL, '#112233ff', EMPTY_PIXEL, '#00000000']
    const filled = floodFill(pixels, 2, 2, 0, 0, EMPTY_PIXEL, '#00000000')

    expect(filled).toEqual([EMPTY_PIXEL, '#112233ff', EMPTY_PIXEL, '#00000000'])
    expect(filled).not.toBe(pixels)
  })
})
