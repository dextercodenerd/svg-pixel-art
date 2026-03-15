// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { parseHex } from './colorUtils'
import {
  DEFAULT_DOCUMENT_NAME,
  DOCUMENT_VERSION,
  EMPTY_PIXEL,
  isTransparentPixel,
  normalizeTransparentPixel,
} from '../types'
import type { EditorDocument } from '../types'

function normalizeDocumentName(name: string): string {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed : DEFAULT_DOCUMENT_NAME
}

function toSerializableDocument(document: EditorDocument): EditorDocument {
  return {
    version: DOCUMENT_VERSION,
    width: document.width,
    height: document.height,
    pixels: document.pixels.map(pixel =>
      isTransparentPixel(pixel) ? EMPTY_PIXEL : normalizeTransparentPixel(pixel),
    ),
    metadata: {
      name: normalizeDocumentName(document.metadata.name),
      createdAt: document.metadata.createdAt,
      updatedAt: document.metadata.updatedAt,
    },
  }
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function formatSvgOpacity(alpha: number): string {
  return Number((alpha / 255).toFixed(3)).toString()
}

function sanitizeFilenameBase(name: string): string {
  const trimmed = name.trim()
  const normalized = trimmed.length > 0 ? trimmed : DEFAULT_DOCUMENT_NAME
  const withoutReservedCharacters = normalized.replace(/[<>:"/\\|?*]/g, '-')
  let sanitized = ''

  for (const character of withoutReservedCharacters) {
    sanitized += character <= '\u001f' ? '-' : character
  }

  sanitized = sanitized.trim()
  return sanitized.length > 0 ? sanitized : DEFAULT_DOCUMENT_NAME
}

export function documentToJson(document: EditorDocument): string {
  return JSON.stringify(toSerializableDocument(document), null, 2)
}

export function documentToSvg(document: EditorDocument): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${document.width} ${document.height}" width="${document.width}" height="${document.height}" shape-rendering="crispEdges">`,
    `  <title>${escapeXml(normalizeDocumentName(document.metadata.name))}</title>`,
  ]

  for (let index = 0; index < document.pixels.length; index += 1) {
    const pixel = document.pixels[index]
    if (isTransparentPixel(pixel)) {
      continue
    }

    const { r, g, b, a } = parseHex(pixel)
    const x = index % document.width
    const y = Math.floor(index / document.width)
    const fill = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`

    if (a === 255) {
      lines.push(`  <rect x="${x}" y="${y}" width="1" height="1" fill="${fill}" />`)
      continue
    }

    lines.push(
      `  <rect x="${x}" y="${y}" width="1" height="1" fill="${fill}" fill-opacity="${formatSvgOpacity(a)}" />`,
    )
  }

  lines.push('</svg>')

  return lines.join('\n')
}

export function getDocumentFilename(document: EditorDocument, extension: string): string {
  const normalizedExtension = extension.startsWith('.') ? extension.slice(1) : extension
  const basename = sanitizeFilenameBase(document.metadata.name)

  return `${basename}.${normalizedExtension}`
}
