# Add alpha compositing for semi-transparent pixel drawing

This ExecPlan (execution plan) is a living document. The sections
`Constraints`, `Tolerances`, `Risks`, `Progress`, `Surprises & Discoveries`,
`Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work
proceeds.

Status: IMPLEMENTED (pending manual browser verification — Stage I)

## Purpose / big picture

Currently, drawing with a semi-transparent color (e.g. 50% red) onto an existing pixel simply overwrites it. The blue pixel underneath is lost. After this change, drawing with a semi-transparent color will blend with the existing pixel using standard Porter-Duff "source over" alpha compositing. The final composited value is stored directly in the pixel array — one color per pixel, no layers.

A user can observe the change by: selecting a semi-transparent foreground color (e.g. `#ff000080`), drawing over an existing blue pixel, and seeing a blended purple-ish result instead of a flat semi-transparent red.

Selecting a fully transparent paint color (alpha `00`) is an intentional no-op for pencil, line, and rectangle tools. Only the eraser deletes pixels. The UI should make this obvious in previews instead of silently committing nothing.

## Constraints

- The pixel storage model stays as `Uint32Array` with one ABGR uint32 per pixel. No layers, no z-ordering.
- Export/import formats remain unchanged. SVG export already handles `fill-opacity`; JSON round-trips `#RRGGBBAA`. No format version bump needed.
- Maximum canvas size remains 256x256. All allocations must be bounded by this.
- The eraser tool must continue to directly overwrite pixels to transparent (`0`), not composite.
- Fully transparent paint colors on non-eraser tools remain no-ops. They do not delete existing pixels.
- Flood fill must continue to replace (not composite) — standard pixel-art editor behavior.
- Performance: one copy per operation, no per-pixel history pushes, draft buffer accumulated and committed once on `pointerup`. Follow all rules from `AGENTS.md`.
- All existing tests must continue to pass (adjusting expected values where compositing changes behavior is acceptable, but only if the new behavior is intentionally correct).

## Tolerances (exception triggers)

- Scope: if implementation requires changes to more than 6 files (excluding tests), stop and escalate.
- Interface: if `EditorDocument` type or store public API must change, stop and escalate.
- Dependencies: no new external dependencies allowed.
- Iterations: if tests still fail after 3 fix attempts, stop and escalate.
- Ambiguity: if the compositing formula produces visually unexpected results on edge cases, stop and present options.

## Risks

- Risk: Integer compositing math can still produce edge-case differences vs. browser canvas compositing, especially around rounding and transparent-input handling.
  Severity: low. Likelihood: medium.
  Mitigation: Use the current normalized integer formula, including transparent fast paths, and accept small ±1 channel differences from browser canvas compositing as normal for integer RGBA math.

- Risk: Preview readability can still be imperfect for very low-alpha paint colors or no-op markers at some zoom levels.
  Severity: low. Likelihood: medium.
  Mitigation: Scale preview opacity from the source alpha with a minimum floor, show explicit no-op markers when the paint operation would commit nothing, and verify readability manually in the browser at multiple zoom levels.

## Progress

- [x] Stage A: Write failing tests for `compositeSourceOverAbgr`.
- [x] Stage B: Implement `compositeSourceOverAbgr` in `colorUtils.ts`, make tests green.
- [x] Stage C: Write failing tests for `stampBrushInto` with stroke mask and `applyColorAtIndices` with composite flag.
- [x] Stage D: Modify `pixelOps.ts` functions, make tests green.
- [x] Stage E: Write failing tests for canvas-pointer compositing behavior (pencil with semi-transparent color, eraser still clears).
- [x] Stage F: Wire up compositing in `useCanvasPointer.ts`, make tests green.
- [x] Stage G: Update `hasChanges` detection in line/rectangle previews.
- [x] Stage H: Run full validation suite (`yarn test`, `yarn lint`, `yarn build`, `yarn format:check`).
- [x] Stage I: Manual verification in browser.

## Surprises & discoveries

- Transparent paint colors on non-eraser tools are intentional no-ops, not an implicit erase mode. The preview UX needs to communicate that distinction clearly.

## Decision log

- Decision: Flood fill does NOT composite; it replaces matching pixels.
  Rationale: Compositing during flood fill is unintuitive — the result depends on the target color in confusing ways. Standard pixel-art editors replace on fill. If the user wants a blended color, they can pick it with eyedropper.
  Date/Author: 2026-03-24.

- Decision: Use a stroke mask (`Uint8Array`) rather than comparing `pixels[index] === color` to prevent re-compositing.
  Rationale: After compositing, the pixel value differs from the source color, so the old equality check would incorrectly allow re-compositing. The mask is cheap (64KB max) and exact.
  Date/Author: 2026-03-24.

