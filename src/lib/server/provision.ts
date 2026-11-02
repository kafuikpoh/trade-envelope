import { send } from "#lib/server/api.js";
import { AuthError } from "#lib/server/auth.js";
import type { Cookies } from "@sveltejs/kit";

/**
 * The API keys its own `users` row off the identity subject, and nothing downstream works without it:
 * its claims transformation resolves the desk row on every request and answers with no permissions at
 * all when there is none.
 *
 * This is deliberately *not* `POST /users/register`. That endpoint now creates the identity itself — it
 * takes a password and drives Keycloak's Admin REST as the confidential client — and provisioning a
 * person who has already signed in is a different operation with different rights. `users/self` reads the
 * authenticated token's claims and touches only this application's database.
 */
export async function provisionSelf(
  f: typeof fetch,
  cookies: Cookies,
): Promise<void> {
  let r;
  try {
    r = await send(f, cookies, "POST", "/users/self");
  } catch (err) {
    // The API being unreachable is not a reason to refuse a valid login: the row is created on the next
    // sign-in, and the app's own error page reports the outage better than /login would.
    console.warn("users/self unreachable", err);
    return;
  }
  if (r.ok) return;
  // The provider said the token has no usable profile, so no row can ever be made from it.
  if (r.status === 400) throw new AuthError("profile", r.message);
  // 401/403 here means the token failed the API's validation: almost always the `aud` claim is not the
  // audience the API pins, which is a configuration answer rather than a password answer.
  if (r.status === 401 || r.status === 403) throw new AuthError("audience", r.message);
  console.warn(`users/self -> ${r.status} ${r.message}`);
}
