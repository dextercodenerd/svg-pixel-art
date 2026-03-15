# Phase 5 — I/O + Persistence

**Goal:** Complete the I/O pipeline, draft restore, document naming, and the `DocumentActions` UI. Keyboard shortcuts, dialogs, and responsive polish are Phase 6.

## Checklist

- [x] 1. Create `src/services/draftStorage.ts`:
  - Use `localStorage` key `'pixel-art:draft'`.
  - `saveDraft(doc)`, `loadDraft(): EditorDocument | null`, `clearDraft()`.
  - Validate `version === 1`, dimensions in range, and `pixels.length === width * height`.
  - Accept `''` and `#00000000` as equivalent transparent values.
  - Strip unknown metadata; preserve only `name`, `createdAt`, `updatedAt`.
- [x] 2. Create `src/composables/useAutoSave.ts`:
  - Watch the current document with debounce.
  - Save only the document, not history or viewport state.
  - Save synchronously in `beforeunload`.
- [x] 3. Create `src/services/exportService.ts`:
  - `documentToJson(doc)`: serialize document only.
  - Normalize transparent pixels to empty string on JSON export for compactness.
  - `documentToSvg(doc)`: build string output, skip transparent pixels, emit `fill-opacity` when alpha < `1`.
  - `getDocumentFilename(doc, extension)`: prefer `metadata.name`, fall back to `untitled-svg-pixel-art`.
- [x] 4. Create `src/services/importService.ts`:
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
- [x] 5. Create `src/composables/useImport.ts`:
  - Hidden `<input type="file" accept=".json,.png">`.
  - `triggerImport()` clicks it.
  - Before replacing the current document, always show confirmation dialog in v1.
  - On success: replace the current document through the centralized editor-store lifecycle and persist the draft.
- [x] 6. Create `src/components/editor/DocumentActions.vue`:
  - Editable document name field.
  - New, import, export JSON, and export SVG actions.
  - Programmatic download via `Blob` + `URL.createObjectURL`.
  - Export filenames derived from document metadata.
- [x] 7. On app startup (`EditorShell.vue` `onMounted`):
  - Call `loadDraft()`.
  - If valid, load it immediately with no prompt, reset history baseline to that document, and reset the viewport state.
  - If missing or invalid, create a transparent `32x32` document named `untitled-svg-pixel-art`, reset history baseline, and reset the viewport state.
  - Preserve palette and current `FG/BG` colors across document replacement.

## Verify

- [x] `yarn build` and `yarn lint` pass cleanly.
- [x] JSON export and re-import produce a pixel-perfect round-trip.
- [x] JSON import accepts both transparent representations.
- [x] SVG export emits no transparent rects and preserves semitransparent pixels via `fill-opacity`.
- [x] PNG import preserves dimensions and exact colors, and normalizes fully transparent pixels to empty string.
- [x] Auto-save restores the draft on refresh.
- [x] Undo history is not persisted, but restored/new/imported documents start with a baseline snapshot.
- [x] Export filenames come from document name, with `untitled-svg-pixel-art` as fallback.
