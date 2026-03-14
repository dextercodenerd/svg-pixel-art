<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { formatHex, hexToHsv, hsvToRgb, parseHex } from '../../services/colorUtils'
import { clamp, clampUnit } from '../../utils/math'

interface CanvasSize {
  height: number
  width: number
}

type DragTarget = 'hue' | 'sv' | null

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [color: string]
}>()

const hueCanvasRef = ref<HTMLCanvasElement | null>(null)
const svCanvasRef = ref<HTMLCanvasElement | null>(null)
const hueCanvasSize = ref<CanvasSize>({ width: 0, height: 0 })
const svCanvasSize = ref<CanvasSize>({ width: 0, height: 0 })
const initialHsv = hexToHsv(props.modelValue)
const displayHue = ref(initialHsv.s > 0 ? initialHsv.h : 0)

let resizeObserver: ResizeObserver | null = null
let activePointerId: number | null = null
let dragTarget: DragTarget = null

const currentColor = computed(() => parseHex(props.modelValue))
const currentHsv = computed(() => hexToHsv(props.modelValue))

const hueMarkerStyle = computed(() => ({
  left: `${(displayHue.value / 360) * hueCanvasSize.value.width}px`,
  top: `${hueCanvasSize.value.height / 2}px`,
}))

const svMarkerStyle = computed(() => ({
  left: `${currentHsv.value.s * svCanvasSize.value.width}px`,
  top: `${(1 - currentHsv.value.v) * svCanvasSize.value.height}px`,
}))

watch(
  () => props.modelValue,
  value => {
    const nextHsv = hexToHsv(value)
    if (nextHsv.s > 0 && nextHsv.h !== displayHue.value) {
      displayHue.value = nextHsv.h
      drawSvCanvas()
    }
  },
  { immediate: true },
)

function syncCanvasSize(
  canvas: HTMLCanvasElement,
  sizeRef: typeof hueCanvasSize,
): CanvasRenderingContext2D | null {
  const width = Math.max(1, Math.round(canvas.clientWidth))
  const height = Math.max(1, Math.round(canvas.clientHeight))
  const devicePixelRatio = window.devicePixelRatio || 1
  const pixelWidth = Math.max(1, Math.round(width * devicePixelRatio))
  const pixelHeight = Math.max(1, Math.round(height * devicePixelRatio))

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }

  sizeRef.value = { width, height }

  const context = canvas.getContext('2d')
  if (context == null) {
    return null
  }

  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  return context
}

function drawHueCanvas() {
  const canvas = hueCanvasRef.value
  if (canvas == null) {
    return
  }

  const context = syncCanvasSize(canvas, hueCanvasSize)
  if (context == null) {
    return
  }

  const gradient = context.createLinearGradient(0, 0, hueCanvasSize.value.width, 0)
  gradient.addColorStop(0, '#ff0000')
  gradient.addColorStop(1 / 6, '#ffff00')
  gradient.addColorStop(2 / 6, '#00ff00')
  gradient.addColorStop(3 / 6, '#00ffff')
  gradient.addColorStop(4 / 6, '#0000ff')
  gradient.addColorStop(5 / 6, '#ff00ff')
  gradient.addColorStop(1, '#ff0000')

  context.clearRect(0, 0, hueCanvasSize.value.width, hueCanvasSize.value.height)
  context.fillStyle = gradient
  context.fillRect(0, 0, hueCanvasSize.value.width, hueCanvasSize.value.height)
}

