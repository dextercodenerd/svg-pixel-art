# SVG Pixel Art Editor Plan

## Summary
Build a client-only Vue 3 + TypeScript + Tailwind pixel-art editor, bootstrapped by you with Vite 8, centered on a canvas-based editing experience and SVG/JSON export. The first implementation targets a single-layer editor with big zoomable pixels, responsive layout, desktop-grade shortcuts, and touch-safe responsive behavior. Persistence is local-only in the browser: auto-save the current working document to browser storage, plus explicit import/export for JSON and SVG; PNG export stays lower priority.

The plan should treat SVG as an export format, not the live editing surface. The internal model stores exact RGBA per pixel, and exporting to SVG emits one `rect` per non-transparent pixel at `1x1` size inside an SVG sized to the document dimensions.

## Implementation Changes
### App structure
- Use a small SPA with an editor shell, no router required unless setup naturally prefers it.
- Split UI into three areas: document/setup controls, drawing workspace, and side/bottom panels for tools, palette, history/status, tuned to collapse responsively on smaller screens.
- Use Pinia as the canonical editor state boundary, with composables for canvas interaction, keyboard shortcuts, import/export, and local persistence.

### Core editor model
- Define an editor-native document type with width, height, pixel storage, optional metadata, and editor version.
- Store colors as RGBA-capable values; transparent pixels exist in the document model but do not export as SVG rects.
- Use a canvas renderer for all editing and viewport behaviors: zoom, pan, grid overlay, mirror guide, hover preview, and selection of active tool/color.
- Plan snapshot-based undo/redo with explicit bounds and pruning policy so memory stays predictable on larger documents.

### v1 editing capabilities
- New-document flow supports presets `16x16`, `24x24`, `32x32`, `48x48`, plus validated custom dimensions.
- Include at least: pencil with brush sizes, line tool, flood fill, mirror drawing, color palette, color picker/eyedropper, undo/redo, zoom controls, visible pixel grid, and keyboard shortcuts for tool switching.
- Keep the document single-layer in v1; do not reserve UI complexity for layers yet, but keep store/module boundaries compatible with future multi-layer expansion.

### Import/export and persistence
- JSON import/export is the primary save format and should preserve editor-native data faithfully.
- SVG export converts all solid pixels to `rect` nodes with integer `x`, `y`, `width="1"`, `height="1"`, and fill color; SVG root width/height/viewBox match document dimensions.
- PNG import reads the source image at exact native dimensions and converts each source pixel 1:1 into the internal pixel map; no smoothing or resampling workflow is planned in v1.
- Auto-save the active document to browser storage and restore it on reload, with a clear way to start a fresh document or replace the current one by import.

### UI library decision
- Defer committing to a full Vue UI library until the editor surface and non-canvas UI inventory are clearer.
- Plan around Tailwind plus custom Vue components first, with the option to add a light headless/accessibility layer only for dialogs, popovers, menus, and form primitives if needed.
- Evaluate any library later against three criteria: minimal styling lock-in, good mobile behavior, and no friction with a custom editor-like layout.

## Public Interfaces / Types
- `EditorDocument`: versioned JSON-safe document schema containing dimensions, pixel data, and metadata.
- `ToolId`: typed tool set for v1 actions such as pencil, line, fill, eyedropper, and pan if included.
- `ExportService` contract: document-to-JSON, document-to-SVG, later optional document-to-PNG.
- `ImportService` contract: JSON-to-document and PNG-to-document validation/parsing pipeline.
- `HistoryState` contract: snapshot stack, current index, max-history policy, and reset semantics on new/imported document.

## Test Plan
- New-document creation with each preset and custom dimensions, including validation failures.
- Drawing correctness for pencil, brush sizes, line tool, flood fill, mirror mode, and eyedropper color pickup.
- Undo/redo correctness across mixed tool actions, imports, and new-document resets.
- SVG export correctness: transparent pixels omitted, non-transparent pixels exported as correct `rect`s, root dimensions/viewBox correct.
- JSON round-trip fidelity: export then import reproduces the same document and editor-relevant metadata.
- PNG import fidelity: imported dimensions match source image and pixel colors map exactly 1:1.
- Local auto-save restore flow, including replacing/restoring the current document after reload.
- Responsive UI sanity on desktop, tablet, and phone layouts; shortcut behavior on desktop; touch/pointer safety on smaller screens.

## Assumptions And Defaults
- You will manually bootstrap an empty Vite 8 + Vue 3 + TypeScript + Tailwind project first.
- v1 is single-layer only.
- The live editor uses canvas for performance and interaction; SVG is generated only for export/preview use cases.
- History uses bounded full-document snapshots rather than diff patches.
- Browser-only app: no backend, no cloud sync, no server-side storage.
- UI library choice is intentionally postponed; the implementation should avoid depending on one early so we can decide after the editor shell exists.
