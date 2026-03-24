// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import {
  DEFAULT_DOCUMENT_NAME,
  DOCUMENT_VERSION,
  MAX_CANVAS_SIZE,
  createIsoTimestamp,
} from '../types'
import type { EditorDocument } from '../types'

interface RasterImageDocumentOptions {
  blob: Blob
  filename: string
  dimensionsLabel: string
  loadErrorMessage: string
  width?: number
  height?: number
}

function getFilenameStem(filename: string): string {
  const basename = filename.replace(/\.[^./\\]+$/, '').trim()
  return basename.length > 0 ? basename : DEFAULT_DOCUMENT_NAME
}

function loadImage(url: string, errorMessage: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(errorMessage))
    image.src = url
  })
}

function validateRasterDimensions(width: number, height: number, label: string) {
  if (width < 1 || height < 1 || width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) {
    throw new Error(`${label} dimensions must be between 1 and ${MAX_CANVAS_SIZE} pixels.`)
  }
}

function rasterizeImageToPixels(
  image: CanvasImageSource,
  width: number,
  height: number,
): Uint32Array {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (context == null) {
    throw new Error('Canvas 2D context is unavailable.')
  }

  context.drawImage(image, 0, 0, width, height)

  const imageData = context.getImageData(0, 0, width, height)
  const pixels = new Uint32Array(width * height)
  const rgbaPixels = new Uint32Array(imageData.data.buffer)

  for (let index = 0; index < pixels.length; index += 1) {
    const value = rgbaPixels[index]!
    // Discard RGB values on import for pixels that have zero alpha
    pixels[index] = value >>> 24 === 0 ? 0 : value
  }

  return pixels
}

export async function rasterImageFileToDocument(
  options: RasterImageDocumentOptions,
): Promise<EditorDocument> {
  const objectUrl = URL.createObjectURL(options.blob)

  try {
    const image = await loadImage(objectUrl, options.loadErrorMessage)
    const width = options.width ?? image.width
    const height = options.height ?? image.height

    validateRasterDimensions(width, height, options.dimensionsLabel)
    const timestamp = createIsoTimestamp()

    return {
      version: DOCUMENT_VERSION,
      width,
      height,
      pixels: rasterizeImageToPixels(image, width, height),
      metadata: {
        name: getFilenameStem(options.filename),
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
