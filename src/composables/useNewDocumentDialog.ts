// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { computed, ref } from 'vue'
import { hexToAbgr, normalizeHexInput } from '../services/colorUtils'
import { requestConfirmation } from '../services/confirmationService'
import { DEFAULT_DOCUMENT_NAME, MAX_CANVAS_SIZE } from '../types'

export type NewDocumentPreset = '16' | '24' | '32' | '48' | 'custom'
export type FillMode = 'transparent' | 'color'

export interface NewDocumentPayload {
  width: number
  height: number
  fill: number
  name: string
}

interface NewDocumentControllerOptions {
  confirmReplacement?: (payload: NewDocumentPayload) => Promise<boolean>
  createDocument: (payload: NewDocumentPayload) => void
}

const DEFAULT_PRESET: NewDocumentPreset = '32'
const DEFAULT_CUSTOM_SIZE = '32'
const DEFAULT_FILL_COLOR = '#000000ff'

function parseCanvasSize(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_CANVAS_SIZE) {
    return null
  }

  return parsed
}

function getPresetSize(preset: NewDocumentPreset): number | null {
  if (preset === 'custom') {
    return null
  }

  return Number.parseInt(preset, 10)
}

export function createNewDocumentController(options: NewDocumentControllerOptions) {
  const selectedPreset = ref<NewDocumentPreset>(DEFAULT_PRESET)
  const customWidth = ref(DEFAULT_CUSTOM_SIZE)
  const customHeight = ref(DEFAULT_CUSTOM_SIZE)
  const fillMode = ref<FillMode>('transparent')
  const fillColor = ref(DEFAULT_FILL_COLOR)
  const documentName = ref(DEFAULT_DOCUMENT_NAME)
  const isSubmitting = ref(false)

  const normalizedFillColor = computed(() => normalizeHexInput(fillColor.value))
  const resolvedWidth = computed(() => {
    const presetSize = getPresetSize(selectedPreset.value)
    return presetSize ?? parseCanvasSize(customWidth.value)
  })
  const resolvedHeight = computed(() => {
    const presetSize = getPresetSize(selectedPreset.value)
    return presetSize ?? parseCanvasSize(customHeight.value)
  })
  const normalizedName = computed(() => documentName.value.trim() || DEFAULT_DOCUMENT_NAME)
  const validationError = computed(() => {
    if (resolvedWidth.value == null || resolvedHeight.value == null) {
      return `Width and height must be integers between 1 and ${MAX_CANVAS_SIZE}.`
    }

    if (fillMode.value === 'color' && normalizedFillColor.value == null) {
      return 'Pick a valid RGBA fill color.'
    }

    return null
  })
  const canCreate = computed(() => validationError.value == null && !isSubmitting.value)

  function getPayload(): NewDocumentPayload | null {
    if (
      validationError.value != null ||
      resolvedWidth.value == null ||
      resolvedHeight.value == null
    ) {
      return null
    }

    return {
      width: resolvedWidth.value,
      height: resolvedHeight.value,
      fill: fillMode.value === 'transparent' ? 0 : hexToAbgr(normalizedFillColor.value),
      name: normalizedName.value,
    }
  }

  function reset(nextFillColor = DEFAULT_FILL_COLOR) {
    selectedPreset.value = DEFAULT_PRESET
    customWidth.value = DEFAULT_CUSTOM_SIZE
    customHeight.value = DEFAULT_CUSTOM_SIZE
    fillMode.value = 'transparent'
    fillColor.value = nextFillColor
    documentName.value = DEFAULT_DOCUMENT_NAME
    isSubmitting.value = false
  }

  async function submit() {
    const payload = getPayload()
    if (payload == null || isSubmitting.value) {
      return false
    }

    isSubmitting.value = true

    try {
      const confirmReplacement =
        options.confirmReplacement ??
        ((nextPayload: NewDocumentPayload) =>
          requestConfirmation({
            title: 'Replace current document?',
            message: `Create a new ${nextPayload.width} x ${nextPayload.height} document? The current draft will be replaced.`,
            confirmLabel: 'Create document',
            cancelLabel: 'Keep current',
          }))

      const confirmed = await confirmReplacement(payload)
      if (!confirmed) {
        return false
      }

      options.createDocument(payload)
      return true
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    selectedPreset,
    customWidth,
    customHeight,
    fillMode,
    fillColor,
    documentName,
    normalizedName,
    normalizedFillColor,
    resolvedWidth,
    resolvedHeight,
    validationError,
    canCreate,
    isSubmitting,
    reset,
    submit,
  }
}
