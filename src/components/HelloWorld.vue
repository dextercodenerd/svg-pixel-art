<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useColorStore } from '../stores/color'
import { useEditorStore } from '../stores/editor'
import { useHistoryStore } from '../stores/history'
import { usePaletteStore } from '../stores/palette'

const editorStore = useEditorStore()
const colorStore = useColorStore()
const historyStore = useHistoryStore()
const paletteStore = usePaletteStore()

const { document, activeTool, brushSize, zoom, gridVisible } = storeToRefs(editorStore)
const { fg, bg, activeSlot } = storeToRefs(colorStore)
const { canUndo, canRedo } = storeToRefs(historyStore)
const { swatches } = storeToRefs(paletteStore)

const documentSummary = computed(
  () => `${document.value.width}x${document.value.height} • ${document.value.pixels.length} pixels`,
)
</script>

<template>
  <section
    class="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8"
  >
    <div class="grid w-full gap-6 lg:grid-cols-[1.3fr_0.9fr]">
      <article class="panel p-6 sm:p-8">
        <p class="eyebrow">Phase 1 foundation</p>
        <h1 class="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">SVG Pixel Art Editor</h1>
        <p class="mt-4 max-w-2xl text-base text-[var(--ink-soft)] sm:text-lg">
          Core editor contracts are wired in: shared types, Pinia stores, history snapshots, palette
          persistence, and the starter workspace shell for the next phases.
        </p>

        <div class="mt-8 grid gap-4 sm:grid-cols-2">
          <div class="status-card">
            <span class="status-label">Document</span>
            <strong class="status-value">{{ document.metadata.name }}</strong>
            <span class="status-detail">{{ documentSummary }}</span>
          </div>
          <div class="status-card">
            <span class="status-label">Viewport</span>
            <strong class="status-value">{{ zoom }}x zoom</strong>
            <span class="status-detail"
              >Grid {{ gridVisible ? 'on' : 'off' }}, brush {{ brushSize }}</span
            >
          </div>
          <div class="status-card">
            <span class="status-label">Tooling</span>
            <strong class="status-value">{{ activeTool }}</strong>
            <span class="status-detail"
              >Undo {{ canUndo ? 'ready' : 'empty' }}, redo {{ canRedo ? 'ready' : 'empty' }}</span
            >
          </div>
          <div class="status-card">
            <span class="status-label">Colors</span>
            <strong class="status-value">{{ activeSlot.toUpperCase() }} active</strong>
            <span class="status-detail">FG {{ fg }} • BG {{ bg }}</span>
          </div>
        </div>
      </article>

      <aside class="panel p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="eyebrow">Store snapshot</p>
            <h2 class="mt-2 text-2xl font-semibold tracking-tight">Ready for canvas work</h2>
          </div>
          <span
            class="rounded-full border border-[var(--panel-border-strong)] px-3 py-1 text-xs uppercase tracking-[0.22em] text-[var(--ink-soft)]"
          >
            Pinia
          </span>
        </div>

        <div class="mt-6 space-y-5 text-sm text-[var(--ink-soft)]">
          <div>
            <p class="text-xs uppercase tracking-[0.22em] text-[var(--ink-muted)]">Palette</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="swatch in swatches"
                :key="swatch"
                class="h-8 w-8 rounded-md border border-black/15 shadow-sm"
                :style="{ background: swatch }"
                :title="swatch"
              />
            </div>
          </div>

          <div class="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-inner)] p-4">
            <p class="text-xs uppercase tracking-[0.22em] text-[var(--ink-muted)]">Next up</p>
            <p class="mt-2 leading-6">
              Phase 2 can now build on stable document, history, and viewport state without
              revisiting the editor contracts.
            </p>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
