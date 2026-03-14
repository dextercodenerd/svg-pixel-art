// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { normalizeTransparentPixel } from '../types'
import type { BrushSize } from '../types'

export interface PixelPoint {
  col: number
  row: number
}

function getBrushOrigin(col: number, row: number, brushSize: BrushSize): PixelPoint {
  const offset = Math.floor((brushSize - 1) / 2)

  return {
    col: col - offset,
    row: row - offset,
  }
}

function getPixelIndex(width: number, col: number, row: number): number {
  return row * width + col
}

export function stampBrushInto(
  pixels: string[],
  width: number,
  height: number,
  col: number,
  row: number,
  brushSize: BrushSize,
  color: string,
): boolean {
  const normalizedColor = normalizeTransparentPixel(color)
  const origin = getBrushOrigin(col, row, brushSize)
  const startCol = Math.max(0, origin.col)
  const startRow = Math.max(0, origin.row)
  const endCol = Math.min(width, origin.col + brushSize)
  const endRow = Math.min(height, origin.row + brushSize)

  let changed = false

  for (let currentRow = startRow; currentRow < endRow; currentRow += 1) {
    for (let currentCol = startCol; currentCol < endCol; currentCol += 1) {
      const index = getPixelIndex(width, currentCol, currentRow)
      if (pixels[index] === normalizedColor) {
        continue
      }

      pixels[index] = normalizedColor
      changed = true
    }
  }

  return changed
}

export function brushStamp(
  pixels: string[],
  width: number,
  height: number,
  col: number,
  row: number,
  brushSize: BrushSize,
  color: string,
): string[] {
  const nextPixels = [...pixels]
  stampBrushInto(nextPixels, width, height, col, row, brushSize, color)
  return nextPixels
}

export function collectStrokeIndices(
  width: number,
  height: number,
  col0: number,
  row0: number,
  col1: number,
  row1: number,
  brushSize: BrushSize,
): number[] {
  const visited = new Uint8Array(width * height)
  const indices: number[] = []

  for (const point of bresenhamLine(col0, row0, col1, row1)) {
    const origin = getBrushOrigin(point.col, point.row, brushSize)
    const startCol = Math.max(0, origin.col)
    const startRow = Math.max(0, origin.row)
    const endCol = Math.min(width, origin.col + brushSize)
    const endRow = Math.min(height, origin.row + brushSize)

    for (let currentRow = startRow; currentRow < endRow; currentRow += 1) {
      for (let currentCol = startCol; currentCol < endCol; currentCol += 1) {
        const index = getPixelIndex(width, currentCol, currentRow)
        if (visited[index] === 1) {
          continue
        }

        visited[index] = 1
        indices.push(index)
      }
    }
  }

  return indices
}

export function applyColorAtIndices(pixels: string[], indices: number[], color: string): boolean {
  const normalizedColor = normalizeTransparentPixel(color)
  let changed = false

  for (const index of indices) {
    if (pixels[index] === normalizedColor) {
      continue
    }

    pixels[index] = normalizedColor
    changed = true
  }

  return changed
}

export function createPixelMask(length: number, indices: number[], color: string): string[] {
  const normalizedColor = normalizeTransparentPixel(color)
  const mask = Array<string>(length).fill('')

  if (normalizedColor === '') {
    return mask
  }

  for (const index of indices) {
    mask[index] = normalizedColor
  }

  return mask
}

export function bresenhamLine(
  col0: number,
  row0: number,
  col1: number,
  row1: number,
): PixelPoint[] {
  const points: PixelPoint[] = []
  let currentCol = col0
  let currentRow = row0
  const deltaCol = Math.abs(col1 - col0)
  const deltaRow = Math.abs(row1 - row0)
  const stepCol = col0 < col1 ? 1 : -1
  const stepRow = row0 < row1 ? 1 : -1
  let error = deltaCol - deltaRow

  while (true) {
    points.push({ col: currentCol, row: currentRow })

    if (currentCol === col1 && currentRow === row1) {
      return points
    }

    const doubledError = error * 2

    if (doubledError > -deltaRow) {
      error -= deltaRow
      currentCol += stepCol
    }

    if (doubledError < deltaCol) {
      error += deltaCol
      currentRow += stepRow
    }
  }
}

export function floodFill(
  pixels: string[],
  width: number,
  height: number,
  col: number,
  row: number,
  targetColor: string,
  fillColor: string,
): string[] {
  const nextPixels = [...pixels]

  if (col < 0 || row < 0 || col >= width || row >= height) {
    return nextPixels
  }

  const normalizedTarget = normalizeTransparentPixel(targetColor)
  const normalizedFill = normalizeTransparentPixel(fillColor)

  if (normalizedTarget === normalizedFill) {
    return nextPixels
  }

  const startIndex = getPixelIndex(width, col, row)
  if (normalizeTransparentPixel(nextPixels[startIndex]) !== normalizedTarget) {
    return nextPixels
  }

  const visited = new Uint8Array(width * height)
  const queue: number[] = [startIndex]
  let head = 0

  while (head < queue.length) {
    const index = queue[head]!
    head += 1

    if (visited[index] === 1) {
      continue
    }

    visited[index] = 1

    if (normalizeTransparentPixel(nextPixels[index]) !== normalizedTarget) {
      continue
    }

    nextPixels[index] = normalizedFill

    const currentRow = Math.floor(index / width)
    const currentCol = index % width

    if (currentCol > 0) {
      queue.push(index - 1)
    }
    if (currentCol < width - 1) {
      queue.push(index + 1)
    }
    if (currentRow > 0) {
      queue.push(index - width)
    }
    if (currentRow < height - 1) {
      queue.push(index + width)
    }
  }

  return nextPixels
}
