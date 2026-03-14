<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import PixelCanvas from './PixelCanvas.vue'
import { useCanvasPointer } from '../../composables/useCanvasPointer'
import { usePan } from '../../composables/usePan'
import { useTouchViewport } from '../../composables/useTouchViewport'
import { useZoom } from '../../composables/useZoom'
import { useEditorStore } from '../../stores/editor'
import { isEditableTarget } from '../../utils/dom'
import type { PanOffset } from '../../types'

const emit = defineEmits<{
  cursorChange: [payload: { col: number | null; row: number | null }]
}>()

const editorStore = useEditorStore()
const { activeTool, document, gridVisible, panOffset } = storeToRefs(editorStore)
const { getZoomInLevel, getZoomOutLevel, renderScale, zoom, zoomToLevel } = useZoom()

const viewportRef = ref<HTMLElement | null>(null)
const spacePressed = ref(false)

function getCanvasSize(scaleMultiplier = 1) {
  return {
    width: document.value.width * renderScale.value * scaleMultiplier,
    height: document.value.height * renderScale.value * scaleMultiplier,
  }
}

const {
  clampCurrentPan,
  clampPan,
  isPanning,
  resetForDocumentBounds,
  startPan,
  stopPan,
  updatePan,
} = usePan({
  viewportRef,
  getCanvasSize,
})

const touchViewport = useTouchViewport({
  clampPan,
  viewportRef,
  zoomToLevel,
  renderScale,
})

const displayPan = computed<PanOffset>(() => touchViewport.previewPan.value ?? panOffset.value)
const displayScale = computed(() => touchViewport.previewScale.value)
const canvasPointer = useCanvasPointer({
  displayPan,
  displayScale,
  isPanning,
  isTouchGestureActive: touchViewport.isGestureActive,
  renderScale,
  spacePressed,
  viewportRef,
})

const outerTransform = computed(() => ({
  transform: `translate(${displayPan.value.x}px, ${displayPan.value.y}px)`,
}))

const innerTransform = computed(() => ({
  transform: `scale(${displayScale.value})`,
}))

const pointerStyle = computed(() => {
  if (canvasPointer.pointerPosition.value == null) {
    return undefined
  }

  return {
    left: `${canvasPointer.pointerPosition.value.x}px`,
    top: `${canvasPointer.pointerPosition.value.y}px`,
  }
})

const showToolPointer = computed(() => {
  return (
    canvasPointer.pointerPosition.value != null &&
    canvasPointer.pointerInsideDocument.value &&
    !isPanning.value &&
    canvasPointer.hoverPointerType.value !== 'touch'
  )
})

const viewportCursorMode = computed(() => {
  if (isPanning.value) {
    return 'pan'
  }

  return canvasPointer.pointerInsideDocument.value &&
    canvasPointer.hoverPointerType.value !== 'touch'
    ? 'custom'
    : 'system'
})

function zoomAtPointer(nextZoom: number, clientX: number, clientY: number) {
  if (nextZoom === zoom.value || viewportRef.value == null) {
    return
  }

  const viewportRect = viewportRef.value.getBoundingClientRect()
  const cursorX = clientX - viewportRect.left
  const cursorY = clientY - viewportRect.top
  const oldRenderScale = renderScale.value
  const oldCol = (cursorX - panOffset.value.x) / oldRenderScale
  const oldRow = (cursorY - panOffset.value.y) / oldRenderScale

  zoomToLevel(nextZoom)

  editorStore.setPan(
    clampPan({
      x: cursorX - oldCol * renderScale.value,
      y: cursorY - oldRow * renderScale.value,
    }),
  )
  canvasPointer.updateHoverState(clientX, clientY, 'mouse')
}

function onViewportMouseDown(event: MouseEvent) {
  if (event.button === 1 || (event.button === 0 && spacePressed.value)) {
    startPan(event.clientX, event.clientY)
    canvasPointer.cancelActiveInteraction()
    canvasPointer.clearHoverState()
    event.preventDefault()
  }
}

function onViewportMouseMove(event: MouseEvent) {
  canvasPointer.updateHoverState(event.clientX, event.clientY, 'mouse')
}

function onViewportMouseLeave() {
  if (!isPanning.value) {
    canvasPointer.clearHoverState()
  }
}

function onViewportWheel(event: WheelEvent) {
  event.preventDefault()

  const nextZoom = event.deltaY < 0 ? getZoomInLevel() : getZoomOutLevel()
  zoomAtPointer(nextZoom, event.clientX, event.clientY)
}

function onViewportTouchStart(event: TouchEvent) {
  if (touchViewport.handleTouchStart(event)) {
    canvasPointer.cancelActiveInteraction()
    canvasPointer.clearHoverState()
    event.preventDefault()
  }
}

function onViewportTouchMove(event: TouchEvent) {
  if (touchViewport.handleTouchMove(event)) {
    event.preventDefault()
  }
}

