# Phase 3 — Drawing Tools

**Goal:** All five tools work on desktop and touch with FG/BG behavior, brush sizes, a live Bresenham line preview overlay, and single-commit history entries.

## Checklist

- [x] 1. Create `src/services/pixelOps.ts` — pure functions operating on a copied pixels array:
  - `brushStamp(pixels, width, height, col, row, brushSize, color): string[]`
    - Stamp a square brush.
    - Even brush sizes are top-left biased.
    - Clamp to bounds.
  - `bresenhamLine(col0, row0, col1, row1): { col: number; row: number }[]`
  - `floodFill(pixels, width, height, col, row, targetColor, fillColor): string[]`
    - BFS with `Uint8Array(width * height)` visited flags.
    - 4-connected exact match.
    - Treat `''` and `#00000000` as equivalent.
    - Return clone unchanged if target and fill colors are equivalent.
- [x] 2. Create `src/composables/useCanvasPointer.ts`:
  - Register `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, and `contextmenu`.
  - Prevent default context menu on canvas.
  - Determine draw color:
    - Desktop primary button uses `FG`.
    - Desktop secondary button uses `BG`.
    - Eraser always uses transparency.
    - Touch uses `colorStore.activeSlot`.
  - **Pencil/Eraser:**
    - On `pointerdown` and `pointermove`, interpolate via `bresenhamLine` to avoid skipped gaps.
    - Stamp each intermediate point with the selected brush size.
    - Push one history entry on commit, not per move.
  - **Line:**
    - Record `lineStart` on pointer down.
    - Update `previewPixels` during drag with the pending line only.
    - Render the live preview over the current drawing in a configurable preview color that includes alpha; start with black at `0.65` alpha.
    - Commit once on release.
    - Desktop right-click uses `BG`.
    - Touch uses the active slot.
  - **Fill:**
    - Run on press.
    - Desktop right-click uses `BG`.
    - Touch uses the active slot.
    - Push one history entry.
  - **Eyedropper:**
    - Desktop primary sets `FG`, secondary sets `BG`.
    - Touch sets the active slot.
  - Feed cursor target state back to `PixelCanvas`.
- [x] 3. Update `src/stores/editor.ts`:
  - Add `applyUndo()` and `applyRedo()` that load full document snapshots from `historyStore`.
  - Keep `version`, `width`, `height`, `pixels`, and `metadata` in sync on restore.
- [x] 4. Update `PixelCanvas.vue` to attach `useCanvasPointer` handlers and render `previewPixels` as a line-only overlay without dimming unrelated artwork.
- [x] 5. Create `src/components/editor/ToolBar.vue`:
  - Icon buttons for all five tools.
  - Active tool highlighted.
  - Reka UI Tooltips show shortcuts.
- [x] 6. Create `src/components/editor/BrushSizePicker.vue`:
  - Four SVG size previews.
  - Clicking selects brush size.
  - `[` and `]` cycle sizes.

## Keyboard Shortcuts (tools) — *deferred to Phase 6 (`useKeyboard.ts`)*

> These shortcuts are listed here for reference only. **Do not implement `useKeyboard.ts` in this phase.** Wiring the full keyboard shortcut map is Phase 6 work.
> Exception: `BrushSizePicker.vue` (item 6) may handle `[`/`]` locally via a component-level `keydown` listener as a convenience, but this is optional and must not block Phase 3 sign-off.

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

## Verify

- Pencil draws `FG` on desktop primary button and `BG` on desktop secondary button.
- Eraser produces transparent pixels and the checkerboard shows through.
- Touch drawing uses the active `FG/BG` slot.
- All brush sizes stamp the correct square with top-left bias for even sizes.
- Line preview shows during drag as a black `0.65` alpha overlay over the current drawing and commits on release using the real selected line color.
- Fill replaces all connected exact-match pixels.
- Eyedropper updates the correct slot on desktop and touch.
- Undo reverts each stroke/fill/line as one step; redo reapplies.
- History stores full document snapshots and supports `50` undo steps.
