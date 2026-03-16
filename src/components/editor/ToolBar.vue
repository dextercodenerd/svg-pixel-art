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
              viewBox="0 0 16 16"
              class="tool-icon"
              style="shape-rendering: crispEdges"
              aria-hidden="true"
            >
              <path
                d="M10 2h4v4l-8 8H2v-4L10 2z m1 2h-1v1h1V4z M3 11h2v2H3v-2z"
                fill="currentColor"
              />
            </svg>
            <svg
              v-else-if="tool.id === 'eraser'"
              viewBox="0 0 16 16"
              class="tool-icon"
              style="shape-rendering: crispEdges"
              aria-hidden="true"
            >
              <path d="M10 2h4v4l-8 8H2v-4L10 2z" fill="currentColor" opacity="0.4" />
              <path d="M6 6h4v4l-4 4H2v-4L6 6z" fill="currentColor" />
            </svg>
            <svg
              v-else-if="tool.id === 'line'"
              viewBox="0 0 16 16"
              class="tool-icon"
              style="shape-rendering: crispEdges"
              aria-hidden="true"
            >
              <path d="M2 13h3L13 5V2h-3L2 10v3z" fill="currentColor" />
              <rect x="2" y="11" width="3" height="3" fill="currentColor" />
              <rect x="11" y="2" width="3" height="3" fill="currentColor" />
            </svg>
            <svg
              v-else-if="tool.id === 'fill'"
              viewBox="0 0 16 16"
              class="tool-icon"
              style="shape-rendering: crispEdges"
              aria-hidden="true"
            >
              <path d="M6 3h4v2h2v2h2v6H2v-6h2V5h2V3z" fill="currentColor" />
              <path d="M4 9h8v4H4V9z" fill="currentColor" opacity="0.6" />
              <rect x="2" y="10" width="2" height="2" fill="currentColor" />
            </svg>
            <svg
              v-else
              viewBox="0 0 16 16"
              class="tool-icon"
              style="shape-rendering: crispEdges"
              aria-hidden="true"
            >
              <path
                d="M10 2h4v4l-5 5v3H6v-3l5-5z m1 2h-1v1h1V4z M7 10h2v2H7v-2z M3 13h2v2H3v-2z"
                fill="currentColor"
              />
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
