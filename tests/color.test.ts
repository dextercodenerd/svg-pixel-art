// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useColorStore } from '../src/stores/color'

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

describe('color store', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    setActivePinia(createPinia())
    storage = new MemoryStorage()
    vi.stubGlobal('localStorage', storage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('swap exchanges fg and bg without losing either value', () => {
    const colorStore = useColorStore()

    colorStore.setFg('#ff0000ff')
    colorStore.setBg('#0000ffff')
    colorStore.swap()

    expect(colorStore.fg).toBe('#0000ffff')
    expect(colorStore.bg).toBe('#ff0000ff')
  })

  it('double swap restores original values', () => {
    const colorStore = useColorStore()

    colorStore.setFg('#aabbccff')
    colorStore.setBg('#112233ff')
    colorStore.swap()
    colorStore.swap()

    expect(colorStore.fg).toBe('#aabbccff')
    expect(colorStore.bg).toBe('#112233ff')
  })

  it('normalizes six-digit colors before storing them', () => {
    const colorStore = useColorStore()

    colorStore.setFg('#AABBCC')
    colorStore.setBg('ddeeff')

    expect(colorStore.fg).toBe('#aabbccff')
    expect(colorStore.bg).toBe('#ddeeffff')
  })

  it('ignores invalid color writes', () => {
    const colorStore = useColorStore()

    colorStore.setFg('#123456ff')
    colorStore.setBg('#abcdef12')

    colorStore.setFg('not-a-color')
    colorStore.setBg('#12345')

    expect(colorStore.fg).toBe('#123456ff')
    expect(colorStore.bg).toBe('#abcdef12')
  })

  it('restores stored colors during initialization', () => {
    storage.setItem('pixel-art:colors', JSON.stringify({ fg: '#AABBCC', bg: 'ddeeff' }))

    const colorStore = useColorStore()

    expect(colorStore.fg).toBe('#aabbccff')
    expect(colorStore.bg).toBe('#ddeeffff')
  })

  it('persists normalized colors after updates', async () => {
    const colorStore = useColorStore()

    colorStore.setFg('#AABBCC')
    colorStore.setBg('ddeeff')
    await nextTick()

    expect(storage.getItem('pixel-art:colors')).toBe(
      JSON.stringify({ fg: '#aabbccff', bg: '#ddeeffff' }),
    )
  })
})
