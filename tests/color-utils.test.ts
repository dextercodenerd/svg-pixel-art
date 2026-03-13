// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { describe, expect, it } from 'vitest'
import { formatHex, hexToAlpha, hexToRgb, hsvToRgb, parseHex, rgbToHsv } from '../src/services/colorUtils'

describe('colorUtils', () => {
  it('parses and formats 8-digit RGBA hex colors', () => {
    expect(parseHex('#33669980')).toEqual({ r: 51, g: 102, b: 153, a: 128 })
    expect(formatHex({ r: 51, g: 102, b: 153, a: 128 })).toBe('#33669980')
  })

  it('supports six-digit colors by assuming full alpha', () => {
    expect(hexToRgb('#abcdef')).toEqual({ r: 171, g: 205, b: 239 })
    expect(hexToAlpha('#abcdef')).toBe(1)
  })

  it('round-trips rgb and hsv values for a representative color', () => {
    const hsv = rgbToHsv(255, 128, 0)
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v)

    expect(hsv).toEqual({ h: 30, s: 1, v: 1 })
    expect(rgb).toEqual({ r: 255, g: 128, b: 0 })
  })
})
