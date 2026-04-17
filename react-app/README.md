# React migration scaffold

This folder contains the new frontend target for Slaskecards.

## Goals

- Move the current static frontend toward React + TypeScript.
- Keep the live backend on Render.
- Deploy the built frontend to GitHub Pages.
- Migrate feature-by-feature instead of doing a risky rewrite in one pass.

## Quick start

1. Install Node 20 or newer.
2. Copy `.env.example` to `.env`.
3. Set `VITE_API_BASE_URL` to your Render backend.
4. Run `npm install`.
5. Run `npm run dev`.

## Current status

- Vite + React + TypeScript is scaffolded.
- API and WebSocket base URLs come from environment variables.
- Create game, join game, lobby players, and socket connection are wired.
- The old HTML/CSS/JS frontend still exists at the repo root until feature parity is reached.

## Next migration slices

1. Move card-hand rendering into a typed React component tree.
2. Port play, discard, and end-turn actions into API helpers and hooks.
3. Add a reducer or store for game state once the socket message map is complete.
4. Migrate auth and Stripe into separate feature modules.
5. Retire the legacy root files after the React app reaches parity.