function onViewportTouchEnd(event: TouchEvent) {
  if (touchViewport.handleTouchEnd(event)) {
    event.preventDefault()
  }
}

function onWindowMouseMove(event: MouseEvent) {
  if (!isPanning.value) {
    return
  }

  updatePan(event.clientX, event.clientY)
}

function onWindowMouseUp(event: MouseEvent) {
  if (!isPanning.value) {
    return
  }

  stopPan()
  canvasPointer.updateHoverState(event.clientX, event.clientY, 'mouse')
}

function onWindowKeyDown(event: KeyboardEvent) {
  if (event.code === 'Space' && !isEditableTarget(event.target)) {
    spacePressed.value = true
    event.preventDefault()
  }
}

function onWindowKeyUp(event: KeyboardEvent) {
  if (event.code === 'Space') {
    spacePressed.value = false
  }
}

function onWindowBlur() {
  spacePressed.value = false
  stopPan()
  canvasPointer.cancelActiveInteraction()
  canvasPointer.clearHoverState()
  touchViewport.cancelGesture()
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  window.addEventListener('mousemove', onWindowMouseMove)
  window.addEventListener('mouseup', onWindowMouseUp)
  window.addEventListener('keydown', onWindowKeyDown)
  window.addEventListener('keyup', onWindowKeyUp)
  window.addEventListener('blur', onWindowBlur)

  if (viewportRef.value != null) {
    resizeObserver = new ResizeObserver(() => {
      clampCurrentPan()
    })
    resizeObserver.observe(viewportRef.value)

    // Touch and wheel listeners must be non-passive so we can call preventDefault().
    // Vue's template event bindings may register them as passive in some browsers,
    // so we add them manually here to guarantee the flag.
    viewportRef.value.addEventListener('touchstart', onViewportTouchStart, { passive: false })
    viewportRef.value.addEventListener('touchmove', onViewportTouchMove, { passive: false })
    viewportRef.value.addEventListener('touchend', onViewportTouchEnd, { passive: false })
    viewportRef.value.addEventListener('touchcancel', onViewportTouchEnd, { passive: false })
    viewportRef.value.addEventListener('wheel', onViewportWheel, { passive: false })
  }

  resetForDocumentBounds()
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)
  window.removeEventListener('keydown', onWindowKeyDown)
  window.removeEventListener('keyup', onWindowKeyUp)
  window.removeEventListener('blur', onWindowBlur)

  if (viewportRef.value != null) {
    viewportRef.value.removeEventListener('touchstart', onViewportTouchStart)
    viewportRef.value.removeEventListener('touchmove', onViewportTouchMove)
    viewportRef.value.removeEventListener('touchend', onViewportTouchEnd)
    viewportRef.value.removeEventListener('touchcancel', onViewportTouchEnd)
    viewportRef.value.removeEventListener('wheel', onViewportWheel)
  }

  resizeObserver?.disconnect()
})

watch(
  () => [document.value.width, document.value.height] as const,
  () => {
    resetForDocumentBounds()
    canvasPointer.cancelActiveInteraction()
    canvasPointer.clearHoverState()
  },
)

watch(
  () => zoom.value,
  () => {
    clampCurrentPan()
  },
)

watch(
  () => canvasPointer.hoverCell.value,
  point => {
    emit('cursorChange', {
      col: point?.col ?? null,
      row: point?.row ?? null,
    })
  },
  { immediate: true },
)
</script>

<template>
  <div
    ref="viewportRef"
    class="canvas-viewport relative min-h-[320px] flex-1 overflow-hidden rounded-[28px] border border-[var(--panel-border)] bg-[rgba(120,88,56,0.08)]"
    :data-cursor-mode="viewportCursorMode"
    @auxclick.prevent
    @contextmenu.prevent
    @mousedown="onViewportMouseDown"
    @mousemove="onViewportMouseMove"
    @mouseleave="onViewportMouseLeave"
  >
    <div
      v-if="showToolPointer"
      class="canvas-tool-pointer"
      :data-tool="activeTool"
      :style="pointerStyle"
    />
    <div class="absolute left-0 top-0 will-change-transform" :style="outerTransform">
      <div class="origin-top-left will-change-transform" :style="innerTransform">
        <PixelCanvas
          :cursor="canvasPointer.cursor.value"
          :document="document"
          :grid-visible="gridVisible"
          :preview-mode="canvasPointer.previewMode.value"
          :preview-pixels="canvasPointer.previewPixels.value"
          :zoom="zoom"
          @contextmenu="canvasPointer.onContextMenu"
          @pointercancel="canvasPointer.onPointerCancel"
          @pointerdown="canvasPointer.onPointerDown"
          @pointermove="canvasPointer.onPointerMove"
          @pointerup="canvasPointer.onPointerUp"
        />
      </div>
    </div>
  </div>
</template>
