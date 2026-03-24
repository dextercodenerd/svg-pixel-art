<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import EditorShell from './components/editor/EditorShell.vue'
</script>

<template>
  <main
    class="flex h-[100svh] w-screen overflow-hidden bg-[var(--app-bg)] px-2 py-2 text-[var(--ink-strong)] sm:px-3 sm:py-3"
  >
    <div class="mx-auto w-full h-full max-w-[1920px]">
      <EditorShell />
    </div>
  </main>
</template>
