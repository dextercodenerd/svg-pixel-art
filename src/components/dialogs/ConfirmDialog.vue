<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<!--
  Copyright (C) 2026 Dexter

  This source code is licensed under the GNU Affero General Public License v3.0
  found in the LICENSE file in the root directory of this source tree.
-->
<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { useConfirmationDialog } from '../../services/confirmationService'

const confirmationDialog = useConfirmationDialog()

function onOpenChange(nextOpen: boolean) {
  if (!nextOpen && confirmationDialog.isOpen.value) {
    confirmationDialog.cancel()
  }
}
</script>

<template>
  <DialogRoot :open="confirmationDialog.isOpen.value" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="dialog-overlay" />
      <DialogContent v-if="confirmationDialog.request.value != null" class="dialog-content">
        <div class="space-y-3">
          <DialogTitle class="dialog-title">
            {{ confirmationDialog.request.value.title }}
          </DialogTitle>
          <DialogDescription class="dialog-description">
            {{ confirmationDialog.request.value.message }}
          </DialogDescription>
        </div>

        <div class="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" class="editor-button" @click="confirmationDialog.cancel()">
            {{ confirmationDialog.request.value.cancelLabel }}
          </button>
          <button type="button" class="editor-button" @click="confirmationDialog.confirm()">
            {{ confirmationDialog.request.value.confirmLabel }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
