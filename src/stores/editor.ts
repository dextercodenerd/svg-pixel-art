import { defineStore } from 'pinia'
import { useHistoryStore } from './history'
import type { BrushSize, EditorDocument, PanOffset, ToolId, ZoomLevel } from '../types'
import {
  cloneDocument,
  createEditorDocument,
  createIsoTimestamp,
  EMPTY_PIXEL,
  MAX_CANVAS_SIZE,
} from '../types'

interface EditorState {
  document: EditorDocument
  activeTool: ToolId
  brushSize: BrushSize
  zoom: ZoomLevel
  gridVisible: boolean
  panOffset: PanOffset
}

export const useEditorStore = defineStore('editor', {
  state: (): EditorState => ({
    document: createEditorDocument(),
    activeTool: 'pencil',
    brushSize: 1,
    zoom: 1,
    gridVisible: true,
    panOffset: { x: 0, y: 0 },
  }),
  actions: {
    newDocument(options?: { width?: number; height?: number; fill?: string; name?: string }) {
      const width = options?.width ?? 16
      const height = options?.height ?? 16

      this.assertCanvasSize(width, height)

      const nextDocument = createEditorDocument({
        width,
        height,
        fill: options?.fill ?? EMPTY_PIXEL,
        name: options?.name,
      })

      this.document = nextDocument
      this.resetViewState()
      useHistoryStore().resetWith(nextDocument)
    },
    loadDocument(document: EditorDocument) {
      this.assertCanvasSize(document.width, document.height)

      const nextDocument = cloneDocument(document)
      this.document = nextDocument
      this.resetViewState()
      useHistoryStore().resetWith(nextDocument)
    },
    renameDocument(name: string) {
      this.document = {
        ...this.document,
        metadata: {
          ...this.document.metadata,
          name,
          updatedAt: createIsoTimestamp(),
        },
      }
      useHistoryStore().push(this.document)
    },
    setPixels(pixels: string[]) {
      if (pixels.length !== this.document.width * this.document.height) {
        throw new Error('Pixel array length must match document dimensions.')
      }

      this.document = {
        ...this.document,
        pixels: [...pixels],
        metadata: {
          ...this.document.metadata,
          updatedAt: createIsoTimestamp(),
        },
      }
      useHistoryStore().push(this.document)
    },
    setTool(tool: ToolId) {
      this.activeTool = tool
    },
    setBrushSize(size: BrushSize) {
      this.brushSize = size
    },
    setZoom(zoom: ZoomLevel) {
      this.zoom = zoom
    },
    toggleGrid() {
      this.gridVisible = !this.gridVisible
    },
    setGridVisible(visible: boolean) {
      this.gridVisible = visible
    },
    setPan(offset: PanOffset) {
      this.panOffset = { ...offset }
    },
    resetViewState() {
      this.zoom = 1
      this.gridVisible = true
      this.panOffset = { x: 0, y: 0 }
    },
    syncWithHistory(document: EditorDocument | null) {
      if (document == null) {
        return
      }

      this.document = cloneDocument(document)
    },
    assertCanvasSize(width: number, height: number) {
      if (width < 1 || height < 1 || width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) {
        throw new Error(`Document dimensions must be between 1 and ${MAX_CANVAS_SIZE}.`)
      }
    },
  },
})
