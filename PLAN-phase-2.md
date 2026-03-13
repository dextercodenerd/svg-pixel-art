# Phase 2 — Canvas Rendering

**Goal:** Pixel canvas is visible with checkerboard, logical zoom, clamped pan, always-on grid, custom cursor, and touch viewport gestures. No drawing commits yet.

## Coordinate Mapping

```
renderScale = BASE_PIXEL_SIZE * zoom

relX = e.clientX - viewportRect.left
relY = e.clientY - viewportRect.top
col = Math.floor((relX - panOffset.x) / renderScale)
row = Math.floor((relY - panOffset.y) / renderScale)
```

## Zoom-to-Cursor Pan Adjustment

```
oldCol = (cursorX - panOffset.x) / oldRenderScale
oldRow = (cursorY - panOffset.y) / oldRenderScale

newPanX = cursorX - oldCol * newRenderScale
newPanY = cursorY - oldRow * newRenderScale
```

## Checklist

- [x] 1. Create `src/services/colorUtils.ts`:
  - `parseHex`
  - `formatHex`
  - `hexToRgb`
  - `hexToAlpha`
  - `rgbToHsv`
  - `hsvToRgb`
- [x] 2. Create `src/composables/useZoom.ts`:
  - Wrap `editorStore.zoom`.
  - Expose `zoomIn()`, `zoomOut()`, `resetZoom()`, `zoomToLevel(level)`.
  - Treat zoom as logical scale; effective pixel size is `BASE_PIXEL_SIZE * zoom`.
- [x] 3. Create `src/composables/usePan.ts`:
  - Track `isPanning`.
  - Handle desktop pan via middle button or `Space + primary`.
  - Clamp movement so the canvas cannot leave the viewport entirely; allow a `32px` margin.
  - Expose helpers for centering-if-fit and for top-left reset at `(0, 0)` when the document does not fit.
- [x] 4. Create `src/composables/useTouchViewport.ts`:
  - Handle two-finger pan + pinch preview.
  - Allow translation and scale preview during the gesture.
  - Snap to the nearest discrete logical zoom step only on gesture end.
  - Recompute clamped pan after snapping.
- [x] 5. Create `src/components/editor/PixelCanvas.vue` (`<canvas>` element):
  - **Checkerboard:** draw once into a pattern canvas and cache `ctx.createPattern(..., 'repeat')`.
  - **Pixel loop:** iterate row-major pixels; skip transparent values via `isTransparentPixel`.
  - **Grid overlay:** render at all zoom levels when `gridVisible` is true.
  - **Hover/custom cursor:** show the tool target for all tools; hide the native cursor over the canvas.
  - **Cursor marker:** render the outlined target area for the active tool footprint.
  - **Preview layer:** accept optional `previewPixels: string[] | null` prop; render with `globalAlpha = 0.65`.
  - Canvas size: `width * renderScale` by `height * renderScale`.
  - Rendering trigger: `watchEffect` gated through `requestAnimationFrame`.
- [x] 6. Create `src/components/editor/CanvasViewport.vue`:
  - `overflow: hidden; position: relative` container.
  - Inner wrapper uses CSS `translate(...)` from `panOffset`.
  - Handles wheel-based zoom-to-cursor.
  - Attaches `usePan` and `useTouchViewport`.
  - On mount and document resets, center the canvas if it fits at current zoom; otherwise keep top-left at `(0, 0)`.
  - On zoom and viewport size changes, preserve the current pan and clamp it back into bounds.
- [x] 7. Create `src/components/editor/EditorShell.vue`:
  - CSS Grid three-column layout: left `240px`, center `1fr`, right `240px`.
  - Responsive: `< 768px` side panels stack below canvas.
  - For now, use stubs for document/actions and tool/color panels.
- [x] 8. Update `App.vue` to mount `EditorShell` inside a `100svh` flex container and bootstrap the untouched default `16x16` blank document into a transparent `32x32` workspace.
- [x] 9. Create `src/components/editor/StatusBar.vue`:
  - Shows cursor `(col, row)`, document size, logical zoom level, effective pixel size, and active tool.

## Verify

- Transparent `32x32` canvas shows checkerboard and grid at startup.
- Logical `+` and `-` zoom changes the effective pixel size from `8px` upward.
- Middle-mouse and `Space + drag` pan with clamp margin.
- Two-finger touch pans and previews pinch zoom, then snaps on gesture end.
- `G` toggles grid.
- Custom cursor replaces the native pointer and shows the tool outline.
- On zoom and viewport resize, pan stays clamped instead of auto-centering.
- Status bar updates correctly.
