import { AUTH_ENABLED } from "$app/env/private";
import { readSession } from "#lib/server/session.js";
import type { Handle } from "@sveltejs/kit/hooks";

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = readSession(event.cookies)?.user ?? null;

  // The /api/[...path] catch-all forwards any method to any path, so this is the one choke point that
  // guarantees an unauthenticated browser never reaches the API.
  if (
    AUTH_ENABLED &&
    !event.locals.user &&
    event.url.pathname.startsWith("/api/")
  )
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });

  // Every document rendered here is either this desk's own data or a step of sign-in, so none of it may be
  // served back out of a browser cache. `no-store` also makes a document ineligible for Chrome's back/forward
  // cache: without it, Back after a sign-out restores the dashboard the browser still holds, and no request
  // ever reaches this server — so the (app) guard, which only runs on a request, never gets to answer.
  event.setHeaders({ "cache-control": "no-store" });
  return resolve(event);
};
