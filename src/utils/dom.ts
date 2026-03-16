// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */

interface DomLikeTarget {
  closest?: (selector: string) => Element | null
  getAttribute?: (name: string) => string | null
  isContentEditable?: boolean
  tagName?: string
}

const INTERACTIVE_SELECTOR =
  'button, input, textarea, select, a[href], summary, [contenteditable], [role="button"], [role="link"], [role="checkbox"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="radio"], [role="switch"], [role="tab"]'

function toDomLikeTarget(target: EventTarget | null): DomLikeTarget | null {
  if (target == null || typeof target !== 'object') {
    return null
  }

  return target as DomLikeTarget
}

export function isEditableTarget(target: EventTarget | null): boolean {
  const domTarget = toDomLikeTarget(target)
  if (domTarget == null) {
    return false
  }

  const tagName = domTarget.tagName?.toUpperCase()

  return (
    domTarget.isContentEditable === true ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT'
  )
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
  const domTarget = toDomLikeTarget(target)
  if (domTarget == null) {
    return false
  }

  if (isEditableTarget(target)) {
    return true
  }

  const tagName = domTarget.tagName?.toUpperCase()
  if (tagName === 'BUTTON' || tagName === 'SUMMARY') {
    return true
  }

  if (tagName === 'A' && domTarget.getAttribute?.('href') != null) {
    return true
  }

  return domTarget.closest?.(INTERACTIVE_SELECTOR) != null
}

export function shouldHandleViewportPanKeydown(event: Pick<KeyboardEvent, 'code' | 'target'>) {
  return event.code === 'Space' && !isInteractiveTarget(event.target)
}
