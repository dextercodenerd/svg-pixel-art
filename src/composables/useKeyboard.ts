// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useColorStore } from '../stores/color'
import { useEditorStore } from '../stores/editor'
import { useZoom } from './useZoom'
import { isEditableTarget } from '../utils/dom'
import { BRUSH_SIZES } from '../types'
import type { BrushSize, ToolId } from '../types'

interface KeyboardShortcutActions {
  canHandleShortcuts?: () => boolean
  exportJson: () => void
  exportSvg: () => void
  importDocument: () => void
  isDialogOpen?: () => boolean
}

function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key
}

function hasCommandModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey
}

function stepBrushSize(current: BrushSize, direction: -1 | 1): BrushSize {
  const currentIndex = BRUSH_SIZES.indexOf(current)
  const nextIndex = Math.min(BRUSH_SIZES.length - 1, Math.max(0, currentIndex + direction))
  return BRUSH_SIZES[nextIndex] ?? current
}

export function createKeyboardShortcutHandler(actions: KeyboardShortcutActions) {
  const editorStore = useEditorStore()
  const colorStore = useColorStore()
  const { brushSize } = storeToRefs(editorStore)
  const { resetZoom, zoomIn, zoomOut } = useZoom()

  return function onWindowKeyDown(event: KeyboardEvent) {
    if (actions.canHandleShortcuts?.() === false) {
      return
    }

    if (actions.isDialogOpen?.() === true || isEditableTarget(event.target)) {
      return
    }

    const key = normalizeKey(event.key)
    const commandModifier = hasCommandModifier(event)

    if (!commandModifier && !event.altKey) {
      if (key === 'p' || key === 'e' || key === 'l' || key === 'f' || key === 'i') {
        const toolMap: Record<string, ToolId> = {
          p: 'pencil',
          e: 'eraser',
          l: 'line',
          f: 'fill',
          i: 'eyedropper',
        }
        editorStore.setTool(toolMap[key])
        event.preventDefault()
        return
      }

      if (key === 'x') {
        colorStore.swap()
        event.preventDefault()
        return
      }

      if (key === '[') {
        editorStore.setBrushSize(stepBrushSize(brushSize.value, -1))
        event.preventDefault()
        return
      }

      if (key === ']') {
        editorStore.setBrushSize(stepBrushSize(brushSize.value, 1))
        event.preventDefault()
        return
      }

      if (key === '+' || key === '=') {
        zoomIn()
        event.preventDefault()
        return
      }

      if (key === '-' || key === '_') {
        zoomOut()
        event.preventDefault()
        return
      }

      if (key === '0') {
        resetZoom()
        event.preventDefault()
        return
      }

      if (key === 'g') {
        editorStore.toggleGrid()
        event.preventDefault()
      }

      return
    }

    if (!commandModifier || event.altKey) {
      return
    }

    if (key === 'z' && !event.shiftKey) {
      editorStore.applyUndo()
      event.preventDefault()
      return
    }

    if (key === 'z' && event.shiftKey) {
      editorStore.applyRedo()
      event.preventDefault()
      return
    }

    if (key === 's' && !event.shiftKey) {
      actions.exportJson()
      event.preventDefault()
      return
    }

    if (key === 's' && event.shiftKey) {
      actions.exportSvg()
      event.preventDefault()
      return
    }

    if (key === 'o' && !event.shiftKey) {
      actions.importDocument()
      event.preventDefault()
    }
  }
}

export function useKeyboard(actions: KeyboardShortcutActions) {
  const onWindowKeyDown = createKeyboardShortcutHandler(actions)

  onMounted(() => {
    window.addEventListener('keydown', onWindowKeyDown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onWindowKeyDown)
  })
}
