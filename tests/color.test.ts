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
})
