// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { describe, expect, it } from 'vitest'
import {
  documentToCompactJson,
  documentToJson,
  documentToSvg,
  getDocumentFilename,
} from '../src/services/exportService'
import { createEditorDocument, EMPTY_PIXEL } from '../src/types'

describe('documentToJson', () => {
  it('normalizes all fully transparent pixels to empty strings and falls back blank names', () => {
    const document = createEditorDocument({
      width: 3,
      height: 1,
      name: '   ',
    })
    document.pixels = [EMPTY_PIXEL, '#ff00aa00', '#abcdef88']

    expect(JSON.parse(documentToJson(document))).toEqual({
      version: 1,
      width: 3,
      height: 1,
      pixels: ['', '', '#abcdef88'],
      metadata: {
        name: 'untitled-svg-pixel-art',
        createdAt: document.metadata.createdAt,
        updatedAt: document.metadata.updatedAt,
      },
    })
  })

  it('serializes compact draft JSON without pretty-print whitespace', () => {
    const document = createEditorDocument({ width: 1, height: 2, name: 'draft' })
    document.pixels = ['#abcdef88', '#ff00aa00']

    expect(documentToCompactJson(document)).toBe(
      '{"version":1,"width":1,"height":2,"pixels":["#abcdef88",""],"metadata":{"name":"draft","createdAt":"' +
        document.metadata.createdAt +
        '","updatedAt":"' +
        document.metadata.updatedAt +
        '"}}',
    )
    expect(JSON.parse(documentToCompactJson(document))).toEqual(
      JSON.parse(documentToJson(document)),
    )
  })
})

describe('documentToSvg', () => {
  it('skips fully transparent pixels and preserves alpha via fill-opacity', () => {
    const document = createEditorDocument({
      width: 2,
      height: 2,
      name: 'Alpha & <Title>',
    })
    document.pixels = [EMPTY_PIXEL, '#11223380', '#ff00aa00', '#abcdef12']

    const svg = documentToSvg(document)

    expect(svg).toContain('<title>Alpha &amp; &lt;Title&gt;</title>')
    expect(svg.match(/<rect /g)).toHaveLength(2)
    expect(svg).toContain(
      '<rect x="1" y="0" width="1" height="1" fill="#112233" fill-opacity="0.502" />',
    )
    expect(svg).toContain(
      '<rect x="1" y="1" width="1" height="1" fill="#abcdef" fill-opacity="0.071" />',
    )
    expect(svg).not.toContain('x="0" y="0"')
    expect(svg).not.toContain('x="0" y="1"')
  })

  it('omits fill-opacity for fully opaque pixels', () => {
    const document = createEditorDocument({ width: 1, height: 1, name: 'opaque' })
    document.pixels = ['#fedcbaff']

    expect(documentToSvg(document)).toContain(
      '<rect x="0" y="0" width="1" height="1" fill="#fedcba" />',
    )
    expect(documentToSvg(document)).not.toContain('fill-opacity=')
  })
})

describe('getDocumentFilename', () => {
  it('sanitizes reserved filename characters', () => {
    const document = createEditorDocument({ name: 'bad:name*?' })

    expect(getDocumentFilename(document, 'svg')).toBe('bad-name--.svg')
  })

  it('falls back to the default document name when metadata is blank', () => {
    const document = createEditorDocument({ name: '   ' })

    expect(getDocumentFilename(document, '.json')).toBe('untitled-svg-pixel-art.json')
  })
})
