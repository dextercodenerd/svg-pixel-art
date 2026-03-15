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
    class="flex min-h-[100svh] bg-[var(--app-bg)] px-4 py-4 text-[var(--ink-strong)] sm:px-5 sm:py-5"
  >
    <EditorShell class="mx-auto w-full max-w-[1600px]" />
  </main>
</template>
