// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { clampByte, clampUnit } from '../utils/math'

export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface ParsedHexColor extends RgbColor {
  a: number
}

export interface HsvColor {
  h: number
  s: number
  v: number
}

// Valid forms: #RRGGBB or #RRGGBBAA (with or without leading #)
const HEX_6 = 6
const HEX_8 = 8

function isValidHex(s: string, normalizedLength: number): boolean {
  return (normalizedLength === HEX_6 || normalizedLength === HEX_8) && /^[0-9a-f]+$/i.test(s)
}

function parseHexByte(s: string, offset: number): number {
  return (charToNibble(s, offset) << 4) | charToNibble(s, offset + 1)
}

function charToNibble(s: string, i: number): number {
  const c = s.charCodeAt(i)
  // '0'-'9' = 48-57, 'a'-'f' = 97-102, 'A'-'F' = 65-70
  if (c >= 48 && c <= 57) {
    return c - 48
  }
  if (c >= 65 && c <= 70) {
    return c - 55
  }
  if (c >= 97 && c <= 102) {
    return c - 87
  }
  return 0
}

export function parseHex(value: string): ParsedHexColor {
  const s = value.startsWith('#') ? value.slice(1) : value
  if (!isValidHex(s, s.length)) {
    throw new Error(`Invalid hex color: ${value}`)
  }

  const r = parseHexByte(s, 0)
  const g = parseHexByte(s, 2)
  const b = parseHexByte(s, 4)
  const a = s.length === HEX_8 ? parseHexByte(s, 6) : 255

  return { r, g, b, a }
}

function toHexByte(value: number): string {
  return clampByte(value).toString(16).padStart(2, '0')
}

export function formatHex(color: ParsedHexColor): string {
  return `#${toHexByte(color.r)}${toHexByte(color.g)}${toHexByte(color.b)}${toHexByte(color.a)}`
}

export function normalizeHexInput(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  const normalized = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed
  if (!isValidHex(normalized, normalized.length)) {
    return null
  }

  return `#${(normalized.length === HEX_6 ? `${normalized}ff` : normalized).toLowerCase()}`
}

export function hexToRgb(value: string): RgbColor {
  const { r, g, b } = parseHex(value)
  return { r, g, b }
}

export function hexToAlpha(value: string): number {
  return parseHex(value).a / 255
}

export function hexToHsv(value: string): HsvColor {
  const { r, g, b } = parseHex(value)
  return rgbToHsv(r, g, b)
}

export function rgbToHsv(r: number, g: number, b: number): HsvColor {
  const red = clampByte(r) / 255
  const green = clampByte(g) / 255
  const blue = clampByte(b) / 255

  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min

  let hue = 0

  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6
    } else if (max === green) {
      hue = (blue - red) / delta + 2
    } else {
      hue = (red - green) / delta + 4
    }
  }

  hue = ((Math.round(hue * 60) % 360) + 360) % 360

  const saturation = max === 0 ? 0 : delta / max

  return {
    h: hue,
    s: saturation,
    v: max,
  }
}

/**
 * Convert a '#rrggbbaa' hex string to a uint32 in ABGR byte order
 * (little-endian native), suitable for direct ImageData buffer writes.
 * Returns 0 for null, undefined, or empty-string inputs.
 */
export function hexToAbgr(hex: string | null | undefined): number {
  if (hex == null || hex === '') {
    return 0
  }

  const { r, g, b, a } = parseHex(hex)
  if (a === 0) {
    return 0
  }
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0
}

/**
 * Convert an ABGR uint32 back to a '#rrggbbaa' hex string.
 * Returns '' (EMPTY_PIXEL) when the alpha byte is 0.
 */
export function abgrToHex(value: number): string {
  if (value >>> 24 === 0) {
    return ''
  }

  return formatHex({
    r: value & 0xff,
    g: (value >>> 8) & 0xff,
    b: (value >>> 16) & 0xff,
    a: (value >>> 24) & 0xff,
  })
}

