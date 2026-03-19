// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import {
  applyColorAtIndices,
  bresenhamLine,
  collectRectangleIndices,
  collectStrokeIndices,
  createPixelMask,
  floodFill,
  stampBrushInto,
} from '../services/pixelOps'
import { applyAlphaToHex } from '../services/colorUtils'
import { useColorStore } from '../stores/color'
import { useEditorStore } from '../stores/editor'
import { EMPTY_PIXEL, TRANSPARENT, isTransparentPixel, normalizeTransparentPixel } from '../types'
import type { ActiveColorSlot, PanOffset, ToolId } from '../types'
import type { Ref } from 'vue'

interface CanvasPoint {
  col: number
  row: number
}

interface CanvasCursor {
  col: number
  row: number
  size: number
}

type PreviewMode = 'overlay' | 'replace'

interface StrokeSession {
  color: string
  draftPixels: string[]
  hasChanges: boolean
  kind: 'stroke'
  lastPoint: CanvasPoint
  pointerId: number
}

interface LineSession {
  basePixels: string[]
  color: string
  currentPoint: CanvasPoint
  hasChanges: boolean
  kind: 'line'
  lineIndices: number[]
  pointerId: number
  startPoint: CanvasPoint
}

interface RectangleSession {
  basePixels: string[]
  currentPoint: CanvasPoint
  fillColor: string
  hasChanges: boolean
  kind: 'rectangle'
  pointerId: number
  startPoint: CanvasPoint
  strokeColor: string
  strokeIndices: number[]
  fillIndices: number[]
}

type ActiveSession = LineSession | RectangleSession | StrokeSession

interface UseCanvasPointerOptions {
  displayPan: Ref<PanOffset>
  displayScale: Ref<number>
  isPanning: Ref<boolean>
  isTouchGestureActive: Ref<boolean>
  renderScale: Ref<number>
  spacePressed: Ref<boolean>
  viewportRef: Ref<HTMLElement | null>
}

function getDocumentIndex(width: number, col: number, row: number): number {
  return row * width + col
}

function getBrushCursorTarget(col: number, row: number, size: number): CanvasCursor {
  const offset = Math.floor((size - 1) / 2)

  return {
    col: col - offset,
    row: row - offset,
    size,
  }
}

