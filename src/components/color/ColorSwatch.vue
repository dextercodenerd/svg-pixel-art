<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useColorStore } from '../../stores/color'

const props = defineProps<{
  color: string
  label: string
}>()

const colorStore = useColorStore()
const fillStyle = computed(() => ({ backgroundColor: props.color }))

function onClick() {
  colorStore.setFg(props.color)
}

function onContextMenu() {
  colorStore.setBg(props.color)
}
</script>

<template>
  <button
    type="button"
    class="color-swatch-button checkerboard-surface"
    :aria-label="`${label}. Left click sets foreground. Right click sets background.`"
    @click="onClick"
    @contextmenu.prevent="onContextMenu"
  >
    <span class="color-swatch-fill" :style="fillStyle" />
  </button>
</template>
