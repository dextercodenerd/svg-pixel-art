// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useHistoryStore } from '../src/stores/history'
import { MAX_HISTORY_SNAPSHOTS, createEditorDocument } from '../src/types'
import { hexToAbgr } from '../src/services/colorUtils'

describe('history store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('resets to exactly one cloned snapshot', () => {
    const historyStore = useHistoryStore()
    const fill = hexToAbgr('#11223344')
    const document = createEditorDocument({ width: 8, height: 8, fill })

    historyStore.resetWith(document)
    document.pixels[0] = hexToAbgr('#ffffffff')

    expect(historyStore.snapshots).toHaveLength(1)
    expect(historyStore.index).toBe(0)
    expect(historyStore.currentSnapshot?.pixels[0]).toBe(fill)
  })

  it('stores owned reset snapshots by reference but keeps undo and redo isolated on read', () => {
    const historyStore = useHistoryStore()
    const base = createEditorDocument({ name: 'owned-base' })
    const next = createEditorDocument({ name: 'owned-next' })

    historyStore.resetWithOwned(base)
    base.metadata.name = 'owned-base-mutated'
    expect(historyStore.currentSnapshot?.metadata.name).toBe('owned-base-mutated')

    historyStore.pushOwned(next)
    next.metadata.name = 'owned-next-mutated'
    expect(historyStore.currentSnapshot?.metadata.name).toBe('owned-next-mutated')

    const undone = historyStore.undo()!
    const redone = historyStore.redo()!

    undone.metadata.name = 'mutated-undo'
    redone.metadata.name = 'mutated-redo'

    expect(historyStore.snapshots[0]?.metadata.name).toBe('owned-base-mutated')
    expect(historyStore.snapshots[1]?.metadata.name).toBe('owned-next-mutated')
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

  it('undo returns null and does not move index when already at the start', () => {
    const historyStore = useHistoryStore()
    historyStore.resetWith(createEditorDocument({ name: 'only' }))

    expect(historyStore.canUndo).toBe(false)
    expect(historyStore.undo()).toBeNull()
    expect(historyStore.index).toBe(0)
  })

  it('redo returns null and does not move index when already at the end', () => {
    const historyStore = useHistoryStore()
    historyStore.resetWith(createEditorDocument({ name: 'only' }))

    expect(historyStore.canRedo).toBe(false)
    expect(historyStore.redo()).toBeNull()
    expect(historyStore.index).toBe(0)
  })

  it('undo and redo return independent clones, not stored references', () => {
    const historyStore = useHistoryStore()
    historyStore.resetWith(createEditorDocument({ name: 'base' }))
    historyStore.push(createEditorDocument({ name: 'next' }))

    const undone = historyStore.undo()!
    undone.metadata.name = 'mutated-via-undo'

    expect(historyStore.currentSnapshot?.metadata.name).toBe('base')

    const redone = historyStore.redo()!
    redone.metadata.name = 'mutated-via-redo'

    expect(historyStore.currentSnapshot?.metadata.name).toBe('next')
  })

  it('clear empties the snapshot list and sets index to -1', () => {
    const historyStore = useHistoryStore()
    historyStore.resetWith(createEditorDocument())
    historyStore.push(createEditorDocument())

    historyStore.clear()

    expect(historyStore.snapshots).toHaveLength(0)
    expect(historyStore.index).toBe(-1)
    expect(historyStore.canUndo).toBe(false)
    expect(historyStore.canRedo).toBe(false)
    expect(historyStore.currentSnapshot).toBeNull()
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
