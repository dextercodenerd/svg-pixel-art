<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { onMounted } from 'vue'
import EditorShell from './components/editor/EditorShell.vue'
import { useEditorStore } from './stores/editor'
import { EMPTY_PIXEL } from './types'

const editorStore = useEditorStore()

onMounted(() => {
  // Bootstrap a 32x32 transparent workspace on first launch.
  // The `isInitialState` flag is set by the store on construction and cleared
  // on any user-triggered document change -- avoids fragile pixel comparisons.
  if (editorStore.isInitialState) {
    editorStore.newDocument({
      width: 32,
      height: 32,
      fill: EMPTY_PIXEL,
    })
  }
})
</script>

<template>
  <main
    class="flex min-h-[100svh] bg-[var(--app-bg)] px-4 py-4 text-[var(--ink-strong)] sm:px-5 sm:py-5"
  >
    <EditorShell class="mx-auto w-full max-w-[1600px]" />
  </main>
</template>
