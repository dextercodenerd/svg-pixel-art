// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { usePan } from '../src/composables/usePan'

// Viewport: 600×400. Canvas: 256×256 (32×32 doc at zoom 1, BASE_PIXEL_SIZE=8).
// Clamp margins: minX = 32 - 256 = -224, maxX = 600 - 32 = 568
//                minY = 32 - 256 = -224, maxY = 400 - 32 = 368

function makeViewportRef(width: number, height: number) {
  return ref({ clientWidth: width, clientHeight: height } as HTMLElement)
}

function makePan(viewportW: number, viewportH: number, canvasW: number, canvasH: number) {
  return usePan({
    viewportRef: makeViewportRef(viewportW, viewportH),
    getCanvasSize: (m = 1) => ({ width: canvasW * m, height: canvasH * m }),
  })
}

describe('usePan.clampPan', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns the offset unchanged when the viewport ref is null', () => {
    const { clampPan } = usePan({
      viewportRef: ref(null),
      getCanvasSize: () => ({ width: 256, height: 256 }),
    })

    expect(clampPan({ x: -999, y: 999 })).toEqual({ x: -999, y: 999 })
  })

  it('leaves an already-valid offset unchanged', () => {
    const { clampPan } = makePan(600, 400, 256, 256)

    expect(clampPan({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
    expect(clampPan({ x: 172, y: 72 })).toEqual({ x: 172, y: 72 })
  })

  it('clamps x when canvas is scrolled too far left or right', () => {
    const { clampPan } = makePan(600, 400, 256, 256)

    expect(clampPan({ x: -300, y: 0 }).x).toBe(-224)
    expect(clampPan({ x: 600, y: 0 }).x).toBe(568)
  })

  it('clamps y when canvas is scrolled too far up or down', () => {
    const { clampPan } = makePan(600, 400, 256, 256)

    expect(clampPan({ x: 0, y: -300 }).y).toBe(-224)
    expect(clampPan({ x: 0, y: 400 }).y).toBe(368)
  })

  it('allows panning further left when scaleMultiplier increases the effective canvas size', () => {
    // scaleMultiplier=1 → canvasSize 256 → minX = 32 - 256 = -224: x=-300 gets clamped
    // scaleMultiplier=2 → canvasSize 512 → minX = 32 - 512 = -480: x=-300 is now within range
    const { clampPan } = makePan(600, 400, 256, 256)

    expect(clampPan({ x: -300, y: 0 }, 1).x).toBe(-224)
    expect(clampPan({ x: -300, y: 0 }, 2).x).toBe(-300)
  })
})

describe('usePan.centerIfFit', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('centers the canvas when it fits within the viewport', () => {
    const { centerIfFit } = makePan(600, 400, 256, 256)

    const offset = centerIfFit()!
    expect(offset.x).toBe(172) // (600 - 256) / 2
    expect(offset.y).toBe(72) // (400 - 256) / 2
  })

  it('places canvas at (0, 0) when it is larger than the viewport in both axes', () => {
    const { centerIfFit } = makePan(200, 150, 256, 256)

    const offset = centerIfFit()!
    expect(offset.x).toBe(0)
    expect(offset.y).toBe(0)
  })

  it('centers only the axis that fits', () => {
    // Canvas 256 wide, 512 tall. Viewport 600×400.
    // x fits: (600-256)/2 = 172. y does not fit: 0.
    const { centerIfFit } = makePan(600, 400, 256, 512)

    const offset = centerIfFit()!
    expect(offset.x).toBe(172)
    expect(offset.y).toBe(0)
  })

  it('returns null when the viewport ref is null', () => {
    const { centerIfFit } = usePan({
      viewportRef: ref(null),
      getCanvasSize: () => ({ width: 256, height: 256 }),
    })

    expect(centerIfFit()).toBeNull()
  })
})
