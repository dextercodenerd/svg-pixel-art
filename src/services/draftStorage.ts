// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Copyright (C) 2026 Dexter
 *
 * This source code is licensed under the GNU Affero General Public License v3.0
 * found in the LICENSE file in the root directory of this source tree.
 */
import { documentToCompactJson } from './exportService'
import { parseJsonDocument } from './importService'
import type { EditorDocument } from '../types'

export const DRAFT_STORAGE_KEY = 'pixel-art:draft'

function getLocalStorage(): Storage | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') {
      return null
    }

    return globalThis.localStorage
  } catch {
    return null
  }
}

export function saveDraft(document: EditorDocument) {
  const storage = getLocalStorage()
  if (storage == null) {
    return
  }

  try {
    storage.setItem(DRAFT_STORAGE_KEY, documentToCompactJson(document))
  } catch {
    // Ignore storage failures so the editor remains usable when persistence is blocked.
  }
}

export function loadDraft(): EditorDocument | null {
  const storage = getLocalStorage()
  if (storage == null) {
    return null
  }

  try {
    const raw = storage.getItem(DRAFT_STORAGE_KEY)
    if (raw == null) {
      return null
    }

    return parseJsonDocument(raw)
  } catch {
    clearDraft()
    return null
  }
}

export function clearDraft() {
  const storage = getLocalStorage()
  if (storage == null) {
    return
  }

  try {
    storage.removeItem(DRAFT_STORAGE_KEY)
  } catch {
    // Ignore storage failures for symmetry with saveDraft/loadDraft.
  }
}
