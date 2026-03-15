// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { saveDraft } from '../services/draftStorage'
import { useEditorStore } from '../stores/editor'
import type { EditorDocument } from '../types'
import type { Ref } from 'vue'

const AUTO_SAVE_DEBOUNCE_MS = 250

interface AutoSaveControllerOptions {
  document: Ref<EditorDocument>
  enabled?: Ref<boolean>
  saveDocument?: (document: EditorDocument) => void
  addBeforeUnloadListener?: (listener: () => void) => void
  removeBeforeUnloadListener?: (listener: () => void) => void
  setTimer?: typeof window.setTimeout
  clearTimer?: typeof window.clearTimeout
}

export function createAutoSaveController(options: AutoSaveControllerOptions) {
  let timeoutId: number | null = null

  const addBeforeUnloadListener =
    options.addBeforeUnloadListener ??
    (listener => window.addEventListener('beforeunload', listener))
  const clearTimer = options.clearTimer ?? window.clearTimeout.bind(window)
  const removeBeforeUnloadListener =
    options.removeBeforeUnloadListener ??
    (listener => window.removeEventListener('beforeunload', listener))
  const saveDocument = options.saveDocument ?? saveDraft
  const setTimer = options.setTimer ?? window.setTimeout.bind(window)

  function isEnabled() {
    return options.enabled?.value ?? true
  }

  function clearPendingSave() {
    if (timeoutId == null) {
      return
    }

    clearTimer(timeoutId)
    timeoutId = null
  }

  function saveNow() {
    if (!isEnabled()) {
      return
    }

    clearPendingSave()
    saveDocument(options.document.value)
  }

  function scheduleSave() {
    if (!isEnabled()) {
      return
    }

    clearPendingSave()
    timeoutId = setTimer(() => {
      timeoutId = null
      saveDocument(options.document.value)
    }, AUTO_SAVE_DEBOUNCE_MS)
  }

  function onBeforeUnload() {
    saveNow()
  }

  function register() {
    addBeforeUnloadListener(onBeforeUnload)
  }

  function unregister() {
    clearPendingSave()
    removeBeforeUnloadListener(onBeforeUnload)
  }

  return {
    clearPendingSave,
    onBeforeUnload,
    register,
    saveNow,
    scheduleSave,
    unregister,
  }
}

export function useAutoSave(options?: { enabled?: Ref<boolean> }) {
  const editorStore = useEditorStore()
  const { document } = storeToRefs(editorStore)
  const controller = createAutoSaveController({
    document,
    enabled: options?.enabled,
  })

  watch(document, () => {
    controller.scheduleSave()
  })

  onMounted(() => {
    controller.register()
  })

  onBeforeUnmount(() => {
    controller.unregister()
  })

  return {
    saveNow: controller.saveNow,
  }
}