/** True when the alpha byte of an ABGR uint32 is 0. */
export function isTransparentAbgr(value: number): boolean {
  return value >>> 24 === 0
}

export function hsvToRgb(h: number, s: number, v: number): RgbColor {
  const hue = ((h % 360) + 360) % 360
  const saturation = clampUnit(s)
  const value = clampUnit(v)

  const chroma = value * saturation
  const hueSection = hue / 60
  const secondComponent = chroma * (1 - Math.abs((hueSection % 2) - 1))

  let red = 0
  let green = 0
  let blue = 0

  if (hueSection >= 0 && hueSection < 1) {
    red = chroma
    green = secondComponent
  } else if (hueSection >= 1 && hueSection < 2) {
    red = secondComponent
    green = chroma
  } else if (hueSection >= 2 && hueSection < 3) {
    green = chroma
    blue = secondComponent
  } else if (hueSection >= 3 && hueSection < 4) {
    green = secondComponent
    blue = chroma
  } else if (hueSection >= 4 && hueSection < 5) {
    red = secondComponent
    blue = chroma
  } else {
    red = chroma
    blue = secondComponent
  }

  const match = value - chroma

  return {
    r: clampByte((red + match) * 255),
    g: clampByte((green + match) * 255),
    b: clampByte((blue + match) * 255),
  }
}

function srgbToLinear(channel: number): number {
  const c = clampByte(channel) / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function getContrastingTextHex(bgHex: string): '#000000ff' | '#ffffffff' {
  const { r, g, b } = parseHex(bgHex)
  const rl = srgbToLinear(r)
  const gl = srgbToLinear(g)
  const bl = srgbToLinear(b)
  const luminance = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
  return luminance > 0.5 ? '#000000ff' : '#ffffffff'
}

export function applyAlphaToHex(hex: string, alpha: number): string {
  try {
    const parsed = parseHex(hex)
    parsed.a = clampByte(Math.round(alpha * 255))
    return formatHex(parsed)
  } catch {
    return hex
  }
}

/**
 * Porter-Duff "source over" compositing in integer ABGR arithmetic.
 * Draws src on top of dst and returns the blended ABGR uint32.
 */
export function compositeSourceOverAbgr(dst: number, src: number): number {
  const srcA = (src >>> 24) & 0xff
  const normalizedSrc = srcA === 0 ? 0 : src
  if (srcA === 255) {
    return normalizedSrc
  }
  if (srcA === 0) {
    return ((dst >>> 24) & 0xff) === 0 ? 0 : dst
  }

  const dstA = (dst >>> 24) & 0xff
  if (dstA === 0) {
    return normalizedSrc
  }

  const srcR = src & 0xff
  const srcG = (src >>> 8) & 0xff
  const srcB = (src >>> 16) & 0xff
  const dstR = dst & 0xff
  const dstG = (dst >>> 8) & 0xff
  const dstB = (dst >>> 16) & 0xff

  const invSrcA = 255 - srcA
  const outAlphaNumerator = srcA * 255 + dstA * invSrcA
  const outA = ((outAlphaNumerator + 127) / 255) | 0

  const compositeChannel = (srcChannel: number, dstChannel: number) =>
    ((srcChannel * srcA * 255 + dstChannel * dstA * invSrcA + (outAlphaNumerator >> 1)) /
      outAlphaNumerator) |
    0

  const outR = compositeChannel(srcR, dstR)
  const outG = compositeChannel(srcG, dstG)
  const outB = compositeChannel(srcB, dstB)

  return ((outA << 24) | (outB << 16) | (outG << 8) | outR) >>> 0
}

/** Replace the alpha byte of an ABGR uint32 with the given opacity (0–1). */
export function applyAlphaToAbgr(value: number, alpha: number): number {
  const a = clampByte(Math.round(alpha * 255))
  return (value & 0x00ffffff) | (a << 24)
}
