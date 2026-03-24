// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { hexToAbgr } from './colorUtils'
import { rasterImageFileToDocument } from './rasterImportService'
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

function getSvgDimensions(svgText: string): { width: number; height: number } {
  const parser = new DOMParser()
  const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
  const parseError = svgDoc.querySelector('parsererror')
  if (parseError != null) {
    throw new Error('SVG could not be parsed.')
  }

  const svgEl = svgDoc.documentElement
  const rawWidth = parseFloat(svgEl.getAttribute('width') ?? '')
  const rawHeight = parseFloat(svgEl.getAttribute('height') ?? '')
  const viewBox = svgEl
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)

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

  return { width, height }
}

export function parseJsonDocument(raw: string): EditorDocument {
  return parseDocumentData(JSON.parse(raw) as unknown)
}

export async function svgToDocument(file: File): Promise<EditorDocument> {
  const svgText = await file.text()
  const { width, height } = getSvgDimensions(svgText)

  return rasterImageFileToDocument({
    blob: new Blob([svgText], { type: 'image/svg+xml' }),
    filename: file.name,
    dimensionsLabel: 'SVG',
    loadErrorMessage: 'Failed to load SVG image.',
    width,
    height,
  })
}

export async function pngToDocument(file: File): Promise<EditorDocument> {
  return rasterImageFileToDocument({
    blob: file,
    filename: file.name,
    dimensionsLabel: 'PNG',
    loadErrorMessage: 'Failed to load PNG image.',
  })
}

export async function jpegToDocument(file: File): Promise<EditorDocument> {
  return rasterImageFileToDocument({
    blob: file,
    filename: file.name,
    dimensionsLabel: 'JPEG',
    loadErrorMessage: 'Failed to load JPEG image.',
  })
}
