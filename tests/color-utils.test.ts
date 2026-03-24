// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { describe, expect, it } from 'vitest'
import {
  abgrToHex,
  compositeSourceOverAbgr,
  formatHex,
  hexToAbgr,
  hexToAlpha,
  hexToRgb,
  hsvToRgb,
  isTransparentAbgr,
  normalizeHexInput,
  parseHex,
  rgbToHsv,
} from '../src/services/colorUtils'

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

  it('normalizes six-digit input by trimming, lowercasing, and expanding alpha', () => {
    expect(normalizeHexInput(' #AABBCC ')).toBe('#aabbccff')
  })

  it('returns null for invalid normalized input', () => {
    expect(normalizeHexInput('')).toBeNull()
    expect(normalizeHexInput('#abcd')).toBeNull()
    expect(normalizeHexInput('#zzzzzz')).toBeNull()
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

describe('hexToAbgr', () => {
  it('converts #rrggbbaa to ABGR uint32', () => {
    // #ff000080 → r=255 g=0 b=0 a=128 → ABGR = (128<<24)|(0<<16)|(0<<8)|255
    expect(hexToAbgr('#ff000080')).toBe(((128 << 24) | (0 << 16) | (0 << 8) | 255) >>> 0)
  })

  it('converts opaque black', () => {
    // #000000ff → r=0 g=0 b=0 a=255 → ABGR = 0xff000000
    expect(hexToAbgr('#000000ff')).toBe(0xff000000 >>> 0)
  })

  it('converts opaque white', () => {
    // #ffffffff → all 0xff → 0xffffffff
    expect(hexToAbgr('#ffffffff')).toBe(0xffffffff >>> 0)
  })

  it('returns 0 for null, undefined, and empty string', () => {
    expect(hexToAbgr(null)).toBe(0)
    expect(hexToAbgr(undefined)).toBe(0)
    expect(hexToAbgr('')).toBe(0)
  })

  it('returns 0 for fully transparent colors', () => {
    expect(hexToAbgr('#ff000000')).toBe(0)
  })

  it('handles mixed-case input', () => {
    expect(hexToAbgr('#AABBCCDD')).toBe(hexToAbgr('#aabbccdd'))
  })
})

describe('abgrToHex', () => {
  it('converts ABGR uint32 back to hex string', () => {
    const abgr = hexToAbgr('#33669980')
    expect(abgrToHex(abgr!)).toBe('#33669980')
  })

  it('returns empty string for zero (transparent)', () => {
    expect(abgrToHex(0)).toBe('')
  })

  it('returns empty string for any zero-alpha value', () => {
    // Any value with alpha byte = 0 is transparent
    expect(abgrToHex(0x00ff0000)).toBe('')
  })

  it('round-trips through hexToAbgr and abgrToHex', () => {
    const colors = ['#d7263dff', '#f49d37ff', '#3f88c5ff', '#1a936fff', '#5f4bb6ff', '#c0b7b180']
    for (const hex of colors) {
      expect(abgrToHex(hexToAbgr(hex))).toBe(hex)
    }
  })
})

describe('compositeSourceOverAbgr', () => {
  const h = hexToAbgr

  it('returns src unchanged when src is fully opaque', () => {
    const src = h('#ff0000ff')
    const dst = h('#0000ffff')
    expect(compositeSourceOverAbgr(dst, src)).toBe(src)
  })

  it('returns dst unchanged when src is fully transparent', () => {
    const dst = h('#0000ffff')
    expect(compositeSourceOverAbgr(dst, 0)).toBe(dst)
  })

  it('returns src unchanged when dst is fully transparent', () => {
    const src = h('#ff000080')
    expect(compositeSourceOverAbgr(0, src)).toBe(src)
  })

  it('canonicalizes hidden RGB bytes in transparent fast paths', () => {
    expect(compositeSourceOverAbgr(0x00ffffff, 0)).toBe(0)
    expect(compositeSourceOverAbgr(0, 0x00ffffff)).toBe(0)
    expect(compositeSourceOverAbgr(0x00ffffff, 0x00abcdef)).toBe(0)
  })

  it('composites 50% red over opaque blue to the expected blended value', () => {
    // src = #ff000080 → srcR=255, srcG=0, srcB=0, srcA=128
    // dst = #0000ffff → dstR=0, dstG=0, dstB=255, dstA=255
    // outA=255, outR=128, outG=0, outB=127
    // ABGR = 0xff7f0080
    const src = h('#ff000080')
    const dst = h('#0000ffff')
    expect(compositeSourceOverAbgr(dst, src)).toBe(0xff7f0080 >>> 0)
  })

  it('compositing 50% red over 50% blue produces alpha greater than either input', () => {
    const src = h('#ff000080')
    const dst = h('#0000ff80')
    const result = compositeSourceOverAbgr(dst, src)
    const outA = (result >>> 24) & 0xff
    expect(outA).toBeGreaterThan(128)
    expect(result).toBe(0xc05500aa >>> 0)
  })

  it('is asymmetric: composite(A, B) !== composite(B, A)', () => {
    const a = h('#ff000080')
    const b = h('#0000ff80')
    expect(compositeSourceOverAbgr(b, a)).not.toBe(compositeSourceOverAbgr(a, b))
  })

  it('handles near-edge alpha=1 without clamping errors', () => {
    const src = ((1 << 24) | (255)) >>> 0  // near-transparent red
    const dst = h('#0000ffff')
    const result = compositeSourceOverAbgr(dst, src)
    expect(result).toBeGreaterThan(0)
  })

  it('handles near-edge alpha=254 without clamping errors', () => {
    const src = ((254 << 24) | (255)) >>> 0  // near-opaque red
    const dst = h('#0000ffff')
    const result = compositeSourceOverAbgr(dst, src)
    const outA = (result >>> 24) & 0xff
    expect(outA).toBe(255)
  })

  it('matches the expected integer result for translucent source over translucent destination', () => {
    const src = 0x21fe89e6 >>> 0
    const dst = 0x04d72c6b >>> 0

    expect(compositeSourceOverAbgr(dst, src)).toBe(0x24fa80da >>> 0)
  })
})

describe('isTransparentAbgr', () => {
  it('returns true for 0', () => {
    expect(isTransparentAbgr(0)).toBe(true)
  })

  it('returns true when alpha byte is 0 but other bytes are set', () => {
    expect(isTransparentAbgr(0x00ffffff)).toBe(true)
  })

  it('returns false for any non-zero alpha', () => {
    expect(isTransparentAbgr(0x01000000)).toBe(false)
    expect(isTransparentAbgr(0xff000000 >>> 0)).toBe(false)
  })
})
