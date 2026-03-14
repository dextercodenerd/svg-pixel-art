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
  cloneDocument,
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

  // Explicit flag that marks the store as holding the auto-created initial state.
  // Used by App.vue on startup to avoid a fragile pixel-comparison heuristic.
  const isInitialState = ref(true)

  function newDocument(options?: {
    width?: number
    height?: number
    fill?: string
    name?: string
  }) {
    const width = options?.width ?? 16
    const height = options?.height ?? 16

    validateCanvasSize(width, height)

    const nextDocument = createEditorDocument({
      width,
      height,
      fill: options?.fill ?? EMPTY_PIXEL,
      name: options?.name,
    })

    document.value = nextDocument
    isInitialState.value = false
    resetViewState()
    // nextDocument was constructed here -- use pushOwned to avoid an extra clone
    useHistoryStore().resetWith(nextDocument)
  }

  function loadDocument(nextDocument: EditorDocument) {
    validateCanvasSize(nextDocument.width, nextDocument.height)
    validatePixelBuffer(nextDocument)

    // Normalize once -> the result is already an isolated object, so pass it as owned
    const normalized = normalizeDocumentPixels(nextDocument)
    document.value = cloneDocument(normalized) // store gets its own copy
    isInitialState.value = false
    resetViewState()
    useHistoryStore().resetWith(normalized) // history keeps the other copy
  }

  function renameDocument(name: string) {
    // Construct a new document object in this scope -- use pushOwned to avoid an extra clone
    const renamed: EditorDocument = {
      ...document.value,
      metadata: {
        ...document.value.metadata,
        name,
        updatedAt: createIsoTimestamp(),
      },
    }
    document.value = renamed
    useHistoryStore().pushOwned(cloneDocument(renamed))
  }

  function setPixels(pixels: string[]) {
    if (pixels.length !== document.value.width * document.value.height) {
      throw new Error('Pixel array length must match document dimensions.')
    }

    // Build the new document in this scope -- each pixel is already expected to be valid
    // by callers (the drawing compositor normalizes before calling setPixels).
    // We normalize here as a safety net but do it in-place to avoid an extra copy.
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = normalizeTransparentPixel(pixels[i])
    }

    const next: EditorDocument = {
      ...document.value,
      pixels,
      metadata: {
        ...document.value.metadata,
        updatedAt: createIsoTimestamp(),
      },
    }

    document.value = next
    // next was constructed here and pixels was mutated in-place -- safe to pushOwned
    useHistoryStore().pushOwned(next)
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

  // Called by the undo/redo path. History already clones snapshots on read, so the
  // document arriving here is already an isolated copy -- skip normalizing.
  function syncWithHistory(nextDocument: EditorDocument | null) {
    if (nextDocument == null) {
      return
    }

    document.value = nextDocument
  }

  function normalizeDocumentPixels(nextDocument: EditorDocument): EditorDocument {
    return {
      ...nextDocument,
      pixels: nextDocument.pixels.map(normalizeTransparentPixel),
      metadata: { ...nextDocument.metadata },
    }
  }

  // Internal validation helpers -- not exposed on the public store surface

  function validateCanvasSize(width: number, height: number) {
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > MAX_CANVAS_SIZE ||
      height > MAX_CANVAS_SIZE
    ) {
      throw new Error(`Document dimensions must be integers between 1 and ${MAX_CANVAS_SIZE}.`)
    }
  }

  function validatePixelBuffer(nextDocument: EditorDocument) {
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
    isInitialState,
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
  }
})
