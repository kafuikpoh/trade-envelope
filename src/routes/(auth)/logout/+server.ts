import { redirect } from "@sveltejs/kit";
import { endSessionUrl } from "#lib/server/auth.js";
import { signOut } from "#lib/server/session.js";
import type { RequestHandler } from "./$types";

/** Clears our session, then front-channels Keycloak's logout so /login/start is not a silent re-login. */
const logout: RequestHandler = async ({ cookies }) => {
  const session = signOut(cookies);
  // Every session now comes from the provider, so the browser still holds a live session there: without
  // this, signing out and signing in again would be the same click twice.
  if (session?.idToken) {
    let end: string | undefined;
    try {
      end = await endSessionUrl(session.idToken);
    } catch (e) {
      // The provider being unreachable cannot leave the desk signed in *here*: it is signed out of this
      // app and told so, and the provider's session ends when its own lifetime does.
      console.warn("could not reach the identity provider to log out", e);
    }
    if (end) redirect(303, end, { external: true });
  }
  redirect(303, "/login");
};

export const GET = logout;
export const POST = logout;
