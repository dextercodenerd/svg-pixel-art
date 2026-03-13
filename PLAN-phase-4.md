# Phase 4 — Color System

**Goal:** FG/BG slots, active-slot selection for touch, HSV picker, RGBA sliders, hex input, and global editable palette.

## Checklist

- [ ] 1. Create `src/components/color/FgBgDisplay.vue`:
  - Two overlapping rounded squares (BG behind, FG front).
  - Each square opens `ColorPicker` for that slot.
  - Includes swap button wired to `colorStore.swap()`.
- [ ] 2. Create `src/components/color/ActiveColorSlotToggle.vue`:
  - Explicit `FG` / `BG` segmented control for touch workflows.
  - Writes to `colorStore.activeSlot`.
  - Keep visible on all platforms for consistency.
- [ ] 3. Create `src/components/color/HsvPicker.vue`:
  - Hue bar canvas.
  - Saturation/value square canvas.
  - Emits `update:modelValue` with `#RRGGBBAA`.
- [ ] 4. Create `src/components/color/RgbaSliders.vue`:
  - Four Reka UI Slider components for `R`, `G`, `B`, and `A`.
  - Channel backgrounds use CSS gradients.
  - Emits `update:modelValue`.
- [ ] 5. Create `src/components/color/HexInput.vue`:
  - Accept `#RRGGBBAA` or `#RRGGBB`.
  - Expand 6-digit input to `ff` alpha.
  - Validate on blur or Enter.
  - Show invalid state without mutating store values.
- [ ] 6. Create `src/components/color/ColorPicker.vue`:
  - Maintain `workingColor` locally.
  - Sync HSV, RGBA, and hex views bidirectionally.
  - Emit `confirm(color)` only on explicit confirm.
  - Support cancel with no store mutation.
  - Wrap in a Reka UI Popover or Dialog depending on space needs.
- [ ] 7. Create `src/components/color/ColorSwatch.vue`:
  - Button with checkerboard background and RGBA overlay.
  - Left-click sets `FG`.
  - Right-click sets `BG`.
  - Transparent swatches remain visible on checkerboard.
- [ ] 8. Create `src/components/color/PalettePanel.vue`:
  - Grid of swatches from `paletteStore.swatches`.
  - Left-click to `FG`, right-click to `BG`.
  - Hover remove affordance.
  - `+` button adds current `FG` as a swatch, up to `32`.
  - Store persists automatically via watcher.
- [ ] 9. Wire all color components into the right panel of `EditorShell`.

## Verify

- HSV, RGBA sliders, and hex field stay in sync inside the picker.
- `FG/BG` store values update only after picker confirmation.
- Picker cancel leaves colors unchanged.
- `X` swaps `FG/BG`.
- Active slot toggle controls touch drawing/fill/pick behavior.
- Palette swatches persist across reloads.
- Right-click on a swatch sets `BG`.
- Alpha slider controls transparency.
