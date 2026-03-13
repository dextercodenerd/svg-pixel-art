// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useEditorStore } from '../stores/editor'
import { BASE_PIXEL_SIZE, ZOOM_LEVELS } from '../types'
import type { ZoomLevel } from '../types'

export function getNearestZoomLevel(value: number): ZoomLevel {
  return ZOOM_LEVELS.reduce((closest, level) => {
    return Math.abs(level - value) < Math.abs(closest - value) ? level : closest
  }, ZOOM_LEVELS[0]!)
}

export function useZoom() {
  const editorStore = useEditorStore()
  const { zoom } = storeToRefs(editorStore)

  const renderScale = computed(() => BASE_PIXEL_SIZE * zoom.value)
  const zoomIndex = computed(() => ZOOM_LEVELS.indexOf(zoom.value))

  function getZoomInLevel(): ZoomLevel {
    return ZOOM_LEVELS[Math.min(zoomIndex.value + 1, ZOOM_LEVELS.length - 1)] ?? zoom.value
  }

  function getZoomOutLevel(): ZoomLevel {
    return ZOOM_LEVELS[Math.max(zoomIndex.value - 1, 0)] ?? zoom.value
  }

  function zoomToLevel(level: number): ZoomLevel {
    const nextZoom = getNearestZoomLevel(level)
    editorStore.setZoom(nextZoom)
    return nextZoom
  }

  function zoomIn(): ZoomLevel {
    return zoomToLevel(getZoomInLevel())
  }

  function zoomOut(): ZoomLevel {
    return zoomToLevel(getZoomOutLevel())
  }

  function resetZoom(): ZoomLevel {
    editorStore.setZoom(1)
    return 1
  }

  return {
    zoom,
    renderScale,
    getZoomInLevel,
    getZoomOutLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomToLevel,
  }
}
