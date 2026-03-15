// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */

interface EditableLikeTarget {
  isContentEditable?: boolean
  tagName?: string
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (target == null || typeof target !== 'object') {
    return false
  }

  const editableTarget = target as EditableLikeTarget
  const tagName = editableTarget.tagName?.toUpperCase()

  return (
    editableTarget.isContentEditable === true ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT'
  )
}
