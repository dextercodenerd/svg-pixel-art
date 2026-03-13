import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useHistoryStore } from '../src/stores/history'
import { MAX_HISTORY_SNAPSHOTS, createEditorDocument } from '../src/types'

describe('history store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('resets to exactly one cloned snapshot', () => {
    const historyStore = useHistoryStore()
    const document = createEditorDocument({ width: 8, height: 8, fill: '#11223344' })

    historyStore.resetWith(document)
    document.pixels[0] = '#ffffffff'

    expect(historyStore.snapshots).toHaveLength(1)
    expect(historyStore.index).toBe(0)
    expect(historyStore.currentSnapshot?.pixels[0]).toBe('#11223344')
  })

  it('discards the redo branch when pushing after undo', () => {
    const historyStore = useHistoryStore()

    historyStore.resetWith(createEditorDocument({ name: 'base' }))
    historyStore.push(createEditorDocument({ name: 'draft-a' }))
    historyStore.push(createEditorDocument({ name: 'draft-b' }))

    const undone = historyStore.undo()
    expect(undone?.metadata.name).toBe('draft-a')
    expect(historyStore.canRedo).toBe(true)

    historyStore.push(createEditorDocument({ name: 'replacement' }))

    expect(historyStore.snapshots.map(snapshot => snapshot.metadata.name)).toEqual([
      'base',
      'draft-a',
      'replacement',
    ])
    expect(historyStore.canRedo).toBe(false)
  })

  it('caps stored snapshots at the configured history limit', () => {
    const historyStore = useHistoryStore()
    historyStore.resetWith(createEditorDocument({ name: 'seed' }))

    for (let index = 0; index < MAX_HISTORY_SNAPSHOTS + 5; index += 1) {
      historyStore.push(createEditorDocument({ name: `snapshot-${index}` }))
    }

    expect(historyStore.snapshots).toHaveLength(MAX_HISTORY_SNAPSHOTS)
    expect(historyStore.index).toBe(MAX_HISTORY_SNAPSHOTS - 1)
    expect(historyStore.snapshots[0]?.metadata.name).toBe('snapshot-5')
    expect(historyStore.currentSnapshot?.metadata.name).toBe(
      `snapshot-${MAX_HISTORY_SNAPSHOTS + 4}`,
    )
  })
})
