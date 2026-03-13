// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useEditorStore } from '../stores/editor'
import { BASE_PIXEL_SIZE } from '../types'
import { getNearestZoomLevel } from './useZoom'
import type { PanOffset } from '../types'
import type { Ref } from 'vue'

interface TouchPoint {
  x: number
  y: number
}

interface GestureState {
  focusArtX: number
  focusArtY: number
  initialZoom: number
  initialDistance: number
  lastCenter: TouchPoint
}

interface UseTouchViewportOptions {
  clampPan: (offset: PanOffset, scaleMultiplier?: number) => PanOffset
  viewportRef: Ref<HTMLElement | null>
  zoomToLevel: (level: number) => number
  renderScale: Ref<number>
}

function getViewportTouchPoint(touch: Touch, viewport: HTMLElement): TouchPoint {
  const rect = viewport.getBoundingClientRect()

  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  }
}

function getTouchCenter(touches: TouchList, viewport: HTMLElement): TouchPoint {
  const firstTouch = getViewportTouchPoint(touches[0]!, viewport)
  const secondTouch = getViewportTouchPoint(touches[1]!, viewport)

  return {
    x: (firstTouch.x + secondTouch.x) / 2,
    y: (firstTouch.y + secondTouch.y) / 2,
  }
}

function getTouchDistance(touches: TouchList, viewport: HTMLElement): number {
  const firstTouch = getViewportTouchPoint(touches[0]!, viewport)
  const secondTouch = getViewportTouchPoint(touches[1]!, viewport)
  const deltaX = secondTouch.x - firstTouch.x
  const deltaY = secondTouch.y - firstTouch.y

  return Math.max(1, Math.hypot(deltaX, deltaY))
}

export function useTouchViewport(options: UseTouchViewportOptions) {
  const editorStore = useEditorStore()
  const { panOffset, zoom } = storeToRefs(editorStore)

  const isGestureActive = ref(false)
  const previewScale = ref(1)
  const previewPan = ref<PanOffset | null>(null)
  const gestureState = ref<GestureState | null>(null)

  function beginGesture(touches: TouchList): boolean {
    const viewport = options.viewportRef.value
    if (touches.length < 2 || viewport == null) {
      return false
    }

    const center = getTouchCenter(touches, viewport)
    const distance = getTouchDistance(touches, viewport)
    const currentRenderScale = options.renderScale.value

    gestureState.value = {
      focusArtX: (center.x - panOffset.value.x) / currentRenderScale,
      focusArtY: (center.y - panOffset.value.y) / currentRenderScale,
      initialZoom: zoom.value,
      initialDistance: distance,
      lastCenter: center,
    }

    isGestureActive.value = true
    previewScale.value = 1
    previewPan.value = { ...panOffset.value }
    return true
  }

  function updateGesture(touches: TouchList): boolean {
    const state = gestureState.value
    const viewport = options.viewportRef.value
    if (touches.length < 2 || state == null || viewport == null) {
      return false
    }

    const center = getTouchCenter(touches, viewport)
    const distance = getTouchDistance(touches, viewport)
    const nextScale = distance / state.initialDistance
    const focusCanvasX = state.focusArtX * options.renderScale.value
    const focusCanvasY = state.focusArtY * options.renderScale.value

    previewScale.value = nextScale
    previewPan.value = options.clampPan(
      {
        x: center.x - focusCanvasX * nextScale,
        y: center.y - focusCanvasY * nextScale,
      },
      nextScale,
    )
    state.lastCenter = center

    return true
  }

  function commitGesture(): boolean {
    const state = gestureState.value
    if (state == null) {
      return false
    }

    const snappedZoom = getNearestZoomLevel(state.initialZoom * previewScale.value)
    const newRenderScale = BASE_PIXEL_SIZE * snappedZoom
    const nextPan = {
      x: state.lastCenter.x - state.focusArtX * newRenderScale,
      y: state.lastCenter.y - state.focusArtY * newRenderScale,
    }

    options.zoomToLevel(snappedZoom)
    editorStore.setPan(options.clampPan(nextPan))

    gestureState.value = null
    isGestureActive.value = false
    previewScale.value = 1
    previewPan.value = null
    return true
  }

  function handleTouchStart(event: TouchEvent): boolean {
    if (event.touches.length < 2) {
      return false
    }

    if (!isGestureActive.value) {
      return beginGesture(event.touches)
    }

    return updateGesture(event.touches)
  }

  function handleTouchMove(event: TouchEvent): boolean {
    if (!isGestureActive.value || event.touches.length < 2) {
      return false
    }

    return updateGesture(event.touches)
  }

  function handleTouchEnd(event: TouchEvent): boolean {
    if (!isGestureActive.value || event.touches.length >= 2) {
      return false
    }

    return commitGesture()
  }

  function cancelGesture(): boolean {
    if (!isGestureActive.value) {
      return false
    }

    return commitGesture()
  }

  return {
    isGestureActive,
    previewScale,
    previewPan,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    cancelGesture,
  }
}
