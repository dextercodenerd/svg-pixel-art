// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
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

const HEX_COLOR_PATTERN = /^#?(?<rgb>[0-9a-f]{6})(?<alpha>[0-9a-f]{2})?$/i

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function toHexByte(value: number): string {
  return clampByte(value).toString(16).padStart(2, '0')
}

export function parseHex(value: string): ParsedHexColor {
  const match = value.match(HEX_COLOR_PATTERN)

  if (!match?.groups?.rgb) {
    throw new Error(`Invalid hex color: ${value}`)
  }

  const rgb = match.groups.rgb
  const alpha = match.groups.alpha ?? 'ff'

  return {
    r: Number.parseInt(rgb.slice(0, 2), 16),
    g: Number.parseInt(rgb.slice(2, 4), 16),
    b: Number.parseInt(rgb.slice(4, 6), 16),
    a: Number.parseInt(alpha, 16),
  }
}

export function formatHex(color: ParsedHexColor): string {
  return `#${toHexByte(color.r)}${toHexByte(color.g)}${toHexByte(color.b)}${toHexByte(color.a)}`
}

export function hexToRgb(value: string): RgbColor {
  const { r, g, b } = parseHex(value)
  return { r, g, b }
}

export function hexToAlpha(value: string): number {
  return parseHex(value).a / 255
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

  hue = Math.round(hue * 60)
  if (hue < 0) {
    hue += 360
  }

  const saturation = max === 0 ? 0 : delta / max

  return {
    h: hue,
    s: saturation,
    v: max,
  }
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
