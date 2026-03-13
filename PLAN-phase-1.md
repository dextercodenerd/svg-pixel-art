# Phase 1 — Foundation

**Goal:** Install dependencies, define all types, wire Pinia stores, localStorage draft, and new-document dialog. `yarn build` passes with zero TS errors at phase end.

## Types (`src/types/index.ts`)

```ts
interface EditorDocument {
  version: 1
  width: number            // 1–256
  height: number           // 1–256
  pixels: string[]         // flat row-major #RRGGBBAA; transparent = '#00000000'
  metadata?: { name?: string; createdAt?: string }
}

type ToolId = 'pencil' | 'eraser' | 'line' | 'fill' | 'eyedropper'
type ZoomLevel = 1 | 2 | 4 | 8 | 16
type BrushSize = 1 | 2 | 3 | 4

const ZOOM_LEVELS: ZoomLevel[] = [1, 2, 4, 8, 16]
const MAX_HISTORY = 50
const MAX_CANVAS_SIZE = 256
const TRANSPARENT = '#00000000'
```

History stores only the `pixels` array per snapshot (not full document) to minimize memory.

## Checklist

- [ ] 1. Install `tailwindcss @tailwindcss/vite` (dev) and `reka-ui`. Add `@tailwindcss/vite` to `vite.config.ts` plugins. Replace `style.css` body with `@import "tailwindcss";` plus editor theme custom properties (dark background, accent color).
- [ ] 2. Create `src/types/index.ts` with all types and constants above.
- [ ] 3. Create `src/stores/color.ts` — state: `fg` (default `'#000000ff'`), `bg` (default `'#ffffffff'`); actions: `setFg`, `setBg`, `swap`.
- [ ] 4. Create `src/stores/history.ts` — state: `snapshots: string[][]`, `index: number`; actions: `push(pixels)` (clone, append, trim to 50, advance index), `undo()`, `redo()`, `clear()`; getters: `canUndo`, `canRedo`.
- [ ] 5. Create `src/stores/palette.ts` — state: `swatches: string[]` (load from `localStorage` key `'pixel-art:palette'` on init; default 8 neutral swatches); actions: `addSwatch` (max 32), `removeSwatch`, `updateSwatch`; auto-persist via `watch`.
- [ ] 6. Create `src/stores/editor.ts` — state: `document`, `activeTool`, `brushSize`, `zoom`, `gridVisible`, `panOffset`; actions: `newDocument(w, h, fill?)`, `loadDocument(doc)`, `setPixels(pixels)`, `setTool`, `setBrushSize`, `setZoom`, `toggleGrid`, `setPan`. `newDocument` pushes initial snapshot to history.
- [ ] 7. Wire `createPinia()` in `src/main.ts`.
- [ ] 8. Strip `App.vue` and `HelloWorld.vue` to a minimal placeholder.

## Verify

- `yarn build` + `yarn lint` pass.
- `yarn dev` loads with no console errors.
- Pinia DevTools shows all four stores.
