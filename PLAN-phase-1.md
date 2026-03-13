# Phase 1 — Foundation

**Goal:** Install dependencies, define all shared types, wire Pinia stores, and lock down the history/document contracts. `yarn build` passes with zero TS errors at phase end.

## Types (`src/types/index.ts`)

```ts
interface DocumentMetadata {
  name: string
  createdAt: string       // ISO 8601 UTC
  updatedAt: string       // ISO 8601 UTC
}

interface EditorDocument {
  version: 1
  width: number           // 1-256
  height: number          // 1-256
  pixels: string[]        // flat row-major; transparent = '' or '#00000000'
  metadata: DocumentMetadata
}

type ToolId = 'pencil' | 'eraser' | 'line' | 'fill' | 'eyedropper'
type ActiveColorSlot = 'fg' | 'bg'
type ZoomLevel = 1 | 2 | 4 | 8 | 16
type BrushSize = 1 | 2 | 3 | 4

const ZOOM_LEVELS: ZoomLevel[] = [1, 2, 4, 8, 16]
const BASE_PIXEL_SIZE = 8
const MAX_UNDO_STEPS = 50
const MAX_HISTORY_SNAPSHOTS = 51
const MAX_CANVAS_SIZE = 256
const TRANSPARENT = '#00000000'
const EMPTY_PIXEL = ''
const DEFAULT_DOCUMENT_NAME = 'untitled-svg-pixel-art'
```

History stores full `EditorDocument` snapshots, not just pixel arrays.

## Checklist

- [ ] 1. Install `tailwindcss`, `@tailwindcss/vite`, and `reka-ui`. Add `@tailwindcss/vite` to `vite.config.ts` plugins. Replace `style.css` body with `@import "tailwindcss";` plus editor theme custom properties.
- [ ] 2. Create `src/types/index.ts` with the shared types and constants above, plus helpers such as `isTransparentPixel(value)` and `normalizeTransparentPixel(value)`.
- [ ] 3. Create `src/stores/color.ts`:
  - State: `fg`, `bg`, `activeSlot`.
  - Defaults: `fg = '#000000ff'`, `bg = '#ffffffff'`, `activeSlot = 'fg'`.
  - Actions: `setFg`, `setBg`, `swap`, `setActiveSlot`.
- [ ] 4. Create `src/stores/history.ts`:
  - State: `snapshots: EditorDocument[]`, `index: number`.
  - Actions: `resetWith(document)`, `push(document)`, `undo()`, `redo()`, `clear()`.
  - Rules: clone on write, discard redo branch on new push, trim to `MAX_HISTORY_SNAPSHOTS`, support `50` undo steps plus current state.
  - Getters: `canUndo`, `canRedo`, `currentSnapshot`.
- [ ] 5. Create `src/stores/palette.ts`:
  - State: `swatches: string[]`.
  - Load from `localStorage` key `'pixel-art:palette'` on init.
  - Default to 8 neutral swatches.
  - Actions: `addSwatch` (max 32), `removeSwatch`, `updateSwatch`.
  - Persist automatically via `watch`.
- [ ] 6. Create `src/stores/editor.ts`:
  - State: `document`, `activeTool`, `brushSize`, `zoom`, `gridVisible`, `panOffset`.
  - Defaults: `activeTool = 'pencil'`, `brushSize = 1`, `zoom = 1`, `gridVisible = true`, `panOffset = { x: 0, y: 0 }`.
  - Actions: `newDocument`, `loadDocument`, `renameDocument`, `setPixels`, `setTool`, `setBrushSize`, `setZoom`, `toggleGrid`, `setGridVisible`, `setPan`, `resetViewState`.
  - Document-changing actions update `metadata.updatedAt`.
  - `newDocument` accepts an exact RGBA fill value or transparency.
- [ ] 7. Wire `createPinia()` in `src/main.ts`.
- [ ] 8. Strip `App.vue` and `HelloWorld.vue` to a minimal placeholder shell.

## Verify

- `yarn build` and `yarn lint` pass.
- `yarn dev` loads with no console errors.
- Pinia DevTools shows `editor`, `history`, `color`, and `palette` stores.
- History accepts full-document snapshots and caps correctly at `51` stored states.
