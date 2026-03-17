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
import type { PanOffset } from '../types'
import type { Ref } from 'vue'
import { PAN_CLAMP_MARGIN, VIEWPORT_GUTTER, SCROLLBAR_SIZE } from '../types'
import { clamp } from '../utils/math'

interface CanvasSize {
  width: number
  height: number
}

interface UsePanOptions {
  viewportRef: Ref<HTMLElement | null>
  getCanvasSize: (scaleMultiplier?: number) => CanvasSize
}

interface PointerPosition {
  x: number
  y: number
}

export function usePan(options: UsePanOptions) {
  const editorStore = useEditorStore()
  const { panOffset } = storeToRefs(editorStore)

  const isPanning = ref(false)
  const panStartPointer = ref<PointerPosition>({ x: 0, y: 0 })
  const panStartOffset = ref<PanOffset>({ x: 0, y: 0 })

  function getViewportSize(): CanvasSize | null {
    const viewport = options.viewportRef.value
    if (viewport == null) {
      return null
    }

    return {
      width: viewport.clientWidth,
      height: viewport.clientHeight,
    }
  }

  function clampPan(
    offset: PanOffset,
    scaleMultiplier = 1,
    margin: number | 'strict' = PAN_CLAMP_MARGIN,
  ): PanOffset {
    const viewportSize = getViewportSize()
    if (viewportSize == null) {
      return { ...offset }
    }

    const canvasSize = options.getCanvasSize(scaleMultiplier)

    let minX, minY, maxX, maxY

    if (margin === 'strict') {
      // Content edges touch viewport edges minus VIEWPORT_GUTTER (or centered if smaller)
      // Check for scrollbar visibility to adjust margins asymmetrically
      const vScroll = canvasSize.height + VIEWPORT_GUTTER * 2 > viewportSize.height ? SCROLLBAR_SIZE : 0
      const hScroll = canvasSize.width + VIEWPORT_GUTTER * 2 > viewportSize.width ? SCROLLBAR_SIZE : 0

      if (canvasSize.width + VIEWPORT_GUTTER * 2 + vScroll > viewportSize.width) {
        minX = viewportSize.width - canvasSize.width - VIEWPORT_GUTTER - vScroll
        maxX = VIEWPORT_GUTTER
      } else {
        const center = Math.round((viewportSize.width - canvasSize.width - vScroll) / 2)
        minX = center
        maxX = center
      }

      if (canvasSize.height + VIEWPORT_GUTTER * 2 + hScroll > viewportSize.height) {
        minY = viewportSize.height - canvasSize.height - VIEWPORT_GUTTER - hScroll
        maxY = VIEWPORT_GUTTER
      } else {
        const center = Math.round((viewportSize.height - canvasSize.height - hScroll) / 2)
        minY = center
        maxY = center
      }
    } else {
      minX = margin - canvasSize.width
      minY = margin - canvasSize.height
      maxX = viewportSize.width - margin
      maxY = viewportSize.height - margin
    }

    return {
      x: clamp(offset.x, minX, maxX),
      y: clamp(offset.y, minY, maxY),
    }
  }

  function setPanClamped(
    offset: PanOffset,
    scaleMultiplier = 1,
    margin: number | 'strict' = PAN_CLAMP_MARGIN,
  ): PanOffset {
    const nextOffset = clampPan(offset, scaleMultiplier, margin)
    editorStore.setPan(nextOffset)
    return nextOffset
  }

  function centerIfFit(scaleMultiplier = 1): PanOffset | null {
    const viewportSize = getViewportSize()
    if (viewportSize == null) {
      return null
    }

    const canvasSize = options.getCanvasSize(scaleMultiplier)
    const nextOffset = {
      x:
        canvasSize.width <= viewportSize.width
          ? Math.round((viewportSize.width - canvasSize.width) / 2)
          : 0,
      y:
        canvasSize.height <= viewportSize.height
          ? Math.round((viewportSize.height - canvasSize.height) / 2)
          : 0,
    }

    return setPanClamped(nextOffset, scaleMultiplier)
  }

  function resetForDocumentBounds(scaleMultiplier = 1): PanOffset | null {
    return centerIfFit(scaleMultiplier)
  }

  function clampCurrentPan(scaleMultiplier = 1, margin: number | 'strict' = PAN_CLAMP_MARGIN): PanOffset {
    return setPanClamped(panOffset.value, scaleMultiplier, margin)
  }

  function startPan(clientX: number, clientY: number) {
    isPanning.value = true
    panStartPointer.value = { x: clientX, y: clientY }
    panStartOffset.value = { ...panOffset.value }
  }

  function updatePan(
    clientX: number,
    clientY: number,
    scaleMultiplier = 1,
    margin: number | 'strict' = PAN_CLAMP_MARGIN,
  ): PanOffset | null {
    if (!isPanning.value) {
      return null
    }

    const deltaX = clientX - panStartPointer.value.x
    const deltaY = clientY - panStartPointer.value.y

    return setPanClamped(
      {
        x: panStartOffset.value.x + deltaX,
        y: panStartOffset.value.y + deltaY,
      },
      scaleMultiplier,
      margin,
    )
  }

  function stopPan() {
    isPanning.value = false
  }

  return {
    panOffset,
    isPanning,
    clampPan,
    setPanClamped,
    centerIfFit,
    resetForDocumentBounds,
    clampCurrentPan,
    startPan,
    updatePan,
    stopPan,
  }
}
