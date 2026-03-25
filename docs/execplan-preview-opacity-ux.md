# Improve live preview opacity and readability for paint tools

This ExecPlan (execution plan) is a living document. The sections
`Constraints`, `Tolerances`, `Risks`, `Progress`, `Surprises & Discoveries`,
`Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work
proceeds.

Status: DRAFT

## Purpose / big picture

The editor already stores and commits alpha compositing correctly, but the live
preview still needs tuning so it is easy to read at a glance. Very low-alpha
colors can still be hard to see, and the no-op marker for fully transparent
paint may be too subtle at some zoom levels.

After this change, a user should be able to pick colors across the full alpha
range and immediately understand what the tool will do before releasing the
pointer. Semi-transparent colors should look preview-like but remain visible.
Fully transparent paint should clearly communicate "nothing will be drawn"
without being mistaken for an erase preview.

## Constraints

- The committed pixel result must remain unchanged. This plan only adjusts live
  preview and readability, not stored compositing math.
- Fully transparent paint colors on pencil, line, and rectangle remain no-ops.
  Only the eraser deletes pixels.
- The current no-op marker language stays conceptually the same: empty-looking
  preview cells with an explicit strike-through indicator.
- No new runtime dependencies.
- Maximum canvas size remains 256x256. Preview rendering must stay bounded and
  performant at that size.
- Preserve the existing one-history-entry-per-stroke behavior and do not add
  per-pixel reactive state.

## Tolerances (exception triggers)

- Scope: if the work requires changes outside `src/services/colorUtils.ts`,
  `src/composables/useCanvasPointer.ts`, `src/components/editor/PixelCanvas.vue`,
  and related tests/docs, stop and escalate.
- Interface: if `PixelCanvas` needs more than one additional preview prop
  beyond the current mask/pixels inputs, stop and escalate.
- Performance: if the preview change requires more than one full-canvas extra
  draw pass, stop and escalate.
- Validation: if the right preview balance cannot be agreed from code/tests
  alone, stop after the manual browser checklist and present comparison options.

## Risks

- Risk: A stronger minimum preview opacity may make very low-alpha colors look
  more intense than the final committed result.
  Severity: medium. Likelihood: medium.
  Mitigation: Keep the preview helper explicit and centralized, cover it with
  unit tests, and verify the final feel manually at multiple alpha levels.

- Risk: The no-op marker can compete visually with the grid or checkerboard at
  low zoom.
  Severity: low. Likelihood: medium.
  Mitigation: Tune marker stroke colors and thickness in browser, and verify at
  zoom levels `1`, `4`, and `16`.

- Risk: Rectangle previews with transparent fill and opaque stroke may become
  visually noisy if both the fill no-op marker and the stroke preview appear at
  once.
  Severity: low. Likelihood: medium.
  Mitigation: Keep fill/stroke precedence explicit and validate the mixed case
  manually before closing the plan.

## Progress

- [ ] Stage A: Document the current preview behavior and choose the specific
      visual rules to tune.
- [ ] Stage B: Add or update unit tests for preview alpha mapping.
- [ ] Stage C: Adjust preview alpha mapping and/or marker styling.
- [ ] Stage D: Add or update integration tests for no-op preview behavior.
- [ ] Stage E: Run validation (`yarn test`, `yarn build`, `yarn format:check`,
      and `yarn lint` if the repo is lint-clean or as a known baseline check).
- [ ] Stage F: Manually verify preview readability in browser.

## Surprises & Discoveries

- None yet.

## Decision Log

- Decision: Treat this as a follow-up UX pass instead of reopening the alpha
  compositing implementation plan.
  Rationale: Stored compositing behavior is already correct. The remaining work
  is preview readability, which should be reviewable and shippable on its own.
  Date/Author: 2026-03-25.

## Outcomes & Retrospective

- Not started.

## Context and orientation

The current preview pipeline spans three files.

`src/services/colorUtils.ts` contains `toPreviewAbgr(value)`, which maps a
committed ABGR color into a preview ABGR color by scaling source alpha and
applying a minimum opacity floor.

`src/composables/useCanvasPointer.ts` decides which preview pixels and no-op
marker masks should be shown for line, rectangle, and pencil interactions.

`src/components/editor/PixelCanvas.vue` renders the document, overlay preview,
grid, no-op markers, and cursor. This is where readability work becomes
visible.

Existing automated coverage already checks preview helper behavior in
`tests/color-utils.test.ts` and pointer preview state in
`tests/canvas-pointer.test.ts`.

## Plan of work

### Stage A: Lock the visual rules

Read the current helper and rendering code, then write down the exact preview
rules before changing anything:

1. Non-zero alpha paint colors use the original RGB with a preview alpha that
   is derived from source alpha.
2. Fully transparent paint colors render no paint overlay and instead show
   explicit no-op markers.
3. Opaque colors may still use a slight preview reduction so the overlay feels
   like a preview rather than a committed pixel.
4. Rectangle stroke and fill previews must remain understandable when one part
   is drawable and the other is a no-op.

If these rules cannot be made consistent with the current `PixelCanvas`
rendering model, stop and escalate.

### Stage B: Tighten test coverage first

Before changing runtime behavior, add or refine tests in:

- `tests/color-utils.test.ts` for the preview alpha helper across these cases:
  opaque color, medium-alpha color, very low-alpha color, fully transparent
  color.
- `tests/canvas-pointer.test.ts` for mixed preview cases:
  transparent line, transparent pencil, rectangle with transparent fill and
  opaque stroke, and rectangle with transparent stroke and opaque fill if the
  UI allows it.

The goal is to encode the intended preview contract before tuning values.

### Stage C: Tune the preview helper and marker styling

Adjust the centralized preview behavior rather than spreading constants across
the codebase.

Expected implementation area:

- `src/services/colorUtils.ts`
- `src/components/editor/PixelCanvas.vue`

Preferred tuning order:

1. Keep RGB unchanged.
2. Tune the alpha floor and scale factor.
3. Only if needed, tune the no-op marker stroke color, stroke width, or draw
   order.

Do not change committed pixel math or store semantics.

### Stage D: Verify mixed tool scenarios

After the helper and marker updates are in place, re-check the tool-specific
preview composition in `src/composables/useCanvasPointer.ts`.

Focus on:

- line preview over existing pixels,
- pencil preview during a live stroke,
- rectangle stroke-only preview,
- rectangle mixed fill/stroke preview where one side is a no-op.

If the current `previewPixels` plus `previewNoopMask` model cannot express one
of these clearly, stop and document the gap before adding more state.

### Stage E: Validation

Run from `/Users/martinflorek/Documents/lavaray/svg-pixel-art`:

```plaintext
yarn test
yarn build
yarn format:check
yarn lint
```

If `yarn lint` still fails due to unrelated baseline issues, record that fact
and do not treat it as a blocker for this plan unless the new work adds more
lint errors.

### Stage F: Manual browser verification

Run `yarn dev`, open the app, and verify:

1. Opaque paint colors remain easy to distinguish from already-committed
   pixels.
2. Medium-alpha colors remain visible and look preview-like.
3. Very low-alpha colors are still visible enough to aim with.
4. Fully transparent pencil preview shows no-op markers and commits nothing.
5. Fully transparent line preview shows no-op markers and commits nothing.
6. Rectangle preview remains readable when stroke is drawable and fill is a
   no-op.
7. The marker remains legible at zoom levels `1`, `4`, and `16`.

## Validation and acceptance

Acceptance means all of the following are true:

- Automated tests covering preview helper behavior and pointer preview state
  pass.
- The preview remains performant on the maximum canvas size.
- Manual browser checks confirm that low-alpha and no-op previews are easier to
  read than before.

## Idempotence and recovery

This work is safe to retry. Preview constants and marker styling can be tuned
iteratively as long as each change remains covered by tests and is checked in
browser before finalizing.

## Interfaces and dependencies

No new dependencies are expected.

The preferred public surface remains:

- preview colors via `previewPixels`
- no-op indication via `previewNoopMask`

If that surface proves insufficient, stop and escalate before inventing a more
complex preview protocol.
