import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '../src/stores/editor'
import { useHistoryStore } from '../src/stores/history'
import { EMPTY_PIXEL } from '../src/types'

describe('editor store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-13T16:00:00.000Z'))
    setActivePinia(createPinia())
  })

  it('creates a new document with exact fill and resets view state', () => {
    const editorStore = useEditorStore()
    const historyStore = useHistoryStore()

    editorStore.setZoom(4)
    editorStore.setGridVisible(false)
    editorStore.setPan({ x: 24, y: -12 })

    editorStore.newDocument({
      width: 4,
      height: 3,
      fill: '#abcdef88',
      name: 'fresh-doc',
    })

    expect(editorStore.document.metadata.name).toBe('fresh-doc')
    expect(editorStore.document.pixels).toEqual(Array(12).fill('#abcdef88'))
    expect(editorStore.zoom).toBe(1)
    expect(editorStore.gridVisible).toBe(true)
    expect(editorStore.panOffset).toEqual({ x: 0, y: 0 })
    expect(historyStore.snapshots).toHaveLength(1)
    expect(historyStore.currentSnapshot?.metadata.name).toBe('fresh-doc')
  })

  it('updates updatedAt and pushes history when pixels change', () => {
    const editorStore = useEditorStore()
    const historyStore = useHistoryStore()

    const nextPixels = [...editorStore.document.pixels]
    nextPixels[0] = '#102030ff'

    vi.setSystemTime(new Date('2026-03-13T16:05:00.000Z'))
    editorStore.setPixels(nextPixels)

    expect(editorStore.document.pixels[0]).toBe('#102030ff')
    expect(editorStore.document.metadata.updatedAt).toBe('2026-03-13T16:05:00.000Z')
    expect(historyStore.snapshots).toHaveLength(2)
    expect(historyStore.currentSnapshot?.pixels[0]).toBe('#102030ff')
  })

  it('normalizes transparent fill on new documents', () => {
    const editorStore = useEditorStore()

    editorStore.newDocument({ width: 2, height: 2, fill: '#00000000' })

    expect(editorStore.document.pixels).toEqual(Array(4).fill(EMPTY_PIXEL))
  })
})
