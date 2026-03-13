import { defineStore } from 'pinia'
import type { EditorDocument } from '../types'
import { MAX_HISTORY_SNAPSHOTS, cloneDocument, createEditorDocument } from '../types'

interface HistoryState {
  snapshots: EditorDocument[]
  index: number
}

export const useHistoryStore = defineStore('history', {
  state: (): HistoryState => ({
    snapshots: [createEditorDocument()],
    index: 0,
  }),
  getters: {
    canUndo: state => state.index > 0,
    canRedo: state => state.index < state.snapshots.length - 1,
    currentSnapshot: state => state.snapshots[state.index] ?? null,
  },
  actions: {
    resetWith(document: EditorDocument) {
      this.snapshots = [cloneDocument(document)]
      this.index = 0
    },
    push(document: EditorDocument) {
      const nextSnapshots = this.snapshots.slice(0, this.index + 1).concat(cloneDocument(document))

      if (nextSnapshots.length > MAX_HISTORY_SNAPSHOTS) {
        this.snapshots = nextSnapshots.slice(nextSnapshots.length - MAX_HISTORY_SNAPSHOTS)
        this.index = this.snapshots.length - 1
        return
      }

      this.snapshots = nextSnapshots
      this.index = this.snapshots.length - 1
    },
    undo() {
      if (!this.canUndo) {
        return null
      }

      this.index -= 1
      return cloneDocument(this.snapshots[this.index])
    },
    redo() {
      if (!this.canRedo) {
        return null
      }

      this.index += 1
      return cloneDocument(this.snapshots[this.index])
    },
    clear() {
      this.snapshots = []
      this.index = -1
    },
  },
})
