# Phase 4 — Color System

**Goal:** FG/BG slots, HSV picker, RGBA sliders, hex input, and global editable palette.

## Checklist

- [ ] 1. Create `src/components/color/FgBgDisplay.vue` — two overlapping rounded squares (BG behind, FG front), each clickable to open `ColorPicker` popover targeting that slot. Swap button calls `colorStore.swap()`.
- [ ] 2. Create `src/components/color/HsvPicker.vue` — two canvas elements:
   - **Hue bar:** `hsl(h, 100%, 50%)` gradient across 360°; pointer drag sets hue.
   - **SV square:** white→transparent left-to-right over black→transparent top-to-bottom over current hue background; drag sets S and V.
   Emits `update:modelValue` with `#RRGGBBAA` string.
- [ ] 3. Create `src/components/color/RgbaSliders.vue` — four Reka UI Slider components (R, G, B: 0–255; A: 0–255); each slider background is a CSS gradient for its channel. Emits `update:modelValue`.
- [ ] 4. Create `src/components/color/HexInput.vue` — `<input>` accepting `#RRGGBBAA` (8 hex) or `#RRGGBB` (expands to `ff` alpha); validates on blur/Enter; red border on invalid; emits `update:modelValue` only on valid input.
- [ ] 5. Create `src/components/color/ColorPicker.vue` — manages `workingColor` locally; syncs bidirectionally between HsvPicker, RgbaSliders, and HexInput (any one update propagates to all others); emits `confirm(color)`. Wrapped in a Reka UI Popover.
- [ ] 6. Create `src/components/color/ColorSwatch.vue` — `<button>` with CSS checkerboard background + `rgba` color overlay div. Emits `click` (FG) and `contextmenu` (BG, preventDefault).
- [ ] 7. Create `src/components/color/PalettePanel.vue` — grid of `ColorSwatch` components from `paletteStore.swatches`; left-click → FG, right-click → BG; hover shows remove button; `+` button adds current FG as new swatch (max 32); persists automatically via store watcher.
- [ ] 8. Wire all color components into the right panel of `EditorShell`.

## Verify

- HSV, RGBA sliders, and hex field stay in sync as any one changes.
- FG/BG display updates when drawing or eyedropping.
- `X` swaps FG/BG.
- Palette swatches persist across reloads.
- Right-click on swatch sets BG.
- Alpha slider controls transparency.
