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
import { hexToAbgr } from '../src/services/colorUtils'

const T = 0 // transparent
const h = hexToAbgr

describe('brushStamp', () => {
  it('centers odd brush sizes around the target pixel', () => {
    const pixels = new Uint32Array(25)
    const color = h('#112233ff')
    const stamped = brushStamp(pixels, 5, 5, 2, 2, 3, color)

    expect(stamped).toEqual(new Uint32Array([
      T, T, T, T, T,
      T, color, color, color, T,
      T, color, color, color, T,
      T, color, color, color, T,
      T, T, T, T, T,
    ]))
    expect(pixels).toEqual(new Uint32Array(25))
  })

  it('uses top-left bias for even brush sizes and clamps to bounds', () => {
    const pixels = new Uint32Array(16)
    const color = h('#445566ff')
    const stamped = brushStamp(pixels, 4, 4, 3, 3, 2, color)

    expect(stamped).toEqual(new Uint32Array([
      T, T, T, T,
      T, T, T, T,
      T, T, T, T,
      T, T, T, color,
    ]))
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
    const black = h('#000000ff')
    const white = h('#ffffffff')
    const red = h('#ff0000ff')
    const pixels = new Uint32Array([
      black, black, T,
      T,     black, T,
      white, white, T,
    ])

    expect(floodFill(pixels, 3, 3, 0, 0, black, red)).toEqual(new Uint32Array([
      red, red, T,
      T,   red, T,
      white, white, T,
    ]))
  })

  it('fills transparent regions', () => {
    const color = h('#112233ff')
    const fill = h('#abcdef88')
    const pixels = new Uint32Array([T, T, color, T])

    expect(floodFill(pixels, 2, 2, 0, 0, T, fill)).toEqual(
      new Uint32Array([fill, fill, color, fill]),
    )
  })

  it('returns an unchanged clone when target and fill colors are the same', () => {
    const color = h('#112233ff')
    const pixels = new Uint32Array([T, color, T, T])
    const filled = floodFill(pixels, 2, 2, 0, 0, T, T)

    expect(filled).toEqual(new Uint32Array([T, color, T, T]))
    expect(filled).not.toBe(pixels)
  })

  it('returns an unchanged clone when the starting point is out of bounds', () => {
    const red = h('#ff0000ff')
    const green = h('#00ff00ff')
    const pixels = new Uint32Array(4).fill(red)
    const result = floodFill(pixels, 2, 2, -1, 0, red, green)

    expect(result).toEqual(pixels)
    expect(result).not.toBe(pixels)
  })

  it('returns an unchanged clone when the start pixel does not match the given target color', () => {
    const red = h('#ff0000ff')
    const green = h('#00ff00ff')
    const blue = h('#0000ffff')
    const pixels = new Uint32Array(4).fill(red)
    const result = floodFill(pixels, 2, 2, 0, 0, green, blue)

    expect(result).toEqual(pixels)
    expect(result).not.toBe(pixels)
  })
})

describe('line helpers', () => {
  it('collects each affected index once for a brushed line', () => {
    expect(collectStrokeIndices(4, 4, 0, 0, 2, 2, 1)).toEqual([0, 5, 10])
  })

  it('builds a mask that only contains preview pixels for the pending line', () => {
    const preview = h('#000000a6')
    expect(createPixelMask(6, [1, 4], preview)).toEqual(
      new Uint32Array([T, preview, T, T, preview, T]),
    )
  })

  it('applies a real line color without touching unrelated pixels', () => {
    const red = h('#ff0000ff')
    const green = h('#00ff00ff')
    const pixels = new Uint32Array([T, green, T, T])

    const changed = applyColorAtIndices(pixels, [0, 2], red)

    expect(changed).toBe(true)
    expect(pixels).toEqual(new Uint32Array([red, green, red, T]))
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
