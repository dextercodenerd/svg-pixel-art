// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { describe, expect, it } from 'vitest'
import { formatHex, hexToAlpha, hexToRgb, hsvToRgb, parseHex, rgbToHsv } from '../src/services/colorUtils'

describe('parseHex', () => {
  it('parses and formats 8-digit RGBA hex colors', () => {
    expect(parseHex('#33669980')).toEqual({ r: 51, g: 102, b: 153, a: 128 })
    expect(formatHex({ r: 51, g: 102, b: 153, a: 128 })).toBe('#33669980')
  })

  it('supports six-digit colors by assuming full alpha', () => {
    expect(hexToRgb('#abcdef')).toEqual({ r: 171, g: 205, b: 239 })
    expect(hexToAlpha('#abcdef')).toBe(1)
  })

  it('throws on invalid input', () => {
    expect(() => parseHex('')).toThrow()
    expect(() => parseHex('gg0000ff')).toThrow()
    expect(() => parseHex('#xyz')).toThrow()
  })
})

describe('rgbToHsv', () => {
  it('returns zero saturation and value for black', () => {
    expect(rgbToHsv(0, 0, 0)).toEqual({ h: 0, s: 0, v: 0 })
  })

  it('returns zero saturation and full value for white', () => {
    expect(rgbToHsv(255, 255, 255)).toEqual({ h: 0, s: 0, v: 1 })
  })

  it('returns correct hue for each primary channel being the maximum', () => {
    expect(rgbToHsv(255, 0, 0)).toEqual({ h: 0, s: 1, v: 1 })
    expect(rgbToHsv(0, 255, 0)).toEqual({ h: 120, s: 1, v: 1 })
    expect(rgbToHsv(0, 0, 255)).toEqual({ h: 240, s: 1, v: 1 })
  })

  it('round-trips rgb→hsv→rgb for a representative color', () => {
    const hsv = rgbToHsv(255, 128, 0)
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v)

    expect(hsv).toEqual({ h: 30, s: 1, v: 1 })
    expect(rgb).toEqual({ r: 255, g: 128, b: 0 })
  })
})

describe('hsvToRgb', () => {
  it('produces the six primary and secondary colors at the correct hue boundaries', () => {
    expect(hsvToRgb(0, 1, 1)).toEqual({ r: 255, g: 0, b: 0 })
    expect(hsvToRgb(60, 1, 1)).toEqual({ r: 255, g: 255, b: 0 })
    expect(hsvToRgb(120, 1, 1)).toEqual({ r: 0, g: 255, b: 0 })
    expect(hsvToRgb(180, 1, 1)).toEqual({ r: 0, g: 255, b: 255 })
    expect(hsvToRgb(240, 1, 1)).toEqual({ r: 0, g: 0, b: 255 })
    expect(hsvToRgb(300, 1, 1)).toEqual({ r: 255, g: 0, b: 255 })
  })

  it('treats h=360 the same as h=0', () => {
    expect(hsvToRgb(360, 1, 1)).toEqual(hsvToRgb(0, 1, 1))
  })

  it('treats negative hues by wrapping them into [0, 360)', () => {
    expect(hsvToRgb(-120, 1, 1)).toEqual(hsvToRgb(240, 1, 1))
  })
})
