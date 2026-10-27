# AGENTS.md

This file provides guidance to the AI agent when working with code in this repository.

TradeEnvelope: SvelteKit 3 + Svelte 5 frontend for an external .NET trading API.

## Commands

- `npm run dev` / `npm run build` / `npm run check` (`check` = `svelte-kit sync && svelte-check`).
- There is no test suite and no ESLint/Prettier. `npm run check` is the only automated verification.
- Requires `.env` (`API_BASE_URL`, `API_SECRET`, `AUTH_ENABLED`, `PUBLIC_APP_NAME`); default API is `http://localhost:5000`.

## Kit config lives in vite.config.ts

There is intentionally no `svelte.config.js` — the adapter and compiler options are set inside the `sveltekit()` plugin in `vite.config.ts`. Don't create a `svelte.config.js`.

Runes mode is force-enabled for all project files. Use `$state` / `$derived` / `$effect` and `.svelte.ts` class files; never legacy `$:` labels or stores.

## Imports

- Alias is `#lib` (declared in `package.json` `imports`), **not** SvelteKit's usual `$lib`. `components.json` uses the same `#lib` aliases.
- Write specifiers with `.js` extensions even when importing `.ts` sources: `import { call } from "#lib/api/client.js"`.

## Environment variables

Declare vars in `src/env.ts` with `defineEnvVars` and read them from `$app/env/private` (or `$app/env/public`, with `public: true`). Do not use `$env/static/*`.

## API layer

- All pricing, ranking, viability, and coverage math belongs to the .NET API. The UI and `#lib/workstation.svelte.ts` hold view state only — never add business calculations client-side.
- The browser never calls `API_BASE_URL` directly: it goes through the `/api/[...path]` proxy so the base URL and `session` bearer token stay server-side. Client code uses `call()` from `#lib/api/client.js`; server loaders use the helpers in `#lib/server/api.ts` (`api`, `apiParsed`, `send`, `soft`) — pick throwing (`api*`) vs non-throwing (`send`/`soft`) deliberately.
- `#lib/api/schemas.ts` mirrors the .NET contracts: PascalCase enum strings (`.NET` enum names), `DateOnly` as `"YYYY-MM-DD"` plain strings. Validate payloads with zod rather than trusting responses.

## UI

- shadcn-svelte (style `vega`, `neutral`, icons `@lucide/svelte`). Add/update components with `npx shadcn-svelte@latest add <name>` — do not hand-write replacements. They land in `src/lib/components/ui`.
- Multi-part components: `import * as Dialog from "#lib/components/ui/dialog"`. Single-component folders: named import, e.g. `import { Button } from "#lib/components/ui/button"`.
- Follow `.agents/skills/shadcn-svelte/SKILL.md` (no `space-*`, use `gap-*`; semantic tokens; `Field.FieldGroup`/`Field.Field` for forms; `data-icon` on icons in buttons).
- Use the project's status tokens from `src/routes/layout.css` (`viable`, `tight`, `doa` + their `-bg`/`-bd` variants) instead of raw Tailwind colors; use `.num`/`.col-head` for tabular figures.
- Route groups `(marketing)`, `(auth)`, `(app)` — place pages accordingly.
- The `(app)` session guard in `src/routes/(app)/+layout.server.ts` is commented out on purpose and gated on `AUTH_ENABLED`; auth is unbuilt. Don't treat it as a bug or enable it without being asked.