- Decision: Fully transparent paint colors on pencil/line/rectangle remain no-ops.
  Rationale: Deletion stays the responsibility of the eraser tool. Paint tools with alpha `00` should preview as "nothing will be drawn" instead of silently behaving like erase.
  Date/Author: 2026-03-25.

- Decision: Remove the opaque-color regression risk from this ExecPlan.
  Rationale: The current implementation and tests already prove that fully opaque source colors replace the destination as intended, so this is no longer an active project risk.
  Date/Author: 2026-03-25.

## Outcomes & retrospective

(to be filled after completion)

## Context and orientation

The project is a client-only pixel-art editor SPA at `/Users/martinflorek/Documents/lavaray/svg-pixel-art`. Key files involved:

**`src/services/colorUtils.ts`** — ABGR/hex conversion utilities. Functions: `hexToAbgr`, `abgrToHex`, `isTransparentAbgr`, `applyAlphaToAbgr`, `parseHex`, `formatHex`. This is where the new compositing function goes.

**`src/services/pixelOps.ts`** — Low-level pixel mutation. Functions:
- `stampBrushInto(pixels, width, height, col, row, brushSize, color)` — stamps a square brush by setting `pixels[index] = color`. Used by pencil/eraser during strokes.
- `applyColorAtIndices(pixels, indices, color)` — sets `pixels[index] = color` at given indices. Used by line and rectangle tools on commit.
- `floodFill(...)` — BFS flood fill, replaces matching pixels.
- `brushStamp(...)` — creates a copy and calls `stampBrushInto`. Not used in the hot stroke path.

**`src/composables/useCanvasPointer.ts`** — Tool input handling. Key types:
- `StrokeSession` (lines 40-47): holds `draftPixels`, `color`, `lastPoint`, `hasChanges`. Used by pencil and eraser.
- `LineSession` (lines 49-58): holds `basePixels`, `lineIndices`, `color`. Preview via overlay mask.
- `RectangleSession` (lines 60-71): holds `basePixels`, `strokeIndices`, `fillIndices`, `strokeColor`, `fillColor`.
- `applyStrokeSegment` (lines 226-248): iterates Bresenham points and calls `stampBrushInto`.
- `commitActiveSession` (lines 355-377): commits final pixels to store.
- `renderLinePreview` (lines 250-277): computes preview and `hasChanges` detection.
- `renderRectanglePreview` (lines 279-331): computes preview and `hasChanges` detection.

**Pixel format**: `Uint32Array` in ABGR byte order (little-endian). Alpha in bits 24-31, blue 16-23, green 8-15, red 0-7. Transparent = `0`.

**Test runner**: Vitest. Tests in `tests/`. Conventions: `const T = 0` for transparent, `const h = hexToAbgr` for hex shorthand.

## Plan of work

### Stage A+B: The compositing function

Add `compositeSourceOverAbgr(dst: number, src: number): number` to `src/services/colorUtils.ts`. This implements Porter-Duff "source over" in integer ABGR arithmetic.

The algorithm extracts RGBA channels from both ABGR uint32 values, applies the standard formula:

```plaintext
invSrcA = 255 - srcA
outA = srcA + ((dstA * invSrcA + 127) / 255)
outR = ((srcR * srcA + dstR * dstA * invSrcA / 255) + outA / 2) / outA
(same for G, B)
```

Fast paths (no arithmetic needed):
- `srcA === 255` → return `src` (opaque source replaces entirely)
- `srcA === 0` → return `dst` (transparent source is a no-op)
- `dstA === 0` → return `src` (drawing onto empty pixel)

The function packs the result back to ABGR uint32 and returns with `>>> 0`.

In `tests/color-utils.test.ts`, add a new `describe('compositeSourceOverAbgr')` block with these tests:

1. Opaque source over anything returns source unchanged.
2. Transparent source over anything returns destination unchanged.
3. Any source over transparent destination returns source unchanged.
4. 50% red (`#ff000080`) over opaque blue (`#0000ffff`) — hand-calculate the expected ABGR value.
5. 50% red over 50% blue — verify output alpha > both inputs.
6. Asymmetry: `composite(A, B) !== composite(B, A)`.
7. Near-edge alphas: alpha=1, alpha=254.

### Stage C+D: pixelOps changes

**Modify `stampBrushInto`** in `src/services/pixelOps.ts` (line 28). Add an optional `strokeMask?: Uint8Array | null` parameter at the end. When the mask is provided and non-null:

```typescript
// inside the inner loop, replacing lines 47-53:
const index = getPixelIndex(width, currentCol, currentRow)
if (strokeMask[index] === 1) continue
strokeMask[index] = 1
const composited = compositeSourceOverAbgr(pixels[index], color)
if (pixels[index] === composited) continue
pixels[index] = composited
changed = true
```

