import { isRedirect, redirect } from "@sveltejs/kit";
import {
  AuthError,
  clearAuthFlow,
  exchangeCode,
  getUserIdentity,
  provisionUser,
  readAuthFlow,
} from "#lib/server/auth.js";
import { signIn, signOut } from "#lib/server/session.js";
import type { RequestHandler } from "./$types";

/**
 * The end of the OIDC redirect. Never throws: every failure has to land back on /login with a code
 * the desk can read, not on a stack-trace page whose URL still carries a spent authorisation code.
 */
export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
  const fail = (reason: string): never => {
    clearAuthFlow(cookies);
    redirect(303, `/login?error=${encodeURIComponent(reason)}`);
  };

  const idpError = url.searchParams.get("error");
  if (idpError) {
    console.warn(`Keycloak error: ${idpError} ${url.searchParams.get("error_description") ?? ""}`);
    return fail("idp");
  }

  const flow = readAuthFlow(cookies);
  clearAuthFlow(cookies);
  const code = url.searchParams.get("code");
  if (!flow || !code || url.searchParams.get("state") !== flow.state) return fail("idp");

  try {
    const tokens = await exchangeCode(code, flow.verifier);
    const user = await getUserIdentity(tokens.accessToken);
    signIn(cookies, user, tokens.accessToken, tokens.idToken, tokens.expiresIn);
    await provisionUser(fetch, cookies, user);
  } catch (e) {
    if (isRedirect(e)) throw e;
    if (e instanceof AuthError) {
      // No row and no valid audience both mean the session would only 401 on the next page.
      if (e.failure === "profile" || e.failure === "audience") signOut(cookies);
      console.warn(`sign-in failed: ${e.failure} — ${e.message}`);
      return fail(e.failure);
    }
    console.error("sign-in failed", e);
    return fail("idp");
  }

  redirect(303, flow.next ?? "/trades");
};
