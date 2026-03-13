# Refined v1 Plan For SVG Pixel Art Editor

## Summary
Extend the current Vite 8 + Vue 3 + TypeScript scaffold into a client-only pixel-art editor with a canvas-based editing surface, Pinia-backed editor state, JSON as the primary save format, SVG as the primary export format, and PNG import support. The current scaffold already includes Vue and Pinia; Tailwind is still to be added before editor UI work begins.

v1 targets a single-layer editor with responsive layout, dense-grid document storage up to `256x256`, full RGBA editing, bounded snapshot history, browser auto-save of one current draft, and a fixed core shortcut set. Mirror drawing and PNG export are explicitly out of v1.

## Implementation Changes
### Architecture and state
- Keep the app as a small SPA without routing unless setup pressure appears later.
- Use Pinia for canonical editor state and composables/services for canvas interaction, keyboard shortcuts, import/export, and draft persistence.
- Build around a dense grid model sized `width * height`; every cell exists and stores one color value.
- Standardize pixel values as 8-digit hex strings in `#RRGGBBAA` form, with fully transparent pixels stored as empty string, to save sppace, or `#00000000`.

### Document and editor behavior
- Define `EditorDocument` as a versioned, editor-native shape with `version`, `width`, `height`, `pixels`, and optional lightweight metadata.
- Support new-document presets `16x16`, `24x24`, `32x32`, `48x48`, plus validated custom sizes up to `256x256`.
- Implement v1 tools as pencil with brush sizes, line, flood fill, and eyedropper; omit mirror drawing entirely from v1.
- Treat RGBA as first-class in the editor UI: users can create and edit translucent colors, not just preserve imported alpha.
- Render and interact through canvas only: zoom, optional pan if needed by viewport size, grid overlay, hover preview, and active tool/color feedback.

### Persistence and file formats
- JSON is the primary portable save format and stores document data only, not transient UI/session state.
- JSON schema should use a flat `pixels` array of `#RRGGBBAA` strings in row-major order with length exactly `width * height`.
- Browser auto-save persists one current draft only and restores it on reload; importing or creating a new document replaces that draft after confirmation in the eventual UX.
- SVG export emits one `rect` per non-transparent pixel with `x`, `y`, `width="1"`, `height="1"`, `fill` set to the RGB portion, and `fill-opacity` included when alpha is below `1`.
- PNG import reads the source image at native dimensions, creates a document with matching width/height, and maps each source pixel exactly 1:1 into `#RRGGBBAA`; any alpha greater than `0` is preserved and any fully transparent pixel becomes `#00000000`.
- PNG export is post-v1 only; keep export code organized so a raster exporter can be added later without changing the document model.

### UI and interaction plan
- Use Tailwind CSS plus `Reka UI` as the chosen primitive layer; avoid a full Vue component suite so the app can keep a custom pixel-editor aesthetic.
- Reserve `Reka UI` for accessibility-heavy primitives such as dialogs, dropdown menus, popovers, tooltips, sliders, switches, and toggle groups.
- Build all editor-defining UI as custom Vue components: editor shell, pixel-art panels, tool palette, swatch/palette UI, RGBA controls, canvas viewport, status bar, and history/actions areas.
- Shape the responsive UI into three regions: document/actions area, central editor workspace, and tool/color/status panels that collapse for smaller screens.
- Define a fixed v1 shortcut map: `P` pencil, `L` line, `F` fill, `I` eyedropper, `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Shift+Z` redo, `+` zoom in, `-` zoom out, `0` reset zoom, `G` toggle grid, `Ctrl/Cmd+S` export JSON, `Ctrl/Cmd+Shift+S` export SVG, `Ctrl/Cmd+O` import file.
- Keep the first implementation slice focused on the core editor shell: document model, Pinia store, canvas board, new-document flow, and history/persistence foundation before richer import/export UI polish.
- Treat the Aseprite-like visual language as a staged goal: v1 should be functionally clean first, with stronger retro pixel-art chrome layered in after the editor foundation is working.

## Public Interfaces / Types
- `EditorDocument`: `{ version, width, height, pixels, metadata? }`, where `pixels` is a flat row-major array of `#RRGGBBAA` strings.
- `ToolId`: `pencil | line | fill | eyedropper`.
- `HistoryState`: bounded snapshot history with a fixed cap of `50` undo steps plus current index.
- `DraftStorage`: one persisted current document plus minimal versioning needed for migration/invalid-draft reset.
- `ImportService`: JSON-to-document and PNG-to-document validation/parsing.
- `ExportService`: document-to-JSON and document-to-SVG, with PNG export intentionally excluded from v1.

## Test Plan
- Create documents from each preset and custom sizes, rejecting invalid or over-limit dimensions.
- Verify dense-grid indexing and row-major JSON round-trips preserve every `#RRGGBBAA` pixel exactly.
- Validate drawing behavior for pencil, brush sizes, line, fill, and eyedropper, including semitransparent colors.
- Verify undo/redo across mixed tool actions, document resets, and imports, with history capped at `50`.
- Confirm SVG export omits fully transparent pixels and preserves RGBA via fill color plus `fill-opacity`.
- Confirm PNG import preserves source dimensions and exact RGBA values 1:1.
- Confirm auto-save restores exactly one current draft after reload and is replaced correctly by new/imported documents.
- Verify the fixed shortcut set works on desktop and that the responsive layout remains usable on tablet and phone widths.

## Assumptions And Defaults
- Tailwind CSS and `Reka UI` will be added after the scaffold stage; neither is present in the current repo yet.
- Transparent pixels are stored explicitly as `#00000000`, even though SVG export skips them.
- Snapshot history uses full-document snapshots, not patches or diffs.
- v1 stays single-layer and browser-only, with no backend, sync, or server persistence.
- The selected UI approach is `Tailwind + Reka UI + custom editor components`, with no full component suite planned for v1.
