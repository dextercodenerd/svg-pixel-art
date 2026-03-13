# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**For general project structure, build commands, code style, and development guidelines, see [AGENTS.md](./AGENTS.md).**
/clera
This document covers domain-specific architecture and implementation details for the pixel-art editor.

## Architecture Overview

Client-only pixel-art editor SPA built with Vite 8, Vue 3, TypeScript, and Pinia. Tailwind CSS and Reka UI are installed; Phase 1 wires them into the build.

### Editor data model

The core type is `EditorDocument`:
```ts
{ version, width, height, pixels: string[], metadata? }
```
- `pixels` is a flat row-major array of `#RRGGBBAA` strings, length exactly `width * height`
- Transparent pixels stored as `#00000000` (never empty string — the plan mentions both; prefer explicit)
- Max canvas size: 256×256

### State management

- **Pinia** holds canonical editor state (document, active tool, history, palette)
- **Composables/services** handle: canvas interaction, keyboard shortcuts, import/export, draft persistence
- `HistoryState`: bounded snapshot history, cap of 50 full-document snapshots

### Persistence and export

- **Auto-save**: one current draft in `localStorage`, restored on reload
- **JSON export**: document only (no UI state), flat `pixels` array
- **SVG export**: one `<rect>` per non-transparent pixel; `fill-opacity` included when alpha < 1
- **PNG import**: reads native dimensions 1:1 into `#RRGGBBAA`; PNG export is post-v1

### Tools (v1)

`pencil` (with brush sizes) · `eraser` · `line` · `fill` (flood) · `eyedropper`

### Keyboard shortcuts (fixed set)

| Key | Action |
|-----|--------|
| P | Pencil |
| E | Eraser |
| L | Line |
| F | Fill |
| I | Eyedropper |
| X | Swap FG/BG |
| [/] | Decrease/increase brush size |
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Shift+Z | Redo |
| +/- | Zoom in/out |
| 0 | Reset zoom |
| G | Toggle grid |
| Ctrl/Cmd+S | Export JSON |
| Ctrl/Cmd+Shift+S | Export SVG |
| Ctrl/Cmd+O | Import file |

### UI layout

Three regions: document/actions area · central canvas workspace · tool/color/status panels (collapsible on small screens).

Use **Reka UI** only for accessibility-heavy primitives (dialogs, dropdowns, popovers, tooltips, sliders, switches, toggle groups). All editor-defining UI (canvas viewport, tool palette, RGBA controls, swatches, status bar) is custom Vue components.

