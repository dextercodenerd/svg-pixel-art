<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BASE_PIXEL_SIZE } from '../../types'
import type { EditorDocument, ZoomLevel } from '../../types'

// Minimum renderScale (px per art pixel) at which the grid is dense enough to be useful.
const MIN_GRID_RENDER_SCALE = 4

interface CanvasCursor {
  col: number
  row: number
  size: number
}

const props = withDefaults(
  defineProps<{
    cursor: CanvasCursor | null
    document: EditorDocument
    gridVisible: boolean
    previewMode?: 'overlay' | 'replace'
    previewNoopMask?: Uint8Array | null
    previewPixels?: Uint32Array | null
    zoom: ZoomLevel
  }>(),
  {
    previewMode: 'overlay',
    previewNoopMask: null,
    previewPixels: null,
  },
)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const renderRequestId = ref<number | null>(null)
const checkerboardPattern = ref<CanvasPattern | null>(null)
const offscreenCanvas = ref<HTMLCanvasElement | null>(null)

const renderScale = computed(() => BASE_PIXEL_SIZE * props.zoom)
const canvasWidth = computed(() => props.document.width * renderScale.value)
const canvasHeight = computed(() => props.document.height * renderScale.value)

function scheduleRender() {
  if (renderRequestId.value != null) {
    return
  }

  renderRequestId.value = requestAnimationFrame(() => {
    renderRequestId.value = null
    drawCanvas()
  })
}

function ensureCheckerboardPattern(context: CanvasRenderingContext2D): CanvasPattern | null {
  if (checkerboardPattern.value != null) {
    return checkerboardPattern.value
  }

  const patternCanvas = document.createElement('canvas')
  patternCanvas.width = 16
  patternCanvas.height = 16

  const patternContext = patternCanvas.getContext('2d')
  if (patternContext == null) {
    return null
  }

  patternContext.fillStyle = '#d8d8d8'
  patternContext.fillRect(0, 0, 16, 16)
  patternContext.fillStyle = '#f4f4f4'
  patternContext.fillRect(0, 0, 8, 8)
  patternContext.fillRect(8, 8, 8, 8)

  checkerboardPattern.value = context.createPattern(patternCanvas, 'repeat')
  return checkerboardPattern.value
}

/**
 * Fast path: bulk-copy ABGR uint32 pixels into an ImageData buffer and
 * flush via a single putImageData + drawImage, avoiding per-pixel string
 * parsing entirely.
 *
 * ABGR byte order matches RGBA in ImageData on little-endian (all modern hardware).
 */
function drawPixelsFast(
  context: CanvasRenderingContext2D,
  pixels: Uint32Array,
  width: number,
  height: number,
  overlay = false,
) {
  const imageData = context.createImageData(width, height)
  const u32 = new Uint32Array(imageData.data.buffer)

  if (overlay) {
    // Overlay mode: only draw non-transparent pixels from the preview layer
    for (let i = 0; i < pixels.length; i++) {
      if (pixels[i] !== 0) {
        u32[i] = pixels[i]!
      }
    }
  } else {
    // Full copy — single memcpy
    u32.set(pixels)
  }

  // Write to an offscreen canvas so we can scale with drawImage (ImageData has no built-in scale).
  // The offscreen canvas is cached and resized on demand to avoid allocation per frame.
  if (offscreenCanvas.value == null) {
    offscreenCanvas.value = document.createElement('canvas')
  }
  const offscreen = offscreenCanvas.value
  if (offscreen.width !== width || offscreen.height !== height) {
    offscreen.width = width
    offscreen.height = height
  }
  offscreen.getContext('2d')!.putImageData(imageData, 0, 0)

  context.save()
  context.imageSmoothingEnabled = false // nearest neighbor scaling
  context.drawImage(offscreen, 0, 0, canvasWidth.value, canvasHeight.value)
  context.restore()
}

function drawGrid(context: CanvasRenderingContext2D) {
  context.save()
  context.strokeStyle = 'rgba(41, 27, 16, 0.18)'
  context.lineWidth = 1
  context.beginPath()

  for (let col = 0; col <= props.document.width; col += 1) {
    const x = col * renderScale.value + 0.5
    context.moveTo(x, 0)
    context.lineTo(x, canvasHeight.value)
  }

  for (let row = 0; row <= props.document.height; row += 1) {
    const y = row * renderScale.value + 0.5
    context.moveTo(0, y)
    context.lineTo(canvasWidth.value, y)
  }

  context.stroke()
  context.restore()
}

