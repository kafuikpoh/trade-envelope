import { redirect } from "@sveltejs/kit";
import { AuthError, safeNext, startAuthFlow, writeAuthFlow } from "#lib/server/auth.js";
import type { RequestHandler } from "./$types";

/**
 * Starts the authorization code flow. The verifier, state and nonce are written to a cookie scoped to
 * /callback, so the round trip through the provider needs no server-side store and nothing the browser
 * can read.
 */
export const GET: RequestHandler = async ({ url, cookies }) => {
  let authorizeUrl: string;
  try {
    const started = await startAuthFlow(safeNext(url.searchParams.get("next")));
    writeAuthFlow(cookies, started.flow);
    authorizeUrl = started.authorizeUrl;
  } catch (e) {
    if (e instanceof AuthError) redirect(303, `/login?error=${e.failure}`);
    throw e;
  }
  // The IdP is a different origin, so Kit needs the external flag to let the browser leave.
  redirect(303, authorizeUrl, { external: true });
};
