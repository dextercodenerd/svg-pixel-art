<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  ToggleGroupItem,
  ToggleGroupRoot,
} from 'reka-ui'
import ColorPicker from '../color/ColorPicker.vue'
import { createNewDocumentController } from '../../composables/useNewDocumentDialog'
import { requestConfirmation } from '../../services/confirmationService'
import { useEditorStore } from '../../stores/editor'
import type { NewDocumentPreset } from '../../composables/useNewDocumentDialog'

const props = defineProps<{
  initialFillColor: string
  open: boolean
}>()

const emit = defineEmits<{
  created: []
  'update:open': [open: boolean]
}>()

const editorStore = useEditorStore()
// The replacement confirmation temporarily closes this dialog; skip the usual reset for that close.
const shouldSkipResetOnNextClose = ref(false)
// If the user cancels replacement, reopen the dialog with their in-progress values intact.
const shouldPreserveStateOnNextOpen = ref(false)
const controller = createNewDocumentController({
  async confirmReplacement(payload) {
    shouldSkipResetOnNextClose.value = true
    emit('update:open', false)

    const confirmed = await requestConfirmation({
      title: 'Replace current document?',
      message: `Create a new ${payload.width} x ${payload.height} document? The current draft will be replaced.`,
      confirmLabel: 'Create document',
      cancelLabel: 'Keep current',
    })

    if (!confirmed) {
      shouldPreserveStateOnNextOpen.value = true
      emit('update:open', true)
    }

    return confirmed
  },
  createDocument(payload) {
    editorStore.newDocument({
      ...payload,
      persistDraft: true,
    })
  },
})

const fillPreviewStyle = computed(() => ({
  backgroundColor: controller.normalizedFillColor.value ?? props.initialFillColor,
}))

function onOpenChange(nextOpen: boolean) {
  emit('update:open', nextOpen)
}

function onPresetChange(nextPreset: unknown) {
  if (typeof nextPreset === 'string' && nextPreset.length > 0) {
    controller.selectedPreset.value = nextPreset as NewDocumentPreset
  }
}

async function onCreate() {
  const created = await controller.submit()
  if (!created) {
    return
  }

  emit('created')
  emit('update:open', false)
  controller.reset(props.initialFillColor)
}

watch(
  () => props.open,
  nextOpen => {
    if (nextOpen) {
      if (shouldPreserveStateOnNextOpen.value) {
        shouldPreserveStateOnNextOpen.value = false
        return
      }

      controller.reset(props.initialFillColor)
      return
    }

    if (shouldSkipResetOnNextClose.value) {
      shouldSkipResetOnNextClose.value = false
      return
    }

    controller.reset(props.initialFillColor)
  },
)
</script>

<template>
  <DialogRoot :open="open" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="dialog-overlay" />
      <DialogContent class="dialog-content dialog-content-wide">
        <div class="mb-4">
          <DialogTitle class="dialog-title uppercase tracking-wider">New document</DialogTitle>
          <DialogDescription class="dialog-description mt-1 text-xs">
            Choose a preset or custom size and set the initial fill.
          </DialogDescription>
        </div>

        <div class="flex-1 space-y-4 overflow-y-auto px-1 pr-2 custom-scrollbar">
          <section class="status-card">
            <div class="flex items-center justify-between gap-3">
              <span class="status-label">Configuration</span>
              <span class="text-sm font-bold text-[var(--ink-soft)]">
                {{ controller.resolvedWidth ?? '—' }}x{{ controller.resolvedHeight ?? '—' }}
              </span>
            </div>

            <ToggleGroupRoot
              type="single"
              class="dialog-toggle-grid mt-3"
              :model-value="controller.selectedPreset.value"
              @update:model-value="onPresetChange"
            >
              <ToggleGroupItem value="16" class="dialog-toggle-item">16x16</ToggleGroupItem>
              <ToggleGroupItem value="32" class="dialog-toggle-item">32x32</ToggleGroupItem>
              <ToggleGroupItem value="64" class="dialog-toggle-item">64x64</ToggleGroupItem>
              <ToggleGroupItem value="custom" class="dialog-toggle-item">Custom</ToggleGroupItem>
            </ToggleGroupRoot>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <label class="block">
                <span class="status-label">Width</span>
                <input
                  v-model="controller.customWidth.value"
                  class="text-field mt-1"
                  type="number"
                  min="1"
                  max="256"
                  :disabled="controller.selectedPreset.value !== 'custom'"
                />
              </label>
              <label class="block">
                <span class="status-label">Height</span>
                <input
                  v-model="controller.customHeight.value"
                  class="text-field mt-1"
                  type="number"
                  min="1"
                  max="256"
                  :disabled="controller.selectedPreset.value !== 'custom'"
                />
              </label>
            </div>
          </section>

          <section class="status-card">
            <span class="status-label">Initial Fill</span>
            <div class="segmented-control mt-2">
              <button
                type="button"
                class="segmented-control-item"
                :data-active="controller.fillMode.value === 'transparent'"
                @click="controller.fillMode.value = 'transparent'"
              >
                None
              </button>
              <button
                type="button"
                class="segmented-control-item"
                :data-active="controller.fillMode.value === 'color'"
                @click="controller.fillMode.value = 'color'"
              >
                Solid
              </button>
            </div>

            <div
              class="mt-3 flex items-center gap-4 bg-[rgba(255,255,255,0.2)] p-2 border-2 border-dashed border-[var(--panel-border)]"
            >
              <ColorPicker
                title="Fill color"
                :model-value="controller.normalizedFillColor.value ?? props.initialFillColor"
                @confirm="controller.fillColor.value = $event"
              >
                <button
                  type="button"
                  class="dialog-color-trigger checkerboard-surface shrink-0"
                  :disabled="controller.fillMode.value !== 'color'"
                >
                  <span class="color-preview-fill" :style="fillPreviewStyle" />
                </button>
              </ColorPicker>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-[var(--ink-strong)] truncate">
                  {{
                    controller.fillMode.value === 'transparent'
                      ? 'No background'
                      : (controller.normalizedFillColor.value ?? props.initialFillColor)
                  }}
                </p>
                <p class="mt-1 text-[10px] text-[var(--ink-soft)] leading-tight">
                  {{
                    controller.fillMode.value === 'transparent'
                      ? 'Canvas starts empty.'
                      : 'Every pixel set to color.'
                  }}
                </p>
              </div>
            </div>
          </section>

          <section class="status-card">
            <label class="block">
              <span class="status-label">Document name</span>
              <input
                v-model="controller.documentName.value"
                type="text"
                maxlength="120"
                class="text-field mt-1"
                placeholder="untitled"
              />
            </label>
          </section>

          <p v-if="controller.validationError.value != null" class="validation-error-card">
            {{ controller.validationError.value }}
          </p>
        </div>

        <div class="mt-6 flex shrink-0 justify-end gap-3">
          <button type="button" class="editor-button min-w-[100px]" @click="onOpenChange(false)">
            Cancel
          </button>
          <button
            type="button"
            class="editor-button min-w-[140px] !bg-[var(--app-bg-accent)] !text-white"
            :disabled="!controller.canCreate.value"
            @click="onCreate()"
          >
            {{ controller.isSubmitting.value ? 'Creating...' : 'Create' }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
