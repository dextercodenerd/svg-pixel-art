// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { hexToAbgr } from './colorUtils'
import {
  DEFAULT_DOCUMENT_NAME,
  DOCUMENT_VERSION,
  EMPTY_PIXEL,
  MAX_CANVAS_SIZE,
  createIsoTimestamp,
} from '../types'
import type { EditorDocument } from '../types'

const HEX_PIXEL_PATTERN = /^#[0-9a-fA-F]{8}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null
}

function validateDimension(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > MAX_CANVAS_SIZE) {
    throw new Error(`${label} must be an integer between 1 and ${MAX_CANVAS_SIZE}.`)
  }

  return value as number
}

function normalizeImportedPixelU32(value: unknown): number {
  if (value === EMPTY_PIXEL) {
    return 0
  }

  if (typeof value !== 'string' || !HEX_PIXEL_PATTERN.test(value)) {
    throw new Error('Pixels must be empty strings or #RRGGBBAA values.')
  }

  return hexToAbgr(value)
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return null
  }

  return new Date(timestamp).toISOString()
}

function normalizeDocumentName(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_DOCUMENT_NAME
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : DEFAULT_DOCUMENT_NAME
}

function normalizeMetadata(value: unknown) {
  const now = createIsoTimestamp()

  if (!isRecord(value)) {
    return {
      name: DEFAULT_DOCUMENT_NAME,
      createdAt: now,
      updatedAt: now,
    }
  }

  const createdAt = normalizeTimestamp(value.createdAt) ?? now
  const updatedAt = normalizeTimestamp(value.updatedAt) ?? createdAt

  return {
    name: normalizeDocumentName(value.name),
    createdAt,
    updatedAt,
  }
}

function parseDocumentData(value: unknown): EditorDocument {
  if (!isRecord(value)) {
    throw new Error('Document must be an object.')
  }

  if (value.version !== DOCUMENT_VERSION) {
    throw new Error(`Document version must be ${DOCUMENT_VERSION}.`)
  }

  const width = validateDimension(value.width, 'Width')
  const height = validateDimension(value.height, 'Height')

  if (!Array.isArray(value.pixels)) {
    throw new Error('Document pixels must be an array.')
  }

  if (value.pixels.length !== width * height) {
    throw new Error('Pixel array length must match width * height.')
  }

  const pixels = new Uint32Array(width * height)
  for (let i = 0; i < value.pixels.length; i++) {
    pixels[i] = normalizeImportedPixelU32(value.pixels[i])
  }

  return {
    version: DOCUMENT_VERSION,
    width,
    height,
    pixels,
    metadata: normalizeMetadata(value.metadata),
  }
}

function getFilenameStem(filename: string): string {
  const basename = filename.replace(/\.[^./\\]+$/, '').trim()
  return basename.length > 0 ? basename : DEFAULT_DOCUMENT_NAME
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load PNG image.'))
    image.src = url
  })
}

export function parseJsonDocument(raw: string): EditorDocument {
  return parseDocumentData(JSON.parse(raw) as unknown)
}

export async function svgToDocument(file: File): Promise<EditorDocument> {
  const svgText = await file.text()

  const parser = new DOMParser()
  const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
  const svgEl = svgDoc.documentElement

  const rawWidth = parseFloat(svgEl.getAttribute('width') ?? '')
  const rawHeight = parseFloat(svgEl.getAttribute('height') ?? '')
  const viewBox = svgEl.getAttribute('viewBox')?.trim().split(/[\s,]+/)

  const width = Math.round(
    Number.isFinite(rawWidth) && rawWidth > 0
      ? rawWidth
      : viewBox != null && viewBox.length >= 4
        ? parseFloat(viewBox[2]!)
        : NaN,
  )
  const height = Math.round(
    Number.isFinite(rawHeight) && rawHeight > 0
      ? rawHeight
      : viewBox != null && viewBox.length >= 4
        ? parseFloat(viewBox[3]!)
        : NaN,
  )

  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new Error('SVG has no determinable dimensions.')
  }

  if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) {
    throw new Error(`SVG dimensions must be between 1 and ${MAX_CANVAS_SIZE} pixels.`)
  }

  const blob = new Blob([svgText], { type: 'image/svg+xml' })
  const objectUrl = URL.createObjectURL(blob)

  try {
    const image = await loadImage(objectUrl)

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

    const u32 = new Uint32Array(imageData.data.buffer)
    for (let i = 0; i < pixels.length; i++) {
      const value = u32[i]!
      pixels[i] = value >>> 24 === 0 ? 0 : value
    }

    const timestamp = createIsoTimestamp()

    return {
      version: DOCUMENT_VERSION,
      width,
      height,
      pixels,
      metadata: {
        name: getFilenameStem(file.name),
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function pngToDocument(file: File): Promise<EditorDocument> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(objectUrl)

    if (
      image.width < 1 ||
      image.height < 1 ||
      image.width > MAX_CANVAS_SIZE ||
      image.height > MAX_CANVAS_SIZE
    ) {
      throw new Error(`PNG dimensions must be between 1 and ${MAX_CANVAS_SIZE} pixels.`)
    }

    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (context == null) {
      throw new Error('Canvas 2D context is unavailable.')
    }

    context.drawImage(image, 0, 0)

    const imageData = context.getImageData(0, 0, image.width, image.height)
    const pixels = new Uint32Array(image.width * image.height)

    // Read ImageData as uint32 — on little-endian hardware, bytes are [R,G,B,A]
    // which maps to ABGR uint32. This is our internal format.
    const u32 = new Uint32Array(imageData.data.buffer)
    for (let i = 0; i < pixels.length; i++) {
      const value = u32[i]!
      // Normalize zero-alpha to 0
      pixels[i] = value >>> 24 === 0 ? 0 : value
    }

    const timestamp = createIsoTimestamp()

    return {
      version: DOCUMENT_VERSION,
      width: image.width,
      height: image.height,
      pixels,
      metadata: {
        name: getFilenameStem(file.name),
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
