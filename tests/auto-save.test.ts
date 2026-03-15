// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAutoSaveController } from '../src/composables/useAutoSave'
import { createEditorDocument } from '../src/types'

describe('createAutoSaveController', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces rapid saves into a single draft write', () => {
    const document = ref(createEditorDocument({ name: 'initial' }))
    const saveDocument = vi.fn()
    const controller = createAutoSaveController({
      document,
      saveDocument,
      setTimer: globalThis.setTimeout,
      clearTimer: globalThis.clearTimeout,
    })

    controller.scheduleSave()
    document.value = createEditorDocument({ name: 'updated-once' })
    controller.scheduleSave()
    document.value = createEditorDocument({ name: 'updated-twice' })
    controller.scheduleSave()

    vi.advanceTimersByTime(249)
    expect(saveDocument).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(saveDocument).toHaveBeenCalledTimes(1)
    expect(saveDocument).toHaveBeenCalledWith(document.value)
  })

  it('flushes immediately during beforeunload', () => {
    const document = ref(createEditorDocument({ name: 'beforeunload' }))
    const saveDocument = vi.fn()
    const beforeUnloadListeners: Array<() => void> = []
    const controller = createAutoSaveController({
      document,
      saveDocument,
      addBeforeUnloadListener: listener => {
        beforeUnloadListeners.push(listener)
      },
      removeBeforeUnloadListener: listener => {
        const listenerIndex = beforeUnloadListeners.indexOf(listener)
        if (listenerIndex !== -1) {
          beforeUnloadListeners.splice(listenerIndex, 1)
        }
      },
      setTimer: globalThis.setTimeout,
      clearTimer: globalThis.clearTimeout,
    })

    controller.register()
    controller.scheduleSave()
    const beforeUnloadListener = beforeUnloadListeners[0]
    if (beforeUnloadListener != null) {
      beforeUnloadListener()
    }

    expect(saveDocument).toHaveBeenCalledTimes(1)
    expect(saveDocument).toHaveBeenCalledWith(document.value)

    controller.unregister()
    expect(beforeUnloadListeners).toHaveLength(0)
  })

  it('skips scheduled and immediate saves while disabled', () => {
    const document = ref(createEditorDocument({ name: 'disabled' }))
    const enabled = ref(false)
    const saveDocument = vi.fn()
    const controller = createAutoSaveController({
      document,
      enabled,
      saveDocument,
      setTimer: globalThis.setTimeout,
      clearTimer: globalThis.clearTimeout,
    })

    controller.scheduleSave()
    controller.saveNow()
    vi.runAllTimers()

    expect(saveDocument).not.toHaveBeenCalled()
  })
})
