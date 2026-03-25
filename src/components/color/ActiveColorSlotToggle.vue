<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useColorStore } from '../../stores/color'
import type { ActiveColorSlot } from '../../types'

defineProps<{
  compact?: boolean
}>()

const colorStore = useColorStore()
const { activeSlot } = storeToRefs(colorStore)

const slots: Array<{ id: ActiveColorSlot; label: string; detail: string }> = [
  { id: 'fg', label: 'FG', detail: 'Touch paints with foreground.' },
  { id: 'bg', label: 'BG', detail: 'Touch paints with background.' },
]
</script>

<template>
  <section :class="['status-card', compact && '!p-1 !gap-1']">
    <template v-if="!compact">
      <span class="status-label">Touch slot</span>
      <strong class="status-value">{{ activeSlot.toUpperCase() }} active</strong>
    </template>

    <div
      :class="['segmented-control', compact && 'segmented-control-vertical']"
      role="group"
      aria-label="Active touch color slot"
    >
      <button
        v-for="slot in slots"
        :key="slot.id"
        type="button"
        :class="['segmented-control-item', compact && '!min-h-0 py-1.5 text-[10px]']"
        :data-active="slot.id === activeSlot"
        :aria-pressed="slot.id === activeSlot"
        @click="colorStore.setActiveSlot(slot.id)"
      >
        {{ slot.label }}
      </button>
    </div>

    <span v-if="!compact" class="status-detail">
      {{ slots.find(slot => slot.id === activeSlot)?.detail }}
    </span>
  </section>
</template>
