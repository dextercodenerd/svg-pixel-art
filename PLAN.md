# SVG Pixel Art Editor — Plans

---

## Original Plan (Refined v2)

### Summary
Extend the current Vite 8 + Vue 3 + TypeScript scaffold into a client-only pixel-art editor with a canvas-based editing surface, Pinia-backed editor state, JSON as the primary save format, SVG as the primary export format, and PNG import support. The current scaffold already includes Vue and Pinia; Tailwind is still to be added before editor UI work begins.

v1 targets a single-layer editor with responsive layout, dense-grid document storage up to `256x256`, full RGBA editing, bounded snapshot history, browser auto-save of one current draft, touch drawing, and a fixed core shortcut set with both `Ctrl` and `Cmd` support. Mirror drawing and PNG export are explicitly out of v1.

### Implementation Changes
#### Architecture and state
- Keep the app as a small SPA without routing unless setup pressure appears later.
- Use Pinia for canonical editor state and composables/services for canvas interaction, touch gestures, keyboard shortcuts, import/export, and draft persistence.
- Build around a dense grid model sized `width * height`; every cell exists and stores one color value.
- Standardize non-transparent pixel values as 8-digit hex strings in `#RRGGBBAA` form.
- Treat fully transparent pixels as semantically equivalent whether stored as empty string or `#00000000`; prefer empty string in memory and JSON export to save space.

#### Document and editor behavior
- Define `EditorDocument` as a versioned, editor-native shape with top-level `version`, `width`, `height`, `pixels`, and `metadata`.
- Keep `metadata` fixed for v1 to `name`, `createdAt`, and `updatedAt`, with timestamps stored as ISO 8601 UTC strings.
- Support new-document presets `16x16`, `24x24`, `32x32`, `48x48`, plus validated custom sizes up to `256x256`.
- Implement v1 tools as pencil, eraser, line, flood fill, and eyedropper.
- Use an FG/BG two-color model: desktop uses left-click for FG and right-click for BG; touch uses an explicit active `FG/BG` slot selector.
- Treat RGBA as first-class in the editor UI: users can create and edit translucent colors, not just preserve imported alpha.
- Render and interact through canvas only: zoom, pan, grid overlay, custom cursor/target preview, hover feedback, and active tool/color feedback.

#### Persistence and file formats
- JSON is the primary portable save format and stores document data only, not transient UI/session state.
- JSON schema uses a flat `pixels` array in row-major order with length exactly `width * height`; each entry may be `''` or `#RRGGBBAA`.
- Browser auto-save persists one current draft only and restores it automatically on reload.
- Creating a new document or importing a file always requires confirmation first in v1 because the single saved draft will be replaced.
- SVG export emits one `rect` per non-transparent pixel with `x`, `y`, `width="1"`, `height="1"`, `fill` set to the RGB portion, and `fill-opacity` included when alpha is below `1`.
- PNG import reads the source image at native dimensions, creates a document with matching width/height, and maps each source pixel exactly 1:1 into `#RRGGBBAA`; fully transparent pixels normalize to empty string.
- PNG export is post-v1 only; keep export code organized so a raster exporter can be added later without changing the document model.

#### UI and interaction plan
- Use Tailwind CSS plus `Reka UI` as the chosen primitive layer; avoid a full Vue component suite so the app can keep a custom pixel-editor aesthetic.
- Reserve `Reka UI` for accessibility-heavy primitives such as dialogs, dropdown menus, popovers, tooltips, sliders, switches, and toggle groups.
- Build all editor-defining UI as custom Vue components: editor shell, pixel-art panels, tool palette, swatch/palette UI, RGBA controls, canvas viewport, status bar, and history/actions areas.
- Shape the responsive UI into three regions: document/actions area, central editor workspace, and tool/color/status panels that collapse for smaller screens.
- Define a fixed v1 shortcut map: `P` pencil, `E` eraser, `L` line, `F` fill, `I` eyedropper, `X` swap FG/BG, `[` and `]` brush size, `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Shift+Z` redo, `+` zoom in, `-` zoom out, `0` reset zoom, `G` toggle grid, `Ctrl/Cmd+S` export JSON, `Ctrl/Cmd+Shift+S` export SVG, `Ctrl/Cmd+O` import file.
- Keep the first implementation slice focused on the core editor shell: document model, Pinia stores, canvas board, viewport model, and history foundation before richer import/export UI polish.
- Treat the Aseprite-like visual language as a staged goal: v1 should be functionally clean first, with stronger retro pixel-art chrome layered in after the editor foundation is working.

