// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DRAFT_STORAGE_KEY,
  clearDraft,
  loadDraft,
  saveDraft,
} from '../src/services/draftStorage'
import { createEditorDocument, EMPTY_PIXEL } from '../src/types'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.has(key) ? this.values.get(key) ?? null : null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

describe('draftStorage', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T11:00:00.000Z'))
    storage = new MemoryStorage()
    vi.stubGlobal('localStorage', storage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('saves only serialized document data and reloads it through the validator', () => {
    const document = createEditorDocument({ width: 2, height: 2, name: 'draft' })
    document.pixels = ['#00000000', '#abcdef88', EMPTY_PIXEL, '#ffffffff']

    saveDraft(document)

    expect(JSON.parse(storage.getItem(DRAFT_STORAGE_KEY) ?? 'null')).toEqual({
      version: 1,
      width: 2,
      height: 2,
      pixels: ['', '#abcdef88', '', '#ffffffff'],
      metadata: {
        name: 'draft',
        createdAt: document.metadata.createdAt,
        updatedAt: document.metadata.updatedAt,
      },
    })
    expect(loadDraft()).toEqual({
      version: 1,
      width: 2,
      height: 2,
      pixels: [EMPTY_PIXEL, '#abcdef88', EMPTY_PIXEL, '#ffffffff'],
      metadata: {
        name: 'draft',
        createdAt: document.metadata.createdAt,
        updatedAt: document.metadata.updatedAt,
      },
    })
  })

  it('clears invalid stored drafts instead of returning malformed data', () => {
    storage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        width: 2,
        height: 2,
        pixels: ['#ffffffff'],
        metadata: { name: 'broken' },
      }),
    )

    expect(loadDraft()).toBeNull()
    expect(storage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
  })

  it('removes the draft entry when clearDraft is called', () => {
    storage.setItem(DRAFT_STORAGE_KEY, '{}')

    clearDraft()

    expect(storage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
  })
})
