// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { useCanvasPointer } from '../src/composables/useCanvasPointer'
import { useColorStore } from '../src/stores/color'
import { useEditorStore } from '../src/stores/editor'
import { useHistoryStore } from '../src/stores/history'
import { BASE_PIXEL_SIZE, TRANSPARENT_U32, createEditorDocument } from '../src/types'
import { compositeSourceOverAbgr, hexToAbgr } from '../src/services/colorUtils'

const T = TRANSPARENT_U32
const h = hexToAbgr

class FakeElement {
  private captured = new Set<number>()

  getBoundingClientRect() {
    return {
      bottom: 128,
      height: 128,
      left: 0,
      right: 128,
      top: 0,
      width: 128,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }
  }

  hasPointerCapture(pointerId: number) {
    return this.captured.has(pointerId)
  }

  releasePointerCapture(pointerId: number) {
    this.captured.delete(pointerId)
  }

  setPointerCapture(pointerId: number) {
    this.captured.add(pointerId)
  }
}

beforeAll(() => {
  if (!('Element' in globalThis)) {
    ;(globalThis as unknown as { Element: typeof FakeElement }).Element = FakeElement
  }
})

describe('useCanvasPointer line preview', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders a colorized alpha preview mask during drag and commits the real line color once', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()
    const historyStore = useHistoryStore()
    const externalDocument = createEditorDocument({ width: 4, height: 4 })

    externalDocument.pixels = new Uint32Array([
      T, T, T, T,
      T, h('#112233ff'), T, T,
      T, T, T, T,
      T, T, T, h('#00ff00ff'),
    ])

    editorStore.loadDocument(externalDocument)
    editorStore.setTool('line')
    colorStore.setFg('#ff0000ff')

    const viewportRef = ref<HTMLElement | null>(new FakeElement() as unknown as HTMLElement)
    const canvasTarget = new FakeElement() as unknown as Element
    const canvasPointer = useCanvasPointer({
      displayPan: ref({ x: 0, y: 0 }),
      displayScale: ref(1),
      isPanning: ref(false),
      isTouchGestureActive: ref(false),
      renderScale: ref(BASE_PIXEL_SIZE),
      spacePressed: ref(false),
      viewportRef,
    })

    const startEvent = {
      button: 0,
      clientX: 4,
      clientY: 4,
      currentTarget: canvasTarget,
      pointerId: 7,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent
    const moveEvent = {
      button: 0,
      clientX: 20,
      clientY: 20,
      currentTarget: canvasTarget,
      pointerId: 7,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent

    canvasPointer.onPointerDown(startEvent)
    canvasPointer.onPointerMove(moveEvent)

    expect(historyStore.snapshots).toHaveLength(1)
    expect(editorStore.document.pixels[0]).toBe(T)
    expect(canvasPointer.previewMode.value).toBe('overlay')
    expect(canvasPointer.previewNoopMask.value).toBeNull()
    expect(canvasPointer.previewPixels.value).toEqual(new Uint32Array([
      h('#ff0000a6'), T, T, T,
      T, h('#ff0000a6'), T, T,
      T, T, h('#ff0000a6'), T,
      T, T, T, T,
    ]))

    canvasPointer.onPointerUp(moveEvent)

    expect(historyStore.snapshots).toHaveLength(2)
    expect(canvasPointer.previewPixels.value).toBeNull()
    expect(editorStore.document.pixels).toEqual(new Uint32Array([
      h('#ff0000ff'), T, T, T,
      T, h('#ff0000ff'), T, T,
      T, T, h('#ff0000ff'), T,
      T, T, T, h('#00ff00ff'),
    ]))
  })

  it('scales preview alpha from the source alpha instead of using a fixed overlay opacity', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()

    editorStore.loadDocument(createEditorDocument({ width: 4, height: 4 }))
    editorStore.setTool('line')
    colorStore.setFg('#ff000080')

    const viewportRef = ref<HTMLElement | null>(new FakeElement() as unknown as HTMLElement)
    const canvasTarget = new FakeElement() as unknown as Element
    const canvasPointer = useCanvasPointer({
      displayPan: ref({ x: 0, y: 0 }),
      displayScale: ref(1),
      isPanning: ref(false),
      isTouchGestureActive: ref(false),
      renderScale: ref(BASE_PIXEL_SIZE),
      spacePressed: ref(false),
      viewportRef,
    })

    const startEvent = {
      button: 0,
      clientX: 4,
      clientY: 4,
      currentTarget: canvasTarget,
      pointerId: 8,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent
    const moveEvent = {
      button: 0,
      clientX: 20,
      clientY: 20,
      currentTarget: canvasTarget,
      pointerId: 8,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent

    canvasPointer.onPointerDown(startEvent)
    canvasPointer.onPointerMove(moveEvent)

    expect(canvasPointer.previewPixels.value).toEqual(new Uint32Array([
      h('#ff000053'), T, T, T,
      T, h('#ff000053'), T, T,
      T, T, h('#ff000053'), T,
      T, T, T, T,
    ]))
  })

  it('commits composited pixel values when drawing with a semi-transparent line over existing pixels', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()
    const historyStore = useHistoryStore()
    const blue = h('#0000ffff')
    const document = createEditorDocument({ width: 4, height: 4 })
    document.pixels[0] = blue

    editorStore.loadDocument(document)
    editorStore.setTool('line')
    colorStore.setFg('#ff000080')

    const viewportRef = ref<HTMLElement | null>(new FakeElement() as unknown as HTMLElement)
    const canvasTarget = new FakeElement() as unknown as Element
    const canvasPointer = useCanvasPointer({
      displayPan: ref({ x: 0, y: 0 }),
      displayScale: ref(1),
      isPanning: ref(false),
      isTouchGestureActive: ref(false),
      renderScale: ref(BASE_PIXEL_SIZE),
      spacePressed: ref(false),
      viewportRef,
    })

    // Draw a single-point line at (0,0) which contains the blue pixel
    const downEvent = {
      button: 0,
      clientX: 4,
      clientY: 4,
      currentTarget: canvasTarget,
      pointerId: 30,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent
    const upEvent = { ...downEvent } as unknown as PointerEvent

    canvasPointer.onPointerDown(downEvent)
    canvasPointer.onPointerUp(upEvent)

    expect(historyStore.snapshots).toHaveLength(2)
    const expected = compositeSourceOverAbgr(blue, h('#ff000080'))
    expect(editorStore.document.pixels[0]).toBe(expected)
  })

  it('shows no-op markers for fully transparent line colors and does not commit changes', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()
    const historyStore = useHistoryStore()
    const document = createEditorDocument({ width: 4, height: 4 })
    document.pixels[5] = h('#112233ff')

    editorStore.loadDocument(document)
    editorStore.setTool('line')
    colorStore.setFg('#ff000000')

    const viewportRef = ref<HTMLElement | null>(new FakeElement() as unknown as HTMLElement)
    const canvasTarget = new FakeElement() as unknown as Element
    const canvasPointer = useCanvasPointer({
      displayPan: ref({ x: 0, y: 0 }),
      displayScale: ref(1),
      isPanning: ref(false),
      isTouchGestureActive: ref(false),
      renderScale: ref(BASE_PIXEL_SIZE),
      spacePressed: ref(false),
      viewportRef,
    })

    const startEvent = {
      button: 0,
      clientX: 4,
      clientY: 4,
      currentTarget: canvasTarget,
      pointerId: 9,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent
    const moveEvent = {
      button: 0,
      clientX: 20,
      clientY: 20,
      currentTarget: canvasTarget,
      pointerId: 9,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent

    canvasPointer.onPointerDown(startEvent)
    canvasPointer.onPointerMove(moveEvent)

    expect(canvasPointer.previewPixels.value).toEqual(new Uint32Array(16))
    expect(canvasPointer.previewNoopMask.value).toEqual(new Uint8Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 0,
    ]))

    canvasPointer.onPointerUp(moveEvent)

    expect(historyStore.snapshots).toHaveLength(1)
    expect(editorStore.document.pixels).toEqual(document.pixels)
  })
})

