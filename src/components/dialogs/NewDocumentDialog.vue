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
const preserveStateOnNextOpen = ref(false)
const controller = createNewDocumentController({
  async confirmReplacement(payload) {
    emit('update:open', false)

    const confirmed = await requestConfirmation({
      title: 'Replace current document?',
      message: `Create a new ${payload.width} x ${payload.height} document? The current draft will be replaced.`,
      confirmLabel: 'Create document',
      cancelLabel: 'Keep current',
    })

    if (!confirmed) {
      preserveStateOnNextOpen.value = true
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

  if (!nextOpen) {
    controller.reset(props.initialFillColor)
  }
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
      if (preserveStateOnNextOpen.value) {
        preserveStateOnNextOpen.value = false
        return
      }

      controller.reset(props.initialFillColor)
    }
  },
)
</script>

<template>
  <DialogRoot :open="open" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="dialog-overlay" />
      <DialogContent class="dialog-content dialog-content-wide">
        <div class="space-y-3">
          <DialogTitle class="dialog-title">New document</DialogTitle>
          <DialogDescription class="dialog-description">
            Choose a preset or custom size, then decide whether to start transparent or with a solid
            RGBA fill.
          </DialogDescription>
        </div>

        <div class="mt-5 space-y-5">
          <section class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <span class="status-label">Canvas size</span>
              <span class="text-sm text-[var(--ink-soft)]">
                {{ controller.resolvedWidth ?? '—' }} x {{ controller.resolvedHeight ?? '—' }}
              </span>
            </div>

            <ToggleGroupRoot
              type="single"
              class="dialog-toggle-grid"
              :model-value="controller.selectedPreset.value"
              @update:model-value="onPresetChange"
            >
              <ToggleGroupItem value="16" class="dialog-toggle-item">16 x 16</ToggleGroupItem>
              <ToggleGroupItem value="24" class="dialog-toggle-item">24 x 24</ToggleGroupItem>
              <ToggleGroupItem value="32" class="dialog-toggle-item">32 x 32</ToggleGroupItem>
              <ToggleGroupItem value="48" class="dialog-toggle-item">48 x 48</ToggleGroupItem>
              <ToggleGroupItem value="custom" class="dialog-toggle-item">Custom</ToggleGroupItem>
            </ToggleGroupRoot>

            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block">
                <span class="status-label">Width</span>
                <input
                  v-model="controller.customWidth.value"
                  class="text-field mt-2"
                  type="number"
                  min="1"
                  max="256"
                  step="1"
                  :disabled="controller.selectedPreset.value !== 'custom'"
                />
              </label>
              <label class="block">
                <span class="status-label">Height</span>
                <input
                  v-model="controller.customHeight.value"
                  class="text-field mt-2"
                  type="number"
                  min="1"
                  max="256"
                  step="1"
                  :disabled="controller.selectedPreset.value !== 'custom'"
                />
              </label>
            </div>
          </section>

          <section class="space-y-3">
            <span class="status-label">Fill</span>
            <div class="segmented-control">
              <button
                type="button"
                class="segmented-control-item"
                :data-active="controller.fillMode.value === 'transparent'"
                :aria-pressed="controller.fillMode.value === 'transparent'"
                @click="controller.fillMode.value = 'transparent'"
              >
                Transparent
              </button>
              <button
                type="button"
                class="segmented-control-item"
                :data-active="controller.fillMode.value === 'color'"
                :aria-pressed="controller.fillMode.value === 'color'"
                @click="controller.fillMode.value = 'color'"
              >
                Color
              </button>
            </div>

            <div
              class="flex flex-wrap items-center gap-3 rounded-[20px] border border-[var(--panel-border)] bg-[rgba(255,255,255,0.35)] p-3"
            >
              <ColorPicker
                title="Document fill color"
                description="Applies to every pixel when the dialog creates a filled document."
                :model-value="controller.normalizedFillColor.value ?? props.initialFillColor"
                @confirm="controller.fillColor.value = $event"
              >
                <button
                  type="button"
                  class="dialog-color-trigger checkerboard-surface"
                  :disabled="controller.fillMode.value !== 'color'"
                >
                  <span class="color-preview-fill" :style="fillPreviewStyle" />
                </button>
              </ColorPicker>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-[var(--ink-strong)]">
                  {{
                    controller.fillMode.value === 'transparent'
                      ? 'Starts transparent'
                      : 'Fill color'
                  }}
                </p>
                <p class="mt-1 text-sm text-[var(--ink-soft)]">
                  {{
                    controller.fillMode.value === 'transparent'
                      ? 'All pixels start empty.'
                      : (controller.normalizedFillColor.value ?? props.initialFillColor)
                  }}
                </p>
              </div>
            </div>
          </section>

          <label class="block">
            <span class="status-label">Document name</span>
            <input
              v-model="controller.documentName.value"
              type="text"
              maxlength="120"
              class="text-field mt-2"
              placeholder="untitled-svg-pixel-art"
            />
          </label>

          <p
            v-if="controller.validationError.value != null"
            class="rounded-[18px] border border-[rgba(177,66,44,0.25)] bg-[rgba(177,66,44,0.08)] px-3 py-2 text-sm text-[rgb(128,46,29)]"
          >
            {{ controller.validationError.value }}
          </p>
        </div>

        <div class="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" class="editor-button" @click="onOpenChange(false)">Cancel</button>
          <button
            type="button"
            class="editor-button"
            :disabled="!controller.canCreate.value"
            @click="onCreate()"
          >
            {{ controller.isSubmitting.value ? 'Creating…' : 'Create document' }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
