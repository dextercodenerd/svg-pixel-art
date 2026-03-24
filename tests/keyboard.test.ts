// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createKeyboardShortcutHandler } from '../src/composables/useKeyboard'
import { useColorStore } from '../src/stores/color'
import { useEditorStore } from '../src/stores/editor'
import { hexToAbgr } from '../src/services/colorUtils'

const T = 0
const h = hexToAbgr

function createKeyboardEvent(
  key: string,
  options: Partial<KeyboardEvent> & { repeat?: boolean; target?: EventTarget | null } = {},
) {
  return {
    altKey: false,
    ctrlKey: false,
    key,
    metaKey: false,
    preventDefault: vi.fn(),
    repeat: false,
    shiftKey: false,
    target: null,
    ...options,
  } as unknown as KeyboardEvent & { preventDefault: ReturnType<typeof vi.fn> }
}

describe('createKeyboardShortcutHandler', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('handles tool, brush, grid, swap, and zoom shortcuts without modifiers', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()
    const exportJson = vi.fn()
    const exportSvg = vi.fn()
    const importDocument = vi.fn()
    const handler = createKeyboardShortcutHandler({
      exportJson,
      exportSvg,
      importDocument,
    })

    handler(createKeyboardEvent('e'))
    expect(editorStore.activeTool).toBe('eraser')

    editorStore.setBrushSize(2)
    handler(createKeyboardEvent(']'))
    expect(editorStore.brushSize).toBe(3)

    editorStore.setBrushSize(1)
    handler(createKeyboardEvent('['))
    expect(editorStore.brushSize).toBe(1)

    const initialFg = colorStore.fg
    const initialBg = colorStore.bg
    handler(createKeyboardEvent('x'))
    expect(colorStore.fg).toBe(initialBg)
    expect(colorStore.bg).toBe(initialFg)

    expect(editorStore.gridVisible).toBe(true)
    handler(createKeyboardEvent('g'))
    expect(editorStore.gridVisible).toBe(false)

    expect(editorStore.zoom).toBe(1)
    handler(createKeyboardEvent('+'))
    expect(editorStore.zoom).toBe(2)
    handler(createKeyboardEvent('0'))
    expect(editorStore.zoom).toBe(1)

    expect(exportJson).not.toHaveBeenCalled()
    expect(exportSvg).not.toHaveBeenCalled()
    expect(importDocument).not.toHaveBeenCalled()
  })

  it('handles command shortcuts with both Ctrl and Cmd, including shift-sensitive branches', () => {
    const editorStore = useEditorStore()
    const exportJson = vi.fn()
    const exportSvg = vi.fn()
    const importDocument = vi.fn()
    const handler = createKeyboardShortcutHandler({
      exportJson,
      exportSvg,
      importDocument,
    })

    editorStore.newDocument({ width: 2, height: 2 })
    editorStore.setPixels(new Uint32Array([h('#010203ff'), T, T, T]))
    editorStore.setPixels(new Uint32Array([h('#010203ff'), h('#aabbccdd'), T, T]))

    const undoEvent = createKeyboardEvent('z', { ctrlKey: true })
    handler(undoEvent)
    expect(editorStore.document.pixels).toEqual(new Uint32Array([h('#010203ff'), T, T, T]))
    expect(undoEvent.preventDefault).toHaveBeenCalledTimes(1)

    const redoEvent = createKeyboardEvent('z', { metaKey: true, shiftKey: true })
    handler(redoEvent)
    expect(editorStore.document.pixels).toEqual(new Uint32Array([h('#010203ff'), h('#aabbccdd'), T, T]))
    expect(redoEvent.preventDefault).toHaveBeenCalledTimes(1)

    const exportJsonEvent = createKeyboardEvent('s', { ctrlKey: true })
    handler(exportJsonEvent)
    expect(exportJson).toHaveBeenCalledTimes(1)
    expect(exportJsonEvent.preventDefault).toHaveBeenCalledTimes(1)

    const exportSvgEvent = createKeyboardEvent('s', { metaKey: true, shiftKey: true })
    handler(exportSvgEvent)
    expect(exportSvg).toHaveBeenCalledTimes(1)
    expect(exportSvgEvent.preventDefault).toHaveBeenCalledTimes(1)

    const importEvent = createKeyboardEvent('o', { ctrlKey: true })
    handler(importEvent)
    expect(importDocument).toHaveBeenCalledTimes(1)
    expect(importEvent.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('ignores editable targets, modal-open state, and Ctrl/Cmd+Y', () => {
    const editorStore = useEditorStore()
    const exportJson = vi.fn()
    const exportSvg = vi.fn()
    const importDocument = vi.fn()
    const handler = createKeyboardShortcutHandler({
      exportJson,
      exportSvg,
      importDocument,
      isDialogOpen: () => true,
    })

    handler(createKeyboardEvent('p'))
    expect(editorStore.activeTool).toBe('pencil')

    const openDialogEvent = createKeyboardEvent('e')
    handler(openDialogEvent)
    expect(editorStore.activeTool).toBe('pencil')
    expect(openDialogEvent.preventDefault).not.toHaveBeenCalled()

    const editableHandler = createKeyboardShortcutHandler({
      exportJson,
      exportSvg,
      importDocument,
      isDialogOpen: () => false,
    })
    const editableEvent = createKeyboardEvent('l', {
      target: { tagName: 'INPUT' } as unknown as EventTarget,
    })
    editableHandler(editableEvent)
    expect(editorStore.activeTool).toBe('pencil')
    expect(editableEvent.preventDefault).not.toHaveBeenCalled()

    const redoAliasEvent = createKeyboardEvent('y', { ctrlKey: true })
    editableHandler(redoAliasEvent)
    expect(exportJson).not.toHaveBeenCalled()
    expect(exportSvg).not.toHaveBeenCalled()
    expect(importDocument).not.toHaveBeenCalled()
    expect(redoAliasEvent.preventDefault).not.toHaveBeenCalled()
  })

  it('ignores repeated one-shot shortcuts but keeps repeatable zoom and brush steps', () => {
    const editorStore = useEditorStore()
    const colorStore = useColorStore()
    const exportJson = vi.fn()
    const exportSvg = vi.fn()
    const importDocument = vi.fn()
    const handler = createKeyboardShortcutHandler({
      exportJson,
      exportSvg,
      importDocument,
    })

    const initialFg = colorStore.fg
    const initialBg = colorStore.bg

    handler(createKeyboardEvent('x', { repeat: true }))
    expect(colorStore.fg).toBe(initialFg)
    expect(colorStore.bg).toBe(initialBg)

    handler(createKeyboardEvent('g', { repeat: true }))
    expect(editorStore.gridVisible).toBe(true)

    handler(createKeyboardEvent('s', { ctrlKey: true, repeat: true }))
    handler(createKeyboardEvent('s', { ctrlKey: true, shiftKey: true, repeat: true }))
    handler(createKeyboardEvent('o', { metaKey: true, repeat: true }))
    expect(exportJson).not.toHaveBeenCalled()
    expect(exportSvg).not.toHaveBeenCalled()
    expect(importDocument).not.toHaveBeenCalled()

    handler(createKeyboardEvent(']', { repeat: true }))
    expect(editorStore.brushSize).toBe(2)

    handler(createKeyboardEvent('+', { repeat: true }))
    expect(editorStore.zoom).toBe(2)
  })
})
