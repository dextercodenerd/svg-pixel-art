// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { EditorDocument } from '../types'
import { MAX_HISTORY_SNAPSHOTS, cloneDocument, createEditorDocument } from '../types'

export const useHistoryStore = defineStore('history', () => {
  const snapshots = ref<EditorDocument[]>([createEditorDocument()])
  const index = ref(0)

  const canUndo = computed(() => index.value > 0)
  const canRedo = computed(() => index.value < snapshots.value.length - 1)
  const currentSnapshot = computed(() => snapshots.value[index.value] ?? null)

  function resetWith(document: EditorDocument) {
    resetWithOwned(cloneDocument(document))
  }

  function resetWithOwned(document: EditorDocument) {
    snapshots.value = [document]
    index.value = 0
  }

  // Shared internal append: discards redo branch, appends a document, trims to cap
  function appendSnapshot(document: EditorDocument) {
    // Discard everything after the current index (redo branch) in-place
    snapshots.value.splice(index.value + 1)
    snapshots.value.push(document)

    if (snapshots.value.length > MAX_HISTORY_SNAPSHOTS) {
      snapshots.value.shift()
    }

    index.value = snapshots.value.length - 1
  }

  function push(document: EditorDocument) {
    appendSnapshot(cloneDocument(document))
  }

  // Stores document as-is -- caller must guarantee the document is an
  // isolated, freshly created object not referenced by any other code.
  function pushOwned(document: EditorDocument) {
    appendSnapshot(document)
  }

  function undo() {
    if (!canUndo.value) {
      return null
    }

    index.value -= 1
    return cloneDocument(snapshots.value[index.value])
  }

  function redo() {
    if (!canRedo.value) {
      return null
    }

    index.value += 1
    return cloneDocument(snapshots.value[index.value])
  }

  function clear() {
    snapshots.value = []
    index.value = -1
  }

  return {
    snapshots,
    index,
    canUndo,
    canRedo,
    currentSnapshot,
    resetWith,
    resetWithOwned,
    push,
    pushOwned,
    undo,
    redo,
    clear,
  }
})
