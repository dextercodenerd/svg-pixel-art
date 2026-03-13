import { defineStore } from 'pinia'
import type { ActiveColorSlot } from '../types'

interface ColorState {
  fg: string
  bg: string
  activeSlot: ActiveColorSlot
}

export const useColorStore = defineStore('color', {
  state: (): ColorState => ({
    fg: '#000000ff',
    bg: '#ffffffff',
    activeSlot: 'fg',
  }),
  actions: {
    setFg(color: string) {
      this.fg = color
    },
    setBg(color: string) {
      this.bg = color
    },
    swap() {
      const nextFg = this.bg
      this.bg = this.fg
      this.fg = nextFg
    },
    setActiveSlot(slot: ActiveColorSlot) {
      this.activeSlot = slot
    },
  },
})
