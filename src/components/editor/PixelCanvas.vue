<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { parseHex } from '../../services/colorUtils'
import { BASE_PIXEL_SIZE, isTransparentPixel } from '../../types'
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
    previewPixels?: string[] | null
    zoom: ZoomLevel
  }>(),
  {
    previewPixels: null,
  },
)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const renderRequestId = ref<number | null>(null)
const checkerboardPattern = ref<CanvasPattern | null>(null)

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
 * Fast path: write pixel RGBA values directly into an ImageData buffer and
 * flush via a single putImageData + drawImage, avoiding tens of thousands of
 * individual fillRect calls which saturate the 2D canvas command queue.
 *
 * This works for any canvas <= 256×256 (always the case for this editor).
 */
function drawPixelsFast(
  context: CanvasRenderingContext2D,
  pixels: string[],
  width: number,
  height: number,
  alpha = 1,
) {
  // Allocate a 1:1 ImageData (one pixel per document "pixel"), then scale via drawImage.
  const imageData = context.createImageData(width, height)
  const data = imageData.data

  for (let i = 0; i < pixels.length; i++) {
    const pixel = pixels[i]
    if (isTransparentPixel(pixel)) {
      continue
    }

    const { r, g, b, a } = parseHex(pixel)
    const offset = i * 4
    data[offset] = r
    data[offset + 1] = g
    data[offset + 2] = b
    data[offset + 3] = Math.round(a * alpha)
  }

  // Write to an offscreen canvas so we can scale with drawImage (ImageData has no built-in scale).
  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height
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

  const widthInPixels = Math.min(props.cursor.size, props.document.width - props.cursor.col)
  const heightInPixels = Math.min(props.cursor.size, props.document.height - props.cursor.row)

  if (widthInPixels <= 0 || heightInPixels <= 0) {
    return
  }

  const x = props.cursor.col * renderScale.value
  const y = props.cursor.row * renderScale.value
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

  drawPixelsFast(context, props.document.pixels, props.document.width, props.document.height)

  if (props.previewPixels != null && props.previewPixels.length === props.document.pixels.length) {
    drawPixelsFast(
      context,
      props.previewPixels,
      props.document.width,
      props.document.height,
      0.65,
    )
  }

  // Only draw the grid when "pixels" are large enough that grid lines are visible
  if (props.gridVisible && renderScale.value >= MIN_GRID_RENDER_SCALE) {
    drawGrid(context)
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
      props.previewPixels,
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
