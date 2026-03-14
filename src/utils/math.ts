// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

export function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value))
}
