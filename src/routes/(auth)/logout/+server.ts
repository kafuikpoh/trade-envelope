import { redirect } from "@sveltejs/kit";
import { endSessionUrl } from "#lib/server/auth.js";
import { signOut } from "#lib/server/session.js";
import type { RequestHandler } from "./$types";

/** Clears our session, then front-channels Keycloak's logout so /login/start is not a silent re-login. */
const logout: RequestHandler = async ({ cookies }) => {
  const session = signOut(cookies);
  let end: string | undefined;
  try {
    end = await endSessionUrl(session?.idToken);
  } catch (e) {
    console.warn("could not reach the identity provider to log out", e);
  }
  if (end) redirect(303, end, { external: true });
  redirect(303, "/login");
};

export const GET = logout;
export const POST = logout;
