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

## Sign in (password grant today; the OIDC code + PKCE flow is finished but not the default)

- The path the desk uses is `/login`'s form action (`src/routes/(auth)/login/+page.server.ts`): credentials go to this server, this server posts them to the API's anonymous rate-limited `POST /users/login`, the bearer lands in the session store and the browser gets a `303` to `?next=`. Sending the password through here is the cost of that grant — the reason OIDC exists — so `/login` offers the provider link whenever `KEYCLOAK_CLIENT_SECRET` is set.
- Identity here is read off the access token's claims (`getIdentityFromAccessToken()`), **not** from `userinfo`. The API mints tokens through Keycloak's container address, so they carry `iss=http://identity:8080/realms/trade-envelope` while this process discovers Keycloak at `http://localhost:18080/...`, and `userinfo` answers `invalid_token` on that mismatch even though the API lists both issuers in `ValidIssuers`. Decoding is trust-on-receipt: the token only ever arrives from `API_BASE_URL` over a server-to-server call, never from the browser.
- `/login/start` → `/callback` (authorization code + PKCE, hand-rolled in `#lib/server/auth.js` with **no OIDC library**; `id_token` is not validated, identity comes from `userinfo` in `getUserIdentity()`) is verified working and stays in the tree, but needs the client secret and a registered post-logout redirect URI. Both paths must end in the same `signIn()` + `provisionUser()` so switching later changes only how the token is earned.
- The `session` cookie is an **opaque id into the in-memory store** in `#lib/server/session.js`, never the token. Keep it that way: a Keycloak user token is ~1.4 KB and would blow the 4 KB cookie budget, and `httpOnly` is what keeps the bearer out of the browser. The store is single-process — a restart signs everyone out, and more than one Node instance needs Redis or a table behind it.
- `/logout` clears the session and only front-channels Keycloak's `end_session_endpoint` for a session that has an `idToken` (i.e. came through OIDC) — telling the provider about a password-grant session would strand the desk on Keycloak's own page.
- `src/hooks.server.ts` hydrates `event.locals.user` and returns a JSON `401` for `/api/*` when `AUTH_ENABLED` and unsigned in — the choke point that stops the bearer reaching the browser. Do not bypass it by fetching from a component.
- A `401` now means "signed out" on every path: `api()`/`soft()` redirect to `/login?error=expired`, `call()` in `client.ts` does `goto("/login?next=…")`. Don't restore the old behaviour of swallowing `401` into empty data.
- Refresh tokens are not implemented, so a session ends with its access token (60 min in dev). `AccessTokenResponse` carries the token and nothing else — no `expires_in` — which is why the cookie's `maxAge` comes from the token's `exp` claim. (The older claim that the realm would not issue a refresh token without `offline_access` is wrong: checked 2026-10-31, the code flow returns one.)

## UI

- shadcn-svelte (style `vega`, `neutral`, icons `@lucide/svelte`). Add/update components with `npx shadcn-svelte@latest add <name>` — do not hand-write replacements. They land in `src/lib/components/ui`.
- Multi-part components: `import * as Dialog from "#lib/components/ui/dialog"`. Single-component folders: named import, e.g. `import { Button } from "#lib/components/ui/button"`.
- Follow `.agents/skills/shadcn-svelte/SKILL.md` (no `space-*`, use `gap-*`; semantic tokens; `Field.FieldGroup`/`Field.Field` for forms; `data-icon` on icons in buttons).
- Use the project's status tokens from `src/routes/layout.css` (`viable`, `tight`, `doa` + their `-bg`/`-bd` variants) instead of raw Tailwind colors; use `.num`/`.col-head` for tabular figures.
- Route groups `(marketing)`, `(auth)`, `(app)` — place pages accordingly.
- The `(app)` guard in `src/routes/(app)/+layout.server.ts` is live: with `AUTH_ENABLED=true` it redirects unsigned traffic to `/login?next=…` and returns `{ user }` (a display-only projection — the identity subject stays server-side). With `AUTH_ENABLED=false` the guard is off, but the API still answers `401` without a bearer, so pages bounce to sign-in anyway; the flag only disables the route guard and the `/api/*` gate.