### Public Interfaces / Types
- `EditorDocument`: `{ version, width, height, pixels, metadata }`, where `pixels` is a flat row-major array of `'' | #RRGGBBAA`.
- `DocumentMetadata`: `{ name, createdAt, updatedAt }`.
- `ToolId`: `pencil | eraser | line | fill | eyedropper`.
- `ActiveColorSlot`: `fg | bg`.
- `HistoryState`: bounded snapshot history of full `EditorDocument` snapshots with `50` undo steps plus the current state.
- `DraftStorage`: one persisted current document plus minimal versioning needed for migration/invalid-draft reset.
- `ImportService`: JSON-to-document and PNG-to-document validation/parsing.
- `ExportService`: document-to-JSON and document-to-SVG, with PNG export intentionally excluded from v1.

### Test Plan
- Create documents from each preset and custom sizes, rejecting invalid or over-limit dimensions.
- Verify dense-grid indexing and row-major JSON round-trips preserve every pixel value, including both transparent forms.
- Validate drawing behavior for pencil, eraser, brush sizes, line, fill, and eyedropper, including semitransparent colors.
- Verify undo/redo across mixed tool actions, with history reset on new/import and capped at `50` undo steps plus current state.
- Confirm SVG export omits fully transparent pixels and preserves RGBA via fill color plus `fill-opacity`.
- Confirm PNG import preserves source dimensions and exact RGBA values 1:1, with fully transparent pixels normalized to empty string.
- Confirm auto-save restores exactly one current draft after reload and initializes a fresh undo baseline from that restored document.
- Verify the fixed shortcut set works on desktop with both `Ctrl` and `Cmd`, and that the responsive layout remains usable on tablet and phone widths.
- Verify touch interactions: one-finger drawing, two-finger pan/zoom, explicit active color slot, and gesture-end zoom snapping.

### Assumptions and Defaults
- Tailwind CSS and `Reka UI` will be added after the scaffold stage; neither is present in the current repo yet.
- Transparent pixels may be stored as either empty string or `#00000000`, but all editor operations treat them as identical.
- Snapshot history stores full-document snapshots, not patches or diffs.
- v1 stays single-layer and browser-only, with no backend, sync, or server persistence.
- The selected UI approach is `Tailwind + Reka UI + custom editor components`, with no full component suite planned for v1.
- New/import/restore resets viewport state, while palette and FG/BG colors persist.

---

## Implementation Checklist (v1)

Design decisions confirmed through planning:

| Decision | Choice |
|---|---|
| Color model | FG + BG two-color; desktop uses left-click/right-click, touch uses an explicit active slot |
| Eyedropper | Desktop: left-click sets FG, right-click sets BG; touch sets the active slot |
| FG/BG swap | `X` key |
| Eraser | Dedicated tool (`E`), always writes transparency |
| Transparent pixel BG | Checkerboard (grey/white) |
| Color picker | HSV hue bar + SV square + RGBA sliders + hex input; commit on confirm only |
| Brush sizes | 1×1, 2×2, 3×3, 4×4 square; `[`/`]` to cycle |
| Even brush anchor | Top-left biased; custom cursor outlines exact affected area |
| Pan | Middle-mouse drag + Space+drag on desktop; two-finger pan on touch |
| Zoom steps | Logical `1×`, `2×`, `4×`, `8×`, `16×`; `1×` renders each art pixel as `8×8` screen px |
| Zoom snapping | Wheel/keyboard uses discrete steps immediately; touch pinch snaps once on gesture end |
| Palette | Global editable swatches in `localStorage` (not per-document) |
| Flood fill | Exact color match only; right-click uses BG |
| Grid | On by default, always visible, toggleable |
| Draft restore | Automatic on startup if present |
| Replace-document confirmation | Always show for `New` and `Import` in v1 |
| New document fill | Transparent by default; dialog can fill with transparent or any picked RGBA color |
| Export naming | Use `metadata.name` when present, else `untitled-svg-pixel-art` |

### Phases

