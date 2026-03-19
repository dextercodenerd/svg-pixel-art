// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { describe, expect, it } from 'vitest'
import {
  applyColorAtIndices,
  bresenhamLine,
  brushStamp,
  collectRectangleIndices,
  collectStrokeIndices,
  createPixelMask,
  floodFill,
} from '../src/services/pixelOps'
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

  it('returns a single-element array when start equals end', () => {
    expect(bresenhamLine(4, 7, 4, 7)).toEqual([{ col: 4, row: 7 }])
  })

  it('generates all points for a horizontal line', () => {
    expect(bresenhamLine(0, 3, 4, 3)).toEqual([
      { col: 0, row: 3 },
      { col: 1, row: 3 },
      { col: 2, row: 3 },
      { col: 3, row: 3 },
      { col: 4, row: 3 },
    ])
  })

  it('generates all points for a vertical line', () => {
    expect(bresenhamLine(2, 0, 2, 3)).toEqual([
      { col: 2, row: 0 },
      { col: 2, row: 1 },
      { col: 2, row: 2 },
      { col: 2, row: 3 },
    ])
  })

  it('steps correctly when drawing in the reverse direction', () => {
    expect(bresenhamLine(3, 3, 0, 0)).toEqual([
      { col: 3, row: 3 },
      { col: 2, row: 2 },
      { col: 1, row: 1 },
      { col: 0, row: 0 },
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

  it('returns an unchanged clone when the starting point is out of bounds', () => {
    const pixels = Array<string>(4).fill('#ff0000ff')
    const result = floodFill(pixels, 2, 2, -1, 0, '#ff0000ff', '#00ff00ff')

    expect(result).toEqual(pixels)
    expect(result).not.toBe(pixels)
  })

  it('returns an unchanged clone when the start pixel does not match the given target color', () => {
    // Pixel at (0,0) is '#ff0000ff' but targetColor claims it is '#00ff00ff'
    const pixels = Array<string>(4).fill('#ff0000ff')
    const result = floodFill(pixels, 2, 2, 0, 0, '#00ff00ff', '#0000ffff')

    expect(result).toEqual(pixels)
    expect(result).not.toBe(pixels)
  })
})

describe('line helpers', () => {
  it('collects each affected index once for a brushed line', () => {
    expect(collectStrokeIndices(4, 4, 0, 0, 2, 2, 1)).toEqual([0, 5, 10])
  })

  it('builds a mask that only contains preview pixels for the pending line', () => {
    expect(createPixelMask(6, [1, 4], '#000000a6')).toEqual([
      EMPTY_PIXEL,
      '#000000a6',
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      '#000000a6',
      EMPTY_PIXEL,
    ])
  })

  it('applies a real line color without touching unrelated pixels', () => {
    const pixels = [EMPTY_PIXEL, '#00ff00ff', EMPTY_PIXEL, EMPTY_PIXEL]

    const changed = applyColorAtIndices(pixels, [0, 2], '#ff0000ff')

    expect(changed).toBe(true)
    expect(pixels).toEqual(['#ff0000ff', '#00ff00ff', '#ff0000ff', EMPTY_PIXEL])
  })
})

describe('rectangle helpers', () => {
  it('collects a 1px stroke border and separate fill indices', () => {
    expect(collectRectangleIndices(5, 5, 1, 1, 3, 3, 1, true)).toEqual({
      stroke: [6, 7, 8, 11, 13, 16, 17, 18],
      fill: [12],
    })
  })

  it('normalizes reverse drag bounds before collecting indices', () => {
    expect(collectRectangleIndices(5, 5, 3, 3, 1, 1, 1, true)).toEqual({
      stroke: [6, 7, 8, 11, 13, 16, 17, 18],
      fill: [12],
    })
  })

  it('treats thick strokes as covering the full small rectangle before fill', () => {
    expect(collectRectangleIndices(5, 5, 0, 0, 4, 4, 2, true)).toEqual({
      stroke: [
        0, 1, 2, 3, 4,
        5, 6, 7, 8, 9,
        10, 11, 13, 14,
        15, 16, 17, 18, 19,
        20, 21, 22, 23, 24,
      ],
      fill: [12],
    })
  })

  it('clips out-of-bounds drags to valid document indices only', () => {
    expect(collectRectangleIndices(3, 3, -1, -1, 1, 1, 1, true)).toEqual({
      stroke: [1, 3, 4],
      fill: [0],
    })
  })

  it('returns disjoint stroke and fill indices', () => {
    const { stroke, fill } = collectRectangleIndices(5, 5, 1, 1, 3, 3, 1, true)

    expect(stroke.some(index => fill.includes(index))).toBe(false)
  })
})
