// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { describe, expect, it } from 'vitest'
import { isEditableTarget, isInteractiveTarget, shouldHandleViewportPanKeydown } from '../src/utils/dom'

function asEventTarget<T extends object>(value: T): EventTarget {
  return value as unknown as EventTarget
}

describe('dom interaction helpers', () => {
  it('distinguishes editable targets from broader interactive targets', () => {
    expect(isEditableTarget(asEventTarget({ tagName: 'input' }))).toBe(true)
    expect(isEditableTarget(asEventTarget({ tagName: 'button' }))).toBe(false)

    expect(isInteractiveTarget(asEventTarget({ tagName: 'button' }))).toBe(true)
    expect(
      isInteractiveTarget({
        getAttribute(name: string) {
          return name === 'href' ? '/docs' : null
        },
        tagName: 'a',
      } as unknown as EventTarget),
    ).toBe(true)
    expect(isInteractiveTarget(asEventTarget({ isContentEditable: true }))).toBe(true)
    expect(isInteractiveTarget(asEventTarget({ tagName: 'div' }))).toBe(false)
  })

  it('captures Space for viewport panning only from non-interactive targets', () => {
    expect(
      shouldHandleViewportPanKeydown({
        code: 'Space',
        target: asEventTarget({ tagName: 'div' }),
      }),
    ).toBe(true)

    expect(
      shouldHandleViewportPanKeydown({
        code: 'Space',
        target: asEventTarget({ tagName: 'button' }),
      }),
    ).toBe(false)

    expect(
      shouldHandleViewportPanKeydown({
        code: 'Enter',
        target: asEventTarget({ tagName: 'div' }),
      }),
    ).toBe(false)
  })
})
