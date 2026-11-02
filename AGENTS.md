# AGENTS.md

This file provides guidance to the AI agent when working with code in this repository.

TradeEnvelope: SvelteKit 3 + Svelte 5 frontend for an external .NET trading API.

## Commands

- `npm run dev` / `npm run build` / `npm run check` (`check` = `svelte-kit sync && svelte-check`).
- There is no test suite and no ESLint/Prettier. `npm run check` is the only automated verification.
- Requires `.env` (`API_BASE_URL`, `AUTH_ENABLED`, `KEYCLOAK_ISSUER_URL`, `KEYCLOAK_CLIENT_ID`, `AUTH_REDIRECT_BASE_URL`, `PUBLIC_APP_NAME`); defaults are in `src/env.ts` and match the compose stack. There is no client secret in this app — see Sign in.

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

## Sign in (OIDC authorization code + PKCE; the password grant and the API's `POST /users/login` are deleted)

- `/login` is provider-only: one button to `/login/start`. No credential ever reaches this server, so there is no form action to add back. `#lib/server/auth.ts` is `openid-client` (v6) — do not hand-roll PKCE or token validation again.
- Identity comes from the **validated `id_token`** (`userFromIdToken`), not from `userinfo` and not from the access token. The API's own `aud` is on the access token, which this process does not use for identity.
- The client is **public** (`token_endpoint_auth_method: "none"`) and holds no secret. The confidential client and its secret belong to the .NET API alone.
- Two things about the plain-http dev realm that will bite whoever edits this: (1) `allowInsecureRequests` must be passed as discovery's `execute` option — applying it to the returned `Configuration` fails, because the library refuses to make the http *discovery request* itself. (2) `redirect_uri` must be spelled out in `buildAuthorizationUrl`: this client has more than one redirect URI registered and Keycloak answers 400 for an authorize request that does not name one.
- The API accepts these tokens only because the realm's `trade-envelope-api` client scope is a **default** scope of the public client and mints `aud=trade-envelope-api`; the API pins that audience. Remove the scope and every signed-in API call 401s.
- After `signIn()`, `/callback` calls `provisionSelf()` (`POST /users/self`) — the API keys its `users` row off the token's subject, and nothing downstream works without that row. It carries no input: provisioning is claims-only.
- The `session` cookie is an **opaque id into the in-memory store** in `#lib/server/session.js`, never the token. Keep it that way: a Keycloak user token is ~1.4 KB and would blow the 4 KB cookie budget, and `httpOnly` is what keeps the bearer out of the browser. The store is single-process — a restart signs everyone out, and more than one Node instance needs Redis or a table behind it.
- Refresh is implemented and lives in the store, not in the cookie: a bearer within `REFRESH_SKEW_MS` of expiry is replaced before sending, one the API rejects gets exactly one forced refresh and one retry, and concurrent refreshes for a session share a single in-flight promise (rotation makes a second exchange fatal). A rejected refresh token is terminal — sign out, never retry it. The realm rotates refresh tokens and, in dev, does not reject a spent one.
- `/logout` clears the session and front-channels Keycloak's `end_session_endpoint` with an `id_token_hint`, so signing in again is not a silent re-login.
- `src/hooks.server.ts` hydrates `event.locals.user` and returns a JSON `401` for `/api/*` when `AUTH_ENABLED` and unsigned in — the choke point that stops the bearer reaching the browser. Do not bypass it by fetching from a component.
- `401` and `403` mean different things on every path: `401` is "signed out" (`api()`/`soft()` redirect to `/login?error=expired`, `call()` in `client.ts` does `goto("/login?next=…")`), `403` is a permission this desk lacks and stays on the page. Don't restore the old behaviour of swallowing `401` into empty data.

## UI

- shadcn-svelte (style `vega`, `neutral`, icons `@lucide/svelte`). Add/update components with `npx shadcn-svelte@latest add <name>` — do not hand-write replacements. They land in `src/lib/components/ui`.
- Multi-part components: `import * as Dialog from "#lib/components/ui/dialog"`. Single-component folders: named import, e.g. `import { Button } from "#lib/components/ui/button"`.
- Follow `.agents/skills/shadcn-svelte/SKILL.md` (no `space-*`, use `gap-*`; semantic tokens; `Field.FieldGroup`/`Field.Field` for forms; `data-icon` on icons in buttons).
- Use the project's status tokens from `src/routes/layout.css` (`viable`, `tight`, `doa` + their `-bg`/`-bd` variants) instead of raw Tailwind colors; use `.num`/`.col-head` for tabular figures.
- Route groups `(marketing)`, `(auth)`, `(app)` — place pages accordingly.
- The `(app)` guard in `src/routes/(app)/+layout.server.ts` is live: with `AUTH_ENABLED=true` it redirects unsigned traffic to `/login?next=…` and returns `{ user }` (a display-only projection — the identity subject stays server-side). With `AUTH_ENABLED=false` the guard is off, but the API still answers `401` without a bearer, so pages bounce to sign-in anyway; the flag only disables the route guard and the `/api/*` gate.
- Every document is served `cache-control: no-store` from `src/hooks.server.ts`, and `(app)/+layout.svelte` re-runs `refreshAll()` when `pageshow` reports `persisted`. Together they are the fix for "sign out, press Back, the desk is still looking at the dashboard": the header keeps Chrome out of the back/forward cache (verified — a restored document reports `persisted`), and the handler catches any browser that restores anyway. The guard cannot help on its own because a bfcache restore never reaches the server. Do not strip either half as redundant.
