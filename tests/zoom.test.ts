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

  it('steps through supported zoom levels', () => {
    const { renderScale, resetZoom, zoom, zoomIn, zoomOut } = useZoom()

    expect(zoom.value).toBe(1)
    expect(renderScale.value).toBe(8)
    expect(zoomIn()).toBe(2)
    expect(zoom.value).toBe(2)
    expect(zoomOut()).toBe(1)
    expect(resetZoom()).toBe(1)
  })
})
