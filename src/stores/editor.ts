// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useHistoryStore } from './history'
import type { BrushSize, EditorDocument, PanOffset, ToolId, ZoomLevel } from '../types'
import {
  createEditorDocument,
  createIsoTimestamp,
  EMPTY_PIXEL,
  MAX_CANVAS_SIZE,
  normalizeTransparentPixel,
} from '../types'

export const useEditorStore = defineStore('editor', () => {
  const document = ref<EditorDocument>(createEditorDocument())
  const activeTool = ref<ToolId>('pencil')
  const brushSize = ref<BrushSize>(1)
  const zoom = ref<ZoomLevel>(1)
  const gridVisible = ref(true)
  const panOffset = ref<PanOffset>({ x: 0, y: 0 })

  function newDocument(options?: {
    width?: number
    height?: number
    fill?: string
    name?: string
  }) {
    const width = options?.width ?? 16
    const height = options?.height ?? 16

    assertCanvasSize(width, height)

    const nextDocument = createEditorDocument({
      width,
      height,
      fill: options?.fill ?? EMPTY_PIXEL,
      name: options?.name,
    })

    document.value = nextDocument
    resetViewState()
    useHistoryStore().resetWith(nextDocument)
  }

  function loadDocument(nextDocument: EditorDocument) {
    assertCanvasSize(nextDocument.width, nextDocument.height)
    assertPixelBuffer(nextDocument)

    const clonedDocument = normalizeDocumentPixels(nextDocument)
    document.value = clonedDocument
    resetViewState()
    useHistoryStore().resetWith(clonedDocument)
  }

  function renameDocument(name: string) {
    document.value = {
      ...document.value,
      metadata: {
        ...document.value.metadata,
        name,
        updatedAt: createIsoTimestamp(),
      },
    }
    useHistoryStore().push(document.value)
  }

  function setPixels(pixels: string[]) {
    if (pixels.length !== document.value.width * document.value.height) {
      throw new Error('Pixel array length must match document dimensions.')
    }

    document.value = {
      ...document.value,
      pixels: pixels.map(normalizeTransparentPixel),
      metadata: {
        ...document.value.metadata,
        updatedAt: createIsoTimestamp(),
      },
    }
    useHistoryStore().pushOwned(document.value)
  }

  function setTool(tool: ToolId) {
    activeTool.value = tool
  }

  function setBrushSize(size: BrushSize) {
    brushSize.value = size
  }

  function setZoom(nextZoom: ZoomLevel) {
    zoom.value = nextZoom
  }

  function toggleGrid() {
    gridVisible.value = !gridVisible.value
  }

  function setGridVisible(visible: boolean) {
    gridVisible.value = visible
  }

  function setPan(offset: PanOffset) {
    panOffset.value = { ...offset }
  }

  function resetViewState() {
    zoom.value = 1
    gridVisible.value = true
    panOffset.value = { x: 0, y: 0 }
  }

  function syncWithHistory(nextDocument: EditorDocument | null) {
    if (nextDocument == null) {
      return
    }

    document.value = normalizeDocumentPixels(nextDocument)
  }

  function normalizeDocumentPixels(nextDocument: EditorDocument): EditorDocument {
    return {
      ...nextDocument,
      pixels: nextDocument.pixels.map(normalizeTransparentPixel),
      metadata: { ...nextDocument.metadata },
    }
  }

  function assertCanvasSize(width: number, height: number) {
    if (width < 1 || height < 1 || width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) {
      throw new Error(`Document dimensions must be between 1 and ${MAX_CANVAS_SIZE}.`)
    }
  }

  function assertPixelBuffer(nextDocument: EditorDocument) {
    if (nextDocument.pixels.length !== nextDocument.width * nextDocument.height) {
      throw new Error('Pixel array length must match document dimensions.')
    }
  }

  return {
    document,
    activeTool,
    brushSize,
    zoom,
    gridVisible,
    panOffset,
    newDocument,
    loadDocument,
    renameDocument,
    setPixels,
    setTool,
    setBrushSize,
    setZoom,
    toggleGrid,
    setGridVisible,
    setPan,
    resetViewState,
    syncWithHistory,
    assertCanvasSize,
    assertPixelBuffer,
  }
})
