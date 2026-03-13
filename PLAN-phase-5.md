# Phase 5 — Import / Export + Polish

**Goal:** Complete I/O pipeline, keyboard shortcuts, auto-save, new-document dialog, responsive polish.

## Checklist

- [ ] 1. Create `src/services/draftStorage.ts` — `localStorage` key `'pixel-art:draft'`; `saveDraft(doc)`, `loadDraft(): EditorDocument | null` (validates shape + `version === 1`, returns null on any error), `clearDraft()`.
- [ ] 2. Create `src/composables/useAutoSave.ts` — `watch(document, …, { deep: true })` with 500ms debounce calls `saveDraft`; also saves synchronously in `beforeunload`.
- [ ] 3. Create `src/services/exportService.ts`:
   - `documentToJson(doc)`: `JSON.stringify(doc, null, 2)` — document only, no UI state.
   - `documentToSvg(doc)`: build SVG string (`viewBox="0 0 {w} {h}"`); iterate pixels, skip `TRANSPARENT`, emit `<rect x y width="1" height="1" fill="#RRGGBB" [fill-opacity="a" when alpha < 1]/>`. Build as string array, join with `\n`. No DOM APIs.
- [ ] 4. Create `src/services/importService.ts`:
   - `parseJsonDocument(raw: string): EditorDocument` — parse, validate `version === 1`, dims in [1,256], `pixels.length === width*height`, each pixel matches `/^#[0-9a-fA-F]{8}$/`. Throw descriptive errors on failure.
   - `pngToDocument(file: File): Promise<EditorDocument>` — load via `<img>` + blob URL, draw to canvas, read `ImageData`, map each RGBA group to `formatHex(r,g,b,a)` (fully transparent → `TRANSPARENT`). Validate dimensions ≤ 256.
- [ ] 5. Create `src/composables/useImport.ts` — hidden `<input type="file" accept=".json,.png">`; `triggerImport()` clicks it; `onChange` dispatches to `parseJsonDocument` or `pngToDocument` by extension; on success calls `editorStore.loadDocument(doc)`, `historyStore.clear()`, `saveDraft(doc)`.
- [ ] 6. Create `src/composables/useKeyboard.ts` — single `window` `keydown` listener; implements full shortcut table below; skips when `e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement`.
- [ ] 7. Wire export in `DocumentActions.vue` — programmatic download via `Blob` + `URL.createObjectURL` + hidden `<a download>` click + `revokeObjectURL`.
- [ ] 8. Create `src/components/dialogs/NewDocumentDialog.vue` — Reka UI Dialog; size presets as Reka UI ToggleGroup; custom width/height `<input type="number" min="1" max="256">`; optional fill (transparent or white); on confirm: if current doc has changes, shows `ConfirmDialog` first; calls `editorStore.newDocument`, `historyStore.clear`, `saveDraft`.
- [ ] 9. Create `src/components/dialogs/ConfirmDialog.vue` — generic Reka UI Dialog with title, message, confirm/cancel.
- [ ] 10. On app startup (`EditorShell.vue` `onMounted`): call `loadDraft()` → if valid call `loadDocument`; else `newDocument(32, 32)`.
- [ ] 11. Final polish: `focus-visible` outlines on all interactive elements; Reka UI Tooltips on toolbar; canvas `contextmenu` → `preventDefault`; responsive side-panel collapse at `< 768px`.

## Full Keyboard Shortcut Table

| Key | Action |
|---|---|
| `P` | Pencil |
| `E` | Eraser |
| `L` | Line |
| `F` | Fill |
| `I` | Eyedropper |
| `X` | Swap FG/BG |
| `[` / `]` | Decrease / Increase brush size |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `+` / `-` | Zoom in / out |
| `0` | Reset zoom to 1× |
| `G` | Toggle grid |
| `Ctrl+S` | Export JSON |
| `Ctrl+Shift+S` | Export SVG |
| `Ctrl+O` | Import file |

## Verify

- [ ] `yarn build` and `yarn lint` pass cleanly.
- [ ] JSON export → re-import produces pixel-perfect round-trip.
- [ ] SVG export in browser: no transparent rects; `fill-opacity` on semitransparent pixels.
- [ ] PNG import: dimensions match source; each pixel color matches 1:1.
- [ ] Auto-save: draw → refresh → drawing restored.
- [ ] New document: confirmation dialog when unsaved work exists.
- [ ] All keyboard shortcuts work; none fire inside hex input field.
- [ ] Undo cap: after 51 strokes, oldest snapshot is gone.
- [ ] Responsive: side panels stack correctly at `< 768px`.
