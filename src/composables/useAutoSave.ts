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
import type { Ref } from 'vue'

const AUTO_SAVE_DEBOUNCE_MS = 250

export function useAutoSave(options?: { enabled?: Ref<boolean> }) {
  const editorStore = useEditorStore()
  const { document } = storeToRefs(editorStore)
  let timeoutId: number | null = null

  function clearPendingSave() {
    if (timeoutId == null) {
      return
    }

    window.clearTimeout(timeoutId)
    timeoutId = null
  }

  function isEnabled() {
    return options?.enabled?.value ?? true
  }

  function saveNow() {
    if (!isEnabled()) {
      return
    }

    clearPendingSave()
    saveDraft(document.value)
  }

  function scheduleSave() {
    if (!isEnabled()) {
      return
    }

    clearPendingSave()
    timeoutId = window.setTimeout(() => {
      timeoutId = null
      saveDraft(document.value)
    }, AUTO_SAVE_DEBOUNCE_MS)
  }

  function onBeforeUnload() {
    saveNow()
  }

  watch(document, () => {
    scheduleSave()
  })

  onMounted(() => {
    window.addEventListener('beforeunload', onBeforeUnload)
  })

  onBeforeUnmount(() => {
    clearPendingSave()
    window.removeEventListener('beforeunload', onBeforeUnload)
  })

  return {
    saveNow,
  }
}
