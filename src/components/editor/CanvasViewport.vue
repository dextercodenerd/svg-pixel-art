<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useEventListener, useResizeObserver } from '@vueuse/core'
import PixelCanvas from './PixelCanvas.vue'
import PixelScrollbar from './PixelScrollbar.vue'
import { useCanvasPointer } from '../../composables/useCanvasPointer'
import { usePan } from '../../composables/usePan'
import { useTouchViewport } from '../../composables/useTouchViewport'
import { useZoom } from '../../composables/useZoom'
import { useEditorStore } from '../../stores/editor'
import { shouldHandleViewportPanKeydown } from '../../utils/dom'
import type { PanOffset } from '../../types'
import { SCROLLBAR_SIZE, VIEWPORT_GUTTER } from '../../types'

const hScrollVisible = computed(
  () => canvasSize.value.width + VIEWPORT_GUTTER * 2 > viewportSize.value.width,
)
const vScrollVisible = computed(
  () => canvasSize.value.height + VIEWPORT_GUTTER * 2 > viewportSize.value.height,
)

const marginEndX = computed(() => VIEWPORT_GUTTER + (vScrollVisible.value ? SCROLLBAR_SIZE : 0))
const marginEndY = computed(() => VIEWPORT_GUTTER + (hScrollVisible.value ? SCROLLBAR_SIZE : 0))

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
  setPanClamped,
} = usePan({
  viewportRef,
  getCanvasSize,
})

const viewportSize = ref({ width: 0, height: 0 })
const canvasSize = computed(() => getCanvasSize())

useResizeObserver(viewportRef, entries => {
  const entry = entries[0]
  if (entry) {
    viewportSize.value = {
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    }
  }
  clampCurrentPan(1, 'strict')
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
    clampPan(
      {
        x: cursorX - oldCol * renderScale.value,
        y: cursorY - oldRow * renderScale.value,
      },
      1,
      'strict',
    ),
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

  updatePan(event.clientX, event.clientY, 1, 'strict')
}

function onWindowMouseUp(event: MouseEvent) {
  if (!isPanning.value) {
    return
  }

  stopPan()
  canvasPointer.updateHoverState(event.clientX, event.clientY, 'mouse')
}

function onWindowKeyDown(event: KeyboardEvent) {
  if (shouldHandleViewportPanKeydown(event)) {
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

function onScrollbarXUpdate(newX: number) {
  setPanClamped({ ...panOffset.value, x: newX }, 1, 'strict')
}

function onScrollbarYUpdate(newY: number) {
  setPanClamped({ ...panOffset.value, y: newY }, 1, 'strict')
}

useEventListener(window, 'mousemove', onWindowMouseMove)
useEventListener(window, 'mouseup', onWindowMouseUp)
useEventListener(window, 'keydown', onWindowKeyDown)
useEventListener(window, 'keyup', onWindowKeyUp)
useEventListener(window, 'blur', onWindowBlur)

// Touch and wheel listeners must be non-passive so we can call preventDefault().
useEventListener(viewportRef, 'touchstart', onViewportTouchStart, { passive: false })
useEventListener(viewportRef, 'touchmove', onViewportTouchMove, { passive: false })
useEventListener(viewportRef, 'touchend', onViewportTouchEnd, { passive: false })
useEventListener(viewportRef, 'touchcancel', onViewportTouchEnd, { passive: false })
useEventListener(viewportRef, 'wheel', onViewportWheel, { passive: false })

onMounted(() => {
  resetForDocumentBounds()
})

watch([() => document.value.width, () => document.value.height], () => {
  resetForDocumentBounds()
  canvasPointer.cancelActiveInteraction()
  canvasPointer.clearHoverState()
  clampCurrentPan(1, 'strict')
})

watch(
  () => zoom.value,
  () => {
    clampCurrentPan(1, 'strict')
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
    class="canvas-viewport relative min-h-[320px] flex-1 overflow-hidden border-t-2 border-l-2 border-r-2 border-b-2 border-white border-r-[var(--panel-border-strong)] border-b-[var(--panel-border-strong)] bg-[rgba(120,88,56,0.08)]"
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
          :preview-noop-mask="canvasPointer.previewNoopMask.value"
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

    <!-- Custom Scrollbars -->
    <PixelScrollbar
      orientation="horizontal"
      :viewport-size="viewportSize.width"
      :content-size="canvasSize.width"
      :offset="panOffset.x"
      :margin="VIEWPORT_GUTTER"
      :margin-end="marginEndX"
      :stop-at-corner="vScrollVisible"
      @update:offset="onScrollbarXUpdate"
    />
    <PixelScrollbar
      orientation="vertical"
      :viewport-size="viewportSize.height"
      :content-size="canvasSize.height"
      :offset="panOffset.y"
      :margin="VIEWPORT_GUTTER"
      :margin-end="marginEndY"
      :stop-at-corner="hScrollVisible"
      @update:offset="onScrollbarYUpdate"
    />

    <!-- Corner box where scrollbars meet -->
    <div
      v-if="hScrollVisible && vScrollVisible"
      class="absolute right-0 bottom-0 z-20 border-l border-t border-[var(--panel-border)] bg-[var(--panel-inner)]"
      :style="{ width: `${SCROLLBAR_SIZE}px`, height: `${SCROLLBAR_SIZE}px` }"
    />
  </div>
</template>