export function useCanvasPointer(options: UseCanvasPointerOptions) {
  const colorStore = useColorStore()
  const editorStore = useEditorStore()
  const { activeSlot, bg, fg } = storeToRefs(colorStore)
  const {
    activeTool,
    brushSize,
    document,
    rectangleFillSlot,
    rectangleStrokeSlot,
    rectangleStrokeWidth,
  } = storeToRefs(editorStore)

  const cursor = ref<CanvasCursor | null>(null)
  const hoverCell = ref<CanvasPoint | null>(null)
  const pointerInsideDocument = ref(false)
  const pointerPosition = ref<{ x: number; y: number } | null>(null)
  const hoverPointerType = ref<string | null>(null)
  const previewPixels = ref<string[] | null>(null)
  const previewMode = ref<PreviewMode>('overlay')

  let activeSession: ActiveSession | null = null

  function clearHoverState() {
    cursor.value = null
    hoverCell.value = null
    pointerInsideDocument.value = false
    pointerPosition.value = null
    hoverPointerType.value = null
  }

  function clearPreviewState() {
    previewPixels.value = null
    previewMode.value = 'overlay'
  }

  function getRelativePointerPosition(clientX: number, clientY: number) {
    const viewport = options.viewportRef.value
    if (viewport == null) {
      return null
    }

    const rect = viewport.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  function getPointFromClientPosition(clientX: number, clientY: number): CanvasPoint | null {
    const relativePosition = getRelativePointerPosition(clientX, clientY)
    if (relativePosition == null) {
      return null
    }

    const effectiveScale = options.renderScale.value * options.displayScale.value
    const col = Math.floor((relativePosition.x - options.displayPan.value.x) / effectiveScale)
    const row = Math.floor((relativePosition.y - options.displayPan.value.y) / effectiveScale)

    if (col < 0 || row < 0 || col >= document.value.width || row >= document.value.height) {
      return null
    }

    return { col, row }
  }

  function updateHoverState(clientX: number, clientY: number, pointerType: string) {
    if (pointerType === 'touch') {
      pointerPosition.value = null
    } else {
      pointerPosition.value = getRelativePointerPosition(clientX, clientY)
    }

    hoverPointerType.value = pointerType

    if (options.isPanning.value || options.isTouchGestureActive.value) {
      cursor.value = null
      hoverCell.value = null
      pointerInsideDocument.value = false
      return null
    }

    const point = getPointFromClientPosition(clientX, clientY)
    if (point == null) {
      cursor.value = null
      hoverCell.value = null
      pointerInsideDocument.value = false
      return null
    }

    hoverCell.value = point
    pointerInsideDocument.value = true
    cursor.value =
      activeTool.value === 'pencil' || activeTool.value === 'eraser'
        ? getBrushCursorTarget(point.col, point.row, brushSize.value)
        : { col: point.col, row: point.row, size: 1 }

    return point
  }

  function getStrokeColor(pointerType: string, button: number, tool: ToolId): string {
    if (tool === 'eraser') {
      return EMPTY_PIXEL
    }

    if (pointerType === 'touch') {
      return activeSlot.value === 'fg' ? fg.value : bg.value
    }

    return button === 2 ? bg.value : fg.value
  }

  function getEyedropperSlot(pointerType: string, button: number): ActiveColorSlot {
    if (pointerType === 'touch') {
      return activeSlot.value
    }

    return button === 2 ? 'bg' : 'fg'
  }

  function sampleVisibleColor(col: number, row: number): string {
    const pixel =
      document.value.pixels[getDocumentIndex(document.value.width, col, row)] ?? EMPTY_PIXEL
    return isTransparentPixel(pixel) ? TRANSPARENT : normalizeTransparentPixel(pixel)
  }

  function applyStrokeSegment(
    pixels: string[],
    from: CanvasPoint,
    to: CanvasPoint,
    color: string,
  ): boolean {
    let changed = false

    for (const point of bresenhamLine(from.col, from.row, to.col, to.row)) {
      changed =
        stampBrushInto(
          pixels,
          document.value.width,
          document.value.height,
          point.col,
          point.row,
          brushSize.value,
          color,
        ) || changed
    }

    return changed
  }

  function renderLinePreview(session: LineSession) {
    const lineIndices = collectStrokeIndices(
      document.value.width,
      document.value.height,
      session.startPoint.col,
      session.startPoint.row,
      session.currentPoint.col,
      session.currentPoint.row,
      brushSize.value,
    )
    const normalizedColor = normalizeTransparentPixel(session.color)
    let hasChanges = false

    for (const index of lineIndices) {
      if (session.basePixels[index] !== normalizedColor) {
        hasChanges = true
        break
      }
    }

    session.lineIndices = lineIndices
    session.hasChanges = hasChanges
    previewPixels.value = createPixelMask(
      session.basePixels.length,
      lineIndices,
      applyAlphaToHex(session.color, 0.65),
    )
    previewMode.value = 'overlay'
  }

  function renderRectanglePreview(session: RectangleSession) {
    const { stroke, fill } = collectRectangleIndices(
      document.value.width,
      document.value.height,
      session.startPoint.col,
      session.startPoint.row,
      session.currentPoint.col,
      session.currentPoint.row,
      rectangleStrokeWidth.value,
      session.fillColor !== TRANSPARENT,
    )

    const normalizedStroke = normalizeTransparentPixel(session.strokeColor)
    const normalizedFill = normalizeTransparentPixel(session.fillColor)
    let hasChanges = false

    for (const index of stroke) {
      if (session.basePixels[index] !== normalizedStroke) {
        hasChanges = true
        break
      }
    }

    if (!hasChanges && normalizedFill !== EMPTY_PIXEL) {
      for (const index of fill) {
        if (session.basePixels[index] !== normalizedFill) {
          hasChanges = true
          break
        }
      }
    }

    session.strokeIndices = stroke
    session.fillIndices = fill
    session.hasChanges = hasChanges

    const preview = Array<string>(session.basePixels.length).fill('')
    const strokePreviewColor = applyAlphaToHex(session.strokeColor, 0.65)
    const fillPreviewColor =
      session.fillColor === TRANSPARENT ? '' : applyAlphaToHex(session.fillColor, 0.65)

    if (fillPreviewColor !== '') {
      for (const index of fill) {
        preview[index] = fillPreviewColor
      }
    }

    for (const index of stroke) {
      preview[index] = strokePreviewColor
    }

    previewPixels.value = preview
    previewMode.value = 'overlay'
  }

  function capturePointer(event: PointerEvent) {
    const target = event.currentTarget
    if (!(target instanceof Element) || !('setPointerCapture' in target)) {
      return
    }

    target.setPointerCapture(event.pointerId)
  }

  function releasePointer(event: PointerEvent) {
    const target = event.currentTarget
    if (!(target instanceof Element) || !('releasePointerCapture' in target)) {
      return
    }

    if (!target.hasPointerCapture(event.pointerId)) {
      return
    }

    target.releasePointerCapture(event.pointerId)
  }

  function commitActiveSession() {
    if (activeSession == null) {
      return
    }

    if (activeSession.kind === 'line' && activeSession.hasChanges) {
      const nextPixels = [...activeSession.basePixels]
      applyColorAtIndices(nextPixels, activeSession.lineIndices, activeSession.color)
      editorStore.setPixels(nextPixels)
    } else if (activeSession.kind === 'rectangle' && activeSession.hasChanges) {
      const nextPixels = [...activeSession.basePixels]
      if (activeSession.fillColor !== TRANSPARENT) {
        applyColorAtIndices(nextPixels, activeSession.fillIndices, activeSession.fillColor)
      }
      applyColorAtIndices(nextPixels, activeSession.strokeIndices, activeSession.strokeColor)
      editorStore.setPixels(nextPixels)
    } else if (activeSession.kind === 'stroke' && activeSession.hasChanges) {
      editorStore.setPixels(activeSession.draftPixels)
    }

    activeSession = null
    clearPreviewState()
  }

  function cancelActiveInteraction() {
    activeSession = null
    clearPreviewState()
  }

  function onPointerDown(event: PointerEvent) {
    if (options.isPanning.value || options.isTouchGestureActive.value) {
      return
    }

    if (event.pointerType !== 'touch') {
      if (options.spacePressed.value || event.button === 1) {
        return
      }

      if (event.button !== 0 && event.button !== 2) {
        return
      }
    }

    const point = updateHoverState(event.clientX, event.clientY, event.pointerType)
    if (point == null) {
      return
    }

    const tool = activeTool.value

    if (tool === 'fill') {
      const targetIndex = getDocumentIndex(document.value.width, point.col, point.row)
      const targetColor = document.value.pixels[targetIndex] ?? EMPTY_PIXEL
      const fillColor = getStrokeColor(event.pointerType, event.button, tool)

      if (normalizeTransparentPixel(targetColor) === normalizeTransparentPixel(fillColor)) {
        return
      }

      editorStore.setPixels(
        floodFill(
          document.value.pixels,
          document.value.width,
          document.value.height,
          point.col,
          point.row,
          targetColor,
          fillColor,
        ),
      )
      event.preventDefault()
      return
    }

    if (tool === 'eyedropper') {
      const sampledColor = sampleVisibleColor(point.col, point.row)
      const slot = getEyedropperSlot(event.pointerType, event.button)

      if (slot === 'fg') {
        colorStore.setFg(sampledColor)
      } else {
        colorStore.setBg(sampledColor)
      }

      event.preventDefault()
      return
    }

    if (tool === 'line') {
      const strokeColor = getStrokeColor(event.pointerType, event.button, tool)
      const session: LineSession = {
        basePixels: [...document.value.pixels],
        color: strokeColor,
        currentPoint: point,
        hasChanges: false,
        kind: 'line',
        lineIndices: [],
        pointerId: event.pointerId,
        startPoint: point,
      }

      activeSession = session
      renderLinePreview(session)
      capturePointer(event)
      event.preventDefault()
      return
    }

    if (tool === 'rectangle') {
      const strokeColor = rectangleStrokeSlot.value === 'fg' ? fg.value : bg.value
      const fillColor =
        rectangleFillSlot.value === 'transparent'
          ? TRANSPARENT
          : rectangleFillSlot.value === 'fg'
            ? fg.value
            : bg.value

      const session: RectangleSession = {
        basePixels: [...document.value.pixels],
        currentPoint: point,
        fillColor,
        hasChanges: false,
        kind: 'rectangle',
        pointerId: event.pointerId,
        startPoint: point,
        strokeColor,
        strokeIndices: [],
        fillIndices: [],
      }

      activeSession = session
      renderRectanglePreview(session)
      capturePointer(event)
      event.preventDefault()
      return
    }

    const strokeColor = getStrokeColor(event.pointerType, event.button, tool)
    const draftPixels = [...document.value.pixels]
    const hasChanges = applyStrokeSegment(draftPixels, point, point, strokeColor)

    activeSession = {
      color: strokeColor,
      draftPixels,
      hasChanges,
      kind: 'stroke',
      lastPoint: point,
      pointerId: event.pointerId,
    }
    previewPixels.value = draftPixels
    previewMode.value = 'replace'
    capturePointer(event)
    event.preventDefault()
  }

  function onPointerMove(event: PointerEvent) {
    const point = updateHoverState(event.clientX, event.clientY, event.pointerType)

    if (activeSession == null || activeSession.pointerId !== event.pointerId || point == null) {
      return
    }

    if (activeSession.kind === 'stroke') {
      if (point.col === activeSession.lastPoint.col && point.row === activeSession.lastPoint.row) {
        return
      }

      activeSession.hasChanges =
        applyStrokeSegment(
          activeSession.draftPixels,
          activeSession.lastPoint,
          point,
          activeSession.color,
        ) || activeSession.hasChanges
      activeSession.lastPoint = point
      // draftPixels is mutated in-place, so re-assigning the same reference here does
      // not trigger Vue's ref change detection (Object.is returns true). The canvas still
      // re-renders on every move because updateHoverState() above always writes a new
      // object to cursor.value, which PixelCanvas watches. Vue batches both writes and
      // flushes them together, so the canvas reads the already-mutated draftPixels array
      // when it draws. The line tool avoids this entirely by producing a fresh array in
      // renderLinePreview() on each move.
      previewPixels.value = activeSession.draftPixels
      previewMode.value = 'replace'
      event.preventDefault()
      return
    }

    if (
      point.col === activeSession.currentPoint.col &&
      point.row === activeSession.currentPoint.row
    ) {
      event.preventDefault()
      return
    }

    activeSession.currentPoint = point

    if (activeSession.kind === 'line') {
      renderLinePreview(activeSession)
    } else if (activeSession.kind === 'rectangle') {
      renderRectanglePreview(activeSession)
    }

    event.preventDefault()
  }

  function onPointerUp(event: PointerEvent) {
    if (activeSession == null || activeSession.pointerId !== event.pointerId) {
      return
    }

    commitActiveSession()
    releasePointer(event)
    updateHoverState(event.clientX, event.clientY, event.pointerType)
    event.preventDefault()
  }

  function onPointerCancel(event: PointerEvent) {
    if (activeSession == null || activeSession.pointerId !== event.pointerId) {
      return
    }

    cancelActiveInteraction()
    releasePointer(event)
    updateHoverState(event.clientX, event.clientY, event.pointerType)
  }

  function onContextMenu(event: MouseEvent) {
    event.preventDefault()
  }

  watch(
    () => [activeTool.value, brushSize.value] as const,
    () => {
      if (hoverCell.value == null) {
        return
      }

      cursor.value =
        activeTool.value === 'pencil' || activeTool.value === 'eraser'
          ? getBrushCursorTarget(hoverCell.value.col, hoverCell.value.row, brushSize.value)
          : { col: hoverCell.value.col, row: hoverCell.value.row, size: 1 }
    },
  )

  return {
    cancelActiveInteraction,
    clearHoverState,
    cursor,
    hoverCell,
    hoverPointerType,
    onContextMenu,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    pointerInsideDocument,
    pointerPosition,
    previewMode,
    previewPixels,
    updateHoverState,
  }
}
