import { isRedirect, redirect } from "@sveltejs/kit";
import {
  AuthError,
  clearAuthFlow,
  completeAuthFlow,
  readAuthFlow,
} from "#lib/server/auth.js";
import { provisionSelf } from "#lib/server/provision.js";
import { signIn, signOut } from "#lib/server/session.js";
import type { RequestHandler } from "./$types";

/**
 * The end of the OIDC redirect. Never throws: every failure has to land back on /login with a code the
 * desk can read, not on a stack-trace page whose URL still carries a spent authorisation code.
 */
export const GET: RequestHandler = async ({ url, cookies, request, fetch }) => {
  const fail = (reason: string): never => {
    clearAuthFlow(cookies);
    redirect(303, `/login?error=${encodeURIComponent(reason)}`);
  };

  // The flow cookie is single-use whether or not what came back is a response we can use.
  const flow = readAuthFlow(cookies);
  clearAuthFlow(cookies);
  if (!flow) return fail("idp");

  const idpError = url.searchParams.get("error");
  if (idpError) {
    console.warn(
      `Keycloak error: ${idpError} ${url.searchParams.get("error_description") ?? ""}`,
    );
    return fail("idp");
  }

  try {
    const { granted, user } = await completeAuthFlow(request, flow);
    // The session has to exist before provisioning is called: `forward()` reads the bearer from it, and
    // the API's claims transformation needs the desk row for every request that follows.
    signIn(cookies, user, granted);
    await provisionSelf(fetch, cookies);
  } catch (e) {
    if (isRedirect(e)) throw e;
    if (e instanceof AuthError) {
      // No profile, no valid audience or a dead token all mean the session would only fail on the next
      // page, so it ends here rather than half-open.
      if (
        e.failure === "profile" ||
        e.failure === "audience" ||
        e.failure === "expired"
      )
        signOut(cookies);
      console.warn(`sign-in failed: ${e.failure} — ${e.message}`);
      return fail(e.failure);
    }
    console.error("sign-in failed", e);
    return fail("idp");
  }

  redirect(303, flow.next ?? "/trades");
};
