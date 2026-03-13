import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePaletteStore } from '../src/stores/palette'

// Prevent actual localStorage writes during tests
beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
  })
  setActivePinia(createPinia())
})

describe('palette store', () => {
  it('addSwatch silently stops accepting new entries once 32 are stored', () => {
    const paletteStore = usePaletteStore()

    paletteStore.swatches.splice(0)
    for (let i = 0; i < 32; i++) {
      paletteStore.addSwatch(`#${String(i).padStart(6, '0')}ff`)
    }
    expect(paletteStore.swatches).toHaveLength(32)

    paletteStore.addSwatch('#ffffffff')
    expect(paletteStore.swatches).toHaveLength(32)
  })

  it('removeSwatch ignores negative and out-of-range indices', () => {
    const paletteStore = usePaletteStore()
    const original = [...paletteStore.swatches]

    paletteStore.removeSwatch(-1)
    paletteStore.removeSwatch(paletteStore.swatches.length)

    expect(paletteStore.swatches).toEqual(original)
  })

  it('updateSwatch ignores negative and out-of-range indices', () => {
    const paletteStore = usePaletteStore()
    const original = [...paletteStore.swatches]

    paletteStore.updateSwatch(-1, '#ff0000ff')
    paletteStore.updateSwatch(paletteStore.swatches.length, '#ff0000ff')

    expect(paletteStore.swatches).toEqual(original)
  })
})
