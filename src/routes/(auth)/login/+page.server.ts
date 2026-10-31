import { fail, isRedirect, redirect } from "@sveltejs/kit";
import { z } from "zod";
import { KEYCLOAK_CLIENT_SECRET } from "$app/env/private";
import { LoginResponse } from "#lib/api/schemas.js";
import { send } from "#lib/server/api.js";
import {
  AuthError,
  getIdentityFromAccessToken,
  provisionUser,
  safeNext,
  tokenLifetimeSeconds,
} from "#lib/server/auth.js";
import { signIn, signOut } from "#lib/server/session.js";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ url }) => ({
  error: url.searchParams.get("error") ?? undefined,
  next: safeNext(url.searchParams.get("next")),
  // /login/start throws `config` until KEYCLOAK_CLIENT_SECRET is set, so the provider link would only
  // ever land the user back here with an error.
  oidc: Boolean(KEYCLOAK_CLIENT_SECRET),
});

const credentials = z.object({
  email: z.string().trim().min(1, "Enter the address you sign in with"),
  password: z.string().min(1, "Enter your password"),
});

// The password grant, server-side: the browser posts credentials to *this* action, and this action
// posts them to the API. The bearer that comes back is stored in the session map and never reaches
// the page — the same shape the OIDC callback lands in, reached without leaving the origin.
export const actions: Actions = {
  default: async ({ request, cookies, fetch, url }) => {
    const form = await request.formData();
    const parsed = credentials.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      return fail(400, { error: "fields" });
    }

    try {
      const sent = await send(fetch, cookies, "POST", "/users/login", parsed.data);
      if (!sent.ok) {
        // 401 is the provider's verdict on the password, so it gets its own code and does not get
        // reported as an outage. Anything else — 502, 400, a contract break — is ours to report.
        return fail(sent.status === 401 ? 401 : 502, {
          error: sent.status === 401 ? "credentials" : "idp",
        });
      }

      const token = LoginResponse.safeParse(sent.data);
      if (!token.success) {
        console.warn("users/login contract mismatch", token.error.issues[0]);
        return fail(502, { error: "idp" });
      }

      const accessToken = token.data.accessToken;
      const user = getIdentityFromAccessToken(accessToken);
      // The session has to exist before `register` is called: `forward()` reads the bearer from it, and
      // the API's claims transformation needs the desk row for every request that follows.
      signIn(cookies, user, accessToken, undefined, tokenLifetimeSeconds(accessToken));
      await provisionUser(fetch, cookies, user);

      redirect(
        303,
        safeNext(String(form.get("next") ?? url.searchParams.get("next"))) ??
          "/trades",
      );
    } catch (e) {
      if (isRedirect(e)) throw e;
      if (e instanceof AuthError) {
        // A session whose profile or audience the API will not accept only 401s on the next page.
        if (e.failure === "profile" || e.failure === "audience") signOut(cookies);
        console.warn(`sign-in failed: ${e.failure} — ${e.message}`);
        return fail(502, { error: e.failure });
      }
      console.error("sign-in failed", e);
      return fail(502, { error: "idp" });
    }
  },
};
