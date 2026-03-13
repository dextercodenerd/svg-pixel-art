<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useEditorStore } from '../../stores/editor'
import { BASE_PIXEL_SIZE } from '../../types'

const props = defineProps<{
  cursorCol: number | null
  cursorRow: number | null
}>()

const editorStore = useEditorStore()
const { activeTool, document, zoom } = storeToRefs(editorStore)

const cursorLabel = computed(() => {
  if (props.cursorCol == null || props.cursorRow == null) {
    return 'Cursor --, --'
  }

  return `Cursor ${props.cursorCol}, ${props.cursorRow}`
})

const documentLabel = computed(() => `${document.value.width} x ${document.value.height}`)
const effectivePixelSize = computed(() => `${BASE_PIXEL_SIZE * zoom.value}px`)
</script>

<template>
  <footer
    class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--panel-border)] bg-[rgba(255,255,255,0.45)] px-4 py-3 text-sm text-[var(--ink-soft)]"
  >
    <span>{{ cursorLabel }}</span>
    <span>Document {{ documentLabel }}</span>
    <span>Zoom {{ zoom }}x</span>
    <span>Pixel {{ effectivePixelSize }}</span>
    <span class="capitalize">Tool {{ activeTool }}</span>
  </footer>
</template>
