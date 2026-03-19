<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { getContrastingTextHex, normalizeHexInput, parseHex } from '../../services/colorUtils'

const props = defineProps<{
  modelValue: string
  color?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [color: string]
}>()

const hintId = `hex-color-hint-${useId()}`
const inputId = `hex-color-input-${useId()}`
const inputRef = ref<HTMLInputElement | null>(null)
const inputValue = ref(props.modelValue)
const isInvalid = ref(false)

const inputStyle = computed(() => {
  if (isInvalid.value) {
    return undefined
  }

  const color = props.color ?? props.modelValue
  try {
    const { r, g, b, a } = parseHex(color)
    const textHex = getContrastingTextHex(color)
    const { r: tr, g: tg, b: tb } = parseHex(textHex)
    return {
      backgroundColor: `rgba(${r}, ${g}, ${b}, ${a / 255})`,
      color: `rgb(${tr}, ${tg}, ${tb})`,
    }
  } catch {
    return undefined
  }
})

watch(
  () => props.modelValue,
  value => {
    inputValue.value = value
    isInvalid.value = false
  },
)

function commitValue() {
  const normalized = normalizeHexInput(inputValue.value)
  if (normalized == null) {
    isInvalid.value = true
    return
  }

  isInvalid.value = false
  inputValue.value = normalized

  if (normalized !== props.modelValue) {
    emit('update:modelValue', normalized)
  }
}

function resetValue() {
  inputValue.value = props.modelValue
  isInvalid.value = false
}

function focusInput() {
  inputRef.value?.focus({ preventScroll: true })
  inputRef.value?.select()
}

defineExpose({
  focusInput,
})
</script>

<template>
  <div class="space-y-2">
    <div class="color-preview-frame checkerboard-surface">
      <input
        :id="inputId"
        ref="inputRef"
        v-model="inputValue"
        type="text"
        spellcheck="false"
        class="color-input"
        :data-invalid="isInvalid"
        :style="inputStyle"
        :aria-describedby="hintId"
        @blur="commitValue"
        @keydown.enter.prevent="commitValue"
        @keydown.esc.prevent="resetValue"
      />
    </div>
    <p v-if="isInvalid" :id="hintId" class="text-xs text-[var(--ink-soft)]">
      Enter 6 or 8 hex digits. Invalid input stays local until corrected.
    </p>
  </div>
</template>
