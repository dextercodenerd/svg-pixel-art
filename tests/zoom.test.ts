// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { getNearestZoomLevel, useZoom } from '../src/composables/useZoom'

describe('useZoom', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('snaps arbitrary values to the nearest supported zoom level', () => {
    expect(getNearestZoomLevel(1.6)).toBe(2)
    expect(getNearestZoomLevel(7.5)).toBe(8)
    expect(getNearestZoomLevel(13)).toBe(16)
  })

  it('returns the exact level when given a supported zoom value', () => {
    expect(getNearestZoomLevel(1)).toBe(1)
    expect(getNearestZoomLevel(4)).toBe(4)
    expect(getNearestZoomLevel(16)).toBe(16)
  })

  it('clamps to 1 for values below the minimum and to 16 for values above the maximum', () => {
    expect(getNearestZoomLevel(0)).toBe(1)
    expect(getNearestZoomLevel(-5)).toBe(1)
    expect(getNearestZoomLevel(100)).toBe(16)
  })

  it('steps through supported zoom levels', () => {
    const { renderScale, resetZoom, zoom, zoomIn, zoomOut } = useZoom()

    expect(zoom.value).toBe(1)
    expect(renderScale.value).toBe(8)
    expect(zoomIn()).toBe(2)
    expect(zoom.value).toBe(2)
    expect(zoomOut()).toBe(1)
    expect(resetZoom()).toBe(1)
  })

  it('zoomIn at maximum level stays at 16', () => {
    const { zoom, zoomIn, zoomToLevel } = useZoom()

    zoomToLevel(16)
    expect(zoom.value).toBe(16)
    expect(zoomIn()).toBe(16)
    expect(zoom.value).toBe(16)
  })

  it('zoomOut at minimum level stays at 1', () => {
    const { zoom, zoomOut } = useZoom()

    expect(zoom.value).toBe(1)
    expect(zoomOut()).toBe(1)
    expect(zoom.value).toBe(1)
  })
})
