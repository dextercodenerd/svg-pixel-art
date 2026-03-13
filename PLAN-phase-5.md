# Phase 5 — Import / Export + Polish

**Goal:** Complete the I/O pipeline, draft restore, dialogs, keyboard shortcuts, document naming, and responsive polish.

## Checklist

- [ ] 1. Create `src/services/draftStorage.ts`:
  - Use `localStorage` key `'pixel-art:draft'`.
  - `saveDraft(doc)`, `loadDraft(): EditorDocument | null`, `clearDraft()`.
  - Validate `version === 1`, dimensions in range, and `pixels.length === width * height`.
  - Accept `''` and `#00000000` as equivalent transparent values.
  - Strip unknown metadata; preserve only `name`, `createdAt`, `updatedAt`.
- [ ] 2. Create `src/composables/useAutoSave.ts`:
  - Watch the current document with debounce.
  - Save only the document, not history or viewport state.
  - Save synchronously in `beforeunload`.
- [ ] 3. Create `src/services/exportService.ts`:
  - `documentToJson(doc)`: serialize document only.
  - Normalize transparent pixels to empty string on JSON export for compactness.
  - `documentToSvg(doc)`: build string output, skip transparent pixels, emit `fill-opacity` when alpha < `1`.
  - `getDocumentFilename(doc, extension)`: prefer `metadata.name`, fall back to `untitled-svg-pixel-art`.
- [ ] 4. Create `src/services/importService.ts`:
  - `parseJsonDocument(raw: string): EditorDocument`
    - Validate shape, dimensions, pixel count, version.
    - Accept each pixel as either `''` or `#RRGGBBAA`.
    - Preserve `metadata.name`, `createdAt`, and `updatedAt` when valid.
    - Strip unknown metadata fields.
  - `pngToDocument(file: File): Promise<EditorDocument>`
    - Load via blob URL and canvas.
    - Map each RGBA group to `formatHex(r, g, b, a)`.
    - Normalize fully transparent pixels to empty string.
    - Validate dimensions `<= 256`.
    - Set document name from filename.
- [ ] 5. Create `src/composables/useImport.ts`:
  - Hidden `<input type="file" accept=".json,.png">`.
  - `triggerImport()` clicks it.
  - Before replacing the current document, always show confirmation dialog in v1.
  - On success: `editorStore.loadDocument(doc)`, `editorStore.resetViewState()`, `historyStore.resetWith(doc)`, `saveDraft(doc)`.
- [ ] 6. Create `src/composables/useKeyboard.ts`:
  - Single `window` `keydown` listener.
  - Support `Ctrl` and `Meta` as the command modifier.
  - Implement the full shortcut table below.
  - Do not support `Ctrl/Cmd+Y` redo.
  - Skip when focus is inside `input`, `textarea`, or other editable fields.
- [ ] 7. Create `src/components/editor/DocumentActions.vue`:
  - Editable document name field.
  - New, import, export JSON, and export SVG actions.
  - Programmatic download via `Blob` + `URL.createObjectURL`.
  - Export filenames derived from document metadata.
- [ ] 8. Create `src/components/dialogs/NewDocumentDialog.vue`:
  - Reka UI Dialog.
  - Size presets as Reka UI ToggleGroup.
  - Custom width/height numeric inputs.
  - Fill options: transparent or any picked RGBA color.
  - Document name input defaulting to `untitled-svg-pixel-art`.
  - On confirm: always show `ConfirmDialog` before replacing the current document in v1.
  - On success: create document, reset view state, reset history baseline, save draft.
- [ ] 9. Create `src/components/dialogs/ConfirmDialog.vue`:
  - Generic Reka UI Dialog with title, message, confirm, and cancel.
- [ ] 10. On app startup (`EditorShell.vue` `onMounted`):
  - Call `loadDraft()`.
  - If valid, load it immediately with no prompt, reset history baseline to that document, and reset the viewport state.
  - If missing or invalid, create a transparent `32x32` document named `untitled-svg-pixel-art`, reset history baseline, and reset the viewport state.
  - Preserve palette and current `FG/BG` colors across document replacement.
- [ ] 11. Final polish:
  - `focus-visible` outlines on all interactive elements.
  - Reka UI Tooltips on toolbar/actions.
  - Canvas `contextmenu` prevented.
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

- [ ] `yarn build` and `yarn lint` pass cleanly.
- [ ] JSON export and re-import produce a pixel-perfect round-trip.
- [ ] JSON import accepts both transparent representations.
- [ ] SVG export emits no transparent rects and preserves semitransparent pixels via `fill-opacity`.
- [ ] PNG import preserves dimensions and exact colors, and normalizes fully transparent pixels to empty string.
- [ ] Auto-save restores the draft on refresh.
- [ ] New/import always show a replacement confirmation dialog.
- [ ] Undo history is not persisted, but restored/new/imported documents start with a baseline snapshot.
- [ ] Export filenames come from document name, with `untitled-svg-pixel-art` as fallback.
- [ ] All keyboard shortcuts work with both `Ctrl` and `Cmd`, and none fire inside editable fields.
- [ ] Responsive layout stacks side panels correctly at `< 768px`.
