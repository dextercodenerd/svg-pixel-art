# Phase 2 — Canvas Rendering

**Goal:** Pixel canvas visible with checkerboard, discrete zoom, pan, grid overlay, hover preview. No drawing yet.

## Coordinate Mapping

```
relX = e.clientX - viewportRect.left
relY = e.clientY - viewportRect.top
col = Math.floor((relX - panOffset.x) / zoom)
row = Math.floor((relY - panOffset.y) / zoom)
```

## Zoom-to-Cursor Pan Adjustment

```
oldCol = (cursorX - panOffset.x) / oldZoom
newPanX = cursorX - oldCol * newZoom   // keep pixel under cursor stable
```

## Checklist

- [ ] 1. Create `src/services/colorUtils.ts` — pure functions: `parseHex`, `formatHex`, `hexToRgb` (RGB portion only), `hexToAlpha` (0–1), `rgbToHsv`, `hsvToRgb`.
- [ ] 2. Create `src/composables/useZoom.ts` — wraps `editorStore.zoom`; exposes `zoomIn()`, `zoomOut()`, `resetZoom()` cycling through `ZOOM_LEVELS`.
- [ ] 3. Create `src/composables/usePan.ts` — tracks `isPanning`; handles `pointerdown` (middle button OR Space+primary), `pointermove` delta → `editorStore.setPan`, `pointerup`, `keydown/keyup` for Space. Exposes event handlers to attach to the viewport.
- [ ] 4. Create `src/components/editor/PixelCanvas.vue` (`<canvas>` element):
   - **Checkerboard:** draw once into an `OffscreenCanvas(16,16)` (8px light/dark grey squares), call `ctx.createPattern(…, 'repeat')`, cache it. Fill entire canvas with pattern before each pixel pass.
   - **Pixel loop:** `for i in pixels: if pixel !== TRANSPARENT: fillRect(col*zoom, row*zoom, zoom, zoom)`.
   - **Grid overlay:** draw when `gridVisible && zoom >= 4`; single `beginPath()` loop over all boundary lines; 1px semi-transparent stroke.
   - **Hover preview:** highlight pixel under cursor with 50% opacity overlay.
   - **Preview layer:** accept optional `previewPixels: string[] | null` prop; render with `globalAlpha = 0.65` on top.
   - Canvas size: `width * zoom` × `height * zoom`. Recalculate on zoom or document size change.
   - Rendering trigger: `watchEffect` → `requestAnimationFrame` gated (coalesce rapid updates).
- [ ] 5. Create `src/components/editor/CanvasViewport.vue` — `overflow: hidden; position: relative` container. CSS-transforms inner `<div>` by `translate(panOffset.x, panOffset.y)`. Handles `wheel` for zoom-to-cursor (anchor math above). Attaches `usePan` event handlers.
- [ ] 6. Create `src/components/editor/EditorShell.vue` — CSS Grid three-column layout: left `240px` (actions/history stubs), center `1fr` (CanvasViewport), right `240px` (tool/color stubs). Responsive: `< 768px` → side panels stack below canvas.
- [ ] 7. Update `App.vue` to mount `EditorShell` inside a `100svh` flex container; initialize with a default `32×32` blank document.
- [ ] 8. Create `src/components/editor/StatusBar.vue` — shows cursor (col, row), document size, zoom level, active tool.

## Verify

- 32×32 blank canvas shows checkerboard.
- `+`/`-` cycle zoom; canvas resizes.
- Middle-mouse and Space+drag pan.
- `G` toggles grid lines at zoom ≥ 4.
- Hover highlights pixel.
- StatusBar updates.
