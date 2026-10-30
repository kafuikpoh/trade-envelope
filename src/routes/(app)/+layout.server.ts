import { AUTH_ENABLED } from "$app/env/private";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ url, locals }) => {
  if (AUTH_ENABLED && !locals.user)
    redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
  // Display-only projection: the identity subject stays on the server, and with AUTH_ENABLED off
  // there is no session to show, so the header must not promise a sign-out.
  return {
    user: locals.user
      ? {
          email: locals.user.email,
          name: `${locals.user.firstName} ${locals.user.lastName}`.trim(),
        }
      : null,
  };
};
