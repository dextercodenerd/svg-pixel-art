# Repository Guidelines

## Project Structure & Module Organization
This repository is a Vite 8 + Vue 3 + TypeScript single-page app. Application code lives in `src/`, with entry setup in `src/main.ts`, the root component in `src/App.vue`, and reusable UI in `src/components/`. Static assets used by the app live in `src/assets/`; files served directly by Vite belong in `public/`. Production output is generated into `dist/` and should not be edited by hand.

## Build, Test, and Development Commands
Use Yarn 4 for all package management and scripts.

- `yarn dev`: start the local Vite dev server with HMR.
- `yarn build`: run `vue-tsc -b` for type-checking, then produce a production build in `dist/`.
- `yarn preview`: serve the latest production build locally.
- `yarn lint`: run ESLint against `src/`.
- `yarn lint:fix`: apply safe ESLint fixes in `src/`.
- `yarn format`: rewrite source files with Prettier.
- `yarn format:check`: verify formatting without changing files.

## Coding Style & Naming Conventions
Follow the existing Vue SFC pattern with `<script setup lang="ts">` and use Vue 3's Composition API exclusively across the app. Pinia stores should always use setup-style composition stores (`defineStore('id', () => {})`), not the options/object store syntax. Prettier is the formatting source of truth: 2-space indentation, single quotes, no semicolons, trailing commas, 100-character line width, and LF endings. ESLint enforces additional rules such as mandatory curly braces. Use PascalCase for Vue component filenames (`HelloWorld.vue`), camelCase for variables and functions, and keep component logic, template, and styles grouped in the same `.vue` file when practical.

## Testing Guidelines
There is no automated test runner configured yet. Until one is added, treat `yarn build`, `yarn lint`, and `yarn format:check` as the minimum validation set before opening a PR. When test infrastructure is introduced, use Vitest as the default runner for TypeScript unit and integration tests, and pair Vue component tests with `@vue/test-utils`. Playwright is the likely future choice for end-to-end coverage, but it is not currently configured. When tests are introduced, place them under `tests/` and mirror the source structure where possible.

## Commit & Pull Request Guidelines
Current history uses short, imperative, sentence-case subjects such as `Refined the plan`. Keep commit messages concise and focused on one change. Pull requests should include a clear summary, validation steps you ran, and screenshots or short screen recordings for visible UI changes. Link related issues or planning docs when applicable.

## Configuration Notes
The repository uses Yarn Plug'n'Play, so prefer `yarn` over `npm`. Do not commit generated output from `dist/` or local editor artifacts.
