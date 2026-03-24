<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import HexInput from './HexInput.vue'
import HsvPicker from './HsvPicker.vue'
import RgbaSliders from './RgbaSliders.vue'

const props = defineProps<{
  description?: string
  modelValue: string
  title: string
}>()

const emit = defineEmits<{
  confirm: [color: string]
}>()

const hexInputRef = ref<InstanceType<typeof HexInput> | null>(null)
const open = ref(false)
const workingColor = ref(props.modelValue)
const previewStyle = computed(() => ({ backgroundColor: workingColor.value }))

watch(
  () => props.modelValue,
  value => {
    if (!open.value) {
      workingColor.value = value
    }
  },
)

function onOpenChange(nextOpen: boolean) {
  open.value = nextOpen
  workingColor.value = props.modelValue
}

function confirmColor() {
  emit('confirm', workingColor.value)
  open.value = false
}

function cancelColor() {
  workingColor.value = props.modelValue
  open.value = false
}

async function onOpenAutoFocus(event: Event) {
  event.preventDefault()
  await nextTick()
  hexInputRef.value?.focusInput()
}
</script>

<template>
  <PopoverRoot :open="open" @update:open="onOpenChange">
    <PopoverTrigger as-child>
      <slot />
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        side="left"
        align="start"
        :side-offset="14"
        :collision-padding="20"
        class="color-popover"
        @open-auto-focus="onOpenAutoFocus"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="status-label">{{ title }}</p>
            <p v-if="description" class="mt-2 text-sm text-[var(--ink-soft)]">
              {{ description }}
            </p>
          </div>
          <div
            class="checkerboard-surface color-preview-frame size-14 shrink-0 border-t-2 border-l-2 border-white border-r-black border-b-black"
          >
            <div class="color-preview-fill" :style="previewStyle" />
          </div>
        </div>

        <div class="mt-4 space-y-4">
          <HsvPicker v-model="workingColor" />
          <RgbaSliders v-model="workingColor" />
          <HexInput ref="hexInputRef" v-model="workingColor" />
        </div>

        <div class="mt-5 flex items-center justify-end gap-2">
          <button type="button" class="editor-button" @click="cancelColor()">Cancel</button>
          <button type="button" class="editor-button" @click="confirmColor()">Apply</button>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
