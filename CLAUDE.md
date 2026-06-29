# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UniMap is a single-page application that displays 10,000+ universities on an interactive dark-themed map. Users can search, filter by ranking/research, sort, and click into detail panels showing scores and metadata. Deployed to GitHub Pages.

## Commands

- **Dev server:** `npm run dev` (Vite on port 3000)
- **Build:** `npm run build` (outputs to `dist/`)
- **Preview production build:** `npm run preview`
- No test runner or linter is configured.

## Architecture

**Stack:** Vite 8, vanilla JS (no framework), Tailwind CSS v4 via `@tailwindcss/vite`, MapLibre GL JS.

**Boot sequence** (`src/main.js`): loads university JSON → initializes map → sidebar → detail panel → hides loader. All components receive the shared university dataset and/or the MapLibre instance at init.

**Inter-component communication:** Components communicate via `window.dispatchEvent` / `window.addEventListener` using custom events:
- `university:select` — fired when a university is clicked (from sidebar card, map marker, or detail panel); consumed by sidebar (highlights card) and detail panel (shows info)
- `university:focus` — fired from detail panel to fly the map to a university

**Data** (`src/utils/data.js`): Fetches `./data/universities.json` at runtime (file served from `public/data/`, not committed). The module caches the result and exports scoring helpers (`computeOverall`, `getScoreColor`, `getScoreColorClass`, `getFlagEmoji`, `formatNumber`, `debounce`). Overall score is the mean of five dimension scores (academic, research, employability, international, facilities).

**Components:**
- `src/components/map.js` — MapLibre map with CARTO dark raster tiles, HTML markers (logo or initials), hover popups, 3D pitch toggle, marker filtering/pulse animation. Exports `flyTo`, `highlightMarker`, `filterMarkers`.
- `src/components/sidebar.js` — Search (`/` shortcut), filter chips (all/top100/top500/research), country filter panel, sort toggle (rank/name/score), virtual-rendered list (max 200 displayed). Dispatches `university:select` on card click.
- `src/components/detail-panel.js` — Slide-in panel showing overall score bar, five dimension score bars, key info grid (founded, type, students, international %), website link, coordinates. Closes on Escape or close button.

**Styling:** Tailwind utilities in HTML + custom CSS in `src/styles/main.css` using CSS custom properties (`:root` design tokens for colors, radii, transitions). Score colors: green (≥80), blue (≥60), yellow (≥40), red (below).

**Deployment:** GitHub Actions workflow (`.github/workflows/deploy.yml`) runs `npm ci && npm run build` and deploys `dist/` to GitHub Pages on push to `main`.
