<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'
import { useEditorStore } from '../../stores/editor'
import type { ToolId } from '../../types'

interface ToolOption {
  id: ToolId
  label: string
  shortcut: string
}

const editorStore = useEditorStore()
const { activeTool } = storeToRefs(editorStore)

const tools: ToolOption[] = [
  { id: 'pencil', label: 'Pencil', shortcut: 'P' },
  { id: 'eraser', label: 'Eraser', shortcut: 'E' },
  { id: 'line', label: 'Line', shortcut: 'L' },
  { id: 'fill', label: 'Fill', shortcut: 'F' },
  { id: 'eyedropper', label: 'Eyedropper', shortcut: 'I' },
]
</script>

<template>
  <TooltipProvider :delay-duration="120">
    <div class="tool-strip" role="toolbar" aria-label="Drawing tools">
      <TooltipRoot v-for="tool in tools" :key="tool.id">
        <TooltipTrigger as-child>
          <button
            type="button"
            class="tool-icon-button"
            :data-active="tool.id === activeTool"
            :aria-label="tool.label"
            @click="editorStore.setTool(tool.id)"
          >
            <svg
              v-if="tool.id === 'pencil'"
              viewBox="0 0 24 24"
              class="tool-icon"
              aria-hidden="true"
            >
              <path
                d="M5 16.4 15.2 6.2l2.6 2.6L7.6 19H5zm11-11 1.3-1.3a1.5 1.5 0 0 1 2.1 0l.5.5a1.5 1.5 0 0 1 0 2.1L18.6 8z"
                fill="currentColor"
              />
            </svg>
            <svg
              v-else-if="tool.id === 'eraser'"
              viewBox="0 0 24 24"
              class="tool-icon"
              aria-hidden="true"
            >
              <path
                d="m7.4 15.8 6.8-6.8 4.4 4.4-2.4 2.4H9.8zm7.7-7.7 1.8-1.8a1.9 1.9 0 0 1 2.6 0l1.2 1.2a1.9 1.9 0 0 1 0 2.6l-1.8 1.8z"
                fill="currentColor"
              />
              <path
                d="M4.5 18.5h10.2"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="1.8"
              />
            </svg>
            <svg
              v-else-if="tool.id === 'line'"
              viewBox="0 0 24 24"
              class="tool-icon"
              aria-hidden="true"
            >
              <path
                d="M5.5 17.5 17.5 5.5"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-width="2.2"
              />
              <circle cx="5.5" cy="17.5" r="2.2" fill="currentColor" />
              <circle cx="17.5" cy="5.5" r="2.2" fill="currentColor" />
            </svg>
            <svg
              v-else-if="tool.id === 'fill'"
              viewBox="0 0 24 24"
              class="tool-icon"
              aria-hidden="true"
            >
              <path
                d="m8 7.2 6.3 6.3-3.6 3.6a2.3 2.3 0 0 1-3.2 0l-2.8-2.8a2.3 2.3 0 0 1 0-3.2z"
                fill="currentColor"
              />
              <path
                d="M15.8 14.7c1.4 0 2.7 1.1 2.7 2.5 0 1.5-1.2 2.8-2.7 2.8s-2.7-1.3-2.7-2.8c0-1.4 1.3-2.5 2.7-2.5Z"
                fill="currentColor"
                opacity=".72"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" class="tool-icon" aria-hidden="true">
              <path
                d="m8.2 5.4 4.2 4.2-1.3 1.3 2.1 2.1a2 2 0 0 1 0 2.9l-.4.4-4.9-4.9.4-.4a2 2 0 0 1 2.9 0l.1.1 1.3-1.3-4.2-4.2z"
                fill="currentColor"
              />
              <circle cx="15.8" cy="17.1" r="2.4" fill="currentColor" opacity=".72" />
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="top" :side-offset="10" class="editor-tooltip">
            {{ tool.label }} · {{ tool.shortcut }}
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </div>
  </TooltipProvider>
</template>