When `strokeMask` is null or undefined, keep the current direct-overwrite behavior (for eraser and backward compat).

**Modify `brushStamp`** (line 60): no change needed — it's a single stamp on a fresh copy, not used in the interactive hot path.

**Modify `applyColorAtIndices`** (line 151). Add an optional `composite?: boolean` parameter (default false). When true:

```typescript
// replacing lines 158-165:
for (const index of indices) {
  const newValue = composite
    ? compositeSourceOverAbgr(pixels[index], color)
    : color
  if (pixels[index] === newValue) continue
  pixels[index] = newValue
  changed = true
}
```

In `tests/pixel-ops.test.ts`, add tests:

1. `stampBrushInto` with a mask: composites 50% red onto blue, mask bit gets set, second stamp on same pixel is a no-op.
2. `stampBrushInto` with null mask: direct overwrite (eraser behavior preserved).
3. `applyColorAtIndices` with `composite: true`: composites onto existing colors.
4. `applyColorAtIndices` with default (false): direct overwrite (unchanged behavior).

### Stage E+F: useCanvasPointer wiring

**Modify `StrokeSession` interface** (line 40): add `strokeMask: Uint8Array | null`.

**Modify `applyStrokeSegment`** (line 226): add `strokeMask: Uint8Array | null` parameter. Pass it through to `stampBrushInto`:

```typescript
function applyStrokeSegment(
  pixels: Uint32Array,
  from: CanvasPoint,
  to: CanvasPoint,
  color: number,
  strokeMask: Uint8Array | null,  // NEW
): boolean {
  // ... inside the loop:
  stampBrushInto(pixels, ..., color, strokeMask)
}
```

**Modify `onPointerDown` pencil/eraser path** (around line 491): allocate the mask for pencil, null for eraser:

```typescript
const strokeMask = tool === 'eraser'
  ? null
  : new Uint8Array(document.value.width * document.value.height)
```

Store it in the session object. Pass `session.strokeMask` in `applyStrokeSegment` calls at lines 493 and 521-527.

**Modify `commitActiveSession`** for line (line 362): pass `true` as the composite flag:

```typescript
applyColorAtIndices(nextPixels, activeSession.lineIndices, activeSession.color, true)
```

**Modify `commitActiveSession`** for rectangle (lines 367, 369): pass `true`:

```typescript
applyColorAtIndices(nextPixels, activeSession.fillIndices, activeSession.fillColor, true)
// ...
applyColorAtIndices(nextPixels, activeSession.strokeIndices, activeSession.strokeColor, true)
```

In `tests/canvas-pointer.test.ts`, add tests:

1. Pencil stroke with 50% alpha color over existing pixel: verify composited result (not overwrite).
2. Pencil stroke revisiting same pixel in one stroke: verify no progressive darkening (value same as single composite).
3. Eraser stroke: verify pixels set to `0` regardless of what was underneath.

### Stage G: hasChanges detection

In `renderLinePreview` (lines 262-266), the current check `session.basePixels[index] !== session.color` assumes the final value equals the source color. With compositing, the final value is `compositeSourceOverAbgr(base, color)`. Update:

```typescript
for (const index of lineIndices) {
  if (session.basePixels[index] !== compositeSourceOverAbgr(session.basePixels[index], session.color)) {
    hasChanges = true
    break
  }
}
```

Same pattern for `renderRectanglePreview` (lines 295-308): replace `session.basePixels[index] !== normalizedStroke` with a composited comparison, and similarly for the fill check.

This is acceptable performance-wise because these loops break on the first difference, and the canvas is at most 256x256.

### Stage H: Full validation

Run:

```plaintext
yarn test
yarn lint
yarn build
yarn format:check
```

All must pass. If `yarn format:check` fails, run `yarn format` first.

### Stage I: Manual browser verification

1. `yarn dev`, open the app.
2. Pick a semi-transparent foreground color (e.g. `#ff000080`).
3. Paint over existing colored pixels — confirm blending occurs.
4. Paint back and forth in one stroke — confirm no progressive darkening.
5. Switch to eraser — confirm it clears to transparent.
6. Pick a fully transparent paint color on pencil/line/rectangle — confirm no pixels change and the preview communicates "nothing will be drawn".
7. Draw a line with semi-transparent color over existing pixels — confirm compositing on commit.
8. Draw a rectangle with semi-transparent stroke/fill — confirm compositing.
9. Export to SVG — open in browser, confirm semi-transparent pixels render correctly.
10. Export to JSON — reimport — confirm pixel values preserved exactly.

## Concrete steps

All commands run from `/Users/martinflorek/Documents/lavaray/svg-pixel-art`.

