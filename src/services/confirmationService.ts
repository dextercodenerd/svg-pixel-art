// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { readonly, ref } from 'vue'

export interface ConfirmationRequest {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

type PendingConfirmation = Required<ConfirmationRequest>

const isOpen = ref(false)
const request = ref<PendingConfirmation | null>(null)

let resolver: ((result: boolean) => void) | null = null

function clearState() {
  isOpen.value = false
  request.value = null
  resolver = null
}

function resolvePending(result: boolean) {
  const pendingResolver = resolver
  clearState()
  pendingResolver?.(result)
}

export function requestConfirmation(options: ConfirmationRequest): Promise<boolean> {
  if (resolver != null) {
    return Promise.resolve(false)
  }

  request.value = {
    title: options.title,
    message: options.message,
    confirmLabel: options.confirmLabel ?? 'Confirm',
    cancelLabel: options.cancelLabel ?? 'Cancel',
  }
  isOpen.value = true

  return new Promise(resolve => {
    resolver = resolve
  })
}

export function useConfirmationDialog() {
  return {
    isOpen: readonly(isOpen),
    request: readonly(request),
    confirm() {
      resolvePending(true)
    },
    cancel() {
      resolvePending(false)
    },
  }
}