| Phase | File | Goal |
|---|---|---|
| 1 | [PLAN-phase-1.md](./PLAN-phase-1.md) | Foundation — deps, types, stores, history contract |
| 2 | [PLAN-phase-2.md](./PLAN-phase-2.md) | Canvas rendering — checkerboard, logical zoom, pan, grid, cursor |
| 3 | [PLAN-phase-3.md](./PLAN-phase-3.md) | Drawing tools — desktop and touch input, history commits |
| 4 | [PLAN-phase-4.md](./PLAN-phase-4.md) | Color system — picker, slots, palette |
| 5 | [PLAN-phase-5.md](./PLAN-phase-5.md) | Import / export + polish — I/O, shortcuts, draft restore, dialogs |

### Critical Files

| File | Role |
|---|---|
| `src/types/index.ts` | Single source of truth for all domain types and editor constants |
| `src/stores/editor.ts` | Canonical document + viewport state; hub for all composables and components |
| `src/stores/history.ts` | Full-document undo/redo snapshots with a fixed `50`-step undo limit |
| `src/components/editor/PixelCanvas.vue` | All canvas rendering: checkerboard, zoomed pixel loop, grid, preview layer, custom cursor |
| `src/services/pixelOps.ts` | Pure pixel mutation functions (stamp, Bresenham, BFS fill); must be correct before tools work |
| `src/composables/useCanvasPointer.ts` | Tool dispatch, coordinate mapping, preview state, history push timing for desktop and touch |
| `src/services/exportService.ts` | JSON and SVG export — the core output pipeline |
| `src/services/importService.ts` | JSON and PNG import with validation and transparent-pixel normalization |

### Technical Notes

**Logical zoom and render scale:** Treat `zoom` as a logical multiplier, not raw CSS pixels. Define `BASE_PIXEL_SIZE = 8`, then `renderScale = BASE_PIXEL_SIZE * zoom`. At logical `1×`, one art pixel renders as `8×8` screen px.

**Checkerboard rendering:** Draw a 16×16 pattern canvas (four 8×8 alternating light/dark-grey squares). Cache `ctx.createPattern(patternCanvas, 'repeat')`. On each frame, fill the entire canvas rect with the pattern first, then draw pixels on top.

**Transparent equivalence:** Add a shared helper such as `isTransparentPixel(value)` so `''` and `#00000000` are treated identically by drawing, fill matching, eyedropper, export skipping, and validation.

**Bresenham line preview:** Maintain `previewPixels: string[] | null` ref in `useCanvasPointer`. While dragging, compute `bresenhamLine(start, current)`, stamp onto a copy of `document.pixels`, and store in `previewPixels`. Pass as a prop to `PixelCanvas`; render with `globalAlpha = 0.65` after the normal pixel pass. On commit, clear `previewPixels` and push a single history entry.

**Coordinate mapping with pan + logical zoom:**
```
relX = e.clientX - viewportRect.left
relY = e.clientY - viewportRect.top
col = Math.floor((relX - panOffset.x) / renderScale)
row = Math.floor((relY - panOffset.y) / renderScale)
```
`viewportRect` is the untransformed container's `getBoundingClientRect()`. The inner canvas wrapper is CSS-translated, so subtracting `panOffset` gives canvas-local coordinates.

**Zoom-to-cursor:** Before zoom change, record `oldCol = (cursorX - panOffset.x) / oldRenderScale`. After zoom: `newPanX = cursorX - oldCol * newRenderScale`. This keeps the pixel under the cursor stationary.

**Touch pinch behavior:** Allow continuous two-finger pan + scale preview during the gesture, but snap to the nearest allowed logical zoom level only once when the gesture ends.

**Flood fill performance:** `Uint8Array(width * height)` as visited flags (not a `Set<number>`) lowers GC pressure. Use BFS, not recursive DFS. Target color comparison should use the transparent-equivalence helper.

**History memory:** 51 full snapshots of a `256×256` canvas is acceptable for v1. Metadata overhead is negligible next to the pixel array. Post-v1 options: RLE or diff-based history.

**Pencil gap filling:** On fast pointer movement, interpolate between the previous and current coordinate via `bresenhamLine` and stamp all intermediate pixels in the same `pointermove` handler to prevent skipped gaps.

**Viewport reset:** On new/import/restore, reset logical zoom to `1×`, re-enable grid, and center the document if it fits. If it does not fit, use pan `(0, 0)`. Clamp panning with a `32px` margin so the canvas cannot be dragged fully out of view.
