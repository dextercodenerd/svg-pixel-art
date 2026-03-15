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
import { LINE_PREVIEW_PIXEL, useCanvasPointer } from '../src/composables/useCanvasPointer'
import { useColorStore } from '../src/stores/color'
import { useEditorStore } from '../src/stores/editor'
import { useHistoryStore } from '../src/stores/history'
import { BASE_PIXEL_SIZE, EMPTY_PIXEL, createEditorDocument } from '../src/types'

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

  it('renders a black alpha preview mask during drag and commits the real line color once', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()
    const historyStore = useHistoryStore()
    const externalDocument = createEditorDocument({ width: 4, height: 4 })

    externalDocument.pixels = [
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      '#112233ff',
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      '#00ff00ff',
    ]

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
    expect(editorStore.document.pixels[0]).toBe(EMPTY_PIXEL)
    expect(canvasPointer.previewMode.value).toBe('overlay')
    expect(canvasPointer.previewPixels.value).toEqual([
      LINE_PREVIEW_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      LINE_PREVIEW_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      LINE_PREVIEW_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
    ])

    canvasPointer.onPointerUp(moveEvent)

    expect(historyStore.snapshots).toHaveLength(2)
    expect(canvasPointer.previewPixels.value).toBeNull()
    expect(editorStore.document.pixels).toEqual([
      '#ff0000ff',
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      '#ff0000ff',
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      '#ff0000ff',
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      EMPTY_PIXEL,
      '#00ff00ff',
    ])
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

    expect(editorStore.document.pixels[0]).toBe('#ff00ffff')
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

    expect(editorStore.document.pixels.every(pixel => pixel === '#00ffffff')).toBe(true)
  })

  it('samples into the active BG slot for touch eyedropper usage', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()

    const document = createEditorDocument({ width: 4, height: 4 })
    document.pixels[0] = '#123456ff'

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
