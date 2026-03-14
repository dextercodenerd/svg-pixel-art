<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import { formatHex, parseHex } from '../../services/colorUtils'
import { clampByte } from '../../utils/math'

type ChannelId = 'r' | 'g' | 'b' | 'a'

interface ChannelConfig {
  id: ChannelId
  label: string
}

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [color: string]
}>()

const channels = computed(() => parseHex(props.modelValue))

const sliderChannels: ChannelConfig[] = [
  { id: 'r', label: 'R' },
  { id: 'g', label: 'G' },
  { id: 'b', label: 'B' },
  { id: 'a', label: 'A' },
]

function channelStyle(channelId: ChannelId) {
  const { a, b, g, r } = channels.value
  const alpha = Number((a / 255).toFixed(3))

  if (channelId === 'r') {
    return {
      background: `linear-gradient(90deg, rgba(0, ${g}, ${b}, ${alpha}), rgba(255, ${g}, ${b}, ${alpha}))`,
    }
  }

  if (channelId === 'g') {
    return {
      background: `linear-gradient(90deg, rgba(${r}, 0, ${b}, ${alpha}), rgba(${r}, 255, ${b}, ${alpha}))`,
    }
  }

  if (channelId === 'b') {
    return {
      background: `linear-gradient(90deg, rgba(${r}, ${g}, 0, ${alpha}), rgba(${r}, ${g}, 255, ${alpha}))`,
    }
  }

  return {
    backgroundColor: '#e6e1d7',
    backgroundImage: `linear-gradient(90deg, rgba(${r}, ${g}, ${b}, 0), rgba(${r}, ${g}, ${b}, 1)), linear-gradient(45deg, rgba(137, 119, 101, 0.22) 25%, transparent 25%), linear-gradient(-45deg, rgba(137, 119, 101, 0.22) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(137, 119, 101, 0.22) 75%), linear-gradient(-45deg, transparent 75%, rgba(137, 119, 101, 0.22) 75%)`,
    backgroundPosition: '0 0, 0 0, 0 7px, 7px -7px, -7px 0',
    backgroundSize: '100% 100%, 14px 14px, 14px 14px, 14px 14px, 14px 14px',
  }
}

function updateChannel(channelId: ChannelId, values: number[] | undefined) {
  const nextValue = clampByte(values?.[0] ?? channels.value[channelId])
  emit(
    'update:modelValue',
    formatHex({
      ...channels.value,
      [channelId]: nextValue,
    }),
  )
}
</script>

<template>
  <div class="space-y-3">
    <div v-for="channel in sliderChannels" :key="channel.id" class="grid gap-2">
      <div class="flex items-center justify-between gap-3">
        <span class="status-label">{{ channel.label }}</span>
        <span class="text-sm text-[var(--ink-soft)]">{{ channels[channel.id] }}</span>
      </div>

      <SliderRoot
        class="channel-slider-root"
        :model-value="[channels[channel.id]]"
        :max="255"
        :step="1"
        :aria-label="`${channel.label} channel`"
        @update:model-value="updateChannel(channel.id, $event)"
      >
        <SliderTrack class="channel-slider-track" :style="channelStyle(channel.id)">
          <SliderRange class="channel-slider-range" />
        </SliderTrack>
        <SliderThumb class="channel-slider-thumb" />
      </SliderRoot>
    </div>
  </div>
</template>
