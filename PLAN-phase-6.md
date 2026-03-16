# Phase 6 — Keyboard + Dialogs + Polish

**Goal:** Wire the full keyboard shortcut map, add New/Confirm dialogs, integrate confirmation into the import flow, and apply final responsive and accessibility polish.

## Checklist

- [x] 1. Create `src/composables/useKeyboard.ts`:
  - Single `window` `keydown` listener.
  - Support `Ctrl` and `Meta` as the command modifier.
  - Implement the full shortcut table below.
  - Do not support `Ctrl/Cmd+Y` redo.
  - Skip when focus is inside `input`, `textarea`, or other editable fields.
- [x] 2. Create `src/components/dialogs/ConfirmDialog.vue`:
  - Generic Reka UI Dialog with title, message, confirm, and cancel.
- [x] 3. Create `src/components/dialogs/NewDocumentDialog.vue`:
  - Reka UI Dialog.
  - Size presets as Reka UI ToggleGroup.
  - Custom width/height numeric inputs.
  - Fill options: transparent or any picked RGBA color.
  - Document name input defaulting to `untitled-svg-pixel-art`.
  - On confirm: always show `ConfirmDialog` before replacing the current document in v1.
  - On success: create document, reset view state, reset history baseline, save draft.
- [x] 4. Integrate `ConfirmDialog` into the import flow (`useImport.ts`) and the `DocumentActions.vue` New action.
- [x] 5. Final polish:
  - `focus-visible` outlines on all interactive elements.
  - Reka UI Tooltips on all toolbar buttons and document actions.
  - Canvas `contextmenu` prevented globally (if not already done in Phase 3).
  - Responsive side-panel collapse at `< 768px`.

## Full Keyboard Shortcut Table

| Key | Action |
|---|---|
| `P` | Pencil |
| `E` | Eraser |
| `L` | Line |
| `F` | Fill |
| `I` | Eyedropper |
| `X` | Swap FG/BG |
| `[` / `]` | Decrease / increase brush size |
| `Ctrl/Cmd+Z` | Undo |
| `Ctrl/Cmd+Shift+Z` | Redo |
| `+` / `-` | Zoom in / out |
| `0` | Reset zoom |
| `G` | Toggle grid |
| `Ctrl/Cmd+S` | Export JSON |
| `Ctrl/Cmd+Shift+S` | Export SVG |
| `Ctrl/Cmd+O` | Import file |

## Verify

- [x] `yarn build` and `yarn lint` pass cleanly.
- [x] All keyboard shortcuts work with both `Ctrl` and `Cmd`, and none fire inside editable fields.
- [x] New document and import always show a replacement confirmation dialog before replacing the current draft.
- [x] Responsive layout stacks side panels correctly at `< 768px`.
- [x] All interactive elements have visible `focus-visible` outlines.
- [x] Toolbar buttons and document actions show Reka UI Tooltips with shortcut labels.