function drawSvCanvas() {
  const canvas = svCanvasRef.value
  if (canvas == null) {
    return
  }

  const context = syncCanvasSize(canvas, svCanvasSize)
  if (context == null) {
    return
  }

  const baseColor = hsvToRgb(displayHue.value, 1, 1)
  context.clearRect(0, 0, svCanvasSize.value.width, svCanvasSize.value.height)
  context.fillStyle = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`
  context.fillRect(0, 0, svCanvasSize.value.width, svCanvasSize.value.height)

  const whiteGradient = context.createLinearGradient(0, 0, svCanvasSize.value.width, 0)
  whiteGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  whiteGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  context.fillStyle = whiteGradient
  context.fillRect(0, 0, svCanvasSize.value.width, svCanvasSize.value.height)

  const blackGradient = context.createLinearGradient(0, 0, 0, svCanvasSize.value.height)
  blackGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
  blackGradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
  context.fillStyle = blackGradient
  context.fillRect(0, 0, svCanvasSize.value.width, svCanvasSize.value.height)
}

function drawCanvases() {
  drawHueCanvas()
  drawSvCanvas()
}

function updateHueFromPointer(event: PointerEvent) {
  const canvas = hueCanvasRef.value
  if (canvas == null) {
    return
  }

  const rect = canvas.getBoundingClientRect()
  const x = clamp(event.clientX - rect.left, 0, rect.width)
  const nextHue = clampUnit(rect.width === 0 ? 0 : x / rect.width) * 360
  const { s, v } = currentHsv.value
  const { a } = currentColor.value
  const rgb = hsvToRgb(nextHue, s, v)

  displayHue.value = nextHue
  drawSvCanvas()
  emit('update:modelValue', formatHex({ ...rgb, a }))
}

function updateSvFromPointer(event: PointerEvent) {
  const canvas = svCanvasRef.value
  if (canvas == null) {
    return
  }

  const rect = canvas.getBoundingClientRect()
  const saturation = clampUnit(rect.width === 0 ? 0 : (event.clientX - rect.left) / rect.width)
  const value = clampUnit(rect.height === 0 ? 0 : 1 - (event.clientY - rect.top) / rect.height)
  const { a } = currentColor.value
  const rgb = hsvToRgb(displayHue.value, saturation, value)

  emit('update:modelValue', formatHex({ ...rgb, a }))
}

function startDrag(target: Exclude<DragTarget, null>, event: PointerEvent) {
  activePointerId = event.pointerId
  dragTarget = target
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)

  if (target === 'hue') {
    updateHueFromPointer(event)
    return
  }

  updateSvFromPointer(event)
}

function continueDrag(target: Exclude<DragTarget, null>, event: PointerEvent) {
  if (activePointerId !== event.pointerId || dragTarget !== target) {
    return
  }

  if (target === 'hue') {
    updateHueFromPointer(event)
    return
  }

  updateSvFromPointer(event)
}

function endDrag(target: Exclude<DragTarget, null>, event: PointerEvent) {
  if (activePointerId !== event.pointerId || dragTarget !== target) {
    return
  }

  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
  activePointerId = null
  dragTarget = null
}

onMounted(() => {
  drawCanvases()

  resizeObserver = new ResizeObserver(() => {
    drawCanvases()
  })

  if (hueCanvasRef.value != null) {
    resizeObserver.observe(hueCanvasRef.value)
  }

  if (svCanvasRef.value != null) {
    resizeObserver.observe(svCanvasRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="space-y-3">
    <div>
      <div class="mb-2 flex items-center justify-between gap-3">
        <span class="status-label">Saturation / value</span>
        <span class="text-xs text-[var(--ink-muted)]">
          {{ Math.round(currentHsv.s * 100) }}% · {{ Math.round(currentHsv.v * 100) }}%
        </span>
      </div>
      <div class="relative">
        <canvas
          ref="svCanvasRef"
          class="block h-[184px] w-full rounded-[20px] border border-[var(--panel-border)]"
          style="touch-action: none"
          @pointerdown="startDrag('sv', $event)"
          @pointermove="continueDrag('sv', $event)"
          @pointerup="endDrag('sv', $event)"
          @pointercancel="endDrag('sv', $event)"
        />
        <span class="color-picker-marker" :style="svMarkerStyle" />
      </div>
    </div>

    <div>
      <div class="mb-2 flex items-center justify-between gap-3">
        <span class="status-label">Hue</span>
        <span class="text-xs text-[var(--ink-muted)]">{{ Math.round(displayHue) }}°</span>
      </div>
      <div class="relative">
        <canvas
          ref="hueCanvasRef"
          class="block h-5 w-full rounded-full border border-[var(--panel-border)]"
          style="touch-action: none"
          @pointerdown="startDrag('hue', $event)"
          @pointermove="continueDrag('hue', $event)"
          @pointerup="endDrag('hue', $event)"
          @pointercancel="endDrag('hue', $event)"
        />
        <span class="color-picker-marker color-picker-marker-compact" :style="hueMarkerStyle" />
      </div>
    </div>
  </div>
</template>
