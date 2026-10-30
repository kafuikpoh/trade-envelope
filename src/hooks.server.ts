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

  return resolve(event);
};