function drawCursor(context: CanvasRenderingContext2D) {
  if (props.cursor == null) {
    return
  }

  const startCol = Math.max(0, props.cursor.col)
  const startRow = Math.max(0, props.cursor.row)
  const endCol = Math.min(props.document.width, props.cursor.col + props.cursor.size)
  const endRow = Math.min(props.document.height, props.cursor.row + props.cursor.size)
  const widthInPixels = endCol - startCol
  const heightInPixels = endRow - startRow

  if (widthInPixels <= 0 || heightInPixels <= 0) {
    return
  }

  const x = startCol * renderScale.value
  const y = startRow * renderScale.value
  const width = widthInPixels * renderScale.value
  const height = heightInPixels * renderScale.value

  context.save()
  context.strokeStyle = 'rgba(255, 255, 255, 0.95)'
  context.lineWidth = 1
  context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)

  context.setLineDash([4, 4])
  context.strokeStyle = 'rgba(24, 18, 14, 0.95)'
  context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)
  context.restore()
}

function drawNoopPreviewMarkers(context: CanvasRenderingContext2D, mask: Uint8Array) {
  context.save()

  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] !== 1) {
      continue
    }

    const col = index % props.document.width
    const row = Math.floor(index / props.document.width)
    const x = col * renderScale.value
    const y = row * renderScale.value
    const size = renderScale.value

    context.strokeStyle = 'rgba(255, 255, 255, 0.9)'
    context.lineWidth = 1
    context.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1)

    context.strokeStyle = 'rgba(220, 38, 38, 0.95)'
    context.beginPath()
    context.moveTo(x + 1, y + 1)
    context.lineTo(x + size - 1, y + size - 1)
    context.stroke()
  }

  context.restore()
}

function drawCanvas() {
  const canvas = canvasRef.value
  if (canvas == null) {
    return
  }

  const context = canvas.getContext('2d')
  if (context == null) {
    return
  }

  const pattern = ensureCheckerboardPattern(context)

  context.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  context.imageSmoothingEnabled = false

  if (pattern != null) {
    context.fillStyle = pattern
    context.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
  }

  const shouldReplacePixels =
    props.previewMode === 'replace' &&
    props.previewPixels != null &&
    props.previewPixels.length === props.document.pixels.length
  const basePixels = shouldReplacePixels ? props.previewPixels! : props.document.pixels

  drawPixelsFast(context, basePixels, props.document.width, props.document.height)

  if (
    props.previewMode === 'overlay' &&
    props.previewPixels != null &&
    props.previewPixels.length === props.document.pixels.length
  ) {
    drawPixelsFast(context, props.previewPixels, props.document.width, props.document.height, true)
  }

  // Only draw the grid when "pixels" are large enough that grid lines are visible
  if (props.gridVisible && renderScale.value >= MIN_GRID_RENDER_SCALE) {
    drawGrid(context)
  }

  if (
    props.previewNoopMask != null &&
    props.previewNoopMask.length === props.document.pixels.length
  ) {
    drawNoopPreviewMarkers(context, props.previewNoopMask)
  }

  drawCursor(context)
}

// Invalidate checkerboard pattern when the canvas dimensions change (e.g. zoom or doc swap).
// The pattern is bound to the rendering context; a canvas resize resets the internal context.
watch([canvasWidth, canvasHeight], () => {
  checkerboardPattern.value = null
})

// Trigger a re-render whenever any prop that affects the canvas changes.
// Using explicit watch sources instead of watchEffect avoids fragile implicit dependency tracking.
watch(
  () =>
    [
      props.document.width,
      props.document.height,
      props.document.pixels,
      props.zoom,
      props.gridVisible,
      props.previewNoopMask,
      props.previewPixels,
      props.previewMode,
      props.cursor,
    ] as const,
  () => {
    scheduleRender()
  },
  { deep: false },
)

onMounted(() => {
  scheduleRender()
})

onBeforeUnmount(() => {
  if (renderRequestId.value != null) {
    cancelAnimationFrame(renderRequestId.value)
  }
})
</script>

<template>
  <canvas ref="canvasRef" :width="canvasWidth" :height="canvasHeight" class="pixel-canvas block" />
</template>
