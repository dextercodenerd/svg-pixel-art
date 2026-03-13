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
    snapshots.value = [cloneDocument(document)]
    index.value = 0
  }

  function push(document: EditorDocument) {
    const nextSnapshots = snapshots.value.slice(0, index.value + 1).concat(cloneDocument(document))

    if (nextSnapshots.length > MAX_HISTORY_SNAPSHOTS) {
      snapshots.value = nextSnapshots.slice(nextSnapshots.length - MAX_HISTORY_SNAPSHOTS)
      index.value = snapshots.value.length - 1
      return
    }

    snapshots.value = nextSnapshots
    index.value = snapshots.value.length - 1
  }

  // Stores document as-is — caller must guarantee the document is an
  // isolated, freshly created object not referenced by any other code.
  function pushOwned(document: EditorDocument) {
    const nextSnapshots = snapshots.value.slice(0, index.value + 1).concat(document)

    if (nextSnapshots.length > MAX_HISTORY_SNAPSHOTS) {
      snapshots.value = nextSnapshots.slice(nextSnapshots.length - MAX_HISTORY_SNAPSHOTS)
      index.value = snapshots.value.length - 1
      return
    }

    snapshots.value = nextSnapshots
    index.value = snapshots.value.length - 1
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
    push,
    pushOwned,
    undo,
    redo,
    clear,
  }
})
