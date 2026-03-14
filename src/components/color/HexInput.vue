<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { normalizeHexInput } from '../../services/colorUtils'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [color: string]
}>()

const inputValue = ref(props.modelValue)
const isInvalid = ref(false)

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
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-3">
      <label class="status-label" for="hex-color-input">Hex</label>
      <span class="text-xs text-[var(--ink-muted)]">Accepts `#RRGGBB` or `#RRGGBBAA`</span>
    </div>
    <input
      id="hex-color-input"
      v-model="inputValue"
      type="text"
      spellcheck="false"
      class="color-input"
      :data-invalid="isInvalid"
      aria-describedby="hex-color-hint"
      @blur="commitValue"
      @keydown.enter.prevent="commitValue"
      @keydown.esc.prevent="resetValue"
    />
    <p id="hex-color-hint" class="text-xs text-[var(--ink-soft)]">
      {{
        isInvalid
          ? 'Enter 6 or 8 hex digits. Invalid input stays local until corrected.'
          : '6-digit values expand to full opacity automatically.'
      }}
    </p>
  </div>
</template>
