# AGENTS.md

This file provides guidance to the AI agent when working with code in this repository.

TradeEnvelope: SvelteKit 3 + Svelte 5 frontend for an external .NET trading API.

## Commands

- `npm run dev` / `npm run build` / `npm run check` (`check` = `svelte-kit sync && svelte-check`).
- There is no test suite and no ESLint/Prettier. `npm run check` is the only automated verification.
- Requires `.env` (`API_BASE_URL`, `API_SECRET`, `AUTH_ENABLED`, `KEYCLOAK_ISSUER_URL`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `AUTH_REDIRECT_BASE_URL`, `PUBLIC_APP_NAME`); default API is `http://localhost:5000`. See `.env.example` — the client secret has no default and is never committed.

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
- The browser never calls `API_BASE_URL` directly: it goes through the `/api/[...path]` proxy so the base URL and the bearer token stay server-side. Client code uses `call()` from `#lib/api/client.js`; server loaders use the helpers in `#lib/server/api.ts` (`api`, `apiParsed`, `send`, `soft`) — pick throwing (`api*`) vs non-throwing (`send`/`soft`) deliberately.
- `#lib/api/schemas.ts` mirrors the .NET contracts: PascalCase enum strings (`.NET` enum names), `DateOnly` as `"YYYY-MM-DD"` plain strings. Validate payloads with zod rather than trusting responses.

## Sign in (OIDC authorization code + PKCE, server-side only)

- SvelteKit is the relying party, hand-rolled in `#lib/server/auth.js` (discovery, PKCE, `userinfo`, provisioning) with **no OIDC library**. `id_token` is not validated; identity comes from `userinfo` in `getUserIdentity()` — replace that one function if the contract changes.
- The `session` cookie is an **opaque id into the in-memory store** in `#lib/server/session.js`, never the token. Keep it that way: a Keycloak user token is ~1.4 KB and would blow the 4 KB cookie budget, and `httpOnly` is what keeps the bearer out of the browser. The store is single-process — a restart signs everyone out, and more than one Node instance needs Redis or a table behind it.
- Flow: `/login/start` (sets the `authflow` cookie, `303` to Keycloak — needs `{ external: true }`) → `/callback` (endpoint, **never throws**; state check → code exchange → `userinfo` → `signIn()` → `POST /users/register`; any failure becomes `303 /login?error=…`) → `/logout` (GET and POST, clears the session then front-channels Keycloak's `end_session_endpoint`).
- `src/hooks.server.ts` hydrates `event.locals.user` and returns a JSON `401` for `/api/*` when `AUTH_ENABLED` and unsigned in — the choke point that stops the bearer reaching the browser. Do not bypass it by fetching from a component.
- A `401` now means "signed out" on every path: `api()`/`soft()` redirect to `/login?error=expired`, `call()` in `client.ts` does `goto("/login?next=…")`. Don't restore the old behaviour of swallowing `401` into empty data.
- Refresh tokens are deliberately not implemented: the realm's code flow does not issue one without `offline_access`, so sessions end with the access token (60 min in dev).

## UI

- shadcn-svelte (style `vega`, `neutral`, icons `@lucide/svelte`). Add/update components with `npx shadcn-svelte@latest add <name>` — do not hand-write replacements. They land in `src/lib/components/ui`.
- Multi-part components: `import * as Dialog from "#lib/components/ui/dialog"`. Single-component folders: named import, e.g. `import { Button } from "#lib/components/ui/button"`.
- Follow `.agents/skills/shadcn-svelte/SKILL.md` (no `space-*`, use `gap-*`; semantic tokens; `Field.FieldGroup`/`Field.Field` for forms; `data-icon` on icons in buttons).
- Use the project's status tokens from `src/routes/layout.css` (`viable`, `tight`, `doa` + their `-bg`/`-bd` variants) instead of raw Tailwind colors; use `.num`/`.col-head` for tabular figures.
- Route groups `(marketing)`, `(auth)`, `(app)` — place pages accordingly.
- The `(app)` guard in `src/routes/(app)/+layout.server.ts` is live: with `AUTH_ENABLED=true` it redirects unsigned traffic to `/login?next=…` and returns `{ user }` (a display-only projection — the identity subject stays server-side). With `AUTH_ENABLED=false` the guard is off, but the API still answers `401` without a bearer, so pages bounce to sign-in anyway; the flag only disables the route guard and the `/api/*` gate.
