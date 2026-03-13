# Phase 3 — Drawing Tools

**Goal:** All five tools functional with FG/BG model, brush sizes, Bresenham line preview, and undo/redo.

## Checklist

- [ ] 1. Create `src/services/pixelOps.ts` — pure functions operating on a pixels array copy (never mutate in-place):
   - `brushStamp(pixels, width, height, col, row, brushSize, color): string[]` — stamp `brushSize×brushSize` square centred on (col, row), clamped to bounds.
   - `bresenhamLine(col0, row0, col1, row1): {col, row}[]` — classic integer Bresenham, returns pixel coordinate list.
   - `floodFill(pixels, width, height, col, row, targetColor, fillColor): string[]` — BFS with `Uint8Array(width*height)` visited flags (not a Set — better GC), 4-connected, exact match. Guard: return clone unchanged if `targetColor === fillColor`.
- [ ] 2. Create `src/composables/useCanvasPointer.ts`:
   - Registers `pointerdown`, `pointermove`, `pointerup`, `contextmenu` (preventDefault) on canvas ref.
   - Determines draw color: `button === 0` → FG, `button === 2` → BG; eraser always `TRANSPARENT`.
   - **Pencil/Eraser:** on `pointerdown` + `pointermove`, interpolate between last coord and current via `bresenhamLine` to fill gaps during fast strokes; call `editorStore.setPixels(brushStamp(…))` per point. Push history on `pointerup` (one undo per stroke).
   - **Line:** record `lineStart` on `pointerdown`; on `pointermove` update `previewPixels` ref (Bresenham list → stamped onto current pixels); on `pointerup` commit via `setPixels` + push history; clear `previewPixels`.
   - **Fill:** on `pointerdown`, run `floodFill`, call `setPixels`, push history.
   - **Eyedropper:** on `pointerdown`, read pixel, call `colorStore.setFg` or `colorStore.setBg` per button.
- [ ] 3. Update `src/stores/editor.ts` — add `applyUndo()` (pull snapshot from historyStore, call `setPixels`) and `applyRedo()`.
- [ ] 4. Update `PixelCanvas.vue` to attach `useCanvasPointer` handlers; pass `previewPixels` to render loop.
- [ ] 5. Create `src/components/editor/ToolBar.vue` — icon buttons for each tool; active tool highlighted; Reka UI Tooltips with shortcut labels; cursor changes per tool (`crosshair` default, `copy` for eyedropper).
- [ ] 6. Create `src/components/editor/BrushSizePicker.vue` — four small SVG squares showing 1–4px dot; clicking selects; `[`/`]` keyboard cycle.

## Keyboard Shortcuts (tools)

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

## Verify

- Pencil draws FG on left-click, BG on right-click.
- Eraser produces transparent pixels (checkerboard shows through).
- All brush sizes stamp correct square.
- Line preview shows during drag, commits on release.
- Fill replaces all connected exact-match pixels.
- Eyedropper sets FG/BG.
- Undo reverts each stroke/fill/line as one step; redo reapplies.
- History caps at 50.
