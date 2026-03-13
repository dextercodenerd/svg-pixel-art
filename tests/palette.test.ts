import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { usePaletteStore } from '../src/stores/palette'
import { DEFAULT_PALETTE_SWATCHES } from '../src/types'

let getItemMock: ReturnType<typeof vi.fn>
let setItemMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  getItemMock = vi.fn().mockReturnValue(null)
  setItemMock = vi.fn()
  vi.stubGlobal('localStorage', {
    getItem: getItemMock,
    setItem: setItemMock,
  })
  setActivePinia(createPinia())
})

describe('palette store', () => {
  it('falls back to defaults and marks persistence unavailable when storage reads throw', () => {
    getItemMock.mockImplementation(() => {
      throw new Error('blocked')
    })

    const paletteStore = usePaletteStore()

    expect(paletteStore.swatches).toEqual([...DEFAULT_PALETTE_SWATCHES])
    expect(paletteStore.persistenceStatus).toBe('unavailable')
  })

  it('loads valid stored JSON and marks persistence available', () => {
    getItemMock.mockReturnValue(JSON.stringify(['#112233ff', '#445566ff']))

    const paletteStore = usePaletteStore()

    expect(paletteStore.swatches).toEqual(['#112233ff', '#445566ff'])
    expect(paletteStore.persistenceStatus).toBe('available')
  })

  it('falls back to defaults when stored JSON is malformed', () => {
    getItemMock.mockReturnValue('{not-json')

    const paletteStore = usePaletteStore()

    expect(paletteStore.swatches).toEqual([...DEFAULT_PALETTE_SWATCHES])
    expect(paletteStore.persistenceStatus).toBe('unavailable')
  })

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

  it('marks persistence unavailable when storage writes throw without throwing from the store', async () => {
    const paletteStore = usePaletteStore()
    setItemMock.mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(() => paletteStore.addSwatch('#123456ff')).not.toThrow()

    await nextTick()

    expect(paletteStore.persistenceStatus).toBe('unavailable')
  })

  it('dismisses the persistence notice explicitly', () => {
    const paletteStore = usePaletteStore()

    paletteStore.markPersistenceNoticeDismissed()

    expect(paletteStore.persistenceNoticeDismissed).toBe(true)
  })
})