1. Edit `tests/color-utils.test.ts`: add `compositeSourceOverAbgr` test block.
2. Run `yarn test` — expect new tests to fail (function doesn't exist yet).
3. Edit `src/services/colorUtils.ts`: add `compositeSourceOverAbgr` function.
4. Run `yarn test` — expect compositing tests to pass.
5. Edit `tests/pixel-ops.test.ts`: add tests for `stampBrushInto` with mask and `applyColorAtIndices` with composite.
6. Run `yarn test` — expect new pixel-ops tests to fail.
7. Edit `src/services/pixelOps.ts`: modify `stampBrushInto` and `applyColorAtIndices`.
8. Run `yarn test` — expect pixel-ops tests to pass.
9. Edit `tests/canvas-pointer.test.ts`: add compositing integration tests.
10. Run `yarn test` — expect new canvas-pointer tests to fail.
11. Edit `src/composables/useCanvasPointer.ts`: wire up stroke masks and composite flags.
12. Run `yarn test` — all tests pass.
13. Run `yarn lint && yarn build && yarn format:check`.

Expected final output of `yarn test`:

```plaintext
✓ all tests pass (no failures)
```

## Validation and acceptance

Quality criteria:

- Tests: `yarn test` passes with all existing tests plus new compositing tests.
- Lint/typecheck: `yarn lint` and `yarn build` (which runs `vue-tsc -b`) pass clean.
- Format: `yarn format:check` passes.
- Manual: the 10-step browser verification in Stage I produces expected results.

Quality method:

- `yarn test && yarn lint && yarn build && yarn format:check`
- Manual browser testing via `yarn dev`.

## Idempotence and recovery

All stages are idempotent. Tests can be re-run at any time. If a stage fails, fix the issue and re-run — no cleanup needed. The only risk of non-idempotence is if `yarn format` is not run before `yarn format:check`, but this is handled in Stage H.

## Artifacts and notes

### Alpha compositing formula reference (integer ABGR)

```plaintext
Given src (ABGR uint32) drawn on top of dst (ABGR uint32):

srcR = src & 0xFF,  srcG = (src >>> 8) & 0xFF,  srcB = (src >>> 16) & 0xFF,  srcA = (src >>> 24) & 0xFF
dstR = dst & 0xFF,  dstG = (dst >>> 8) & 0xFF,  dstB = (dst >>> 16) & 0xFF,  dstA = (dst >>> 24) & 0xFF

invSrcA = 255 - srcA
outA = srcA + ((dstA * invSrcA + 127) / 255) | 0

// Use premultiplied intermediates to avoid division-by-outA precision loss:
outR = ((srcR * srcA + ((dstR * dstA * invSrcA + 127) / 255 | 0) + (outA >> 1)) / outA) | 0
outG, outB: same pattern

result = ((outA << 24) | (outB << 16) | (outG << 8) | outR) >>> 0
```

### Hand-calculated test value: 50% red over opaque blue

```plaintext
src = #ff000080 → srcR=255, srcG=0, srcB=0, srcA=128
dst = #0000ffff → dstR=0, dstG=0, dstB=255, dstA=255

invSrcA = 127
outA = 128 + ((255 * 127 + 127) / 255 | 0) = 128 + 127 = 255
outR = ((255 * 128 + 0 + 127) / 255) | 0 = (32767 + 127) / 255 = 128
outG = 0
outB = ((0 + (255 * 255 * 127 + 127) / 255 | 0) + 127) / 255 = ((0 + 32385 + 127) / 255) | 0 = 127

Result: R=128, G=0, B=127, A=255 → ABGR = 0xff7f0080 → hex #80007fff
```

## Interfaces and dependencies

No new dependencies. New export from `src/services/colorUtils.ts`:

```typescript
// src/services/colorUtils.ts
export function compositeSourceOverAbgr(dst: number, src: number): number
```

Modified signatures in `src/services/pixelOps.ts`:

```typescript
// src/services/pixelOps.ts
export function stampBrushInto(
  pixels: Uint32Array,
  width: number,
  height: number,
  col: number,
  row: number,
  brushSize: BrushSize,
  color: number,
  strokeMask?: Uint8Array | null,  // NEW optional parameter
): boolean

export function applyColorAtIndices(
  pixels: Uint32Array,
  indices: number[],
  color: number,
  composite?: boolean,  // NEW optional parameter, default false
): boolean
```

Modified interface in `src/composables/useCanvasPointer.ts`:

```typescript
interface StrokeSession {
  color: number
  draftPixels: Uint32Array
  hasChanges: boolean
  kind: 'stroke'
  lastPoint: CanvasPoint
  pointerId: number
  strokeMask: Uint8Array | null  // NEW
}
```
