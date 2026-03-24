// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
export interface DocumentMetadata {
  name: string
  createdAt: string
  updatedAt: string
}

export interface EditorDocument {
  version: 1
  width: number
  height: number
  pixels: Uint32Array
  metadata: DocumentMetadata
}

export type ToolId = 'pencil' | 'eraser' | 'line' | 'fill' | 'eyedropper'
export type ActiveColorSlot = 'fg' | 'bg'
export type ZoomLevel = 1 | 2 | 4 | 8 | 16
export type BrushSize = 1 | 2 | 3 | 4

export interface PanOffset {
  x: number
  y: number
}

export const ZOOM_LEVELS: ZoomLevel[] = [1, 2, 4, 8, 16]
export const BRUSH_SIZES: BrushSize[] = [1, 2, 3, 4]
export const BASE_PIXEL_SIZE = 8
export const MAX_UNDO_STEPS = 50
export const MAX_HISTORY_SNAPSHOTS = MAX_UNDO_STEPS + 1
export const MAX_CANVAS_SIZE = 256
export const TRANSPARENT = '#00000000'
export const EMPTY_PIXEL = ''
export const DEFAULT_DOCUMENT_NAME = 'untitled-svg-pixel-art'
export const DOCUMENT_VERSION = 1 as const
export const MAX_PALETTE_SWATCHES = 32
export const TRANSPARENT_U32 = 0

export const DEFAULT_PALETTE_SWATCHES = [
  '#000000ff',
  '#ffffffff',
  '#d7263dff',
  '#f49d37ff',
  '#3f88c5ff',
  '#1a936fff',
  '#5f4bb6ff',
  '#c0b7b1ff',
] as const

const HEX_PIXEL_PATTERN = /^#[0-9a-fA-F]{8}$/

export function createIsoTimestamp(date = new Date()): string {
  return date.toISOString()
}

export function isTransparentPixel(value: string | null | undefined): boolean {
  // No need for lower casing the input value, because transparent pixel is the same in upper and lower case
  if (value == null || value === EMPTY_PIXEL) {
    return true
  }

  // Zero-alpha on any color is also a fully transparent pixel, and we can normalize it
  return HEX_PIXEL_PATTERN.test(value) && value.slice(-2).toLowerCase() === '00'
}

export function normalizeTransparentPixel(value: string | null | undefined): string {
  if (isTransparentPixel(value)) {
    return EMPTY_PIXEL
  }

  return typeof value === 'string' ? value.toLowerCase() : EMPTY_PIXEL
}

export function cloneDocument(document: EditorDocument): EditorDocument {
  return {
    ...document,
    pixels: new Uint32Array(document.pixels),
    metadata: { ...document.metadata },
  }
}

export function createEmptyPixels(width: number, height: number, fill = 0): Uint32Array {
  const pixels = new Uint32Array(width * height)
  if (fill !== 0) {
    pixels.fill(fill)
  }
  return pixels
}

export function createEditorDocument(options?: {
  width?: number
  height?: number
  fill?: number
  name?: string
  timestamp?: string
}): EditorDocument {
  const width = options?.width ?? 16
  const height = options?.height ?? 16
  const timestamp = options?.timestamp ?? createIsoTimestamp()
  const name = options?.name ?? DEFAULT_DOCUMENT_NAME
  const fill = options?.fill ?? 0

  return {
    version: DOCUMENT_VERSION,
    width,
    height,
    pixels: createEmptyPixels(width, height, fill),
    metadata: {
      name,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  }
}
