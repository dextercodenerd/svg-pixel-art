// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
function confirmWithBrowser(message: string): boolean {
  if (typeof window === 'undefined') {
    return true
  }

  return window.confirm(message)
}

export function confirmNewDocumentReplacement(): boolean {
  return confirmWithBrowser(
    'Create a new 32x32 transparent document? The current draft will be replaced.',
  )
}

export function confirmImportReplacement(): boolean {
  return confirmWithBrowser('Replace the current document? The current draft will be overwritten.')
}
