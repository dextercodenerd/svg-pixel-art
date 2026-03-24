// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '../src/stores/editor'
import { useHistoryStore } from '../src/stores/history'
import { TRANSPARENT_U32, createEditorDocument } from '../src/types'
import { hexToAbgr } from '../src/services/colorUtils'
import { DRAFT_STORAGE_KEY } from '../src/services/draftStorage'

const T = TRANSPARENT_U32
const h = hexToAbgr

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.has(key) ? (this.values.get(key) ?? null) : null
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

describe('editor store', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-13T16:00:00.000Z'))
    setActivePinia(createPinia())
    storage = new MemoryStorage()
    vi.stubGlobal('localStorage', storage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a new document with exact fill and resets view state', () => {
    const editorStore = useEditorStore()
    const historyStore = useHistoryStore()

    editorStore.setZoom(4)
    editorStore.setGridVisible(false)
    editorStore.setPan({ x: 24, y: -12 })

    const fill = h('#abcdef88')
    editorStore.newDocument({
      width: 4,
      height: 3,
      fill,
      name: 'fresh-doc',
    })

    expect(editorStore.document.metadata.name).toBe('fresh-doc')
    expect(editorStore.document.pixels).toEqual(new Uint32Array(12).fill(fill))
    expect(editorStore.zoom).toBe(1)
    expect(editorStore.gridVisible).toBe(true)
    expect(editorStore.panOffset).toEqual({ x: 0, y: 0 })
    expect(historyStore.snapshots).toHaveLength(1)
    expect(historyStore.currentSnapshot?.metadata.name).toBe('fresh-doc')
  })

  it('updates updatedAt and pushes history when pixels change', () => {
    const editorStore = useEditorStore()
    const historyStore = useHistoryStore()

    const nextPixels = new Uint32Array(editorStore.document.pixels)
    nextPixels[0] = h('#102030ff')

    vi.setSystemTime(new Date('2026-03-13T16:05:00.000Z'))
    editorStore.setPixels(nextPixels)

    expect(editorStore.document.pixels[0]).toBe(h('#102030ff'))
    expect(editorStore.document.metadata.updatedAt).toBe('2026-03-13T16:05:00.000Z')
    expect(historyStore.snapshots).toHaveLength(2)
    expect(historyStore.currentSnapshot?.pixels[0]).toBe(h('#102030ff'))
  })

  it('normalizes transparent fill on new documents', () => {
    const editorStore = useEditorStore()

    editorStore.newDocument({ width: 2, height: 2, fill: 0 })

    expect(editorStore.document.pixels).toEqual(new Uint32Array(4))
  })

  it('persists the draft immediately when newDocument requests it', () => {
    const editorStore = useEditorStore()
    const historyStore = useHistoryStore()

    editorStore.setZoom(8)
    editorStore.setGridVisible(false)
    editorStore.setPan({ x: 24, y: 12 })

    const fill = h('#abcdef88')
    editorStore.newDocument({
      width: 3,
      height: 2,
      fill,
      name: 'persisted-new',
      persistDraft: true,
    })

    expect(editorStore.document.metadata.name).toBe('persisted-new')
    expect(editorStore.zoom).toBe(1)
    expect(editorStore.gridVisible).toBe(true)
    expect(editorStore.panOffset).toEqual({ x: 0, y: 0 })
    expect(historyStore.snapshots).toHaveLength(1)
    expect(storage.getItem(DRAFT_STORAGE_KEY)).toContain('"name":"persisted-new"')
    expect(storage.getItem(DRAFT_STORAGE_KEY)).toContain('"pixels":["#abcdef88","#abcdef88"')
  })

  it('throws when newDocument receives dimensions outside 1-256', () => {
    const editorStore = useEditorStore()

    expect(() => editorStore.newDocument({ width: 0, height: 16 })).toThrow()
    expect(() => editorStore.newDocument({ width: 16, height: 0 })).toThrow()
    expect(() => editorStore.newDocument({ width: 257, height: 16 })).toThrow()
    expect(() => editorStore.newDocument({ width: 16, height: 257 })).toThrow()
  })

  it('loadDocument resets view state and history, does not share references with caller', () => {
    const editorStore = useEditorStore()
    const historyStore = useHistoryStore()

    editorStore.setZoom(8)
    editorStore.setGridVisible(false)
    editorStore.setPan({ x: 50, y: 50 })

    const external = createEditorDocument({ width: 5, height: 5, name: 'loaded' })
    editorStore.loadDocument(external)

    external.metadata.name = 'mutated-externally'

    expect(editorStore.document.metadata.name).toBe('loaded')
    expect(editorStore.zoom).toBe(1)
    expect(editorStore.gridVisible).toBe(true)
    expect(editorStore.panOffset).toEqual({ x: 0, y: 0 })
    expect(historyStore.snapshots).toHaveLength(1)
  })

  it('loadDocument normalizes zero-alpha pixels to 0', () => {
    const editorStore = useEditorStore()
    const historyStore = useHistoryStore()
    const external = createEditorDocument({ width: 2, height: 2, name: 'loaded' })

    external.pixels = new Uint32Array([0, h('#102030ff'), 0, 0])

    editorStore.loadDocument(external)

    expect(editorStore.document.pixels).toEqual(new Uint32Array([T, h('#102030ff'), T, T]))
    expect(historyStore.currentSnapshot?.pixels).toEqual(
      new Uint32Array([T, h('#102030ff'), T, T]),
    )
  })

  it('replaceDocument resets view/history once and persists the normalized draft when requested', () => {
    const editorStore = useEditorStore()
    const historyStore = useHistoryStore()

    editorStore.setZoom(8)
    editorStore.setGridVisible(false)
    editorStore.setPan({ x: 50, y: -20 })

    const external = createEditorDocument({ width: 2, height: 2, name: 'replacement' })
    external.pixels = new Uint32Array([T, h('#abcdef88'), h('#010203ff'), T])

    editorStore.replaceDocument(external, { persistDraft: true })
    external.metadata.name = 'mutated-after-replace'
    external.pixels[1] = T

    expect(editorStore.document.pixels).toEqual(
      new Uint32Array([T, h('#abcdef88'), h('#010203ff'), T]),
    )
    expect(editorStore.zoom).toBe(1)
    expect(editorStore.gridVisible).toBe(true)
    expect(editorStore.panOffset).toEqual({ x: 0, y: 0 })
    expect(historyStore.snapshots).toHaveLength(1)
    expect(editorStore.document.metadata.name).toBe('replacement')
    expect(historyStore.currentSnapshot?.pixels).toEqual(editorStore.document.pixels)
    expect(storage.getItem(DRAFT_STORAGE_KEY)).toContain('"pixels":["","#abcdef88","#010203ff",""]')
  })

  it('loadDocument throws when pixel data is shorter than the declared dimensions', () => {
    const editorStore = useEditorStore()
    const historyStore = useHistoryStore()
    const originalDocument = createEditorDocument({ width: 3, height: 3, name: 'original' })

    editorStore.loadDocument(originalDocument)
    const malformed = createEditorDocument({ width: 4, height: 4, name: 'broken-short' })
    malformed.pixels = malformed.pixels.slice(0, 15)

    expect(() => editorStore.loadDocument(malformed)).toThrow(
      'Pixel array length must match document dimensions.',
    )
    expect(editorStore.document.metadata.name).toBe('original')
    expect(historyStore.currentSnapshot?.metadata.name).toBe('original')
  })

  it('loadDocument throws when pixel data is longer than the declared dimensions', () => {
    const editorStore = useEditorStore()
    const historyStore = useHistoryStore()
    const originalDocument = createEditorDocument({ width: 3, height: 3, name: 'original' })

    editorStore.loadDocument(originalDocument)
    const malformed = createEditorDocument({ width: 4, height: 4, name: 'broken-long' })
    // Create a pixel array that is one element too long
    const oversized = new Uint32Array(malformed.pixels.length + 1)
    oversized.set(malformed.pixels)
    malformed.pixels = oversized

    expect(() => editorStore.loadDocument(malformed)).toThrow(
      'Pixel array length must match document dimensions.',
    )
    expect(editorStore.document.metadata.name).toBe('original')
    expect(historyStore.currentSnapshot?.metadata.name).toBe('original')
  })

  it('setPixels throws when array length does not match document dimensions', () => {
    const editorStore = useEditorStore()

    editorStore.newDocument({ width: 4, height: 4 })

    expect(() => editorStore.setPixels(new Uint32Array(15))).toThrow()
    expect(() => editorStore.setPixels(new Uint32Array(17))).toThrow()
  })

  it('setPixels normalizes zero-alpha pixels before storing and snapshotting', () => {
    const editorStore = useEditorStore()
    const historyStore = useHistoryStore()

    editorStore.newDocument({ width: 2, height: 2 })

    editorStore.setPixels(new Uint32Array([T, h('#abcdef88'), T, T]))

    expect(editorStore.document.pixels).toEqual(new Uint32Array([T, h('#abcdef88'), T, T]))
    expect(historyStore.currentSnapshot?.pixels).toEqual(
      new Uint32Array([T, h('#abcdef88'), T, T]),
    )
  })

  it('renameDocument updates the document name, updatedAt, and pushes history', () => {
    const editorStore = useEditorStore()
    const historyStore = useHistoryStore()

    vi.setSystemTime(new Date('2026-03-13T17:00:00.000Z'))
    editorStore.renameDocument('my-artwork')

    expect(editorStore.document.metadata.name).toBe('my-artwork')
    expect(editorStore.document.metadata.updatedAt).toBe('2026-03-13T17:00:00.000Z')
    expect(historyStore.snapshots).toHaveLength(2)
    expect(historyStore.currentSnapshot?.metadata.name).toBe('my-artwork')
  })

  it('applyUndo is a no-op when already at the start of history', () => {
    const editorStore = useEditorStore()
    editorStore.newDocument({ width: 2, height: 2, name: 'only' })

    editorStore.applyUndo()

    expect(editorStore.document.metadata.name).toBe('only')
    expect(editorStore.document.width).toBe(2)
  })

  it('applyRedo is a no-op when already at the end of history', () => {
    const editorStore = useEditorStore()
    editorStore.newDocument({ width: 2, height: 2, name: 'only' })

    editorStore.applyRedo()

    expect(editorStore.document.metadata.name).toBe('only')
    expect(editorStore.document.width).toBe(2)
  })

  it('applyUndo and applyRedo restore full document snapshots from history', () => {
    const editorStore = useEditorStore()

    editorStore.newDocument({ width: 2, height: 2, name: 'undo-check' })
    editorStore.setPixels(new Uint32Array([h('#010203ff'), T, T, T]))
    editorStore.setPixels(new Uint32Array([h('#010203ff'), h('#aabbccdd'), T, T]))

    editorStore.applyUndo()
    expect(editorStore.document.width).toBe(2)
    expect(editorStore.document.height).toBe(2)
    expect(editorStore.document.metadata.name).toBe('undo-check')
    expect(editorStore.document.pixels).toEqual(new Uint32Array([h('#010203ff'), T, T, T]))

    editorStore.applyRedo()
    expect(editorStore.document.pixels).toEqual(
      new Uint32Array([h('#010203ff'), h('#aabbccdd'), T, T]),
    )
  })
})
