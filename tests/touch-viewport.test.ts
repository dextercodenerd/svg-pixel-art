// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { computed, ref } from 'vue'
import { getNearestZoomLevel, useZoom } from '../src/composables/useZoom'
import { useTouchViewport } from '../src/composables/useTouchViewport'
import { useEditorStore } from '../src/stores/editor'
import { BASE_PIXEL_SIZE } from '../src/types'
import type { PanOffset } from '../src/types'

function makeViewportRef(width: number, height: number) {
  return ref({
    clientWidth: width,
    clientHeight: height,
    getBoundingClientRect: () =>
      ({
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        width,
        height,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) satisfies DOMRect,
  } as unknown as HTMLElement)
}

function makeTouchList(points: Array<{ x: number; y: number }>): TouchList {
  const touches = points.map(point => {
    return {
      clientX: point.x,
      clientY: point.y,
    } as Touch
  })

  return Object.assign(touches, {
    item(index: number) {
      return touches[index] ?? null
    },
  }) as unknown as TouchList
}

function makeTouchEvent(points: Array<{ x: number; y: number }>): TouchEvent {
  return {
    touches: makeTouchList(points),
  } as TouchEvent
}

function clampPan(offset: PanOffset, scaleMultiplier = 1): PanOffset {
  const viewportWidth = 300
  const viewportHeight = 300
  const canvasWidth = 32 * BASE_PIXEL_SIZE * scaleMultiplier
  const canvasHeight = 32 * BASE_PIXEL_SIZE * scaleMultiplier
  const minX = 32 - canvasWidth
  const minY = 32 - canvasHeight
  const maxX = viewportWidth - 32
  const maxY = viewportHeight - 32

  return {
    x: Math.min(maxX, Math.max(minX, offset.x)),
    y: Math.min(maxY, Math.max(minY, offset.y)),
  }
}

describe('useTouchViewport', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('ignores gestures until two touches are active', () => {
    const editorStore = useEditorStore()
    const viewportRef = makeViewportRef(300, 300)
    const renderScale = computed(() => BASE_PIXEL_SIZE * editorStore.zoom)
    const { zoomToLevel } = useZoom()
    const touchViewport = useTouchViewport({
      clampPan,
      viewportRef,
      zoomToLevel,
      renderScale,
    })

    expect(touchViewport.handleTouchStart(makeTouchEvent([{ x: 50, y: 50 }]))).toBe(false)
    expect(touchViewport.isGestureActive.value).toBe(false)
    expect(touchViewport.previewPan.value).toBeNull()
  })

  it('previews pinch-pan changes and snaps to the nearest logical zoom on commit', () => {
    const editorStore = useEditorStore()
    editorStore.setPan({ x: 10, y: 20 })

    const viewportRef = makeViewportRef(300, 300)
    const renderScale = computed(() => BASE_PIXEL_SIZE * editorStore.zoom)
    const touchViewport = useTouchViewport({
      clampPan,
      viewportRef,
      zoomToLevel(level: number) {
        const nextZoom = getNearestZoomLevel(level)
        editorStore.setZoom(nextZoom)
        return nextZoom
      },
      renderScale,
    })

    expect(
      touchViewport.handleTouchStart(
        makeTouchEvent([
          { x: 50, y: 70 },
          { x: 150, y: 70 },
        ]),
      ),
    ).toBe(true)
    expect(touchViewport.isGestureActive.value).toBe(true)
    expect(touchViewport.previewScale.value).toBe(1)
    expect(touchViewport.previewPan.value).toEqual({ x: 10, y: 20 })

    expect(
      touchViewport.handleTouchMove(
        makeTouchEvent([
          { x: 40, y: 60 },
          { x: 200, y: 60 },
        ]),
      ),
    ).toBe(true)
    expect(touchViewport.previewScale.value).toBeCloseTo(1.6)
    expect(touchViewport.previewPan.value).toEqual({ x: -24, y: -20 })

    expect(touchViewport.handleTouchEnd(makeTouchEvent([{ x: 40, y: 60 }]))).toBe(true)
    expect(editorStore.zoom).toBe(2)
    expect(editorStore.panOffset).toEqual({ x: -60, y: -40 })
    expect(touchViewport.isGestureActive.value).toBe(false)
    expect(touchViewport.previewScale.value).toBe(1)
    expect(touchViewport.previewPan.value).toBeNull()
  })

  it('restores the original zoom and pan when a gesture is cancelled', () => {
    const editorStore = useEditorStore()
    editorStore.setZoom(4)
    editorStore.setPan({ x: -30, y: -10 })

    const viewportRef = makeViewportRef(300, 300)
    const renderScale = computed(() => BASE_PIXEL_SIZE * editorStore.zoom)
    const touchViewport = useTouchViewport({
      clampPan,
      viewportRef,
      zoomToLevel(level: number) {
        const nextZoom = getNearestZoomLevel(level)
        editorStore.setZoom(nextZoom)
        return nextZoom
      },
      renderScale,
    })

    expect(
      touchViewport.handleTouchStart(
        makeTouchEvent([
          { x: 80, y: 80 },
          { x: 160, y: 80 },
        ]),
      ),
    ).toBe(true)
    expect(
      touchViewport.handleTouchMove(
        makeTouchEvent([
          { x: 60, y: 60 },
          { x: 220, y: 60 },
        ]),
      ),
    ).toBe(true)
    expect(touchViewport.previewScale.value).toBeCloseTo(2)
    expect(touchViewport.previewPan.value).not.toEqual({ x: -30, y: -10 })

    expect(touchViewport.cancelGesture()).toBe(true)
    expect(editorStore.zoom).toBe(4)
    expect(editorStore.panOffset).toEqual({ x: -30, y: -10 })
    expect(touchViewport.isGestureActive.value).toBe(false)
    expect(touchViewport.previewScale.value).toBe(1)
    expect(touchViewport.previewPan.value).toBeNull()
  })
})
