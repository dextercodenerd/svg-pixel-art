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
import { hexToAbgr } from '../src/services/colorUtils'

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
    expect(canvasPointer.previewPixels.value).toEqual([
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
    ])

    canvasPointer.onPointerUp(moveEvent)

    expect(historyStore.snapshots).toHaveLength(2)
    expect(canvasPointer.previewPixels.value).toBeNull()
    expect(editorStore.document.pixels).toEqual([
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
    expect(editorStore.document.pixels).toEqual([
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
    ])
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
