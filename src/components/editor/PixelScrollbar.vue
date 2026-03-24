<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import { SCROLLBAR_SIZE } from '../../types'

const props = withDefaults(
  defineProps<{
    orientation: 'horizontal' | 'vertical'
    viewportSize: number
    contentSize: number
    offset: number
    margin?: number
    marginEnd?: number
    stopAtCorner?: boolean
  }>(),
  {
    margin: 0,
    marginEnd: 0,
    stopAtCorner: false,
  },
)

const emit = defineEmits<{
  'update:offset': [value: number]
}>()

const isDragging = ref(false)
const dragStartMousePos = ref(0)
const dragStartOffset = ref(0)
let dragScrollableRange = 0
let dragMaxThumbPos = 0
let dragMargin = 0

const trackLength = computed(() => props.viewportSize - (props.stopAtCorner ? SCROLLBAR_SIZE : 0))

// The thumb size represents the portion of the content visible in the viewport.
const thumbSize = computed(() => {
  const totalMargin = props.margin + props.marginEnd
  if (props.contentSize <= props.viewportSize - totalMargin) {
    return 0
  }
  // Proportional to full viewport, but capped to track
  const size = (props.viewportSize / (props.contentSize + totalMargin)) * trackLength.value
  return Math.max(24, Math.round(size))
})

const thumbPosition = computed(() => {
  const totalMargin = props.margin + props.marginEnd
  const scrollableRange = props.contentSize - props.viewportSize + totalMargin
  if (scrollableRange <= 0 || thumbSize.value === 0) {
    return 0
  }
  const maxThumbPos = trackLength.value - thumbSize.value
  // offset goes from props.margin down to -(props.contentSize - props.viewportSize + props.marginEnd)
  const ratio = (props.margin - props.offset) / scrollableRange
  return Math.round(ratio * maxThumbPos)
})

function onMouseDown(event: MouseEvent) {
  if (thumbSize.value === 0) {
    return
  }

  isDragging.value = true
  dragStartMousePos.value = props.orientation === 'horizontal' ? event.clientX : event.clientY
  dragStartOffset.value = props.offset

  const totalMargin = props.margin + props.marginEnd
  dragScrollableRange = props.contentSize - props.viewportSize + totalMargin
  dragMaxThumbPos = trackLength.value - thumbSize.value
  dragMargin = props.margin

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  event.preventDefault()
}

function onMouseMove(event: MouseEvent) {
  if (!isDragging.value) {
    return
  }

  const currentMousePos = props.orientation === 'horizontal' ? event.clientX : event.clientY
  const deltaPx = currentMousePos - dragStartMousePos.value

  const deltaOffset = -(deltaPx / dragMaxThumbPos) * dragScrollableRange
  const minOffset = dragMargin - dragScrollableRange
  const nextOffset = Math.max(minOffset, Math.min(dragMargin, dragStartOffset.value + deltaOffset))

  emit('update:offset', nextOffset)
}

function onMouseUp() {
  isDragging.value = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

function onTrackClick(event: MouseEvent) {
  // If clicking outside the thumb, snap the thumb to the center of the click.
  // This is a common scrollbar behavior.
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const clickPos =
    props.orientation === 'horizontal' ? event.clientX - rect.left : event.clientY - rect.top

  const totalMargin = props.margin + props.marginEnd
  const scrollableRange = props.contentSize - props.viewportSize + totalMargin
  const maxThumbPos = trackLength.value - thumbSize.value

  const targetThumbPos = clickPos - thumbSize.value / 2
  const ratio = Math.max(0, Math.min(1, targetThumbPos / maxThumbPos))

  emit('update:offset', props.margin - ratio * scrollableRange)
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <div
    v-if="contentSize > viewportSize - margin - marginEnd"
    class="pixel-scrollbar"
    :class="[orientation]"
    :style="{
      width: orientation === 'horizontal' ? `${trackLength}px` : `${SCROLLBAR_SIZE}px`,
      height: orientation === 'vertical' ? `${trackLength}px` : `${SCROLLBAR_SIZE}px`,
    }"
    @mousedown="onTrackClick"
  >
    <div
      class="pixel-scrollbar-thumb"
      :class="{ dragging: isDragging }"
      :style="{
        width: orientation === 'horizontal' ? `${thumbSize}px` : undefined,
        height: orientation === 'vertical' ? `${thumbSize}px` : undefined,
        transform:
          orientation === 'horizontal'
            ? `translateX(${thumbPosition}px)`
            : `translateY(${thumbPosition}px)`,
      }"
      @mousedown.stop="onMouseDown"
    />
  </div>
</template>

<style scoped>
.pixel-scrollbar {
  position: absolute;
  z-index: 10;
  background: var(--panel-inner);
  border: 1px solid var(--panel-border);
  box-sizing: border-box;
}

.pixel-scrollbar.horizontal {
  bottom: 0;
  left: 0;
  border-left: 0;
  border-bottom: 0;
}

.pixel-scrollbar.vertical {
  top: 0;
  right: 0;
  border-top: 0;
  border-right: 0;
}

/* When both are present, we need to leave a corner */
.pixel-scrollbar.horizontal:last-child {
  right: 0;
}

.pixel-scrollbar-thumb {
  position: absolute;
  background: var(--panel);
  border: 1px solid var(--panel-border);
  box-sizing: border-box;
  cursor: pointer;
}

.pixel-scrollbar-thumb:hover,
.pixel-scrollbar-thumb.dragging {
  background: var(--app-bg-accent);
}

.pixel-scrollbar.horizontal .pixel-scrollbar-thumb {
  height: 100%;
  top: 0;
}

.pixel-scrollbar.vertical .pixel-scrollbar-thumb {
  width: 100%;
  left: 0;
}
</style>