describe('useCanvasPointer rectangle preview', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('commits a transparent-fill rectangle border once on pointer up', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()
    const historyStore = useHistoryStore()

    editorStore.loadDocument(createEditorDocument({ width: 4, height: 4 }))
    editorStore.setTool('rectangle')
    editorStore.setRectangleStrokeSlot('fg')
    editorStore.setRectangleStrokeWidth(1)
    editorStore.setRectangleFillSlot('transparent')
    colorStore.setFg('#ff0000ff')

    const viewportRef = ref<HTMLElement | null>(new FakeElement() as unknown as HTMLElement)
    const canvasTarget = new FakeElement() as unknown as Element
    const canvasPointer = useCanvasPointer({
      displayPan: ref({ x: 0, y: 0 }),
      displayScale: ref(1),
      isPanning: ref(false),
      isTouchGestureActive: ref(false),
      renderScale: ref(BASE_PIXEL_SIZE),
      spacePressed: ref(false),
      viewportRef,
    })

    const startEvent = {
      button: 0,
      clientX: 4,
      clientY: 4,
      currentTarget: canvasTarget,
      pointerId: 11,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent
    const moveEvent = {
      button: 0,
      clientX: 20,
      clientY: 20,
      currentTarget: canvasTarget,
      pointerId: 11,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent

    canvasPointer.onPointerDown(startEvent)
    canvasPointer.onPointerMove(moveEvent)

    expect(historyStore.snapshots).toHaveLength(1)
    expect(canvasPointer.previewMode.value).toBe('overlay')
    expect(canvasPointer.previewPixels.value).toEqual(new Uint32Array([
      h('#ff0000a6'),
      h('#ff0000a6'),
      h('#ff0000a6'),
      T,
      h('#ff0000a6'),
      T,
      h('#ff0000a6'),
      T,
      h('#ff0000a6'),
      h('#ff0000a6'),
      h('#ff0000a6'),
      T,
      T,
      T,
      T,
      T,
    ]))

    canvasPointer.onPointerUp(moveEvent)

    expect(historyStore.snapshots).toHaveLength(2)
    expect(canvasPointer.previewPixels.value).toBeNull()
    expect(editorStore.document.pixels).toEqual(new Uint32Array([
      h('#ff0000ff'),
      h('#ff0000ff'),
      h('#ff0000ff'),
      T,
      h('#ff0000ff'),
      T,
      h('#ff0000ff'),
      T,
      h('#ff0000ff'),
      h('#ff0000ff'),
      h('#ff0000ff'),
      T,
      T,
      T,
      T,
      T,
    ]))
  })

  it('uses normalized bounds for reverse drags and keeps stroke over fill', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()
    const historyStore = useHistoryStore()

    editorStore.loadDocument(createEditorDocument({ width: 4, height: 4 }))
    editorStore.setTool('rectangle')
    editorStore.setRectangleStrokeSlot('bg')
    editorStore.setRectangleStrokeWidth(1)
    editorStore.setRectangleFillSlot('fg')
    colorStore.setFg('#ff0000ff')
    colorStore.setBg('#00ff00ff')

    const viewportRef = ref<HTMLElement | null>(new FakeElement() as unknown as HTMLElement)
    const canvasTarget = new FakeElement() as unknown as Element
    const canvasPointer = useCanvasPointer({
      displayPan: ref({ x: 0, y: 0 }),
      displayScale: ref(1),
      isPanning: ref(false),
      isTouchGestureActive: ref(false),
      renderScale: ref(BASE_PIXEL_SIZE),
      spacePressed: ref(false),
      viewportRef,
    })

    const startEvent = {
      button: 0,
      clientX: 28,
      clientY: 28,
      currentTarget: canvasTarget,
      pointerId: 12,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent
    const moveEvent = {
      button: 0,
      clientX: 12,
      clientY: 12,
      currentTarget: canvasTarget,
      pointerId: 12,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent

    canvasPointer.onPointerDown(startEvent)
    canvasPointer.onPointerMove(moveEvent)
    canvasPointer.onPointerUp(moveEvent)

    expect(historyStore.snapshots).toHaveLength(2)
    expect(editorStore.document.pixels).toEqual(new Uint32Array([
      T,
      T,
      T,
      T,
      T,
      h('#00ff00ff'),
      h('#00ff00ff'),
      h('#00ff00ff'),
      T,
      h('#00ff00ff'),
      h('#ff0000ff'),
      h('#00ff00ff'),
      T,
      h('#00ff00ff'),
      h('#00ff00ff'),
      h('#00ff00ff'),
    ]))
  })

  it('does not rebuild the preview when the pointer stays within the same cell', () => {
    const editorStore = useEditorStore()

    editorStore.loadDocument(createEditorDocument({ width: 4, height: 4 }))
    editorStore.setTool('rectangle')

    const viewportRef = ref<HTMLElement | null>(new FakeElement() as unknown as HTMLElement)
    const canvasTarget = new FakeElement() as unknown as Element
    const canvasPointer = useCanvasPointer({
      displayPan: ref({ x: 0, y: 0 }),
      displayScale: ref(1),
      isPanning: ref(false),
      isTouchGestureActive: ref(false),
      renderScale: ref(BASE_PIXEL_SIZE),
      spacePressed: ref(false),
      viewportRef,
    })

    const startEvent = {
      button: 0,
      clientX: 4,
      clientY: 4,
      currentTarget: canvasTarget,
      pointerId: 13,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent
    const moveEventSameCell = {
      button: 0,
      clientX: 7,
      clientY: 7,
      currentTarget: canvasTarget,
      pointerId: 13,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent

    canvasPointer.onPointerDown(startEvent)
    const initialPreview = canvasPointer.previewPixels.value

    canvasPointer.onPointerMove(moveEventSameCell)

    expect(canvasPointer.previewPixels.value).toBe(initialPreview)
  })

  it('commits composited pixel values when drawing with a semi-transparent rectangle stroke over existing pixels', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()
    const historyStore = useHistoryStore()
    const blue = h('#0000ffff')

    // Fill all pixels with blue so we can verify compositing on every stroke pixel
    const document = createEditorDocument({ width: 4, height: 4 })
    document.pixels.fill(blue)

    editorStore.loadDocument(document)
    editorStore.setTool('rectangle')
    editorStore.setRectangleStrokeSlot('fg')
    editorStore.setRectangleStrokeWidth(1)
    editorStore.setRectangleFillSlot('transparent')
    colorStore.setFg('#ff000080')

    const viewportRef = ref<HTMLElement | null>(new FakeElement() as unknown as HTMLElement)
    const canvasTarget = new FakeElement() as unknown as Element
    const canvasPointer = useCanvasPointer({
      displayPan: ref({ x: 0, y: 0 }),
      displayScale: ref(1),
      isPanning: ref(false),
      isTouchGestureActive: ref(false),
      renderScale: ref(BASE_PIXEL_SIZE),
      spacePressed: ref(false),
      viewportRef,
    })

    const startEvent = {
      button: 0,
      clientX: 4,
      clientY: 4,
      currentTarget: canvasTarget,
      pointerId: 31,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent
    const moveEvent = {
      button: 0,
      clientX: 20,
      clientY: 20,
      currentTarget: canvasTarget,
      pointerId: 31,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent

    canvasPointer.onPointerDown(startEvent)
    canvasPointer.onPointerMove(moveEvent)
    canvasPointer.onPointerUp(moveEvent)

    expect(historyStore.snapshots).toHaveLength(2)
    const expected = compositeSourceOverAbgr(blue, h('#ff000080'))
    // Stroke pixel at (0,0) should be composited, not overwritten
    expect(editorStore.document.pixels[0]).toBe(expected)
    // Non-stroke interior pixel should be untouched (transparent fill)
    expect(editorStore.document.pixels[5]).toBe(blue)
  })

  it('does not push history when the committed rectangle would be identical', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()
    const historyStore = useHistoryStore()
    const document = createEditorDocument({ width: 4, height: 4 })

    document.pixels = new Uint32Array([
      h('#ff0000ff'),
      h('#ff0000ff'),
      h('#ff0000ff'),
      T,
      h('#ff0000ff'),
      T,
      h('#ff0000ff'),
      T,
      h('#ff0000ff'),
      h('#ff0000ff'),
      h('#ff0000ff'),
      T,
      T,
      T,
      T,
      T,
    ])

    editorStore.loadDocument(document)
    editorStore.setTool('rectangle')
    editorStore.setRectangleStrokeSlot('fg')
    editorStore.setRectangleStrokeWidth(1)
    editorStore.setRectangleFillSlot('transparent')
    colorStore.setFg('#ff0000ff')

    const viewportRef = ref<HTMLElement | null>(new FakeElement() as unknown as HTMLElement)
    const canvasTarget = new FakeElement() as unknown as Element
    const canvasPointer = useCanvasPointer({
      displayPan: ref({ x: 0, y: 0 }),
      displayScale: ref(1),
      isPanning: ref(false),
      isTouchGestureActive: ref(false),
      renderScale: ref(BASE_PIXEL_SIZE),
      spacePressed: ref(false),
      viewportRef,
    })

    const startEvent = {
      button: 0,
      clientX: 4,
      clientY: 4,
      currentTarget: canvasTarget,
      pointerId: 14,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent
    const moveEvent = {
      button: 0,
      clientX: 20,
      clientY: 20,
      currentTarget: canvasTarget,
      pointerId: 14,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent

    canvasPointer.onPointerDown(startEvent)
    canvasPointer.onPointerMove(moveEvent)
    canvasPointer.onPointerUp(moveEvent)

    expect(historyStore.snapshots).toHaveLength(1)
    expect(editorStore.document.pixels).toEqual(document.pixels)
  })
})

describe('useCanvasPointer pencil compositing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('composites a semi-transparent stroke over an existing pixel instead of overwriting', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()
    const document = createEditorDocument({ width: 4, height: 4 })
    const blue = h('#0000ffff')
    document.pixels[0] = blue

    editorStore.loadDocument(document)
    editorStore.setTool('pencil')
    colorStore.setFg('#ff000080')

    const viewportRef = ref<HTMLElement | null>(new FakeElement() as unknown as HTMLElement)
    const canvasTarget = new FakeElement() as unknown as Element
    const canvasPointer = useCanvasPointer({
      displayPan: ref({ x: 0, y: 0 }),
      displayScale: ref(1),
      isPanning: ref(false),
      isTouchGestureActive: ref(false),
      renderScale: ref(BASE_PIXEL_SIZE),
      spacePressed: ref(false),
      viewportRef,
    })

    const downEvent = {
      button: 0,
      clientX: 4,
      clientY: 4,
      currentTarget: canvasTarget,
      pointerId: 20,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent
    const upEvent = { ...downEvent } as unknown as PointerEvent

    canvasPointer.onPointerDown(downEvent)
    canvasPointer.onPointerUp(upEvent)

    // result must be blended, not the raw semi-transparent red
    const result = editorStore.document.pixels[0]
    expect(result).not.toBe(h('#ff000080'))
    expect(result).not.toBe(blue)
    // alpha should be 255 (opaque result from opaque dst + semi-transparent src)
    expect((result! >>> 24) & 0xff).toBe(255)
  })

  it('does not progressively darken a pixel revisited in the same stroke', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()
    const document = createEditorDocument({ width: 4, height: 4 })
    const blue = h('#0000ffff')
    document.pixels[0] = blue

    editorStore.loadDocument(document)
    editorStore.setTool('pencil')
    colorStore.setFg('#ff000080')

    const viewportRef = ref<HTMLElement | null>(new FakeElement() as unknown as HTMLElement)
    const canvasTarget = new FakeElement() as unknown as Element
    const canvasPointer = useCanvasPointer({
      displayPan: ref({ x: 0, y: 0 }),
      displayScale: ref(1),
      isPanning: ref(false),
      isTouchGestureActive: ref(false),
      renderScale: ref(BASE_PIXEL_SIZE),
      spacePressed: ref(false),
      viewportRef,
    })

    const downEvent = {
      button: 0,
      clientX: 4,
      clientY: 4,
      currentTarget: canvasTarget,
      pointerId: 21,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent
    // move away then back to the same pixel
    const moveAwayEvent = {
      button: 0,
      clientX: 12,
      clientY: 4,
      currentTarget: canvasTarget,
      pointerId: 21,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent
    const moveBackEvent = {
      button: 0,
      clientX: 4,
      clientY: 4,
      currentTarget: canvasTarget,
      pointerId: 21,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent
    const upEvent = { ...moveBackEvent } as unknown as PointerEvent

    canvasPointer.onPointerDown(downEvent)
    canvasPointer.onPointerMove(moveAwayEvent)
    canvasPointer.onPointerMove(moveBackEvent)
    canvasPointer.onPointerUp(upEvent)

    // value must be the same as a single composite, not darker from double compositing
    const expected = compositeSourceOverAbgr(blue, h('#ff000080'))
    expect(editorStore.document.pixels[0]).toBe(expected)
  })

  it('shows no-op markers for fully transparent pencil strokes and keeps the document unchanged', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()
    const historyStore = useHistoryStore()
    const document = createEditorDocument({ width: 4, height: 4 })
    document.pixels[0] = h('#112233ff')

    editorStore.loadDocument(document)
    editorStore.setTool('pencil')
    colorStore.setFg('#ff000000')

    const viewportRef = ref<HTMLElement | null>(new FakeElement() as unknown as HTMLElement)
    const canvasTarget = new FakeElement() as unknown as Element
    const canvasPointer = useCanvasPointer({
      displayPan: ref({ x: 0, y: 0 }),
      displayScale: ref(1),
      isPanning: ref(false),
      isTouchGestureActive: ref(false),
      renderScale: ref(BASE_PIXEL_SIZE),
      spacePressed: ref(false),
      viewportRef,
    })

    const downEvent = {
      button: 0,
      clientX: 4,
      clientY: 4,
      currentTarget: canvasTarget,
      pointerId: 23,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent
    const upEvent = { ...downEvent } as unknown as PointerEvent

    canvasPointer.onPointerDown(downEvent)

    expect(canvasPointer.previewMode.value).toBe('replace')
    expect(canvasPointer.previewNoopMask.value).toEqual(new Uint8Array([
      1, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ]))
    expect(canvasPointer.previewPixels.value).toEqual(document.pixels)

    canvasPointer.onPointerUp(upEvent)

    expect(historyStore.snapshots).toHaveLength(1)
    expect(editorStore.document.pixels).toEqual(document.pixels)
  })

  it('eraser sets pixels to transparent regardless of what was underneath', () => {
    const editorStore = useEditorStore()
    const document = createEditorDocument({ width: 4, height: 4 })
    document.pixels[0] = h('#ff0000ff')

    editorStore.loadDocument(document)
    editorStore.setTool('eraser')

    const viewportRef = ref<HTMLElement | null>(new FakeElement() as unknown as HTMLElement)
    const canvasTarget = new FakeElement() as unknown as Element
    const canvasPointer = useCanvasPointer({
      displayPan: ref({ x: 0, y: 0 }),
      displayScale: ref(1),
      isPanning: ref(false),
      isTouchGestureActive: ref(false),
      renderScale: ref(BASE_PIXEL_SIZE),
      spacePressed: ref(false),
      viewportRef,
    })

    const downEvent = {
      button: 0,
      clientX: 4,
      clientY: 4,
      currentTarget: canvasTarget,
      pointerId: 22,
      pointerType: 'mouse',
      preventDefault() {},
    } as unknown as PointerEvent
    const upEvent = { ...downEvent } as unknown as PointerEvent

    canvasPointer.onPointerDown(downEvent)
    canvasPointer.onPointerUp(upEvent)

    expect(editorStore.document.pixels[0]).toBe(T)
  })
})

describe('useCanvasPointer touch color slot behavior', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('uses the active BG slot for touch pencil strokes', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()
    const historyStore = useHistoryStore()

    editorStore.loadDocument(createEditorDocument({ width: 4, height: 4 }))
    editorStore.setTool('pencil')
    colorStore.setFg('#112233ff')
    colorStore.setBg('#ff00ffff')
    colorStore.setActiveSlot('bg')

    const viewportRef = ref<HTMLElement | null>(new FakeElement() as unknown as HTMLElement)
    const canvasTarget = new FakeElement() as unknown as Element
    const canvasPointer = useCanvasPointer({
      displayPan: ref({ x: 0, y: 0 }),
      displayScale: ref(1),
      isPanning: ref(false),
      isTouchGestureActive: ref(false),
      renderScale: ref(BASE_PIXEL_SIZE),
      spacePressed: ref(false),
      viewportRef,
    })

    const touchEvent = {
      button: 0,
      clientX: 4,
      clientY: 4,
      currentTarget: canvasTarget,
      pointerId: 3,
      pointerType: 'touch',
      preventDefault() {},
    } as unknown as PointerEvent

    canvasPointer.onPointerDown(touchEvent)
    canvasPointer.onPointerUp(touchEvent)

    expect(editorStore.document.pixels[0]).toBe(h('#ff00ffff'))
    expect(historyStore.snapshots).toHaveLength(2)
  })

  it('uses the active BG slot for touch fill operations', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()

    editorStore.loadDocument(createEditorDocument({ width: 4, height: 4 }))
    editorStore.setTool('fill')
    colorStore.setFg('#112233ff')
    colorStore.setBg('#00ffffff')
    colorStore.setActiveSlot('bg')

    const viewportRef = ref<HTMLElement | null>(new FakeElement() as unknown as HTMLElement)
    const canvasPointer = useCanvasPointer({
      displayPan: ref({ x: 0, y: 0 }),
      displayScale: ref(1),
      isPanning: ref(false),
      isTouchGestureActive: ref(false),
      renderScale: ref(BASE_PIXEL_SIZE),
      spacePressed: ref(false),
      viewportRef,
    })

    const touchEvent = {
      button: 0,
      clientX: 4,
      clientY: 4,
      currentTarget: new FakeElement() as unknown as Element,
      pointerId: 5,
      pointerType: 'touch',
      preventDefault() {},
    } as unknown as PointerEvent

    canvasPointer.onPointerDown(touchEvent)

    const cyanU32 = h('#00ffffff')
    expect(editorStore.document.pixels.every(pixel => pixel === cyanU32)).toBe(true)
  })

  it('samples into the active BG slot for touch eyedropper usage', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()

    const document = createEditorDocument({ width: 4, height: 4 })
    document.pixels[0] = h('#123456ff')

    editorStore.loadDocument(document)
    editorStore.setTool('eyedropper')
    colorStore.setFg('#aaaaaaaa')
    colorStore.setBg('#bbbbbbbb')
    colorStore.setActiveSlot('bg')

    const viewportRef = ref<HTMLElement | null>(new FakeElement() as unknown as HTMLElement)
    const canvasPointer = useCanvasPointer({
      displayPan: ref({ x: 0, y: 0 }),
      displayScale: ref(1),
      isPanning: ref(false),
      isTouchGestureActive: ref(false),
      renderScale: ref(BASE_PIXEL_SIZE),
      spacePressed: ref(false),
      viewportRef,
    })

    const touchEvent = {
      button: 0,
      clientX: 4,
      clientY: 4,
      currentTarget: new FakeElement() as unknown as Element,
      pointerId: 9,
      pointerType: 'touch',
      preventDefault() {},
    } as unknown as PointerEvent

    canvasPointer.onPointerDown(touchEvent)

    expect(colorStore.fg).toBe('#aaaaaaaa')
    expect(colorStore.bg).toBe('#123456ff')
  })
})
