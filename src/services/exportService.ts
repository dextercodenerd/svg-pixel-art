// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { abgrToHex, isTransparentAbgr } from './colorUtils'
import {
  DEFAULT_DOCUMENT_NAME,
  DOCUMENT_VERSION,
  EMPTY_PIXEL,
} from '../types'
import type { EditorDocument } from '../types'

interface SerializableDocument {
  version: 1
  width: number
  height: number
  pixels: string[]
  metadata: { name: string; createdAt: string; updatedAt: string }
}

function normalizeDocumentName(name: string): string {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed : DEFAULT_DOCUMENT_NAME
}

function toSerializableDocument(document: EditorDocument): SerializableDocument {
  return {
    version: DOCUMENT_VERSION,
    width: document.width,
    height: document.height,
    pixels: Array.from(document.pixels, v =>
      isTransparentAbgr(v) ? EMPTY_PIXEL : abgrToHex(v),
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

export function documentToCompactJson(document: EditorDocument): string {
  return JSON.stringify(toSerializableDocument(document))
}

export function documentToSvg(document: EditorDocument): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${document.width} ${document.height}" width="${document.width}" height="${document.height}" shape-rendering="crispEdges">`,
    `  <title>${escapeXml(normalizeDocumentName(document.metadata.name))}</title>`,
  ]

  for (let index = 0; index < document.pixels.length; index += 1) {
    const value = document.pixels[index]!
    if (isTransparentAbgr(value)) {
      continue
    }

    const r = value & 0xff
    const g = (value >>> 8) & 0xff
    const b = (value >>> 16) & 0xff
    const a = (value >>> 24) & 0xff
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
