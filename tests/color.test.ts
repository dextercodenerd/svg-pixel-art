// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useColorStore } from '../src/stores/color'

describe('color store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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
})
